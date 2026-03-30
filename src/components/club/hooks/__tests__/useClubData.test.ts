import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ClubFilters } from '../types';

// ============================================
// Mocks — Query hooks
// ============================================

const mockUseClubBySlug = vi.fn();
const mockUsePlayersByClub = vi.fn();
const mockUseClubFollowerCount = vi.fn();
const mockUseIsFollowingClub = vi.fn();
const mockUseHoldings = vi.fn();
const mockUseClubFixtures = vi.fn();
const mockUseClubPrestige = vi.fn();
const mockUseActiveIpos = vi.fn();
const mockUseEvents = vi.fn();
const mockUseClubRecentTrades = vi.fn();
const mockUseFanRanking = vi.fn();

vi.mock('@/lib/queries/misc', () => ({ useClubBySlug: (...a: any[]) => mockUseClubBySlug(...a) }));
vi.mock('@/lib/queries/players', () => ({ usePlayersByClub: (...a: any[]) => mockUsePlayersByClub(...a) }));
vi.mock('@/lib/queries/social', () => ({
  useClubFollowerCount: (...a: any[]) => mockUseClubFollowerCount(...a),
  useIsFollowingClub: (...a: any[]) => mockUseIsFollowingClub(...a),
}));
vi.mock('@/lib/queries/holdings', () => ({ useHoldings: (...a: any[]) => mockUseHoldings(...a) }));
vi.mock('@/lib/queries/fixtures', () => ({ useClubFixtures: (...a: any[]) => mockUseClubFixtures(...a) }));
vi.mock('@/lib/queries/scouting', () => ({ useClubPrestige: (...a: any[]) => mockUseClubPrestige(...a) }));
vi.mock('@/lib/queries/ipos', () => ({ useActiveIpos: (...a: any[]) => mockUseActiveIpos(...a) }));
vi.mock('@/lib/queries/events', () => ({ useEvents: (...a: any[]) => mockUseEvents(...a) }));
vi.mock('@/lib/queries/trades', () => ({ useClubRecentTrades: (...a: any[]) => mockUseClubRecentTrades(...a) }));
vi.mock('@/lib/queries/fanRanking', () => ({ useFanRanking: (...a: any[]) => mockUseFanRanking(...a) }));

// ============================================
// Mocks — Services
// ============================================

vi.mock('@/lib/services/research', () => ({
  resolveExpiredResearch: vi.fn(() => Promise.resolve(0)),
  getResearchPosts: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/services/posts', () => ({
  getPosts: vi.fn(() => Promise.resolve([])),
}));

const mockDbToPlayers = vi.fn().mockImplementation((raw: any[]) => raw.map((p: any) => ({
  id: p.id,
  first: p.first_name,
  last: p.last_name,
  pos: p.position,
  perf: { l5: Number(p.perf_l5 ?? 0) },
  prices: { lastTrade: Number(p.last_trade_price ?? 0), change24h: Number(p.change_24h ?? 0) },
})));

const mockCentsToBsd = vi.fn().mockImplementation((v: number) => v / 100000);

vi.mock('@/lib/services/players', () => ({
  dbToPlayers: (...args: any[]) => mockDbToPlayers(...args),
  centsToBsd: (...args: any[]) => mockCentsToBsd(...args),
}));

vi.mock('@/components/club/FixtureCards', () => ({
  getFixtureResult: vi.fn(() => null),
}));

vi.mock('@/components/providers/ClubProvider', () => ({
  useClub: () => ({ followedClubs: [] }),
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useClubData } from '../useClubData';

// ============================================
// Fixtures
// ============================================

function makeDbPlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    first_name: 'Hakan',
    last_name: 'Arslan',
    position: 'MID',
    perf_l5: 75,
    volume_24h: 500000,
    dpc_total: 100,
    last_trade_price: 1000,
    change_24h: 5,
    ...overrides,
  };
}

function makeClub(overrides: Record<string, unknown> = {}) {
  return {
    id: 'club-1',
    name: 'Sakaryaspor',
    slug: 'sakaryaspor',
    league: 'TFF 1. Lig',
    primary_color: '#006633',
    secondary_color: '#fff',
    is_admin: false,
    ...overrides,
  };
}

const DEFAULT_FILTERS: ClubFilters = {
  posFilter: 'ALL',
  sortBy: 'perf',
  spielerQuery: '',
};

// ============================================
// Tests
// ============================================

describe('useClubData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseClubBySlug.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: [], isLoading: false, isError: false });
    mockUseClubFollowerCount.mockReturnValue({ data: 0 });
    mockUseIsFollowingClub.mockReturnValue({ data: false });
    mockUseHoldings.mockReturnValue({ data: [] });
    mockUseClubFixtures.mockReturnValue({ data: [] });
    mockUseClubPrestige.mockReturnValue({ data: undefined });
    mockUseActiveIpos.mockReturnValue({ data: [] });
    mockUseEvents.mockReturnValue({ data: [] });
    mockUseClubRecentTrades.mockReturnValue({ data: [] });
    mockUseFanRanking.mockReturnValue({ data: undefined, isLoading: false });
  });

  // ── Loading States ──

  it('returns loading=true when club is loading', () => {
    mockUseClubBySlug.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.loading).toBe(true);
  });

  it('returns loading=true when players are loading (club exists)', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: [], isLoading: true, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.loading).toBe(true);
  });

  it('returns loading=false when both done', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.loading).toBe(false);
  });

  // ── Not Found / Error ──

  it('returns notFound when club is null and not loading', () => {
    mockUseClubBySlug.mockReturnValue({ data: null, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'nonexistent', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.notFound).toBe(true);
  });

  it('returns dataError on club error', () => {
    mockUseClubBySlug.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.dataError).toBe(true);
  });

  it('returns dataError on players error', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: [], isLoading: false, isError: true });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.dataError).toBe(true);
  });

  // ── Derived Data ──

  it('computes players via dbToPlayers', () => {
    const raw = [makeDbPlayer(), makeDbPlayer({ id: 'p-2', first_name: 'Ali' })];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.players).toHaveLength(2);
    expect(mockDbToPlayers).toHaveBeenCalledWith(raw);
  });

  it('computes totalVolume24h using centsToBsd', () => {
    const raw = [makeDbPlayer({ volume_24h: 300000 }), makeDbPlayer({ id: 'p-2', volume_24h: 200000 })];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(mockCentsToBsd).toHaveBeenCalledWith(500000);
    expect(result.current.totalVolume24h).toBe(5); // 500000 / 100000
  });

  it('computes totalDpcFloat', () => {
    const raw = [makeDbPlayer({ dpc_total: 50 }), makeDbPlayer({ id: 'p-2', dpc_total: 30 })];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.totalDpcFloat).toBe(80);
  });

  it('computes avgPerf correctly', () => {
    const raw = [makeDbPlayer({ perf_l5: 80 }), makeDbPlayer({ id: 'p-2', perf_l5: 60 })];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.avgPerf).toBe(70);
  });

  it('returns avgPerf=0 when no players', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.avgPerf).toBe(0);
  });

  // ── Holdings ──

  it('computes userHoldingsQty from holdings data', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({
      data: [makeDbPlayer({ id: 'p-1' }), makeDbPlayer({ id: 'p-2' })],
      isLoading: false, isError: false,
    });
    mockUseHoldings.mockReturnValue({
      data: [
        { player_id: 'p-1', quantity: 5 },
        { player_id: 'p-2', quantity: 3 },
        { player_id: 'p-other', quantity: 10 }, // different club
      ],
    });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.userHoldingsQty).toEqual({ 'p-1': 5, 'p-2': 3 });
    expect(result.current.userClubDpc).toBe(8);
  });

  it('returns empty userHoldingsQty when no club', () => {
    mockUseClubBySlug.mockReturnValue({ data: null, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.userHoldingsQty).toEqual({});
  });

  // ── Filtering ──

  it('filters players by position', () => {
    const raw = [
      makeDbPlayer({ id: 'p-1', position: 'MID', perf_l5: 70 }),
      makeDbPlayer({ id: 'p-2', position: 'DEF', perf_l5: 60 }),
      makeDbPlayer({ id: 'p-3', position: 'MID', perf_l5: 80 }),
    ];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: { ...DEFAULT_FILTERS, posFilter: 'MID' } })
    );
    expect(result.current.filteredPlayers).toHaveLength(2);
    expect(result.current.filteredPlayers.every(p => p.pos === 'MID')).toBe(true);
  });

  it('filters players by search query', () => {
    const raw = [
      makeDbPlayer({ id: 'p-1', first_name: 'Hakan', last_name: 'Arslan' }),
      makeDbPlayer({ id: 'p-2', first_name: 'Ali', last_name: 'Koc' }),
    ];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: { ...DEFAULT_FILTERS, spielerQuery: 'hakan' } })
    );
    expect(result.current.filteredPlayers).toHaveLength(1);
    expect(result.current.filteredPlayers[0].id).toBe('p-1');
  });

  it('sorts players by price', () => {
    const raw = [
      makeDbPlayer({ id: 'p-1', last_trade_price: 500 }),
      makeDbPlayer({ id: 'p-2', last_trade_price: 1500 }),
    ];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: { ...DEFAULT_FILTERS, sortBy: 'price' } })
    );
    expect(result.current.filteredPlayers[0].id).toBe('p-2');
    expect(result.current.filteredPlayers[1].id).toBe('p-1');
  });

  it('sorts players by change', () => {
    const raw = [
      makeDbPlayer({ id: 'p-1', change_24h: -2 }),
      makeDbPlayer({ id: 'p-2', change_24h: 10 }),
    ];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: { ...DEFAULT_FILTERS, sortBy: 'change' } })
    );
    expect(result.current.filteredPlayers[0].id).toBe('p-2');
  });

  // ── Position Counts ──

  it('computes posCounts', () => {
    const raw = [
      makeDbPlayer({ id: 'p-1', position: 'GK' }),
      makeDbPlayer({ id: 'p-2', position: 'DEF' }),
      makeDbPlayer({ id: 'p-3', position: 'DEF' }),
      makeDbPlayer({ id: 'p-4', position: 'MID' }),
    ];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.posCounts).toEqual({ ALL: 4, GK: 1, DEF: 2, MID: 1, ATT: 0 });
  });

  // ── Club IPOs ──

  it('filters active IPOs for this club', () => {
    const raw = [makeDbPlayer({ id: 'p-1' })];
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({ data: raw, isLoading: false, isError: false });
    mockUseActiveIpos.mockReturnValue({
      data: [
        { player_id: 'p-1', id: 'ipo-1' },
        { player_id: 'p-other', id: 'ipo-2' },
      ],
    });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.clubIpos).toHaveLength(1);
    expect(result.current.clubIpos[0].id).toBe('ipo-1');
  });

  // ── Club Events ──

  it('filters events for this club', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUseEvents.mockReturnValue({
      data: [
        { id: 'ev-1', club_id: 'club-1' },
        { id: 'ev-2', club_id: 'other-club' },
        { id: 'ev-3', club_id: 'club-1' },
      ],
    });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.clubEvents).toHaveLength(2);
  });

  // ── Show Feature Showcase ──

  it('showFeatureShowcase=true when >=2 sections are empty', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    // All empty: clubIpos=0, clubEvents=0, recentTrades=0
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.showFeatureShowcase).toBe(true);
    expect(result.current.emptySections).toBe(3);
  });

  it('showFeatureShowcase=false when <2 sections are empty', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({
      data: [makeDbPlayer({ id: 'p-1' })],
      isLoading: false, isError: false,
    });
    mockUseActiveIpos.mockReturnValue({ data: [{ player_id: 'p-1', id: 'ipo-1' }] });
    mockUseEvents.mockReturnValue({ data: [{ id: 'ev-1', club_id: 'club-1' }] });
    mockUseClubRecentTrades.mockReturnValue({
      data: [{ id: 't-1', player: { first_name: 'A', last_name: 'B' }, price: 100, executed_at: '2026-01-01' }],
    });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.showFeatureShowcase).toBe(false);
  });

  // ── Owned Player IDs ──

  it('computes ownedPlayerIds from holdings', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUsePlayersByClub.mockReturnValue({
      data: [makeDbPlayer({ id: 'p-1' }), makeDbPlayer({ id: 'p-2' })],
      isLoading: false, isError: false,
    });
    mockUseHoldings.mockReturnValue({
      data: [{ player_id: 'p-1', quantity: 3 }],
    });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.ownedPlayerIds.has('p-1')).toBe(true);
    expect(result.current.ownedPlayerIds.has('p-2')).toBe(false);
  });

  // ── Recent Trades ──

  it('formats recent trades with player names', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUseClubRecentTrades.mockReturnValue({
      data: [{
        id: 't-1',
        player: { first_name: 'Hakan', last_name: 'Arslan' },
        price: 500000,
        executed_at: '2026-01-15T10:00:00Z',
      }],
    });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.recentTrades).toHaveLength(1);
    expect(result.current.recentTrades[0].player_name).toBe('Hakan Arslan');
    expect(result.current.recentTrades[0].price_cents).toBe(500000);
  });

  // ── Social Data Pass-Through ──

  it('passes through followerCountData and isFollowingData', () => {
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUseClubFollowerCount.mockReturnValue({ data: 42 });
    mockUseIsFollowingClub.mockReturnValue({ data: true });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.followerCountData).toBe(42);
    expect(result.current.isFollowingData).toBe(true);
  });

  // ── Fan Ranking ──

  it('passes through fan ranking data', () => {
    const ranking = { rank_tier: 'ultra', csf_multiplier: 1.5 };
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUseFanRanking.mockReturnValue({ data: ranking, isLoading: false });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.fanRanking).toEqual(ranking);
    expect(result.current.fanRankingLoading).toBe(false);
  });

  // ── Club Prestige ──

  it('passes through club prestige data', () => {
    const prestige = { tier: 'engagiert', score: 75 };
    mockUseClubBySlug.mockReturnValue({ data: makeClub(), isLoading: false, isError: false });
    mockUseClubPrestige.mockReturnValue({ data: prestige });
    const { result } = renderHook(() =>
      useClubData({ slug: 'sakaryaspor', userId: 'u1', filters: DEFAULT_FILTERS })
    );
    expect(result.current.clubPrestige).toEqual(prestige);
  });
});
