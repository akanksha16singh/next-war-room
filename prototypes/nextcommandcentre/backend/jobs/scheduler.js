const cron = require("node-cron");
const { runIngestion } = require("../services/ingestion");

let task = null;

/** Starts the daily (or configured) ingestion schedule. No-op if ENABLE_SCHEDULER=false or the cron expression is invalid. */
function startScheduler() {
  if (process.env.ENABLE_SCHEDULER === "false") {
    console.log("[scheduler] disabled via ENABLE_SCHEDULER=false");
    return null;
  }
  const expression = process.env.INGESTION_CRON || "15 6 * * *";
  if (!cron.validate(expression)) {
    console.warn(`[scheduler] invalid INGESTION_CRON "${expression}", scheduler not started`);
    return null;
  }
  task = cron.schedule(expression, async () => {
    console.log("[scheduler] running scheduled ingestion");
    try {
      const result = await runIngestion({ trigger: "scheduled" });
      console.log(`[scheduler] ingestion finished: ${result.status}, ${result.articlesNew} new articles, ${result.clustersUpdated} moments updated`);
    } catch (err) {
      console.error("[scheduler] ingestion failed", err);
    }
  });
  console.log(`[scheduler] started with cron expression "${expression}"`);
  return task;
}

function stopScheduler() {
  if (task) task.stop();
}

module.exports = { startScheduler, stopScheduler };
