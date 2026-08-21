const express = require("express");
const { buildDailyDigest } = require("../services/digest");

const router = express.Router();

router.get("/digest/today", (req, res, next) => {
  try {
    res.json(buildDailyDigest());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
