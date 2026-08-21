const crypto = require("node:crypto");
const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 12000,
  headers: { "User-Agent": "NEXT-Command-Centre/1.0 (+HUL decision intelligence; RSS reader)" },
});

const FETCH_TIMEOUT_MS = 15000;

/**
 * Fetch and parse an RSS/Atom feed url. Never throws: on any failure it
 * returns an empty item list plus the error, so one dead feed cannot take
 * down the whole ingestion run (see services/ingestion.js).
 */
async function fetchFeed(url) {
  try {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("feed timeout")), FETCH_TIMEOUT_MS));
    const feed = await Promise.race([parser.parseURL(url), timeout]);
    return { ok: true, items: feed.items || [], error: null };
  } catch (err) {
    return { ok: false, items: [], error: err.message || String(err) };
  }
}

/** Builds a Google News RSS search URL for a query, optionally scoped to one publisher domain. */
function googleNewsSearchUrl(query, { siteDomain, region = "IN", language = "en" } = {}) {
  const q = siteDomain ? `${query} site:${siteDomain}` : query;
  const params = new URLSearchParams({
    q,
    hl: `${language}-${region}`,
    gl: region,
    ceid: `${region}:${language}`,
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

/**
 * Google News RSS titles are formatted "Headline - Publisher Name". Recover
 * the publisher name so items can carry a real source label instead of the
 * generic aggregator name, and strip the suffix from the headline itself.
 */
function splitGoogleNewsTitle(rawTitle) {
  const idx = rawTitle.lastIndexOf(" - ");
  if (idx === -1) return { title: rawTitle, publisher: null };
  return { title: rawTitle.slice(0, idx).trim(), publisher: rawTitle.slice(idx + 3).trim() };
}

/** Strips tracking query params and trailing slashes so the same story doesn't dedupe-miss on URL noise. */
function canonicalizeUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const stripParams = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "cid", "ref", "amp"];
    stripParams.forEach((p) => u.searchParams.delete(p));
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return rawUrl;
  }
}

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

/** Cheap relevance pre-filter so adapters don't ship hundreds of unrelated items downstream. */
function mentionsAnyTerm(text, terms) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t.toLowerCase()));
}

module.exports = {
  fetchFeed,
  googleNewsSearchUrl,
  splitGoogleNewsTitle,
  canonicalizeUrl,
  sha256,
  mentionsAnyTerm,
};
