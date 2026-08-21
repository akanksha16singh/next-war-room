const { DECISION_WEIGHTS, VERDICT_THRESHOLDS, HARD_RISK_EVENT_TYPES } = require("../config/weights");

function clamp(v) {
  return Math.max(0, Math.min(100, v));
}

function pickVerdict(score) {
  return VERDICT_THRESHOLDS.find((t) => score >= t.min) || VERDICT_THRESHOLDS[VERDICT_THRESHOLDS.length - 1];
}

/** More corroborating independent sources on the same event raises momentum, capped so one story can't dominate. */
function computeMomentum({ sourceCount = 1, urgency = 0 }) {
  return clamp(20 + Math.min(sourceCount, 5) * 14 + urgency * 0.25);
}

/** Risk is a gate as much as a score: a hard-risk event type (regulatory) is floored at a minimum risk level. */
function computeRisk({ impact, sentiment, eventType, confidence }) {
  let risk = impact.regulatory * 0.5 + (100 - confidence) * 0.2;
  if (sentiment === "negative") risk += 25;
  if (HARD_RISK_EVENT_TYPES.has(eventType)) risk = Math.max(risk, 55);
  return clamp(risk);
}

function computeBrandFit({ relevance, impact }) {
  return clamp(relevance * 0.65 + impact.brand * 0.35);
}

/**
 * Deterministic, reproducible decision score. Every input is either the
 * live signal itself (relevance, urgency, impact, sentiment) or a config
 * value (weights, thresholds), nothing here is randomised. Same inputs
 * always produce the same score and verdict.
 */
function computeDecision({ relevance, urgency, impact, sentiment, eventType, confidence, sourceCount = 1 }) {
  const momentum = computeMomentum({ sourceCount, urgency });
  const risk = computeRisk({ impact, sentiment, eventType, confidence });
  const brandFit = computeBrandFit({ relevance, impact });
  const confidencePenalty = 100 - confidence;

  const w = DECISION_WEIGHTS;
  const rawScore =
    relevance * w.RELEVANCE +
    urgency * w.URGENCY +
    impact.commercial * w.COMMERCIAL +
    brandFit * w.BRAND_FIT +
    momentum * w.MOMENTUM -
    risk * w.RISK -
    confidencePenalty * w.CONFIDENCE_PENALTY;

  const score = Math.round(clamp(rawScore));
  let { verdict, vColor, vBg } = pickVerdict(score);

  // A hard-blocking risk type caps the verdict at Hold even if the arithmetic score is higher,
  // mirroring the prototype's rule that Risk is a gate, not just one more number to average away.
  const isActingVerdict = verdict === "Go now" || verdict === "Go with conditions" || verdict === "Go smaller";
  if (HARD_RISK_EVENT_TYPES.has(eventType) && isActingVerdict) {
    ({ verdict, vColor, vBg } = VERDICT_THRESHOLDS.find((t) => t.verdict === "Hold"));
  }

  const decisionClass = eventType === "supply_chain" ? "supply_move"
    : eventType === "product_launch" ? "concept_launch"
    : eventType === "leadership" || eventType === "regulatory" || eventType === "financial_results" ? "brand_book_change"
    : "concept_launch";

  return {
    score,
    verdict,
    vColor,
    vBg,
    decisionClass,
    inputs: { relevance, urgency, commercial: impact.commercial, brandFit, momentum, risk, confidence, confidencePenalty },
    weights: w,
    rationale: buildRationale({ verdict, relevance, urgency, risk, momentum, sourceCount, eventType }),
    recommendedAction: buildRecommendedAction(verdict, eventType),
  };
}

function buildRationale({ verdict, relevance, urgency, risk, momentum, sourceCount, eventType }) {
  const parts = [];
  parts.push(`Relevance ${relevance} and urgency ${urgency} on a ${eventType.replace(/_/g, " ")} story.`);
  parts.push(sourceCount > 1 ? `Corroborated by ${sourceCount} independent sources, which raised momentum to ${momentum}.` : `Seen from a single source so far, momentum held at ${momentum}.`);
  if (risk >= 55) parts.push(`Risk scored ${risk}, high enough to gate the verdict at Hold regardless of the arithmetic score.`);
  else if (risk >= 30) parts.push(`Risk scored ${risk}, factored in as a deduction rather than a block.`);
  else parts.push(`Risk scored ${risk}, low enough not to constrain the call.`);
  parts.push(`Net verdict: ${verdict}.`);
  return parts.join(" ");
}

function buildRecommendedAction(verdict, eventType) {
  const actionByVerdict = {
    "Go now": "Brief the relevant brand and creative teams immediately and prepare a response within hours.",
    "Go with conditions": "Prepare a response, but hold publishing until the named risk conditions clear.",
    "Go smaller": "Engage at low cost and low commitment (organic only, no paid support) while monitoring.",
    "Hold": "Do not act yet. Monitor for the next update and re-score when new coverage arrives.",
    "Do nothing": "No action recommended. Log the signal and revisit only if the story escalates.",
  };
  const eventNote = {
    regulatory: " Route to Legal before any public response.",
    supply_chain: " Route to Supply Chain and Trade for an operational read.",
    financial_results: " Route to Investor Relations and Finance before any public comment.",
    leadership: " Route to Corporate Communications before any public comment.",
  };
  return (actionByVerdict[verdict] || "Review manually.") + (eventNote[eventType] || "");
}

module.exports = { computeDecision, computeMomentum, computeRisk, computeBrandFit, pickVerdict };
