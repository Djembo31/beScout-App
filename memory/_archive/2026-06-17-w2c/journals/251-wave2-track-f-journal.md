# Backend Journal: Slice 251 Wave 2 Track F — Wildcards Composite-PK + RPCs

## Gestartet: 2026-04-28

### Verstaendnis
- Was: `user_wildcards` Tabelle von single-PK (user_id) zu Composite-PK (user_id, league_id) migrieren. 3 neue RPCs (get/earn/spend per Liga). `rpc_save_lineup` Update. Frontend-Hook-Signatur-Erweiterung.
- Betroffene Tabellen: `user_wildcards`, (wildcard_transactions bleibt global)
- Betroffene Services: `src/features/fantasy/services/wildcards.ts`, `src/features/fantasy/queries/events.ts`, `src/lib/queries/keys.ts`
- Risiken: Backfill-Split-Modulo (AC-24), RLS auf Composite-PK, REVOKE/GRANT nach CREATE OR REPLACE, NULL-in-Scalar-Subquery bei spend_wildcards

### Key-Findings aus Code-Reading
1. WildcardsSection liegt in `src/components/inventory/WildcardsSection.tsx` (NICHT `src/components/fantasy/`) — importiert `useWildcardBalance` aus `@/lib/queries/events`
2. `src/lib/queries/events.ts` ist nur ein Re-Export: `export * from '@/features/fantasy/queries/events'`
3. Die keys.ts ist in `src/lib/queries/keys.ts` — `qk.events.wildcardBalance(uid)` hat noch 1-Param-Signatur
4. `src/features/fantasy/queries/keys.ts` ist auch nur Re-Export von global keys.ts
5. `rpc_save_lineup` ruft `spend_wildcards(p_user_id, v_wildcard_delta, 'lineup_wildcard', p_event_id)` — source ist 'lineup_wildcard', NICHT 'lineup_spend' wie im Check Constraint! Das ist ein Bug der noch vor dem Track-F existiert.
6. Wildcard-Earn-Source im rpc_save_lineup: 'lineup_wildcard_refund' — auch NICHT in Constraint
7. DbWildcardTransaction.source hat CHECK-Constraint: 'mystery_box' | 'mission' | 'event_reward' | 'daily_quest' | 'milestone' | 'event_refund' | 'admin_grant' | 'lineup_spend' — aber save_lineup nutzt 'lineup_wildcard' und 'lineup_wildcard_refund' — BESTEHENDER BUG, nicht Track-F Scope.

### Entscheidungen
| # | Entscheidung | Warum |
|---|---|---|
| 1 | Migration-Strategie A (ALTER TABLE + Backfill + DROP/ADD CONSTRAINT) | Idiomatischer für PK-Change, idempotenter COALESCE-Pattern |
| 2 | WildcardsSection bleibt ohne leagueId-param | Spec sagt Bridge via `activeClub?.league_id` — aber WildcardsSection ist auf /inventory, kein leagueId-Context. Zeigt Total über alle Ligen. SCOPE-OUT gemäß Spec: Frontend-Bridge nur für FantasyContent-Kontext |
| 3 | `wildcard_transactions` bleibt global (kein league_id) | Impact-Doc sagt nichts über wildcard_transactions-Extension. Nur user_wildcards bekommt Composite. |
| 4 | Discriminated Union Return für earn/spend, aber get_wildcard_balance bleibt RETURNS INT | get_wildcard_balance ist simple read, kein discriminated union nötig. Aber Service-Layer prüft trotzdem auf error |
| 5 | Neue `lineup_wildcard` und `lineup_wildcard_refund` sources NICHT zu wildcard_transactions CHECK addieren | Das ist außerhalb Track-F-Scope — separate DB-Migration würde nötig sein |

### Fortschritt
- [x] Task 1: Journal erstellen + Code lesen
- [x] Task 2: Migration 1 — user_wildcards Composite-PK (20260428120000)
- [x] Task 3: Migration 2 — 3 neue RPCs + rpc_save_lineup update (20260428120500 + 20260428121000)
- [x] Task 4: Frontend Service + Hook + Keys update (wildcards.ts + events.ts + keys.ts + WildcardsSection.tsx + invalidation.ts + useEventActions.ts + types/index.ts)
- [x] Task 5: Tests (wildcards.test.ts — 6 tests, 6 PASS)
- [x] Task 6: tsc + vitest + git status verify (all PASS, commit 7563761b)
- [x] Task 7: Pre-Review-Memo (worklog/reviews/251-wave2-track-f-pre-review.md)

### Runden-Log
Runde 1: Code Reading abgeschlossen. Alle Key-Findings oben. Starte Implementation.
Runde 2: Alle 3 Migrations geschrieben (PK-Migration + RPCs + rpc_save_lineup).
Runde 3: Frontend Layer komplett — types, keys, service, hook, consumers, tests.
Runde 4: git stash pop nach versehentlichem stash (pre-existing test check). Alle Edits wiederhergestellt. tsc clean, 6/6 tests, commit PASS.

### Tsc Output
```
npx tsc --noEmit → (no output = 0 errors)
```

### Test Output
```
Test Files  1 passed (1)
      Tests  6 passed (6)
```

### Beweis-Pfad
- Commit: 7563761b
- Pre-Review-Memo: worklog/reviews/251-wave2-track-f-pre-review.md
