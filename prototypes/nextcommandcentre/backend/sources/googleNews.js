const { fetchFeed, googleNewsSearchUrl, splitGoogleNewsTitle, canonicalizeUrl } = require("./base");
const { getCompanySearchQuery } = require("../config/entities");

// Broad, unscoped Google News search. This is source #8 in the ingestion
// priority list: a catch-all that picks up reputable outlets not covered by
// a dedicated adapter yet (see README "How to add another news source").
module.exports = {
  id: "google-news",
  name: "Google News",
  async fetchArticles() {
    const query = getCompanySearchQuery();
    const url = googleNewsSearchUrl(query, {});
    const result = await fetchFeed(url);
    const fetchedAt = new Date().toISOString();
    if (!result.ok) {
      return { ok: false, items: [], feedResults: [{ url, ok: false, count: 0, error: result.error }], error: result.error };
    }
    const items = result.items.map((item) => {
      const { title, publisher } = splitGoogleNewsTitle(item.title || "");
      return {
        source: publisher || "Google News",
        title: title.trim(),
        url: canonicalizeUrl(item.link || item.guid || ""),
        publishedAt: item.isoDate || item.pubDate || null,
        summary: (item.contentSnippet || item.content || "").trim(),
        author: null,
        fetchedAt,
        extractionMethod: "google-news-search",
        sourceFeedUrl: url,
      };
    });
    return { ok: true, items, feedResults: [{ url, ok: true, count: items.length, error: null }], error: null };
  },
};
