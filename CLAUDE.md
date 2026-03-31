# BeScout — Projekt-Kontext

B2B2C Fan-Engagement-Plattform fuer Fussballvereine. Clubs verkaufen Scout Cards,
starten Events/Votes, verteilen $SCOUT-Credits. Pilot: Sakaryaspor (TFF 1. Lig).

## Stack
Next.js 14 (App Router) | TypeScript strict | Tailwind (Dark Mode only) |
Supabase (PostgreSQL + Auth + Realtime) | TanStack React Query v5 | Zustand v5 |
next-intl (Cookie bescout-locale) | lucide-react

## Workflow → `.claude/rules/workflow.md`
- **4-Tier Tasks:** Hotfix / Targeted / Scoped / Full Feature
- **2 Execution-Ebenen:** Direkte Session (Anil+Jarvis) + Paperclip Agents (autonom)
- **7 Paperclip Agents:** CEO, CTO, Engineer, QA, BA (Claude) + CodexReviewer, CodexRescue (GPT)
- **Verification parallel:** tsc + vitest + Reviewer + CodexReviewer + a11y
- **Sub-Agents** in `.claude/agents/` — laden sich SELBST ein (Phase 0)
- **Codex Plugin:** `/codex:rescue` fuer Circuit-Breaker Eskalation
- **Context7:** Bei Library-Arbeit aktuelle Docs holen, in Agent-Prompts einbetten
- **Sequential Thinking:** Bei Design-Entscheidungen — NICHT raten
- **Paperclip:** localhost:3100, Details in `memory/decision_paperclip_cofounder.md`

## Design Tokens (exakte Werte)
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

## Component Registry (IMMER pruefen bevor neu gebaut)
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

## Code-Konventionen
- `'use client'` alle Pages
- Types in `types/index.ts`, UI in `ui/index.tsx`
- `cn()` classNames, `fmtScout()` Zahlen
- Component → Service → Supabase (NIE direkt)
- DE Labels, EN Code. i18n: `t()` mit `messages/{locale}.json`
- Hooks VOR early returns. Loading Guard VOR Empty Guard.
- `Array.from(new Set())` statt `[...new Set()]`
- Geld IMMER als BIGINT cents (1,000,000 = 10,000 $SCOUT)

## Top 10 DONT
1. `flex-1` auf Tabs → iPhone overflow → `flex-shrink-0` nutzen
2. `[...new Set()]` → strict TS Fehler → `Array.from(new Set())`
3. Supabase direkt in Components → Service Layer nutzen
4. Hooks nach early return → React Rules Verletzung
5. Leere `.catch(() => {})` → mindestens `console.error`
6. Dynamic Tailwind `border-[${var}]/40` → `style={{ borderColor: hex }}`
7. Modal ohne `open` prop → IMMER `open={true/false}`
8. `::TEXT` auf UUID beim INSERT → Column-Type respektieren
9. `staleTime: 0` → `invalidateQueries` nach Writes nutzen
10. Raw query keys `['foo']` → IMMER `qk.*` Factory nutzen

## Kern-Business
- Scout Card = Digitale Spielerkarte. Marktwert steigt → Community Success Fee
- Code-intern: "dpc" in Variablen/DB-Columns bleibt (nur UI umbenannt)
- $SCOUT = Platform Credits (NIEMALS: Investment, ROI, Profit, Ownership)
- Fee-Split Trading: 6% (Platform 3.5% + PBT 1.5% + Club 1%)
- IPO Fee: 85% Club, 10% Platform, 5% PBT

## Regeln → .claude/rules/
**Immer geladen:** workflow.md, business.md, common-errors.md
**Path-spezifisch:** ui-components.md, database.md, trading.md, fantasy.md, gamification.md, community.md, club-admin.md, profile.md

## Memory → memory/
- MEMORY.md: Auto-loaded — Architecture + Backend + Patterns
- current-sprint.md: Stand + naechste Prioritaet
- Deep-Dive (on-demand): architecture.md, patterns.md, backend-systems.md, decisions.md, errors.md

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
