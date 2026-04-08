import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ============================================
// Mocks — Services
// ============================================

const mockGetHoldings = vi.fn().mockResolvedValue([]);
const mockGetUserStats = vi.fn().mockResolvedValue(null);
const mockGetFollowerCount = vi.fn().mockResolvedValue(0);
const mockGetFollowingCount = vi.fn().mockResolvedValue(0);
const mockGetResearchPosts = vi.fn().mockResolvedValue([]);
const mockGetAuthorTrackRecord = vi.fn().mockResolvedValue(null);
const mockGetUserTrades = vi.fn().mockResolvedValue([]);
const mockGetUserFantasyHistory = vi.fn().mockResolvedValue([]);
const mockGetUserAchievements = vi.fn().mockResolvedValue([]);
const mockGetMyPayouts = vi.fn().mockResolvedValue([]);
const mockResolveExpiredResearch = vi.fn().mockResolvedValue(0);
const mockFollowUser = vi.fn().mockResolvedValue(undefined);
const mockUnfollowUser = vi.fn().mockResolvedValue(undefined);
const mockCheckIsFollowing = vi.fn().mockResolvedValue(false);
const mockRefreshUserStats = vi.fn().mockResolvedValue(undefined);
const mockCheckAndUnlockAchievements = vi.fn().mockResolvedValue(undefined);
const mockGetMySubscription = vi.fn().mockResolvedValue(null);

// Query hooks are mocked directly (isolate from React Query + Supabase env)
const mockUseTransactions = vi.fn();
const mockUseTicketTransactions = vi.fn();
const mockTxRefetch = vi.fn();
const mockTicketTxRefetch = vi.fn();

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
  getFollowerCount: (...a: any[]) => mockGetFollowerCount(...a),
  getFollowingCount: (...a: any[]) => mockGetFollowingCount(...a),
  checkAndUnlockAchievements: (...a: any[]) => mockCheckAndUnlockAchievements(...a),
  isFollowing: (...a: any[]) => mockCheckIsFollowing(...a),
  followUser: (...a: any[]) => mockFollowUser(...a),
  unfollowUser: (...a: any[]) => mockUnfollowUser(...a),
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

vi.mock('@/components/home/helpers', () => ({
  getLoginStreak: vi.fn(() => ({ current: 5 })),
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
    favorite_club: 'Sakaryaspor',
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
    mockGetFollowerCount.mockResolvedValue(0);
    mockGetFollowingCount.mockResolvedValue(0);
    mockGetResearchPosts.mockResolvedValue([]);
    mockGetAuthorTrackRecord.mockResolvedValue(null);
    mockGetUserTrades.mockResolvedValue([]);
    mockGetUserFantasyHistory.mockResolvedValue([]);
    mockGetUserAchievements.mockResolvedValue([]);
    mockGetMyPayouts.mockResolvedValue([]);
    mockCheckIsFollowing.mockResolvedValue(false);
    mockUseTransactions.mockReturnValue({ data: [], isLoading: false, refetch: mockTxRefetch });
    mockUseTicketTransactions.mockReturnValue({ data: [], isLoading: false, refetch: mockTicketTxRefetch });
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
    expect(mockGetFollowerCount).toHaveBeenCalledWith('u-self');
    expect(mockGetFollowingCount).toHaveBeenCalledWith('u-self');
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

  // ── Follow Actions ──

  it('checks follow status for other users', async () => {
    mockCheckIsFollowing.mockResolvedValue(true);
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.following).toBe(true));
    expect(mockCheckIsFollowing).toHaveBeenCalledWith('u-self', 'u-target');
  });

  it('does not check follow status for self', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockCheckIsFollowing).not.toHaveBeenCalled();
  });

  it('handleFollow calls followUser and increments count', async () => {
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleFollow(); });

    expect(mockFollowUser).toHaveBeenCalledWith('u-self', 'u-target');
    await waitFor(() => expect(result.current.following).toBe(true));
    expect(result.current.followerCount).toBe(1);
  });

  it('handleUnfollow calls unfollowUser and decrements count', async () => {
    mockCheckIsFollowing.mockResolvedValue(true);
    mockGetFollowerCount.mockResolvedValue(5);
    const { result } = renderHook(() => useProfileData(OTHER_PARAMS));
    await waitFor(() => expect(result.current.following).toBe(true));

    await act(async () => { await result.current.handleUnfollow(); });

    expect(mockUnfollowUser).toHaveBeenCalledWith('u-self', 'u-target');
    await waitFor(() => expect(result.current.following).toBe(false));
    expect(result.current.followerCount).toBe(4);
  });

  it('handleFollow does nothing for self', async () => {
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.handleFollow(); });
    expect(mockFollowUser).not.toHaveBeenCalled();
  });

  // ── Stats Refresh ──

  it('handleRefreshStats refreshes user stats', async () => {
    mockGetUserStats.mockResolvedValueOnce({ manager_score: 10, trading_score: 20, scout_score: 30 });
    const { result } = renderHook(() => useProfileData(SELF_PARAMS));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Setup new stats for refresh
    const newStats = { manager_score: 50, trading_score: 60, scout_score: 70 };
    mockGetUserStats.mockResolvedValueOnce(newStats);
    mockGetFollowerCount.mockResolvedValueOnce(10);
    mockGetFollowingCount.mockResolvedValueOnce(5);

    await act(async () => { await result.current.handleRefreshStats(); });

    expect(mockRefreshUserStats).toHaveBeenCalledWith('u-self');
    expect(mockCheckAndUnlockAchievements).toHaveBeenCalledWith('u-self');
    expect(result.current.userStats).toEqual(newStats);
    expect(result.current.followerCount).toBe(10);
    expect(result.current.followingCount).toBe(5);
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
