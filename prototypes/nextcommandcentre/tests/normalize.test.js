const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeArticle, stripHtml, truncate } = require("../backend/services/normalize");

test("stripHtml removes tags and collapses whitespace", () => {
  assert.equal(stripHtml("<p>Hello   <b>world</b></p>"), "Hello world");
});

test("truncate leaves short text untouched", () => {
  assert.equal(truncate("short text", 100), "short text");
});

test("truncate shortens long text with an ellipsis", () => {
  const long = "a".repeat(50);
  const out = truncate(long, 10);
  assert.equal(out.length, 10);
  assert.ok(out.endsWith("…"));
});

test("normalizeArticle canonicalizes the URL and strips tracking params", () => {
  const raw = {
    source: "Times of India",
    title: "  HUL <b>raises</b> prices  ",
    url: "https://timesofindia.indiatimes.com/story.cms?utm_source=twitter&utm_medium=social",
    summary: "<p>Some summary</p>",
    publishedAt: "2024-01-01T00:00:00.000Z",
    fetchedAt: "2024-01-01T01:00:00.000Z",
    extractionMethod: "publisher-rss",
  };
  const out = normalizeArticle(raw);
  assert.equal(out.canonicalUrl, "https://timesofindia.indiatimes.com/story.cms");
  assert.equal(out.title, "HUL raises prices");
  assert.equal(out.summary, "Some summary");
  assert.equal(out.publishedAt, "2024-01-01T00:00:00.000Z");
  assert.ok(out.rawHash.length > 0);
  assert.equal(out.provenance.sourceName, "Times of India");
});

test("normalizeArticle produces the same rawHash for the same title+url twice", () => {
  const raw = {
    source: "Mint",
    title: "Same story",
    url: "https://livemint.com/a.html",
    fetchedAt: new Date().toISOString(),
  };
  const a = normalizeArticle(raw);
  const b = normalizeArticle({ ...raw });
  assert.equal(a.rawHash, b.rawHash);
});
