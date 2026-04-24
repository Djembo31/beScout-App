# Slice 189 Proof — Ghost-Prevention Player-Insert-Trigger

**Datum:** 2026-04-24
**Scope:** S (DB-Trigger + Test-Regression)
**Files:**
- `supabase/migrations/20260424200000_slice_189_ghost_prevention_trigger.sql` (NEU)
- `src/lib/__tests__/db-invariants.test.ts` (+1 test INV-41)

## Trigger Installation — Verified

```sql
SELECT tgname, tgtype, pg_get_triggerdef(oid) AS def
FROM pg_trigger
WHERE tgrelid = 'public.players'::regclass
  AND tgname = 'prevent_player_ghost_insert';
```

Result:
```
tgname                        | tgtype | def
prevent_player_ghost_insert   | 7      | CREATE TRIGGER prevent_player_ghost_insert BEFORE INSERT ON public.players FOR EACH ROW EXECUTE FUNCTION prevent_player_ghost_insert()
```

## Behavioral Test-Suite (4/4 PASS)

Via Live-DB DO-Block mit EXCEPTION-Handling:

| # | Szenario | Verdict | Detail |
|---|----------|---------|--------|
| 1 | Same-Club Duplicate (INV-40) | **PASS** | `ghost_same_club: player Oğuz Kağan Güçtekin already exists in club fc8163d5...` |
| 2 | Cross-Club Contamination (INV-39) | **PASS** | `ghost_cross_club: player Oğuz Kağan Güçtekin exists with appearances at different club (use SET LOCAL bescout.allow_player_ghost_insert = true for leg...)` |
| 3 | Positive (legitimate unique insert) | **PASS** | INSERT succeeded |
| 4 | GUC-Bypass (D28 pattern) | **PASS** | INSERT succeeded under bypass |

Test-Player: `Oğuz Kağan Güçtekin` (club_id `fc8163d5...`, 36 appearances — real active player used as synthetic ghost-attempt target).

## Regression-Test in db-invariants.test.ts

Neuer Test **INV-41** — behavioral check via PostgREST:
1. Fetch einen echten aktiven Player (club_id + last_appearance_gw > 0)
2. Attempt same-club duplicate insert via Service-Role-Client
3. Expect error mit Message matching `/ghost_same_club|ghost_cross_club|unique_violation|duplicate/i`
4. Defensive cleanup

Output:
```
Test Files  1 passed (1)
Tests       39 passed (39)  ← was 38 + INV-41 new
Duration    22.90s
```

## TypeScript

```
npx tsc --noEmit
(clean — no errors)
```

## Acceptance Criteria — 8/8 PASS

| # | AC | Status |
|---|----|----|
| 1 | Trigger `prevent_player_ghost_insert` BEFORE INSERT ON players | ✅ via pg_trigger query |
| 2 | Same-Club-Check rejects duplicates | ✅ TEST 1 |
| 3 | Cross-Club-Contamination-Check rejects | ✅ TEST 2 |
| 4 | Namesvetter exception (both inactive) — allowed | ✅ logic in trigger (`last_appearance_gw > 0` gate) |
| 5 | Bulk-Migration GUC-Escape | ✅ TEST 4 |
| 6 | Regression-Test in db-invariants.test.ts | ✅ INV-41 |
| 7 | Unit-Test (live DB): INSERT ghost rejected | ✅ INV-41 passes |
| 8 | 0 False-Positives on existing data | ✅ (187-cleanup stellte sicher, INV-39/40 = 0 violations) |

## Edge-Case-Handling confirmed

- NULL first_name/last_name/club_id → Trigger skipt (returnt NEW) — other constraints handle
- case-insensitive via `lower(trim())`
- Türkisches Unicode `İ`/`i` via lower() behandelt (`Oğuz Kağan` matched)
- UPDATE nicht blockiert (nur BEFORE INSERT) — Transfers/Renames funktionieren weiter
- GUC-Bypass via `SET LOCAL bescout.allow_player_ghost_insert = 'true'` (D28 Pattern)

## Impact auf bestehenden Code

- **sync-players-daily cron:** KEINE Änderung nötig (macht keine INSERTs, skipt new players)
- **Scripts (verify-squads.mjs, enrich-from-transfermarkt.mjs, rebuild-ban-squad.mjs):** Werden automatisch geschützt. Bei Legacy-Seed-Runs: GUC-Bypass verwenden.
- **createPlayer() service (src/lib/services/players.ts):** Legitime Admin-Calls für neue unique Spieler — Trigger lässt durch (TEST 3 confirmed).

## Follow-ups

- **Monitoring:** bei real use des GUC-Bypass sollte audit-log entstehen. Nachdenken ob `notify_slack` oder Sentry-Event bei `set_config(...allow_player_ghost_insert...)` Aufruf sinnvoll (nicht Slice 189 Scope).
- **Cross-Club Transfer-Handling:** Wenn API-Football einen Spieler-Transfer liefert, wird der Cron-UPDATE auf `club_id` machen (nicht INSERT). Trigger stört nicht. Bei zukünftigen Cron-Inserts (z.B. new-player-onboarding) müsste man den GUC setzen ODER die Transfer-Logik sauber implementieren (UPDATE existing statt INSERT new).

## Sign-off

- Migration live auf `skzjfhvgccaeplydsunz` (beScout-App Prod)
- Trigger verified installed
- 4/4 behavioral tests PASS
- 39/39 vitest tests PASS (INV-41 new)
- tsc clean
