const { DOMAINS } = require("../config/domains");
const { ROLES_STATIC } = require("../config/rolesStatic");
const { domainsForRole } = require("../config/roleDomains");
const { colorForScore } = require("./momentBuilder");
const repo = require("../database/repository");

function hoursAgo(n) {
  return new Date(Date.now() - n * 3_600_000);
}

function articlesInWindow(articles, fromHoursAgo, toHoursAgo) {
  const from = hoursAgo(fromHoursAgo).getTime();
  const to = hoursAgo(toHoursAgo).getTime();
  return articles.filter((a) => {
    if (!a.publishedAt) return false;
    const t = new Date(a.publishedAt).getTime();
    return t <= from && t > to;
  });
}

function buildSpark(articles) {
  // 10 hourly buckets, oldest to newest, from real published_at timestamps.
  const buckets = [];
  for (let i = 9; i >= 0; i--) {
    buckets.push(articlesInWindow(articles, i + 1, i).length);
  }
  const max = Math.max(1, ...buckets);
  return buckets.map((c) => Math.round((c / max) * 100));
}

function buildDomainCard(domain, clusters, allArticles) {
  const domainArticles = allArticles.filter((a) => a.clusterId && clusters.some((c) => c.id === a.clusterId));
  const current = articlesInWindow(domainArticles, 10, 0).length;
  const previous = articlesInWindow(domainArticles, 20, 10).length;
  let pctChange = null;
  if (previous > 0) pctChange = Math.round(((current - previous) / previous) * 100);
  else if (current > 0) pctChange = 100;

  const openMoments = clusters.filter((c) => c.moment.score !== undefined);
  const headline = pctChange === null ? (current > 0 ? `${current} article${current === 1 ? "" : "s"}` : "No activity") : (pctChange >= 0 ? `Up ${pctChange}%` : `Down ${Math.abs(pctChange)}%`);

  return {
    id: domain.id,
    name: domain.name,
    brands: domain.brandsLabel,
    moments: clusters.map((c) => c.id),
    metric: "HUL coverage volume, last 10 hours vs prior 10 hours",
    headline,
    trend: openMoments.length ? `${openMoments.length} moment${openMoments.length === 1 ? "" : "s"} live in this category` : "No live moments in this category right now",
    trendUp: pctChange === null ? true : pctChange >= 0,
    spark: buildSpark(domainArticles),
  };
}

function buildRoleKpis(roleId, clusters, allArticles) {
  const domainIds = domainsForRole(roleId);
  const roleClusters = clusters.filter((c) => domainIds.includes(c.domainId));
  const today = new Date().toISOString().slice(0, 10);
  const todayClusters = roleClusters.filter((c) => (c.lastSeen || "").slice(0, 10) === today);
  const scores = roleClusters.map((c) => c.moment.score).filter((s) => typeof s === "number");
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const highRisk = roleClusters.filter((c) => (c.moment.stats || []).some((s) => s.k === "Urgency" && parseInt(s.v, 10) >= 70)).length;
  const totalSources = roleClusters.reduce((sum, c) => sum + (c.moment._meta?.sourceCount || 1), 0);

  return [
    { label: "Live HUL signals today", value: String(todayClusters.length), delta: "as of latest refresh", color: "#1F44D6", note: "Moments detected today across " + (domainIds.map((d) => d).join(", ") || "your categories") + "." },
    { label: "Signals in your queue", value: String(roleClusters.length), delta: "open now", color: "#B8770A", note: "Live moments currently in your categories." },
    { label: "Average decision score", value: avgScore === null ? "No signals yet" : String(avgScore), delta: avgScore === null ? "" : "out of 100", color: avgScore === null ? "#5A6884" : colorForScore(avgScore), note: "Average across your live signals." },
    { label: "High-urgency signals", value: String(highRisk), delta: highRisk ? "review soon" : "none open", color: highRisk ? "#C13A4C" : "#0E9F6E", note: "Signals scored 70% urgency or higher." },
  ];
}

/**
 * Builds the full live "data" bundle in the same shape as the prototype's
 * fixture data object ({ moments, roles, domains }), so switching the
 * front end from Demo to Live is a data source change, not a redesign.
 * `board` is intentionally left out: it depends on investment and rollout
 * tracking this build has no live source for, so the front end keeps
 * showing its own static board content in both modes (see README).
 */
function buildDashboard() {
  const clusters = repo.listClusters();
  const allArticles = repo.getAllArticles();

  const moments = {};
  for (const c of clusters) moments[c.id] = c.moment;

  const domains = DOMAINS.map((d) => buildDomainCard(d, clusters.filter((c) => c.domainId === d.id), allArticles));

  const roles = ROLES_STATIC.map((r) => {
    const domainIds = domainsForRole(r.id);
    const roleClusters = clusters.filter((c) => domainIds.includes(c.domainId)).sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen));
    return {
      ...r,
      moments: roleClusters.map((c) => c.id),
      kpis: buildRoleKpis(r.id, clusters, allArticles),
    };
  });

  const lastRun = repo.getLastIngestionRun();
  const ledgerRows = repo.listLedger({ limit: 50 }).items.map((e) => ({
    id: e.id, sig: e.sig, verdict: e.verdict, score: e.score, outcome: e.outcome, color: e.color, rowBg: "#FFFFFF",
  }));

  return {
    moments,
    roles,
    domains,
    meta: {
      lastRefreshedAt: lastRun?.finishedAt || null,
      lastRefreshStatus: lastRun?.status || "never_run",
      totalArticles: allArticles.length,
      totalMoments: clusters.length,
    },
    ledger: ledgerRows,
  };
}

module.exports = { buildDashboard, buildDomainCard, buildRoleKpis };
