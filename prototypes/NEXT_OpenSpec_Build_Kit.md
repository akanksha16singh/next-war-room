# Project NEXT — Prototype Build Kit (OpenSpec)

Everything needed to go from case → working agent prototype. Three parts:
**A.** The product decision (what to build and why)
**B.** The one-stop master prompt to paste into OpenSpec
**C.** The exact build sequence

---

# PART A — The product decision

## A1. The strategic frame (what the judges are buying)

> **Unilever doesn't have an AI gap. It has a latency gap.**
> Intelligence exists; it just can't move. NEXT is the layer that closes the distance between a signal and a decision — starting with brand, ending with the enterprise.

**Positioning line for the deck:**
"NEXT is not a marketing AI. It is Unilever's decision infrastructure — the layer where signals become decisions, decisions become actions, and actions become permanent organisational memory."

## A2. The long-term architecture (this is the sustainable part)

Six layers. Only layers 1–5 get prototyped; layer 6 is what makes it a decade-long asset.

| # | Layer | What it does | Why it lasts |
|---|-------|--------------|--------------|
| 1 | **Signal Fabric** | Normalises every external + internal stream into one event schema (`Signal`) | New sources plug in without new pipelines |
| 2 | **Brand Twin** | Machine-readable brand constitution + history + consumer graph per brand | The brand becomes queryable, not tribal knowledge |
| 3 | **Agent Mesh** | Specialist agents (Culture, Brand, Creative, Risk, Commercial, Media) that *argue*, not agree | Adding a function = adding an agent, not rebuilding |
| 4 | **Decision Rights Engine** | Policy-as-code: which decisions AI executes / recommends / only informs | Governance scales with autonomy; auditable by design |
| 5 | **Activation Adapters** | Publish to channels, DAM, media buying, or (in demo) a simulator | Swappable per market/channel |
| 6 | **Outcome Ledger** | Every decision + rationale + outcome, immutably logged and replayable | **The moat.** Competitors buy the same model; nobody can buy Unilever's decision history |

**The one-sentence moat:** *Foundation models are rented. Decision history is owned.*

## A3. All prototype directions considered

Ranked on demo impact × build cost × how much of the 95% non-creativity score they unlock.

| # | Prototype | What judges see | Verdict |
|---|-----------|-----------------|---------|
| 1 | **Cultural War Room** — live moment → agent debate → creative → approve → publish | The whole loop in 90 seconds | ⭐ **Build this** |
| 2 | **Agent Council transcript** — agents visibly disagree, score resolves | Technical credibility, kills "it's just a GPT wrapper" | ⭐ Build inside #1 |
| 3 | **Decision Rights console** — autonomy dial L0→L5 per decision class | Only team that answers governance seriously | ⭐ Build inside #1 |
| 4 | **"Do Nothing" verdict** — AI declines a high-velocity, low-fit trend | Strategic maturity; huge differentiator | ⭐ Build inside #1 (2nd scenario) |
| 5 | **Brand Twin explorer** — query the brand constitution | Explains the moat but is static | Build as a thin API only |
| 6 | **Campaign Compiler** — 1 idea → 240 localised assets | Attacks the localisation pain directly; India languages land well | Build a *stub* (3 markets, 3 languages) |
| 7 | **Outcome Ledger replay** — replay a past decision, show the system now decides better | Proves compounding learning | ⭐ Build a scripted version |
| 8 | **Horizontal proof** — same engine answers a supply-chain / R&D query | Unlocks the 20% Ecosystem Thinking score | ⭐ Build one hardcoded example |
| 9 | Cultural Radar map | Pretty, low substance | Skip or make it a slide graphic |
| 10 | Generic "AI marketing copilot" dashboard | What every other team builds | Actively avoid |

**Scope call:** one app — the War Room — containing #2, #3, #4, #7, #8. That single artefact evidences Product Thinking (25%), Ecosystem (20%), Feasibility (20%), Prioritisation (15%) and Impact (15%) simultaneously.

## A4. Two non-obvious PM decisions that will save the demo

1. **Dual-mode: `DEMO` and `LIVE`.** Demo mode replays seeded fixtures deterministically — same timings, same outputs, every run. Live mode hits real APIs. Judges see DEMO; a "live" toggle proves it isn't a video. Never let a case-competition demo depend on a rate limit.
2. **Reversibility before autonomy.** Every action the system can take must have a defined undo + kill switch *before* it's allowed to run unattended. Put this in the spec as a hard requirement — it's the single most adult thing you can say about enterprise agents.

## A5. Metrics to hardcode into the UI

- **North star: Time-to-Action (TTA)** — signal detected → activation live. Baseline days/weeks → target <60 min.
- Guardrails (equally visible): brand-safety incidents = 0, human override rate, false-positive moment rate, % "Do Nothing" verdicts, decision reversal rate.
- Compounding: Outcome Ledger entries, recommendation precision over time.

## A6. Indicative cost frame (for slide 3)

| Phase | Duration | Team | Indicative cost |
|-------|----------|------|-----------------|
| Lighthouse (1 brand, 1 market) | 0–4 months | 1 PM, 3 eng, 1 data sci, 0.5 legal/brand | ~$0.4–0.6M |
| Scale (5 brands, 3 markets) | 4–12 months | +6 FTE, MLOps, evals | ~$1.5–2M |
| Horizontal (2nd function) | 12–24 months | Platform team ~20 | ~$5–7M |
| Run-rate inference | ongoing | — | ~$0.02–0.15 per evaluated moment; dominated by human review time saved |

Frame savings as *decision latency reduced* and *content production/localisation cost per asset*, not headcount.

---

# PART B — The one-stop master prompt

Paste this whole block into `/opsx:explore` after `openspec init`. It is written to be a durable brief, not a one-shot prompt.

````text
You are the founding engineer for "NEXT", the prototype of an AI decision layer for a
global FMCG company (Unilever/HUL). I am the Product Manager. We are building a
demonstrable prototype for a competition; judging weights are Product Thinking 25%,
Ecosystem Thinking 20%, AI & Technical Feasibility 20%, Opportunity Prioritisation 15%,
Business Impact 15%, Creativity & Prototype 5%. The prototype is mandatory — a submission
without one is disqualified. Optimise for demonstrated system design, not visual polish.

## THE PROBLEM
A Rexona logo appears for three seconds under a football fourth official's sweat-soaked arm
and becomes the meme of the tournament. The brand tagline is "It won't EVER let you down."
The moment is perfect. But agency briefs, sentiment testing, shoots, legal review and manual
localisation mean the content ships after the moment is dead. Unilever already owns social
listening, web scraping, consumer data and GenAI — they simply operate independently.
This is a LATENCY problem, not a capability problem. Do not build a dashboard. Do not build
a list of GenAI features. Build the closed loop.

## THE PRODUCT
NEXT closes the loop: SENSE → INTERPRET → DEBATE → DECIDE → CREATE → APPROVE → ACTIVATE → LEARN.
Brand management is the lighthouse use case, not the destination: the same six-layer
architecture must be able to serve supply chain, R&D, sales and finance later. Humans move up
the value chain — AI does monitoring, synthesis, production and localisation; humans hold
brand judgement, ethics and final approval.

## ARCHITECTURE (six layers — build 1–5, stub 6's read path)
1. SIGNAL FABRIC — every external/internal stream normalised into one `Signal` event schema
   (source, timestamp, entity, velocity, volume, sentiment, media refs).
2. BRAND TWIN — machine-readable brand constitution per brand: positioning, tagline, tone,
   visual rules, red lines, target consumer, historical campaigns and their outcomes.
   Retrieval-backed. Rexona is the seeded brand.
3. AGENT MESH — specialist agents that reach INDEPENDENT verdicts and are allowed to
   DISAGREE: Culture (momentum, longevity), Brand (fit vs constitution), Creative (concepts),
   Risk (brand safety, IP, regulatory, cultural sensitivity), Commercial (reach, expected
   impact), Media (channel/sequence). An Arbiter agent resolves conflict into an Opportunity
   Score with an explicit rationale and dissent record. "DO NOTHING" must be a first-class,
   frequently-correct verdict.
4. DECISION RIGHTS ENGINE — policy-as-code. Every decision class maps to an autonomy level:
   L0 inform only | L1 recommend | L2 recommend + human approve | L3 execute within
   pre-approved policy | L4 execute + notify | L5 fully autonomous (reserved, unused).
   Policy is data, not code branches. Nothing escalates autonomy at runtime.
5. ACTIVATION ADAPTERS — an interface with a simulator implementation for the demo (mock
   Instagram / X / TikTok / OOH renders) and real adapters left as clearly-marked seams.
6. OUTCOME LEDGER — append-only record of {signal, agent verdicts, dissent, decision,
   human action, activation, outcome}. Replayable. This is the compounding asset; the demo
   must show one replay where the system's recommendation improves after prior outcomes.

## HARD REQUIREMENTS
- DUAL MODE. `DEMO` replays seeded fixtures deterministically (fixed seeds, scripted timings,
  no network dependency, identical every run). `LIVE` calls real model APIs. Mode is a single
  config switch. The demo must never fail because of a rate limit.
- REVERSIBILITY BEFORE AUTONOMY. Every action type declares an undo path and a kill switch
  before it may run at L3+. Unreversible actions are capped at L2.
- FULL AUDITABILITY. Every recommendation carries: inputs used, agent verdicts, dissent,
  policy applied, model + prompt version, timestamp. No unexplained outputs anywhere.
- HUMAN OVERSIGHT IS A FEATURE, NOT A CHECKBOX. The approval console shows the case FOR and
  AGAINST, the risk register, what happens if we do nothing, and the decay curve of the
  opportunity window.
- METRICS ON SCREEN. Time-to-Action clock (target <60 min), plus guardrails: brand-safety
  incidents, override rate, false-positive rate, % DO NOTHING, reversal rate.
- HORIZONTAL PROOF. One non-marketing scenario must run through the same engine unchanged
  (e.g. a demand-signal → supply-chain recommendation) to prove the layer is enterprise-wide.

## DEMO SCENARIOS TO SEED (fixtures)
S1 "Fourth Official" — high fit, high velocity → ACT. Full loop, TTA under 60 minutes.
S2 A high-velocity trend with weak brand fit and moderate IP risk → DO NOTHING, with reasons.
S3 A medium moment where agents visibly disagree and the Arbiter resolves with dissent noted.
S4 Localisation: one approved concept compiled into 3 markets × 3 languages (incl. Hinglish),
   each checked against local regulatory and cultural rules.
S5 Ledger replay: same signal shape as a past decision, better recommendation because of
   recorded outcomes.
S6 Horizontal: same engine, supply-chain question, different agents, same governance.

## TECH CONSTRAINTS
- TypeScript. Next.js (App Router) + Tailwind, single deployable app. No backend sprawl.
- Anthropic Messages API for all model calls, behind ONE provider interface so the model is
  swappable — the pitch explicitly argues the model is not the moat.
- Storage: SQLite (or a flat JSON store) — must run with `npm install && npm run dev`, no
  cloud dependency, no secrets required in DEMO mode.
- Agents are plain async functions with typed inputs/outputs and their own prompt files. No
  heavyweight agent framework. Every prompt lives in a versioned file, not inline.
- Zod schemas for every agent output; validate and repair before use. Never trust free text.
- Deterministic DEMO mode: fixtures + recorded model responses, no live calls.

## NON-GOALS (do not build)
Auth/user management. Real social API integrations. Real media buying. Multi-tenant.
A generic chat interface. Anything that looks like a BI dashboard. Beautiful design systems.
Model fine-tuning.

## DEFINITION OF DONE
`npm run dev` opens the War Room. All six scenarios run end-to-end in DEMO mode without
network access. Every recommendation is explainable and auditable. The TTA clock and guardrail
metrics are visible. The Decision Rights policy file can be edited to change system behaviour
without touching code. A 90-second walkthrough tells the whole story: signal → debate →
governance → creative → human approval → activation → ledger.

## WHAT I WANT FROM YOU NOW
Do not write code yet. Interrogate this brief. Then propose:
(a) the capability breakdown — the smallest set of independently specifiable capabilities;
(b) the build order, with the dependency reasoning;
(c) the riskiest assumptions and how each is de-risked early;
(d) anything in this brief you think is wrong, over-scoped, or won't demo well — say so plainly.
````

### Suggested capability breakdown (use this if the explore step doesn't produce better)

| Order | Change ID | Capability |
|-------|-----------|------------|
| 1 | `bootstrap-next-shell` | App scaffold, config, DEMO/LIVE switch, model provider interface, Zod contracts |
| 2 | `signal-fabric` | Signal schema, ingestion interface, seeded fixture streams |
| 3 | `brand-twin-rexona` | Brand constitution format + retrieval + Rexona seed data |
| 4 | `agent-mesh-core` | Six agents, independent verdicts, structured outputs, prompt versioning |
| 5 | `arbiter-and-scoring` | Conflict resolution, Opportunity Score, dissent record, DO NOTHING verdict |
| 6 | `decision-rights-engine` | Policy-as-code, autonomy levels, reversibility gate |
| 7 | `creative-generation` | Multi-format concepts + the localisation compiler stub |
| 8 | `approval-console` | The War Room UI, TTA clock, for/against, decay curve, approve/edit/reject |
| 9 | `activation-simulator` | Mock channel renders + activation record |
| 10 | `outcome-ledger` | Append-only log, audit view, replay scenario |
| 11 | `horizontal-adapter` | Supply-chain scenario through the same engine |
| 12 | `demo-runner` | Six scripted scenarios, deterministic seeds, reset button |

One OpenSpec change per row. Never propose more than one at a time.

---

# PART C — Exact step-by-step on OpenSpec

## C0. Prerequisites
- Node.js **20.19.0+** (`node -v`)
- Claude Code (or Cursor) installed and working in the terminal
- An Anthropic API key for LIVE mode (DEMO mode needs none)

## C1. Install and initialise

```bash
node -v                                   # must be >= 20.19.0
npm install -g @fission-ai/openspec@latest

mkdir next-brand-os && cd next-brand-os
git init

openspec init --tools claude              # or: --tools claude,cursor
```

This creates `openspec/` (`specs/`, `changes/`, `config.yaml`) and the slash-command/skill files for your assistant. Commit everything — nothing here belongs in `.gitignore`.

```bash
git add -A && git commit -m "chore: openspec init"
```

## C2. Write the project constitution

`openspec init` creates a project context file (`openspec/project.md`, or the equivalent your version scaffolds — check the folder). Edit it **by hand**. This is the file every future spec must respect:

```markdown
# Project: NEXT

A prototype AI decision layer for FMCG brand management, demonstrated on Unilever/Rexona.
Built for a competition demo, not production.

## Stack
TypeScript, Next.js App Router, Tailwind. SQLite or flat JSON store. Anthropic Messages API
behind a single swappable provider interface. Zod for all agent I/O contracts.

## Non-negotiable constraints
- DEMO mode must run fully offline and deterministically. No scenario may depend on a network call.
- Every recommendation must be auditable: inputs, agent verdicts, dissent, policy applied,
  model and prompt version.
- Autonomy is governed by a policy file (decision rights), never by code branches.
- No action may run above autonomy level L2 unless it declares an undo path.
- Agent prompts live in versioned files under /prompts, never inline in source.
- "DO NOTHING" is a valid, first-class system output.

## Out of scope
Auth, real social/media APIs, multi-tenancy, fine-tuning, design systems.
```

Commit it.

## C3. Explore before you commit to anything

In Claude Code, inside the project:

```
/opsx:explore
```

…then paste the **Part B master prompt**. Explore is a no-stakes thinking partner — it produces no artefacts. Argue with it. Make it justify the build order and name what it thinks is over-scoped. Do not move on until the capability list and order feel right.

## C4. Propose the first change

```
/opsx:propose bootstrap-next-shell
```

It generates `openspec/changes/bootstrap-next-shell/` containing `proposal.md`, `specs/`, `design.md`, `tasks.md`.

**Review before any code exists.** This is where OpenSpec earns its keep:
- `proposal.md` — does it state the *why*, and is the scope one capability, not four?
- `specs/` — are requirements written as `The system SHALL…` with `WHEN/THEN` scenarios? Is the DEMO-mode determinism requirement actually in there?
- `design.md` — did it pick the stack you specified? Is the model provider genuinely behind one interface?
- `tasks.md` — atomic and ordered? Anything vague ("implement agents") gets split now.

Edit the markdown directly where it's wrong. Then:

```bash
openspec validate bootstrap-next-shell --strict
```

## C5. Apply

```
/opsx:apply
```

The agent implements `tasks.md` line by line within the constraints. Then verify by hand:

```bash
npm install && npm run dev
openspec status --change bootstrap-next-shell
git add -A && git commit -m "feat: next shell (DEMO/LIVE switch, provider interface)"
```

## C6. Archive

```
/opsx:archive
```

The delta specs merge into `openspec/specs/` — your growing source of truth — and the change is filed into history. Commit again.

## C7. Repeat, one capability at a time

Loop C4 → C6 for every row in the capability table. Rules that matter:

- **One change in flight.** Two concurrent proposals produce conflicting delta specs.
- **Spec-first, always.** When the agent drifts mid-build, fix the spec, don't patch the code.
- **Archive promptly.** Unarchived changes mean later proposals reason against stale truth.
- **Commit at every boundary** — after init, after review, after apply, after archive. Your git log becomes the "how we built it" story, which is itself pitch material.
- **Run `openspec validate --strict`** before applying anything. Add it to CI if you have one.

## C8. Prototype hardening (before submission)

```
/opsx:propose demo-runner
```

Last change, and the most important one for judging. It must deliver:
- a one-click reset to a clean demo state
- all six scenarios runnable from a menu, deterministically
- a visible TTA clock and guardrail metrics
- a fallback: if LIVE fails mid-demo, the app silently drops to DEMO rather than erroring

Then rehearse the 90-second walkthrough against a disconnected machine. Twice.

## C9. Useful CLI reference

```bash
openspec init [--tools claude,cursor] [--force]
openspec validate <change-id> --strict
openspec status --change <change-id>
openspec archive <change-id> --yes
openspec schema fork spec-driven <name>     # if you want a custom artefact workflow
```

Slash commands (`/opsx:explore`, `/opsx:propose`, `/opsx:apply`, `/opsx:archive`) run in your AI assistant. `openspec …` commands run in your terminal.

---

## Mapping the build back to the scorecard

| Criterion | Weight | What in the build evidences it |
|-----------|--------|-------------------------------|
| Product Thinking | 25% | Closed loop with a human decision point; DO NOTHING as a first-class output; TTA north star with guardrails |
| Ecosystem Thinking | 20% | Six-layer architecture + the horizontal supply-chain scenario running unchanged |
| AI & Technical Feasibility | 20% | Typed agent contracts, prompt versioning, swappable provider, deterministic demo, real running code |
| Opportunity Prioritisation | 15% | Impact × feasibility matrix, explicit non-goals, one lighthouse chosen and defended |
| Business Impact | 15% | TTA reduction, localisation cost per asset, Outcome Ledger as compounding moat |
| Creativity & Prototype | 5% | The War Room itself — deliberately the smallest investment |
