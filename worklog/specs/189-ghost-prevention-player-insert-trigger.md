# Slice 189 — Ghost-Prevention Player-Insert-Trigger

**Slice-ID:** 189
**Datum:** 2026-04-24
**Scope:** S (DB-Migration + Tests, 2-3 Files)
**Branch:** main
**Approval:** kein CEO-Scope (Data-Integrity, keine Money-Flows)

## Ziel

DB-Level BEFORE-INSERT-Trigger auf `players`-Tabelle verhindert Ghost-Row-Entstehung (INV-39 Cross-Club-Contamination + INV-40 Same-Club-Duplicates). Fängt ALLE Insert-Pfade unabhängig vom Caller (Scripts, zukünftige Crons, manuelle SQL).

## Betroffene Files (geschätzt)

1. `supabase/migrations/2026042420XX_slice_189_ghost_prevention_trigger.sql` (NEU)
2. `src/lib/__tests__/db-invariants.test.ts` (erweitert — Regression-Guard für Trigger-Verhalten)
3. `memory/decisions.md` (D39 neuer Entry — DB-Trigger als Ghost-Gate)

## Ghost-Entstehung — Evidence aus 187-Cleanup

INV-39/40 Ghosts (9 Spieler, 2026-04-24 via MCP orphaned):
- Mio Backhaus, Yukinari Sugawara, Jake O'Brien, Amos Pieper, Niklas Stark
- Olivier Deman, Mick Schmetgens, Maximilian Wöber, Tyrhys Dolan

Pattern: alle hatten `last_appearance_gw = 0` + case-insensitive Name-Match zu echten Spielern anderer Clubs mit `last_appearance_gw > 0`.

**Entstehung:** `scripts/verify-squads.mjs` mit `--fix` Flag macht Fuzzy-Name-Match. Wenn Match fehlschlägt (Schreibvariant, Nationalität-Accents, Namesvetter), INSERT → Ghost.

**Aktueller Zustand:** `sync-players-daily` Cron macht KEINE Inserts (Line 255-258: `stats.players_new_skipped++; continue;`). Ghost-Quelle sind ausschließlich manuelle Scripts.

## Acceptance Criteria

1. **AC-1:** Neuer Trigger `prevent_player_ghost_insert` BEFORE INSERT ON players.
2. **AC-2:** Same-Club-Duplicate-Check: INSERT mit (lower(first_name), lower(last_name), club_id) der bereits existiert → RAISE EXCEPTION.
3. **AC-3:** Cross-Club-Contamination-Check: INSERT wenn existierender Player (selber Name, anderer Club, `last_appearance_gw > 0`) existiert → RAISE EXCEPTION.
4. **AC-4:** Namesvetter-Exception: Same-Name+different-Club+both-inactive (`last_appearance_gw = 0` bei beiden) → allowed (echte Homonym-Szenarien).
5. **AC-5:** Bulk-Migration-Escape (analog D28): GUC `bescout.allow_player_ghost_insert = 'true'` via `SET LOCAL` innerhalb Transaction erlaubt Bypass.
6. **AC-6:** Regression-Test in `db-invariants.test.ts` verifiziert dass Trigger aktiv ist (`SELECT tgname FROM pg_trigger WHERE tgrelid = 'players'::regclass`).
7. **AC-7:** Unit-Test (gegen live DB): INSERT-Versuch einer Ghost-Row wird rejected mit erwarteter Error-Message.
8. **AC-8:** 0 False-Positives auf bestehenden Daten — erste Anwendung `INSERT ... SELECT` über existing players würde nicht failen (außer es gibt weitere nicht-gecleanupt Ghosts).

## Edge Cases

1. **UPDATE-Trigger nicht gewollt:** Nur BEFORE INSERT. UPDATE auf `club_id` (Transfer) darf nicht blockiert werden.
2. **Soft-Delete / club_id=NULL:** Ein Ghost mit `club_id=NULL` (nach 187-Cleanup) zählt nicht als Match — `WHERE club_id IS NOT NULL` im Guard.
3. **NEW.id = OLD.id Self-Match:** `WHERE id != NEW.id` im Query (obwohl bei INSERT noch nicht assigned — aber best practice).
4. **Namesvetter:** Zwei reale "Luis Díaz", zwei "Mehmet Kaplan" etc. existieren. AC-4 allow wenn beide inaktiv.
5. **Case-Sensitivity:** Türkisches Unicode `İ` vs `i` — `lower(trim())` applied.
6. **Leading/Trailing Whitespace:** `trim()` applied.
7. **NULL first_name oder last_name:** Trigger skipped (Row ist corrupt, separate Concern). `IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN ...`.
8. **Bulk-Legacy-Import:** Historische Seeds haben Duplicates. GUC-Bypass erlaubt Migration ohne Trigger-DROP.
9. **club_id=NULL INSERTS:** Manche Imports starten club-less (später zugeordnet). Trigger skipped wenn `NEW.club_id IS NULL`.
10. **REVOKE/GRANT beim Trigger:** Trigger-Functions haben kein SECURITY DEFINER brauchen kein REVOKE (per database.md Ausnahme).

## Proof-Plan

1. **SQL-Verify:** `SELECT tgname, tgtype FROM pg_trigger WHERE tgrelid = 'public.players'::regclass AND tgname = 'prevent_player_ghost_insert';` → 1 Row.
2. **Negative-Test:** Versuch INSERT eines synthetischen Ghost (`first_name='TestGhost', last_name='Test187', club_id=<any>`) mit einem identischen Nachfolger → PostgreSQL error raised.
3. **Positive-Test:** INSERT eines neuen legitimen Players (unique name + club kombo) → success.
4. **Legacy-Tolerance:** Bestehende INV-39/40 = 0 violations (wurde in 187 gecleanupt). Trigger bricht keine bestehenden Rows.
5. **vitest run** `src/lib/__tests__/db-invariants.test.ts` — alle 44 Tests + neue Tests grün.
6. **GUC-Bypass-Test:** `SET LOCAL bescout.allow_player_ghost_insert = 'true'; INSERT ...; COMMIT;` → success (kein Raise).

## Scope-Out

- KEINE Änderung an `sync-players-daily` route.ts (Cron macht keine Inserts, kein Bedarf).
- KEINE Script-Level-Changes in `verify-squads.mjs`, `enrich-from-transfermarkt.mjs`, `rebuild-ban-squad.mjs` (DB-Trigger ist defense-in-depth, Scripts werden automatisch geschützt).
- KEIN DELETE existierender Ghosts (bereits in 187 erledigt).
- KEIN Cross-Club-Legitimate-Transfer-Check (UPDATE, nicht INSERT).

## Impact-Check

**Reviewer-Checkliste (gemäß common-errors.md + database.md):**
- [x] Trigger ist BEFORE INSERT nicht AFTER → exception stoppt Insert vor Row-Commit
- [x] Namesvetter-Edge explicit handled (AC-4)
- [x] club_id=NULL case handled
- [x] Bulk-Migration-Escape via GUC (D28-Pattern)
- [x] Regression-Test in db-invariants
- [x] Test-Write braucht Live-DB (kein unit-test-mockable) — testing.md erlaubt das

**Consumer-Check:**
- `supabase/migrations/` 6 players-related migrations gegrept — kein bestehender Trigger mit diesem Name (verifizieren via `pg_trigger` Query).
- `scripts/**/*.mjs` 3 files mit `.from('players').insert()` — werden durch Trigger automatisch geschützt, ohne Script-Changes. Bei Legacy-Seed-Runs: `SET LOCAL bescout.allow_player_ghost_insert = 'true'` verwenden.

**Blast-Radius:** Trigger ist BEFORE INSERT → keine Transaktions-Rollback-Kaskade. Falls fehlschlägt: Ghost-Scripts bekommen Postgres-Error, aber keine Daten-Korruption.

## Reihenfolge

1. SPEC (dieses File) ✓
2. IMPACT inline (diese Sektion) ✓
3. BUILD: Migration schreiben → via `mcp__supabase__apply_migration` → verify pg_trigger
4. BUILD: Tests in db-invariants.test.ts erweitern (Negative + Positive + GUC-Bypass)
5. REVIEW: Self (Trigger-Pattern ist bekannt aus D28, Pattern-Wiederholung) ODER Reviewer-Agent wenn Edge-Case-Unsicherheit bleibt
6. PROVE: worklog/proofs/189-ghost-prevention.md mit SQL-Output + vitest-Output
7. LOG: worklog/log.md neuer Entry
8. DISTILL: Decision D39 in memory/decisions.md
