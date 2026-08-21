const { test } = require("node:test");
const assert = require("node:assert/strict");
const { computeDecision } = require("../backend/services/decisionEngine");

const strongPositiveImpact = { consumer: 80, commercial: 85, brand: 75, supplyChain: 20, competitor: 30, regulatory: 5 };
const weakImpact = { consumer: 10, commercial: 10, brand: 10, supplyChain: 5, competitor: 5, regulatory: 5 };
const regulatoryImpact = { consumer: 40, commercial: 40, brand: 40, supplyChain: 20, competitor: 10, regulatory: 90 };

test("a strong, low-risk, high-confidence signal scores well and reads as an action verdict", () => {
  const d = computeDecision({ relevance: 90, urgency: 75, impact: strongPositiveImpact, sentiment: "positive", eventType: "product_launch", confidence: 85, sourceCount: 3 });
  assert.ok(d.score > 55, `expected a high score, got ${d.score}`);
  assert.notEqual(d.verdict, "Do nothing");
});

test("a weak, low-relevance signal scores low", () => {
  const d = computeDecision({ relevance: 15, urgency: 10, impact: weakImpact, sentiment: "neutral", eventType: "general", confidence: 30, sourceCount: 1 });
  assert.ok(d.score < 40, `expected a low score, got ${d.score}`);
});

test("decision scoring is deterministic: same inputs always produce the same score", () => {
  const input = { relevance: 70, urgency: 55, impact: strongPositiveImpact, sentiment: "neutral", eventType: "pricing", confidence: 60, sourceCount: 2 };
  const a = computeDecision(input);
  const b = computeDecision({ ...input });
  assert.equal(a.score, b.score);
  assert.equal(a.verdict, b.verdict);
});

test("a regulatory event type is gated to at most Hold even with a high raw score", () => {
  const d = computeDecision({ relevance: 95, urgency: 90, impact: regulatoryImpact, sentiment: "neutral", eventType: "regulatory", confidence: 90, sourceCount: 4 });
  assert.ok(["Hold", "Do nothing"].includes(d.verdict), `expected a gated verdict, got ${d.verdict}`);
});

test("more corroborating sources raise the score for otherwise identical signals", () => {
  const base = { relevance: 60, urgency: 50, impact: strongPositiveImpact, sentiment: "neutral", eventType: "product_launch", confidence: 60 };
  const one = computeDecision({ ...base, sourceCount: 1 });
  const four = computeDecision({ ...base, sourceCount: 4 });
  assert.ok(four.score >= one.score, `expected more sources to not lower the score (${one.score} -> ${four.score})`);
});

test("lower confidence (bigger confidence penalty) lowers the score for otherwise identical signals", () => {
  const base = { relevance: 60, urgency: 50, impact: strongPositiveImpact, sentiment: "neutral", eventType: "product_launch", sourceCount: 2 };
  const highConfidence = computeDecision({ ...base, confidence: 90 });
  const lowConfidence = computeDecision({ ...base, confidence: 30 });
  assert.ok(highConfidence.score > lowConfidence.score);
});

test("score is always clamped to 0-100", () => {
  const extreme = computeDecision({ relevance: 100, urgency: 100, impact: { consumer: 100, commercial: 100, brand: 100, supplyChain: 100, competitor: 100, regulatory: 100 }, sentiment: "positive", eventType: "product_launch", confidence: 100, sourceCount: 10 });
  assert.ok(extreme.score >= 0 && extreme.score <= 100);
});
