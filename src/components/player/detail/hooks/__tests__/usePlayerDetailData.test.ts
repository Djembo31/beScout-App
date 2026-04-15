import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// ============================================
// Mocks — ALL query modules
// ============================================

const mockRefetch = vi.fn();

vi.mock('@/lib/queries/players', () => ({
  useDbPlayerById: vi.fn(() => ({ data: undefined, isLoading: true, isError: false, refetch: mockRefetch })),
  usePlayerPercentiles: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/lib/queries/misc', () => ({
  usePlayerGwScores: vi.fn(() => ({ data: undefined })),
  usePlayerMatchTimeline: vi.fn(() => ({ data: undefined, isLoading: false })),
  usePbtForPlayer: vi.fn(() => ({ data: undefined })),
  useLiquidationEvent: vi.fn(() => ({ data: undefined })),
  useIpoForPlayer: vi.fn(() => ({ data: undefined })),
  useHoldingQty: vi.fn(() => ({ data: undefined })),
  usePlayerHolderCount: vi.fn(() => ({ data: undefined })),
  useWatcherCount: vi.fn(() => ({ data: undefined })),
  useSellOrders: vi.fn(() => ({ data: undefined })),
  useOpenBids: vi.fn(() => ({ data: undefined })),
  usePosts: vi.fn(() => ({ data: undefined })),
  useUserIpoPurchases: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/lib/queries/research', () => ({
  usePlayerResearch: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/lib/queries/trades', () => ({
  usePlayerTrades: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

vi.mock('@/lib/queries/events', () => ({
  useHoldingLocks: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/lib/queries/mastery', () => ({
  useDpcMastery: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/lib/queries/watchlist', () => ({
  useWatchlist: vi.fn(() => ({ data: undefined })),
}));

vi.mock('@/lib/services/profiles', () => ({
  getProfilesByIds: vi.fn(() => Promise.resolve({})),
}));

vi.mock('@/lib/services/players', () => ({
  dbToPlayer: vi.fn((db: Record<string, unknown>) => ({
    id: db.id,
    first: db.first_name,
    last: db.last_name,
    pos: db.position,
    club: db.club,
    clubId: db.club_id,
    imageUrl: db.image_url,
    shirtNumber: db.shirt_number,
    nationality: db.nationality,
    age: db.age,
    isLiquidated: db.is_liquidated,
    prices: {
      floor: db.floor_price,
      change24h: db.price_change_24h,
      lastTrade: db.last_trade_price,
      initial: db.initial_price,
    },
    perf: {
      l5: db.l5_score,
      l15: db.l15_score,
      trend: db.trend,
    },
    dpc: {
      available: db.dpc_available,
      total: db.dpc_total,
      owned: 0,
    },
    pbt: null,
    stats: {
      goals: db.goals,
      assists: db.assists,
      appearances: db.appearances,
    },
  })),
  centsToBsd: vi.fn((c: number) => c / 100),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

// ============================================
// Import after mocks
// ============================================

import { usePlayerDetailData } from '../usePlayerDetailData';
import { useDbPlayerById, usePlayerPercentiles } from '@/lib/queries/players';
import {
  usePlayerGwScores,
  useOpenBids,
  usePbtForPlayer,
  useHoldingQty,
  usePlayerHolderCount,
  useSellOrders,
  usePlayerMatchTimeline,
} from '@/lib/queries/misc';
import { usePlayerTrades } from '@/lib/queries/trades';
import { useDpcMastery } from '@/lib/queries/mastery';

// ============================================
// Test wrapper
// ============================================

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

// ============================================
// Fixtures
// ============================================

const PLAYER_ID = 'p-123';
const USER_ID = 'u-456';

const mockDbPlayer = {
  id: PLAYER_ID,
  first_name: 'Hakan',
  last_name: 'Calhanoglu',
  position: 'MID',
  club: 'Sakaryaspor',
  club_id: 'club-1',
  image_url: null,
  shirt_number: 10,
  nationality: 'TR',
  age: 30,
  dpc_available: 200,
  dpc_total: 300,
  floor_price: 5000,
  price_change_24h: 2.5,
  l5_score: 72,
  l15_score: 68,
  trend: 'up' as const,
  status: 'active',
  is_liquidated: false,
  initial_price: 1000,
  total_traded: 50,
  last_trade_price: 4800,
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  transfer_value_eur: null,
  transfer_date: null,
  goals: 5,
  assists: 3,
  clean_sheets: 0,
  minutes_played: 2700,
  yellow_cards: 2,
  red_cards: 0,
  saves: 0,
  appearances: 30,
  rating_avg: 7.2,
  external_id: null,
};

// ============================================
// Tests
// ============================================

describe('usePlayerDetailData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns loading state when player query is loading', () => {
    const { result } = renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'trading'),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.player).toBeNull();
    expect(result.current.playerWithOwnership).toBeNull();
  });

  it('returns correct defaults when queries return undefined', () => {
    const { result } = renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'trading'),
      { wrapper: createWrapper() },
    );

    expect(result.current.holdingQty).toBe(0);
    expect(result.current.holderCount).toBe(0);
    expect(result.current.allSellOrders).toEqual([]);
    expect(result.current.openBids).toEqual([]);
    expect(result.current.trades).toEqual([]);
    expect(result.current.playerResearch).toEqual([]);
    expect(result.current.playerPosts).toEqual([]);
    expect(result.current.userIpoPurchased).toBe(0);
    expect(result.current.gwScores).toEqual([]);
    expect(result.current.matchTimelineData).toEqual([]);
    expect(result.current.profileMap).toEqual({});
    expect(result.current.dpcAvailable).toBe(0);
  });

  it('maps dbPlayer to Player when data is available', () => {
    vi.mocked(useDbPlayerById).mockReturnValue({
      data: mockDbPlayer,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useDbPlayerById>);

    const { result } = renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'trading'),
      { wrapper: createWrapper() },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.player).not.toBeNull();
    expect(result.current.player?.first).toBe('Hakan');
    expect(result.current.player?.last).toBe('Calhanoglu');
    expect(result.current.dpcAvailable).toBe(200);
  });

  it('builds playerWithOwnership with PBT transformation', () => {
    vi.mocked(useDbPlayerById).mockReturnValue({
      data: mockDbPlayer,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useDbPlayerById>);

    vi.mocked(useHoldingQty).mockReturnValue({
      data: 5,
    } as ReturnType<typeof useHoldingQty>);

    vi.mocked(usePbtForPlayer).mockReturnValue({
      data: {
        player_id: PLAYER_ID,
        balance: 10000,
        trading_inflow: 6000,
        ipo_inflow: 3000,
        votes_inflow: 500,
        content_inflow: 500,
        last_inflow_at: '2025-03-01',
        created_at: '2025-01-01',
        updated_at: '2025-03-01',
      },
    } as ReturnType<typeof usePbtForPlayer>);

    const { result } = renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'trading'),
      { wrapper: createWrapper() },
    );

    const pwo = result.current.playerWithOwnership;
    expect(pwo).not.toBeNull();
    expect(pwo?.dpc.owned).toBe(5);
    expect(pwo?.pbt?.balance).toBe(100); // 10000 / 100
    expect(pwo?.pbt?.sources?.trading).toBe(60); // 6000 / 100
    expect(pwo?.pbt?.sources?.ipo).toBe(30); // 3000 / 100
  });

  it('returns error state', () => {
    vi.mocked(useDbPlayerById).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    } as unknown as ReturnType<typeof useDbPlayerById>);

    const { result } = renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'trading'),
      { wrapper: createWrapper() },
    );

    expect(result.current.isError).toBe(true);
    expect(result.current.refetch).toBe(mockRefetch);
  });

  it('passes tab gating to deferred queries', () => {
    renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'performance'),
      { wrapper: createWrapper() },
    );

    // Performance tab: gwScores should be enabled
    expect(usePlayerGwScores).toHaveBeenCalledWith(PLAYER_ID, true);

    // Trading tab queries should be gated
    expect(useOpenBids).toHaveBeenCalledWith(PLAYER_ID, false);
  });

  it('passes correct tab gating for trading tab', () => {
    renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'trading'),
      { wrapper: createWrapper() },
    );

    expect(useOpenBids).toHaveBeenCalledWith(PLAYER_ID, true);
    expect(usePlayerGwScores).toHaveBeenCalledWith(PLAYER_ID, false);
  });

  it('unwraps query data with null-coalesce defaults', () => {
    vi.mocked(useHoldingQty).mockReturnValue({ data: 3 } as ReturnType<typeof useHoldingQty>);
    vi.mocked(usePlayerHolderCount).mockReturnValue({ data: 42 } as ReturnType<typeof usePlayerHolderCount>);
    vi.mocked(useSellOrders).mockReturnValue({
      data: [{ id: 'o-1', player_id: PLAYER_ID, user_id: 'u-1', side: 'sell', price: 1000, quantity: 1, filled_qty: 0, status: 'open', created_at: '' }],
    } as ReturnType<typeof useSellOrders>);

    const { result } = renderHook(
      () => usePlayerDetailData(PLAYER_ID, USER_ID, 'trading'),
      { wrapper: createWrapper() },
    );

    expect(result.current.holdingQty).toBe(3);
    expect(result.current.holderCount).toBe(42);
    expect(result.current.allSellOrders).toHaveLength(1);
  });
});
