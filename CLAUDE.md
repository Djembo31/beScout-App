# BeScout — Quick Reference

B2B2C Fan-Engagement-Plattform. Clubs verkaufen Scout Cards, starten Events/Votes,
verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

## Design Tokens
| Token | Wert | Usage |
|-------|------|-------|
| Background | `#0a0a0a` | Body, alle Screens |
| Gold | `var(--gold, #FFD700)` | `text-gold`, `bg-gold` |
| Button Gradient | `from-[#FFE44D] to-[#E6B800]` | Primary Buttons |
| Card Surface | `bg-white/[0.02]` | Card-Hintergrund |
| Card Border | `border border-white/10 rounded-2xl` | Card-Rahmen |
| Subtle Border | `border-white/[0.06]` | Divider, Sections |
| Inset Light | `inset 0 1px 0 rgba(255,255,255,0.06)` | Card box-shadow |
| Text Readable | `white/50+` | WCAG AA auf #0a0a0a |
| Headlines | `font-black` (900) | Alle Ueberschriften |
| Numbers | `font-mono tabular-nums` | Preise, Stats, Counts |
| Positions | GK=emerald, DEF=amber, MID=sky, ATT=rose | Spieler-Positionen |

## Component Registry (pruefen bevor neu gebaut)
| Component | Import | Props/Zweck |
|-----------|--------|-------------|
| PlayerDisplay | `player/PlayerRow.tsx` | compact/card Modes |
| PlayerPhoto | `player/index.tsx` | `first`, `last`, `pos` (NICHT firstName) |
| L5 Tokens | `player/index.tsx` | `getL5Color()`, `getL5Hex()`, `getL5Bg()` |
| PlayerKPIs | `player/index.tsx` | 8 Kontexte: portfolio/market/lineup/result/picker/ipo/search/default |
| Modal | `ui/index.tsx` | IMMER `open={true/false}` prop. BottomSheet mobile |
| Card, Button | `ui/index.tsx` | Button hat `active:scale-[0.97]` |
| TabBar | `ui/TabBar.tsx` | Tabs + TabPanel |
| Loader2 | `lucide-react` | EINZIGER Spinner (nie custom divs) |
| EventDetailModal | `fantasy/EventDetailModal.tsx` | Fantasy Lineup Builder |
| ProfileView | `profile/ProfileView.tsx` | Shared Profil (4 Tabs) |
| SideNav/TopBar | `layout/` | Navigation + Search + Notifications |

## Import Map
| Was | Import |
|-----|--------|
| Types | `@/types` |
| Services | `@/lib/services/[name]` |
| UI Components | `@/components/ui/index` (cn, Card, Button, Modal) |
| Player Components | `@/components/player/index` (PlayerPhoto, getL5Color) |
| Query Keys | `@/lib/queryKeys` (qk.*) |
| Supabase Client | `@/lib/supabaseClient` |
| i18n | `next-intl` (useTranslations) |
| Icons | `lucide-react` |

## Code Conventions
- `'use client'` alle Pages
- Types in `types/index.ts`, UI in `ui/index.tsx`
- `cn()` classNames, `fmtScout()` Zahlen
- Component -> Service -> Supabase (NIE direkt)
- DE Labels, EN Code. i18n: `t()` mit `messages/{locale}.json`
- Hooks VOR early returns. Loading Guard VOR Empty Guard.
- `Array.from(new Set())` statt `[...new Set()]`
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)

## Top 10 DONT
1. `flex-1` auf Tabs -> iPhone overflow -> `flex-shrink-0` nutzen
2. `[...new Set()]` -> strict TS Fehler -> `Array.from(new Set())`
3. Supabase direkt in Components -> Service Layer nutzen
4. Hooks nach early return -> React Rules Verletzung
5. Leere `.catch(() => {})` -> mindestens `console.error`
6. Dynamic Tailwind `border-[${var}]/40` -> `style={{ borderColor: hex }}`
7. Modal ohne `open` prop -> IMMER `open={true/false}`
8. `::TEXT` auf UUID beim INSERT -> Column-Type respektieren
9. `staleTime: 0` -> `invalidateQueries` nach Writes nutzen
10. Raw query keys `['foo']` -> IMMER `qk.*` Factory nutzen

## Business (Compliance-Critical)
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit, Ownership)
- Scout Card = Digitale Spielerkarte (kein Eigentum, keine Anlage)
- Code-intern: "dpc" in Variablen/DB-Columns bleibt (nur UI umbenannt)
- Fee-Splits → `business.md` (7 Kategorien: Trading, IPO, Research, Bounty, Polls, P2P, Club Abos)
- DB Columns → `database.md` (Column Quick-Reference + CHECK Constraints)

## Rules (auto-loaded)
`common-errors.md` (patterns, traps) | `database.md` (columns, RLS, RPCs) | `business.md` (compliance, fees) | `workflow-reference.md` (agents, skills, hooks)

## Ferrari 10/10 Workflow (2026-04-15 Upgrade)

**Automatisierte Audits on-demand:**
```bash
npm run audit              # Full Suite (compliance + i18n + rpc-security)
npm run audit:compliance   # business.md + common-errors.md violations
npm run audit:i18n         # DE↔TR Key-Parität + leere Values
npm run audit:rpc-security # Live-DB SECURITY DEFINER + anon-Grants
```

**Pre-Commit Guard (automatisch via `.claude/settings.json`):**
- Blockt Commits wenn Compliance-Violations oder i18n-Gaps
- Scope: `$SCOUT` Ticker in user-facing, `kazan*` in TR, Merge-Markers, CREATE OR REPLACE ohne REVOKE
- Bypass nur in Emergency: `git commit --no-verify`

**Governance-Files:**
- `memory/ar-counter.md` — AR-Number-Tracking (verhindert Audit-Collisions)
- `memory/tr-review-queue.md` — TR-String-Batch-Review (statt Einzel-Friction)
- `memory/agent-briefing-template.md` — Standard-Briefing mit Token-Budget + Self-Verify

**Migration-Body-Extractor:** `node scripts/pg/extract-rpc.js <proname>` → saubere Full-Body-Edits statt regex-replace.

**Agent-Konventionen (Ferrari 10/10):**
- Worktree-Agents: **ALLE Bash-Commands** mit `cd $WORKTREE_PATH && ...` Prefix (Bash-State nicht persistent)
- Token-Budget explizit: "~80 tool-uses, bei 100 STOP"
- Self-Verify-Checklist PFLICHT vor PASS-Meldung

## Pre-Edit Checks (PFLICHT — vor JEDER Datei-Aenderung)

### RPC / Migration (`supabase/migrations/`, `CREATE FUNCTION`)
- NULL-in-scalar: `COALESCE` auf Variable, NIE `(SELECT COALESCE(x,0) FROM t WHERE ...)`
- CHECK constraints: Column-Werte gegen `database.md` verifizieren
- RLS: neue Tabelle → ALLE Ops (SELECT+INSERT+UPDATE+DELETE)
- Return-Shape: camelCase oder snake_case? Service-Cast MUSS matchen
- Holdings/Balance-Check: `NOT FOUND` oder `COALESCE(v_var, 0)`

### Service (`src/lib/services/*.ts`)
- Error-Handling: THROW bei Error, NIE `return null` wenn UI "loading" zeigt
- Return-Type: MUSS RPC-Response-Shape matchen (camelCase/snake_case pruefen)
- Nach Edit: `npx vitest run` auf Test-File
- Consumer-Check: wer konsumiert Return? Typ kompatibel?

### Component (`src/components/`, `src/features/`, `src/app/`)
- Mobile: passt in 393px (iPhone 16)?
- Loading-State: Skeleton statt conditional-hide
- Error-State: sichtbar, nicht silent
- Hooks vor Returns (React Rules)

### Vor JEDEM Commit
- `npx tsc --noEmit` + `npx vitest run [betroffene Tests]`
- Diff reviewen gegen common-errors.md Patterns
- Bug-Fix? → `common-errors.md` JETZT updaten

## Work Rhythm (6-Takt, PFLICHT)
1. **VERSTEHEN** — Task lesen, Files lesen, laut sagen was ich vorhabe. 3+ Files → `/impact`
2. **PLANEN** — Welche Files, welche Checks? Explizit benennen.
3. **IMPLEMENTIEREN** — Ein File nach dem anderen. Nach JEDEM: Checklist + sofort verifizieren.
4. **VERIFIZIEREN** — tsc + vitest + Diff-Review. Bug-Fix → common-errors.md updaten.
5. **BEWEISEN** — Screenshot, DB-Query, Test-Output. "Fertig" = bewiesen.
6. **AUFRAUMEN** — Tests, i18n DE+TR, Barrel-Exports, Memory aktuell?

## After Bug-Fix: Knowledge Compilation (→ Details in workflow-reference.md)
1. Pattern → `common-errors.md` sofort (kein Draft, kein Pending)
2. Analyse → Wiki-Seite `memory/semantisch/projekt/` bei komplexen Investigations
3. cortex-index → neues Routing wenn neue Domain
4. Gute Analysen → Wiki-Seite filen, nicht in Chat-History sterben lassen
5. Session-Digest → Lektionen + Warnungen fuer morgen

## Agent-Delegation (Context-Management)
- Research >3 Files → Explore Agent
- Vor DB/RPC/Service → Impact Agent
- Nach Implementation → Reviewer Agent (frische Augen)
- Tests schreiben → test-writer Agent (Worktree)
- Context >500K → Verification an Agent delegieren
- SELBST: Bug-Fixes, Anil-Alignment, <3 Files, Geld/Security
