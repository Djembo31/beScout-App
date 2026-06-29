# Active Slice

```
status: idle
slice: 465
title: D-37b — top_role='Admin'-Familie vollständig schließen — DONE
size: S
type: Migration (Security/Konsistenz, §3)
stage: LOG (done)
spec: worklog/specs/465-d37b-top-role-family-close.md
impact: skipped (0 TS-Consumer-Change, RPC-intern Guard-Swap)
proof: worklog/proofs/465-d37b-family-close.txt
review: worklog/reviews/465-review.md (PASS)
```

## Letzter Slice DONE
465 (D-37b) — get_sponsor_stats_summary + set_club_fan_rank_thresholds auf platform_admins, top_role='Admin'-Familie KOMPLETT eliminiert (family_remaining=0, 7 RPCs), Reviewer PASS, live.

## W0-Security-Faden Stand (460-465)
INV-31 (460) · D-12 (461) · D-35 (462) · D-36 (463) · D-37 (464) · D-37b (465) = ALLE platform-admin/top_role-Drift + anon-PII-Exposure geschlossen. top_role='Admin'-Familie restlos.

## Offen (TEIL B) — nächste autonome Kandidaten
- **W0-Rest:** 2 Security-Map-Recon-RPCs (`get_security_definer_user_param_audit`+`get_rls_policy_matrix`, anon+auth → admin-only; **⚠️ vorher db-invariants-Test-Rolle prüfen, sonst bricht INV-31/32**) · anon-REVOKE-Hygiene-Batch · 87 search_path_mutable · 81 permissive Policies + 26 unused + 51 FK-Index.
- **D-38** sponsorStats.ts Silent-Fail (CTO). · **W5** Konsistenz (D-23/24/25/26). · **Dead-GC-Rest** D-14/15/16 (Money/CEO). · **INV-19/32/33** P2. · K6/K7 (LOW).
