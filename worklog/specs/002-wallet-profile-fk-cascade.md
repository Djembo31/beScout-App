# 002 — Wallet Profile FK + Orphan Cleanup

## Ziel
`wallets.user_id` bekommt FK auf `profiles.id` mit `ON DELETE CASCADE`. Zwei Orphans werden unterschiedlich behandelt:
- **`9e0edfed` (taki.okuyucu@gmx.de)** — Wallet DELETE, weil abandoned signup (nie wieder eingeloggt, 0 Aktivitaet, Balance = 1M Baseline-Default).
- **`862c96a1` (testtrading@bescout.test)** — **Profile-Backfill** statt Delete (CEO-Entscheidung 2026-04-16). Der Test-Account soll als demo-Profile erhalten bleiben.

INV-17 haengt die Invariante als Regression-Guard in die Test-Suite.

## Klassifizierung
- **Slice-Groesse:** S (1 Migration, 1 Testaddition)
- **Scope:** **CEO-approved** (Option B, 2026-04-16, *modified*: testtrading behalten). Wallet-Row-Delete + Profile-Backfill + Schema-FK auf Money-Tabelle. Daten-Konsequenz: 1 Wallet mit 1.000.000 cents verloren (taki.okuyucu, abandoned signup), 1 Profile backfilled (testtrading, is_demo=true, keine Daten-Loss).
- **Referenzen:** Slice 001 (Befund), `walkthrough/04-blocker-a.md` A-04, `.claude/rules/database.md` RLS/FK-Patterns.

## Betroffene Files
| Pfad | Aktion | Begruendung |
|------|--------|-------------|
| `supabase/migrations/20260416230000_wallets_profile_fk_cascade.sql` | NEW | Migration: orphan DELETE + FK ADD |
| `src/lib/__tests__/db-invariants.test.ts` | EDIT | INV-17 hinzufuegen am Ende (vor `});`) |

## Acceptance Criteria
1. Migration erfolgreich angewandt via `mcp__supabase__apply_migration`.
2. Nach Migration: `SELECT COUNT(*) FROM wallets w LEFT JOIN profiles p ON p.id = w.user_id WHERE p.id IS NULL` = 0.
3. FK-Constraint existiert: `SELECT constraint_name, delete_rule FROM information_schema.referential_constraints WHERE constraint_name = 'wallets_user_id_profiles_fkey'` liefert Row mit `delete_rule = 'CASCADE'`.
4. testtrading profile existiert mit `handle='testtrading'`, `is_demo=true`, `display_name='Test Trading Account'`.
5. Neuer Test `INV-17: wallets.user_id must reference existing profile` im Invariants-File.
6. `npx vitest run -t "INV-16|INV-17"` gruen. INV-16 prueft jetzt 126 Wallets (war 127), 125 mit Transactions + 1 skipped (testtrading mit 2 tx aber backfilled profile matches).
7. `npx tsc --noEmit` clean.
8. Proof-Artefakte:
   - `worklog/proofs/002-migration-before.txt` — SQL-Snapshot VOR Migration (orphan sichtbar)
   - `worklog/proofs/002-migration-after.txt` — SQL-Snapshot NACH Migration (FK aktiv, orphan weg)
   - `worklog/proofs/002-inv17.txt` — Testausgabe INV-16 + INV-17 gruen

## Edge Cases
1. **Andere Orphans erscheinen zwischen Impact-Check und Migration** — die DELETE ist idempotent (`WHERE user_id NOT IN (SELECT id FROM profiles)`), faengt alles. Aber: wenn plötzlich 10 Orphans da sind → Data-Loss-Amplification. Mitigation: Migration VOR DELETE noch ein `SELECT COUNT(*)` auf Orphans → **wenn >1: RAISE NOTICE mit Liste, aber nicht abbrechen** (Anil hat Option B fuer "alle Orphans" approved, nicht nur user 9e0edfed).
2. **FK-ADD schlaegt fehl wenn weitere Orphans existieren** — DELETE laeuft VOR FK-ADD. Wenn Race-Condition zwischen DELETE und ADD: weitere Orphan entsteht → FK-ADD crasht → Migration rolls back → no change. Akzeptabel (re-run).
3. **profiles.id selbst hat kein FK auf auth.users** — wurde im Impact-Check nicht gefunden (profiles.id erscheint nicht in FK-Liste nach auth.users.id). Das ist ausser Scope dieses Slices. Fall 3 orphan: `9e0edfed` hat auth.user aber kein profile — zeigt den Zustand. Unser FK wird nach DELETE passen, weil es nur `wallets → profiles` behandelt.
4. **k_demirtas / kemal Dev-Accounts** haben Profiles — FK-ADD wird sie NICHT betreffen (kein DELETE). Sie bleiben INV-16-skip (keine Transactions). Kein Effekt.
5. **Backfill-Script setzt neue Wallets ohne Profile** — mit neuer FK: INSERT crasht sofort. Gut.
6. **Test-Suite Seed-Data** — falls Integration-Tests Wallet ohne Profile inserten: Tests failen. Wird aber beim vitest-Run sofort sichtbar.

## Proof-Plan
- **Before**: `SELECT w.user_id, w.balance FROM wallets w LEFT JOIN profiles p ON p.id = w.user_id WHERE p.id IS NULL` → erwarte 1 Row (9e0edfed)
- **After (migration applied)**: selbe Query → 0 Rows. `\d+ public.wallets` in Supabase zeigt FK.
- **INV-16 + INV-17**: beide gruen, 126 Wallets geprueft (statt vorher 127).

## Scope-Out
- **KEIN profiles.id FK auf auth.users.id** — separater Scope, fraglich ob das jemals noetig ist (Supabase-Convention).
- **KEIN Backfill von Transactions fuer k_demirtas / kemal Dev-Accounts** — historische Dev-Daten, kein User-Test-Blocker. Separate Dokumentation in LOG-Notes.
- **KEINE anderen Cascade-FKs** — nur wallets. Weitere Tabellen-FK-Audits ausserhalb.
- **KEINE Aenderung an welcome_bonus_claims / init_user_wallet-Trigger** — bleibt wie J1-03 definiert.
- **KEINE RLS-Policy-Aenderung** — FK ist Schema, nicht Authorization.

## Impact (kompakt, nur dieser Slice)
- `wallets.user_id` hat aktuell KEIN FK (nur PK). Nach Migration: FK auf `profiles.id ON DELETE CASCADE`.
- Profile-DELETE im Code-Base nicht praxisueblich (ich kenne keinen Profile-Delete-Flow). Kein Regression-Risk.
- 1 Orphan-DELETE (user `9e0edfed`): keine collateral rows (alle Activity-Tabellen = 0 rows fuer diesen user).
- Test-Suite: INV-16 + INV-17 ergaenzen sich, kein Konflikt.
- Keine RPC-/Service-Aenderung noetig (FK ist transparent).

## Stages
- SPEC — dieses File (aktuell)
- IMPACT — oben inline dokumentiert (kompakt, keine separate File noetig — alle Consumer/Side-Effects hier enthalten)
- BUILD — Migration-File + INV-17-Test schreiben
- PROVE — migration apply, before/after snapshots, vitest run
- LOG — Eintrag + Commit, ggf. common-errors.md update ("wallets hatte kein FK — jetzt behoben")
