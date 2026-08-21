const { deriveImpact } = require("./impact");

function mode(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}

function average(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Combines every article belonging to one cluster (one real-world event)
 * into a single signal, reading each article's already-computed
 * classification (stored at ingestion time) rather than recomputing it. We
 * argue about the moment, not the individual article, so this runs once
 * per cluster before decision scoring.
 */
function aggregateClusterSignal(articles) {
  const sources = Array.from(new Set(articles.map((a) => a.source)));
  const sourceCount = sources.length;

  const relevance = Math.round(Math.max(...articles.map((a) => a.classification.relevance)));
  const urgency = Math.round(Math.max(...articles.map((a) => a.classification.urgency)));
  const eventType = mode(articles.map((a) => a.classification.type));
  const sentiment = mode(articles.map((a) => a.classification.sentiment));
  const baseConfidence = Math.round(average(articles.map((a) => a.classification.confidence)));
  // Corroboration from independent sources raises confidence, capped so it never claims certainty.
  const confidence = Math.min(96, baseConfidence + Math.max(0, sourceCount - 1) * 8);

  const impact = deriveImpact({ eventType, relevance, sentiment, urgency });

  const mostRecent = [...articles].sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0))[0];
  const earliest = [...articles].sort((a, b) => new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0))[0];

  return {
    sources,
    sourceCount,
    relevance,
    urgency,
    eventType,
    sentiment,
    impact,
    confidence,
    mostRecentArticle: mostRecent,
    earliestArticle: earliest,
  };
}

module.exports = { aggregateClusterSignal };
