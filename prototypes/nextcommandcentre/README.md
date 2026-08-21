# NEXT Command Centre

A live decision intelligence system for Hindustan Unilever Limited (HUL), built on top of the approved NEXT Command Centre front-end prototype. The visual design, layout, typography and every existing concept (roles, moments, the six specialist agents, governance, the decision ledger) are unchanged. What is new is a real backend that turns actual HUL news into the structured signals that front end already knows how to display.

## 1. What this application does

Every day, the backend automatically finds HUL related news from a set of Indian business and news sources, works out whether each article is genuinely about HUL, classifies what kind of event it is, scores its relevance, urgency, sentiment and business impact, groups multiple articles about the same event into one signal, and runs that signal through a deterministic decision engine and six specialist agents (Culture, Brand, Creative, Risk, Commercial, Media). The result is stored as a "moment" in exactly the shape the existing dashboard already expects, so the same cards, tabs, permissions table and ledger that the prototype used with fixture data now work with live data.

The system does not just show a news feed. A headline like "HUL announces price increase across selected products" is turned into structured attributes (company, brand, category, event type, sentiment, urgency, confidence, business impact, a recommended action and a decision verdict) before it ever reaches the dashboard.

## 2. Architecture

```
LIVE NEWS (RSS / Google News search per source)
   -> normalisation (clean text, canonical URL, content hash)
   -> entity resolution (is this really about HUL, which brand, which category)
   -> classification (event type, sentiment, urgency)
   -> deduplication and clustering (merge corroborating articles into one event)
   -> decision engine (deterministic score, verdict, six agent views)
   -> moment builder (the exact object shape the dashboard already renders)
   -> SQLite storage
   -> REST API
   -> existing NEXT Command Centre UI (unchanged)
```

Every stage is a small, separately testable module under `backend/services/`. Nothing about the front end's visual design changed: the backend was built around the existing UI, not the other way round.

### Stack

- Frontend: the existing prototype (`frontend/index.html`, a self-contained page using a small custom component runtime in `frontend/support.js`, loading React/ReactDOM/Babel from a CDN at runtime, exactly as it did before). No framework change.
- Backend: Node.js, Express, better-sqlite3.
- Scheduling: node-cron for an in-process daily job, plus a secret-protected HTTP endpoint for external cron services.
- No AI API is required. All classification, scoring and the six agent verdicts are deterministic, configurable functions of the live signal, not model calls. `OPENAI_API_KEY` is accepted in `.env` for future use but nothing in this build calls it.

## 3. Folder structure

```
next-command-centre/
├── frontend/
│   ├── index.html            the approved prototype, with only its data/event-handling logic touched
│   └── support.js            the prototype's existing runtime, unmodified
│
├── backend/
│   ├── server.js             Express app: mounts the API and serves frontend/
│   ├── config/
│   │   ├── entities.js       the HUL company + brand dictionary (edit this to add a brand)
│   │   ├── weights.js        decision engine weights, verdict thresholds, source reliability
│   │   ├── domains.js        the five dashboard domains (personal, beauty, home, foods, supply)
│   │   ├── roleDomains.js    which domains each role's queue draws from
│   │   └── rolesStatic.js    role identity/presentation config copied from the prototype
│   ├── database/
│   │   ├── db.js             SQLite connection and schema
│   │   ├── repository.js     all reads/writes go through here
│   │   └── reset.js          `npm run db:reset`
│   ├── sources/               one adapter per news source, all returning the same shape
│   │   ├── base.js           shared RSS fetch, Google News URL builder, canonicalisation
│   │   ├── rssAdapterFactory.js
│   │   ├── timesOfIndia.js, economicTimes.js, businessStandard.js, moneycontrol.js,
│   │   │   mint.js, financialExpress.js, cnbcTv18.js, googleNews.js
│   │   └── index.js          the list ingestion iterates over
│   ├── services/
│   │   ├── normalize.js, entityResolution.js, classify.js, impact.js
│   │   ├── clustering.js     deduplication / event clustering
│   │   ├── signalAggregation.js, decisionEngine.js, agentScores.js
│   │   ├── momentBuilder.js  builds the exact dashboard "moment" object
│   │   ├── dashboardBuilder.js, digest.js
│   │   └── ingestion.js      the pipeline that ties all of the above together
│   ├── routes/                one file per resource (health, news, dashboard, signals, decisions, sources, digest, cron)
│   ├── jobs/scheduler.js      the daily cron job
│   └── middleware/
│
├── tests/                     `npm test`
├── package.json
├── .env.example
├── render.yaml, Procfile      deployment config
└── README.md
```

## 4. Local setup

Requirements: Node.js 18 or later.

```bash
git clone <this repository>
cd next-command-centre
npm install
cp .env.example .env
npm start
```

Open `http://localhost:3001`. The dashboard opens in Demo mode by default and works with no network access at all beyond loading its fonts and its React/Babel runtime from a CDN, exactly as the original prototype did.

For active development with auto-restart, use any Node watcher of your choice, for example `node --watch backend/server.js`.

## 5. Environment variables

See `.env.example` for the full list with comments. The important ones:

| Variable | Purpose | Required |
|---|---|---|
| `PORT` | Port the backend (and the frontend it serves) listens on | No, defaults to 3001 |
| `DATABASE_URL` | Path to the SQLite file | No, defaults to `backend/database/data.sqlite` |
| `CRON_SECRET` | Required to call `POST /api/cron/news`. The endpoint is disabled entirely if this is unset | No, but required for external cron |
| `INGESTION_CRON` | Cron expression for the built-in daily job | No, defaults to `15 6 * * *` |
| `ENABLE_SCHEDULER` | Set to `false` to disable the in-process scheduler (e.g. when relying on an external cron service) | No |
| `MIN_REFRESH_INTERVAL_MINUTES` | Minimum gap between two ingestion runs, however triggered | No, defaults to 15 |
| `CORS_ORIGIN` | Only needed for split-origin local development | No |
| `OPENAI_API_KEY`, `NEWS_API_KEY`, `GOOGLE_NEWS_API_KEY` | Reserved for future source adapters or enrichment. Nothing in this build requires them | No |

No API key is required to run the application. The built-in adapters use public RSS feeds and Google News RSS search, which need no credentials.

## 6. Running the backend

```bash
npm start
```

This starts Express on `PORT`, creates the SQLite database and tables if they do not exist, starts the daily ingestion scheduler (unless `ENABLE_SCHEDULER=false`), and serves the frontend from the same process and the same origin.

## 7. Running the frontend

There is no separate frontend build or dev server. `frontend/index.html` and `frontend/support.js` are served directly by the backend at `/`. Opening `frontend/index.html` as a local file will also work for pure Demo mode (no backend calls are made in Demo mode until the user switches to Live data), but Live mode requires the backend to be running so the page can call `/api/dashboard` and `/api/news/refresh` on the same origin.

## 8. How live news ingestion works

`POST /api/news/refresh` (and the daily scheduled job, and `POST /api/cron/news`) all run the same pipeline, `backend/services/ingestion.js`:

1. Every configured source adapter is queried concurrently (`backend/sources/*.js`).
2. Each raw item is normalised: HTML stripped, URL canonicalised (tracking parameters removed), a content hash computed.
3. `entityResolution.js` decides whether the article is genuinely about HUL, using the configurable dictionary in `config/entities.js`, and extracts which brand, category and dashboard domain it belongs to.
4. Irrelevant articles are dropped here. Nothing is stored just because it contains the word "HUL" or a brand name; see section 9 below.
5. `classify.js` determines the event type (pricing, product launch, leadership, financial results, regulatory, competitor, supply chain, consumer sentiment, CSR/sustainability, mergers and acquisitions, or general) and a deterministic sentiment and urgency score.
6. The article is stored (deduplicated by canonical URL and by a content hash, so the same story submitted twice is a no-op).
7. `clustering.js` decides whether this article is the same real-world event as an existing signal (by brand, event type, publication time and text similarity) or a new one. Multiple outlets covering the same event become one signal with multiple corroborating sources, not five duplicate cards.
8. `decisionEngine.js` computes a reproducible 0-100 decision score and a verdict (Go now, Go with conditions, Go smaller, Hold, Do nothing) from the aggregated signal, using the weights in `config/weights.js`.
9. `agentScores.js` derives the six specialist agent verdicts from different slices of the same signal (see section 14 of the original brief: Culture from consumer impact and momentum, Risk from regulatory/negative signal and confidence, and so on).
10. `momentBuilder.js` assembles all of this into the exact object shape the dashboard's fixtures already used (`m1`-style), so the swap from Demo to Live is a data source change, not a UI change.
11. `dashboardBuilder.js` assembles the full dashboard bundle (`moments`, `roles`, `domains`) on request; `GET /api/dashboard` always reflects current storage, it does not re-run ingestion.

The last refresh's timestamp and per-source result (found/added/error) are recorded in the `ingestion_runs` table and surfaced through `GET /api/health` and `GET /api/sources`.

## 9. How relevance and entity detection work

`config/entities.js` is the single place that defines what counts as an HUL mention: the company name and its common variants, a dictionary of HUL brands (Dove, Surf Excel, Rin, Lux, Lifebuoy, Clinic Plus, Sunsilk, Tresemme, Pond's, Lakme, Vaseline, Closeup, Pepsodent, Horlicks, Bru, Knorr, Kissan, Hellmann's, Axe, Rexona, Comfort, Vim, Domex, Love Beauty and Planet, Brooke Bond), and event-type/sentiment keyword lists.

Mentioning a brand alone is not automatically treated as HUL-relevant. Several brand aliases (Comfort, Lux, Vim, Rin, Bru) are also ordinary English words or other brands' names, so they are weighted lower and need corroborating context (an FMCG/category signal, or an explicit HUL/Hindustan Unilever company mention) to clear the relevance threshold. "HUL" itself only ever matches as a whole word, never as a substring (so "HULK" never matches). An article's relevance score, and exactly which signals contributed to it, is stored in `provenance.signals` on every article (`GET /api/news/:id`).

## 10. How the Times of India integration works

Times of India is not scraped. `backend/sources/timesOfIndia.js` polls Times of India's own public topic RSS feeds (Business, Top Stories), and supplements that with a Google News RSS search scoped to `site:timesofindia.indiatimes.com` for the HUL company terms, since Times of India has no public per-keyword search feed of its own. Both paths return the same normalised article shape as every other source. If a feed URL ever changes or goes down, that one feed is skipped (logged in `GET /api/sources` and in the run's `sourceResults`), the rest of the run continues, and the Google News fallback still has a chance to pick up the same story.

## 11. How to add another news source

1. Create `backend/sources/<name>.js`. For an RSS-backed source, this is usually a few lines:

   ```js
   const { makeAdapter } = require("./rssAdapterFactory");
   module.exports = makeAdapter({
     id: "example-source",
     name: "Example Source",
     feeds: ["https://example.com/rss/business.xml"],
     siteDomain: "example.com", // optional Google News site-scoped fallback
   });
   ```

   For a licensed API instead of RSS, implement the same contract by hand: export `{ id, name, async fetchArticles() }`, where `fetchArticles()` returns `{ ok, items, error }` and each item has `{ source, title, url, publishedAt, summary, author, fetchedAt, extractionMethod }`.

2. Add it to the list in `backend/sources/index.js`.
3. Add its reliability metadata to `SOURCE_RELIABILITY` in `backend/config/weights.js` (used for confidence scoring and shown in `GET /api/sources`).
4. That's it. Deduplication, entity resolution, classification, scoring and the dashboard mapping are all source-agnostic.

## 12. How to deploy from GitHub

The backend serves the frontend, so this deploys as a single Node web service.

**Render**: connect the repository, Render will read `render.yaml` and create the service automatically (`npm install` then `npm start`). Add a persistent disk if you want the SQLite database to survive restarts (already declared in `render.yaml`).

**Railway**: connect the repository, it will detect `Procfile`/`npm start` automatically. Add a volume for `backend/database/` if you want the database to persist across deploys.

**Any other Node host** (Fly.io, a plain VM, etc.): `npm install && npm start`, expose `PORT`, mount a persistent volume at `backend/database/` if you want history to survive restarts.

**Netlify/Vercel for the frontend only**: only necessary if you want the frontend on a different origin than the backend. Point `CORS_ORIGIN` at the frontend's origin on the backend, and change the frontend's `fetch("/api/...")` calls to an absolute backend URL. The default single-service deployment above is simpler and is what this project is set up for.

## 13. How scheduled refresh works

- **Daily automatic**: `backend/jobs/scheduler.js` runs `node-cron` on `INGESTION_CRON` (default `15 6 * * *`, meaning 06:15 server time every day). Set `ENABLE_SCHEDULER=false` to turn this off.
- **Manual, from the UI**: the small "Refresh" control in the header's mode indicator (visible once Live data is selected) calls `POST /api/news/refresh`.
- **External cron**: if your hosting platform does not support a persistent background process (some serverless platforms), set `CRON_SECRET` and point an external scheduler (Render Cron Job, a GitHub Actions schedule, cron-job.org) at `POST /api/cron/news` with header `X-Cron-Secret: <value>` or `Authorization: Bearer <value>`. This endpoint returns 503 if `CRON_SECRET` is not set, so it can never be triggered by accident.
- All three paths share `MIN_REFRESH_INTERVAL_MINUTES` so an eager script or a curious user cannot hammer the news sources.

## 14. How to switch Demo mode and Live data

The small pill in the header (next to the NEXT logo) that used to just display "Demo mode" is now a real, clickable switch, plus the smallest possible refresh affordance next to it. This was the one place the header needed a new interactive element; nothing else in the layout changed.

- **Demo mode** (the default) uses the prototype's original fixture data (`m1`-`m8` and the six roles), unchanged, with no network calls at all. It always works, including fully offline.
- **Live data** fetches `GET /api/dashboard` on selection and shows the result. If the backend has not ingested anything yet, or the request fails, the pill explains why ("Live data unavailable: no HUL signals ingested yet. Showing demo." or "Live data unavailable (reason). Showing demo.") and the dashboard keeps showing Demo content rather than an empty or broken screen. Once real moments exist, switching to Live data re-anchors the current role/category/moment selection to real data and everything (KPIs, the queue, the six agent verdicts, risks, the ledger for Approve/Decline) reflects it.
- Approving, editing or declining a moment while in Live mode also writes a real, durable entry to the backend's ledger (`POST /api/decisions`), not just the client-side demo state. That is what makes the "this resembles a past decision" memory feature genuinely work over time in Live mode, see `repository.findPastLedgerByClusterTitle` and `moment.replay`.
- The preference is remembered in the browser (`localStorage`) so a reload keeps the last chosen mode.

## 15. API reference

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Liveness check, plus the last ingestion run |
| `GET /api/news` | List stored articles. Query params: `source`, `date` (`YYYY-MM-DD` or `today`), `page`, `limit` |
| `GET /api/news/:id` | Full detail for one article, including provenance |
| `POST /api/news/refresh` | Manually trigger ingestion (rate-limited) |
| `GET /api/dashboard` | The full live bundle (`moments`, `roles`, `domains`, `meta`) in the shape the front end consumes |
| `GET /api/signals` | Lighter-weight list of live moments. Query param: `domain` |
| `GET /api/moments/:id` | One moment plus its full source article list |
| `GET /api/decisions` | Paginated ledger |
| `POST /api/decisions` | Record a human decision on a live moment: `{ momentId, action, reason }`, `action` one of `approve`, `edit`, `decline` |
| `GET /api/sources` | Every configured source, its reliability metadata, and its last run status |
| `GET /api/digest/today` | Daily HUL intelligence summary: totals, top brands/categories, sentiment split, top signals, major risks and opportunities |
| `POST /api/cron/news` | Same as `/api/news/refresh`, protected by `CRON_SECRET`, for an external scheduler |

## 16. Data model and provenance

Every stored article carries `entities`, `classification`, `impact`, `decision` and `provenance` objects (see `backend/database/repository.js`). `provenance` records the source name, source URL, retrieval time, publish time, extraction method (which feed or search produced it) and the specific entity-resolution signals that made it count as relevant, so any number shown on the dashboard can be traced back to where it came from and how it was calculated. Nothing labelled as live is a fixed placeholder: a value the pipeline cannot honestly compute is either left out of the live moment, computed from a documented formula (and stated as such, for example the projected decay curve and the response window, which are estimates derived from urgency, not measurements), or, for content with no live source at all (the leadership Board tab's investment/rollout figures, and the permissions/governance table), left exactly as the approved prototype's own static configuration in both modes, since inventing numbers for those would violate the no-fake-live-data rule.

## 17. Testing

```bash
npm test
```

Runs the Node built-in test runner over `tests/`: normalisation, HUL/brand entity detection (including the "ambiguous word is not enough on its own" cases), sentiment and event-type classification, deduplication/clustering (including a same-event-different-wording merge and a different-event non-merge), the decision engine (determinism, the regulatory hard-risk gate, source-count and confidence effects, score clamping), and the API layer (every route, validation, the cron secret, and a check that every field the front end reads without a null guard is always present on a built moment).

## 18. Troubleshooting

- **A source shows `ok: false` in `GET /api/sources`**: check `lastError`. Publishers occasionally change their RSS paths; update the URL in the relevant `backend/sources/*.js` file. This never breaks the app, since a failing source is simply skipped for that run.
- **Live mode says "no HUL signals ingested yet"**: no ingestion has run yet, or nothing relevant was found. Trigger `POST /api/news/refresh`, or wait for the scheduled run.
- **All sources fail at once**: usually outbound network access is blocked in your environment (a locked-down sandbox, a corporate proxy). Ingestion fails gracefully; Demo mode is unaffected.
- **`better-sqlite3` fails to install**: it ships prebuilt binaries for common platforms; if your platform needs a build from source you will need the platform's usual native build tools (Python, a C++ compiler). This is standard for `better-sqlite3` and not specific to this project.
- **Refresh returns 429**: refreshes are throttled by `MIN_REFRESH_INTERVAL_MINUTES`. Wait, or lower it in `.env` for local testing.
- **Want a clean slate**: `npm run db:reset` drops and recreates all tables.
