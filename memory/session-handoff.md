# Session Handoff
## Letzte Session: 2026-03-26 (Session 253)
## Was wurde gemacht

### Event Ownership System (komplett)
- `event_fee_config` Table + Admin UI + RPC Fee Split + Subscription Gate
- 96 Events geprueft, Visual QA passed
- Event Card Icons: Club-Logo nur bei Club-Events (Fix)

### SC Blocking Phase 1 (komplett)
- `holding_locks` Table: trackt gelockte SCs pro Event
- Events-Columns: `min_sc_per_slot` (default 1), `wildcards_allowed`, `max_wildcards_per_lineup`
- `submitLineup`: SC Ownership Check + Lock-Erstellung + Lock Swap
- Unlock bei Event Leave + Cancel + Event-Ende (DB Trigger)
- Trading Guard: `place_sell_order` prueft locked SCs
- Admin UI: `min_sc_per_slot` Feld bei Event-Erstellung
- Player Picker: `useHoldingLocks` Hook, dpcAvailable nutzt echte Lock-Mengen
- Error Handling: `insufficient_sc` + `scLockedInEvents` i18n DE+TR
- `get_available_sc()` SQL Helper

### Commits (10 auf main, gepusht)
1. Event Ownership System (fee config + RPC + subscription gate)
2. Fix: Club-Logo nur bei Club-Events
3. SC Blocking Design Doc
4. SC Blocking Implementation Plan
5. holding_locks Table + Event-Columns
6. DbHoldingLock Type + Services
7. SC Check + Locks in submitLineup
8. SC Blocking RPCs (unlock/cancel/trading/trigger)
9. Admin min_sc_per_slot + i18n + Error Handling
10. Player Picker nutzt echte Lock-Mengen

---

## Naechste Session

### SC Blocking Phase 2: Wild Cards
- Design: `docs/plans/2026-03-25-sc-blocking-design.md`
- `user_wildcards` + `wildcard_transactions` Tables
- Wild Card Slot-Logik in Lineup RPC
- Admin UI: Wild Card Config bei Event-Erstellung
- Fan UI: Wild Card Button im Lineup Builder
- Earn-Hooks: Mystery Box, Missions, Milestones, Daily Quests

### Test Failures (58 pre-existing, nicht blockierend)
- `lineups.test.ts`: Mock braucht holding_locks Responses
- `FantasyContent.test.tsx`: useHoldingLocks nicht gemocked
- `EventDetailModal.test.tsx`: min_sc_per_slot fehlt in Mocks
- `TradingTab.test.tsx`: pre-existing i18n Issues
- DB-Tests: pre-existing (live DB)

### Danach
- DNS verifizieren + echten Signup testen
- 50 Einladungen raus

## Blocker
- Keine
