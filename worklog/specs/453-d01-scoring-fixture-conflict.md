# Slice 453 — D-01: Scoring-Funktionen aufs Fixture-Modell migrieren (42P10-Landmine)

**Slice-Type:** Migration · **Größe:** S · **Scope:** Money/§3 (Scoring-Pfad → Rewards) — selbst, Reviewer-Pflicht, CEO-Apply-Approval.

## 1. Problem-Statement (Evidence: Live-DB `skzjfhvgccaeplydsunz`, D87)
Disease-Register **D-01** (🔴 HIGH): D113 (Slice 419) machte `player_gameweek_scores` fixture-gebunden, ließ aber 2 von 3 Schreib-Pfaden auf dem alten GW-Modell.
**Live verifiziert (pg_get_functiondef):**
- `player_gameweek_scores` UNIQUE = `(player_id, fixture_id)` (`player_gameweek_scores_player_fixture_key`). **Kein `UNIQUE(player_id, gameweek)`** (nur non-unique Indexe).
- Spalten `fixture_id` + `league_id` = **NOT NULL**.
- `cron_process_gameweek` (Step 4) + `admin_resync_gw_scores` schreiben `INSERT ... (player_id, gameweek, score) ... ON CONFLICT (player_id, gameweek)`.
- → **Doppel-Crash beim 1. echten Spieltag:** (a) `42P10` (ON CONFLICT-Target existiert nicht, plan-time) + (b) NOT-NULL-Violation auf `fixture_id`/`league_id`. Off-Season maskiert (keine finished Fixtures jetzt).
- **Referenz (korrekt, live):** `sync_fixture_scores` schreibt `(player_id, fixture_id, league_id, gameweek, score) ... ON CONFLICT (player_id, fixture_id) DO UPDATE SET score, league_id, gameweek`.
- **von-allem-N (verifiziert):** genau 2 Funktionen stale (`stale_gw_conflict=true`), kein versteckter 3. Aber: **3 Pfade dupliziern denselben INSERT** (cron Step 4 / admin_resync / sync_fixture_scores) = Forward-Drift-Vektor (dieser Bug ist der Beweis).

## 2. Lösungs-Design
Die 2 kaputten INSERTs **exakt auf `sync_fixture_scores` spiegeln**: Spalten + SELECT um `fps.fixture_id` + `f.league_id` erweitern, `ON CONFLICT (player_id, fixture_id) DO UPDATE SET score = EXCLUDED.score, league_id = EXCLUDED.league_id, gameweek = EXCLUDED.gameweek`. `admin_resync` zusätzlich `AND fps.player_id IS NOT NULL` (fehlt; verhindert NOT-NULL-Violation, wie sync). **Alles andere byte-treu** (cron Steps 1-3, score-CASE, SECDEF, search_path, Grants) — PATCH-AUDIT.

## 3. Betroffene Files
- Migration `supabase/migrations/<ts>_fix_scoring_fixture_conflict.sql` (CREATE OR REPLACE der 2 Fns).
- Kein Service/FE-Change (Caller `gameweek-sync/route.ts:1326` + `backfill-ratings/route.ts:208` übergeben `p_gameweek` unverändert; Return-Shape unverändert).

## 4. Code-Reading (Pflicht VOR Impl — D87 erledigt)
1. ✅ Live `pg_get_functiondef` `cron_process_gameweek` + `admin_resync_gw_scores` + `sync_fixture_scores` (gezogen).
2. ✅ `player_gameweek_scores` Constraints + Nullability (UNIQUE fixture, NOT NULL fixture/league).
3. ✅ Trigger auf `player_gameweek_scores` = KEINE (kein Auto-Mint → reiner Daten-Integritäts-Fix, kein Wallet-Touch).
4. ✅ Caller-Grep (`src/`): cron + backfill-ratings + fixtures.ts; Return-Shape-Keys unverändert.

## 5. Pattern-References
- D113 / errors-db S419 (fixture-bound Scoring) · §0 Schnitt-Regel (3-Wege-Dup → Residual tracken) · D87 (Live-functiondef) · PATCH-AUDIT byte-treu (Money-SECDEF).

## 6. Acceptance Criteria
- AC1: `cron_process_gameweek` aufrufbar gegen GW mit simulated/finished Fixtures **ohne 42P10/NOT-NULL** (force-rollback).
- AC2: `admin_resync_gw_scores` desgleichen.
- AC3: Upsert korrekt — Re-Run idempotent (gleiche row-count, score überschrieben, keine Dup-Rows).
- AC4: PATCH-AUDIT — Rest beider Fns byte-identisch zur Live-Baseline (nur Step-4/INSERT-Block geändert); SECDEF + search_path + Grants erhalten.
- AC5: `sync_fixture_scores` UNANGETASTET (die korrekte Referenz nicht anfassen).
- AC6: Caller-Return-Shape unverändert (`scores_synced`/`synced_count` Keys bleiben).

## 7. Edge Cases
| Fall | Verhalten |
|------|-----------|
| GW ohne finished Fixtures | 0 Rows, kein Crash (WHERE filtert) |
| fps.player_id NULL | gefiltert (`AND fps.player_id IS NOT NULL`) → kein NOT-NULL-Fail |
| Spieler in 2 Fixtures (Doppel-GW) | 2 Rows (je fixture) — korrekt fixture-bound, kein Konflikt |
| Re-Run (idempotent) | ON CONFLICT (player_id,fixture_id) DO UPDATE → score überschrieben |
| league_id einer Fixture NULL | Fixtures.league_id ist die Quelle; falls NULL → NOT-NULL-Fail (gleiche Semantik wie sync_fixture_scores, Edge identisch) |

## 8. Self-Verification
Force-rollback Smoke (BEGIN; CREATE OR REPLACE beide; SELECT call gg. Test-GW; assert no-error + idempotent; ROLLBACK). Post-Apply: `pg_get_functiondef` Re-Pull → `ON CONFLICT (player_id, fixture_id)` bestätigt.

## 9. Open-Questions
- **CEO-Apply-Approval** (Money/SECDEF-Migration): Fix + Proof zeigen, dann live apply. (Anil hat D-01-Arbeit gewählt; Apply ist der irreversible Schritt.)
- Autonom: score-CASE + DO-UPDATE-Spalten exakt wie sync_fixture_scores (kein Spielraum).

## 10. Proof-Plan
`worklog/proofs/453-scoring-fixture-conflict.txt`: (a) force-rollback Smoke-Output (vorher 42P10 → nachher success + idempotent), (b) Post-Apply `pg_get_functiondef`-Diff (ON CONFLICT fixture).

## 11. Scope-Out
- **3-Wege-Scoring-Write-Konsolidierung** (1 Helper statt 3× INSERT) → Residual W2 Score-SSOT (dup-registry). Grund: `sync_fixture_scores` (korrekt, verdrahtet) nicht anfassen = Caution; Helper-Extraktion riskiert den guten Pfad.
- `admin_resync_gw_scores` SECDEF ohne auth-Guard → W0 Security-Review (separat).
- Keine Service/FE/i18n-Änderung.

## 12. Stage-Chain
SPEC → IMPACT (skipped: Caller grep-verifiziert, Return-Shape stabil) → BUILD → PROVE (force-rollback) → REVIEW (reviewer) → CEO-Apply → LOG.

## 13. Pre-Mortem (kurz)
- „Mirror kopiert Bug" → sync_fixture_scores ist live-verifiziert korrekt + idempotent-getestet.
- „PATCH-AUDIT übersieht Drift" → vor/nach pg_get_functiondef-Vergleich, nur INSERT-Block delta.
- „league_id NULL bei echten Fixtures" → gleiche Semantik wie der bereits-laufende sync_fixture_scores (kein neues Risiko).
