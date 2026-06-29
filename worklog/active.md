# Active Slice

```
status: idle
slice: 453
title: D-01 — Scoring-Funktionen aufs Fixture-Modell migrieren (42P10-Landmine) — DONE (live applied)
size: S
type: Migration
stage: LOG (DONE)
spec: worklog/specs/453-d01-scoring-fixture-conflict.md
proof: worklog/proofs/453-scoring-fixture-conflict.txt
review: worklog/reviews/453-review.md (CONCERNS → Finding#1 via Writer-Enum aufgelöst, Finding#2 Proof-Diff, #3 LOW)
```

## Ergebnis (D-01 geheilt, live)
Money/§3. `cron_process_gameweek` Step 4 + `admin_resync_gw_scores` schrieben altes GW-Modell `ON CONFLICT (player_id, gameweek)` gegen die von 419 gedroppte UNIQUE → 42P10 + NOT-NULL beim 1. echten Spieltag. Beide auf die korrekte `sync_fixture_scores` gespiegelt (fixture-bound), Rest byte-treu.
- BEFORE live: `admin_resync_gw_scores(26)` → 42P10. AFTER force-rollback GW26: 2805 fresh/idempotent, 0 null-FK. Apply (CEO Anil) → post-apply pg_get_functiondef fixture_now=t/stale=f/secdef+search_path erhalten; `admin_resync_gw_scores(99)` → success/0. vitest 81/81.
- **Reviewer-Catch (wertvoll):** Writer-Enumeration (statt Conflict-Grep) bewies Completeness — genau 3 Writer, `admin_import_gameweek_stats` delegiert an sync_fixture_scores (safe).

## Residual (Schnitt-Regel §0, getrackt → dup-registry)
3-Wege-Scoring-Write-Duplikation (cron Step4 / admin_resync / sync_fixture_scores = identischer INSERT 3×) → W2 Score-SSOT (1 Helper). 419 heilte 1/3, 453 die 2 stale — alle 3 noch dupliziert.

## Nächstes (TEIL B, CEO-Wahl)
D-17 Ranking-Konsolidierung · D-02 Bench-Geld-Leak · W0 DB-Security · oder W2 Score-SSOT-Helper (Residual). K6/K7 (TEIL-A-Rest, LOW) weiter offen.
