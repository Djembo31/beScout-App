# Player Detail Refactoring — Design

**Date:** 2026-03-27
**Scope:** Orchestrator slim-down (Option 1)
**Approach:** Extract `usePlayerDetailData` hook from PlayerContent.tsx

## Problem

PlayerContent.tsx is 427 LOC. The render section (L240-427) is already clean orchestration.
The problem is ~160 lines of data setup before the render:
- 20 React Query hooks inline (L87-110)
- 10 null-coalesce defaults (L112-125)
- profileMap side-effect (L159-170)
- playerWithOwnership transformation (L174-191)

## Solution: `usePlayerDetailData` Hook

### What moves into the hook
- All 20 React Query hooks
- All null-coalesce defaults
- `dbToPlayer()` mapping + `player` memo
- `playerWithOwnership` transformation (cents to bsd conversion)
- `profileMap` side-effect (useEffect + getProfilesByIds)
- Loading/Error states

### What stays in PlayerContent
- `tab` state (drives query `enabled` gating — must be passed to hook)
- `usePlayerTrading`, `usePlayerCommunity`, `usePriceAlerts` (take derived data as input)
- `isRestrictedAdmin` + `guardedBuy/Sell` (needs clubAdmin from AuthProvider)
- UI state: `isWatchlisted`, `showLimitOrder`, `showStrip`
- IntersectionObserver for StickyStrip
- All JSX rendering

### Hook signature
```ts
function usePlayerDetailData(playerId: string, userId: string | undefined, tab: Tab) {
  return {
    player, playerWithOwnership, dbPlayer,
    dpcAvailable, holdingQty, holderCount, lockedScMap,
    allSellOrders, openBids, trades, tradesLoading,
    activeIpo, userIpoPurchased, masteryData,
    matchTimelineData, matchTimelineLoading, liquidationEvent,
    gwScores, allPlayersForPercentile,
    playerResearch, playerPosts,
    profileMap, pbtTreasury,
    isLoading, isError, refetch,
  };
}
```

### File location
`src/components/player/detail/hooks/usePlayerDetailData.ts`

## Expected Result
- **PlayerContent**: 427 → ~250 LOC
- **usePlayerDetailData**: ~180 LOC (new hook)
- No bridges needed — no file moves, no external import changes
- No breaking changes — purely internal refactoring

## Out of Scope
- No file moves to `features/player/`
- No store refactoring (no store exists)
- No sub-component changes
- No UI changes
- `components/player/index.tsx` (shared utils) stays untouched
