import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Player } from '@/types';

// ============================================
// Mocks — all query hooks + Zustand store
// ============================================

let mockTab = 'portfolio';
vi.mock('@/features/market/store/marketStore', () => ({
  useMarketStore: (selector: (s: { tab: string }) => string) => selector({ tab: mockTab }),
}));

const mockEnrichedPlayers = vi.fn().mockReturnValue({ data: [] as Player[], isLoading: true, isError: false });
const mockHoldings = vi.fn().mockReturnValue({ data: [] });
const mockAllOpenOrders = vi.fn().mockReturnValue({ data: [] });
const mockAllOpenBuyOrders = vi.fn().mockReturnValue({ data: [] });

vi.mock('@/lib/queries', () => ({
  useEnrichedPlayers: (uid: unknown) => mockEnrichedPlayers(uid),
  useHoldings: (uid: unknown) => mockHoldings(uid),
  useAllOpenOrders: () => mockAllOpenOrders(),
  useAllOpenBuyOrders: () => mockAllOpenBuyOrders(),
}));

const mockActiveIpos = vi.fn().mockReturnValue({ data: [] });
const mockAnnouncedIpos = vi.fn().mockReturnValue({ data: [] });
const mockRecentlyEndedIpos = vi.fn().mockReturnValue({ data: [] });

vi.mock('@/features/market/queries/ipos', () => ({
  useActiveIpos: () => mockActiveIpos(),
  useAnnouncedIpos: () => mockAnnouncedIpos(),
  useRecentlyEndedIpos: () => mockRecentlyEndedIpos(),
}));

const mockTrendingPlayers = vi.fn().mockReturnValue({ data: [] });
vi.mock('@/features/market/queries/trending', () => ({
  useTrendingPlayers: () => mockTrendingPlayers(),
}));

const mockAllPriceHistories = vi.fn().mockReturnValue({ data: undefined });
vi.mock('@/features/market/queries/priceHist', () => ({
  useAllPriceHistories: () => mockAllPriceHistories(),
}));

const mockWatchlist = vi.fn().mockReturnValue({ data: [] });
vi.mock('@/features/market/queries/watchlist', () => ({
  useWatchlist: (uid: unknown) => mockWatchlist(uid),
}));

const mockIncomingOffers = vi.fn().mockReturnValue({ data: [] });
const mockOpenBids = vi.fn().mockReturnValue({ data: [] });
vi.mock('@/features/market/queries/offers', () => ({
  useIncomingOffers: (uid: unknown) => mockIncomingOffers(uid),
  useOpenBids: () => mockOpenBids(),
}));

// Import AFTER mocks are set up
import { useMarketData } from '@/features/market/hooks/useMarketData';

// ============================================
// Test helpers
// ============================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

/** Minimal Player factory — only the fields the hook's derived values inspect */
function makePlayer(overrides: Partial<Player> & { id: string }): Player {
  return {
    ticket: 1,
    first: 'Test',
    last: 'Player',
    club: 'TestFC',
    pos: 'MID',
    status: 'fit',
    age: 25,
    country: 'DE',
    contractMonthsLeft: 12,
    perf: { l5: 70, l15: 68, l5Apps: 5, l15Apps: 12, season: 69, trend: 'UP' },
    stats: { matches: 20, goals: 5, assists: 3, cleanSheets: 0, minutes: 1500, saves: 0 },
    ipo: { status: 'none' },
    listings: [],
    topOwners: [],
    lastAppearanceGw: 28,
    gwGap: 0,
    ...overrides,
    prices: { lastTrade: 1000, change24h: 5, floor: undefined, referencePrice: undefined, ...overrides.prices },
    dpc: { supply: 300, float: 200, circulation: 150, onMarket: 10, owned: 0, ...overrides.dpc },
  };
}

// ============================================
// Tests
// ============================================

describe('useMarketData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTab = 'portfolio';
    // Reset to loading state
    mockEnrichedPlayers.mockReturnValue({ data: [] as Player[], isLoading: true, isError: false });
    mockHoldings.mockReturnValue({ data: [] });
    mockAllOpenOrders.mockReturnValue({ data: [] });
    mockAllOpenBuyOrders.mockReturnValue({ data: [] });
    mockActiveIpos.mockReturnValue({ data: [] });
    mockAnnouncedIpos.mockReturnValue({ data: [] });
    mockRecentlyEndedIpos.mockReturnValue({ data: [] });
    mockTrendingPlayers.mockReturnValue({ data: [] });
    mockAllPriceHistories.mockReturnValue({ data: undefined });
    mockWatchlist.mockReturnValue({ data: [] });
    mockIncomingOffers.mockReturnValue({ data: [] });
  });

  // ── Test 1: Loading state ──

  it('returns playersLoading=true when enriched players are still loading', () => {
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: true, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.playersLoading).toBe(true);
    expect(result.current.players).toEqual([]);
  });

  it('returns playersError=true when enriched players query fails', () => {
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: false, isError: true });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.playersError).toBe(true);
  });

  // ── Test 2: Players array when loaded ──

  it('returns players array when data is loaded', () => {
    const p1 = makePlayer({ id: 'p1', first: 'Lionel', last: 'Messi' });
    const p2 = makePlayer({ id: 'p2', first: 'Cristiano', last: 'Ronaldo' });
    mockEnrichedPlayers.mockReturnValue({ data: [p1, p2], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.playersLoading).toBe(false);
    expect(result.current.players).toHaveLength(2);
    expect(result.current.players[0].id).toBe('p1');
    expect(result.current.players[1].id).toBe('p2');
  });

  it('merges price history into players when priceHistMap has entries with length >= 2', () => {
    const p1 = makePlayer({ id: 'p1' });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const histMap = new Map<string, number[]>();
    histMap.set('p1', [100, 110, 120]);
    mockAllPriceHistories.mockReturnValue({ data: histMap });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.players[0].prices.history7d).toEqual([100, 110, 120]);
  });

  it('does NOT merge price history when hist has fewer than 2 entries', () => {
    const p1 = makePlayer({ id: 'p1', prices: { lastTrade: 1000, change24h: 5, history7d: [50] } });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const histMap = new Map<string, number[]>();
    histMap.set('p1', [100]); // only 1 entry — should not replace
    mockAllPriceHistories.mockReturnValue({ data: histMap });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    // Original history7d preserved (the enriched player had [50])
    expect(result.current.players[0].prices.history7d).toEqual([50]);
  });

  it('returns enrichedPlayers unchanged when priceHistMap is undefined', () => {
    const p1 = makePlayer({ id: 'p1' });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });
    mockAllPriceHistories.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.players).toEqual([p1]);
  });

  it('returns enrichedPlayers unchanged when priceHistMap is empty', () => {
    const p1 = makePlayer({ id: 'p1' });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });
    mockAllPriceHistories.mockReturnValue({ data: new Map() });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.players).toEqual([p1]);
  });

  // ── Test 3: playerMap ──

  it('computes playerMap as a Map keyed by player id', () => {
    const p1 = makePlayer({ id: 'p1' });
    const p2 = makePlayer({ id: 'p2' });
    mockEnrichedPlayers.mockReturnValue({ data: [p1, p2], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.playerMap).toBeInstanceOf(Map);
    expect(result.current.playerMap.size).toBe(2);
    expect(result.current.playerMap.get('p1')?.id).toBe('p1');
    expect(result.current.playerMap.get('p2')?.id).toBe('p2');
    expect(result.current.playerMap.get('nonexistent')).toBeUndefined();
  });

  it('returns empty playerMap when no players loaded', () => {
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.playerMap.size).toBe(0);
  });

  // ── Test 4: floorMap ──

  it('floorMap uses min listing price when player has listings', () => {
    const p1 = makePlayer({
      id: 'p1',
      listings: [
        { id: 'l1', isOwn: false, sellerHandle: 's1', sellerName: 'Seller1', price: 500, expiresAt: 0 },
        { id: 'l2', isOwn: false, sellerHandle: 's2', sellerName: 'Seller2', price: 300, expiresAt: 0 },
        { id: 'l3', isOwn: false, sellerHandle: 's3', sellerName: 'Seller3', price: 700, expiresAt: 0 },
      ],
    });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.floorMap.get('p1')).toBe(300);
  });

  it('floorMap falls back to prices.floor when no listings', () => {
    const p1 = makePlayer({
      id: 'p1',
      listings: [],
      prices: { lastTrade: 1000, change24h: 5, floor: 450, referencePrice: 600 },
    });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.floorMap.get('p1')).toBe(450);
  });

  // NOTE: Slice 008 (B-01, 2026-04-17) removed the `?? p.prices.referencePrice`
  // fallback from useMarketData's floorMap — it was dead code post-enrichment
  // (enrichPlayersWithData in enriched.ts:74 always sets `prices.floor` to a
  // number: `floorFromOrders ?? p.prices.floor ?? p.prices.ipoPrice ?? 0`).
  // The canonical chain is now: live Math.min → enriched `prices.floor` → 0.
  it('floorMap falls back to 0 when floor is undefined (no live listings, no enriched floor)', () => {
    const p1 = makePlayer({
      id: 'p1',
      listings: [],
      prices: { lastTrade: 1000, change24h: 5, floor: undefined, referencePrice: 800 },
    });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    // referencePrice is no longer consulted — useMarketData relies on enriched
    // `prices.floor` being present. This is a defensive fallback for malformed data.
    expect(result.current.floorMap.get('p1')).toBe(0);
  });

  it('getFloor helper returns floor for a player', () => {
    const p1 = makePlayer({
      id: 'p1',
      listings: [{ id: 'l1', isOwn: false, sellerHandle: 's1', sellerName: 'S', price: 250, expiresAt: 0 }],
    });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.getFloor(p1)).toBe(250);
  });

  it('getFloor returns 0 for an unknown player', () => {
    const unknown = makePlayer({ id: 'unknown-id' });
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.getFloor(unknown)).toBe(0);
  });

  // ── Test 5: watchlistMap ──

  it('computes watchlistMap from watchlist entries', () => {
    mockWatchlist.mockReturnValue({
      data: [
        { id: 'w1', playerId: 'p1', alertThresholdPct: 10, alertDirection: 'up', lastAlertPrice: 0, createdAt: '' },
        { id: 'w2', playerId: 'p3', alertThresholdPct: 5, alertDirection: 'both', lastAlertPrice: 0, createdAt: '' },
      ],
    });
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.watchlistMap).toEqual({ p1: true, p3: true });
    expect(result.current.watchlistMap['p2']).toBeUndefined();
  });

  it('returns empty watchlistMap when user has no watchlist entries', () => {
    mockWatchlist.mockReturnValue({ data: [] });
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.watchlistMap).toEqual({});
  });

  // ── Test 6: mySquadPlayers ──

  it('mySquadPlayers includes only players with owned > 0 and not liquidated', () => {
    const owned = makePlayer({ id: 'p1', dpc: { supply: 300, float: 200, circulation: 150, onMarket: 10, owned: 5 } });
    const notOwned = makePlayer({ id: 'p2', dpc: { supply: 300, float: 200, circulation: 150, onMarket: 10, owned: 0 } });
    const liquidated = makePlayer({ id: 'p3', dpc: { supply: 300, float: 200, circulation: 150, onMarket: 10, owned: 3 }, isLiquidated: true });
    const ownedNotLiquidated = makePlayer({ id: 'p4', dpc: { supply: 300, float: 200, circulation: 150, onMarket: 10, owned: 1 }, isLiquidated: false });

    mockEnrichedPlayers.mockReturnValue({ data: [owned, notOwned, liquidated, ownedNotLiquidated], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    const squadIds = result.current.mySquadPlayers.map(p => p.id);
    expect(squadIds).toContain('p1');
    expect(squadIds).toContain('p4');
    expect(squadIds).not.toContain('p2');
    expect(squadIds).not.toContain('p3');
    expect(result.current.mySquadPlayers).toHaveLength(2);
  });

  it('mySquadPlayers is empty when no players are owned', () => {
    const p1 = makePlayer({ id: 'p1', dpc: { supply: 300, float: 200, circulation: 150, onMarket: 10, owned: 0 } });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.mySquadPlayers).toHaveLength(0);
  });

  it('mySquadPlayers excludes player with owned > 0 but isLiquidated undefined (treated as falsy)', () => {
    // isLiquidated is optional (undefined) — `!undefined` is true, so player SHOULD be included
    const p1 = makePlayer({ id: 'p1', dpc: { supply: 300, float: 200, circulation: 150, onMarket: 10, owned: 2 } });
    // Explicitly ensure isLiquidated is not set (default from makePlayer is undefined)
    delete (p1 as Record<string, unknown>).isLiquidated;

    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.mySquadPlayers).toHaveLength(1);
    expect(result.current.mySquadPlayers[0].id).toBe('p1');
  });

  // ── Edge cases ──

  it('handles userId=undefined gracefully (passes to query hooks)', () => {
    const { result } = renderHook(() => useMarketData(undefined), { wrapper: createWrapper() });

    expect(result.current.players).toEqual([]);
    // Verify hooks were called with undefined
    expect(mockEnrichedPlayers).toHaveBeenCalledWith(undefined);
    expect(mockHoldings).toHaveBeenCalledWith(undefined);
    expect(mockWatchlist).toHaveBeenCalledWith(undefined);
    expect(mockIncomingOffers).toHaveBeenCalledWith(undefined);
  });

  it('floorMap handles player with single listing correctly', () => {
    const p1 = makePlayer({
      id: 'p1',
      listings: [{ id: 'l1', isOwn: false, sellerHandle: 's1', sellerName: 'S', price: 999, expiresAt: 0 }],
    });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.floorMap.get('p1')).toBe(999);
  });

  // ── Passthrough values ──

  it('passes through holdings, ipoList, recentOrders, and incomingOffers from query hooks', () => {
    const fakeHoldings = [{ id: 'h1', player_id: 'p1', quantity: 5 }];
    const fakeIpos = [{ id: 'ipo1' }];
    const fakeOrders = [{ id: 'o1' }];
    const fakeOffers = [{ id: 'of1' }];

    mockHoldings.mockReturnValue({ data: fakeHoldings });
    mockActiveIpos.mockReturnValue({ data: fakeIpos });
    mockAllOpenOrders.mockReturnValue({ data: fakeOrders });
    mockIncomingOffers.mockReturnValue({ data: fakeOffers });
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.holdings).toBe(fakeHoldings);
    expect(result.current.ipoList).toBe(fakeIpos);
    expect(result.current.recentOrders).toBe(fakeOrders);
    expect(result.current.incomingOffers).toBe(fakeOffers);
  });

  it('passes through watchlistEntries from query hooks', () => {
    const fakeEntries = [
      { id: 'w1', playerId: 'p1', alertThresholdPct: 10, alertDirection: 'up' as const, lastAlertPrice: 0, createdAt: '' },
    ];
    mockWatchlist.mockReturnValue({ data: fakeEntries });
    mockEnrichedPlayers.mockReturnValue({ data: [], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.watchlistEntries).toBe(fakeEntries);
  });

  // ── Regression: null guard on optional numeric fields (common-errors.md) ──

  it('floorMap does not produce NaN when prices.floor is null-ish and referencePrice is 0', () => {
    const p1 = makePlayer({
      id: 'p1',
      listings: [],
      prices: { lastTrade: 1000, change24h: 5, floor: undefined, referencePrice: 0 },
    });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    const floorVal = result.current.floorMap.get('p1');
    expect(floorVal).toBe(0);
    expect(Number.isNaN(floorVal)).toBe(false);
  });

  // ── Regression: Math.min with empty spread ──
  // If listings is somehow an empty-but-truthy-length array after a filter,
  // Math.min(...[]) returns Infinity. This tests the guard: listings.length > 0.

  it('floorMap does not return Infinity (empty listings uses fallback)', () => {
    const p1 = makePlayer({
      id: 'p1',
      listings: [],
      prices: { lastTrade: 1000, change24h: 5, floor: 100 },
    });
    mockEnrichedPlayers.mockReturnValue({ data: [p1], isLoading: false, isError: false });

    const { result } = renderHook(() => useMarketData('user-1'), { wrapper: createWrapper() });

    expect(result.current.floorMap.get('p1')).toBe(100);
    expect(result.current.floorMap.get('p1')).not.toBe(Infinity);
  });
});
