const express = require("express");
const repo = require("../database/repository");

const router = express.Router();

router.get("/health", (req, res) => {
  const lastRun = repo.getLastIngestionRun();
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    lastIngestionRun: lastRun,
  });
});

module.exports = router;
