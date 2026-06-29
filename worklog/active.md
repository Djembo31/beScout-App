# Active Slice

```
status: idle
slice: 457
title: D-11 — Dead-Scoring-Modell GC (bescout_scores + score_events + award_score_points) — DONE, live applied
size: S
type: Migration
stage: LOG (done)
migration: supabase/migrations/20260629190000_slice_457_dead_scoring_gc.sql
proof: worklog/proofs/457-dead-scoring-gc.txt
review: worklog/reviews/457-review.md
```

## Letzter Slice DONE
457 (D-11 Dead-Scoring-GC) live applied + bewiesen (Reviewer CONCERNS→Bookkeeping behoben). Disease-Register D-11 → geheilt; D-17 final bewusste-zwei (Path-2 CEO-verworfen).

## Offen (TEIL B, CEO-Wahl)
- **W0** DB-Security-Batch (28 anon-SECDEF + die INV-31-no_guard-RPCs `calculate_fan_rank`/`refund_wildcards_on_leave` — Triage: D-12/Audit-RPCs/Hygiene). · **W5** Konsistenz-Batch (D-23 2 Geld-Formatter · D-24 Wording · D-25 Auth-i18n · D-26 stale Club-Logos). · **K6/K7** (TEIL-A LOW).
- **Pre-existing Live-DB-Invariant-Schulden** (beim 457-vitest aufgefallen, NICHT Scoring): INV-18 events-Snapshot-Drift · INV-22 success_fee fehlt in ALL_CREDIT_TX_TYPES · INV-33 Dev-Account-wallet-drift. Eigene XS-Slices.
