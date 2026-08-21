const { EVENT_TYPE_KEYWORDS, SENTIMENT_LEXICON } = require("../config/entities");

function countMatches(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.reduce((n, kw) => (lower.includes(kw) ? n + 1 : n), 0);
}

/** Picks the event type whose keyword set has the most hits in the article text. */
function classifyEventType(text) {
  let best = { type: "general", hits: 0 };
  for (const [type, keywords] of Object.entries(EVENT_TYPE_KEYWORDS)) {
    const hits = countMatches(text, keywords);
    if (hits > best.hits) best = { type, hits };
  }
  return best;
}

/** Deterministic lexicon-based sentiment: positive/negative/neutral plus a -100..100 score. */
function classifySentiment(text) {
  const pos = countMatches(text, SENTIMENT_LEXICON.positive);
  const neg = countMatches(text, SENTIMENT_LEXICON.negative);
  const score = Math.max(-100, Math.min(100, (pos - neg) * 25));
  let sentiment = "neutral";
  if (score > 15) sentiment = "positive";
  else if (score < -15) sentiment = "negative";
  return { sentiment, score, positiveHits: pos, negativeHits: neg };
}

const URGENT_EVENT_TYPES = new Set(["regulatory", "consumer_sentiment", "pricing", "competitor"]);

/** 0-100 urgency from event type plus how recently the article was published. */
function classifyUrgency(eventType, publishedAt) {
  let urgency = URGENT_EVENT_TYPES.has(eventType) ? 55 : 30;
  if (publishedAt) {
    const hoursAgo = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
    if (hoursAgo <= 6) urgency += 30;
    else if (hoursAgo <= 24) urgency += 18;
    else if (hoursAgo <= 72) urgency += 6;
  }
  return Math.max(0, Math.min(100, urgency));
}

function classifyArticle({ title, summary, publishedAt }) {
  const text = `${title} ${summary}`;
  const { type: eventType } = classifyEventType(text);
  const sentimentResult = classifySentiment(text);
  const urgency = classifyUrgency(eventType, publishedAt);
  return { eventType, ...sentimentResult, urgency };
}

module.exports = { classifyArticle, classifyEventType, classifySentiment, classifyUrgency };
