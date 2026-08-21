const timesOfIndia = require("./timesOfIndia");
const economicTimes = require("./economicTimes");
const businessStandard = require("./businessStandard");
const moneycontrol = require("./moneycontrol");
const mint = require("./mint");
const financialExpress = require("./financialExpress");
const cnbcTv18 = require("./cnbcTv18");
const googleNews = require("./googleNews");

// Priority order from the product brief. To add another source: write a new
// adapters/<name>.js exporting { id, name, fetchArticles() }, either via
// rssAdapterFactory.makeAdapter() for an RSS-backed source or by hand for a
// licensed API, then add it to this list.
const ADAPTERS = [
  timesOfIndia,
  economicTimes,
  businessStandard,
  moneycontrol,
  mint,
  financialExpress,
  cnbcTv18,
  googleNews,
];

module.exports = { ADAPTERS };
