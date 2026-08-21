// Per-event-type base weights for each impact dimension (0-100 scale before
// relevance/sentiment adjustment). A story classified as "pricing" starts
// with a high commercial and consumer weight, low supply-chain weight, etc.
const EVENT_TYPE_IMPACT_BASE = {
  pricing: { consumer: 60, commercial: 75, brand: 40, supplyChain: 20, competitor: 45, regulatory: 10 },
  product_launch: { consumer: 55, commercial: 60, brand: 65, supplyChain: 30, competitor: 40, regulatory: 5 },
  leadership: { consumer: 15, commercial: 45, brand: 50, supplyChain: 10, competitor: 20, regulatory: 10 },
  financial_results: { consumer: 10, commercial: 80, brand: 30, supplyChain: 10, competitor: 35, regulatory: 5 },
  regulatory: { consumer: 35, commercial: 40, brand: 45, supplyChain: 25, competitor: 15, regulatory: 85 },
  competitor: { consumer: 30, commercial: 50, brand: 35, supplyChain: 15, competitor: 80, regulatory: 5 },
  supply_chain: { consumer: 25, commercial: 55, brand: 20, supplyChain: 85, competitor: 30, regulatory: 15 },
  consumer_sentiment: { consumer: 80, commercial: 35, brand: 70, supplyChain: 5, competitor: 25, regulatory: 15 },
  csr_sustainability: { consumer: 30, commercial: 20, brand: 55, supplyChain: 15, competitor: 10, regulatory: 20 },
  mergers_acquisitions: { consumer: 15, commercial: 75, brand: 40, supplyChain: 20, competitor: 55, regulatory: 30 },
  general: { consumer: 25, commercial: 30, brand: 30, supplyChain: 10, competitor: 15, regulatory: 5 },
};

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Derives the impact object from the article's classification and entity
 * resolution. Every number here is a function of live inputs (event type,
 * relevance, sentiment, urgency) rather than a fixed constant, so it moves
 * with the actual signal.
 */
function deriveImpact({ eventType, relevance, sentiment, urgency }) {
  const base = EVENT_TYPE_IMPACT_BASE[eventType] || EVENT_TYPE_IMPACT_BASE.general;
  const relevanceFactor = 0.4 + (relevance / 100) * 0.6; // relevance scales impact down, never fabricates it up from nothing
  const sentimentPenaltyBoost = sentiment === "negative" ? 1.15 : sentiment === "positive" ? 0.95 : 1;
  const urgencyBoost = 1 + (urgency / 100) * 0.15;

  return {
    consumer: clamp(base.consumer * relevanceFactor * sentimentPenaltyBoost),
    commercial: clamp(base.commercial * relevanceFactor * urgencyBoost),
    brand: clamp(base.brand * relevanceFactor * sentimentPenaltyBoost),
    supplyChain: clamp(base.supplyChain * relevanceFactor),
    competitor: clamp(base.competitor * relevanceFactor),
    regulatory: clamp(base.regulatory * relevanceFactor),
  };
}

module.exports = { deriveImpact, EVENT_TYPE_IMPACT_BASE };
