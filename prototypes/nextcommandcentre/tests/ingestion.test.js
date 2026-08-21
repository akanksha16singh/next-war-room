const path = require("node:path");
const os = require("node:os");
const fs = require("node:fs");
const crypto = require("node:crypto");

// Must be set before any backend module touches backend/database/db.js, so
// tests never write to the real dev database.
process.env.DATABASE_URL = path.join(os.tmpdir(), `next-test-ingestion-${crypto.randomUUID()}.sqlite`);

const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeArticle } = require("../backend/services/normalize");
const { scoreArticle, rescoreCluster } = require("../backend/services/ingestion");
const { significantWords, findMatchingCluster } = require("../backend/services/clustering");
const repo = require("../backend/database/repository");

after(() => {
  try { fs.unlinkSync(process.env.DATABASE_URL); } catch (e) {}
  try { fs.unlinkSync(process.env.DATABASE_URL + "-wal"); } catch (e) {}
  try { fs.unlinkSync(process.env.DATABASE_URL + "-shm"); } catch (e) {}
});

function ingestOne(raw) {
  const normalized = normalizeArticle(raw);
  const scored = scoreArticle(normalized);
  if (!scored.keep) return { kept: false };
  const { isNew, row } = repo.insertArticleIfNew(scored.articleRecord);
  if (!isNew) return { kept: true, isNew: false, row };
  const article = repo.getArticleById(row.id);
  let clusterId = null;
  if (scored.domainId) {
    const existing = repo.listClusters({ domainId: scored.domainId });
    const match = findMatchingCluster(existing, {
      titleWords: significantWords(`${article.title} ${article.summary}`),
      primaryBrand: scored.primaryBrand,
      eventType: article.classification.type,
      publishedAt: article.publishedAt,
    });
    clusterId = match ? match.cluster.id : repo.newId("evt");
    const brand = scored.primaryBrand || (scored.domainId === "supply" ? "HUL Supply Chain" : "HUL");
    repo.setArticleCluster(article.id, clusterId);
    rescoreCluster(clusterId, scored.domainId, brand);
  }
  return { kept: true, isNew: true, row, scored, clusterId };
}

test("an irrelevant article is dropped before it reaches storage", () => {
  const result = ingestOne({
    source: "Times of India",
    title: "Tata Motors launches new electric SUV",
    url: "https://timesofindia.indiatimes.com/tata-ev.cms",
    summary: "The automaker unveiled its latest EV lineup.",
    fetchedAt: new Date().toISOString(),
  });
  assert.equal(result.kept, false);
});

test("the same article submitted twice is only stored once (dedupe by canonical URL)", () => {
  const raw = {
    source: "Economic Times",
    title: "HUL reports strong quarterly profit growth",
    url: "https://economictimes.indiatimes.com/hul-results-dedupe-test.cms?utm_source=x",
    summary: "Hindustan Unilever posted a strong quarter with double-digit profit growth.",
    fetchedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  };
  const first = ingestOne(raw);
  const second = ingestOne({ ...raw, url: raw.url.replace("utm_source=x", "utm_source=y") });
  assert.equal(first.isNew, true);
  assert.equal(second.isNew, false);
});

test("two differently-worded articles about the same pricing event from different sources merge into one cluster", () => {
  const a = ingestOne({
    source: "Times of India",
    title: "HUL announces price increase across selected products amid rising input costs",
    url: "https://timesofindia.indiatimes.com/hul-price-merge-test-1.cms",
    summary: "Hindustan Unilever Limited said it will raise prices of select Surf Excel and Dove products from next month.",
    fetchedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });
  const b = ingestOne({
    source: "Economic Times",
    title: "Hindustan Unilever hikes prices of Surf Excel, Dove amid cost pressure",
    url: "https://economictimes.indiatimes.com/hul-price-merge-test-2.cms",
    summary: "HUL raised prices across its detergent and personal care portfolio including Surf Excel and Dove.",
    fetchedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });
  assert.equal(a.kept && b.kept, true);
  assert.equal(a.clusterId, b.clusterId, "expected both articles to land in the same cluster");

  const cluster = repo.getClusterById(a.clusterId);
  assert.equal(cluster.articleCount, 2);
  assert.equal(cluster.moment.stats.find((s) => s.k === "Sources corroborating").v, "2");
});

test("an unrelated article about a different brand and event does not join an existing cluster", () => {
  const a = ingestOne({
    source: "Times of India",
    title: "HUL Rin detergent price hike hits stores nationwide",
    url: "https://timesofindia.indiatimes.com/rin-unrelated-1.cms",
    summary: "Hindustan Unilever raised the price of Rin detergent nationwide.",
    fetchedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });
  const b = ingestOne({
    source: "Moneycontrol",
    title: "HUL launches new Lakme foundation range targeting Gen Z consumers",
    url: "https://moneycontrol.com/lakme-unrelated-2.cms",
    summary: "Hindustan Unilever unveiled a new Lakme cosmetics line aimed at younger consumers.",
    fetchedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });
  assert.notEqual(a.clusterId, b.clusterId);
});

test("a rescored cluster's moment always has the fields the front end reads without a guard", () => {
  const a = ingestOne({
    source: "Business Standard",
    title: "FSSAI issues show cause notice to HUL over Surf Excel packaging claims",
    url: "https://business-standard.com/fssai-notice-shape-test.cms",
    summary: "FSSAI issued a show cause notice to Hindustan Unilever over packaging claims deemed misleading.",
    fetchedAt: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  });
  const cluster = repo.getClusterById(a.clusterId);
  const m = cluster.moment;
  assert.ok(m.risks.length >= 1, "risks must never be empty");
  assert.ok(m.brandLines.length >= 2, "brandLines must have at least 2 entries");
  assert.ok(m.impact.length >= 1, "impact must never be empty");
  assert.ok(m.channels.length >= 1, "channels must never be empty");
  assert.ok(m.caseFor.length >= 1, "caseFor must never be empty");
  assert.ok(m.caseAgainst.length >= 1, "caseAgainst must never be empty");
  assert.ok(m.undo.includes("."), "undo must contain a period, since the front end does undo.split('.')[0]");
  assert.ok(m.doNothing.includes("."), "doNothing must contain a period, since the front end does doNothing.split('.')[0]");
  assert.equal(m.agents.length, 6, "all six specialist agents must be present");
  assert.equal(m.concepts, undefined, "concepts should be omitted, never an empty array, for a live moment with no creative routes");
});
