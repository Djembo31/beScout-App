# Active Slice

```
status: idle
slice: 462
title: D-35 — get_club_dashboard_stats_v2 Admin-Guard + REVOKE anon — DONE
size: XS
type: Migration (Security, §3)
stage: LOG (done)
spec: worklog/specs/462-d35-dashboard-v2-admin-guard.md
impact: skipped (0 TS-Consumer-Change, RPC-intern Guard + Grant)
proof: worklog/proofs/462-d35-admin-guard.txt
review: worklog/reviews/462-review.md (PASS)
```

## Letzter Slice DONE
462 (D-35 v2 Admin-Guard) — get_club_dashboard_stats_v2 club_admin OR platform_admin Guard + REVOKE anon, Club-Finanz/Fan-PII-Exposure zu, Reviewer PASS, live. Sibling-top_role-Inkonsistenz → D-36.

## Offen (TEIL B, CEO-Wahl) — nach 462
- **W0-Rest:** **D-36** (2 Stats-Siblings `rpc_get_club_trading_fees`/`fan_stats` dead `top_role`-Branch → auf `platform_admins`, Reviewer „priorisieren") · 2 Recon-RPCs admin-only · anon-REVOKE-Hygiene-Batch · 81 permissive Policies + 26 unused + 51 FK-Index. · **W5** Konsistenz (D-23/24/25/26). · **Dead-GC-Rest** D-14/15/16 (Money/CEO). · **INV-19/32/33** P2 (1 XS-Slice). · K6/K7 (TEIL-A LOW).
