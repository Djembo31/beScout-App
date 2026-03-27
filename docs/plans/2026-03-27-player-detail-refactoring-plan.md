# Player Detail Refactoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract `usePlayerDetailData` hook from PlayerContent.tsx to reduce orchestrator from 427 to ~250 LOC.

**Architecture:** Move all 20 React Query hooks, null-coalesce defaults, profileMap side-effect, and playerWithOwnership transformation into a single data hook. PlayerContent becomes a pure orchestrator wiring data to components.

**Tech Stack:** React hooks, TanStack React Query v5, TypeScript strict, Vitest + @testing-library/react

**Design Spec:** `docs/plans/2026-03-27-player-detail-refactoring-design.md`

---

## Task 1: Create `usePlayerDetailData` Hook

**Files:**
- Create: `src/components/player/detail/hooks/usePlayerDetailData.ts`
- Modify: `src/components/player/detail/hooks/index.ts`

**Step 1: Create the hook file**

```typescript
// src/components/player/detail/hooks/usePlayerDetailData.ts
import { useState, useMemo, useEffect } from 'react';
import { useToast } from '@/components/providers/ToastProvider';
import { useTranslations } from 'next-intl';
import { dbToPlayer } from '@/lib/services/players';
import { getProfilesByIds } from '@/lib/services/profiles';
import type { Player, DbPlayer, DbIpo, DbOrder, DbTrade, PostWithAuthor, ResearchPostWithAuthor } from '@/types';

// React Query hooks
import { useDbPlayerById, usePlayers } from '@/lib/queries/players';
import {
  usePlayerGwScores,
  usePlayerMatchTimeline,
  usePbtForPlayer,
  useLiquidationEvent,
  useIpoForPlayer,
  useHoldingQty,
  usePlayerHolderCount,
  useSellOrders,
  useOpenBids,
  usePosts,
  useUserIpoPurchases,
} from '@/lib/queries/misc';
import { usePlayerResearch } from '@/lib/queries/research';
import { usePlayerTrades } from '@/lib/queries/trades';
import { useHoldingLocks } from '@/lib/queries/events';
import { useDpcMastery } from '@/lib/queries/mastery';

type Tab = 'trading' | 'performance' | 'community';

export interface PlayerDetailData {
  // Core player
  player: Player | null;
  playerWithOwnership: Player | null;
  dbPlayer: DbPlayer | undefined;
  dpcAvailable: number;

  // Holdings & market
  holdingQty: number;
  holderCount: number;
  lockedScMap: Map<string, number> | undefined;
  allSellOrders: DbOrder[];
  openBids: DbOrder[];
  trades: DbTrade[];
  tradesLoading: boolean;
  activeIpo: DbIpo | undefined;
  userIpoPurchased: number;
  masteryData: { level: number; xp: number } | undefined;
  pbtTreasury: unknown;

  // Performance
  matchTimelineData: unknown[];
  matchTimelineLoading: boolean;
  liquidationEvent: unknown;
  gwScores: unknown[];
  allPlayersForPercentile: DbPlayer[];

  // Community
  playerResearch: ResearchPostWithAuthor[];
  playerPosts: PostWithAuthor[];

  // Profiles
  profileMap: Record<string, { handle: string; display_name: string | null }>;

  // Loading state
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

export function usePlayerDetailData(
  playerId: string,
  userId: string | undefined,
  tab: Tab
): PlayerDetailData {
  const { addToast } = useToast();
  const t = useTranslations('player');

  // ─── React Query Hooks ────────────────────
  // ALWAYS loaded (Hero + Trading default tab):
  const { data: dbPlayer, isLoading, isError, refetch } = useDbPlayerById(playerId);
  const { data: holdingQtyData } = useHoldingQty(userId, playerId);
  const { data: lockedScMap } = useHoldingLocks(userId);
  const { data: holderCountData } = usePlayerHolderCount(playerId);
  const { data: allSellOrdersData } = useSellOrders(playerId);
  const { data: activeIpo } = useIpoForPlayer(playerId);

  // TRADING TAB (default — loaded immediately):
  const { data: tradesData, isLoading: tradesLoading } = usePlayerTrades(playerId);
  const { data: openBidsData } = useOpenBids(playerId, tab === 'trading');
  const { data: pbtTreasury } = usePbtForPlayer(playerId, tab === 'trading');
  const { data: userIpoPurchasedData } = useUserIpoPurchases(userId, activeIpo?.id);
  const { data: masteryData } = useDpcMastery(userId, playerId);

  // HERO + PERFORMANCE shared:
  const { data: matchTimelineData, isLoading: matchTimelineLoading } = usePlayerMatchTimeline(playerId, 15);
  const { data: liquidationEvent } = useLiquidationEvent(playerId);

  // PERFORMANCE TAB (deferred):
  const { data: gwScoresData } = usePlayerGwScores(playerId, tab === 'performance');

  // COMMUNITY TAB (deferred):
  const { data: playerResearchData } = usePlayerResearch(playerId, userId, tab === 'community' || tab === 'trading');
  const { data: playerPostsData } = usePosts({ playerId, limit: 30, active: tab === 'community' });

  // ─── Derived from queries ─────────────────
  const { data: allPlayersData } = usePlayers(tab === 'performance');
  const allPlayersForPercentile = allPlayersData ?? [];

  const player = useMemo(() => dbPlayer ? dbToPlayer(dbPlayer) : null, [dbPlayer]);
  const dpcAvailable = dbPlayer?.dpc_available ?? 0;
  const holdingQty = holdingQtyData ?? 0;
  const holderCount = holderCountData ?? 0;
  const allSellOrders = allSellOrdersData ?? [];
  const openBids = openBidsData ?? [];
  const trades = tradesData ?? [];
  const playerResearch = playerResearchData ?? [];
  const playerPosts = playerPostsData ?? [];
  const userIpoPurchased = userIpoPurchasedData ?? 0;
  const gwScores = gwScoresData ?? [];

  // ─── Profile Map Side-Effect ──────────────
  const [profileMap, setProfileMap] = useState<Record<string, { handle: string; display_name: string | null }>>({});

  useEffect(() => {
    const userIds = new Set<string>();
    trades.forEach(t => { if (t.buyer_id) userIds.add(t.buyer_id); if (t.seller_id) userIds.add(t.seller_id); });
    allSellOrders.forEach(o => { if (o.user_id) userIds.add(o.user_id); });
    const ids = Array.from(userIds);
    if (ids.length > 0) {
      getProfilesByIds(ids).then(setProfileMap).catch(err => {
        console.error('[Player] Profile map failed:', err);
        addToast(t('couldNotLoadProfiles'), 'error');
      });
    }
  }, [trades, allSellOrders]);

  // ─── Player With Ownership ────────────────
  const playerWithOwnership = useMemo(() => {
    if (!player) return null;
    const c2b = (c: number) => c / 100;
    return {
      ...player,
      dpc: { ...player.dpc, owned: holdingQty },
      pbt: pbtTreasury ? {
        balance: c2b((pbtTreasury as { balance: number }).balance),
        lastInflow: (pbtTreasury as { last_inflow_at: string | null }).last_inflow_at
          ? c2b((pbtTreasury as { trading_inflow: number }).trading_inflow + (pbtTreasury as { ipo_inflow: number }).ipo_inflow)
          : undefined,
        sources: {
          trading: c2b((pbtTreasury as { trading_inflow: number }).trading_inflow),
          ipo: c2b((pbtTreasury as { ipo_inflow: number }).ipo_inflow),
          votes: c2b((pbtTreasury as { votes_inflow: number }).votes_inflow),
          content: c2b((pbtTreasury as { content_inflow: number }).content_inflow),
        },
      } : player.pbt,
    };
  }, [player, holdingQty, pbtTreasury]);

  return {
    player, playerWithOwnership, dbPlayer, dpcAvailable,
    holdingQty, holderCount, lockedScMap, allSellOrders, openBids,
    trades, tradesLoading, activeIpo, userIpoPurchased, masteryData,
    pbtTreasury,
    matchTimelineData: matchTimelineData ?? [], matchTimelineLoading,
    liquidationEvent, gwScores, allPlayersForPercentile,
    playerResearch, playerPosts, profileMap,
    isLoading, isError, refetch,
  };
}
```

**Step 2: Add export to hooks/index.ts**

Add line to `src/components/player/detail/hooks/index.ts`:
```typescript
export { usePlayerDetailData } from './usePlayerDetailData';
export type { PlayerDetailData } from './usePlayerDetailData';
```

**Step 3: Run tsc**

Run: `npx tsc --noEmit`
Expected: 0 errors (hook is created but not yet consumed)

**Step 4: Commit**

```
feat(player): extract usePlayerDetailData hook
```

---

## Task 2: Refactor PlayerContent to Use the Hook

**Files:**
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx`

**Step 1: Replace data setup block with hook call**

Replace lines 1-55 (imports) with slim imports:
```typescript
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { XCircle } from 'lucide-react';
import { Button, ErrorState, TabBar, ErrorBoundary } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useToast } from '@/components/providers/ToastProvider';

import {
  usePlayerDetailData,
  usePlayerTrading,
  usePlayerCommunity,
  usePriceAlerts,
} from '@/components/player/detail/hooks';

import {
  PlayerDetailSkeleton,
  PlayerHero,
  CommunityTab,
  MobileTradingBar,
  LiquidationAlert,
} from '@/components/player/detail';
import TradingTab from '@/components/player/detail/TradingTab';
import PerformanceTab from '@/components/player/detail/PerformanceTab';
import StickyDashboardStrip from '@/components/player/detail/StickyDashboardStrip';
import BuyModal from '@/components/player/detail/BuyModal';
import SellModal from '@/components/player/detail/SellModal';
import OfferModal from '@/components/player/detail/OfferModal';
import dynamic from 'next/dynamic';
const LimitOrderModal = dynamic(() => import('@/components/player/detail/LimitOrderModal'), { ssr: false });
```

Replace lines 73-191 (component body before guards) with:
```typescript
export default function PlayerContent({ playerId }: { playerId: string }) {
  const { user, clubAdmin } = useUser();
  const { balanceCents } = useWallet();
  const { addToast } = useToast();
  const t = useTranslations('player');
  const uid = user?.id;

  // ─── UI State ───────────────────────────
  const [tab, setTab] = useState<Tab>('trading');
  const heroRef = useRef<HTMLDivElement>(null);
  const [showStrip, setShowStrip] = useState(false);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [showLimitOrder, setShowLimitOrder] = useState(false);

  // ─── Data Hook ──────────────────────────
  const data = usePlayerDetailData(playerId, uid, tab);

  // ─── Action Hooks ───────────────────────
  const trading = usePlayerTrading({
    playerId, player: data.player, userId: uid,
    activeIpo: data.activeIpo ?? null, allSellOrders: data.allSellOrders,
    holdingQty: data.holdingQty, balanceCents, userIpoPurchased: data.userIpoPurchased,
  });

  const community = usePlayerCommunity({
    playerId, playerClub: data.player?.club, userId: uid, playerPosts: data.playerPosts,
  });

  const alerts = usePriceAlerts({ playerId, player: data.player });

  // ─── Sticky Dashboard Strip ─────────────
  useEffect(() => {
    if (!heroRef.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowStrip(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  // ─── Club Admin Guard ───────────────────
  const isRestrictedAdmin = !!(clubAdmin && data.dbPlayer?.club_id === clubAdmin.clubId);
  const te = useTranslations('errors');
  const guardedBuy = isRestrictedAdmin
    ? () => addToast(te('clubAdminRestricted'), 'error')
    : trading.openBuyModal;
  const guardedSell = isRestrictedAdmin
    ? () => addToast(te('clubAdminRestricted'), 'error')
    : trading.openSellModal;

  // ─── Share Handler ──────────────────────
  const handleShare = async () => {
    if (!data.player) return;
    const url = window.location.href;
    const text = `${data.player.first} ${data.player.last} auf BeScout — ${fmtScout(centsToBsd(data.player.prices.floor ?? 0))} CR`;
    if (navigator.share) {
      try { await navigator.share({ title: text, url }); } catch (err) { console.error('[Player] Share failed:', err); }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };
```

Keep loading/error/render section (lines 216-427) but replace all direct variable references with `data.` prefix:
- `playerLoading` → `data.isLoading`
- `playerError` → `data.isError`
- `player` → `data.player`
- `playerWithOwnership` → `data.playerWithOwnership`
- `holdingQty` → `data.holdingQty`
- `holderCount` → `data.holderCount`
- `allSellOrders` → `data.allSellOrders`
- `openBids` → `data.openBids`
- `trades` → `data.trades`
- `tradesLoading` → `data.tradesLoading`
- `profileMap` → `data.profileMap`
- `dpcAvailable` → `data.dpcAvailable`
- `activeIpo` → `data.activeIpo`
- `userIpoPurchased` → `data.userIpoPurchased`
- `masteryData` → `data.masteryData`
- `matchTimelineData` → `data.matchTimelineData`
- `matchTimelineLoading` → `data.matchTimelineLoading`
- `liquidationEvent` → `data.liquidationEvent`
- `playerResearch` → `data.playerResearch`
- `playerPosts` → `data.playerPosts`
- `lockedScMap` → `data.lockedScMap`
- `pbtTreasury` → (already consumed inside hook)
- `balanceCents` stays (from WalletProvider, not hook)
- `refetch()` → `data.refetch()`

**Step 2: Run tsc**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Run existing tests**

Run: `npx vitest run src/components/player/detail/__tests__/ --reporter=verbose`
Expected: All 11 test files pass (no behavior change)

**Step 4: Commit**

```
refactor(player): wire PlayerContent to usePlayerDetailData hook (427→~260 LOC)
```

---

## Task 3: Write Hook Test

**Files:**
- Create: `src/components/player/detail/hooks/__tests__/usePlayerDetailData.test.ts`

**Step 1: Write the test**

Test the hook with `renderHook` — mock all React Query hooks, verify:
1. Returns correct defaults when queries return undefined
2. Returns player after dbToPlayer mapping when query returns data
3. Returns playerWithOwnership with pbtTreasury transformation
4. profileMap loads when trades/orders have user IDs
5. Tab gating: performance queries only called when tab='performance'

Mock pattern (same as existing tests):
```typescript
vi.mock('@/lib/queries/players', () => ({
  useDbPlayerById: vi.fn(() => ({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() })),
  usePlayers: vi.fn(() => ({ data: undefined })),
}));
// ... similar for all query modules
```

**Step 2: Run tests**

Run: `npx vitest run src/components/player/detail/hooks/__tests__/usePlayerDetailData.test.ts --reporter=verbose`
Expected: All tests pass

**Step 3: Commit**

```
test(player): add usePlayerDetailData hook tests
```

---

## Task 4: Verification

**Step 1: Full tsc check**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Full player test suite**

Run: `npx vitest run src/components/player/ --reporter=verbose`
Expected: All existing + new tests pass

**Step 3: Verify LOC reduction**

Run: `wc -l src/app/(app)/player/[id]/PlayerContent.tsx src/components/player/detail/hooks/usePlayerDetailData.ts`
Expected: PlayerContent ~260 LOC, hook ~180 LOC

**Step 4: Final commit (if any fixes needed)**
