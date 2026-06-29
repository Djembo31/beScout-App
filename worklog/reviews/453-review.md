# Slice 453 Review — Cold-Context Reviewer-Agent

**Verdict: CONCERNS** (sichtbarer Diff korrekt + mergeable; „genau 2"-Completeness-Claim muss den 3. live-only Score-Syncer klären, BEVOR D-01 als erledigt gilt / vor CEO-Apply.)

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | HIGH (verification) | `admin_import_gameweek_stats` (live-only, wired `footballData.ts:641` ← `scoring.admin.ts:156`) | 3. RPC die `scores_synced` returnt ⇒ schreibt player_gameweek_scores. „von-allem-N=genau 2" beruht auf einem ON-CONFLICT-ILIKE-Scan, der einen 3. live-only Writer mit abweichendem/fehlendem Conflict-Muster verfehlen kann. Comments behaupten Delegation an sync_fixture_scores (=safe via 419), Body read-only unverifiziert. Falls inline `ON CONFLICT (player_id, gameweek)` → dieselbe 42P10-Landmine auf dem Admin-Import-Pfad. | Vor Apply: **Writer**-Enumeration statt Conflict-Grep: `SELECT proname, prosrc ILIKE '%fixture_id)%' AS fixture_bound, ... FROM pg_proc WHERE prokind='f' AND prosrc ILIKE '%INSERT INTO player_gameweek_scores%'`. Jede Row fixture_bound=t (inkl. admin_import_gameweek_stats ODER delegiert/absent). Output in Proof. |
| 2 | MED (D87) | migration `cron_process_gameweek` Steps 1-3 + RETURN | PATCH-AUDIT byte-Identität (AC4) read-only NICHT unabhängig verifizierbar (live-only, kein File-Baseline). Interne Kohärenz ok. | before/after `pg_get_functiondef`-Diff im Proof behalten = AC4-Evidenz (S156). |
| 3 | LOW | beide INSERTs ON CONFLICT (player_id,fixture_id) | `21000` nur bei Dup (player_id,fixture_id) in fixture_player_stats. Gleiche Exposure wie live-bewiesenes sync_fixture_scores; cron übergibt dedupedStats; GW26-Proof idempotent. Kein neues Risiko. | Optional: `UNIQUE(fixture_id,player_id)` auf fixture_player_stats. |

## Belege (positiv bestätigt)
- **Fix-Korrektheit (Q2):** beide INSERTs = char-genau sync_fixture_scores (419-Migration Z.76-91): Spalten/SELECT/JOIN/WHERE inkl. `AND fps.player_id IS NOT NULL`/ON CONFLICT/DO UPDATE. score-CASE unverändert (kein Money-Formel-Change). admin_resync ergänzt korrekt den fehlenden player_id-Guard.
- **SECDEF/search_path/Grants (Q3):** beide erhalten; CREATE OR REPLACE bewahrt ACL (AR-44/S368c) — kein REVOKE/GRANT nötig, korrekt.
- **Caller-Impact (Q5):** genau die 2 erwarteten Caller (gameweek-sync:1326 + backfill-ratings:208), Signaturen/Return unverändert. `db-invariants.test.ts` RPC-Shape-Map listet keine der beiden gepatchten Fns (nur admin_import_gameweek_stats + sync_fixture_scores, beide hier nicht geändert) → kein Test-Snapshot-Drift.
- **Schnitt-Regel §0:** 3-Wege-Dup korrekt als Residual W2 getrackt (nicht still gelassen). Scope-out sync_fixture_scores richtig.
- **PROVE-Rigor:** Real-DB BEFORE 42P10 + AFTER force-rollback idempotent 2805/2805 null_fk=0. D87 honoriert.

## Learning (→ errors-db.md Kandidat)
UNIQUE/Kardinalitäts-Flip → audit ALLE **Writer**, nicht nur die offensichtliche RPC + Reader. Completeness für live-only Funktionen MUSS `INSERT INTO <table>` pg_proc-Enumeration sein, NICHT formatierungs-sensitiver `ON CONFLICT (...)`-ILIKE-Grep — und NIE `supabase/migrations/`-File-Grep (live-only Fns unsichtbar). S419-Writer-Seiten-Spiegel; 453 near-miss = worked example.

time-spent: 18 min
