/**
 * Decision engine configuration. Every weight the scoring layer uses lives
 * here so the formula can be tuned without touching engine code. All scores
 * the engine consumes and produces are normalised to 0-100.
 *
 * decisionScore =
 *   relevance      * RELEVANCE
 * + urgency        * URGENCY
 * + commercial     * COMMERCIAL
 * + brandFit       * BRAND_FIT
 * + momentum       * MOMENTUM
 * - risk           * RISK
 * - (100 - confidence) * CONFIDENCE_PENALTY
 *
 * then clamped to [0, 100]. See backend/services/decisionEngine.js.
 */
const DECISION_WEIGHTS = {
  RELEVANCE: 0.28,
  URGENCY: 0.17,
  COMMERCIAL: 0.22,
  BRAND_FIT: 0.16,
  MOMENTUM: 0.12,
  RISK: 0.25,
  CONFIDENCE_PENALTY: 0.12,
};

// Score thresholds (post-weighting, 0-100) that map a decision score to one
// of the fixed verdicts the front end already renders.
const VERDICT_THRESHOLDS = [
  { min: 80, verdict: "Go now", vColor: "#0E9F6E", vBg: "#E6F7F0" },
  { min: 65, verdict: "Go with conditions", vColor: "#B8770A", vBg: "#FEF4E4" },
  { min: 50, verdict: "Go smaller", vColor: "#B8770A", vBg: "#FEF4E4" },
  { min: 35, verdict: "Hold", vColor: "#5A6884", vBg: "#F2F5FC" },
  { min: 0, verdict: "Do nothing", vColor: "#C13A4C", vBg: "#FCECEE" },
];

// A hard-blocking risk (regulatory action, litigation, safety recall) caps
// the verdict at "Hold" regardless of score, the same way the prototype's
// Risk agent gates rather than averages away a hard objection.
const HARD_RISK_EVENT_TYPES = new Set(["regulatory"]);

// Source reliability, used both to weight how much a single article moves a
// signal's confidence and to explain provenance to the user. 0-1 scale.
// Values are editorial judgements about general track record for accurate,
// promptly corrected business reporting, not a claim about any single story.
const SOURCE_RELIABILITY = {
  "Times of India": { reliability: 0.82, type: "news", region: "India" },
  "Economic Times": { reliability: 0.88, type: "business-news", region: "India" },
  "Business Standard": { reliability: 0.87, type: "business-news", region: "India" },
  "Moneycontrol": { reliability: 0.83, type: "business-news", region: "India" },
  "Mint": { reliability: 0.86, type: "business-news", region: "India" },
  "Financial Express": { reliability: 0.82, type: "business-news", region: "India" },
  "CNBC-TV18": { reliability: 0.84, type: "business-news", region: "India" },
  "Google News": { reliability: 0.6, type: "aggregator", region: "Global" },
};

const DEFAULT_SOURCE_RELIABILITY = { reliability: 0.55, type: "news", region: "Unknown" };

// Six specialist agents, unchanged from the prototype. Each maps to a small
// set of deterministic inputs drawn from the live signal (see
// backend/services/agentScores.js) instead of a hardcoded opinion.
const AGENTS = ["Culture", "Brand", "Creative", "Risk", "Commercial", "Media"];

module.exports = {
  DECISION_WEIGHTS,
  VERDICT_THRESHOLDS,
  HARD_RISK_EVENT_TYPES,
  SOURCE_RELIABILITY,
  DEFAULT_SOURCE_RELIABILITY,
  AGENTS,
};
