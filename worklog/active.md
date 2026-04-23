# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
review: —
```

## Zuletzt (Session 2026-04-23)

- **Slice 158** — KaderSellModal Ferrari. PASS 0 Findings. 13+39 Tests grün. Commit pending.
- **Slice 157** — useOffersState Ferrari. Commit `af1c16c0`.
- **Slice 156** — Event+Lineup Ferrari + Migration. Commit `93f51274`.
- **Slice 153b** — usePlayerTrading Ferrari. Commit `565e2c1b`.
- **Slice 153a** — trading.ts Ferrari. Commit `9d417e68`.

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | ✅ Komplett (151a-d + 151c.2) |
| Phase 1.5 ClubProvider-RESET | ✅ Komplett (151b-RESET) |
| Phase 2 Money-Cleanup | ✅ Komplett (152a-d) |
| **Phase 3 UX-Hotspots** | ✅ **Komplett** (153 ✅, 156 ✅, 157 ✅, **158 ✅**) |
| Phase 4 Admin-Tier-1 + Batch-Tier-2 | pending |

## Tier-1 Money-Path Status (aus 150-mutation-audit.md)

| File | Slice | Status |
|------|-------|--------|
| MembershipSection | 151c/c.2 | ✅ |
| BuyModal (usePlayerTrading) | 153b | ✅ |
| usePlayerTrading | 153b | ✅ |
| trading.ts | 153a | ✅ |
| useEventActions | 156 | ✅ |
| useOffersState | 157 | ✅ |
| **KaderSellModal** | **158** | **✅** |
| AdminWithdrawalTab | — | 🔴 offen (Admin-scope) |
| AdminFoundingPassesTab | — | 🔴 offen (Kill-Switch) |

**7/9 Tier-1 done.** Nur noch Admin-scope offen.

## Nahtlos-Naechste-Session

**Slice 159 Kandidaten:**
1. **Batch Tier-2 Data-Integrity** (useClubActions toggleFollowClub + ReportModal + PostReplies + FanWishModal + CreatePredictionModal) — ~3h. Data-Integrity-Hotspots, user-reported Follow-Button-Bug-Ursprung (Slice 149).
2. **Admin-Tier-1** (AdminWithdrawalTab + AdminFoundingPassesTab) — Kill-Switch-scope, admin-only. ~2h.
3. **Codification Slice 160** — useQueryClient-Konvention + Ferrari-Blueprint in CLAUDE.md-Rule + memory/patterns.md als Pattern. Knowledge-Capture nach 5 Ferrari-Slices.

CEO-Approval beim Start von 159.

## Backlog

- Aus 157 Review: `showError(err)` vs `showError(err.message || err)` Codebase-Audit
- Aus 157 Review: offer.find() pre-compute als mutation-variable
- Aus 158 Review: "parent-callback i18n-resolve; child-Modal setError(err.message)" als positive-pattern in memory/patterns.md
