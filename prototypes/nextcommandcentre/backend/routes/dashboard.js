const express = require("express");
const { buildDashboard } = require("../services/dashboardBuilder");

const router = express.Router();

router.get("/dashboard", (req, res, next) => {
  try {
    res.json(buildDashboard());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
