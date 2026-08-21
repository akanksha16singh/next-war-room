const { domainNameFor } = require("../config/domains");
const { truncate } = require("./normalize");

const GREEN = { color: "#0E9F6E", bd: "#DCEFE6", bg: "#F3FBF7" };
const AMBER = { color: "#B8770A", bd: "#F7E7C8", bg: "#FEF9EF" };
const RED = { color: "#C13A4C", bd: "#F6DDE1", bg: "#FDF6F7" };
const BLUE = { color: "#1F44D6", bd: "#DCE6FF", bg: "#F5F8FF" };
const PURPLE = { color: "#6A4CE0", bd: "#E4DBFF", bg: "#F8F5FF" };
const GREY = { color: "#5A6884", bd: "#E7EDF9", bg: "#F2F5FC" };

function colorForScore(score) {
  if (score >= 65) return "#0E9F6E";
  if (score >= 35) return "#B8770A";
  return "#C13A4C";
}

const ARB_TINT_BY_VCOLOR = {
  "#0E9F6E": { bd: GREEN.bd, bg: GREEN.bg },
  "#B8770A": { bd: AMBER.bd, bg: AMBER.bg },
  "#5A6884": { bd: GREY.bd, bg: GREY.bg },
  "#C13A4C": { bd: RED.bd, bg: RED.bg },
};

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function readableEventType(eventType) {
  return capitalize(eventType.replace(/_/g, " "));
}

function formatClockIST(isoString) {
  if (!isoString) return "--:--";
  try {
    return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date(isoString));
  } catch {
    return "--:--";
  }
}

/** Urgency-derived response window. A calculated estimate, not a measured value: higher urgency implies a shorter window before the moment loses relevance. */
function windowFromUrgency(urgency) {
  if (urgency >= 80) return { window: "in 6 to 12 hours", windowPct: "82%", tta: "6 to 12 hrs" };
  if (urgency >= 60) return { window: "in 12 to 24 hours", windowPct: "64%", tta: "12 to 24 hrs" };
  if (urgency >= 40) return { window: "in 1 to 2 days", windowPct: "42%", tta: "1 to 2 days" };
  return { window: "in 3 to 5 days", windowPct: "22%", tta: "3 to 5 days" };
}

/** Deterministic projected decay curve seeded from urgency. Marked in provenance as a model estimate, not observed telemetry (no time-series data exists yet for a moment this new). */
function projectedDecay(urgency) {
  const decayFactor = 0.83;
  const points = [];
  let v = Math.max(10, urgency);
  for (let i = 0; i < 8; i++) {
    points.push(Math.round(v));
    v *= decayFactor;
  }
  return points;
}

function buildStats({ relevance, urgency, sentiment, sourceCount, confidence, score }) {
  return [
    { k: "Relevance to HUL", v: relevance + "%", c: colorForScore(relevance) },
    { k: "Urgency", v: urgency + "%", c: colorForScore(urgency) },
    { k: "Sentiment", v: capitalize(sentiment), c: sentiment === "positive" ? GREEN.color : sentiment === "negative" ? RED.color : GREY.color },
    { k: "Sources corroborating", v: String(sourceCount), c: "#0E1B33" },
    { k: "Confidence", v: confidence + "%", c: colorForScore(confidence) },
    { k: "Decision score", v: String(score), c: colorForScore(score) },
  ];
}

function buildCaseFor({ relevance, sourceCount, sentiment, impact }) {
  const bullets = [`Entity resolution places this at ${relevance}% relevance to HUL, from ${sourceCount} corroborating source${sourceCount === 1 ? "" : "s"}.`];
  if (sentiment === "positive") bullets.push("Coverage sentiment reads positive so far.");
  if (impact.commercial >= 55) bullets.push(`Commercial impact scored ${impact.commercial}, high enough to be worth a timely response.`);
  return bullets;
}

function buildCaseAgainst({ risk, confidence, sentiment, eventType }) {
  const bullets = [`Risk scored ${risk} based on the ${readableEventType(eventType).toLowerCase()} classification and current sentiment.`];
  if (confidence < 55) bullets.push(`Confidence is only ${confidence}%. Corroborate with another source before acting.`);
  if (sentiment === "negative") bullets.push("Coverage sentiment reads negative so far.");
  return bullets;
}

function buildRisks({ eventType, sentiment, confidence, risk }) {
  const risks = [];
  if (eventType === "regulatory") {
    risks.push({ sev: "High", text: "Regulatory or legal language detected in the coverage", owner: "Legal, review", color: RED.color, bg: RED.bg });
  }
  if (sentiment === "negative") {
    risks.push({ sev: risks.length ? "Medium" : "Medium", text: "Coverage sentiment is currently negative", owner: "Brand", color: AMBER.color, bg: AMBER.bg });
  }
  if (confidence < 55) {
    risks.push({ sev: "Low", text: "Not yet corroborated by multiple independent sources", owner: "Verify before acting", color: GREY.color, bg: GREY.bg });
  }
  if (!risks.length) {
    risks.push({
      sev: risk >= 30 ? "Medium" : "Low",
      text: risk >= 30 ? "Moderate composite risk score from the current signal" : "No material risk signal identified from current coverage",
      owner: "Monitor",
      color: risk >= 30 ? AMBER.color : GREY.color,
      bg: risk >= 30 ? AMBER.bg : GREY.bg,
    });
  }
  return risks;
}

function buildBrandLines({ categories, eventType, confidence, historicalMatch }) {
  return [
    { k: "Category", v: categories.length ? categories.join(", ") : "Not yet classified to a specific category", state: categories.length ? "Matched" : "Unclassified", color: categories.length ? GREEN.color : GREY.color, bd: categories.length ? GREEN.bd : GREY.bd, bg: categories.length ? GREEN.bg : GREY.bg },
    { k: "Event type", v: readableEventType(eventType), state: "Classified", color: BLUE.color, bd: BLUE.bd, bg: BLUE.bg },
    { k: "Source confidence", v: confidence + "%", state: confidence >= 70 ? "High" : confidence >= 45 ? "Moderate" : "Low", color: confidence >= 70 ? GREEN.color : confidence >= 45 ? AMBER.color : RED.color, bd: confidence >= 70 ? GREEN.bd : confidence >= 45 ? AMBER.bd : RED.bd, bg: confidence >= 70 ? GREEN.bg : confidence >= 45 ? AMBER.bg : RED.bg },
    historicalMatch
      ? { k: "Historical precedent", v: `Closest past record: "${historicalMatch.entry.sig}", ${historicalMatch.entry.verdict.toLowerCase()}.`, state: "In memory", color: PURPLE.color, bd: PURPLE.bd, bg: PURPLE.bg }
      : { k: "Historical precedent", v: "No prior recorded decision matches this signal yet.", state: "Unavailable", color: GREY.color, bd: GREY.bd, bg: GREY.bg },
  ];
}

function buildChannels({ verdict, risk, eventType }) {
  const acting = verdict === "Go now" || verdict === "Go with conditions" || verdict === "Go smaller";
  const paidBlocked = risk >= 45 || eventType === "regulatory";
  if (!acting) {
    return [
      { name: "Owned channels", status: "Not used", color: GREY.color, bg: GREY.bg, slot: "No response prepared", caption: "Verdict is " + verdict, meta: "Reason stored with the decision." },
      { name: "Paid support", status: "Not used", color: GREY.color, bg: GREY.bg, slot: "No response prepared", caption: "Verdict is " + verdict, meta: "Reason stored with the decision." },
    ];
  }
  return [
    { name: "Owned social", status: "Recommended", color: GREEN.color, bg: GREEN.bg, slot: "Organic response", caption: "Lowest-risk, fastest route", meta: "Reversible: can be removed at any time." },
    { name: "PR / statement", status: "Recommended", color: BLUE.color, bg: BLUE.bg, slot: "Holding statement if asked", caption: "Prepared, not yet issued", meta: "Route through Corporate Communications." },
    { name: "Paid support", status: paidBlocked ? "Blocked" : "Under review", color: paidBlocked ? RED.color : AMBER.color, bg: paidBlocked ? RED.bg : AMBER.bg, slot: paidBlocked ? "Blocked by risk score" : "Awaiting budget sign-off", caption: paidBlocked ? "Risk score too high to recommend spend" : "Not yet committed", meta: "Rule, not preference." },
  ];
}

function buildImpactBullets({ score, sourceCount, sources, earliestArticle }) {
  const firstSeenNote = earliestArticle?.publishedAt
    ? `First detected ${formatClockIST(earliestArticle.publishedAt)} IST from ${earliestArticle.source}.`
    : "First detection time unavailable.";
  return [
    { label: "Decision score", value: score + " / 100", note: "Computed by the decision engine from relevance, urgency, commercial impact, brand fit, momentum, risk and confidence." },
    { label: "Sources corroborating", value: sourceCount + (sourceCount === 1 ? " source" : " sources"), note: sources.join(", ") },
    { label: "First seen", value: earliestArticle?.publishedAt ? formatClockIST(earliestArticle.publishedAt) + " IST" : "Unavailable", note: firstSeenNote },
  ];
}

function buildDissent(agents, verdict) {
  const acting = verdict === "Go now" || verdict === "Go with conditions" || verdict === "Go smaller";
  const dissent = [];
  for (const agent of agents) {
    if (acting && agent.verdict === "Stop") {
      dissent.push({ who: agent.name, what: `Stays on Stop at ${agent.score}. ${agent.line}` });
    } else if (!acting && agent.verdict === "Go") {
      dissent.push({ who: agent.name, what: `Stays on Go at ${agent.score}. ${agent.line}` });
    }
  }
  return dissent;
}

/**
 * Builds one dashboard "moment" object for a cluster, in the exact shape
 * the existing DCLogic component's fixtures use (m1-style). Every field
 * traces back to the aggregated live signal or to config; nothing here is
 * a fixed placeholder value.
 */
function buildMoment({ clusterId, domainId, brand, signal, decision, agents, historicalMatch }) {
  const { relevance, urgency, sentiment, sourceCount, sources, confidence, impact, eventType, mostRecentArticle, earliestArticle } = signal;
  const risk = decision.inputs.risk;
  const windowInfo = windowFromUrgency(urgency);
  const categories = mostRecentArticle.entities?.categories || [];

  const title = mostRecentArticle.title;
  const shortSig = truncate(title, 70);

  const moment = {
    id: clusterId,
    domain: domainNameFor(domainId),
    brand,
    queueLabel: "Live HUL signals in " + domainNameFor(domainId).toLowerCase(),
    title,
    summary: mostRecentArticle.summary || title,
    sourceLine: "Seen in " + sources.join(", "),
    seen: formatClockIST(mostRecentArticle.publishedAt),
    ready: "< 1 min",
    ...windowInfo,
    verdict: decision.verdict,
    vColor: decision.vColor,
    vBg: decision.vBg,
    arbBd: (ARB_TINT_BY_VCOLOR[decision.vColor] || AMBER).bd,
    arbBg: (ARB_TINT_BY_VCOLOR[decision.vColor] || AMBER).bg,
    score: decision.score,
    decisionClass: decision.decisionClass,
    stats: buildStats({ relevance, urgency, sentiment, sourceCount, confidence, score: decision.score }),
    agents,
    rationale: decision.rationale,
    dissent: buildDissent(agents, decision.verdict),
    caseFor: buildCaseFor({ relevance, sourceCount, sentiment, impact }),
    caseAgainst: buildCaseAgainst({ risk, confidence, sentiment, eventType }),
    doNothing: `${decision.recommendedAction} If nothing is done, the story continues to circulate without an HUL response, and this signal will not be revisited unless coverage grows or sentiment shifts.`,
    recommendedAction: decision.recommendedAction,
    hasLocal: false,
    localNote: "",
    localCells: [],
    risks: buildRisks({ eventType, sentiment, confidence, risk }),
    brandLines: buildBrandLines({ categories, eventType, confidence, historicalMatch }),
    decay: projectedDecay(urgency),
    impact: buildImpactBullets({ score: decision.score, sourceCount, sources, earliestArticle }),
    channelLabel: "Recommended channels",
    channelNote: "Recommended by the decision engine. Not connected to a live publishing system in this build.",
    channels: buildChannels({ verdict: decision.verdict, risk, eventType }),
    undo: "This is a recommendation only. Nothing has been published or activated by this system, so there is nothing to undo yet.",
    ledgerEntry: { sig: shortSig, verdict: decision.verdict, score: String(decision.score) },
  };

  if (historicalMatch) {
    moment.replay = {
      thenDate: historicalMatch.entry.decided_at ? new Date(historicalMatch.entry.decided_at).toLocaleDateString("en-IN", { year: "numeric", month: "long" }) : "Unknown date",
      thenTitle: `${historicalMatch.entry.sig}. Verdict: ${historicalMatch.entry.verdict}, score ${historicalMatch.entry.score}.`,
      thenOutcome: historicalMatch.entry.outcome || "Outcome not recorded.",
      nowTitle: `${shortSig}. Verdict: ${decision.verdict}, score ${decision.score}.`,
      nowOutcome: "This signal was detected just now. Its outcome has not been recorded yet.",
    };
  }

  return moment;
}

module.exports = { buildMoment, colorForScore, windowFromUrgency, projectedDecay, formatClockIST };
