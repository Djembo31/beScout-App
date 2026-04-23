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

- **Slice 159** — Tier-2 Batch (ReportModal + PostReplies + FanWishModal) Ferrari. PASS nach 2 NIT-Fixes. 14+182 Tests grün. Commit pending.
- **Slice 158** — KaderSellModal Ferrari. Commit `29b2580a`.
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
| Phase 3 UX-Hotspots | ✅ Komplett (153 + 156 + 157 + 158) |
| **Phase 4 Tier-2 Data-Integrity** | **In progress (159 ✅, 3 Files done)** |
| Phase 5 Admin-Tier-1 | pending (WithdrawalTab + FoundingPassesTab) |
| Phase 6 Codification | pending (CLAUDE.md + memory/patterns.md) |

## Tier-1 Money-Path Status

**7/9 done** (151c/c.2 + 153a/b + 156 + 157 + 158). Offen: AdminWithdrawalTab + AdminFoundingPassesTab.

## Tier-2 Data-Integrity Status (aus 150-audit)

| File | Status |
|------|--------|
| useClubActions (toggleFollowClub) | ✅ 151b |
| **ReportModal** | **✅ 159** |
| **PostReplies** | **✅ 159** |
| **FanWishModal** | **✅ 159** |
| CreatePredictionModal | ✅ (nutzt bereits useCreatePrediction.mutateAsync, safe) |
| LeaguesSection | 🔴 offen |
| AirdropScoreCard | 🔴 offen |
| MissionBanner | 🔴 offen |
| (10× Admin-Space Files) | 🔴 offen (Phase 5) |

## Nahtlos-Naechste-Session

**Slice 160 Kandidaten:**
1. **Tier-2 Batch-Fortsetzung** (LeaguesSection + AirdropScoreCard + MissionBanner, 3 Files, ~2h).
2. **Admin-Tier-1** (AdminWithdrawalTab + AdminFoundingPassesTab, ~2h, Kill-Switch-scope).
3. **Codification** (CLAUDE.md-Rule + memory/patterns.md "Ferrari-Blueprint" als explizites Pattern — nach 6 Slices ist der Pattern stabil genug).
4. **Pre-existing Bug-Fix (aus 159 Review):** PostReplies Toggle-Vote `voteType=0` → RPC-constraint `IN (1,-1)`. Client muss same-vote-type für Toggle-Off senden.

CEO-Approval beim Start von 160.

## Backlog

- `showError(err)` vs `showError(err.message || err)` Codebase-Audit (aus 157 Review)
- useOffersState `offer.find()` pre-compute als mutation-variable (aus 157 Review)
- Toggle-Vote-Bug in PostReplies (aus 159 Review)
