const { makeAdapter } = require("./rssAdapterFactory");

module.exports = makeAdapter({
  id: "cnbc-tv18",
  name: "CNBC-TV18",
  feeds: [
    "https://www.cnbctv18.com/commonfeeds/v1/cne/rss/business.xml", // Business
  ],
  siteDomain: "cnbctv18.com",
});
