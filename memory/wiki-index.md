# Wiki Index (auto-generated 2026-04-14, Run #10)

> Vollstaendiger Index aller Knowledge-Dateien. Generiert von AutoDream v3.
> Nutze diesen Index um Dateien nach Domain/Typ zu finden.

## Rules (.claude/rules/) — 13 Dateien, ~1132 Zeilen

| File | Domain | Lines | Summary |
|------|--------|-------|---------|
| database.md | DB | 82 | Column names, RLS Checkliste, RPC Regeln, Schema, CHECK Constraints, Migration Workflow |
| business.md | Compliance | 55 | Licensing-Phasen, Wording, Geofencing, Fee-Splits, i18n |
| common-errors.md | Cross-Domain | 100 | React/TS/CSS/Shell/Supabase Patterns, RLS Trap, RPC Anti-Patterns, Vercel, PL/pgSQL NULL-in-Scalar, Service Error-Swallowing, camelCase/snake_case Mismatch |
| trading.md | Trading | 78 | Order-Logik, Fee-Berechnung, Liquidation Guards |
| fantasy.md | Fantasy | 71 | Event-Types, Lineup-Validation, Scoring |
| community.md | Community | 75 | Posts, Research, Voting, Moderation |
| profile.md | Profile | 80 | Felder, Validation, Social, Stats |
| gamification.md | Gamification | 74 | Achievements, Badges, Leaderboards, Rewards |
| club-admin.md | Club Admin | 71 | Dashboard, Events, Analytics, Moderation |
| ui-components.md | UI | 75 | Mobile-First, States, Accessibility, Animations |
| workflow-reference.md | Workflow | 304 | How I Work, Agent-Team (Skynet), Skills (17), MCP, Hooks, Imperium-Vision |
| performance.md | Performance | 28 | Query-Optimierung, Bundle, Rendering |
| testing.md | Testing | 39 | Unit/Integration/E2E Konventionen (inkl. Visual QA Playbook) |

## Memory (memory/) — Reference Files

| File | Type | Lines | Summary |
|------|------|-------|---------|
| patterns.md | Reference | 319 | Top 23 Code Patterns (+RPC-Rename Alias-Pattern, +Bulk-Sanitize regex_replace) |
| errors.md | Reference | 122 | Error Patterns (+Fantasy Services Swallow-Pattern, +v2 Mock API canonical, +Count-Query Shape) |
| cortex-index.md | Routing | 58 | Routing-Tabelle (+Operation Beta Ready, +Feature/Service Map, +RPC-Rename, +Bulk-Sanitize, +Phase 1.3 Impact) |
| session-handoff.md | Handoff | 30 | Letzte Session: Operation Beta Ready Phase 0+1 DONE. Uncommitted: 20 Files incl. migrations + tests. |
| polish-sweep.md | Project | 159 | Polish Sweep SSOT: 29/29 Pages KOMPLETT (2026-04-13) |
| project_bescout_liga.md | Spec | 216 | BeScout Liga Original-Spec (historisch) — DONE 2026-04-10, semantisch: bescout-liga.md |
| feature-map.md | SSOT | 221 | Frontend-Inventar: alle Pages, Features, Components, Hooks. 12 User Journeys. (Phase 0, 2026-04-14) |
| service-map.md | SSOT | 266 | Backend-Inventar: 63 Services, 341 Funktionen, alle RPCs, Domain-Map. (Phase 0, 2026-04-14) |
| phase-1.3-impact-map.md | Project | 148 | Phase 1.3 Caller-Impact: buy_player_sc (10 Caller), calculate_sc_of_week (1 Cron-Caller) |
| operation-beta-ready.md | SSOT | ~120 | Operation Beta Ready Master: 5 Phasen, 12 User Journeys, Approval-Triggers, Checkliste |
| pre-launch-checklist.md | Checklist | ~50 | Pre-Launch Gate-Checklist |
| deps/cross-domain-map.md | Reference | 53 | Cross-Domain Trigger Matrix |
| project_missing_revenue_streams.md | Business | 52 | 7 identifizierte Revenue-Opportunities |
| semantisch/personen/anil.md | Profile | 20 | Founder Arbeitsstil |
| semantisch/projekt/agent-research.md | Research | 371 | Agent-System Patterns (24 Patterns, Must-Haves) |
| semantisch/projekt/architecture-3hub.md | Architecture | 48 | 3-Hub Refactor 2026-04-07: Profile/Inventory/Missions/Home |
| semantisch/projekt/manager-team-center.md | Architecture | 71 | Manager Team-Center Wave 0-5 DONE: useLineupBuilder, Kader Migration, Historie-Tab |
| semantisch/projekt/following-feed.md | Feature | 74 | B2 Following Feed E2E: RLS Fix, Dead Code Audit, i18n Labels, Feed Widget |
| semantisch/projekt/transactions-history.md | Feature | 128 | B3 Transactions History E2E: SSOT Pattern, RLS Fix, CSV Export, Fantasy Ranking, 4 Tx Tables |
| semantisch/projekt/equipment-realtime.md | Feature | 83 | Equipment Inventar v2 (Pokédex-Matrix) + Realtime Feed + Migration Registry Drift Doku |
| semantisch/projekt/fantasy-qa-stabilisation.md | Feature | 77 | B3/B4 QA Fixes: LineupPanel Quick-Add, fantasy_league_members RLS Recursion (SECURITY DEFINER), Navigation-Abort |
| semantisch/projekt/home-polish-sweep.md | Feature | 80 | Home Polish Pass 1+2: Track A (Declutter), B1 (LastGameweekWidget), C (Mystery Box daily), D (Liga deferred) |
| semantisch/projekt/bescout-liga.md | Feature | 116 | BeScout Liga DONE: /rankings (7 widgets), 3 DB tables, 4 RPCs, is_liga_event scoring, Economy decisions final |
| semantisch/projekt/operation-beta-ready-phase0-1.md | Feature | 59 | Operation Beta Ready Phase 0+1: Inventory DONE, Phantom-SC Cleanup, RPC Sanitize, RPC-Rename Alias-Pattern |
| semantisch/sprint/current.md | Sprint | 74 | Operation Beta Ready aktiv: CTO-Mode, Tools live, Phase 0+1.1+1.3 DONE |

## Features (memory/features/) — 8 Specs

| File | Lines | Summary |
|------|-------|---------|
| fantasy.md | 346 | Master Fantasy Spec: 12 E2E Flows, DB Schema, RPC Contracts |
| fantasy-api-cron.md | 275 | Cron Jobs: Lineup Scoring, Event Closure, Result Sync |
| push-notification-strategy.md | 157 | Push-Architektur: Triggers, Preferences, Delivery |
| card-visual-overhaul.md | 149 | Scout Card Visual: Gradients, Typography, Rarity |
| card-overhaul.md | 138 | Scout Card UI Redesign: 8 ACCs, Blast Radius |
| data-integrity-audit.md | 137 | Datenintegritaet: Validation, Null Checks, Constraints |
| dead-code-cleanup.md | 80 | Legacy Cleanup: 707 Zeilen entfernt |
| trading-missions-order-expiry.md | 41 | Trading Missions + Order Expiry |

## Agents (.claude/agents/) — 10 Agents

| File | Model | Lines | Summary |
|------|-------|-------|---------|
| SHARED-PREFIX.md | — | 106 | Cache-Prefix fuer alle Agents: Phase 0, Jarvis Protocol |
| backend.md | Sonnet | 181 | DB, RPCs, Services (worktree) |
| frontend.md | Sonnet | 171 | UI, Components, i18n (worktree) |
| reviewer.md | Opus | 160 | Code Review (read-only) |
| test-writer.md | Sonnet | 149 | Tests from Spec (worktree) |
| autodream.md | Sonnet | 140 | Wiki Compiler: Verdichtung, Index, Log |
| business.md | Sonnet | 118 | Compliance (read-only) |
| healer.md | Sonnet | 114 | Build/Test Errors fixen |
| impact-analyst.md | Opus | 95 | Cross-cutting Analysis (read-only) |
| qa-visual.md | Sonnet | 92 | Visual QA mit Playwright |

## Skills (.claude/skills/) — 17 Skills

| Skill | Lines | Domain |
|-------|-------|--------|
| spec | 286 | Migration-First Engineering (PFLICHT bei 3+ Files) |
| typography | 344 | Professionelle Typografie-Regeln |
| deliver | 172 | Ultra Instinct: 4 Quality Gates |
| impact | 130 | Cross-cutting Analysis vor Aenderungen |
| cto-review | 129 | Deep Code Review (1M Context) |
| post-mortem | 52 | Root Cause Analysis nach Bug-Fixes |
| improve | 51 | Session-Retrospektive (alle 10 Sessions) |
| eval-skill | 49 | Skill-Effectiveness Testing |
| competing-hypotheses | 45 | 3 parallele Hypothesen bei 3x Failure |
| beScout-backend | 79 | DB, RPCs, Services Patterns |
| beScout-frontend | 89 | UI, Components, Hooks Patterns |
| beScout-business | 88 | Compliance, Wording, Legal |
| metrics | 38 | Session-Metriken Aggregation |
| promote-rule | 35 | Pending Rules -> common-errors.md |
| reflect | 31 | Learnings Queue Review |

## Learnings (memory/learnings/) — Pipeline

| File | Status | Content |
|------|--------|---------|
| drafts/2026-04-02-smoke-test-hooks-grep.md | Reviewed/Promoted | grep -oP Windows Bug -> common-errors.md |
| drafts/2026-04-02-smoke-test-worktree-skills.md | Reviewed/Promoted | Worktree Skills Fallback -> common-errors.md |
| drafts/2026-04-07-qa-visual-3hub-refactor.md | Promoted/Deleted | Visual QA Multi-Page Refactor Patterns (promoted to testing.md Run #4) |
| drafts/2026-04-13-test-writer-fantasy-services.md | Pending Review | Fantasy Services Mock-Pattern (v2 API canonical), Error-Swallow-Architektur, mapStatRow-Fallback |
| beScout-backend.md | Stub | Awaiting first learning |
| beScout-frontend.md | Stub | Awaiting first learning |
| beScout-business.md | Stub | Awaiting first learning |
| cto-review.md | Stub | Awaiting first learning |
| deliver.md | Stub | Awaiting first learning |
| impact.md | Stub | Awaiting first learning |

---

*Last generated: 2026-04-14 by AutoDream v3 Run #10 (Operation Beta Ready Phase 0+1 — Feature/Service Map, RPC Sanitize, RPC-Rename Alias-Pattern, 2 neue Code Patterns, 3 neue Error-Patterns, 1 neues semantisches File)*
