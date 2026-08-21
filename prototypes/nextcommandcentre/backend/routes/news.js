const express = require("express");
const rateLimit = require("express-rate-limit");
const repo = require("../database/repository");
const { runIngestion } = require("../services/ingestion");

const router = express.Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many refresh requests. Try again in a few minutes." },
});

router.get("/news", (req, res) => {
  const { company, date, source, page, limit } = req.query;

  if (date && (typeof date !== "string" || !DATE_RE.test(date) || date === "today")) {
    if (date !== "today") {
      return res.status(400).json({ error: "date must be YYYY-MM-DD or 'today'" });
    }
  }
  const resolvedDate = date === "today" ? new Date().toISOString().slice(0, 10) : date;

  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const offset = (parsedPage - 1) * parsedLimit;

  // `company` is accepted for API compatibility (GET /api/news?company=HUL); every
  // stored article is already HUL-relevant, so it does not further filter results
  // unless a different value is passed, in which case nothing matches.
  if (company && company.toUpperCase() !== "HUL" && company.toUpperCase() !== "HINDUSTAN UNILEVER") {
    return res.json({ items: [], total: 0, page: parsedPage, limit: parsedLimit });
  }

  const { items, total } = repo.listArticles({ source, date: resolvedDate, limit: parsedLimit, offset });
  res.json({ items, total, page: parsedPage, limit: parsedLimit });
});

router.get("/news/:id", (req, res) => {
  const article = repo.getArticleById(req.params.id);
  if (!article) return res.status(404).json({ error: "Article not found" });
  res.json(article);
});

router.post("/news/refresh", refreshLimiter, async (req, res, next) => {
  try {
    const minMinutes = parseInt(process.env.MIN_REFRESH_INTERVAL_MINUTES, 10) || 15;
    if (repo.isRefreshTooSoon(minMinutes) && req.query.force !== "true") {
      const last = repo.getLastIngestionRun();
      return res.status(429).json({ error: `Refreshed too recently. Minimum interval is ${minMinutes} minutes.`, lastRun: last });
    }
    const result = await runIngestion({ trigger: "manual" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
