const { test } = require("node:test");
const assert = require("node:assert/strict");
const { resolveEntities } = require("../backend/services/entityResolution");

test("a clear HUL company mention is relevant", () => {
  const r = resolveEntities({ title: "Hindustan Unilever announces new plant in Gujarat", summary: "The company said it will invest in a new facility." });
  assert.equal(r.isRelevant, true);
  assert.ok(r.entities.company.includes("HUL"));
  assert.ok(r.relevance >= 50);
});

test("a standalone HUL abbreviation is relevant even without a brand", () => {
  const r = resolveEntities({ title: "HUL shares rise after strong quarterly results", summary: "Investors reacted positively to the results." });
  assert.equal(r.isRelevant, true);
  assert.ok(r.entities.company.includes("HUL"));
});

test("HUL does not match as a substring of another word", () => {
  const r = resolveEntities({ title: "The HULK movie breaks box office records", summary: "A completely unrelated Marvel story with nothing about consumer goods." });
  assert.equal(r.isRelevant, false);
  assert.equal(r.entities.company.length, 0);
});

test("a distinctive brand alone is relevant (Dove)", () => {
  const r = resolveEntities({ title: "Dove launches new refill packaging in India", summary: "The beauty brand unveiled a new sustainable pack." });
  assert.equal(r.isRelevant, true);
  assert.ok(r.entities.brands.includes("Dove"));
  assert.equal(r.domainId, "beauty");
});

test("an ambiguous brand alias alone (Comfort) is not enough on its own", () => {
  const r = resolveEntities({ title: "Living in comfort: a guide to home renovation", summary: "Tips for making your home cosier this winter." });
  assert.equal(r.isRelevant, false);
});

test("an ambiguous brand alias with FMCG context scores higher than the alias alone, but still isn't relevant by itself", () => {
  const alone = resolveEntities({ title: "Comfort is what everyone wants at home", summary: "A lifestyle piece with no business context." });
  const withContext = resolveEntities({ title: "Comfort fabric conditioner gains share in FMCG category", summary: "The fast moving consumer goods brand grew volumes this quarter." });
  assert.ok(withContext.relevance > alone.relevance, `expected FMCG context to raise relevance (${alone.relevance} -> ${withContext.relevance})`);
  assert.equal(withContext.isRelevant, false, "an ambiguous brand alias plus generic category context still should not be treated as confirmed HUL relevance on its own");
});

test("entities include multiple matched brands and their categories", () => {
  const r = resolveEntities({ title: "HUL raises prices on Surf Excel and Dove", summary: "The Hindustan Unilever portfolio saw price changes." });
  assert.ok(r.entities.brands.includes("Surf Excel"));
  assert.ok(r.entities.brands.includes("Dove"));
  assert.ok(r.entities.categories.length >= 1);
});

test("unrelated news about a different company is not relevant", () => {
  const r = resolveEntities({ title: "Tata Motors launches new electric SUV", summary: "The automaker unveiled its latest EV lineup." });
  assert.equal(r.isRelevant, false);
});
