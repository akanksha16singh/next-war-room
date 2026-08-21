const { makeAdapter } = require("./rssAdapterFactory");

module.exports = makeAdapter({
  id: "economic-times",
  name: "Economic Times",
  feeds: [
    "https://economictimes.indiatimes.com/rssfeedstopstories.cms", // Top stories
    "https://economictimes.indiatimes.com/industry/cons-products/fmcg/rssfeeds/13358319.cms", // FMCG industry
  ],
  siteDomain: "economictimes.indiatimes.com",
});
