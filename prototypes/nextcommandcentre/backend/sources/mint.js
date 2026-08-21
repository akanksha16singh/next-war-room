const { makeAdapter } = require("./rssAdapterFactory");

module.exports = makeAdapter({
  id: "mint",
  name: "Mint",
  feeds: [
    "https://www.livemint.com/rss/companies", // Companies
    "https://www.livemint.com/rss/industry", // Industry
  ],
  siteDomain: "livemint.com",
});
