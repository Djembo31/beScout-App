# Active Slice

```
status: idle
slice: 454
title: D-17 — Ranking-SSOT (user_stats-Scores = Projektion von scout_scores) — DONE (live applied)
size: M
type: Migration
stage: LOG (DONE)
spec: worklog/specs/454-d17-ranking-ssot.md
proof: worklog/proofs/454-ranking-ssot.txt
review: worklog/reviews/454-review.md (CONCERNS → Finding#1 Level-Kaskade gefixt+bewiesen)
```

## Ergebnis (D-17 geheilt, live)
Money-nah/§3. scout_scores (kanonisch, geld-gekoppelt) ↔ user_stats berechneten dieselben Dims mit verschiedenen Formeln → 70/70 divergent (manager 778 vs 418). CEO Anil „A": user_stats-Scores = kept-fresh Projektion.
- Spalten smallint→integer (Overflow-Edge); refresh_user_stats liest scout_scores (Rest byte-treu); Projektions-Trigger auf scout_scores; Backfill GEGUARDET gg. trg_sync_level. **scout_scores 0 Edits.**
- **Reviewer-Catch (HIGH):** Backfill hätte trg_sync_level 70× gefeuert → Level-Rescale + irreversible „Aufstieg!"-Notifs. Gefixt: DISABLE/ENABLE-Guard + profiles.level still rescaled (Guard-Proof notif_delta=0).
- Apply v1 FAIL (0A000 trg_sync_level depends on total_score) → v2 DROP/recreate Trigger um ALTER. Post-apply: divergence_live=0, integer, projection_trg propagiert live (778→788), level_inconsistent=0. vitest 79/79.

## Residual (getrackt → später)
Path 2 (Surfaces direkt auf scout_scores + user_stats-Score-Spalten droppen = physische SSOT) · D-11 (totes bescout_scores/award_score_points/score_events) · tier-Schwellen-Tuning · #2 rank-lag (self-heal, akzeptiert).

## Nächstes (TEIL B, CEO-Wahl)
D-02 Bench-Geld-Leak (M, Money) · W0 DB-Security · W2 Score-SSOT Path 2 · D-11 Dead-GC. K6/K7 (TEIL-A LOW) offen.
