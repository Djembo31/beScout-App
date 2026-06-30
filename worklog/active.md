# Active Slice

```
status: idle
slice: 470
title: Perf — 49 FK Covering-Indizes — DONE (Perf-Lane abgeschlossen)
size: S
type: Migration (Perf)
stage: LOG (done)
spec: worklog/specs/470-fk-indexes.md
impact: skipped
proof: worklog/proofs/470-fk-indexes.txt
review: worklog/reviews/470-review.md (self-review PASS)
```

## Letzter Slice DONE
470 (49 FK Covering-Indizes, additiv, unindexed_foreign_keys 49→0) — live (5cdeb501).

## Perf-Lane (Policies/Index) — ABGESCHLOSSEN
✅ 470 FK-Indizes (der saubere Win). 🅿️ GEPARKT-mit-Gründen: auth_rls_initplan (71/155, Scope-Ambiguität + security-kritische Fläche → dedizierter Slice) · unused_index (idx_scan=0 unzuverlässig in Low-Traffic-Pilot) · multiple_permissive_policies (Access-Merge-Urteil).

## Offen (TEIL B) — nächste CEO-Wahl
- **AC-05 Visual D-23** post-Deploy. · **auth_rls_initplan** (höchster Perf-Wert, dedizierter careful Slice — Advisor-exakte 71 + Access-Spot-Check). · **W5-Rest** D-24 Wording-Compliance (CEO) · D-25 · D-26. · **Dead-GC** D-14/15/16 (Money/CEO). · **INV-19/32/33** P2. · K6/K7 (LOW).
