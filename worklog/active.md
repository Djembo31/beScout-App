# Active Slice

```
status: idle
slice: 463
title: D-36 — Stats-Siblings Platform-Admin-Guard auf platform_admins — DONE
size: XS
type: Migration (Security/Konsistenz, §3)
stage: LOG (done)
spec: worklog/specs/463-d36-sibling-platform-admin-guard.md
impact: skipped (0 TS-Consumer-Change, RPC-intern 1-Zeilen-Guard-Swap)
proof: worklog/proofs/463-d36-sibling-guard.txt
review: worklog/reviews/463-review.md (CONCERNS = Scope-Out → D-37; Slice mergeable)
```

## Letzter Slice DONE
463 (D-36) — rpc_get_club_trading_fees + fan_stats auf platform_admins, toter Platform-Override repariert, live. Reviewer-Catch → D-37 (3 SOLE-gate top_role-RPCs, Money/Minting, priorisiert).

## Offen (TEIL B, CEO-Wahl) — nach 463
- **🔴 D-37 (PRIORISIERT, §3):** 3 RPCs mit `top_role='Admin'` SOLE-gate = potenziell tot — `grant_founding_pass` (MONEY), `admin_grant_wildcards` (MINTING), `cancel_event_entries`. Erst verifizieren ob live tot (top_role='Admin'=0 global), dann auf `platform_admins`.
- **W0-Rest:** 2 Recon-RPCs admin-only · anon-REVOKE-Hygiene-Batch · 81 permissive Policies + 26 unused + 51 FK-Index. · **W5** Konsistenz (D-23/24/25/26). · **Dead-GC-Rest** D-14/15/16 (Money/CEO). · **INV-19/32/33** P2 (1 XS-Slice). · K6/K7 (TEIL-A LOW).
