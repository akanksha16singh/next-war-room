const { makeAdapter } = require("./rssAdapterFactory");

module.exports = makeAdapter({
  id: "financial-express",
  name: "Financial Express",
  feeds: [
    "https://www.financialexpress.com/feed/", // All stories
  ],
  siteDomain: "financialexpress.com",
});
