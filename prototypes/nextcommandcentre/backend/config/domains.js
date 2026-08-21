// The five domains the front end already renders as category rails. Names
// match the prototype's domains array exactly (data.domains[i].name).
const DOMAINS = [
  { id: "personal", name: "Personal care", brandsLabel: "Rexona, Lifebuoy, Lux" },
  { id: "beauty", name: "Beauty and wellbeing", brandsLabel: "Dove, Sunsilk, Pond's" },
  { id: "home", name: "Home care", brandsLabel: "Surf Excel, Rin, Vim" },
  { id: "foods", name: "Foods and refreshment", brandsLabel: "Knorr, Kissan, Brooke Bond" },
  { id: "supply", name: "Supply chain", brandsLabel: "Depots, distributors, lanes" },
];

function domainNameFor(id) {
  return DOMAINS.find((d) => d.id === id)?.name || id;
}

module.exports = { DOMAINS, domainNameFor };
