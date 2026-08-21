const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "in", "on", "for", "to", "with", "at", "by", "from",
  "is", "are", "was", "were", "be", "been", "being", "as", "it", "its", "this", "that",
  "will", "has", "have", "had", "after", "over", "into", "amid", "about", "new", "says",
  "said", "hul", "unilever", "hindustan",
]);

function significantWords(title) {
  return Array.from(
    new Set(
      title
        .toLowerCase()
        .replace(/[^a-z0-9%\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w))
    )
  );
}

function jaccard(a, b) {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// Two ways to decide two articles are the same real-world event:
// (1) their text alone is similar enough on its own, or
// (2) they share the same brand and the same event classification, published
//     close together in time, with at least some textual overlap to back it up.
// (2) exists because outlets often phrase the same story quite differently
// ("HUL hikes prices" vs "Hindustan Unilever raises MRP") while still clearly
// covering the same event - entity overlap and publication time are signals
// in their own right, not just a fallback on top of title similarity.
const TEXT_ONLY_THRESHOLD = 0.22;
const CORROBORATED_THRESHOLD = 0.12;
const CORROBORATION_WINDOW_DAYS = 2;
const CLUSTER_WINDOW_DAYS = 10;

/**
 * Finds an existing cluster (dashboard moment) this article likely belongs
 * to. This is what stops the same HUL event appearing as five identical
 * cards because five outlets covered it: multiple articles collapse into
 * one moment with multiple corroborating sources.
 */
function findMatchingCluster(existingClusters, { titleWords, primaryBrand, eventType, publishedAt }) {
  let best = null;
  let bestSim = 0;
  const publishedTime = publishedAt ? new Date(publishedAt).getTime() : Date.now();

  for (const cluster of existingClusters) {
    const meta = cluster.moment && cluster.moment._meta;
    if (!meta) continue;
    const daysSince = Math.abs(publishedTime - new Date(cluster.lastSeen).getTime()) / 86_400_000;
    if (daysSince > CLUSTER_WINDOW_DAYS) continue;
    if (primaryBrand && meta.primaryBrand && meta.primaryBrand !== primaryBrand) continue;

    const sim = jaccard(titleWords, meta.titleWords || []);
    const sameBrand = !!primaryBrand && primaryBrand === meta.primaryBrand;
    const sameEventType = !!eventType && eventType === meta.eventType;
    const threshold = sameBrand && sameEventType && daysSince <= CORROBORATION_WINDOW_DAYS ? CORROBORATED_THRESHOLD : TEXT_ONLY_THRESHOLD;

    if (sim >= threshold && sim > bestSim) {
      bestSim = sim;
      best = cluster;
    }
  }

  if (best) return { cluster: best, similarity: bestSim };
  return null;
}

module.exports = { significantWords, jaccard, findMatchingCluster, TEXT_ONLY_THRESHOLD, CORROBORATED_THRESHOLD };
