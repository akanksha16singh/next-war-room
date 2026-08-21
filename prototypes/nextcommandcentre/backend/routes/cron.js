const express = require("express");
const { runIngestion } = require("../services/ingestion");

const router = express.Router();

function checkSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const header = req.headers["x-cron-secret"];
  return bearer === secret || header === secret;
}

// POST /api/cron/news: for an external scheduler (Render Cron Job,
// cron-job.org, GitHub Actions schedule) to trigger ingestion when the
// hosting platform does not support a persistent in-process cron job.
// Disabled entirely unless CRON_SECRET is configured.
router.post("/cron/news", async (req, res, next) => {
  if (!process.env.CRON_SECRET) {
    return res.status(503).json({ error: "CRON_SECRET is not configured; this endpoint is disabled." });
  }
  if (!checkSecret(req)) {
    return res.status(401).json({ error: "Invalid or missing cron secret." });
  }
  try {
    const result = await runIngestion({ trigger: "cron" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
