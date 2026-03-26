# Current Sprint — Architecture Refactoring

## Stand (2026-03-27, Session 259)
- **Tests:** 2007 (161 Files, 9 pre-existing failures), tsc 0 Errors
- **Branch:** main (Fantasy refactoring gemerged, PR #1 closed)
- **Neue Struktur:** `src/features/fantasy/` — 55 neue Files, Feature-Module Pattern

## Erledigt (Session 259)
- Fantasy Module Refactoring: Design → Plan → 4 Wellen → Merge
- Codebase-Audit: Top 12 Technical Debt Items identifiziert + priorisiert
- Workflow-Learnings dokumentiert (Worktree-Agent-Strategie)

## Naechste Prioritaet: Market Page Refactoring

### Scope
- `src/app/(app)/market/page.tsx` — 606 LOC God-Component
- 12 Dynamic Imports, 4 Modals inline, 0 Tests
- Trading = Core-Business, Pilot-kritisch

### Ansatz (gleich wie Fantasy)
1. Brainstorming → Design Doc
2. Feature-Module `src/features/market/`
3. Stores + Hooks + Service-Split
4. Component-Decomposition
5. Tests schreiben

### Danach
- Player Detail (~1880 LOC) → Feature-Module
- Community (751 LOC) → Component-Split + Tests
- Admin Components → Modal-Extraktion

## Bekannte Issues
- 9 pre-existing test failures (ProfileView, PlayerContent, db-invariants, AdminEventsTab, events-v2, TradingTab)
- Fantasy Dead Code: DashboardTab (377 LOC), GameweekTab (383 LOC) — unused
- Raw query keys in invalidation.ts: `['research']`, `['bounties']`
- Fantasy LineupPanel nicht auf LineupBuilder umgestellt (parallel vorhanden)

## Blocker
- Keine
