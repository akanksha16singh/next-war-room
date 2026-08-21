const { AGENTS } = require("../config/weights");

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function verdictFromScore(score) {
  if (score >= 65) return "Go";
  if (score >= 35) return "Hold";
  return "Stop";
}

/**
 * The six specialist agents from the prototype (Culture, Brand, Creative,
 * Risk, Commercial, Media), each scored from a different deterministic
 * slice of the live signal instead of a hardcoded opinion. Same signal in,
 * same six verdicts out, every time.
 */
function computeAgentScores({ relevance, urgency, impact, sentiment, momentum, risk, brandFit, sourceCount = 1, eventType }) {
  const cultureScore = clamp(0.5 * impact.consumer + 0.3 * momentum + 0.2 * urgency);
  const brandScore = clamp(0.75 * brandFit + (sentiment === "positive" ? 15 : sentiment === "negative" ? -15 : 0) + 10);
  const creativeScore = clamp(0.6 * relevance + 0.4 * (100 - risk));
  const riskScore = clamp(100 - risk);
  const commercialScore = clamp(0.6 * impact.commercial + 0.4 * impact.consumer);
  const sourceReach = Math.min(sourceCount, 4) * 25;
  const mediaScore = clamp(0.5 * momentum + 0.3 * urgency + 0.2 * sourceReach);

  const scores = {
    Culture: cultureScore,
    Brand: brandScore,
    Creative: creativeScore,
    Risk: riskScore,
    Commercial: commercialScore,
    Media: mediaScore,
  };

  const lines = {
    Culture: `Consumer relevance scored ${impact.consumer} with momentum at ${momentum}, on a story ${urgency >= 55 ? "still gaining pace" : "moving at a steady pace"}.`,
    Brand: `Brand fit scored ${brandFit} against the matched category, with sentiment reading ${sentiment}.`,
    Creative: `Relevance of ${relevance} against a risk level of ${risk} shapes how much room there is to make something.`,
    Risk: risk >= 55
      ? `Risk scored ${risk}, high enough that this needs a named gate before anything ships.`
      : risk >= 30
        ? `Risk scored ${risk}, worth a condition but not a block.`
        : `Risk scored ${risk}, no material blocker identified from the signal available.`,
    Commercial: `Commercial impact scored ${impact.commercial} with consumer impact at ${impact.consumer}.`,
    Media: `Momentum at ${momentum} across ${sourceCount} independent source${sourceCount === 1 ? "" : "s"} so far.`,
  };

  return AGENTS.map((name) => ({
    name,
    verdict: verdictFromScore(scores[name]),
    score: scores[name],
    line: lines[name],
  }));
}

module.exports = { computeAgentScores, verdictFromScore };
