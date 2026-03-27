# Current Sprint — Architecture Refactoring

## Stand (2026-03-27, Session 260)
- **Tests:** 2007 (161 Files, 9 pre-existing failures), tsc 0 Errors
- **Branch:** main (Market refactoring gemerged)
- **Neue Struktur:** `src/features/market/` — 46 Files, Feature-Module Pattern
- **Vorherig:** `src/features/fantasy/` — 55 Files (Session 259)

## Erledigt (Session 260)
- Market Module Refactoring: Design → Plan → 6 Wellen → Merge
  - page.tsx: 606→7 LOC
  - 3 Hooks, 2 Tab-Router, 1 Orchestrator
  - marketStore: 45→21 Felder (24 orphaned entfernt)
  - 13 Re-Export Bridges
  - Bestehende Tests angepasst (63/63 pass)

## Erledigt (Session 259)
- Fantasy Module Refactoring: Design → Plan → 4 Wellen → Merge
- Codebase-Audit: Top 12 Technical Debt Items identifiziert + priorisiert

## Naechste Prioritaet: Market Tests + Player Detail

### Market (Abschluss)
- Hook-Tests: useMarketData, useTradeActions (Agents laufen)
- MarketContent Component-Tests
- Vercel Preview Smoke-Test

### Player Detail Refactoring (~1880 LOC)
- Gleicher Feature-Module-Ansatz
- Meistbesuchte Seite, kein Test-Coverage
- Brainstorming → Design → Plan → Execute

## Bekannte Issues
- 9 pre-existing test failures (ProfileView, PlayerContent, db-invariants, AdminEventsTab, events-v2, TradingTab)
- Fantasy Dead Code: DashboardTab (377 LOC), GameweekTab (383 LOC) — unused
- Raw query keys in invalidation.ts: `['research']`, `['bounties']`
- Fantasy LineupPanel nicht auf LineupBuilder umgestellt (parallel vorhanden)

## Blocker
- Keine
