# Active Slice

```
status: in-progress
slice: 181e1
stage: PROVE
spec: worklog/specs/181e-trading-modal-migration.md
impact: skipped (mechanical-pattern, 38x validated in 181b/c/d, Money-Path UI only, no RPC/DB change)
proof: worklog/proofs/181e1-tsc-vitest-bundle.txt
review: worklog/reviews/181e1-review.md
```

## Ziel

4 Marktplatz/Orderbook-Modals von altem `Modal` auf Radix-`Dialog` migrieren (Drop-in-Pattern wie 181b/c/d).

## Files

1. `src/features/market/components/shared/BuyConfirmModal.tsx`
2. `src/features/market/components/shared/BuyOrderModal.tsx`
3. `src/features/market/components/marktplatz/ClubVerkaufSection.tsx`
4. `src/features/market/components/portfolio/OffersTab.tsx`

## Zuletzt

- **Slice 181d** (2026-04-24) — Modal→Dialog Fantasy/Gamification (12 Files) (L, PASS).
- **Slice 181c** (2026-04-24) — Modal→Dialog Community/Help (13 Files) (L, PASS).
- **Slice 181b** (2026-04-24) — Modal→Dialog Admin (11 Files) (L, PASS).
