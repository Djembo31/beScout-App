# Active Slice

```
status: idle
slice: 461
title: D-12 Dead-RPC GC — DROP get_club_dashboard_stats(text) v1 — DONE
size: XS
type: Migration (Security/Dead-GC, §3)
stage: LOG (done)
spec: worklog/specs/461-d12-dashboard-stats-v1-drop.md
impact: skipped (0 Consumer, reiner DROP einer toten RPC)
proof: worklog/proofs/461-d12-drop.txt
review: worklog/reviews/461-review.md (PASS)
```

## Letzter Slice DONE
461 (D-12 Dead-RPC DROP) — get_club_dashboard_stats(text) v1 weg (toter v1-Pfad + by-name-Enumeration; v2-anon-Exposure bleibt → D-35), Reviewer PASS, live.

## Offen (TEIL B, CEO-Wahl) — nach 461
- **W0-Rest** (**D-35** v2-anon-Grant-Entscheid · audit-RPCs admin-only · anon-REVOKE-Hygiene-Batch · Policy/Index-Konsolidierung). · **W5** Konsistenz-Batch (D-23/24/25/26). · **Dead-GC-Rest** D-14/15/16 (Money/CEO). · **INV-19/32/33** P2 Test-Ehrlichkeit (1 XS-Slice). · K6/K7 (TEIL-A LOW).
