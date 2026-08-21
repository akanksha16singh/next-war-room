const crypto = require("node:crypto");
const db = require("./db");

function nowIso() {
  return new Date().toISOString();
}

function newId(prefix) {
  return prefix + "_" + crypto.randomUUID().replace(/-/g, "").slice(0, 20);
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

const insertArticleStmt = db.prepare(`
  INSERT INTO articles (
    id, source, url, canonical_url, title, summary, author, published_at, fetched_at,
    raw_hash, entities_json, classification_json, impact_json, decision_json,
    provenance_json, cluster_id, created_at, updated_at
  ) VALUES (
    @id, @source, @url, @canonical_url, @title, @summary, @author, @published_at, @fetched_at,
    @raw_hash, @entities_json, @classification_json, @impact_json, @decision_json,
    @provenance_json, @cluster_id, @created_at, @updated_at
  )
`);

const findByCanonicalUrlStmt = db.prepare(`SELECT * FROM articles WHERE canonical_url = ?`);
const findByRawHashStmt = db.prepare(`SELECT * FROM articles WHERE raw_hash = ?`);
const updateArticleClusterStmt = db.prepare(`UPDATE articles SET cluster_id = ?, updated_at = ? WHERE id = ?`);

function articleExists(canonicalUrl, rawHash) {
  return findByCanonicalUrlStmt.get(canonicalUrl) || findByRawHashStmt.get(rawHash);
}

/** Insert a normalized article if it does not already exist. Returns { isNew, row }. */
function insertArticleIfNew(article) {
  const existing = articleExists(article.canonicalUrl, article.rawHash);
  if (existing) return { isNew: false, row: existing };

  const id = newId("art");
  const ts = nowIso();
  const row = {
    id,
    source: article.source,
    url: article.url,
    canonical_url: article.canonicalUrl,
    title: article.title,
    summary: article.summary || "",
    author: article.author || null,
    published_at: article.publishedAt || null,
    fetched_at: article.fetchedAt || ts,
    raw_hash: article.rawHash,
    entities_json: JSON.stringify(article.entities || {}),
    classification_json: JSON.stringify(article.classification || {}),
    impact_json: JSON.stringify(article.impact || {}),
    decision_json: JSON.stringify(article.decision || {}),
    provenance_json: JSON.stringify(article.provenance || {}),
    cluster_id: article.clusterId || null,
    created_at: ts,
    updated_at: ts,
  };
  insertArticleStmt.run(row);
  return { isNew: true, row };
}

function setArticleCluster(articleId, clusterId) {
  updateArticleClusterStmt.run(clusterId, nowIso(), articleId);
}

function rowToArticle(row) {
  if (!row) return null;
  return {
    id: row.id,
    company: "HUL",
    source: row.source,
    url: row.url,
    canonicalUrl: row.canonical_url,
    title: row.title,
    summary: row.summary,
    author: row.author,
    publishedAt: row.published_at,
    fetchedAt: row.fetched_at,
    entities: JSON.parse(row.entities_json),
    classification: JSON.parse(row.classification_json),
    impact: JSON.parse(row.impact_json),
    decision: JSON.parse(row.decision_json),
    provenance: JSON.parse(row.provenance_json),
    clusterId: row.cluster_id,
  };
}

function listArticles({ source, date, clusterId, limit = 50, offset = 0 } = {}) {
  const clauses = [];
  const params = {};
  if (source) {
    clauses.push("LOWER(source) = LOWER(@source)");
    params.source = source;
  }
  if (date) {
    clauses.push("substr(published_at, 1, 10) = @date");
    params.date = date;
  }
  if (clusterId) {
    clauses.push("cluster_id = @clusterId");
    params.clusterId = clusterId;
  }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  params.limit = limit;
  params.offset = offset;
  const rows = db
    .prepare(`SELECT * FROM articles ${where} ORDER BY published_at DESC, fetched_at DESC LIMIT @limit OFFSET @offset`)
    .all(params);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM articles ${where}`).get(params).c;
  return { items: rows.map(rowToArticle), total };
}

function getArticleById(id) {
  return rowToArticle(db.prepare(`SELECT * FROM articles WHERE id = ?`).get(id));
}

function getArticlesForCluster(clusterId) {
  return db.prepare(`SELECT * FROM articles WHERE cluster_id = ? ORDER BY published_at ASC`).all(clusterId).map(rowToArticle);
}

function getArticleCountToday() {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare(`SELECT COUNT(*) AS c FROM articles WHERE substr(published_at, 1, 10) = ?`).get(today).c;
}

function getAllArticles() {
  return db.prepare(`SELECT * FROM articles ORDER BY published_at DESC`).all().map(rowToArticle);
}

// ---------------------------------------------------------------------------
// Clusters (signals / moments)
// ---------------------------------------------------------------------------

const upsertClusterStmt = db.prepare(`
  INSERT INTO clusters (id, domain_id, brand, title, first_seen, last_seen, article_count, moment_json, created_at, updated_at)
  VALUES (@id, @domain_id, @brand, @title, @first_seen, @last_seen, @article_count, @moment_json, @created_at, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    domain_id = excluded.domain_id, brand = excluded.brand, title = excluded.title,
    last_seen = excluded.last_seen, article_count = excluded.article_count,
    moment_json = excluded.moment_json, updated_at = excluded.updated_at
`);

function rowToCluster(row) {
  if (!row) return null;
  return {
    id: row.id,
    domainId: row.domain_id,
    brand: row.brand,
    title: row.title,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    articleCount: row.article_count,
    moment: JSON.parse(row.moment_json),
  };
}

function saveCluster(cluster) {
  const existing = db.prepare(`SELECT id, first_seen FROM clusters WHERE id = ?`).get(cluster.id);
  const ts = nowIso();
  upsertClusterStmt.run({
    id: cluster.id,
    domain_id: cluster.domainId,
    brand: cluster.brand || null,
    title: cluster.title,
    first_seen: existing ? existing.first_seen : ts,
    last_seen: ts,
    article_count: cluster.articleCount,
    moment_json: JSON.stringify(cluster.moment),
    created_at: ts,
    updated_at: ts,
  });
  return getClusterById(cluster.id);
}

function getClusterById(id) {
  return rowToCluster(db.prepare(`SELECT * FROM clusters WHERE id = ?`).get(id));
}

function listClusters({ domainId } = {}) {
  if (domainId) {
    return db.prepare(`SELECT * FROM clusters WHERE domain_id = ? ORDER BY last_seen DESC`).all(domainId).map(rowToCluster);
  }
  return db.prepare(`SELECT * FROM clusters ORDER BY last_seen DESC`).all().map(rowToCluster);
}

function findClustersByDomainAndTitleHint(domainId) {
  return db.prepare(`SELECT * FROM clusters WHERE domain_id = ? ORDER BY last_seen DESC LIMIT 200`).all(domainId).map(rowToCluster);
}

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

const insertLedgerStmt = db.prepare(`
  INSERT INTO ledger (id, cluster_id, sig, verdict, score, outcome, color, actor, decided_at)
  VALUES (@id, @cluster_id, @sig, @verdict, @score, @outcome, @color, @actor, @decided_at)
`);

function addLedgerEntry(entry) {
  const row = {
    id: newId("rec"),
    cluster_id: entry.clusterId || null,
    sig: entry.sig,
    verdict: entry.verdict,
    score: String(entry.score),
    outcome: entry.outcome,
    color: entry.color,
    actor: entry.actor || "system",
    decided_at: nowIso(),
  };
  insertLedgerStmt.run(row);
  return row;
}

function listLedger({ limit = 50, offset = 0 } = {}) {
  const rows = db.prepare(`SELECT * FROM ledger ORDER BY decided_at DESC LIMIT ? OFFSET ?`).all(limit, offset);
  const total = db.prepare(`SELECT COUNT(*) AS c FROM ledger`).get().c;
  return { items: rows, total };
}

function findPastLedgerByClusterTitle(titleWords, excludeClusterId) {
  // Simple historical-memory lookup: past ledger entries whose signal text
  // shares significant words with the current moment's title. This is the
  // "similarity to a previous decision" feature described in the brief,
  // implemented without inventing any data: if nothing matches, none is returned.
  const rows = db.prepare(`SELECT * FROM ledger ORDER BY decided_at DESC LIMIT 200`).all();
  const wordSet = new Set(titleWords);
  let best = null;
  let bestScore = 0;
  for (const row of rows) {
    if (excludeClusterId && row.cluster_id === excludeClusterId) continue;
    const sigWords = row.sig.toLowerCase().split(/\W+/).filter(Boolean);
    const overlap = sigWords.filter((w) => wordSet.has(w)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = row;
    }
  }
  if (!best || bestScore < 2) return null;
  return { entry: best, overlapWords: bestScore };
}

// ---------------------------------------------------------------------------
// Ingestion runs
// ---------------------------------------------------------------------------

function startIngestionRun(trigger) {
  const id = newId("run");
  db.prepare(`INSERT INTO ingestion_runs (id, started_at, status, trigger) VALUES (?, ?, 'running', ?)`).run(id, nowIso(), trigger);
  return id;
}

function finishIngestionRun(id, { status, sources, articlesFound, articlesNew, clustersUpdated, error }) {
  db.prepare(`
    UPDATE ingestion_runs SET finished_at = ?, status = ?, sources_json = ?,
      articles_found = ?, articles_new = ?, clusters_updated = ?, error = ?
    WHERE id = ?
  `).run(nowIso(), status, JSON.stringify(sources || []), articlesFound || 0, articlesNew || 0, clustersUpdated || 0, error || null, id);
}

function getLastIngestionRun() {
  const row = db.prepare(`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT 1`).get();
  return rowToRun(row);
}

function rowToRun(row) {
  if (!row) return null;
  return {
    id: row.id,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    trigger: row.trigger,
    sources: row.sources_json ? JSON.parse(row.sources_json) : [],
    articlesFound: row.articles_found,
    articlesNew: row.articles_new,
    clustersUpdated: row.clusters_updated,
    error: row.error,
  };
}

function listIngestionRuns(limit = 20) {
  return db.prepare(`SELECT * FROM ingestion_runs ORDER BY started_at DESC LIMIT ?`).all(limit).map(rowToRun);
}

function isRefreshTooSoon(minMinutes) {
  const last = getLastIngestionRun();
  if (!last || !last.finishedAt) return false;
  const elapsedMs = Date.now() - new Date(last.finishedAt).getTime();
  return elapsedMs < minMinutes * 60 * 1000;
}

// ---------------------------------------------------------------------------
// Source state
// ---------------------------------------------------------------------------

function upsertSourceState(source, patch) {
  const existing = db.prepare(`SELECT * FROM source_state WHERE source = ?`).get(source);
  const merged = {
    source,
    last_run_at: patch.lastRunAt ?? existing?.last_run_at ?? null,
    last_success_at: patch.lastSuccessAt ?? existing?.last_success_at ?? null,
    last_error: patch.lastError !== undefined ? patch.lastError : existing?.last_error ?? null,
    articles_total: (existing?.articles_total || 0) + (patch.articlesAdded || 0),
  };
  db.prepare(`
    INSERT INTO source_state (source, last_run_at, last_success_at, last_error, articles_total)
    VALUES (@source, @last_run_at, @last_success_at, @last_error, @articles_total)
    ON CONFLICT(source) DO UPDATE SET
      last_run_at = excluded.last_run_at, last_success_at = excluded.last_success_at,
      last_error = excluded.last_error, articles_total = excluded.articles_total
  `).run(merged);
}

function listSourceStates() {
  return db.prepare(`SELECT * FROM source_state`).all().map((row) => ({
    source: row.source,
    lastRunAt: row.last_run_at,
    lastSuccessAt: row.last_success_at,
    lastError: row.last_error,
    articlesTotal: row.articles_total,
  }));
}

module.exports = {
  nowIso,
  newId,
  insertArticleIfNew,
  setArticleCluster,
  listArticles,
  getArticleById,
  getArticlesForCluster,
  getArticleCountToday,
  getAllArticles,
  saveCluster,
  getClusterById,
  listClusters,
  findClustersByDomainAndTitleHint,
  addLedgerEntry,
  listLedger,
  findPastLedgerByClusterTitle,
  startIngestionRun,
  finishIngestionRun,
  getLastIngestionRun,
  listIngestionRuns,
  isRefreshTooSoon,
  upsertSourceState,
  listSourceStates,
};
