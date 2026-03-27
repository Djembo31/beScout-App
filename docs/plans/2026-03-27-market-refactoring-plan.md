# Market Page Refactoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Decompose 606 LOC Market God-Component into a feature module with hooks, tab components, and tests — consistent with the Fantasy refactoring pattern.

**Architecture:** Thin Orchestrator (`MarketContent` ~150 LOC) delegates to `useMarketData`, `useTradeActions`, `useWatchlistActions` hooks. Two tab-router components (`PortfolioTab`, `MarktplatzTab`) render sub-tab panels. All files live under `src/features/market/`. Re-export bridges prevent breakage.

**Tech Stack:** React 18, TypeScript strict, Zustand v5, TanStack React Query v5, next-intl, Vitest

**Design Doc:** `docs/plans/2026-03-27-market-refactoring-design.md`

---

## Wave 1: Foundation (Store + Queries + Mutations)

Move infrastructure files into feature module. No component changes yet — bridges keep everything working.

### Task 1.1: Create feature module skeleton

**Files:**
- Create: `src/features/market/` (directories only)

**Step 1:** Create directory structure

```bash
mkdir -p src/features/market/{components/{portfolio,marktplatz,shared},hooks,queries,mutations,store}
```

**Step 2:** Verify structure exists

```bash
find src/features/market -type d | sort
```

Expected:
```
src/features/market
src/features/market/components
src/features/market/components/marktplatz
src/features/market/components/portfolio
src/features/market/components/shared
src/features/market/hooks
src/features/market/mutations
src/features/market/queries
src/features/market/store
```

---

### Task 1.2: Move + clean marketStore

**Files:**
- Move: `src/lib/stores/marketStore.ts` → `src/features/market/store/marketStore.ts`
- Create: `src/lib/stores/marketStore.ts` (bridge)

**Step 1:** Copy store to new location

```bash
cp src/lib/stores/marketStore.ts src/features/market/store/marketStore.ts
```

**Step 2:** Remove 21 orphaned fields from new store file

Remove these fields, their initial values, and their setters from `src/features/market/store/marketStore.ts`:

**Interface fields to remove:**
```ts
// REMOVE from MarketState interface:
query: string;
posFilter: Set<Pos>;
clubFilter: Set<string>;
leagueFilter: string;
priceMin: string;
priceMax: string;
onlyAvailable: boolean;
onlyOwned: boolean;
onlyWatched: boolean;
showFilters: boolean;
clubSearch: string;
showClubDropdown: boolean;
spielerQuery: string;
spielerPosFilter: Set<Pos>;
expandedClubs: Set<string>;
spielerInitialized: boolean;
showCompare: boolean;
discoveryPos: Pos | null;
expandedDiscoveryClubs: Set<string>;
discoverySortBy: SortOption;
discoveryMinL5: number;
discoveryOnlyFit: boolean;
```

**Setters to remove from interface:**
```ts
setQuery, togglePos, toggleClub, setLeagueFilter, setPriceMin, setPriceMax,
setOnlyAvailable, setOnlyOwned, setOnlyWatched, setShowFilters,
setClubSearch, setShowClubDropdown, setSpielerQuery, toggleSpielerPos,
toggleClubExpand, initExpandedClubs, setShowCompare, clearPosFilter,
setDiscoveryPos, toggleDiscoveryClub, setDiscoverySortBy,
setDiscoveryMinL5, setDiscoveryOnlyFit
```

**Remove `resetFilters` entirely** (unused, `resetMarketFilters` is the active one).

**Remove types that are now unused:** `KaufenMode` (only used by `kaufenMode` field — check if `kaufenMode` is consumed anywhere first; if not, remove both).

**Keep all remaining fields** — they are actively consumed by ClubAccordion, ClubVerkaufSection, MarketFilters, TransferListSection, ManagerBestandTab.

**Step 3:** Write bridge at old location

```ts
// src/lib/stores/marketStore.ts
export { useMarketStore } from '@/features/market/store/marketStore';
export type {
  MarketTab,
  PortfolioSubTab,
  KaufenSubTab,
  SortOption,
  IpoViewState,
} from '@/features/market/store/marketStore';
```

**Step 4:** Run tsc

```bash
npx tsc --noEmit
```

Expected: 0 errors. If errors about removed fields, grep for the field name and fix the consumer.

**Step 5:** Commit

```bash
git add src/features/market/store/marketStore.ts src/lib/stores/marketStore.ts
git commit -m "refactor(market): move marketStore to feature module + remove 21 orphaned fields"
```

---

### Task 1.3: Move queries to feature module

**Files:**
- Move: 5 query files from `src/lib/queries/` → `src/features/market/queries/`
- Create: 5 bridge files at old locations

**Step 1:** Copy each query file to new location

```bash
cp src/lib/queries/ipos.ts src/features/market/queries/ipos.ts
cp src/lib/queries/trending.ts src/features/market/queries/trending.ts
cp src/lib/queries/priceHist.ts src/features/market/queries/priceHist.ts
cp src/lib/queries/watchlist.ts src/features/market/queries/watchlist.ts
cp src/lib/queries/offers.ts src/features/market/queries/offers.ts
```

**Step 2:** Fix relative imports in each new file

All 5 files import `from './keys'` — change to `from '@/lib/queries/keys'`:

```ts
// In ALL 5 files in src/features/market/queries/:
// OLD: import { qk } from './keys';
// NEW: import { qk } from '@/lib/queries/keys';
```

**Step 3:** Write bridges at old locations

Each old file becomes a re-export:

```ts
// src/lib/queries/ipos.ts
export { useActiveIpos, useAnnouncedIpos, useRecentlyEndedIpos } from '@/features/market/queries/ipos';
```

```ts
// src/lib/queries/trending.ts
export { useTrendingPlayers } from '@/features/market/queries/trending';
```

```ts
// src/lib/queries/priceHist.ts
export { useAllPriceHistories } from '@/features/market/queries/priceHist';
```

```ts
// src/lib/queries/watchlist.ts
export { useWatchlist } from '@/features/market/queries/watchlist';
```

```ts
// src/lib/queries/offers.ts
export { useIncomingOffers } from '@/features/market/queries/offers';
```

**Step 4:** Run tsc

```bash
npx tsc --noEmit
```

Expected: 0 errors. External consumers (ClubContent → useActiveIpos) still work via bridge.

**Step 5:** Commit

```bash
git add src/features/market/queries/ src/lib/queries/{ipos,trending,priceHist,watchlist,offers}.ts
git commit -m "refactor(market): move 5 query files to feature module with bridges"
```

---

### Task 1.4: Move mutations to feature module

**Files:**
- Move: `src/lib/mutations/trading.ts` → `src/features/market/mutations/trading.ts`
- Create: `src/lib/mutations/trading.ts` (bridge)

**Step 1:** Copy mutations file

```bash
cp src/lib/mutations/trading.ts src/features/market/mutations/trading.ts
```

**Step 2:** Fix imports in new file

The mutations file imports from `@/lib/queries/invalidation` and `@/lib/queries/keys` — these are shared, keep absolute paths (they should already work).

Also imports from `@/lib/services/trading`, `@/lib/services/ipo`, providers — all absolute, no changes needed.

**Step 3:** Write bridge

```ts
// src/lib/mutations/trading.ts
export {
  useBuyFromMarket,
  useBuyFromIpo,
  usePlaceBuyOrder,
  useCancelBuyOrder,
} from '@/features/market/mutations/trading';
```

**Step 4:** Run tsc

```bash
npx tsc --noEmit
```

**Step 5:** Commit

```bash
git add src/features/market/mutations/trading.ts src/lib/mutations/trading.ts
git commit -m "refactor(market): move trading mutations to feature module with bridge"
```

---

### Task 1.5: Wave 1 verification

**Step 1:** Run tsc + tests

```bash
npx tsc --noEmit && npx vitest run --reporter=verbose 2>&1 | tail -20
```

**Step 2:** Verify bridges work — grep for old import paths

```bash
grep -r "from '@/lib/queries/ipos'" src/ --include='*.ts' --include='*.tsx' | grep -v node_modules | grep -v '.test.'
```

Expected: Only market/page.tsx and club/ClubContent.tsx — both should still work via bridges.

---

## Wave 2: Hook Extraction

Extract all page.tsx logic into 3 hooks. This is coupled work — do it yourself, not via agents.

### Task 2.1: Create useMarketData hook

**Files:**
- Create: `src/features/market/hooks/useMarketData.ts`

**Step 1:** Write the hook

Extract lines 164-330 from `src/app/(app)/market/page.tsx` into the hook. The hook should:

1. Accept `userId: string | undefined` as parameter
2. Read `tab` from `useMarketStore()` for query gating
3. Call all 13 query hooks (lines 166-182)
4. Compute all 5 derived values (lines 184-330): `players` (with priceHist merge), `watchlistMap`, `floorMap`, `playerMap`, `mySquadPlayers`
5. Return everything as a typed object

```ts
'use client';

import { useMemo } from 'react';
import type { Player, DbIpo } from '@/types';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { useEnrichedPlayers, useHoldings, useAllOpenOrders, useAllOpenBuyOrders } from '@/lib/queries';
import { useActiveIpos, useAnnouncedIpos, useRecentlyEndedIpos } from '@/features/market/queries/ipos';
import { useTrendingPlayers } from '@/features/market/queries/trending';
import { useAllPriceHistories } from '@/features/market/queries/priceHist';
import { useWatchlist } from '@/features/market/queries/watchlist';
import { useIncomingOffers } from '@/features/market/queries/offers';
import { useMarketStore } from '@/features/market/store/marketStore';

export function useMarketData(userId: string | undefined) {
  const tab = useMarketStore(s => s.tab);

  // ── Core queries (always loaded) ──
  const { data: enrichedPlayers = [], isLoading: playersLoading, isError: playersError } = useEnrichedPlayers(userId);
  const { data: ipoList = [] } = useActiveIpos();
  const { data: holdings = [] } = useHoldings(userId);
  const { data: watchlistEntries = [] } = useWatchlist(userId);
  const { data: recentOrders = [] } = useAllOpenOrders();
  const { data: incomingOffers = [] } = useIncomingOffers(userId);

  // ── Tab-gated queries (marktplatz only) ──
  const { data: priceHistMap } = useAllPriceHistories(10, { enabled: tab === 'marktplatz' });
  const { data: announcedIpos = [] } = useAnnouncedIpos({ enabled: tab === 'marktplatz' });
  const { data: endedIpos = [] } = useRecentlyEndedIpos({ enabled: tab === 'marktplatz' });
  const { data: trending = [] } = useTrendingPlayers(8, { enabled: tab === 'marktplatz' });
  const { data: buyOrders = [] } = useAllOpenBuyOrders({ enabled: tab === 'marktplatz' });

  // ── Derived: merge price histories ──
  const players = useMemo(() => {
    if (!priceHistMap || priceHistMap.size === 0) return enrichedPlayers;
    return enrichedPlayers.map(p => {
      const hist = priceHistMap.get(p.id);
      if (!hist || hist.length < 2) return p;
      return { ...p, prices: { ...p.prices, history7d: hist } };
    });
  }, [enrichedPlayers, priceHistMap]);

  // ── Derived: watchlist map ──
  const watchlistMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const e of watchlistEntries) map[e.playerId] = true;
    return map;
  }, [watchlistEntries]);

  // ── Derived: floor prices ──
  const floorMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of players) {
      m.set(p.id, p.listings.length > 0 ? Math.min(...p.listings.map(l => l.price)) : p.prices.floor ?? p.prices.referencePrice ?? 0);
    }
    return m;
  }, [players]);

  // ── Derived: player lookup ──
  const playerMap = useMemo(() => {
    const m = new Map<string, Player>();
    for (const p of players) m.set(p.id, p);
    return m;
  }, [players]);

  // ── Derived: owned squad ──
  const mySquadPlayers = useMemo(() => {
    return players.filter(p => p.dpc.owned > 0 && !p.isLiquidated);
  }, [players]);

  return {
    players, playersLoading, playersError,
    holdings, ipoList, watchlistEntries, recentOrders, incomingOffers,
    announcedIpos, endedIpos, trending, buyOrders, priceHistMap,
    playerMap, floorMap, watchlistMap, mySquadPlayers,
  };
}
```

**Step 2:** Run tsc (hook exists standalone, not wired yet)

```bash
npx tsc --noEmit
```

**Step 3:** Commit

```bash
git add src/features/market/hooks/useMarketData.ts
git commit -m "feat(market): create useMarketData hook (query bundling + derived data)"
```

---

### Task 2.2: Create useTradeActions hook

**Files:**
- Create: `src/features/market/hooks/useTradeActions.ts`

**Step 1:** Write the hook

Extract lines 202-296 from page.tsx. The hook encapsulates:
- Buy mutations (market + IPO) with state
- Sell handler
- Cancel handler
- Buy confirmation modal state (pendingBuy)
- Buy order modal state (buyOrderPlayer)
- Error auto-dismiss effect
- ipoIdMap derived from ipoList

```ts
'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Player, DbIpo } from '@/types';
import { placeSellOrder, cancelOrder } from '@/lib/services/trading';
import { useBuyFromMarket, useBuyFromIpo } from '@/features/market/mutations/trading';
import { invalidateTradeQueries } from '@/lib/queries';
import { useWallet } from '@/components/providers/WalletProvider';

type BuySource = 'market' | 'ipo';
type PendingBuy = { playerId: string; source: BuySource } | null;
type ActionResult = { success: boolean; error?: string };

export function useTradeActions(userId: string | undefined, ipoList: DbIpo[]) {
  const { balanceCents } = useWallet();
  const t = useTranslations('market');
  const tc = useTranslations('common');

  // ── Buy state ──
  const [pendingBuy, setPendingBuy] = useState<PendingBuy>(null);
  const balanceBeforeBuyRef = useRef(0);
  const [buyOrderPlayer, setBuyOrderPlayer] = useState<Player | null>(null);

  // ── Buy mutations ──
  const buyMut = useBuyFromMarket();
  const { mutate: doBuy, isPending: buyPending, isSuccess: buyIsSuccess, isError: buyIsError, error: buyMutError, variables: buyVars, reset: resetBuy } = buyMut;

  const ipoBuyMut = useBuyFromIpo();
  const { mutate: doIpoBuy, isPending: ipoBuyPending, isSuccess: ipoBuyIsSuccess, isError: ipoBuyIsError, error: ipoBuyMutError, variables: ipoBuyVars, reset: resetIpoBuy } = ipoBuyMut;

  // ── Derived buy state ──
  const buyingId = (buyPending ? (buyVars?.playerId ?? null) : null) || (ipoBuyPending ? (ipoBuyVars?.playerId ?? null) : null);
  const buySuccess = buyIsSuccess ? t('dpcBought', { count: buyVars?.quantity ?? 1 }) : ipoBuyIsSuccess ? t('dpcBought', { count: ipoBuyVars?.quantity ?? 1 }) : null;
  const lastBoughtId = buyIsSuccess ? (buyVars?.playerId ?? null) : ipoBuyIsSuccess ? (ipoBuyVars?.playerId ?? null) : null;
  const buyError = buyIsError ? (buyMutError?.message ?? tc('unknownError')) : ipoBuyIsError ? (ipoBuyMutError?.message ?? tc('unknownError')) : null;

  // ── Error auto-dismiss ──
  useEffect(() => {
    if (!buyIsError && !ipoBuyIsError) return;
    const reset = buyIsError ? resetBuy : resetIpoBuy;
    const timer = setTimeout(reset, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyIsError, ipoBuyIsError]);

  // ── IPO ID lookup ──
  const ipoIdMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const ipo of ipoList) m.set(ipo.player_id, ipo.id);
    return m;
  }, [ipoList]);

  // ── Handlers ──
  const handleBuy = useCallback((playerId: string) => {
    if (!userId) return;
    setPendingBuy({ playerId, source: 'market' });
  }, [userId]);

  const handleIpoBuy = useCallback((playerId: string) => {
    if (!userId) return;
    setPendingBuy({ playerId, source: 'ipo' });
  }, [userId]);

  const executeBuy = useCallback((qty: number) => {
    if (!userId || !pendingBuy) return;
    balanceBeforeBuyRef.current = balanceCents ?? 0;
    if (pendingBuy.source === 'market') {
      doBuy({ userId, playerId: pendingBuy.playerId, quantity: qty });
    } else {
      const ipoId = ipoIdMap.get(pendingBuy.playerId);
      if (!ipoId) return;
      doIpoBuy({ userId, ipoId, playerId: pendingBuy.playerId, quantity: qty });
    }
    setPendingBuy(null);
  }, [userId, pendingBuy, doBuy, doIpoBuy, ipoIdMap, balanceCents]);

  const handleSell = useCallback(async (playerId: string, quantity: number, priceCents: number): Promise<ActionResult> => {
    if (!userId) return { success: false, error: t('notLoggedIn') };
    try {
      const result = await placeSellOrder(userId, playerId, quantity, priceCents);
      if (!result.success) return { success: false, error: result.error || t('listingFailed') };
      invalidateTradeQueries(playerId, userId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : tc('unknownError') };
    }
  }, [userId, t, tc]);

  const handleCancelOrder = useCallback(async (orderId: string): Promise<ActionResult> => {
    if (!userId) return { success: false, error: t('notLoggedIn') };
    try {
      const result = await cancelOrder(userId, orderId);
      if (!result.success) return { success: false, error: result.error || t('cancelFailed') };
      invalidateTradeQueries('', userId);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : tc('unknownError') };
    }
  }, [userId, t, tc]);

  return {
    pendingBuy, setPendingBuy, executeBuy,
    buyingId, buySuccess, lastBoughtId, buyError,
    buyPending, ipoBuyPending,
    buyIsSuccess, ipoBuyIsSuccess, buyVars, ipoBuyVars,
    resetBuy, resetIpoBuy,
    balanceBeforeBuyRef,
    handleBuy, handleIpoBuy, handleSell, handleCancelOrder,
    buyOrderPlayer, setBuyOrderPlayer,
  };
}
```

**Step 2:** Run tsc

```bash
npx tsc --noEmit
```

**Step 3:** Commit

```bash
git add src/features/market/hooks/useTradeActions.ts
git commit -m "feat(market): create useTradeActions hook (buy/sell/cancel state + handlers)"
```

---

### Task 2.3: Create useWatchlistActions hook

**Files:**
- Create: `src/features/market/hooks/useWatchlistActions.ts`

**Step 1:** Write the hook

Extract lines 224-308 from page.tsx:

```ts
'use client';

import { useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { addToWatchlist, removeFromWatchlist, migrateLocalWatchlist } from '@/lib/services/watchlist';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { useToast } from '@/components/providers/ToastProvider';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';

export function useWatchlistActions(
  userId: string | undefined,
  watchlistMap: Record<string, boolean>,
) {
  const { addToast } = useToast();
  const t = useTranslations('market');

  // ── Optimistic toggle ──
  const toggleWatch = useCallback((id: string) => {
    if (!userId) return;
    const isWatched = !!watchlistMap[id];
    // Optimistic update via React Query cache
    queryClient.setQueryData<WatchlistEntry[]>(qk.watchlist.byUser(userId), (old) => {
      if (!old) return old;
      if (isWatched) return old.filter(e => e.playerId !== id);
      return [...old, {
        id: `opt-${id}`,
        playerId: id,
        alertThresholdPct: 0,
        alertDirection: 'both' as const,
        lastAlertPrice: 0,
        createdAt: new Date().toISOString(),
      }];
    });
    const action = isWatched ? removeFromWatchlist(userId, id) : addToWatchlist(userId, id);
    action.catch((err) => {
      console.error('[Market] Watchlist toggle failed:', err);
      queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(userId) });
      addToast(t('watchlistError'), 'error');
    });
  }, [userId, watchlistMap, addToast, t]);

  // ── One-time localStorage migration ──
  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;
    const legacy = localStorage.getItem('bescout-watchlist');
    if (!legacy) return;
    migrateLocalWatchlist(userId)
      .then(count => {
        if (count > 0) queryClient.invalidateQueries({ queryKey: qk.watchlist.byUser(userId) });
      })
      .catch(err => console.error('[Market] Watchlist migration failed:', err));
  }, [userId]);

  return { toggleWatch };
}
```

**Step 2:** Run tsc

```bash
npx tsc --noEmit
```

**Step 3:** Commit

```bash
git add src/features/market/hooks/useWatchlistActions.ts
git commit -m "feat(market): create useWatchlistActions hook (optimistic toggle + migration)"
```

---

### Task 2.4: Wave 2 verification

**Step 1:** Run tsc + tests

```bash
npx tsc --noEmit && npx vitest run --reporter=verbose 2>&1 | tail -20
```

All 3 hooks exist standalone. page.tsx is unchanged — still works. Next wave wires them in.

---

## Wave 3: Component Migration

Move components from `components/market/` and `components/manager/` into feature module. Write bridges.

### Task 3.1: Move shared market components

**Files:**
- Move 10 files from `src/components/market/` → `src/features/market/components/shared/`
- Create bridges for externally-imported components

**Step 1:** Copy shared components

```bash
# Shared (used by both tabs or as modals)
cp src/components/market/BuyConfirmModal.tsx src/features/market/components/shared/
cp src/components/market/BuyOrderModal.tsx src/features/market/components/shared/
cp src/components/market/TradeSuccessCard.tsx src/features/market/components/shared/
cp src/components/market/MarketSearch.tsx src/features/market/components/shared/
cp src/components/market/MarketFilters.tsx src/features/market/components/shared/
cp src/components/market/OrderDepthView.tsx src/features/market/components/shared/
cp src/components/market/DiscoveryCard.tsx src/features/market/components/shared/
```

**Step 2:** Fix imports in each moved file

In each file, update any relative imports to absolute paths. Specifically:
- `from '@/lib/stores/marketStore'` — still works via bridge
- `from '@/lib/mutations/trading'` — still works via bridge
- Any `from './` or `from '../` imports need to become absolute `@/` paths

**Key files to check:**
- `BuyOrderModal.tsx` line 12: imports `usePlaceBuyOrder` from `@/lib/mutations/trading` — works via bridge
- `MarketFilters.tsx`: imports `useMarketStore` from `@/lib/stores/marketStore` — works via bridge

**Step 3:** Write bridge for DiscoveryCard (imported by Home page)

```ts
// src/components/market/DiscoveryCard.tsx (bridge)
export { default } from '@/features/market/components/shared/DiscoveryCard';
```

**Step 4:** Write bridges for other externally-imported components

Check: Do any files outside market/ import these components? (Research says no — only market/page.tsx imports them via dynamic()). So only DiscoveryCard needs a bridge.

Replace old files with bridges ONLY for DiscoveryCard. The rest of the old files in `components/market/` will be cleaned up after page.tsx is rewritten.

**Step 5:** Run tsc

```bash
npx tsc --noEmit
```

**Step 6:** Commit

```bash
git add src/features/market/components/shared/ src/components/market/DiscoveryCard.tsx
git commit -m "refactor(market): move 7 shared components to feature module"
```

---

### Task 3.2: Move marktplatz components

**Files:**
- Move 8 files from `src/components/market/` → `src/features/market/components/marktplatz/`

**Step 1:** Copy marktplatz components

```bash
cp src/components/market/ClubVerkaufSection.tsx src/features/market/components/marktplatz/
cp src/components/market/TransferListSection.tsx src/features/market/components/marktplatz/
cp src/components/market/PlayerIPOCard.tsx src/features/market/components/marktplatz/
cp src/components/market/ClubAccordion.tsx src/features/market/components/marktplatz/
cp src/components/market/ClubCard.tsx src/features/market/components/marktplatz/
cp src/components/market/BuyOrdersSection.tsx src/features/market/components/marktplatz/
cp src/components/market/EndingSoonStrip.tsx src/features/market/components/marktplatz/
cp src/components/market/CountdownBadge.tsx src/features/market/components/marktplatz/
cp src/components/market/LeagueBar.tsx src/features/market/components/marktplatz/
```

**Step 2:** Fix internal cross-imports in moved files

These files import from each other — update relative paths:
- `ClubVerkaufSection` imports `PlayerIPOCard`, `ClubAccordion`, `EndingSoonStrip` — change to relative `./` within marktplatz/
- `ClubAccordion` imports `ClubCard` — change to `./ClubCard`
- `TransferListSection` may import from `MarketFilters` — change to `../shared/MarketFilters`
- `BuyOrdersSection` imports `useCancelBuyOrder` from mutations — works via bridge

**Step 3:** Run tsc

```bash
npx tsc --noEmit
```

**Step 4:** Commit

```bash
git add src/features/market/components/marktplatz/
git commit -m "refactor(market): move 9 marktplatz components to feature module"
```

---

### Task 3.3: Move portfolio components (ex-manager)

**Files:**
- Move + rename: 3 main tabs from `src/components/manager/` → `src/features/market/components/portfolio/`
- Move: entire `bestand/` subfolder
- Move: supporting files (helpers, constants, types, SquadPitch, SquadSummaryStats)
- Move: `WatchlistView` from `src/components/market/`
- Create bridges at old locations

**Step 1:** Copy and rename main tabs

```bash
cp src/components/manager/ManagerKaderTab.tsx src/features/market/components/portfolio/KaderTab.tsx
cp src/components/manager/ManagerBestandTab.tsx src/features/market/components/portfolio/BestandTab.tsx
cp src/components/manager/ManagerOffersTab.tsx src/features/market/components/portfolio/OffersTab.tsx
```

**Step 2:** Copy supporting files

```bash
cp src/components/manager/helpers.ts src/features/market/components/portfolio/
cp src/components/manager/constants.ts src/features/market/components/portfolio/
cp src/components/manager/types.ts src/features/market/components/portfolio/
cp src/components/manager/SquadPitch.tsx src/features/market/components/portfolio/
cp src/components/manager/SquadSummaryStats.tsx src/features/market/components/portfolio/
cp -r src/components/manager/bestand src/features/market/components/portfolio/bestand
```

**Step 3:** Copy WatchlistView

```bash
cp src/components/market/WatchlistView.tsx src/features/market/components/portfolio/
```

**Step 4:** Fix imports in all moved files

Critical import fixes:
- `KaderTab.tsx`: rename component internally if it's `export default function ManagerKaderTab` → keep as-is for now (name doesn't affect functionality), but fix any `from './` imports to reference new paths
- `BestandTab.tsx`: imports from `./bestand/` — still works (subfolder moved together)
- `BestandTab.tsx`: imports `useMarketStore` from `@/lib/stores/marketStore` — works via bridge
- All files: any `from '../'` or `from './'` imports to other manager files → update to portfolio-relative paths

**Step 5:** Write bridges at old locations

```ts
// src/components/manager/ManagerKaderTab.tsx
export { default } from '@/features/market/components/portfolio/KaderTab';

// src/components/manager/ManagerBestandTab.tsx
export { default } from '@/features/market/components/portfolio/BestandTab';

// src/components/manager/ManagerOffersTab.tsx
export { default } from '@/features/market/components/portfolio/OffersTab';

// src/components/market/WatchlistView.tsx
export { default } from '@/features/market/components/portfolio/WatchlistView';
```

Also bridge the bestand barrel export (imported by ManagerBestandTab):
```ts
// src/components/manager/bestand/index.ts
export * from '@/features/market/components/portfolio/bestand';
```

And supporting files:
```ts
// src/components/manager/helpers.ts
export * from '@/features/market/components/portfolio/helpers';

// src/components/manager/constants.ts
export * from '@/features/market/components/portfolio/constants';

// src/components/manager/types.ts
export * from '@/features/market/components/portfolio/types';

// src/components/manager/SquadPitch.tsx
export { default } from '@/features/market/components/portfolio/SquadPitch';

// src/components/manager/SquadSummaryStats.tsx
export { default } from '@/features/market/components/portfolio/SquadSummaryStats';
```

**Step 6:** Run tsc

```bash
npx tsc --noEmit
```

This is the riskiest step — many cross-imports. Fix any errors before proceeding.

**Step 7:** Commit

```bash
git add src/features/market/components/portfolio/ src/components/manager/ src/components/market/WatchlistView.tsx
git commit -m "refactor(market): move portfolio components (ex-manager) to feature module"
```

---

### Task 3.4: Wave 3 verification

**Step 1:** Run full check

```bash
npx tsc --noEmit && npx vitest run --reporter=verbose 2>&1 | tail -30
```

**Step 2:** Verify existing manager tests still pass

```bash
npx vitest run src/components/manager/__tests__/ --reporter=verbose
```

Expected: Tests pass via bridges. If imports in test files use relative paths, those need updating.

---

## Wave 4: Orchestrator Rewrite

Rewrite page.tsx as thin wrapper + create MarketContent, PortfolioTab, MarktplatzTab.

### Task 4.1: Create TrendingSection (extracted from inline JSX)

**Files:**
- Create: `src/features/market/components/marktplatz/TrendingSection.tsx`

**Step 1:** Write the component

Extract lines 519-543 from page.tsx:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { Player } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';
import DiscoveryCard from '@/features/market/components/shared/DiscoveryCard';

type Props = {
  trending: TrendingPlayer[];
  playerMap: Map<string, Player>;
};

export default function TrendingSection({ trending, playerMap }: Props) {
  const t = useTranslations('market');

  if (trending.length === 0) {
    return (
      <EmptyState
        icon={<Zap className="size-5" />}
        title={t('trendingEmpty', { defaultMessage: 'Noch keine Trends' })}
        description={t('trendingEmptyDesc', { defaultMessage: 'Sobald gehandelt wird, siehst du hier die meistgehandelten Spieler.' })}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {trending.map(tp => {
        const player = playerMap.get(tp.playerId);
        if (!player) return null;
        return (
          <DiscoveryCard
            key={player.id}
            player={player}
            variant="trending"
            tradeCount={tp.tradeCount}
            change24h={tp.change24h}
          />
        );
      })}
    </div>
  );
}
```

**Step 2:** Commit

```bash
git add src/features/market/components/marktplatz/TrendingSection.tsx
git commit -m "feat(market): extract TrendingSection from inline JSX"
```

---

### Task 4.2: Create MarketHeader component

**Files:**
- Create: `src/features/market/components/MarketHeader.tsx`

**Step 1:** Write the component

Extract lines 373-382 from page.tsx:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Briefcase } from 'lucide-react';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';

type Props = {
  balanceCents: number;
};

export default function MarketHeader({ balanceCents }: Props) {
  const t = useTranslations('market');
  const tc = useTranslations('common');

  return (
    <div className="flex items-center justify-between">
      <h1 className="text-2xl md:text-3xl font-black flex items-center gap-3 text-balance">
        <Briefcase className="size-7 text-gold" />
        {t('title')}
      </h1>
      <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
        <span className="text-xs text-white/50">{tc('balance')}:</span>
        <span className="font-mono font-bold text-base tabular-nums text-gold">{fmtScout(centsToBsd(balanceCents))} CR</span>
      </div>
    </div>
  );
}
```

**Step 2:** Commit

```bash
git add src/features/market/components/MarketHeader.tsx
git commit -m "feat(market): extract MarketHeader component"
```

---

### Task 4.3: Create PortfolioTab component

**Files:**
- Create: `src/features/market/components/portfolio/PortfolioTab.tsx`

**Step 1:** Write the component

Extract lines 402-441 from page.tsx:

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui';
import { useMarketStore } from '@/features/market/store/marketStore';
import type { PortfolioSubTab } from '@/features/market/store/marketStore';
import type { Player, DbIpo } from '@/types';
import type { WatchlistEntry } from '@/lib/services/watchlist';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';

const KaderTab = dynamic(() => import('./KaderTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}</div>,
});
const BestandTab = dynamic(() => import('./BestandTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}</div>,
});
const OffersTab = dynamic(() => import('./OffersTab'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-24" />)}</div>,
});
const WatchlistView = dynamic(() => import('./WatchlistView'), {
  ssr: false,
  loading: () => <div className="space-y-2">{[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>,
});
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />,
});

type Props = {
  players: Player[];
  mySquadPlayers: Player[];
  holdings: Array<{ player_id: string; quantity: number }>;
  ipoList: DbIpo[];
  userId: string | undefined;
  incomingOffers: Array<{ id: string }>;
  watchlistEntries: WatchlistEntry[];
  onSell: (playerId: string, qty: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
};

export default function PortfolioTab({
  players, mySquadPlayers, holdings, ipoList, userId,
  incomingOffers, watchlistEntries, onSell, onCancelOrder,
}: Props) {
  const t = useTranslations('market');
  const { portfolioSubTab, setPortfolioSubTab } = useMarketStore();

  const subTabs: Array<{ id: PortfolioSubTab; label: string; icon: React.ReactNode | null }> = [
    { id: 'team', label: t('team'), icon: null },
    { id: 'bestand', label: t('inventory'), icon: null },
    { id: 'angebote', label: t('offers'), icon: null },
    { id: 'watchlist', label: t('watchlist'), icon: <Heart className="size-3" /> },
  ];

  return (
    <>
      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {subTabs.map(st => (
          <button
            key={st.id}
            onClick={() => setPortfolioSubTab(st.id)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px] inline-flex items-center gap-1.5',
              portfolioSubTab === st.id
                ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                : 'text-white/40 hover:text-white/60 border border-transparent'
            )}
          >
            {st.icon}
            {st.label}
          </button>
        ))}
      </div>
      {portfolioSubTab === 'team' && (
        <KaderTab players={players} ownedPlayers={mySquadPlayers} />
      )}
      {portfolioSubTab === 'bestand' && (
        <BestandTab players={players} holdings={holdings} ipoList={ipoList} userId={userId} incomingOffers={incomingOffers} onSell={onSell} onCancelOrder={onCancelOrder} />
      )}
      {portfolioSubTab === 'angebote' && (
        <OffersTab players={players} />
      )}
      {portfolioSubTab === 'watchlist' && (
        <WatchlistView players={players} watchlistEntries={watchlistEntries} />
      )}
      <SponsorBanner placement="market_top" />
      <TradingDisclaimer variant="card" />
    </>
  );
}
```

**Step 2:** Run tsc, commit

```bash
npx tsc --noEmit
git add src/features/market/components/portfolio/PortfolioTab.tsx
git commit -m "feat(market): create PortfolioTab sub-tab router"
```

---

### Task 4.4: Create MarktplatzTab component

**Files:**
- Create: `src/features/market/components/marktplatz/MarktplatzTab.tsx`

**Step 1:** Write the component

Extract lines 444-564 from page.tsx:

```tsx
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Search, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { SkeletonCard } from '@/components/ui';
import { useMarketStore } from '@/features/market/store/marketStore';
import type { KaufenSubTab, MarketTab } from '@/features/market/store/marketStore';
import type { Player, DbIpo, DbOrder } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import NewUserTip from '@/components/onboarding/NewUserTip';

const ClubVerkaufSection = dynamic(() => import('./ClubVerkaufSection'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>,
});
const TransferListSection = dynamic(() => import('./TransferListSection'), {
  ssr: false,
  loading: () => <div className="space-y-2">{[...Array(5)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}</div>,
});
const TrendingSection = dynamic(() => import('./TrendingSection'), { ssr: false });
const MarketSearch = dynamic(() => import('../shared/MarketSearch'), { ssr: false });
const BuyOrdersSection = dynamic(() => import('./BuyOrdersSection'), { ssr: false });
const SponsorBanner = dynamic(() => import('@/components/player/detail/SponsorBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-white/[0.02] animate-pulse" />,
});

type Props = {
  players: Player[];
  playerMap: Map<string, Player>;
  floorMap: Map<string, number>;
  ipoList: DbIpo[];
  announcedIpos: DbIpo[];
  endedIpos: DbIpo[];
  trending: TrendingPlayer[];
  recentOrders: DbOrder[];
  buyOrders: DbOrder[];
  holdings: Array<{ player_id: string; quantity: number }>;
  incomingOffers: Array<{ id: string }>;
  balanceCents: number;
  buyingId: string | null;
  onBuy: (playerId: string) => void;
  onIpoBuy: (playerId: string) => void;
  onCreateBuyOrder: (playerId: string) => void;
};

export default function MarktplatzTab({
  players, playerMap, floorMap, ipoList, announcedIpos, endedIpos,
  trending, recentOrders, buyOrders, holdings, incomingOffers,
  balanceCents, buyingId, onBuy, onIpoBuy, onCreateBuyOrder,
}: Props) {
  const t = useTranslations('market');
  const tt = useTranslations('tips');
  const { kaufenSubTab, setKaufenSubTab, setTab, setPortfolioSubTab } = useMarketStore();
  const [searchOpen, setSearchOpen] = useState(false);

  const getFloor = (p: Player) => floorMap.get(p.id) ?? 0;

  const subTabs: Array<{ id: KaufenSubTab; label: string }> = [
    { id: 'clubverkauf', label: t('clubSale', { defaultMessage: 'Club Verkauf' }) },
    { id: 'transferliste', label: t('transferList', { defaultMessage: 'Transferliste' }) },
    { id: 'trending', label: t('trendingTab', { defaultMessage: 'Trending' }) },
  ];

  return (
    <>
      {/* Sub-Tabs + Search toggle */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide flex-1">
          {subTabs.map(st => (
            <button
              key={st.id}
              onClick={() => { setKaufenSubTab(st.id); setSearchOpen(false); }}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px]',
                kaufenSubTab === st.id && !searchOpen
                  ? 'bg-white/[0.12] text-white border border-white/[0.15]'
                  : 'text-white/40 hover:text-white/60 border border-transparent'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSearchOpen(!searchOpen)}
          className={cn(
            'p-2 rounded-lg transition-colors min-h-[36px] flex-shrink-0',
            searchOpen ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
          )}
          aria-label={t('searchPlayers', { defaultMessage: 'Spieler suchen' })}
        >
          <Search className="size-4" aria-hidden="true" />
        </button>
      </div>

      {searchOpen && (
        <MarketSearch
          players={players}
          activeIpos={ipoList}
          sellOrders={recentOrders}
          onClose={() => setSearchOpen(false)}
        />
      )}

      <NewUserTip
        tipKey="market-first-buy"
        icon={<Zap className="size-4" />}
        title={tt('marketTitle')}
        description={tt('marketDesc')}
        show={holdings.length === 0}
      />

      {incomingOffers.length > 0 && (
        <button
          onClick={() => { setTab('portfolio'); setPortfolioSubTab('angebote'); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-gold/[0.06] border border-gold/15 rounded-xl text-xs font-bold text-gold hover:bg-gold/10 transition-colors group"
        >
          <Send className="size-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{t('pendingOffers', { defaultMessage: '{count} offene Angebote', count: incomingOffers.length })}</span>
          <span className="ml-auto text-[10px] text-gold/60 group-hover:text-gold transition-colors">{t('viewOffers', { defaultMessage: 'Anzeigen \u2192' })}</span>
        </button>
      )}

      {kaufenSubTab === 'clubverkauf' && (
        <ClubVerkaufSection
          players={players}
          activeIpos={ipoList}
          announcedIpos={announcedIpos}
          endedIpos={endedIpos}
          playerMap={playerMap}
          onIpoBuy={onIpoBuy}
          buyingId={buyingId}
          hasHoldings={holdings.length > 0}
        />
      )}
      {kaufenSubTab === 'trending' && (
        <TrendingSection trending={trending} playerMap={playerMap} />
      )}
      {kaufenSubTab === 'transferliste' && (
        <>
          <TransferListSection
            players={players}
            sellOrders={recentOrders}
            playerMap={playerMap}
            getFloor={getFloor}
            onBuy={onBuy}
            buyingId={buyingId}
            balanceCents={balanceCents}
            onCreateBuyOrder={onCreateBuyOrder}
          />
          <BuyOrdersSection buyOrders={buyOrders} playerMap={playerMap} />
        </>
      )}
      <SponsorBanner placement="market_top" />
      <TradingDisclaimer variant="card" />
    </>
  );
}
```

**Step 2:** Run tsc, commit

```bash
npx tsc --noEmit
git add src/features/market/components/marktplatz/MarktplatzTab.tsx
git commit -m "feat(market): create MarktplatzTab sub-tab router"
```

---

### Task 4.5: Create MarketContent orchestrator

**Files:**
- Create: `src/features/market/components/MarketContent.tsx`

**Step 1:** Write the orchestrator (~150 LOC)

This replaces 606 LOC page.tsx. All logic is in hooks, all rendering in tab components:

```tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { TabPanel, ErrorState, Skeleton, SkeletonCard } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useMarketStore } from '@/features/market/store/marketStore';
import type { MarketTab } from '@/features/market/store/marketStore';
import { useMarketData } from '@/features/market/hooks/useMarketData';
import { useTradeActions } from '@/features/market/hooks/useTradeActions';
import { useWatchlistActions } from '@/features/market/hooks/useWatchlistActions';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { GeoGate } from '@/components/geo/GeoGate';
import dynamic from 'next/dynamic';
import type { Player } from '@/types';

import MarketHeader from './MarketHeader';
import PortfolioTab from './portfolio/PortfolioTab';
import MarktplatzTab from './marktplatz/MarktplatzTab';

const TradeSuccessCard = dynamic(() => import('./shared/TradeSuccessCard'), { ssr: false });
const BuyConfirmModal = dynamic(() => import('./shared/BuyConfirmModal'), { ssr: false });
const BuyOrderModal = dynamic(() => import('./shared/BuyOrderModal'), { ssr: false });

// ── Tab config ──
const TAB_IDS: MarketTab[] = ['portfolio', 'marktplatz'];
const TAB_ALIAS: Record<string, MarketTab> = {
  kader: 'portfolio', bestand: 'portfolio', offers: 'portfolio', watchlist: 'portfolio',
  compare: 'marktplatz', spieler: 'marktplatz', transferlist: 'marktplatz',
  scouting: 'marktplatz', kaufen: 'marktplatz',
};
const VALID_TABS = new Set<string>(TAB_IDS);

// ── Skeleton ──
function MarketSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-44 rounded-xl" />
      </div>
      <Skeleton className="h-[52px] rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[...Array(8)].map((_, i) => (
          <SkeletonCard key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}

export default function MarketContent() {
  const { user } = useUser();
  const wallet = useWallet();
  const balanceCents = wallet.balanceCents ?? 0;
  const searchParams = useSearchParams();
  const t = useTranslations('market');
  const tc = useTranslations('common');

  // ── Store ──
  const { tab, setTab } = useMarketStore();

  // ── Hooks ──
  const data = useMarketData(user?.id);
  const trade = useTradeActions(user?.id, data.ipoList);
  useWatchlistActions(user?.id, data.watchlistMap);

  // ── URL sync (once on mount) ──
  const tabSyncedRef = useRef(false);
  useEffect(() => {
    if (tabSyncedRef.current) return;
    tabSyncedRef.current = true;
    const initial = searchParams.get('tab');
    if (initial) {
      if (VALID_TABS.has(initial)) setTab(initial as MarketTab);
      else if (TAB_ALIAS[initial]) setTab(TAB_ALIAS[initial]);
    }
  }, [searchParams, setTab]);

  // ── Tab labels ──
  const TAB_LABELS: Record<MarketTab, string> = {
    portfolio: t('myRoster'),
    marktplatz: t('marktplatzTab'),
  };
  const tabs = TAB_IDS.map(id => ({ id, label: TAB_LABELS[id] }));

  // ── Buy order modal helper ──
  const handleCreateBuyOrder = useCallback((playerId: string) => {
    const p = data.playerMap.get(playerId);
    if (p) trade.setBuyOrderPlayer(p);
  }, [data.playerMap, trade]);

  // ── Loading / Error ──
  if (data.playersLoading) return <MarketSkeleton />;
  if (data.playersError && data.players.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto py-12">
        <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
      </div>
    );
  }

  return (
    <GeoGate feature="dpc_trading">
    <div className="max-w-[1400px] mx-auto space-y-5">
      {/* Trade Success */}
      {(trade.buyIsSuccess || trade.ipoBuyIsSuccess) && trade.lastBoughtId && (() => {
        const player = data.playerMap.get(trade.lastBoughtId);
        if (!player) return null;
        const qty = trade.buyIsSuccess ? (trade.buyVars?.quantity ?? 1) : (trade.ipoBuyVars?.quantity ?? 1);
        const source = trade.ipoBuyIsSuccess ? 'ipo' as const : 'market' as const;
        const reset = trade.buyIsSuccess ? trade.resetBuy : trade.resetIpoBuy;
        return (
          <TradeSuccessCard
            player={player}
            quantity={qty}
            oldBalanceCents={trade.balanceBeforeBuyRef.current}
            newBalanceCents={balanceCents}
            source={source}
            onDismiss={reset}
          />
        );
      })()}

      {/* Buy Error */}
      {trade.buyError && (
        <div role="alert" aria-live="assertive" className="fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-3 anim-scale-pop">
          <span>{trade.buyError}</span>
          <button onClick={() => { trade.resetBuy(); trade.resetIpoBuy(); }} aria-label={tc('closeLabel')} className="p-1 rounded-lg hover:bg-red-500/20 transition-colors flex-shrink-0">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <MarketHeader balanceCents={balanceCents} />

      {/* Main Tabs */}
      <div className="flex gap-1 rounded-xl bg-white/[0.04] border border-white/[0.08] p-1">
        {tabs.map(tb => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id as MarketTab)}
            className={cn(
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors min-h-[44px]',
              tab === tb.id
                ? 'bg-white/[0.10] text-white'
                : 'text-white/50 hover:text-white/70'
            )}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Portfolio Tab */}
      <TabPanel id="portfolio" activeTab={tab}>
        <PortfolioTab
          players={data.players}
          mySquadPlayers={data.mySquadPlayers}
          holdings={data.holdings}
          ipoList={data.ipoList}
          userId={user?.id}
          incomingOffers={data.incomingOffers}
          watchlistEntries={data.watchlistEntries}
          onSell={trade.handleSell}
          onCancelOrder={trade.handleCancelOrder}
        />
      </TabPanel>

      {/* Marktplatz Tab */}
      <TabPanel id="marktplatz" activeTab={tab}>
        <MarktplatzTab
          players={data.players}
          playerMap={data.playerMap}
          floorMap={data.floorMap}
          ipoList={data.ipoList}
          announcedIpos={data.announcedIpos}
          endedIpos={data.endedIpos}
          trending={data.trending}
          recentOrders={data.recentOrders}
          buyOrders={data.buyOrders}
          holdings={data.holdings}
          incomingOffers={data.incomingOffers}
          balanceCents={balanceCents}
          buyingId={trade.buyingId}
          onBuy={trade.handleBuy}
          onIpoBuy={trade.handleIpoBuy}
          onCreateBuyOrder={handleCreateBuyOrder}
        />
      </TabPanel>

      {/* Buy Confirmation Modal */}
      {trade.pendingBuy && (() => {
        const player = data.playerMap.get(trade.pendingBuy.playerId);
        if (!player) return null;
        const isIpo = trade.pendingBuy.source === 'ipo';
        const ipo = isIpo ? data.ipoList.find(i => i.player_id === trade.pendingBuy!.playerId) : null;
        const floorCents = isIpo && ipo
          ? ipo.price
          : (player.listings.length > 0 ? Math.min(...player.listings.map(l => l.price)) : Math.round((player.prices.floor ?? 0) * 100));
        const ipoRemaining = ipo ? ipo.total_offered - ipo.sold : 0;
        const ipoProgress = ipo ? (ipo.sold / ipo.total_offered) * 100 : 0;
        const maxQty = isIpo && ipo ? Math.min(ipo.max_per_user, ipoRemaining) : 1;

        return (
          <BuyConfirmModal
            open
            onClose={() => trade.setPendingBuy(null)}
            player={player}
            source={trade.pendingBuy.source}
            priceCents={floorCents}
            maxQty={maxQty}
            balanceCents={balanceCents}
            isPending={trade.buyPending || trade.ipoBuyPending}
            onConfirm={trade.executeBuy}
            ipoProgress={isIpo ? ipoProgress : undefined}
            ipoRemaining={isIpo ? ipoRemaining : undefined}
          />
        );
      })()}

      {/* Buy Order Modal */}
      <BuyOrderModal
        player={trade.buyOrderPlayer}
        open={trade.buyOrderPlayer !== null}
        onClose={() => trade.setBuyOrderPlayer(null)}
      />
    </div>
    </GeoGate>
  );
}
```

**Step 2:** Run tsc

```bash
npx tsc --noEmit
```

**Step 3:** Commit

```bash
git add src/features/market/components/MarketContent.tsx
git commit -m "feat(market): create MarketContent thin orchestrator (~160 LOC)"
```

---

### Task 4.6: Rewrite page.tsx as thin wrapper

**Files:**
- Modify: `src/app/(app)/market/page.tsx`

**Step 1:** Replace entire file with:

```tsx
'use client';

import MarketContent from '@/features/market/components/MarketContent';

export default function MarketPage() {
  return <MarketContent />;
}
```

**Step 2:** Run tsc

```bash
npx tsc --noEmit
```

**Step 3:** Commit

```bash
git add src/app/\(app\)/market/page.tsx
git commit -m "refactor(market): rewrite page.tsx as thin wrapper (606→5 LOC)"
```

---

### Task 4.7: Wave 4 verification

**Step 1:** Run tsc + tests

```bash
npx tsc --noEmit && npx vitest run --reporter=verbose 2>&1 | tail -30
```

**Step 2:** Verify Market page renders (manual or Playwright if available)

At this point the Market page should render identically to before. All logic is in hooks, all components are in feature module.

---

## Wave 5: Tests

Write tests for the 3 new hooks and 2 tab router components.

### Task 5.1: Write useMarketData tests

**Files:**
- Create: `src/features/market/hooks/__tests__/useMarketData.test.ts`

**Test cases:**
1. Returns playersLoading=true when query is loading
2. Returns derived playerMap with correct entries
3. Returns derived floorMap with correct floor prices
4. Returns derived watchlistMap from watchlist entries
5. Returns derived mySquadPlayers (only owned, not liquidated)
6. Tab-gated queries not called when tab !== 'marktplatz'

Use `renderHook` with QueryClientProvider wrapper. Mock service functions via `vi.mock`.

---

### Task 5.2: Write useTradeActions tests

**Files:**
- Create: `src/features/market/hooks/__tests__/useTradeActions.test.ts`

**Test cases:**
1. handleBuy sets pendingBuy with source 'market'
2. handleIpoBuy sets pendingBuy with source 'ipo'
3. executeBuy calls doBuy for market source
4. executeBuy calls doIpoBuy with ipoId for ipo source
5. executeBuy clears pendingBuy after execution
6. handleSell returns success on placeSellOrder success
7. handleSell returns error on placeSellOrder failure
8. handleCancelOrder returns success on cancelOrder success
9. buyError auto-dismisses after 5 seconds

---

### Task 5.3: Write useWatchlistActions tests

**Files:**
- Create: `src/features/market/hooks/__tests__/useWatchlistActions.test.ts`

**Test cases:**
1. toggleWatch adds entry for unwatched player (optimistic)
2. toggleWatch removes entry for watched player (optimistic)
3. toggleWatch reverts on server error
4. localStorage migration runs once on mount

---

### Task 5.4: Write MarketContent tests

**Files:**
- Create: `src/features/market/components/__tests__/MarketContent.test.tsx`

**Test cases:**
1. Shows MarketSkeleton when loading
2. Shows ErrorState when error and no data
3. Renders portfolio tab by default
4. Renders marktplatz tab when tab='marktplatz'
5. Renders BuyConfirmModal when pendingBuy is set
6. Shows buy error alert when buyError is set

Mock the 3 hooks to control state.

---

### Task 5.5: Update existing test imports

**Files:**
- Modify: All test files in `src/components/market/__tests__/` and `src/components/manager/__tests__/`

Update import paths to point to new feature module locations. Run each test file individually to verify.

---

### Task 5.6: Wave 5 verification

**Step 1:** Run all tests

```bash
npx vitest run --reporter=verbose 2>&1 | tail -40
```

**Step 2:** Commit all tests

```bash
git add src/features/market/hooks/__tests__/ src/features/market/components/__tests__/
git commit -m "test(market): add hook + component tests for Market feature module"
```

---

## Wave 6: Cleanup

Remove old files that are now bridges, clean up dead code.

### Task 6.1: Verify all bridges are working

**Step 1:** List all bridge files and verify each one has exactly 1-3 export lines:

```bash
wc -l src/lib/queries/{ipos,trending,priceHist,watchlist,offers}.ts \
      src/lib/mutations/trading.ts \
      src/lib/stores/marketStore.ts \
      src/components/manager/Manager{Kader,Bestand,Offers}Tab.tsx
```

Each should be 1-5 lines (just re-exports).

### Task 6.2: Remove old component files that have NO external consumers

Files in `src/components/market/` that are ONLY imported by the old page.tsx (now rewritten):
- `BuyConfirmModal.tsx` — now in shared/, old file can become bridge or be deleted
- `TradeSuccessCard.tsx` — same
- `BuyOrderModal.tsx` — same
- `MarketSearch.tsx` — same
- `BuyOrdersSection.tsx` — same
- `ClubVerkaufSection.tsx` — same
- `TransferListSection.tsx` — same
- `PlayerIPOCard.tsx` — same
- `ClubAccordion.tsx` — same
- `ClubCard.tsx` — same
- `EndingSoonStrip.tsx` — same
- `CountdownBadge.tsx` — same
- `LeagueBar.tsx` — same
- `MarketFilters.tsx` — same
- `OrderDepthView.tsx` — same

**BEFORE DELETING:** Run `grep -r "from '@/components/market/" src/ --include='*.ts' --include='*.tsx'` to confirm no external consumers remain besides bridges.

Replace each with a bridge to feature module, or delete if no external consumer exists.

### Task 6.3: Final verification

```bash
npx tsc --noEmit && npx vitest run --reporter=verbose
```

### Task 6.4: Final commit

```bash
git add -A
git commit -m "refactor(market): complete Market feature module migration"
```

---

## Summary

| Wave | Tasks | Estimated LOC Changed | Risk |
|------|-------|----------------------|------|
| 1: Foundation | 1.1-1.5 | ~400 (move + cleanup) | Low (bridges prevent breakage) |
| 2: Hooks | 2.1-2.4 | ~270 (new files) | Low (standalone, not wired) |
| 3: Components | 3.1-3.4 | ~4,800 (move + bridges) | Medium (many cross-imports) |
| 4: Orchestrator | 4.1-4.7 | ~500 new, -606 old | High (wires everything) |
| 5: Tests | 5.1-5.6 | ~400 (new tests) | Low |
| 6: Cleanup | 6.1-6.4 | -200 (remove old files) | Low |

**Total new code:** ~1,170 LOC (hooks + orchestrator + tabs + tests)
**Total removed from page.tsx:** ~600 LOC
**Total moved:** ~5,200 LOC (components + queries + mutations + store)
**Net result:** More files, same total LOC, dramatically better structure

**Workflow rules:**
- tsc after EVERY task, not just per wave
- Coupled tasks (Wave 2 + Wave 4) → do yourself
- Isolated tasks (Wave 3 component moves, Wave 5 tests) → can use agents
- 1 review per wave (dispatch reviewer agent)
