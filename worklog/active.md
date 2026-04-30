# Active Slice

```
status: active
slice: 268
stage: LOG
spec: worklog/specs/268-cold-start-cache-mirror.md
impact: skipped (additiv 7 Files, kein DB/RPC, kein Cross-Domain)
proof: worklog/proofs/268-verify.txt
review: worklog/reviews/268-review.md (PASS-with-CONCERN inline-geheilt → PASS)
```

## Slice 268 — Cold-Start Cache-Mirror Wallet+Tickets (Slice-265-done-right)

**Spec-Reviewer-Verdict:** APPROVED-WITH-MINOR. 3 MINORs inline eingearbeitet:
- AC-09 BuyModal-Freshness-Intact-Test (Money-Path)
- AC-04 SIGNED_OUT clearCachedAllSlots synchron-Pflicht
- Edge-Cases #11 + #12 (SIGNED_OUT→SIGNED_IN same frame, Hook unmount mid-fetch)

**Stage-Chain:** SPEC ✅ → IMPACT skipped → REVIEWER-vor-BUILD APPROVED-WITH-MINOR ✅ → BUILD (now) → REVIEWER POST-BUILD → PROVE (vitest + Anil-Live-Verify) → LOG.

**Slice-265 Anti-Patterns die in Spec verboten sind:**
- KEIN `initialData`+`initialDataUpdatedAt:0` (markiert als fresh)
- KEIN single-slot localStorage `bs_wallet` (UID-keyed pflicht)
- KEIN Touch von TopBar.tsx oder (app)/layout.tsx
- KEIN `staleTime > 0` (refetch muss immer laufen)
- KEIN useState-Init-Read von localStorage

**Pre-Mortem-Hauptrisiko:** User-Switch-Race (Reihenfolge clearCachedAllSlots VOR setUser pflicht). AC-03 testet das exakt.
