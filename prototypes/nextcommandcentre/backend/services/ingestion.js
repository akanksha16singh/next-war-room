const { ADAPTERS } = require("../sources");
const { normalizeArticle } = require("./normalize");
const { resolveEntities } = require("./entityResolution");
const { classifyArticle } = require("./classify");
const { deriveImpact } = require("./impact");
const { aggregateClusterSignal } = require("./signalAggregation");
const { computeDecision } = require("./decisionEngine");
const { computeAgentScores } = require("./agentScores");
const { buildMoment } = require("./momentBuilder");
const { significantWords, findMatchingCluster } = require("./clustering");
const { SOURCE_RELIABILITY, DEFAULT_SOURCE_RELIABILITY } = require("../config/weights");
const repo = require("../database/repository");

/** Scores one normalized article and returns everything needed to store it. Never throws on a malformed item; callers skip it instead. */
function scoreArticle(normalized) {
  const resolved = resolveEntities(normalized);
  if (!resolved.isRelevant) return { keep: false, resolved };

  const classification = classifyArticle({ title: normalized.title, summary: normalized.summary, publishedAt: normalized.publishedAt });
  let domainId = resolved.domainId;
  if (classification.eventType === "supply_chain") domainId = "supply";

  const reliability = SOURCE_RELIABILITY[normalized.source] || DEFAULT_SOURCE_RELIABILITY;
  const entityConfidence = Math.round(resolved.confidence * 0.6 + reliability.reliability * 100 * 0.4);
  const impact = deriveImpact({ eventType: classification.eventType, relevance: resolved.relevance, sentiment: classification.sentiment, urgency: classification.urgency });
  const decision = computeDecision({
    relevance: resolved.relevance,
    urgency: classification.urgency,
    impact,
    sentiment: classification.sentiment,
    eventType: classification.eventType,
    confidence: entityConfidence,
    sourceCount: 1,
  });

  return {
    keep: true,
    domainId,
    primaryBrand: resolved.primaryBrand,
    articleRecord: {
      source: normalized.source,
      url: normalized.url,
      canonicalUrl: normalized.canonicalUrl,
      title: normalized.title,
      summary: normalized.summary,
      author: normalized.author,
      publishedAt: normalized.publishedAt,
      fetchedAt: normalized.fetchedAt,
      rawHash: normalized.rawHash,
      entities: resolved.entities,
      classification: {
        type: classification.eventType,
        relevance: resolved.relevance,
        urgency: classification.urgency,
        sentiment: classification.sentiment,
        confidence: entityConfidence,
      },
      impact,
      decision,
      provenance: {
        ...normalized.provenance,
        reliability: reliability.reliability,
        sourceType: reliability.type,
        sourceRegion: reliability.region,
        entityConfidence: resolved.confidence,
        signals: resolved.signals,
      },
    },
  };
}

/** Re-scores a cluster from all its member articles and rebuilds its moment object. Runs after every new article is added to a cluster. */
function rescoreCluster(clusterId, domainId, brand) {
  const articles = repo.getArticlesForCluster(clusterId);
  if (!articles.length) return null;

  const signal = aggregateClusterSignal(articles);
  const decision = computeDecision({
    relevance: signal.relevance,
    urgency: signal.urgency,
    impact: signal.impact,
    sentiment: signal.sentiment,
    eventType: signal.eventType,
    confidence: signal.confidence,
    sourceCount: signal.sourceCount,
  });
  const agents = computeAgentScores({
    relevance: signal.relevance,
    urgency: signal.urgency,
    impact: signal.impact,
    sentiment: signal.sentiment,
    momentum: decision.inputs.momentum,
    risk: decision.inputs.risk,
    brandFit: decision.inputs.brandFit,
    sourceCount: signal.sourceCount,
    eventType: signal.eventType,
  });

  // The cluster's matching signature is the union of significant words across every
  // member article's title and summary, not just one article's title: outlets often
  // phrase headlines quite differently for the same event, so a richer signature is
  // needed to recognise a new article as the same story.
  const titleWords = Array.from(new Set(articles.flatMap((a) => significantWords(`${a.title} ${a.summary}`))));
  const historicalMatch = repo.findPastLedgerByClusterTitle(titleWords, clusterId);

  const moment = buildMoment({ clusterId, domainId, brand, signal, decision, agents, historicalMatch });
  moment._meta = { titleWords, primaryBrand: brand, eventType: signal.eventType, sourceCount: signal.sourceCount, articleIds: articles.map((a) => a.id) };

  return repo.saveCluster({
    id: clusterId,
    domainId,
    brand,
    title: signal.mostRecentArticle.title,
    articleCount: articles.length,
    moment,
  });
}

/**
 * Full pipeline: fetch -> normalize -> resolve entities -> classify ->
 * dedupe -> cluster -> score -> store -> update dashboard moments.
 * Tolerant of individual source failures: one dead feed does not stop the
 * others, and the run is recorded either way so /api/sources can show it.
 */
async function runIngestion({ trigger = "manual" } = {}) {
  const runId = repo.startIngestionRun(trigger);
  const sourceResults = [];
  let articlesFound = 0;
  let articlesNew = 0;
  const touchedClusters = new Map(); // clusterId -> { domainId, brand }

  // Fetching is the slow part (network I/O against up to a dozen feeds per
  // source) and each source is independent, so fetch every source
  // concurrently. Storing/clustering the results afterwards stays a plain
  // sequential loop: better-sqlite3 is synchronous and Node is single
  // threaded, so there is no concurrent-write hazard to guard against there,
  // and keeping it sequential keeps clustering order reproducible.
  const fetchedBySource = await Promise.all(
    ADAPTERS.map(async (adapter) => {
      try {
        return { adapter, result: await adapter.fetchArticles() };
      } catch (err) {
        return { adapter, result: { ok: false, items: [], error: err.message || String(err) } };
      }
    })
  );

  for (const { adapter, result } of fetchedBySource) {
    const now = new Date().toISOString();
    let added = 0;
    for (const raw of result.items || []) {
      articlesFound++;
      try {
        if (!raw.title || !raw.url) continue;
        const normalized = normalizeArticle(raw);
        if (!normalized.canonicalUrl) continue;
        const scored = scoreArticle(normalized);
        if (!scored.keep) continue;

        const { isNew, row } = repo.insertArticleIfNew(scored.articleRecord);
        if (!isNew) continue;
        added++;
        articlesNew++;

        if (!scored.domainId) continue; // company-wide news with no domain mapping: stored, but not surfaced as a dashboard moment

        const existingClusters = repo.listClusters({ domainId: scored.domainId });
        const article = repo.getArticleById(row.id);
        const match = findMatchingCluster(existingClusters, {
          titleWords: significantWords(`${article.title} ${article.summary}`),
          primaryBrand: scored.primaryBrand,
          eventType: article.classification.type,
          publishedAt: article.publishedAt,
        });
        const clusterId = match ? match.cluster.id : repo.newId("evt");
        const brand = scored.primaryBrand || (scored.domainId === "supply" ? "HUL Supply Chain" : "HUL");
        repo.setArticleCluster(article.id, clusterId);
        // Rescore (and save) the cluster immediately, not just at the end of the run: a
        // second article about the same event later in this same run must be able to find
        // and merge into it, which requires the cluster row (and its title signature) to
        // already exist in storage rather than only living in an in-memory map.
        rescoreCluster(clusterId, scored.domainId, brand);
        touchedClusters.set(clusterId, { domainId: scored.domainId, brand });
      } catch (itemErr) {
        // one malformed item never aborts the run
        continue;
      }
    }

    sourceResults.push({
      id: adapter.id,
      name: adapter.name,
      ok: result.ok,
      found: (result.items || []).length,
      added,
      error: result.error || null,
      feeds: result.feedResults || [],
    });

    repo.upsertSourceState(adapter.name, {
      lastRunAt: now,
      lastSuccessAt: result.ok ? now : undefined,
      lastError: result.ok ? null : result.error,
      articlesAdded: added,
    });
  }

  // Each touched cluster was already rescored inline as its articles arrived (see above),
  // so its stored moment already reflects every article from this run.
  const status = sourceResults.every((s) => !s.ok) ? "error" : sourceResults.some((s) => !s.ok) ? "partial" : "success";
  repo.finishIngestionRun(runId, {
    status,
    sources: sourceResults,
    articlesFound,
    articlesNew,
    clustersUpdated: touchedClusters.size,
    error: status === "error" ? "All sources failed" : null,
  });

  return { runId, status, sourceResults, articlesFound, articlesNew, clustersUpdated: touchedClusters.size };
}

module.exports = { runIngestion, scoreArticle, rescoreCluster };
