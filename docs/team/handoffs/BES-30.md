# BES-30: Relax aggressive staleTime on Player Detail queries
**Agent:** SeniorEngineer
**Date:** 2026-04-01
**Status:** ready-for-qa

## Changes
- `src/lib/queries/trades.ts` — Added `FIVE_MIN` constant; `usePlayerTrades` staleTime: ONE_MIN → FIVE_MIN (trade history rarely changes mid-session)
- `src/features/fantasy/queries/events.ts` — Added `TWO_MIN` constant; `useHoldingLocks` staleTime: ONE_MIN → TWO_MIN
- `src/components/player/detail/hooks/usePlayerDetailData.ts` — Wrapped profile map `getProfilesByIds` call in `setTimeout(fn, 2000)` with cleanup; prevents N+1 profile fetches when trade data updates rapidly

## Test Checklist
- [x] tsc --noEmit: 0 errors
- [x] Pre-existing test failures confirmed unrelated (BuyModal/SellModal lazy-load pre-existing)
- [x] grep confirms FIVE_MIN on usePlayerTrades

## Risks
- 2s debounce delay means profileMap is empty for first 2 seconds — acceptable (profiles are display-only, not functional)
