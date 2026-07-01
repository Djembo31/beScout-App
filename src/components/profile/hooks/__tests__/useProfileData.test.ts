import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================
// Mocks — Services
// ============================================

const mockGetHoldings = vi.fn().mockResolvedValue([]);
const mockGetUserStats = vi.fn().mockResolvedValue(null);
const mockGetResearchPosts = vi.fn().mockResolvedValue([]);
const mockGetAuthorTrackRecord = vi.fn().mockResolvedValue(null);
const mockGetUserTrades = vi.fn().mockResolvedValue([]);
const mockGetUserFantasyHistory = vi.fn().mockResolvedValue([]);
const mockGetUserAchievements = vi.fn().mockResolvedValue([]);
const mockGetMyPayouts = vi.fn().mockResolvedValue([]);
const mockResolveExpiredResearch = vi.fn().mockResolvedValue(0);
const mockRefreshUserStats = vi.fn().mockResolvedValue(undefined);
const mockCheckAndUnlockAchievements = vi.fn().mockResolvedValue(undefined);
const mockGetMySubscription = vi.fn().mockResolvedValue(null);

// Query hooks are mocked directly (isolate from React Query + Supabase env)
const mockUseTransactions = vi.fn();
const mockUseTicketTransactions = vi.fn();
const mockTxRefetch = vi.fn();
const mockTicketTxRefetch = vi.fn();

// Slice 501: Follow ist React Query — Hooks + Toggle-Mutation direkt mocken.
const mockUseFollowerCount = vi.fn((..._a: any[]) => ({ data: 0 as number }));
const mockUseFollowingCount = vi.fn((..._a: any[]) => ({ data: 0 as number }));
const mockUseIsFollowingUser = vi.fn((..._a: any[]) => ({ data: false as boolean }));
const mockToggleFollowAsync = vi.fn().mockResolvedValue(undefined);
const mockInvalidateQueries = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/services/wallet', () => ({
  getHoldings: (...a: any[]) => mockGetHoldings(...a),
  formatScout: (v: number) => `${v}`,
}));

vi.mock('@/lib/queries/misc', () => ({
  useTransactions: (...a: any[]) => mockUseTransactions(...a),
}));

vi.mock('@/lib/queries/tickets', () => ({
  useTicketTransactions: (...a: any[]) => mockUseTicketTransactions(...a),
}));

vi.mock('@/lib/services/social', () => ({
  getUserStats: (...a: any[]) => mockGetUserStats(...a),
  refreshUserStats: (...a: any[]) => mockRefreshUserStats(...a),
  checkAndUnlockAchievements: (...a: any[]) => mockCheckAndUnlockAchievements(...a),
  getUserAchievements: (...a: any[]) => mockGetUserAchievements(...a),
}));

vi.mock('@/lib/services/research', () => ({
  getResearchPosts: (...a: any[]) => mockGetResearchPosts(...a),
  getAuthorTrackRecord: (...a: any[]) => mockGetAuthorTrackRecord(...a),
  resolveExpiredResearch: (...a: any[]) => mockResolveExpiredResearch(...a),
}));

vi.mock('@/lib/services/trading', () => ({
  getUserTrades: (...a: any[]) => mockGetUserTrades(...a),
}));

vi.mock('@/lib/services/lineups', () => ({
  getUserFantasyHistory: (...a: any[]) => mockGetUserFantasyHistory(...a),
}));

vi.mock('@/lib/services/creatorFund', () => ({
  getMyPayouts: (...a: any[]) => mockGetMyPayouts(...a),
}));

vi.mock('@/lib/services/clubSubscriptions', () => ({
  getMySubscription: (...a: any[]) => mockGetMySubscription(...a),
}));

// Slice 324: club name is now derived from favorite_club_id via the club cache.
vi.mock('@/lib/clubs', async (orig) => ({
  ...(await orig<typeof import('@/lib/clubs')>()),
  getClub: (id: string) => (id ? { id, name: 'Sakaryaspor' } : null),
}));

// Stable reference to prevent useEffect re-triggering on every render
const MOCK_USER = { id: 'u-self' };
vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: MOCK_USER, loading: false }),
}));

vi.mock('@/lib/queries/foundingPasses', () => ({
  useHighestPass: vi.fn(() => ({ data: null })),
}));

vi.mock('@/lib/scoutReport', () => ({
  getStrongestDimension: vi.fn(() => 'trader'),
  getDimensionTabOrder: vi.fn(() => ['trader', 'manager', 'analyst']),
}));

vi.mock('@/lib/queries/streaks', () => ({
  useLoginStreak: vi.fn(() => ({ streak: 5, isLoading: false, data: null })),
}));

// Slice 501: Follow-RQ-Hooks + kanonische Toggle-Mutation + useQueryClient (direkter Call in useProfileData).
vi.mock('@/lib/queries/social', () => ({
  useFollowerCount: (...a: any[]) => mockUseFollowerCount(...a),
  useFollowingCount: (...a: any[]) => mockUseFollowingCount(...a),
  useIsFollowingUser: (...a: any[]) => mockUseIsFollowingUser(...a),
}));

vi.mock('@/lib/hooks/useToggleFollowUser', () => ({
  useToggleFollowUser: () => ({ toggle: vi.fn(), toggleAsync: mockToggleFollowAsync, isPending: false, error: null }),
}));

vi.mock('@tanstack/react-query', async (orig) => ({
  ...(await orig<typeof import('@tanstack/react-query')>()),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useProfileData } from '../useProfileData';

// ============================================
// Fixtures
// ============================================

function makeProfile(overrides: Record<string, any> = {}) {
  return {
    id: 'u-target',
    handle: 'testuser',
    display_name: 'Test User',
    level: 3,
    favorite_club_id: 'club-1',
    ...overrides,
  };
}

const SELF_PARAMS = { targetUserId: 'u-self', targetProfile: makeProfile({ id: 'u-self' }) as any, isSelf: true };
const OTHER_PARAMS = { targetUserId: 'u-target', targetProfile: makeProfile() as any, isSelf: false };

// ============================================
// Tests
// ============================================

describe('useProfileData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetHoldings.mockResolvedValue([]);
    mockGetUserStats.mockResolvedValue(null);
    mockGetResearchPosts.mockResolvedValue([]);
    mockGetAuthorTrackRecord.mockResolvedValue(null);
    mockGetUserTrades.mockResolvedValue([]);
    mockGetUserFantasyHistory.mockResolvedValue([]);
    mockGetUserAchievements.mockResolvedValue([]);
    mockGetMyPayouts.mockResolvedValue([]);
    mockUseTransactions.mockReturnValue({ data: [], isLoading: false, refetch: mockTxRefetch });
    mockUseTicketTransactions.mockReturnValue({ data: [], isLoading: false, refetch: mockTicketTxRefetch });
    mockUseFollowerCount.mockReturnValue({ data: 0 });
    mockUseFollowingCount.mockReturnValue({ data: 0 });
    mockUseIsFollowingUser.mockReturnValue({ data: false });
    mockToggleFollowAsync.mockResolvedValue(undefined);
  });

  // ── Loading States ──

  it('starts in loading state', () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    expect(result.current.loading).toBe(true);
    expect(result.current.dataError).toBe(false);
  });

  it('finishes loading after data fetch', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.dataError).toBe(false);
  });

  it('handles individual service failures gracefully via Promise.allSettled', async () => {
    mockGetHoldings.mockRejectedValue(new Error('fail'));
    mockGetUserTrades.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Promise.allSettled catches individual failures — val() returns fallbacks
    expect(result.current.dataError).toBe(false);
    expect(result.current.holdings).toEqual([]);
    expect(result.current.recentTrades).toEqual([]);
  });

  // ── Data Loading ──

  it('loads all data in parallel', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetHoldings).toHaveBeenCalledWith('u-self');
    expect(mockUseTransactions).toHaveBeenCalledWith('u-self', { limit: 50 });
    expect(mockGetUserStats).toHaveBeenCalledWith('u-self');
    // Slice 501: follower/following counts now via React Query hooks
    expect(mockUseFollowerCount).toHaveBeenCalledWith('u-self');
    expect(mockUseFollowingCount).toHaveBeenCalledWith('u-self');
  });

  it('calls self-only services when isSelf=true', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetMyPayouts).toHaveBeenCalledWith('u-self');
    expect(mockUseTicketTransactions).toHaveBeenCalledWith('u-self', { limit: 50, enabled: true });
    expect(mockResolveExpiredResearch).toHaveBeenCalled();
  });

  it('does NOT call self-only services when isSelf=false', async () => {
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockResolveExpiredResearch).not.toHaveBeenCalled();
  });

  // ── Holdings + Portfolio ──

  it('computes portfolioPnlPct from holdings', async () => {
    mockGetHoldings.mockResolvedValue([
      { quantity: 10, avg_buy_price: 100, player: { floor_price: 150 } },
    ]);
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // value=1500, cost=1000, pnl=50%
    expect(result.current.portfolioPnlPct).toBe(50);
  });

  it('returns portfolioPnlPct=0 when no holdings', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.portfolioPnlPct).toBe(0);
  });

  // ── Fantasy Stats ──

  it('computes avgFantasyRank', async () => {
    mockGetUserFantasyHistory.mockResolvedValue([
      { rank: 2 }, { rank: 4 }, { rank: 6 },
    ]);
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.avgFantasyRank).toBe(4);
  });

  it('returns undefined avgFantasyRank when no results', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.avgFantasyRank).toBeUndefined();
  });

  // ── Public Transactions ──

  it('filters public transactions for other users', async () => {
    mockUseTransactions.mockReturnValue({
      data: [
        { type: 'buy', id: '1' },
        { type: 'deposit', id: '2' },
        { type: 'sell', id: '3' },
      ],
      isLoading: false,
      refetch: mockTxRefetch,
    });
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.publicTransactions).toHaveLength(2);
    expect(result.current.publicTransactions.map(t => t.type)).toEqual(['buy', 'sell']);
  });

  it('shows all transactions for self', async () => {
    mockUseTransactions.mockReturnValue({
      data: [
        { type: 'buy', id: '1' },
        { type: 'deposit', id: '2' },
      ],
      isLoading: false,
      refetch: mockTxRefetch,
    });
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.publicTransactions).toHaveLength(2);
  });

  // ── Tab State ──

  it('initializes tab to strongest dimension', async () => {
    mockGetUserStats.mockResolvedValue({
      manager_score: 100, trading_score: 500, scout_score: 200,
    });
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    // getStrongestDimension mock returns 'trader'
    expect(result.current.tab).toBe('trader');
  });

  it('allows tab change', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setTab('analyst'));
    expect(result.current.tab).toBe('analyst');
  });

  // ── Follow Actions (Slice 501 — React Query) ──

  it('reflects follow status from useIsFollowingUser for other users', async () => {
    mockUseIsFollowingUser.mockReturnValue({ data: true });
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.following).toBe(true));
    expect(mockUseIsFollowingUser).toHaveBeenCalledWith('u-self', 'u-target');
  });

  it('disables follow-status query for self (both args undefined)', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockUseIsFollowingUser).toHaveBeenCalledWith(undefined, undefined);
    expect(result.current.following).toBe(false);
  });

  it('handleFollow triggers toggleFollowUser with follow=true', async () => {
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleFollow(); });

    expect(mockToggleFollowAsync).toHaveBeenCalledWith({ targetUserId: 'u-target', follow: true });
  });

  it('handleUnfollow triggers toggleFollowUser with follow=false', async () => {
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleUnfollow(); });

    expect(mockToggleFollowAsync).toHaveBeenCalledWith({ targetUserId: 'u-target', follow: false });
  });

  it('handleFollow does nothing for self', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleFollow(); });
    expect(mockToggleFollowAsync).not.toHaveBeenCalled();
  });

  it('exposes follower/following counts from React Query hooks', async () => {
    mockUseFollowerCount.mockReturnValue({ data: 10 });
    mockUseFollowingCount.mockReturnValue({ data: 5 });
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.followerCount).toBe(10);
    expect(result.current.followingCount).toBe(5);
  });

  // ── Stats Refresh ──

  it('handleRefreshStats refreshes user stats + invalidates count queries', async () => {
    mockGetUserStats.mockResolvedValueOnce({ manager_score: 10, trading_score: 20, scout_score: 30 });
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newStats = { manager_score: 50, trading_score: 60, scout_score: 70 };
    mockGetUserStats.mockResolvedValueOnce(newStats);

    await act(async () => { await result.current.handleRefreshStats(); });

    expect(mockRefreshUserStats).toHaveBeenCalledWith('u-self');
    expect(mockCheckAndUnlockAchievements).toHaveBeenCalledWith('u-self');
    expect(result.current.userStats).toEqual(newStats);
    // Slice 501: counts are React Query → refreshStats invalidates the keys (not setState)
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  // ── Retry ──

  it('retry triggers data reload', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetHoldings).toHaveBeenCalledTimes(1);

    act(() => result.current.retry());
    await waitFor(() => expect(mockGetHoldings).toHaveBeenCalledTimes(2));
    expect(mockTxRefetch).toHaveBeenCalled();
    expect(mockTicketTxRefetch).toHaveBeenCalled();
  });

  // ── Streak (self only) ──

  it('returns streakDays for self', () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    expect(result.current.streakDays).toBe(5);
  });

  it('returns streakDays=0 for other users', () => {
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    expect(result.current.streakDays).toBe(0);
  });

  // ── Club Subscription ──

  it('loads club subscription when favorite_club_id exists', async () => {
    mockGetMySubscription.mockResolvedValue({ tier: 'gold' });
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.clubSub).toEqual({ tier: 'gold', clubName: 'Sakaryaspor' }));
  });

  // ── Dimension Order ──

  it('returns dimOrder from getDimensionTabOrder', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    expect(result.current.dimOrder).toEqual(['trader', 'manager', 'analyst']);
  });
});
