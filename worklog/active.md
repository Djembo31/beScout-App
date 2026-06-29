# Active Slice

```
status: idle
slice: 460
title: INV-31 Security-Fix — REVOKE no_guard SECDEF-RPCs (calculate_fan_rank + refund_wildcards_on_leave) — DONE
size: XS
type: Migration (Security, §3)
stage: LOG (done)
spec: worklog/specs/460-inv31-secdef-revoke.md
impact: skipped (reines Grant-REVOKE, 0 Code-Consumer, kein Schema/Service/Type-Change)
proof: worklog/proofs/460-inv31-revoke.txt
review: worklog/reviews/460-review.md (PASS)
```

## Plan (CEO-approved Anil 2026-06-29 — „INV-31 jetzt, REVOKE-only", §3)
REVOKE EXECUTE FROM authenticated, anon, PUBLIC auf `calculate_fan_rank(uuid,uuid)` + `refund_wildcards_on_leave(uuid,uuid)`. Beide no_guard SECDEF, kein legitimer direkter authenticated-Caller (Cron+Batch+Trigger = service_role/Owner-Kontext; Client-Service tot; refund = toter Orphan). Schließt Fan-Rank-Info-Leak + Wildcard-Self-Farm, grünt INV-31. Kein Body-Rewrite (null PATCH-AUDIT-Risiko).

## Letzter Slice DONE
459 (INV-XS Doppel-Fix) — db-invariants 6→4 failed (INV-18+22 grün), tsc 0, self-review PASS.

## Offen (TEIL B, CEO-Wahl) — nach 460
- **W0-Rest** DB-Security (27 anon-SECDEF + D-12 DROP + audit-RPC-REVOKEs + Hygiene-Batch). · **W5** Konsistenz-Batch (D-23/24/25/26). · **Dead-GC-Rest** D-14/15/16 (Money/CEO). · **Rest-INV** INV-19/32/33 (P2 Test-Ehrlichkeit/Seed). · K6/K7 (TEIL-A LOW).
