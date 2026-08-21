const { fetchFeed, googleNewsSearchUrl, splitGoogleNewsTitle, canonicalizeUrl, mentionsAnyTerm } = require("./base");
const { getAllSearchTerms, getCompanySearchQuery } = require("../config/entities");

/**
 * Builds a source adapter backed by public RSS. Every adapter built this
 * way returns the same shape from fetchArticles(), so a new source is just
 * a new call to makeAdapter() (or, for a source with a licensed API instead
 * of RSS, a module implementing the same fetchArticles() contract).
 *
 * @param {object} opts
 * @param {string} opts.id          stable source id, e.g. "times-of-india"
 * @param {string} opts.name        display name, e.g. "Times of India"
 * @param {string[]} [opts.feeds]   the publisher's own public RSS feed URLs to poll directly
 * @param {string} [opts.siteDomain] publisher domain used for a Google News site-scoped search,
 *                                    which supplements (or substitutes for, if no public feed
 *                                    carries company coverage) the publisher's own feed
 */
function makeAdapter({ id, name, feeds = [], siteDomain }) {
  async function fetchArticles() {
    const terms = getAllSearchTerms();
    const items = [];
    const feedResults = [];
    const fetchedAt = new Date().toISOString();

    for (const feedUrl of feeds) {
      const result = await fetchFeed(feedUrl);
      feedResults.push({ url: feedUrl, ok: result.ok, count: result.items.length, error: result.error });
      if (!result.ok) continue;
      for (const item of result.items) {
        const haystack = `${item.title || ""} ${item.contentSnippet || item.content || ""}`;
        if (!mentionsAnyTerm(haystack, terms)) continue;
        items.push({
          source: name,
          title: (item.title || "").trim(),
          url: canonicalizeUrl(item.link || item.guid || ""),
          publishedAt: item.isoDate || item.pubDate || null,
          summary: (item.contentSnippet || item.content || "").trim(),
          author: item.creator || item.author || null,
          fetchedAt,
          extractionMethod: "publisher-rss",
          sourceFeedUrl: feedUrl,
        });
      }
    }

    if (siteDomain) {
      const query = getCompanySearchQuery();
      const searchUrl = googleNewsSearchUrl(query, { siteDomain });
      const result = await fetchFeed(searchUrl);
      feedResults.push({ url: searchUrl, ok: result.ok, count: result.items.length, error: result.error });
      if (result.ok) {
        for (const item of result.items) {
          const { title } = splitGoogleNewsTitle(item.title || "");
          items.push({
            source: name,
            title: title.trim(),
            url: canonicalizeUrl(item.link || item.guid || ""),
            publishedAt: item.isoDate || item.pubDate || null,
            summary: (item.contentSnippet || item.content || "").trim(),
            author: null,
            fetchedAt,
            extractionMethod: "google-news-site-search",
            sourceFeedUrl: searchUrl,
          });
        }
      }
    }

    const anyOk = feedResults.some((f) => f.ok);
    return {
      ok: anyOk,
      items,
      feedResults,
      error: anyOk ? null : "all feeds for this source failed",
    };
  }

  return { id, name, fetchArticles };
}

module.exports = { makeAdapter };
