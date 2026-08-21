const { canonicalizeUrl, sha256 } = require("../sources/base");

function toIso(dateLike) {
  if (!dateLike) return null;
  const d = new Date(dateLike);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function stripHtml(text) {
  if (!text) return "";
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function truncate(text, maxLen) {
  if (!text || text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1).trimEnd() + "…";
}

/**
 * Turns a raw adapter item into the normalized shape the rest of the
 * pipeline works with. Sanitizes free text (no article HTML is ever kept
 * or rendered, only plain-text metadata), computes the canonical URL and a
 * content hash used for deduplication, and never invents a missing field.
 */
function normalizeArticle(raw) {
  const title = stripHtml(raw.title || "");
  const summary = truncate(stripHtml(raw.summary || ""), 600);
  const canonicalUrl = canonicalizeUrl(raw.url || "");
  const publishedAt = toIso(raw.publishedAt) || toIso(raw.fetchedAt);
  const rawHash = sha256(`${title.toLowerCase()}|${canonicalUrl}`);

  return {
    source: raw.source || "Unknown",
    title,
    summary,
    url: raw.url,
    canonicalUrl,
    author: raw.author || null,
    publishedAt,
    fetchedAt: raw.fetchedAt || new Date().toISOString(),
    rawHash,
    provenance: {
      sourceUrl: raw.url,
      sourceName: raw.source || "Unknown",
      retrievedAt: raw.fetchedAt || new Date().toISOString(),
      publishedAt,
      extractionMethod: raw.extractionMethod || "unknown",
      sourceFeedUrl: raw.sourceFeedUrl || null,
    },
  };
}

module.exports = { normalizeArticle, toIso, stripHtml, truncate };
