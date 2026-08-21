const express = require("express");
const repo = require("../database/repository");

const router = express.Router();
const VALID_ACTIONS = new Set(["approve", "edit", "decline"]);

router.get("/decisions", (req, res) => {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
  const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);
  res.json(repo.listLedger({ limit, offset }));
});

// POST /api/decisions { momentId, action, reason } records a real, durable
// ledger entry for a live moment, the same append-only record the
// prototype's demo ledger simulates client-side. This is what makes the
// historical-memory feature (section 30) genuinely work over time in Live
// mode: a future signal that resembles this one will find this record.
router.post("/decisions", (req, res) => {
  const { momentId, action, reason } = req.body || {};
  if (!momentId || typeof momentId !== "string") return res.status(400).json({ error: "momentId is required" });
  if (!VALID_ACTIONS.has(action)) return res.status(400).json({ error: "action must be one of approve, edit, decline" });

  const cluster = repo.getClusterById(momentId);
  if (!cluster) return res.status(404).json({ error: "Moment not found" });

  const verdict = action === "decline" ? "Declined by you" : cluster.moment.ledgerEntry.verdict;
  const outcome = action === "decline"
    ? `You overruled the system.${reason ? " Reason: " + String(reason).slice(0, 300) : " No reason given."}`
    : action === "edit"
      ? "You edited, then approved. Change stored."
      : "You approved. Activation is recommended-only in this build; nothing was actually published.";

  const entry = repo.addLedgerEntry({
    clusterId: cluster.id,
    sig: cluster.moment.ledgerEntry.sig,
    verdict,
    score: cluster.moment.ledgerEntry.score,
    outcome,
    color: action === "decline" ? "#C13A4C" : "#0E9F6E",
    actor: "human",
  });

  res.status(201).json(entry);
});

module.exports = router;
