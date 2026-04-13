# Fantasy Saeule — Hardening Spec

**Datum:** 2026-04-13
**Ziel:** Alle Fantasy-Services end-to-end verifizieren. Silent-Null Fixes. Dead Code entfernen. Tests schreiben.
**Scope:** features/fantasy/services/ (10 Files) + Re-Export Bridges (5 Files) + Queries + Hooks

---

## Befund: 7 Files mit Silent-Null, 2 ohne Error-Destructuring

| # | Service | Lines | Error Handling | Fix noetig |
|---|---------|-------|----------------|------------|
| 1 | fixtures.ts | 538 | ❌ 8+ silent returns, kein Error-Log | JA — KRITISCH |
| 2 | events.queries.ts | 155 | ⚠️ Inkonsistent (1 throws, 1 silent) | JA |
| 3 | scoring.queries.ts | 369 | ⚠️ 5 silent returns, 1 ohne Destructuring | JA |
| 4 | lineups.queries.ts | 230 | ⚠️ 6 silent returns | JA |
| 5 | predictions.queries.ts | 237 | ⚠️ 6 silent returns | JA |
| 6 | leagues.ts | 70 | ❌ Kein Error-Destructuring | JA |
| 7 | events.mutations.ts | 464 | ✅ Throws | Nein |
| 8 | lineups.mutations.ts | 53 | ✅ Throws | Nein |
| 9 | predictions.mutations.ts | 123 | ✅ Throws | Nein |
| 10 | scoring.admin.ts | 315 | ✅ Returns error result | Nein |
| 11 | wildcards.ts | 110 | ✅ Throws | Nein |

## Waves

### Wave 1: Silent-Null Fixes (fixtures.ts, scoring.queries.ts, leagues.ts)
Die 3 schlimmsten Offender: fixtures (8+ functions), scoring.queries (5 functions), leagues (0 error destructuring).
Pattern: `if (error) throw new Error(error.message)` — identisch zu Trading.

### Wave 2: Silent-Null Fixes (events.queries.ts, lineups.queries.ts, predictions.queries.ts)
Restliche 3 Files mit silent-null. Gleicher Fix-Pattern.

### Wave 3: Tests
Fehlende Test-Files: fixtures.test.ts, lineups.test.ts, predictions.test.ts

## Invarianten
- Alle Mutations (submit lineup, create prediction, score event) bleiben unberuehrt
- Keine Component-Aenderungen
- Query Keys bleiben identisch
- React Query retry (3x default) faengt transiente Errors korrekt
