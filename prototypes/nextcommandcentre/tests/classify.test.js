const { test } = require("node:test");
const assert = require("node:assert/strict");
const { classifyArticle, classifySentiment, classifyEventType, classifyUrgency } = require("../backend/services/classify");

test("classifySentiment reads positive language as positive", () => {
  const r = classifySentiment("HUL reports strong profit growth and record revenue this quarter");
  assert.equal(r.sentiment, "positive");
});

test("classifySentiment reads negative language as negative", () => {
  const r = classifySentiment("HUL faces backlash and criticism after a product recall and lawsuit");
  assert.equal(r.sentiment, "negative");
});

test("classifySentiment reads plain factual text as neutral", () => {
  const r = classifySentiment("HUL announces new appointment to its board of directors");
  assert.equal(r.sentiment, "neutral");
});

test("classifyEventType recognises pricing language across inflections", () => {
  assert.equal(classifyEventType("HUL hikes prices of Surf Excel").type, "pricing");
  assert.equal(classifyEventType("Hindustan Unilever raised prices across its portfolio").type, "pricing");
  assert.equal(classifyEventType("HUL announces a price increase for select SKUs").type, "pricing");
});

test("classifyEventType recognises regulatory language", () => {
  assert.equal(classifyEventType("FSSAI issues show cause notice to HUL over labelling").type, "regulatory");
});

test("classifyEventType falls back to general when nothing matches", () => {
  assert.equal(classifyEventType("HUL employees celebrate annual sports day").type, "general");
});

test("classifyUrgency is higher for a regulatory story published in the last hour", () => {
  const recent = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const old = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
  const urgentScore = classifyUrgency("regulatory", recent);
  const staleScore = classifyUrgency("general", old);
  assert.ok(urgentScore > staleScore);
});

test("classifyArticle returns a consistent shape", () => {
  const r = classifyArticle({ title: "HUL hikes prices of Surf Excel", summary: "Cost pressure cited.", publishedAt: new Date().toISOString() });
  assert.equal(r.eventType, "pricing");
  assert.ok(["positive", "negative", "neutral"].includes(r.sentiment));
  assert.ok(r.urgency >= 0 && r.urgency <= 100);
});
