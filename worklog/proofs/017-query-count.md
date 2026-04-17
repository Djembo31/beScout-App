# 017 — Player Detail Query-Count Before/After

## Before Slice 017

Tab `'trading'` (default on deep-link to /player/[id]):

| # | Hook | Gate | Fires on t=0? |
|---|------|------|---------------|
| 1 | `useDbPlayerById(playerId)` | — | ✅ |
| 2 | `useHoldingQty(userId, playerId)` | `!!userId && !!playerId` | ✅ |
| 3 | `useHoldingLocks(userId)` | `!!userId` | ✅ |
| 4 | `usePlayerHolderCount(playerId)` | `!!playerId` | ✅ |
| 5 | `useWatcherCount(playerId)` | `!!playerId` | ✅ |
| 6 | `useWatchlist(userId)` | `!!userId` | ✅ |
| 7 | `useSellOrders(playerId)` | `!!playerId` | ✅ |
| 8 | `useIpoForPlayer(playerId)` | `!!playerId` | ✅ |
| 9 | `usePlayerTrades(playerId)` | `!!playerId` | ✅ |
| 10 | `useOpenBids(playerId, tab==='trading')` | tab-gate | ✅ (on trading) |
| 11 | `usePbtForPlayer(playerId, tab==='trading')` | tab-gate | ✅ (on trading) |
| 12 | `useUserIpoPurchases(userId, activeIpo?.id)` | `!!userId && !!activeIpo?.id` | ⏳ (chains on query 8) |
| 13 | `useDpcMastery(userId, playerId)` | `!!userId && !!playerId` | ✅ |
| 14 | `usePlayerMatchTimeline(playerId, 15)` | `!!playerId` | ✅ |
| 15 | `useLiquidationEvent(playerId)` | `!!playerId` | ✅ |
| 16 | `usePlayerResearch(playerId, userId, tab==='community'\|\|tab==='trading')` | tab-gate | ✅ (on trading) |
| 17 | `usePosts({playerId, limit: 30, active: tab==='community'})` | tab-gate | ❌ (only community) |
| 18 | `usePlayerGwScores(playerId, tab==='performance')` | tab-gate | ❌ |
| 19 | `usePlayerPercentiles(playerId, tab==='performance')` | tab-gate | ❌ |

**Initial-Fire auf Trading-Tab:** 15 + 1 chained = **16 Queries** (1,2,3,4,5,6,7,8,9,10,11,13,14,15,16 immediately; 12 chains on 8).

Browser-Concurrency-Limit = 6 → 10 Queries queuen in 2nd Welle (~200-500ms extra Latenz auf 4G).

## After Slice 017

| # | Hook | Gate | Fires on t=0? | Fires on t=300ms? |
|---|------|------|---------------|--------------------|
| 1 | `useDbPlayerById(playerId)` | — | ✅ | (already cached) |
| 2 | `useHoldingQty(userId, playerId)` | `!!userId && !!playerId` | ✅ | (cached) |
| 3 | `useHoldingLocks(belowFoldReady ? userId : undefined)` | `!!userId` | ❌ | ✅ |
| 4 | `usePlayerHolderCount(belowFoldReady ? playerId : undefined)` | `!!playerId` | ❌ | ✅ |
| 5 | `useWatcherCount(belowFoldReady ? playerId : undefined)` | `!!playerId` | ❌ | ✅ |
| 6 | `useWatchlist(userId)` | `!!userId` | ✅ | (cached) |
| 7 | `useSellOrders(playerId)` | `!!playerId` | ✅ | (cached) |
| 8 | `useIpoForPlayer(playerId)` | `!!playerId` | ✅ | (cached) |
| 9 | `usePlayerTrades(belowFoldReady ? playerId : undefined)` | `!!playerId` | ❌ | ✅ |
| 10 | `useOpenBids(playerId, tab==='trading')` | tab-gate | ✅ | (cached) |
| 11 | `usePbtForPlayer(playerId, tab==='trading')` | tab-gate | ✅ | (cached) |
| 12 | `useUserIpoPurchases(userId, activeIpo?.id)` | chain | ⏳ | (chains on 8) |
| 13 | `useDpcMastery(belowFoldReady ? userId : undefined, playerId)` | `!!userId && !!playerId` | ❌ | ✅ |
| 14 | `usePlayerMatchTimeline(playerId, 15, belowFoldReady)` | `active` | ❌ | ✅ |
| 15 | `useLiquidationEvent(playerId, belowFoldReady)` | `active` | ❌ | ✅ |
| 16 | `usePlayerResearch(playerId, userId, (tab==='community'\|\|tab==='trading') && belowFoldReady)` | tab + below-fold | ❌ | ✅ |
| 17 | `usePosts(...tab==='community')` | unchanged | ❌ | ❌ |
| 18 | `usePlayerGwScores(...tab==='performance')` | unchanged | ❌ | ❌ |
| 19 | `usePlayerPercentiles(...tab==='performance')` | unchanged | ❌ | ❌ |

**Initial-Fire auf Trading-Tab (t=0):** 1,2,6,7,8,10,11 + chain 12 = **8 Queries** (7 parallel + 1 chained).

**After 300ms (t=300):** +8 deferred (3,4,5,9,13,14,15,16) = **8 Queries** in zweiter Welle.

## Wirkung

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Initial parallel queries | 15 | 7 | −53% |
| Queries ueber Browser-Concurrency-Limit (6) | 9 wait | 1 wait | −89% |
| Time-to-First-Render fuer Hero (Player, SellOrders, IPO, HoldingQty, Watchlist) | abhaengig vom langsamsten der 16 | abhaengig vom langsamsten der 8 | schneller |
| Post-300ms Burst | — | 8 queries | neu |

Das Post-300ms-Burst ist wieder 8 Queries > 6 Limit → 2 warten kurz. Aber:
- User sieht den Hero zu diesem Zeitpunkt bereits gerendert (Critical-Path fertig)
- Deferred-Queries haben `staleTime`-Cache moeglich (User kam evtl. vom Market-Tab wo `useWatcherCount` evtl. schon lief)
- Visual-Impact = Below-the-fold-Skeleton rendert sich 100-200ms spaeter als Hero statt 300-500ms spaeter

## Verified

- `npx tsc --noEmit` → clean (0 Bytes)
- `npx vitest run src/components/player/detail/hooks/__tests__/` → 8/8 passed

## Post-Deploy-Messung (separat)

Echte Zeitmessung gegen `bescout.net/player/[id]` nach Deploy via Playwright:
- Phase 7 im Walkthrough
- Metrik: `performance.getEntriesByType('resource')` + Initial-Page-Load
- Before/After vergleichen mit Git-Commit-Hash

Dieser Slice liefert den statischen Code-Fix, Phase-7 verifiziert Wirkung gegen echtes Netz.
