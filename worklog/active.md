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

- **Slice 157** (2026-04-23) — useOffersState Ferrari. PASS mit 5 NITs. 25+147 Tests grün. Commit pending.
- **Slice 156** (2026-04-23) — Event+Lineup Ferrari + P2.3 Migration. FAIL v1 → PASS v2. Commit `93f51274`.
- **Slice 153b** (2026-04-23) — usePlayerTrading Ferrari. Commit `565e2c1b`.
- **Slice 153a** (2026-04-23) — trading.ts Ferrari. Commit `9d417e68`.

## Phase-Status

| Phase | Status |
|-------|--------|
| Phase 1 Mutation-Hardening | Komplett (151a-d + 151c.2) |
| Phase 1.5 ClubProvider-RESET | Komplett (151b-RESET) |
| Phase 2 Money-Cleanup | Komplett (152a-d) |
| **Phase 3 UX-Hotspots** | In progress (153 ✅, 156 ✅, **157 ✅**, 158 pending) |
| Phase 4 Rest + Norm | Spaeter (160 Codification) |

## Tier-1 Money-Path Status (aus 150-mutation-audit.md)

| File | Slice | Status |
|------|-------|--------|
| MembershipSection (subscribe) | 151c/c.2 | ✅ |
| BuyModal (via usePlayerTrading) | 153b | ✅ |
| usePlayerTrading (7 handler) | 153b | ✅ |
| trading.ts (4 mutation hooks) | 153a | ✅ |
| useEventActions (join/leave/submitLineup) | 156 | ✅ |
| **useOffersState (accept/reject/counter/cancel)** | **157** | **✅** |
| KaderSellModal | — | 🔴 offen |
| AdminWithdrawalTab | — | 🔴 offen (Admin-scope) |
| AdminFoundingPassesTab | — | 🔴 offen (Kill-Switch-scope) |

## Nahtlos-Naechste-Session

**Slice 158 Kandidaten:**
1. **KaderSellModal** — Tier-1 Money, einzelner Modal, ~1-2h.
2. **Batch Tier-2 Data-Integrity** (useClubActions toggleFollowClub + ReportModal + PostReplies + FanWishModal + CreatePredictionModal) — 5 Files, ~3h.
3. **Admin-Tier-1** (AdminWithdrawalTab + AdminFoundingPassesTab) — Kill-Switch-scope, admin-only.

CEO-Approval-Anfrage beim Start von 158.

## Backlog (NITs aus 157 Review)

- Comment-Refinement useOffersState.ts:127-128 (reject-invalidate-reason)
- Audit `showError(err.message || err)` → `showError(err)` über alle Call-Sites
- pre-compute `playerId` aus offer als mutation-variable (robust gegen Tab-switch mid-flight)
- Ternary-style `actionId`-Derivation analog 156 Blueprint
