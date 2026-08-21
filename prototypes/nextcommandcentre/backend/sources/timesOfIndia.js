const { makeAdapter } = require("./rssAdapterFactory");

// Times of India publishes public topic RSS feeds (see timesofindia.indiatimes.com/rss.cms
// for the full list). Business and India top-story feeds are polled directly and
// filtered for HUL relevance; a Google News search scoped to this domain fills in
// anything the topic feeds miss, since TOI has no public per-keyword search feed.
module.exports = makeAdapter({
  id: "times-of-india",
  name: "Times of India",
  feeds: [
    "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", // Business
    "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", // Top stories
  ],
  siteDomain: "timesofindia.indiatimes.com",
});
