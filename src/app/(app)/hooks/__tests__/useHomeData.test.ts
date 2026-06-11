import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================
// Mocks — Query hooks
// ============================================

// Slice 172: useHomeData migrated from Singleton queryClient to useQueryClient() hook.
// Tests use renderHook without Provider — mock useQueryClient to return stable shared instance
// (analog Slice 170 Pattern 5 in .claude/rules/testing.md).
const { mockQc } = vi.hoisted(() => ({
  mockQc: {
    invalidateQueries: vi.fn(() => Promise.resolve()),
    setQueryData: vi.fn(),
    getQueryData: vi.fn(() => undefined),
    cancelQueries: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-query')>('@tanstack/react-query');
  return { ...actual, useQueryClient: () => mockQc };
});

// Slice 282: usePlayers (4,2 MB) ist raus aus useHomeData — ersetzt durch
// usePlayersByIds (Mini-Fetch) + useGlobalMovers (server-cached) + useActiveIpos.
const mockUsePlayersByIds = vi.fn();
const mockUseGlobalMovers = vi.fn();
const mockUseActiveIpos = vi.fn();
const mockUseEvents = vi.fn();
const mockUseTrendingPlayers = vi.fn();
const mockUseChallengeHistory = vi.fn();
const mockUseHomeDashboard = vi.fn();
// Slice 268b: useHomeData migrated from getPlayerPriceChanges7d service-call
// to usePlayerPriceChanges7d Hook (TanStack-cached). Test now mocks the hook
// directly; default return matches "no data yet" (loading state).
const mockUsePlayerPriceChanges7d = vi.fn().mockReturnValue({
  data: undefined,
  isPending: true,
  isError: false,
});

// Helper to set a dashboard payload for tests; mirrors HomeDashboard shape.
function setDashboard(
  patch: Partial<{
    holdings: unknown[];
    user_stats: unknown;
    tickets: unknown;
    highest_pass: unknown;
  }> = {},
) {
  mockUseHomeDashboard.mockReturnValue({
    data: {
      holdings: patch.holdings ?? [],
      user_stats: patch.user_stats ?? null,
      tickets: patch.tickets ?? null,
      highest_pass: patch.highest_pass ?? null,
    },
  });
}

vi.mock('@/lib/queries', () => ({
  usePlayersByIds: (...a: any[]) => mockUsePlayersByIds(...a),
  useGlobalMovers: (...a: any[]) => mockUseGlobalMovers(...a),
  useActiveIpos: (...a: any[]) => mockUseActiveIpos(...a),
  useEvents: (...a: any[]) => mockUseEvents(...a),
  useTrendingPlayers: (...a: any[]) => mockUseTrendingPlayers(...a),
  useHomeDashboard: (...a: any[]) => mockUseHomeDashboard(...a),
  usePlayerPriceChanges7d: (...a: any[]) => mockUsePlayerPriceChanges7d(...a),
  qk: {
    dailyChallenge: { history: (uid: string) => ['dailyChallenge', 'history', uid] },
    tickets: { balance: (uid: string) => ['tickets', 'balance', uid] },
    cosmetics: { user: (uid: string) => ['cosmetics', 'user', uid] },
    equipment: { inventory: (uid: string) => ['equipment', 'inventory', uid] },
    wallet: { all: ['wallet'] },
    mysteryBox: { freeBoxToday: (uid: string) => ['mysteryBox', 'freeBoxToday', uid] },
    homeDashboard: { byUser: (uid: string) => ['home-dashboard', uid] },
  },
}));

vi.mock('@/lib/queries/dailyChallenge', () => ({
  useChallengeHistory: (...a: any[]) => mockUseChallengeHistory(...a),
}));

// ============================================
// Mocks — Providers
// ============================================

const mockAddToast = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({
    user: { id: 'u1', email: 'test@test.com' },
    profile: { display_name: 'Test User', created_at: '2025-01-01T00:00:00Z' },
    loading: false,
  }),
  displayName: () => 'Test User',
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

// Slice 151b-RESET: useHomeData migrated from useClub().followedClubs to
// useFollowedClubs() — keep the legacy ClubProvider mock as no-op for any other
// stray imports, and add a useFollowedClubs mock returning the same fixture.
vi.mock('@/components/providers/ClubProvider', () => ({
  useClub: () => ({ activeClub: null, setActiveClub: () => {}, loading: false }),
}));

vi.mock('@/lib/hooks/useFollowedClubs', () => ({
  useFollowedClubs: () => ({
    data: [{ id: 'club-1', name: 'Club 1', slug: 'club-1' }],
    isLoading: false,
    isFetching: false,
    error: null,
  }),
}));

// ============================================
// Mocks — Services
// ============================================

const mockCentsToBsd = vi.fn().mockImplementation((v: number) => v / 100000);

// Slice 268b: getPlayerPriceChanges7d service-mock removed — useHomeData
// now consumes usePlayerPriceChanges7d hook (mocked above).
vi.mock('@/lib/services/players', () => ({
  centsToBsd: (...args: any[]) => mockCentsToBsd(...args),
}));

const mockOpenMysteryBox = vi.fn().mockResolvedValue({ ok: false });
vi.mock('@/lib/services/mysteryBox', () => ({
  openMysteryBox: (...args: any[]) => mockOpenMysteryBox(...args),
  countFreeMysteryBoxesToday: vi.fn().mockResolvedValue(0),
}));

// Slice 266: useHasFreeBoxToday is now consumed by spotlightSlots-Logic.
// Mock returns mockable per-test (default: hasFreeBoxToday=false → no MB-Slot
// in legacy 4 spotlightType-Tests; tests that exercise MB-Slot override).
const mockUseHasFreeBoxToday = vi.fn().mockReturnValue({
  hasFreeBoxToday: false,
  isLoading: false,
});
vi.mock('@/lib/queries/mysteryBox', () => ({
  useHasFreeBoxToday: (...a: any[]) => mockUseHasFreeBoxToday(...a),
  useMysteryBoxHistory: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/lib/retentionEngine', () => ({
  getRetentionContext: vi.fn(() => null),
}));

vi.mock('@/lib/streakBenefits', () => ({
  getStreakBenefits: vi.fn(() => ({ mysteryBoxTicketDiscount: 0 })),
}));

vi.mock('@/components/home/helpers', () => ({
  STREAK_KEY: 'bescout-login-streak',
  getStoryMessage: vi.fn(() => null),
  // Slice 262 — pickScopedEvent + ACTIVE_STATUSES (extrahiert in helpers, mocked als no-match default)
  pickScopedEvent: vi.fn(() => null),
  // Slice 263 — pickNextScopedEvent (future-only + non-ended/scoring)
  pickNextScopedEvent: vi.fn(() => null),
  ACTIVE_STATUSES: ['registering', 'late-reg', 'running'],
}));

// Slice 262 — useLeagueScope + useLineupWithPlayers (Hero-Mode-Detection inputs)
vi.mock('@/features/shared/store/leagueScopeStore', () => ({
  useLeagueScope: () => ({
    leagueId: null,
    leagueName: null,
    countryCode: null,
    hydrated: true,
    setLeagueScope: vi.fn(),
  }),
}));

vi.mock('@/features/fantasy/queries/lineups', () => ({
  useLineupWithPlayers: () => ({ data: null, isLoading: false }),
  useLineupScores: () => ({ data: new Map(), isLoading: false }),
}));

// Slice 264b — useWildcardBalance Mock (P1-01 Test-Mock-Drift-Fix)
vi.mock('@/features/fantasy/queries/events', () => ({
  useWildcardBalance: () => ({ data: 0, isLoading: false }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => ((key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`),
}));

vi.mock('@/lib/queries/streaks', () => ({
  useLoginStreak: vi.fn(() => ({
    streak: 3,
    isLoading: false,
    data: {
      streak: 3,
      shields_remaining: 2,
      milestone_reward: 0,
      milestone_label: null,
      shield_used: false,
      already_today: false,
      daily_tickets: 0,
    },
  })),
}));

vi.mock('@/lib/services/streaks', () => ({
  recordLoginStreak: vi.fn(() => Promise.resolve({
    streak: 3,
    shields_remaining: 2,
    milestone_reward: 0,
    milestone_label: null,
    shield_used: false,
  })),
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useHomeData } from '../useHomeData';
import { getRetentionContext } from '@/lib/retentionEngine';
import { getStoryMessage } from '@/components/home/helpers';

// ============================================
// Fixtures
// ============================================

function makeHolding(overrides: Record<string, unknown> = {}) {
  return {
    id: 'h-1',
    player_id: 'p-1',
    quantity: 5,
    avg_buy_price: 500000,
    player: {
      first_name: 'Hakan',
      last_name: 'Arslan',
      club: 'Sakaryaspor',
      position: 'MID',
      floor_price: 600000,
      price_change_24h: 5,
      shirt_number: 10,
      age: 31,
      perf_l5: 78,
      matches: 20,
      goals: 3,
      assists: 7,
      image_url: 'https://example.com/photo.jpg',
    },
    ...overrides,
  };
}

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p-1',
    first: 'Hakan',
    last: 'Arslan',
    ipo: { status: 'none' },
    prices: { change24h: 0 },
    isLiquidated: false,
    ...overrides,
  };
}

function makeIpoRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ipo-1',
    player_id: 'p-1',
    status: 'open',
    price: 100000,
    total_offered: 100,
    sold: 0,
    ...overrides,
  };
}

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ev-1',
    status: 'registering',
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ...overrides,
  };
}

// ============================================
// Defaults
// ============================================

function setDefaults() {
  mockUsePlayersByIds.mockReturnValue({ data: [], isLoading: false, isError: false });
  mockUseGlobalMovers.mockReturnValue({ data: [], isLoading: false, isError: false });
  mockUseActiveIpos.mockReturnValue({ data: [], isLoading: false });
  mockUseEvents.mockReturnValue({ data: [] });
  mockUseTrendingPlayers.mockReturnValue({ data: [] });
  mockUseChallengeHistory.mockReturnValue({ data: [] });
  // Slice 266: default no Mystery-Box (legacy spotlightType-Tests rely on this).
  mockUseHasFreeBoxToday.mockReturnValue({ hasFreeBoxToday: false, isLoading: false });
  // Slice 268b: default to "no data yet" — pending state, no top movers.
  mockUsePlayerPriceChanges7d.mockReturnValue({
    data: undefined,
    isPending: true,
    isError: false,
  });
  setDashboard();
}

// ============================================
// Tests
// ============================================

describe('useHomeData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaults();
  });

  // ── Auth & Identity ──

  it('returns user identity fields', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.uid).toBe('u1');
    expect(result.current.firstName).toBe('Test');
    expect(result.current.loading).toBe(false);
  });

  // ── Loading States ──

  it('homeLoading=true while globalMovers query loads', () => {
    mockUseGlobalMovers.mockReturnValue({ data: [], isLoading: true, isError: false });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.homeLoading).toBe(true);
  });

  it('homeLoading=true while ipos query loads', () => {
    mockUseActiveIpos.mockReturnValue({ data: [], isLoading: true });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.homeLoading).toBe(true);
  });

  it('homeLoading ignores byIds loading when no ids requested', () => {
    mockUsePlayersByIds.mockReturnValue({ data: [], isLoading: true, isError: false });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.homeLoading).toBe(false);
  });

  it('homeError stays FALSE on movers error — graceful degrade, kein Full-Page-Error (Review F-02)', () => {
    mockUseGlobalMovers.mockReturnValue({ data: [], isLoading: false, isError: true });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.homeError).toBe(false);
  });

  it('homeError=true only when byIds errored AND ids requested AND no data (Review F-02)', () => {
    mockUseTrendingPlayers.mockReturnValue({ data: [{ playerId: 'p-1' }], isLoading: false });
    mockUsePlayersByIds.mockReturnValue({ data: [], isLoading: false, isError: true });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.homeError).toBe(true);
  });

  it('homeError=false when byIds background-refetch fails but data exists (TanStack v5)', () => {
    mockUseTrendingPlayers.mockReturnValue({ data: [{ playerId: 'p-1' }], isLoading: false });
    mockUsePlayersByIds.mockReturnValue({
      data: [makePlayer({ id: 'p-1' })],
      isLoading: false, isError: true,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.homeError).toBe(false);
  });

  // ── Holdings Transform ──

  it('transforms raw holdings into DpcHolding format', () => {
    setDashboard({ holdings: [makeHolding()] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.holdings).toHaveLength(1);
    const h = result.current.holdings[0];
    expect(h.playerId).toBe('p-1');
    expect(h.player).toBe('Hakan Arslan');
    expect(h.pos).toBe('MID');
    expect(h.qty).toBe(5);
    expect(mockCentsToBsd).toHaveBeenCalledWith(500000); // avgBuy
    expect(mockCentsToBsd).toHaveBeenCalledWith(600000); // floor
  });

  it('filters out holdings with null player', () => {
    setDashboard({
      holdings: [
        makeHolding(),
        { ...makeHolding({ id: 'h-2', player_id: 'p-2' }), player: null },
      ],
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.holdings).toHaveLength(1);
  });

  // ── Portfolio Calculations ──

  it('computes portfolioValue, portfolioCost, pnl, pnlPct', () => {
    // floor=6, avgBuy=5, qty=5 → value=30, cost=25, pnl=5, pnlPct=20%
    mockCentsToBsd.mockImplementation((v: number) => v / 100000);
    setDashboard({ holdings: [makeHolding()] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.portfolioValue).toBeCloseTo(30); // 5 * 6
    expect(result.current.portfolioCost).toBeCloseTo(25);  // 5 * 5
    expect(result.current.pnl).toBeCloseTo(5);
    expect(result.current.pnlPct).toBeCloseTo(20);
  });

  it('returns pnlPct=0 when portfolioCost is 0', () => {
    mockCentsToBsd.mockReturnValue(0);
    setDashboard({ holdings: [makeHolding()] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.pnlPct).toBe(0);
  });

  // ── Active IPOs ──

  it('maps active IPO rows to Player-shape with ipo patch (Slice 282)', () => {
    mockUseActiveIpos.mockReturnValue({
      data: [
        makeIpoRow({ id: 'ipo-1', player_id: 'p-1', status: 'open', price: 150000, total_offered: 100, sold: 40 }),
        makeIpoRow({ id: 'ipo-2', player_id: 'p-2', status: 'early_access' }),
        makeIpoRow({ id: 'ipo-3', player_id: 'p-missing' }), // Player-Row fehlt -> skip
        makeIpoRow({ id: 'ipo-4', player_id: 'p-1' }), // zweite Tranche gleicher Player -> dedupe
      ],
      isLoading: false,
    });
    mockUsePlayersByIds.mockReturnValue({
      data: [makePlayer({ id: 'p-1' }), makePlayer({ id: 'p-2' })],
      isLoading: false, isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.activeIPOs).toHaveLength(2);
    expect(result.current.activeIPOs[0].ipo.status).toBe('open');
    expect(result.current.activeIPOs[0].ipo.progress).toBe(40);
    expect(mockCentsToBsd).toHaveBeenCalledWith(150000);
  });

  // ── Next Event ──

  it('picks nearest active event as nextEvent', () => {
    const events = [
      makeEvent({ id: 'ev-far', starts_at: new Date(Date.now() + 172800000).toISOString() }),
      makeEvent({ id: 'ev-near', starts_at: new Date(Date.now() + 3600000).toISOString() }),
    ];
    mockUseEvents.mockReturnValue({ data: events });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.nextEvent?.id).toBe('ev-near');
  });

  it('returns nextEvent=null when no active events', () => {
    mockUseEvents.mockReturnValue({ data: [makeEvent({ status: 'ended' })] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.nextEvent).toBeNull();
  });

  it('detects live event', () => {
    mockUseEvents.mockReturnValue({ data: [makeEvent({ status: 'running' })] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.isEventLive).toBe(true);
  });

  // ── Spotlight Type ──

  it('spotlightType=ipo when active IPOs exist', () => {
    mockUseActiveIpos.mockReturnValue({
      data: [makeIpoRow({ player_id: 'p-1', status: 'open' })],
      isLoading: false,
    });
    mockUsePlayersByIds.mockReturnValue({
      data: [makePlayer({ id: 'p-1' })],
      isLoading: false, isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightType).toBe('ipo');
  });

  // Slice 266 behavior change: 'event' is now reserved for isEventLive (running).
  // Pre-266 mapped ALL nextEvent (registering/late-reg/running) → 'event' which
  // over-suppressed the Sidebar-NextEvent card. New behavior: only running events
  // map to 'event' (= primarySlot=liveScore). Non-running nextEvent → 'cta',
  // letting Sidebar render the upcoming-Event card normally.
  it('spotlightType=event ONLY when event is running (Slice 266 behavior change)', () => {
    mockUseEvents.mockReturnValue({ data: [makeEvent({ status: 'running' })] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightType).toBe('event');
    expect(result.current.spotlightSlots.primary).toBe('liveScore');
  });

  it('spotlightType=cta when nextEvent exists but is not running (Slice 266)', () => {
    mockUseEvents.mockReturnValue({ data: [makeEvent({ status: 'registering' })] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightType).toBe('cta');
  });

  it('spotlightType=trending when trending players exist', () => {
    mockUseTrendingPlayers.mockReturnValue({ data: [{ playerId: 'p-1' }] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightType).toBe('trending');
  });

  it('spotlightType=cta when nothing active', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightType).toBe('cta');
  });

  // ── Slice 266 — spotlightSlots Multi-Slot Engine ──

  it('spotlightSlots.primary=liveScore when isEventLive', () => {
    mockUseEvents.mockReturnValue({ data: [makeEvent({ status: 'running' })] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightSlots.primary).toBe('liveScore');
  });

  it('spotlightSlots.primary=mysteryBox when hasFreeBoxToday and !isEventLive', () => {
    mockUseHasFreeBoxToday.mockReturnValue({ hasFreeBoxToday: true, isLoading: false });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightSlots.primary).toBe('mysteryBox');
    expect(result.current.spotlightType).toBe('cta'); // legacy mapping for mysteryBox
  });

  it('spotlightSlots: liveScore + mysteryBox both active → liveScore primary, mysteryBox secondary', () => {
    mockUseEvents.mockReturnValue({ data: [makeEvent({ status: 'running' })] });
    mockUseHasFreeBoxToday.mockReturnValue({ hasFreeBoxToday: true, isLoading: false });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightSlots.primary).toBe('liveScore');
    expect(result.current.spotlightSlots.secondary).toBe('mysteryBox');
  });

  it('spotlightSlots.primary=null when nothing active', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightSlots.primary).toBeNull();
    expect(result.current.spotlightSlots.secondary).toBeNull();
  });

  it('mysteryBox-Slot suppressed during isLoading (F-04 isLoading-Guard)', () => {
    mockUseHasFreeBoxToday.mockReturnValue({ hasFreeBoxToday: true, isLoading: true });
    const { result } = renderHook(() => useHomeData());
    // Even though hasFreeBoxToday=true, isLoading=true blocks the slot.
    expect(result.current.spotlightSlots.primary).not.toBe('mysteryBox');
    expect(result.current.spotlightSlots.primary).toBeNull();
  });

  // ── Top Movers ──

  it('returns top movers from the 7d price changes hook (Slice 268b)', () => {
    mockCentsToBsd.mockImplementation((v: number) => v / 100000);
    setDashboard({
      holdings: [
        makeHolding({ id: 'h-1', player_id: 'p-1' }),
        makeHolding({ id: 'h-2', player_id: 'p-2' }),
        makeHolding({ id: 'h-3', player_id: 'p-3' }),
      ],
    });
    // Hook returns rows already sorted by absolute change — useHomeData
    // trusts that order and just maps to the local TopMover shape.
    mockUsePlayerPriceChanges7d.mockReturnValue({
      data: [
        { player_id: 'p-3', change_pct: 20 },
        { player_id: 'p-1', change_pct: -10 },
        { player_id: 'p-2', change_pct: 5 },
      ],
      isPending: false,
      isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.topMovers).toHaveLength(3);
    expect(result.current.topMovers[0].change24h).toBe(20);
    expect(result.current.topMovers[1].change24h).toBe(-10);
    expect(result.current.topMovers[2].change24h).toBe(5);
  });

  it('returns empty topMovers with fewer than 2 holdings (hook returns no data)', () => {
    setDashboard({ holdings: [makeHolding()] });
    // With <2 holdings the hook stays disabled — data is undefined.
    mockUsePlayerPriceChanges7d.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.topMovers).toHaveLength(0);
  });

  // AC-09 (Slice 268b Pre-Review F-04): Error-state graceful-degrade.
  it('returns empty topMovers when hook is in error state (Slice 268b AC-09)', () => {
    setDashboard({
      holdings: [
        makeHolding({ id: 'h-1', player_id: 'p-1' }),
        makeHolding({ id: 'h-2', player_id: 'p-2' }),
      ],
    });
    mockUsePlayerPriceChanges7d.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.topMovers).toEqual([]);
    // Importantly: no crash on `.map(undefined)` — the `?? []` guard in
    // useHomeData handles undefined data gracefully.
  });

  // ── Trending With Players ──

  it('joins trending data with player objects', () => {
    const players = [makePlayer({ id: 'p-1' }), makePlayer({ id: 'p-2' })];
    mockUsePlayersByIds.mockReturnValue({ data: players, isLoading: false, isError: false });
    mockUseTrendingPlayers.mockReturnValue({ data: [{ playerId: 'p-1' }, { playerId: 'p-99' }] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.trendingWithPlayers).toHaveLength(1);
    expect(result.current.trendingWithPlayers[0].player.id).toBe('p-1');
  });

  // ── Has Global Movers ──

  it('hasGlobalMovers=true when movers endpoint returns rows', () => {
    mockUseGlobalMovers.mockReturnValue({
      data: [makePlayer({ prices: { change24h: 5 }, isLiquidated: false })],
      isLoading: false, isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.hasGlobalMovers).toBe(true);
  });

  it('hasGlobalMovers=false when movers endpoint is empty', () => {
    mockUseGlobalMovers.mockReturnValue({ data: [], isLoading: false, isError: false });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.hasGlobalMovers).toBe(false);
  });

  it('hasGlobalMovers=false on movers error (defensive, Slice-265-Lehre)', () => {
    mockUseGlobalMovers.mockReturnValue({
      data: [makePlayer({ prices: { change24h: 5 } })],
      isLoading: false, isError: true,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.hasGlobalMovers).toBe(false);
  });

  // ── Actions: handleOpenMysteryBox ──

  it('handleOpenMysteryBox throws on failure so the modal can surface the error', async () => {
    mockOpenMysteryBox.mockResolvedValue({ ok: false, error: 'daily_free_limit_reached' });
    const { result } = renderHook(() => useHomeData());
    await act(async () => {
      await expect(result.current.handleOpenMysteryBox()).rejects.toThrow('daily_free_limit_reached');
    });
  });

  it('handleOpenMysteryBox returns reward on success', async () => {
    mockOpenMysteryBox.mockResolvedValue({
      ok: true,
      rarity: 'epic',
      rewardType: 'tickets',
      ticketsAmount: 10,
      cosmeticKey: null,
    });
    const { result } = renderHook(() => useHomeData());
    let res: any;
    await act(async () => {
      res = await result.current.handleOpenMysteryBox();
    });
    expect(res).not.toBeNull();
    expect(res.rarity).toBe('epic');
    expect(res.reward_type).toBe('tickets');
    expect(res.tickets_amount).toBe(10);
  });

  // ── Retention Context ──

  it('calls getRetentionContext with correct params', () => {
    setDashboard({ holdings: [makeHolding()] });
    mockUseChallengeHistory.mockReturnValue({ data: [{ challenge_id: 'ch-1' }] });
    renderHook(() => useHomeData());
    expect(getRetentionContext).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: '2025-01-01T00:00:00Z',
        streakDays: 3,
        holdingsCount: 1,
        challengesCompleted: 1,
        followedClubs: 1,
      })
    );
  });

  // ── Story Message ──

  it('calls getStoryMessage with derived data', () => {
    mockCentsToBsd.mockImplementation((v: number) => v / 100000);
    setDashboard({ holdings: [makeHolding()] });
    renderHook(() => useHomeData());
    expect(getStoryMessage).toHaveBeenCalled();
  });

  // ── Gamification Pass-Through (Slice 109: now via dashboard payload) ──

  it('passes through ticket data from dashboard', () => {
    setDashboard({ tickets: { balance: 42 } });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.ticketData).toEqual({ balance: 42 });
  });

  it('passes through highestPass from dashboard', () => {
    setDashboard({ highest_pass: { tier: 'gold' } });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.highestPass).toEqual({ tier: 'gold' });
  });

  // ── Followed Clubs ──

  it('returns followed clubs from useFollowedClubs hook', () => {
    // Slice 151b-RESET: useHomeData now reads from useFollowedClubs query-cache
    // hook (not ClubProvider). Mock returns DbClub[] objects, not bare ID strings.
    const { result } = renderHook(() => useHomeData());
    expect(result.current.followedClubs).toEqual([
      { id: 'club-1', name: 'Club 1', slug: 'club-1' },
    ]);
  });
});
