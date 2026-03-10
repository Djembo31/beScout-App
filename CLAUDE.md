# BeScout — Projekt-Kontext

B2B2C Fan-Engagement-Plattform fuer Fussballvereine. Clubs verkaufen DPCs,
starten Events/Votes, verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

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

## Memory → memory/
- MEMORY.md: Auto-loaded (erste 200 Zeilen) — Architecture + Backend + Patterns
- current-sprint.md: Aktueller Stand + naechste Prioritaet
- Deep-Dive Files (on-demand): architecture.md, patterns.md, backend-systems.md, decisions.md, errors.md, sessions.md

## Orchestrator Workflow (PFLICHT fuer Features >10 Zeilen)
1. Anil beschreibt Feature (1-3 Saetze)
2. **Gemini get_agent_context()** → kuratiertes Briefing fuer Agents
3. **Research Pipeline** → Agents recherchieren, Output in `.claude/research/`
4. **ICH schreibe Spec** mit TypeScript Contracts → `memory/features/[name].md`
5. **Anil reviewed** → "passt" oder Korrekturen → Decision Capture SOFORT
6. **Agents implementieren** in Worktrees → ICH orchestriere, merge, reviewe
7. **Verification Agents** → Build + Code Review + QA (parallel)
8. **Knowledge Capture** → Fehler/Patterns/Entscheidungen festhalten → Gemini refresh
9. Modes (0-3) + Details → siehe `orchestrator.md`

## VOR jeder Aenderung (PFLICHT)
1. Bestehenden Code pruefen BEVOR neuer Code geschrieben wird:
   - Services/Hooks/Utils: Gibt es schon eine Funktion die das macht?
   - Types: Gibt es schon ein passendes Interface/Type?
   - Components: PlayerDisplay, EmptyState, Modal etc. — NIEMALS duplizieren
   - Patterns: Wie wird das Problem an anderer Stelle im Projekt geloest?
2. Relevante .claude/rules/ Dateien LESEN (ui-components.md, trading.md, etc.)
3. Bei UI: Alle States (Hover/Active/Focus/Disabled/Loading/Empty/Error), Mobile-First 360px
4. Nicht raten — nachschauen. Code lesen, nicht annehmen.

## Session + Workflow → `core.md`
Session-Start, Session-Ende, Feature-Lifecycle, Spec-Driven Workflow, Context-Budget — alles in `core.md`.

## Kern-Business
- DPC = Digital Player Contract. Marktwert steigt → Community Success Fee
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit, Ownership)
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)
- Closed Economy Phase 1: KEIN Cash-Out, KEIN P2P, KEIN Exchange
- Fee-Split Trading: 6% total (Platform 3.5% + PBT 1.5% + Club 1%)
- IPO Fee: 85% Club, 10% Platform, 5% PBT

## Code-Konventionen → `core.md`
Kurzfassung: `'use client'` alle Pages | Types in `types/index.ts` | UI in `ui/index.tsx` |
`cn()` classNames | `fmtScout()` Zahlen | Component→Service→Supabase | DE Labels, EN Code

## Quality Pipeline (nach UI-Aenderungen)
1. `npx vitest run [betroffene tests]` → alle Tests gruen
2. `npx next build` → gruener Build
3. /baseline-ui [datei]
4. /fixing-accessibility [datei]
5. /fixing-motion-performance [datei]
6. /simplify [datei] (bei groesseren Changes)

## Compaction (KRITISCH)
When compacting context, ALWAYS preserve:
- All modified file paths from this session
- Current feature spec status + open requirements
- All build/test commands run and their results
- Unresolved errors or blockers
- Active decisions not yet implemented

## Automation (Hooks)
- **PostToolUse:** Auto ESLint --fix nach jedem Edit/Write auf .ts/.tsx
- **PostToolUse:** Gemini Sync Reminder nach Writes auf memory/ oder rules/ Files
- **PreToolUse:** Safety Guard blockt destructive Bash Commands (rm -rf, DROP, force push)
- **PreToolUse:** Agent Dispatch Guard blockt Agent-Starts ohne PROJEKT-WISSEN Sektion
- **Stop:** Prompt-Check NUR wenn UI-Components geaendert wurden

## Referenzen
- docs/VISION.md — Produktvision
- docs/STATUS.md — Detaillierter Fortschritt
- docs/BeScout_Context_Pack_v8.md — Business Master-Dokument
- docs/SCALE.md — Skalierungsarchitektur und DB-Schema
