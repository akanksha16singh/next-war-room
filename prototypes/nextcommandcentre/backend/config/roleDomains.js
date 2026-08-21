/**
 * Which domains (the same five domain ids the front end already renders:
 * personal, beauty, home, foods, supply) each role's queue should draw live
 * moments from. This mirrors the domain footprint the prototype's fixtures
 * already gave each role (e.g. the Brand role's fixture moments were all
 * Personal Care; Legal's fixture moments spanned Personal Care, Beauty and
 * Home Care) so the live queue keeps the same scope the demo established,
 * instead of a curated per-story assignment we have no real system for.
 */
const ROLE_DOMAINS = {
  brand: ["personal"],
  creative: ["personal", "beauty", "home"],
  legal: ["personal", "beauty", "home"],
  media: ["personal", "foods"],
  supply: ["supply", "foods"],
  leadership: ["personal", "beauty", "home", "foods", "supply"],
};

function domainsForRole(roleId) {
  return ROLE_DOMAINS[roleId] || [];
}

module.exports = { ROLE_DOMAINS, domainsForRole };
