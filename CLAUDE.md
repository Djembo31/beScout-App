# BeScout — CTO Playbook

**B2B2C Fan-Engagement.** Clubs verkaufen Scout Cards, starten Events/Votes, verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Der Master-Prozess: SHIP-Loop

**Jede Aenderung laeuft durch 5 Stufen:**

```
SPEC  →  IMPACT  →  BUILD  →  PROVE  →  LOG
```

- **Artefakte:** `worklog/active.md` + `worklog/log.md`
- **Details:** `.claude/rules/workflow.md`
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
- Details: `.claude/rules/` (aktuell autoloaded)

## Top Rules (Pre-Edit)

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
- Details: `.claude/rules/business.md`

## Rules (autoloaded)

| File | Inhalt |
|------|--------|
| `.claude/rules/workflow.md` | SHIP-Loop Spezifikation |
| `.claude/rules/common-errors.md` | Bug-Patterns + Fixes |
| `.claude/rules/database.md` | Columns, RLS, RPCs |
| `.claude/rules/business.md` | Compliance, Fee-Splits |
| `.claude/rules/performance.md` | Query Limits, Bundle |
| `.claude/rules/testing.md` | Vitest + Playwright |

## Agents (via Agent-Tool)

backend, frontend, reviewer (PFLICHT nach Impl), healer, test-writer, impact-analyst, qa-visual, business, autodream

## MCPs

supabase, playwright, context7, sequential-thinking, sentry (aktiv), posthog (nach Neustart), firecrawl

## Knowledge Flywheel

Bug gefixt → Pattern in `.claude/rules/common-errors.md` sofort (kein Draft).
Neue Regel → in rules/ (wird autoloaded).
Session-Digest + Session-Handoff laufen via Hook automatisch.
