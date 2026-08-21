const express = require("express");
const { ADAPTERS } = require("../sources");
const { SOURCE_RELIABILITY, DEFAULT_SOURCE_RELIABILITY } = require("../config/weights");
const repo = require("../database/repository");

const router = express.Router();

router.get("/sources", (req, res) => {
  const states = new Map(repo.listSourceStates().map((s) => [s.source, s]));
  const items = ADAPTERS.map((a) => {
    const reliability = SOURCE_RELIABILITY[a.name] || DEFAULT_SOURCE_RELIABILITY;
    const state = states.get(a.name) || {};
    return {
      id: a.id,
      name: a.name,
      reliability: reliability.reliability,
      type: reliability.type,
      region: reliability.region,
      lastRunAt: state.lastRunAt || null,
      lastSuccessAt: state.lastSuccessAt || null,
      lastError: state.lastError || null,
      articlesTotal: state.articlesTotal || 0,
    };
  });
  res.json({ items, total: items.length });
});

module.exports = router;
