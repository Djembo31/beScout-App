import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================
// Mocks — Query hooks
// ============================================

const mockUsePlayers = vi.fn();
const mockUseHoldings = vi.fn();
const mockUseEvents = vi.fn();
const mockUseUserStats = vi.fn();
const mockUseTrendingPlayers = vi.fn();
const mockUseTodaysChallenge = vi.fn();
const mockUseChallengeHistory = vi.fn();
const mockUseUserTickets = vi.fn();
const mockUseHighestPass = vi.fn();

vi.mock('@/lib/queries', () => ({
  usePlayers: (...a: any[]) => mockUsePlayers(...a),
  useHoldings: (...a: any[]) => mockUseHoldings(...a),
  useEvents: (...a: any[]) => mockUseEvents(...a),
  useUserStats: (...a: any[]) => mockUseUserStats(...a),
  useTrendingPlayers: (...a: any[]) => mockUseTrendingPlayers(...a),
  qk: {
    dailyChallenge: { history: (uid: string) => ['dailyChallenge', 'history', uid] },
    tickets: { balance: (uid: string) => ['tickets', 'balance', uid] },
    cosmetics: { user: (uid: string) => ['cosmetics', 'user', uid] },
  },
}));

vi.mock('@/lib/queries/dailyChallenge', () => ({
  useTodaysChallenge: (...a: any[]) => mockUseTodaysChallenge(...a),
  useChallengeHistory: (...a: any[]) => mockUseChallengeHistory(...a),
}));

vi.mock('@/lib/queries/tickets', () => ({
  useUserTickets: (...a: any[]) => mockUseUserTickets(...a),
}));

vi.mock('@/lib/queries/foundingPasses', () => ({
  useHighestPass: (...a: any[]) => mockUseHighestPass(...a),
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

vi.mock('@/components/providers/ClubProvider', () => ({
  useClub: () => ({ followedClubs: ['club-1'] }),
}));

// ============================================
// Mocks — Services
// ============================================

const mockCentsToBsd = vi.fn().mockImplementation((v: number) => v / 100000);

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (...args: any[]) => mockCentsToBsd(...args),
}));

const mockSubmitDailyChallenge = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/services/dailyChallenge', () => ({
  submitDailyChallenge: (...args: any[]) => mockSubmitDailyChallenge(...args),
}));

const mockOpenMysteryBox = vi.fn().mockResolvedValue({ ok: false });
vi.mock('@/lib/services/mysteryBox', () => ({
  openMysteryBox: (...args: any[]) => mockOpenMysteryBox(...args),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: vi.fn() },
}));

vi.mock('@/lib/retentionEngine', () => ({
  getRetentionContext: vi.fn(() => null),
}));

vi.mock('@/lib/streakBenefits', () => ({
  getStreakBenefits: vi.fn(() => ({ mysteryBoxTicketDiscount: 0 })),
}));

vi.mock('@/components/home/helpers', () => ({
  updateLoginStreak: vi.fn(() => 3),
  STREAK_KEY: 'bescout-login-streak',
  getStoryMessage: vi.fn(() => null),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => ((key: string, params?: Record<string, unknown>) => `${key}${params ? JSON.stringify(params) : ''}`),
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
import { qk } from '@/lib/queries';

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
  mockUsePlayers.mockReturnValue({ data: [], isLoading: false, isError: false });
  mockUseHoldings.mockReturnValue({ data: [] });
  mockUseEvents.mockReturnValue({ data: [] });
  mockUseUserStats.mockReturnValue({ data: null });
  mockUseTrendingPlayers.mockReturnValue({ data: [] });
  mockUseTodaysChallenge.mockReturnValue({ data: null, isLoading: false });
  mockUseChallengeHistory.mockReturnValue({ data: [] });
  mockUseUserTickets.mockReturnValue({ data: null });
  mockUseHighestPass.mockReturnValue({ data: undefined });
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

  it('returns playersLoading from usePlayers', () => {
    mockUsePlayers.mockReturnValue({ data: [], isLoading: true, isError: false });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.playersLoading).toBe(true);
  });

  it('returns playersError from usePlayers', () => {
    mockUsePlayers.mockReturnValue({ data: [], isLoading: false, isError: true });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.playersError).toBe(true);
  });

  // ── Holdings Transform ──

  it('transforms raw holdings into DpcHolding format', () => {
    const raw = [makeHolding()];
    mockUseHoldings.mockReturnValue({ data: raw });
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
    const raw = [makeHolding(), { ...makeHolding({ id: 'h-2', player_id: 'p-2' }), player: null }];
    mockUseHoldings.mockReturnValue({ data: raw });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.holdings).toHaveLength(1);
  });

  // ── Portfolio Calculations ──

  it('computes portfolioValue, portfolioCost, pnl, pnlPct', () => {
    // floor=6, avgBuy=5, qty=5 → value=30, cost=25, pnl=5, pnlPct=20%
    mockCentsToBsd.mockImplementation((v: number) => v / 100000);
    mockUseHoldings.mockReturnValue({ data: [makeHolding()] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.portfolioValue).toBeCloseTo(30); // 5 * 6
    expect(result.current.portfolioCost).toBeCloseTo(25);  // 5 * 5
    expect(result.current.pnl).toBeCloseTo(5);
    expect(result.current.pnlPct).toBeCloseTo(20);
  });

  it('returns pnlPct=0 when portfolioCost is 0', () => {
    mockCentsToBsd.mockReturnValue(0);
    mockUseHoldings.mockReturnValue({ data: [makeHolding()] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.pnlPct).toBe(0);
  });

  // ── Active IPOs ──

  it('filters active IPOs (open + early_access)', () => {
    const players = [
      makePlayer({ id: 'p-1', ipo: { status: 'open' } }),
      makePlayer({ id: 'p-2', ipo: { status: 'early_access' } }),
      makePlayer({ id: 'p-3', ipo: { status: 'ended' } }),
      makePlayer({ id: 'p-4', ipo: { status: 'none' } }),
    ];
    mockUsePlayers.mockReturnValue({ data: players, isLoading: false, isError: false });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.activeIPOs).toHaveLength(2);
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
    mockUsePlayers.mockReturnValue({
      data: [makePlayer({ ipo: { status: 'open' } })],
      isLoading: false, isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightType).toBe('ipo');
  });

  it('spotlightType=event when no IPOs but event exists', () => {
    mockUseEvents.mockReturnValue({ data: [makeEvent()] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.spotlightType).toBe('event');
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

  // ── Top Movers ──

  it('returns top movers sorted by absolute change', () => {
    mockCentsToBsd.mockImplementation((v: number) => v / 100000);
    mockUseHoldings.mockReturnValue({
      data: [
        makeHolding({ id: 'h-1', player_id: 'p-1', player: { ...makeHolding().player, price_change_24h: -10 } }),
        makeHolding({ id: 'h-2', player_id: 'p-2', player: { ...makeHolding().player, price_change_24h: 5 } }),
        makeHolding({ id: 'h-3', player_id: 'p-3', player: { ...makeHolding().player, price_change_24h: 20 } }),
      ],
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.topMovers).toHaveLength(3);
    expect(result.current.topMovers[0].change24h).toBe(20);
    expect(result.current.topMovers[1].change24h).toBe(-10);
  });

  it('returns empty topMovers with fewer than 2 holdings', () => {
    mockUseHoldings.mockReturnValue({ data: [makeHolding()] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.topMovers).toHaveLength(0);
  });

  // ── Trending With Players ──

  it('joins trending data with player objects', () => {
    const players = [makePlayer({ id: 'p-1' }), makePlayer({ id: 'p-2' })];
    mockUsePlayers.mockReturnValue({ data: players, isLoading: false, isError: false });
    mockUseTrendingPlayers.mockReturnValue({ data: [{ playerId: 'p-1' }, { playerId: 'p-99' }] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.trendingWithPlayers).toHaveLength(1);
    expect(result.current.trendingWithPlayers[0].player.id).toBe('p-1');
  });

  // ── Has Global Movers ──

  it('hasGlobalMovers=true when non-liquidated players have price changes', () => {
    mockUsePlayers.mockReturnValue({
      data: [makePlayer({ prices: { change24h: 5 }, isLiquidated: false })],
      isLoading: false, isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.hasGlobalMovers).toBe(true);
  });

  it('hasGlobalMovers=false when all changes are 0', () => {
    mockUsePlayers.mockReturnValue({
      data: [makePlayer({ prices: { change24h: 0 } })],
      isLoading: false, isError: false,
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.hasGlobalMovers).toBe(false);
  });

  // ── Daily Challenge ──

  it('finds todaysAnswer from challenge history', () => {
    mockUseTodaysChallenge.mockReturnValue({ data: { id: 'ch-1' }, isLoading: false });
    mockUseChallengeHistory.mockReturnValue({
      data: [
        { challenge_id: 'ch-0', option: 1 },
        { challenge_id: 'ch-1', option: 2 },
      ],
    });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.todaysAnswer).toEqual({ challenge_id: 'ch-1', option: 2 });
  });

  it('todaysAnswer=null when no matching history', () => {
    mockUseTodaysChallenge.mockReturnValue({ data: { id: 'ch-99' }, isLoading: false });
    mockUseChallengeHistory.mockReturnValue({ data: [{ challenge_id: 'ch-1', option: 1 }] });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.todaysAnswer).toBeNull();
  });

  // ── Actions: handleChallengeSubmit ──

  it('handleChallengeSubmit calls service and invalidates queries', async () => {
    const { queryClient } = await import('@/lib/queryClient');
    const { result } = renderHook(() => useHomeData());
    await act(async () => {
      await result.current.handleChallengeSubmit('ch-1', 2);
    });
    expect(mockSubmitDailyChallenge).toHaveBeenCalledWith('ch-1', 2);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.dailyChallenge.history('u1'),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: qk.tickets.balance('u1'),
    });
  });

  // ── Actions: handleOpenMysteryBox ──

  it('handleOpenMysteryBox returns null on failure', async () => {
    mockOpenMysteryBox.mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useHomeData());
    let res: unknown;
    await act(async () => {
      res = await result.current.handleOpenMysteryBox();
    });
    expect(res).toBeNull();
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
    mockUseHoldings.mockReturnValue({ data: [makeHolding()] });
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
    mockUseHoldings.mockReturnValue({ data: [makeHolding()] });
    renderHook(() => useHomeData());
    expect(getStoryMessage).toHaveBeenCalled();
  });

  // ── Gamification Pass-Through ──

  it('passes through ticket data', () => {
    mockUseUserTickets.mockReturnValue({ data: { balance: 42 } });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.ticketData).toEqual({ balance: 42 });
  });

  it('passes through highestPass', () => {
    mockUseHighestPass.mockReturnValue({ data: { tier: 'gold' } });
    const { result } = renderHook(() => useHomeData());
    expect(result.current.highestPass).toEqual({ tier: 'gold' });
  });

  // ── Followed Clubs ──

  it('returns followed clubs from provider', () => {
    const { result } = renderHook(() => useHomeData());
    expect(result.current.followedClubs).toEqual(['club-1']);
  });
});
