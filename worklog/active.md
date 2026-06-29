# Active Slice

```
status: idle
slice: 464
title: D-37 — SOLE-gate top_role-RPCs auf platform_admins — DONE
size: S
type: Migration (Security/Money, §3)
stage: LOG (done)
spec: worklog/specs/464-d37-soletop-role-platform-admins.md
impact: skipped (0 TS-Consumer-Change, RPC-intern Guard-Swap)
proof: worklog/proofs/464-d37-soletop-role.txt
review: worklog/reviews/464-review.md (PASS)
```

## Letzter Slice DONE
464 (D-37) — grant_founding_pass + admin_grant_wildcards + cancel_event_entries von totem top_role='Admin' auf platform_admins, tote Admin-Money/Minting-Capability restauriert, Reviewer PASS, live.

## Nächster Slice (autonom geplant)
**465 (D-37b)** — Rest der top_role-Familie: `get_sponsor_stats_summary` (SOLE-gate read-only) + `set_club_fan_rank_thresholds` (Sekundär-Branch) auf platform_admins → schließt die `top_role='Admin'`-Dead-Source-Familie vollständig. Kein Money (read/config). §3.

## Offen (TEIL B) — danach
- **W0-Rest:** 2 Recon-RPCs admin-only · anon-REVOKE-Hygiene · 87 search_path_mutable · 81 permissive Policies + 26 unused + 51 FK-Index. · **W5** Konsistenz (D-23/24/25/26). · **Dead-GC-Rest** D-14/15/16 (Money/CEO). · **INV-19/32/33** P2. · K6/K7 (LOW).
