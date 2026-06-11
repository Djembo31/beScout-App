# BeScout — CTO Playbook

**B2B2C Fan-Engagement.** Clubs verkaufen Scout Cards, starten Events/Votes, verteilen $SCOUT-Credits.

**Scope (2026-04-21, siehe `memory/decisions.md` D1):** Alle 7 Ligen launch-ready (Süper Lig, TFF 1. Lig, Bundesliga, 2. Bundesliga, Premier League, La Liga, Serie A). Sakaryaspor/TFF1 waren initialer Hook — nicht mehr Pilot-Exklusiv. DE+TR-Prio aus persönlicher Nähe, aber gleicher Qualitätsstandard für alle Ligen.

## Der Master-Prozess: SHIP-Loop

**Jede Aenderung laeuft durch 5 Stufen:**

```
SPEC  →  IMPACT  →  BUILD  →  PROVE  →  LOG
```

- **Artefakte:** `worklog/active.md` + `worklog/log.md`
- **Details:** `.Codex/rules/workflow.md`
- **Skill:** `/ship` (ersetzt /spec + /deliver)
- **Rollen:** `memory/ceo-approval-matrix.md`

Hooks erzwingen Qualitaet:
- `ship-spec-gate` blockt Edit auf `src/lib/services/`, `supabase/migrations/`, `src/lib/queries/` ohne aktiven Slice
- `ship-proof-gate` blockt `feat(`/`fix(`-Commits ohne Proof-Artefakt
- `ship-post-service` triggert vitest nach Service-Edits
- `ship-status-gate` injiziert git log bei Status-Fragen
- `ship-no-audit-slice` markiert Slices ohne Code-Diff als invalid
- `ship-meta-plan-block` blockt Stapeln neuer Meta-Plaene
- `ship-session-start` — 30-Sekunden-Briefing statt Marathon

## Stack

Next.js 14 App Router | TypeScript strict | Tailwind (Dark Mode) | Supabase (PG + Auth + Realtime) | TanStack React Query v5 | Zustand v5 | next-intl (DE + TR) | lucide-react

## Design Tokens (kuerzel)

- BG `#0a0a0a` | Gold `var(--gold, #FFD700)` | Button Gradient `from-[#FFE44D] to-[#E6B800]`
- Card `bg-white/[0.02] border border-white/10 rounded-2xl`
- Headlines `font-black` | Numbers `font-mono tabular-nums`
- Positions: GK=emerald, DEF=amber, MID=sky, ATT=rose
- Details: `.Codex/rules/` (aktuell autoloaded)

## Top Rules (Pre-Edit)

**Beta-READY (Slice 214 D50 Wave 2):**
- "Beta-fertig" / "launch-ready" / "go-live" sind Behauptungen, KEINE Wahrheiten.
- Wahrheit liegt in `worklog/beta-phase.md` — Phase-Tracker ist Single-Source-of-Truth.
- READY = `last_signoff == PASS` UND `findings_open.P0 == 0` UND `findings_open.P1 ≤ akzeptabel`.
- Kein "fertig" sagen ohne `/auto-beta-ready signoff` PASS.
- Hook `ship-phase-gate.sh` warnt automatisch bei "fertig"-Behauptung ohne PASS.
- Phase-Tracker hat Phasen A (Audit) → B (Polish) → C (Persona-Walk) → D (Sign-Off) → READY.

**RPC/Migration:**
- NULL-in-Scalar: `COALESCE` auf Variable, nicht im Scalar-Subquery
- CHECK constraints: Column-Werte gegen `database.md` verifizieren
- RLS: neue Tabelle → ALLE Ops (SELECT+INSERT+UPDATE+DELETE)
- Return-Shape: camelCase vs snake_case — Service-Cast MUSS matchen
- SECURITY DEFINER → IMMER `REVOKE EXECUTE FROM anon` + `auth.uid()` Guard

**Service:**
- Error → THROW (nicht `return null`, nicht `catch` ohne `throw`)
- Return-Type matched RPC-Response-Shape
- Nach Edit: `npx vitest run <test>`

**Component:**
- Mobile 393px (iPhone 16)
- Modal IMMER mit `open` prop + `preventClose={isPending}`
- Hooks VOR early returns
- `Array.from(new Set())` statt Spread (strict TS)
- Dynamic Tailwind `border-[${var}]` → `style={{ borderColor: hex }}`
- i18n: kein raw i18n-Key leak bei `setError(err.message)`

**Money / Security (immer CEO-Scope):**
- Geld = BIGINT cents (1,000,000 = 10,000 $SCOUT)
- Jede Fee-Aenderung → CEO approved
- Jeder SECURITY DEFINER RPC → CEO approved

## Import Map

| Was | Import |
|-----|--------|
| Types | `@/types` |
| Services | `@/lib/services/[name]` |
| UI | `@/components/ui/index` (cn, Card, Button, Modal) |
| Player | `@/components/player/index` (PlayerPhoto, getL5Color) |
| Query Keys | `@/lib/queryKeys` (qk.*) |
| Supabase | `@/lib/supabaseClient` |
| i18n | `next-intl` (`useTranslations`) |
| Icons | `lucide-react` |

## Business Compliance (Quick)

- $SCOUT = Platform Credits. NIEMALS: Investment, ROI, Profit, Ownership.
- Scout Card = Digitale Spielerkarte. Code-intern bleibt `dpc`.
- IPO user-facing = "Erstverkauf" (DE) / "Kulüp Satışı" (TR). Admin/Code = "IPO" OK.
- Fee-Split Trading: 3.5% Platform + 1.5% PBT + 1% Club = 6%.
- Details: `.Codex/rules/business.md`

## Rules (autoloaded)

| File | Inhalt |
|------|--------|
| `.Codex/rules/workflow.md` | SHIP-Loop Spezifikation |
| `.Codex/rules/common-errors.md` | Bug-Patterns + Fixes |
| `.Codex/rules/database.md` | Columns, RLS, RPCs |
| `.Codex/rules/business.md` | Compliance, Fee-Splits |
| `.Codex/rules/performance.md` | Query Limits, Bundle |
| `.Codex/rules/testing.md` | Vitest + Playwright |

## Superpowers-Override (Slice 191, 2026-04-24)

Die Superpowers-Plugin-Skills (`brainstorming`, `writing-plans`, `using-superpowers`) haben **zu aggressive Auto-Trigger** ("1% chance" / "any conversation"). Fuer BeScout ist der kanonische Master-Workflow **SHIP-Loop** (`.Codex/rules/workflow.md`), nicht das Superpowers-Trio.

**Regeln fuer diese Codebase:**
- **`superpowers:brainstorming`**: NUR invoken wenn Anil explizit "brainstorm", "ueberlegen" oder "neue Idee" sagt. NICHT auto bei Feature-Requests — `/spec` ist der richtige Einstieg.
- **`superpowers:writing-plans`**: Superseded durch `/spec` + `/ship new`. Nur bei expliziter User-Anfrage.
- **`superpowers:using-superpowers`**: Informational. Nicht blocken fuer "clarifying questions" oder Status-Abfragen.
- **`superpowers:verification-before-completion`**: Deckungsgleich mit SHIP PROVE-Stage. Nicht doppelt invoken.
- **`superpowers:test-driven-development`**: Deckungsgleich mit test-writer-Agent + testing.md. Nicht doppelt.

**Begruendung:** Superpowers sind external-plugin-default (generic dev-context). BeScout hat eigenen Prozess (SHIP-Loop, 6 Stufen, Hooks erzwingen Qualitaet). Doppel-Invokation bringt Overhead ohne Mehrwert.

## Agents (via Agent-Tool)

backend, frontend, reviewer (PFLICHT nach Impl), healer, test-writer, impact-analyst, qa-visual, business, autodream, gtm-writer (GTM-Content: Landing, Reddit, Cold-Mail, Pitch), Explore (read-only Research), Plan (Architektur)

**Default seit Slice 085 (2026-04-21):** Bei **3+ Files cross-domain** → Parallel-Dispatch (backend + frontend + test-writer parallel in Worktrees). Serial-Codex nur bei <3 Files oder Money/Trading. Siehe `/parallel-dispatch` Skill.

## MCPs

supabase, playwright, context7, sequential-thinking, sentry (aktiv), posthog (nach Neustart), firecrawl, notion, vercel, chrome-devtools, memory

**context7 Policy (seit Slice 085):** Bei React/Next/Supabase/Tailwind/TanStack/zustand/next-intl/lucide-react Library-Questions IMMER `context7` fetchen VOR Antwort. Training-Cutoff Jan 2026 — Libraries drift. Hook `ship-context7-gate` erinnert automatisch.

## Neue Skills (seit Slice 085, 2026-04-21)

| Skill | Trigger |
|-------|---------|
| `/parallel-dispatch` | Multi-Domain-Feature, 3+ Files cross-domain |
| `/optimize` | AutoResearch-Loop mit messbarer Metric (Gold-%, Bundle-Size, Match-Rate) |
| `/plan-ceo-review` | Business-Perspektive nach Spec, vor Build |
| `/plan-qa-review` | Edge-Case-Enumeration nach Spec, vor Build |
| `/plan-legal-review` | Wording/Compliance bei Money/Fantasy/IPO-Features |
| `/silent-fail-audit` | Wöchentlicher Scan proaktiv oder nach /impact |

Ergänzend Hooks: `ship-context7-gate`, `ship-cto-review-gate` (warn), `ship-kanban-sync`.

## Notion-Integration (seit Slice 085)

- **Kanban** (Backlog/Roadmap): https://www.notion.so/20273b4a80e98050b014f37d659bed5c
- **Slice-Database** (SHIP-Loop Spiegel): https://www.notion.so/57670082f03a4ac4a305f68186c981a0
  - Views: Board (Aktive Slices), Timeline (CEO-Roadmap), Table (all)
  - Relation `Kanban-Item`: verlinkt Slice ↔ Kanban-Item
- **Status-Page** (Executive): https://www.notion.so/34773b4a80e9814e97fac38763659dc0

## Obsidian-Vault (seit Slice 085)

`memory/` ist Obsidian-Vault (plain Markdown + `.obsidian/` config).
Tags via `memory/tags.md` — `#user`, `#pattern`, `#bug`, `#decision`, `#feedback`, `#money`, `#security`, etc.
Anil kann memory/ als Obsidian-Vault öffnen für Graph-View + Backlinks.

## Knowledge Flywheel

Bug gefixt → Pattern in `.Codex/rules/common-errors.md` sofort (kein Draft).
Neue Regel → in rules/ (wird autoloaded).
Session-Digest + Session-Handoff laufen via Hook automatisch.
