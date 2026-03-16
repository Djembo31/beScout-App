# BeScout — Projekt-Kontext

B2B2C Fan-Engagement-Plattform fuer Fussballvereine. Clubs verkaufen Scout Cards,
starten Events/Votes, verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

## Jarvis v3 — CTO Mode (1M Context)
- **Level A** (default): Jarvis liefert FERTIGE Features, Anil macht nur visuelles QA
- **Level B**: Inkl. Screenshots, Anil sagt "ship it" oder "Richtung falsch"
- **Level C**: Sprint autonom, taegliche Summaries + Eskalationen
- **Self-Healing Loop:** `/deliver` iteriert bis ALLE Gates gruen (max 5x)
- **Impact Analysis:** `/impact` VOR jeder Aenderung an RPCs/DB/Services
- **CTO Review:** `/cto-review` ersetzt manuelle Quality Gate
- **Agents:** 6 definierte Agents in `.claude/agents/` (impact-analyst, implementer, reviewer, test-writer, qa-visual, healer)
- Details → `orchestrator.md` + `core.md`

## Design System
- **Background:** `#0a0a0a` (fast schwarz)
- **Primary/Gold:** `text-gold` / `bg-gold` (CSS Var `--gold: #FFD700`). Buttons: `from-[#FFE44D] to-[#E6B800]`
- **Success/Live:** `text-green-500`. Positions: GK=emerald, DEF=amber, MID=sky, ATT=rose
- **Cards:** `bg-white/[0.02]` + `border border-white/10 rounded-2xl`
- **Borders:** `border-white/[0.06]` bis `border-white/10`
- **Inset Light:** `inset 0 1px 0 rgba(255,255,255,0.06)` auf Cards
- **Fonts:** Headlines `font-black` (900), Zahlen `font-mono tabular-nums`
- **Min Opacity:** 5% Surfaces, white/50+ lesbarer Text (WCAG AA auf #0a0a0a)
- **Referenz:** PokerStars (Event-Lobby) + Sorare (Gameweeks/Cards)

## Key Components (IMMER pruefen bevor neu gebaut)
| Component | Pfad | Zweck |
|-----------|------|-------|
| PlayerDisplay | `player/PlayerRow.tsx` | **DIE** Spieler-Darstellung (compact/card) |
| PlayerPhoto | `player/index.tsx` | Avatar (pos-border, fallback). Props: `first/last/pos` |
| L5 Tokens | `player/index.tsx` | `getL5Color/Hex/Bg()` — Single Source of Truth |
| PlayerKPIs | `player/index.tsx` | 8 Kontexte: portfolio/market/lineup/result/picker/ipo/search/default |
| Modal | `ui/index.tsx` | BottomSheet mobile. IMMER `open={true/false}` prop |
| Card, Button | `ui/index.tsx` | Shared UI. Button hat `active:scale-[0.97]` |
| TabBar | `ui/TabBar.tsx` | Tabs + TabPanel |
| EventDetailModal | `fantasy/EventDetailModal.tsx` | Fantasy Lineup Builder |
| ProfileView | `profile/ProfileView.tsx` | Shared Profil (4 Tabs) |
| SideNav/TopBar | `layout/` | Navigation + Search + Notifications |
| Loader2 | `lucide-react` | EINZIGER Loading Spinner (nie custom border-divs) |

## Regeln → .claude/rules/ (12 Files)
Domaenen-spezifische Regeln laden automatisch per Glob-Pattern.
**Immer geladen:** core.md, business.md, common-errors.md, orchestrator.md
**Path-spezifisch:** ui-components.md, database.md, trading.md, fantasy.md, gamification.md, community.md, club-admin.md, profile.md

## Agents → .claude/agents/ (6 Agents)
| Agent | Rolle | Key Constraint |
|-------|-------|----------------|
| impact-analyst | Cross-cutting Impact Analysis | Read-only |
| implementer | Code schreiben nach Spec | Worktree-isoliert |
| reviewer | Code Review | Read-only, KANN NICHT schreiben |
| test-writer | Tests aus Spec only | Sieht NIE Implementation |
| qa-visual | Playwright Screenshots | Read-only + Playwright |
| healer | Fix Loop (Build/Test/Lint) | Max 5 Runden |

## Memory → memory/
- MEMORY.md: Auto-loaded (erste 200 Zeilen) — Architecture + Backend + Patterns
- current-sprint.md: Aktueller Stand + naechste Prioritaet
- Deep-Dive Files (on-demand): architecture.md, patterns.md, backend-systems.md, decisions.md, errors.md, sessions.md

## VOR jeder Aenderung (PFLICHT)
1. Bestehenden Code pruefen BEVOR neuer Code geschrieben wird
2. Relevante .claude/rules/ Dateien LESEN
3. Bei UI: Alle States, Mobile-First 360px
4. Nicht raten — nachschauen

## Kern-Business
- Scout Card = Digitale Spielerkarte. Marktwert steigt → Community Success Fee
- (Code-intern: "dpc" in Variablen/DB-Columns bleibt — nur UI-sichtbar umbenannt)
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit, Ownership)
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- Closed Economy Phase 1: KEIN Cash-Out, KEIN P2P, KEIN Exchange
- Fee-Split Trading: 6% total (Platform 3.5% + PBT 1.5% + Club 1%)
- IPO Fee: 85% Club, 10% Platform, 5% PBT

## Code-Konventionen → `core.md`
`'use client'` alle Pages | Types in `types/index.ts` | UI in `ui/index.tsx` |
`cn()` classNames | `fmtScout()` Zahlen | Component→Service→Supabase | DE Labels, EN Code

## Quality Pipeline (via /deliver automatisiert)
1. `tsc --noEmit` → Type Check
2. `npx next build` → Build Check
3. `vitest run` → Test Check
4. reviewer Agent → Pattern Check
5. Bei UI: `/baseline-ui` → `/fixing-accessibility`

## Automation (Hooks)
- **PostToolUse:** Auto ESLint + Gemini Sync Reminder
- **PreToolUse:** Safety Guard + Agent Dispatch Guard
- **PreCompact:** Git Diff Backup (automatisch)
- **Stop:** Uncommitted Changes Warnung + UI Component Check

## Compaction (KRITISCH)
When compacting, ALWAYS preserve:
- All modified file paths from this session
- Current feature spec status + open requirements
- All build/test results
- Unresolved errors or blockers
- Active decisions not yet implemented

## Referenzen
- docs/VISION.md — Produktvision
- docs/STATUS.md — Detaillierter Fortschritt
- docs/BeScout_Context_Pack_v8.md — Business Master-Dokument
- docs/SCALE.md — Skalierungsarchitektur und DB-Schema
