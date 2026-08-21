const { test } = require("node:test");
const assert = require("node:assert/strict");
const { significantWords, jaccard, findMatchingCluster } = require("../backend/services/clustering");

test("significantWords drops stopwords and short words", () => {
  const words = significantWords("HUL announces a new price increase for the Surf Excel line");
  assert.ok(!words.includes("the"));
  assert.ok(!words.includes("hul"));
  assert.ok(words.includes("price"));
  assert.ok(words.includes("increase"));
});

test("jaccard similarity is 1 for identical sets and 0 for disjoint sets", () => {
  assert.equal(jaccard(["a", "b"], ["a", "b"]), 1);
  assert.equal(jaccard(["a", "b"], ["c", "d"]), 0);
});

function fakeCluster(id, { titleWords, primaryBrand, eventType, lastSeen }) {
  return { id, lastSeen, moment: { _meta: { titleWords, primaryBrand, eventType } } };
}

test("findMatchingCluster merges two paraphrased articles about the same brand and event type", () => {
  const clusters = [
    fakeCluster("evt1", {
      titleWords: significantWords("HUL announces price increase across selected products amid rising input costs Hindustan Unilever Limited said it will raise prices of select Surf Excel and Dove products from next month."),
      primaryBrand: "Dove",
      eventType: "pricing",
      lastSeen: new Date().toISOString(),
    }),
  ];
  const match = findMatchingCluster(clusters, {
    titleWords: significantWords("Hindustan Unilever hikes prices of Surf Excel, Dove amid cost pressure HUL raised prices across its detergent and personal care portfolio including Surf Excel and Dove."),
    primaryBrand: "Dove",
    eventType: "pricing",
    publishedAt: new Date().toISOString(),
  });
  assert.ok(match, "expected the two pricing articles about Dove to merge into one cluster");
  assert.equal(match.cluster.id, "evt1");
});

test("findMatchingCluster does not merge unrelated stories about a different brand", () => {
  const clusters = [
    fakeCluster("evt1", {
      titleWords: significantWords("HUL announces price increase across selected products amid rising input costs"),
      primaryBrand: "Dove",
      eventType: "pricing",
      lastSeen: new Date().toISOString(),
    }),
  ];
  const match = findMatchingCluster(clusters, {
    titleWords: significantWords("HUL launches new Lakme foundation range targeting Gen Z consumers"),
    primaryBrand: "Lakme",
    eventType: "product_launch",
    publishedAt: new Date().toISOString(),
  });
  assert.equal(match, null);
});

test("findMatchingCluster does not merge across a brand mismatch even with similar wording", () => {
  const clusters = [
    fakeCluster("evt1", {
      titleWords: significantWords("HUL raises prices of Surf Excel amid cost pressure"),
      primaryBrand: "Surf Excel",
      eventType: "pricing",
      lastSeen: new Date().toISOString(),
    }),
  ];
  const match = findMatchingCluster(clusters, {
    titleWords: significantWords("HUL raises prices of Lifebuoy amid cost pressure"),
    primaryBrand: "Lifebuoy",
    eventType: "pricing",
    publishedAt: new Date().toISOString(),
  });
  assert.equal(match, null);
});

test("findMatchingCluster ignores a cluster far outside the matching window", () => {
  const clusters = [
    fakeCluster("evt1", {
      titleWords: significantWords("HUL raises prices of Surf Excel amid cost pressure"),
      primaryBrand: "Surf Excel",
      eventType: "pricing",
      lastSeen: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    }),
  ];
  const match = findMatchingCluster(clusters, {
    titleWords: significantWords("HUL raises prices of Surf Excel amid cost pressure again"),
    primaryBrand: "Surf Excel",
    eventType: "pricing",
    publishedAt: new Date().toISOString(),
  });
  assert.equal(match, null);
});
