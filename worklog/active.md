# Active Slice

```
status: in-progress
slice: 181e2
stage: PROVE
spec: worklog/specs/181e-trading-modal-migration.md
impact: skipped (mechanical-pattern, 42x validated in 181/b/c/d/e1, Money-Path UI only, no RPC/DB change)
proof: worklog/proofs/181e2-tsc-vitest-bundle.txt
review: worklog/reviews/181e2-review.md
```

## Ziel

4 Player-Detail-Trading-Modals von altem `Modal` auf Radix-`Dialog` migrieren (Drop-in-Pattern).

## Files

1. `src/components/trading/SellModalCore.tsx`
2. `src/components/player/detail/BuyModal.tsx`
3. `src/components/player/detail/OfferModal.tsx`
4. `src/components/player/detail/LimitOrderModal.tsx`

## Zuletzt

- **Slice 181e1** (2026-04-24) — Modal→Dialog Marktplatz/Orderbook (4 Files, 6 Sites) (M, PASS).
- **Slice 181d** (2026-04-24) — Modal→Dialog Fantasy/Gamification (12 Files) (L, PASS).
- **Slice 181c** (2026-04-24) — Modal→Dialog Community/Help (13 Files) (L, PASS).
