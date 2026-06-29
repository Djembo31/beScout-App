# Active Slice

```
status: idle
slice: 466
title: W0 — Security-Map-Recon-RPCs admin-only (REVOKE anon+auth) — DONE
size: XS
type: Migration (Security, §3)
stage: LOG (done)
spec: worklog/specs/466-w0-recon-rpcs-admin-only.md
impact: skipped (reines Grant-REVOKE, 0 App-Consumer)
proof: worklog/proofs/466-recon-rpcs.txt
review: worklog/reviews/466-review.md (self-review PASS)
```

## Plan (CEO autonom-Go Anil 2026-06-30 „mach autonom weiter", §3)
2 SECDEF-Audit-RPCs (get_security_definer_user_param_audit + get_rls_policy_matrix) sind anon+auth-granted → leaken die Security-Landkarte (welche RPC ungeguarded, welche RLS-Policies). Konsumenten = NUR db-invariants-Test (service_role). REVOKE anon+authenticated → admin-only. Test unberührt (service_role behält).

## Letzter Slice DONE
466 (W0-Recon-RPCs) — get_security_definer_user_param_audit + get_rls_policy_matrix REVOKE anon+auth (admin-only), live.

## W0-Security-Faden Stand (460-466)
INV-31 (460) · D-12 (461) · D-35 (462) · D-36/37/37b (463-465, top_role-Familie restlos) · Recon-RPCs (466). Großer Security-Block zu.

## Offen (TEIL B) — nächste autonome Kandidaten
- **W0-Rest:** anon-REVOKE-Hygiene-Batch (Trigger + Kalkulatoren + Leaderboard-RPCs, ⚠️ Leaderboard-anon-Prüfung) · 87 search_path_mutable · 81 permissive Policies + 26 unused + 51 FK-Index. · **D-38** sponsorStats Silent-Fail. · **W5** (D-23/24/25/26). · **Dead-GC** D-14/15/16 (Money/CEO). · **INV-19/32/33** P2.
