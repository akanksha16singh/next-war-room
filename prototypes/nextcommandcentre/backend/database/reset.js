// Drops and recreates all tables. Run with `npm run db:reset`.
const db = require("./db");

db.exec(`
  DROP TABLE IF EXISTS articles;
  DROP TABLE IF EXISTS clusters;
  DROP TABLE IF EXISTS ledger;
  DROP TABLE IF EXISTS ingestion_runs;
  DROP TABLE IF EXISTS source_state;
`);

// Re-requiring db after the drop re-runs the CREATE TABLE IF NOT EXISTS
// statements is not possible with require caching, so recreate inline.
delete require.cache[require.resolve("./db")];
require("./db");

console.log("Database reset: " + (process.env.DATABASE_URL || "backend/database/data.sqlite"));
