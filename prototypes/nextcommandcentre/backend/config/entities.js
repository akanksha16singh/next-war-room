/**
 * Single source of truth for HUL entity resolution.
 *
 * Everything the ingestion pipeline uses to decide "is this article about HUL,
 * and which brand/category/domain does it belong to" lives here. Add a new
 * brand or a new spelling of the company name by editing this file only;
 * nothing else in the pipeline needs to change.
 */

// Company name variants. A match on any of these, on its own, is enough for
// an article to be considered a HUL company mention.
const COMPANY_TERMS = [
  "Hindustan Unilever",
  "Hindustan Unilever Limited",
  "Hindustan Unilever Ltd",
  "HUL India",
  "HUL",
];

// A short word like "HUL" is common as a stock ticker or an unrelated
// abbreviation, so it only counts as a company mention when it appears as a
// standalone word (word-boundary match), never as a substring of another word.
const AMBIGUOUS_COMPANY_TERMS = new Set(["HUL", "HUL India"]);

/**
 * Brand dictionary. Each brand lists the aliases to search for, the
 * consumer category it sits in, and which existing dashboard domain
 * (frontend domains.id) it should roll up into. domainId must be one of the
 * five domains already rendered by the UI: personal, beauty, home, foods,
 * supply. supply has no brands of its own; supply-relevant events are
 * detected by category keywords (see classification.js) rather than a brand.
 */
const BRANDS = [
  { name: "Dove", aliases: ["Dove"], category: "Beauty and Personal Care", domainId: "beauty" },
  { name: "Surf Excel", aliases: ["Surf Excel", "Surf Excel Matic"], category: "Fabric Care", domainId: "home" },
  { name: "Rin", aliases: ["Rin"], category: "Fabric Care", domainId: "home" },
  { name: "Lux", aliases: ["Lux"], category: "Personal Care", domainId: "personal" },
  { name: "Lifebuoy", aliases: ["Lifebuoy"], category: "Personal Care", domainId: "personal" },
  { name: "Clinic Plus", aliases: ["Clinic Plus"], category: "Hair Care", domainId: "beauty" },
  { name: "Sunsilk", aliases: ["Sunsilk"], category: "Hair Care", domainId: "beauty" },
  { name: "Tresemme", aliases: ["Tresemme", "TRESemme", "TRESemmé"], category: "Hair Care", domainId: "beauty" },
  { name: "Pond's", aliases: ["Pond's", "Ponds"], category: "Skin Care", domainId: "beauty" },
  { name: "Lakme", aliases: ["Lakme", "Lakmé"], category: "Beauty and Cosmetics", domainId: "beauty" },
  { name: "Vaseline", aliases: ["Vaseline"], category: "Skin Care", domainId: "beauty" },
  { name: "Closeup", aliases: ["Closeup", "Close Up"], category: "Oral Care", domainId: "personal" },
  { name: "Pepsodent", aliases: ["Pepsodent"], category: "Oral Care", domainId: "personal" },
  { name: "Horlicks", aliases: ["Horlicks"], category: "Health Food Drinks", domainId: "foods" },
  { name: "Bru", aliases: ["Bru", "Bru Coffee"], category: "Beverages", domainId: "foods" },
  { name: "Knorr", aliases: ["Knorr"], category: "Foods", domainId: "foods" },
  { name: "Kissan", aliases: ["Kissan"], category: "Foods", domainId: "foods" },
  { name: "Hellmann's", aliases: ["Hellmann's", "Hellmanns"], category: "Foods", domainId: "foods" },
  { name: "Axe", aliases: ["Axe"], category: "Personal Care", domainId: "personal" },
  { name: "Rexona", aliases: ["Rexona"], category: "Personal Care", domainId: "personal" },
  { name: "Comfort", aliases: ["Comfort"], category: "Fabric Care", domainId: "home" },
  { name: "Vim", aliases: ["Vim"], category: "Home Care", domainId: "home" },
  { name: "Domex", aliases: ["Domex"], category: "Home Care", domainId: "home" },
  { name: "Love Beauty and Planet", aliases: ["Love Beauty and Planet", "Love Beauty & Planet"], category: "Beauty and Personal Care", domainId: "beauty" },
  { name: "Brooke Bond", aliases: ["Brooke Bond", "Brooke Bond Red Label", "Red Label"], category: "Beverages", domainId: "foods" },
];

// Brand aliases that are also common English words. A match on these must be
// scored down unless it co-occurs with a company term or another, less
// ambiguous brand/category signal, otherwise "Comfort" or "Rin" would flag
// almost any consumer story as HUL-relevant.
const AMBIGUOUS_BRAND_ALIASES = new Set(["Comfort", "Lux", "Vim", "Rin", "Bru"]);

// Category / event-type keywords used by the classifier (backend/services/classify.js)
// to tag an article's decision-relevant type. Kept here alongside the entity
// dictionary because both are "what does this article mean" configuration.
const EVENT_TYPE_KEYWORDS = {
  pricing: [
    "price hike", "price hikes", "price cut", "price cuts", "price increase", "price increases",
    "price reduction", "price reductions", "price rise", "price rises", "price war",
    "hikes price", "hikes prices", "hiked price", "hiked prices", "hiking price", "hiking prices",
    "raises price", "raises prices", "raised price", "raised prices", "raising price", "raising prices",
    "cuts price", "cuts prices", "cut price", "cut prices", "cutting price", "cutting prices",
    "increases price", "increases prices", "increased price", "increased prices", "increasing price", "increasing prices",
    "reduces price", "reduces prices", "reduced price", "reduced prices",
    "reprice", "repricing", "costlier", "cheaper by", "raises mrp", "mrp hike",
  ],
  product_launch: ["launch", "launches", "launched", "launching", "unveils", "unveiled", "introduces", "introduced", "new product", "rolls out", "rolled out", "debuts"],
  leadership: ["ceo", "chairman", "chairperson", "managing director", "appoints", "appointed", "appointment", "steps down", "stepped down", "resigns", "resigned", "board of directors", "leadership change", "new md", "new chief executive"],
  financial_results: ["quarterly results", "q1 results", "q2 results", "q3 results", "q4 results", "net profit", "profit rises", "profit falls", "profit jumps", "revenue", "earnings", "ebitda", "results announcement", "annual report", "results beat", "results miss"],
  regulatory: ["fssai", "sebi", "regulatory", "regulator", "compliance", "show cause notice", "penalty", "penalised", "penalized", "fine imposed", "lawsuit", "litigation", "court", "tribunal", "ban on", "banned", "recall order"],
  competitor: ["rival", "rivals", "competitor", "competitors", "market share", "versus", "compared to p&g", "compared to procter", "compared to itc", "compared to patanjali", "loses share", "gains share"],
  supply_chain: ["supply chain", "distribution", "logistics", "factory", "plant shutdown", "plant closure", "manufacturing", "stock out", "stockout", "shortage", "warehouse", "depot", "raw material cost", "input cost", "sourcing"],
  consumer_sentiment: ["consumer sentiment", "boycott", "backlash", "viral", "trending", "controversy", "criticism", "criticised", "criticized", "outrage", "social media reaction"],
  csr_sustainability: ["sustainability", "csr", "esg", "recycling", "recycled", "plastic waste", "carbon", "net zero", "renewable energy"],
  mergers_acquisitions: ["acquire", "acquires", "acquired", "acquisition", "merger", "merges", "stake in", "divest", "divests", "divestment", "buyout", "stake sale"],
};

// Positive/negative sentiment lexicon for the deterministic sentiment scorer.
// Deliberately business-news oriented rather than general purpose.
const SENTIMENT_LEXICON = {
  positive: [
    "growth", "profit", "surge", "record", "strong", "beats estimates", "upgrade",
    "expansion", "positive", "gain", "rally", "outperform", "award", "recognised",
    "recognized", "milestone", "success", "improve", "improves", "improved", "rise", "rises", "rising",
  ],
  negative: [
    "decline", "loss", "falls", "fall", "plunge", "downgrade", "penalty", "fine",
    "lawsuit", "controversy", "backlash", "boycott", "recall", "shortage", "slump",
    "weak", "miss estimates", "criticism", "criticised", "criticized", "probe", "investigation", "ban",
  ],
};

/** All company + brand alias strings, for adapters' cheap pre-filter and for building search queries. */
function getAllSearchTerms() {
  const brandAliases = BRANDS.flatMap((b) => b.aliases);
  return Array.from(new Set([...COMPANY_TERMS, ...brandAliases]));
}

/** A compact query for Google News style search endpoints: company terms OR'd together. */
function getCompanySearchQuery() {
  return COMPANY_TERMS.map((t) => (t.includes(" ") ? `"${t}"` : t)).join(" OR ");
}

module.exports = {
  COMPANY_TERMS,
  AMBIGUOUS_COMPANY_TERMS,
  BRANDS,
  AMBIGUOUS_BRAND_ALIASES,
  EVENT_TYPE_KEYWORDS,
  SENTIMENT_LEXICON,
  getAllSearchTerms,
  getCompanySearchQuery,
};
