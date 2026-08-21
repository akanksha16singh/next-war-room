const { makeAdapter } = require("./rssAdapterFactory");

module.exports = makeAdapter({
  id: "business-standard",
  name: "Business Standard",
  feeds: [
    "https://www.business-standard.com/rss/latest.rss", // Latest news
    "https://www.business-standard.com/rss/companies-101.rss", // Companies
  ],
  siteDomain: "business-standard.com",
});
