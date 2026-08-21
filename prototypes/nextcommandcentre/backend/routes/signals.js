const express = require("express");
const repo = require("../database/repository");

const router = express.Router();

// GET /api/signals: every live moment (clustered signal), lighter weight than
// the full dashboard bundle. Same underlying data GET /api/dashboard uses.
router.get("/signals", (req, res) => {
  const { domain } = req.query;
  const clusters = repo.listClusters({ domainId: domain || undefined });
  res.json({
    items: clusters.map((c) => ({ id: c.id, domainId: c.domainId, brand: c.brand, articleCount: c.articleCount, lastSeen: c.lastSeen, moment: c.moment })),
    total: clusters.length,
  });
});

router.get("/moments/:id", (req, res) => {
  const cluster = repo.getClusterById(req.params.id);
  if (!cluster) return res.status(404).json({ error: "Moment not found" });
  const articles = repo.getArticlesForCluster(cluster.id);
  res.json({ ...cluster, articles });
});

module.exports = router;
