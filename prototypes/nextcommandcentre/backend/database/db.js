const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const DATABASE_URL = process.env.DATABASE_URL || "backend/database/data.sqlite";
const dbPath = path.isAbsolute(DATABASE_URL) ? DATABASE_URL : path.join(process.cwd(), DATABASE_URL);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  author TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  raw_hash TEXT NOT NULL,
  entities_json TEXT NOT NULL,
  classification_json TEXT NOT NULL,
  impact_json TEXT NOT NULL,
  decision_json TEXT NOT NULL,
  provenance_json TEXT NOT NULL,
  cluster_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_cluster ON articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_canonical_url ON articles(canonical_url);
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_raw_hash ON articles(raw_hash);

CREATE TABLE IF NOT EXISTS clusters (
  id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  brand TEXT,
  title TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  article_count INTEGER NOT NULL DEFAULT 0,
  moment_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clusters_domain ON clusters(domain_id);

CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  cluster_id TEXT,
  sig TEXT NOT NULL,
  verdict TEXT NOT NULL,
  score TEXT NOT NULL,
  outcome TEXT NOT NULL,
  color TEXT NOT NULL,
  actor TEXT NOT NULL DEFAULT 'system',
  decided_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT 'running',
  trigger TEXT NOT NULL DEFAULT 'manual',
  sources_json TEXT,
  articles_found INTEGER NOT NULL DEFAULT 0,
  articles_new INTEGER NOT NULL DEFAULT 0,
  clusters_updated INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

CREATE TABLE IF NOT EXISTS source_state (
  source TEXT PRIMARY KEY,
  last_run_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  articles_total INTEGER NOT NULL DEFAULT 0
);
`);

module.exports = db;
