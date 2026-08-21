# Claude Code brief: give NEXT a real backend and real live signals

You are the founding engineer on NEXT. I am the product manager. A working front end already exists as a single page prototype (a command centre with category rails, live moments, a six agent debate, a permissions table, a decision panel and an outcome record). Everything it shows today is seeded fixture data. Your job is to put a real backend behind it and feed it live signals from public news and social sources, without breaking the demo.

Work in small, reviewable steps. Do not refactor the front end visual design. Do not rename the concepts below, because the pitch uses them.

## Non negotiable rules

1. Two modes, one switch. `DEMO` replays stored fixtures with fixed timings and no network. `LIVE` pulls real sources. A single environment variable chooses the mode, and `LIVE` must silently fall back to `DEMO` on any failure. The demo must never break because of a rate limit or a dead feed.
2. Reversibility before autonomy. Any action the system can take must declare an undo path and a kill switch before it is allowed to run without a person. Actions that cannot be undone are capped at permission level two.
3. Everything is explainable. Every recommendation stores its inputs, each agent verdict, recorded disagreement, the permission rule applied, the model name and the prompt version, plus timestamps. No output without provenance.
4. Do nothing is a first class answer, stored with reasons and dissent exactly like an approval.
5. Prompts live in versioned files, never inline in application code.
6. Every model output is validated against a schema and repaired before use. Never trust free text.

## Stack

TypeScript. Next.js App Router with API route handlers. Tailwind. SQLite through Prisma or Drizzle for local runs. Anthropic Messages API behind one provider interface so the model is swappable. Zod for every agent contract. It must run with `npm install && npm run dev` and no secrets at all in `DEMO`.

## Data model

- `Signal` id, source, sourceUrl, fetchedAt, publishedAt, entity, brandId, category, title, body, language, region, velocity, volume, sentiment, mediaRefs, rawHash.
- `BrandTwin` brandId, positioning, promise, tone rules, never do rules, claim rules, target consumer, past plays with recorded outcomes. Seed at least one brand fully.
- `AgentVerdict` signalId, agent, verdict (`Go`, `Hold`, `Stop`), score, reasoning, promptVersion, model, latencyMs.
- `Ruling` signalId, verdict, score, rationale, conditions, dissent, permissionLevel, decidedAt.
- `HumanAction` rulingId, actor, action (`approve`, `edit`, `decline`, `undo`), reason, actedAt.
- `Activation` rulingId, channel, payload, status, undoPath, undoneAt.
- `LedgerEntry` append only, immutable, joins all of the above plus the observed outcome. Never update a row, only append.

## Live sources, in priority order

1. Public RSS and sitemap feeds from mainstream news, for example the Times of India topic feeds, Economic Times, Moneycontrol and Google News RSS queries. Feeds first because they are stable, cheap and legal to poll.
2. Public search trend data for the same keywords, to compute a velocity number rather than guessing one.
3. Optional social layer behind a clearly marked adapter interface, so a paid social listening key can be added later without touching anything above it.

Rules for ingestion: respect `robots.txt` and feed terms, cache aggressively, poll on a schedule rather than on page load, deduplicate by content hash and by story clustering, store the source URL for every signal, and never republish more than a headline and a link. Store only what is needed to make a decision.

Velocity is computed, not invented: mentions in the last hour against the trailing twenty four hour median for the same keyword set, normalised to zero to one hundred. Write the formula in code with a unit test.

## Pipeline to build

`fetch → normalise → cluster → enrich → debate → rule → gate → create → route → record`

- Ingestion workers per source, each producing `Signal` rows through one normaliser.
- Clustering that merges near duplicate stories into one moment before any model call, so we argue about moments and not articles.
- Six agents as plain async functions with typed inputs and outputs: Culture, Brand, Creative, Risk, Commercial, Media. They run in parallel, they never see each other's answers, and they are allowed to disagree.
- A chair agent that resolves conflict into a verdict, a score out of one hundred, machine checkable conditions and a dissent record. It must be able to return do nothing.
- A permissions engine reading a policy file, not code branches. Levels zero to five with level five switched off. Level three and above require a declared undo path.
- An activation layer with a simulator implementation for the demo and real adapters left as clearly marked seams.
- An append only ledger with a similarity search over past entries, so a new signal is priced against what actually happened last time.

## API the existing front end should call

- `GET /api/categories` category cards with computed live counts and a ten point volume series.
- `GET /api/moments?category=` the queue.
- `GET /api/moments/:id` the full case: signal, brand match, six verdicts, ruling, conditions, risks, concepts, channels, impact numbers.
- `POST /api/moments/:id/run` runs or replays the loop and streams stage events over server sent events, so the clock in the header is real elapsed time rather than an animation.
- `POST /api/moments/:id/decision` body `{ action, reason }`, writes a `HumanAction`, triggers activation or not, returns the new state.
- `POST /api/activations/:id/undo` and `POST /api/kill` for the kill switch.
- `GET /api/policy` and `PUT /api/policy` for the permissions table.
- `GET /api/ledger` paginated record.

Keep the response shapes close to the props the front end already renders, so the swap from fixtures to live data is a data source change and not a redesign.

## Build order, one step per commit

1. Scaffold, config, mode switch, provider interface, Zod contracts, seeded fixtures so the front end works unchanged.
2. Storage and migrations for the model above.
3. One ingestion worker against a single RSS feed, with dedupe and the velocity calculation.
4. Brand twin seed and retrieval.
5. Six agents with versioned prompt files and schema validation.
6. Chair agent, scoring, conditions, dissent, do nothing.
7. Permissions engine and the reversibility gate.
8. Creative generation and the market version compiler as a stub with three markets.
9. Activation simulator plus undo and kill switch.
10. Ledger, similarity search and the improved recommendation on a repeat signal shape.
11. One non marketing scenario through the same engine, for example a demand signal producing a stock recommendation, to prove the layer is not a marketing tool.
12. Demo hardening: one click reset, every scenario runnable from a menu, deterministic timings, silent fallback from live to demo.

## Definition of done

`npm run dev` opens the command centre with live signals visible and timestamped, every card traceable to a source URL. All scenarios also run offline in demo mode. Every recommendation is explainable end to end. The permissions file can be edited to change system behaviour with no code change. The header clock shows real elapsed time from signal to decision. A ninety second walkthrough tells the whole story: a real headline arrives, six agents argue, the rules decide who may act, a person approves, it goes live, and the record remembers.

## Before you write code

Interrogate this brief. Tell me the smallest set of independently buildable capabilities, the order and why, the riskiest assumptions and how you would de risk each one early, and anything here you think is over scoped or will not demo well. Then propose step one only.
