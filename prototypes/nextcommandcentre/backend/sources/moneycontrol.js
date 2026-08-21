const { makeAdapter } = require("./rssAdapterFactory");

module.exports = makeAdapter({
  id: "moneycontrol",
  name: "Moneycontrol",
  feeds: [
    "https://www.moneycontrol.com/rss/business.xml", // Business
    "https://www.moneycontrol.com/rss/results.xml", // Results
  ],
  siteDomain: "moneycontrol.com",
});
