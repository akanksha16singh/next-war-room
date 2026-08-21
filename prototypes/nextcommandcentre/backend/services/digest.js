const repo = require("../database/repository");

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function countBy(items, fn) {
  const counts = {};
  for (const item of items) {
    const key = fn(item);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Daily HUL intelligence summary. Every count here is computed directly
 * from articles/moments stored today; if nothing has been ingested yet,
 * the counts are honestly zero rather than a placeholder.
 */
function buildDailyDigest() {
  const allArticles = repo.getAllArticles();
  const today = todayIso();
  const todayArticles = allArticles.filter((a) => (a.publishedAt || "").slice(0, 10) === today || (a.fetchedAt || "").slice(0, 10) === today);

  const sentimentCounts = countBy(todayArticles, (a) => a.classification.sentiment);
  const brandCounts = countBy(todayArticles.flatMap((a) => (a.entities.brands || []).map((b) => ({ b }))), (x) => x.b);
  const categoryCounts = countBy(todayArticles.flatMap((a) => (a.entities.categories || []).map((c) => ({ c }))), (x) => x.c);
  const eventTypeCounts = countBy(todayArticles, (a) => a.classification.type);
  const sourceCounts = countBy(todayArticles, (a) => a.source);

  const clusters = repo.listClusters();
  const todayMoments = clusters.filter((c) => (c.lastSeen || "").slice(0, 10) === today);
  const topSignals = [...todayMoments]
    .sort((a, b) => b.moment.score - a.moment.score)
    .slice(0, 5)
    .map((c) => ({ id: c.id, title: c.moment.title, brand: c.moment.brand, domain: c.moment.domain, verdict: c.moment.verdict, score: c.moment.score }));

  const highUrgencyCount = todayArticles.filter((a) => a.classification.urgency >= 70).length;

  return {
    date: today,
    totals: {
      articlesToday: todayArticles.length,
      significantArticles: todayArticles.filter((a) => a.classification.relevance >= 65).length,
      positive: sentimentCounts.positive || 0,
      negative: sentimentCounts.negative || 0,
      neutral: sentimentCounts.neutral || 0,
      highUrgency: highUrgencyCount,
    },
    topBrands: Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([brand, count]) => ({ brand, count })),
    topCategories: Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([category, count]) => ({ category, count })),
    eventTypeBreakdown: eventTypeCounts,
    sourceBreakdown: Object.entries(sourceCounts).map(([source, count]) => ({ source, count })),
    topSignals,
    majorRisks: [...todayMoments]
      .flatMap((c) => c.moment.risks.filter((r) => r.sev === "High").map((r) => ({ moment: c.moment.title, ...r })))
      .slice(0, 5),
    majorOpportunities: [...todayMoments]
      .filter((c) => c.moment.verdict === "Go now" || c.moment.verdict === "Go with conditions")
      .sort((a, b) => b.moment.score - a.moment.score)
      .slice(0, 5)
      .map((c) => ({ id: c.id, title: c.moment.title, verdict: c.moment.verdict, score: c.moment.score })),
    recommendedActions: [...todayMoments]
      .sort((a, b) => b.moment.score - a.moment.score)
      .slice(0, 5)
      .map((c) => ({ id: c.id, title: c.moment.title, action: c.moment.recommendedAction })),
  };
}

module.exports = { buildDailyDigest };
