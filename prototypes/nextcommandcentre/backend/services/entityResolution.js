const {
  COMPANY_TERMS,
  AMBIGUOUS_COMPANY_TERMS,
  BRANDS,
  AMBIGUOUS_BRAND_ALIASES,
} = require("../config/entities");

const RELEVANCE_THRESHOLD = 40;
const FMCG_CONTEXT_WORDS = ["fmcg", "consumer goods", "fast moving consumer goods", "packaged goods", "personal care", "home care"];

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Standalone-word match: "HUL" must not match inside "HULK" or a URL slug. */
function wordMatches(text, term) {
  const re = new RegExp(`(?<![a-zA-Z0-9])${escapeRegex(term)}(?![a-zA-Z0-9])`, "i");
  return re.test(text);
}

/**
 * Decides whether an article is actually about HUL (not merely containing a
 * word that happens to match a brand alias), and extracts the entities that
 * drive the rest of the pipeline. Returns relevance/confidence on 0-100 so a
 * downstream consumer can see exactly why an article was kept or dropped.
 */
function resolveEntities(article) {
  const text = `${article.title} ${article.summary}`;
  let score = 0;
  const signals = [];

  let companyMatched = false;
  for (const term of COMPANY_TERMS) {
    if (wordMatches(text, term)) {
      companyMatched = true;
      // "HUL" is technically a shorter, less specific token than the full company name,
      // but in Indian financial press it is the standard shorthand with no common
      // unrelated expansion, so on its own (word-boundary matched, so never a substring
      // of "HULK" etc.) it is reliable enough to clear the relevance threshold alone.
      const weight = AMBIGUOUS_COMPANY_TERMS.has(term) ? 45 : 60;
      score += weight;
      signals.push({ type: "company", term, weight });
      break; // one company match is enough, avoid double counting aliases of the same entity
    }
  }

  const matchedBrands = [];
  for (const brand of BRANDS) {
    const hit = brand.aliases.find((alias) => wordMatches(text, alias));
    if (!hit) continue;
    const ambiguous = AMBIGUOUS_BRAND_ALIASES.has(brand.name);
    const weight = ambiguous ? 15 : 45;
    score += weight;
    signals.push({ type: "brand", term: brand.name, weight, ambiguous });
    matchedBrands.push(brand);
  }

  const hasFmcgContext = FMCG_CONTEXT_WORDS.some((w) => text.toLowerCase().includes(w));
  if (hasFmcgContext && matchedBrands.some((b) => AMBIGUOUS_BRAND_ALIASES.has(b.name))) {
    score += 10;
    signals.push({ type: "context", term: "fmcg-context", weight: 10 });
  }

  // An ambiguous brand alias with no other corroborating signal is too weak to trust alone.
  const onlyAmbiguousBrand = !companyMatched && matchedBrands.length > 0 && matchedBrands.every((b) => AMBIGUOUS_BRAND_ALIASES.has(b.name)) && !hasFmcgContext;
  if (onlyAmbiguousBrand) score = Math.min(score, 25);

  const relevance = Math.max(0, Math.min(100, score));
  const isRelevant = relevance >= RELEVANCE_THRESHOLD;

  const distinctSignalTypes = new Set(signals.map((s) => s.type)).size;
  const confidence = Math.max(10, Math.min(95, 25 + distinctSignalTypes * 20 + (companyMatched ? 15 : 0)));

  const categories = Array.from(new Set(matchedBrands.map((b) => b.category)));
  const domainId = matchedBrands.length ? matchedBrands[0].domainId : null;

  return {
    isRelevant,
    relevance,
    confidence,
    signals,
    entities: {
      company: companyMatched ? ["HUL"] : [],
      brands: matchedBrands.map((b) => b.name),
      categories,
      products: [],
    },
    domainId,
    primaryBrand: matchedBrands[0]?.name || null,
  };
}

module.exports = { resolveEntities, RELEVANCE_THRESHOLD };
