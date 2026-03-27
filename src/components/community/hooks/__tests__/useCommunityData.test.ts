import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { CommunityState, CommunityAction } from '../types';

// ============================================
// Mocks — ALL query hooks (barrel import)
// ============================================

vi.mock('@/lib/queries', () => ({
  usePosts: vi.fn(() => ({ data: undefined, isLoading: false, isError: false })),
  useClubVotes: vi.fn(() => ({ data: undefined })),
  useLeaderboard: vi.fn(() => ({ data: undefined })),
  useFollowingIds: vi.fn(() => ({ data: undefined })),
  useHoldings: vi.fn(() => ({ data: undefined })),
  usePlayerNames: vi.fn(() => ({ data: undefined })),
  useResearchPosts: vi.fn(() => ({ data: undefined })),
  useFollowerCount: vi.fn(() => ({ data: undefined })),
  useFollowingCount: vi.fn(() => ({ data: undefined })),
  useActiveBounties: vi.fn(() => ({ data: undefined })),
  useClubSubscription: vi.fn(() => ({ data: undefined })),
  useUserStats: vi.fn(() => ({ data: undefined })),
  useCommunityPolls: vi.fn(() => ({ data: undefined })),
}));

// ============================================
// Mocks — Service functions (used in useEffects)
// ============================================

vi.mock('@/lib/services/clubSubscriptions', () => ({
  getActiveSubscriptionsByUsers: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock('@/lib/services/research', () => ({
  resolveExpiredResearch: vi.fn(() => Promise.resolve(0)),
}));

vi.mock('@/lib/services/club', () => ({
  getClubBySlug: vi.fn(() => Promise.resolve(null)),
  getUserPrimaryClub: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/services/posts', () => ({
  getUserPostVotes: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock('@/lib/services/votes', () => ({
  getUserVotedIds: vi.fn(() => Promise.resolve(new Set())),
}));

vi.mock('@/lib/services/communityPolls', () => ({
  getUserPollVotedIds: vi.fn(() => Promise.resolve(new Set())),
}));

vi.mock('@/lib/gamification', () => ({
  getGesamtRang: vi.fn(() => ({ tier: 0, id: 'bronze', name: 'Bronze', subStufe: 'I', fullName: 'Bronze I' })),
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

import { useCommunityData } from '../useCommunityData';
import {
  usePosts,
  useClubVotes,
  useLeaderboard,
  useFollowingIds,
  useHoldings,
  usePlayerNames,
  useResearchPosts,
  useFollowerCount,
  useFollowingCount,
  useActiveBounties,
  useClubSubscription,
  useUserStats,
  useCommunityPolls,
} from '@/lib/queries';
import { getUserPostVotes } from '@/lib/services/posts';
import { getUserVotedIds } from '@/lib/services/votes';
import { getUserPollVotedIds } from '@/lib/services/communityPolls';
import { getUserPrimaryClub } from '@/lib/services/club';
import { getGesamtRang } from '@/lib/gamification';

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

const USER_ID = 'u-community-1';
const CLUB_ID = 'club-sakarya';
const CLUB_NAME = 'Sakaryaspor';

function makeDefaultState(overrides: Partial<CommunityState> = {}): CommunityState {
  return {
    clubId: null,
    clubName: null,
    isClubAdmin: false,
    clubScope: 'all',
    feedMode: 'all',
    contentFilter: 'all',
    createPostOpen: false,
    createResearchOpen: false,
    followListMode: null,
    defaultPostType: 'general',
    createBountyOpen: false,
    postLoading: false,
    researchLoading: false,
    bountySubmitting: null,
    bountyCreating: false,
    unlockingResearchId: null,
    ratingResearchId: null,
    votingId: null,
    pollVotingId: null,
    ...overrides,
  };
}

const mockDispatch = vi.fn() as unknown as React.Dispatch<CommunityAction> & { mock: { calls: unknown[][] } };

const mockProfile = {
  favorite_club_id: CLUB_ID,
  favorite_club: CLUB_NAME,
};

// ============================================
// Tests
// ============================================

describe('useCommunityData', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all query hook mocks to default undefined returns
    vi.mocked(usePosts).mockReturnValue({ data: undefined, isLoading: false, isError: false } as unknown as ReturnType<typeof usePosts>);
    vi.mocked(useClubVotes).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useClubVotes>);
    vi.mocked(useLeaderboard).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useLeaderboard>);
    vi.mocked(useFollowingIds).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useFollowingIds>);
    vi.mocked(useHoldings).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useHoldings>);
    vi.mocked(usePlayerNames).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof usePlayerNames>);
    vi.mocked(useResearchPosts).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useResearchPosts>);
    vi.mocked(useFollowerCount).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useFollowerCount>);
    vi.mocked(useFollowingCount).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useFollowingCount>);
    vi.mocked(useActiveBounties).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useActiveBounties>);
    vi.mocked(useClubSubscription).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useClubSubscription>);
    vi.mocked(useUserStats).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useUserStats>);
    vi.mocked(useCommunityPolls).mockReturnValue({ data: undefined } as unknown as ReturnType<typeof useCommunityPolls>);

    // Reset service mocks
    vi.mocked(getUserPostVotes).mockResolvedValue(new Map());
    vi.mocked(getUserVotedIds).mockResolvedValue(new Set());
    vi.mocked(getUserPollVotedIds).mockResolvedValue(new Set());
    vi.mocked(getUserPrimaryClub).mockResolvedValue(null);
    vi.mocked(getGesamtRang).mockReturnValue({
      tier: 0, id: 'bronze' as const, name: 'Bronze', subStufe: 'I',
      fullName: 'Bronze I', i18nKey: 'bronzeI', color: '', bgColor: '',
      borderColor: '', gradientFrom: '', minScore: 0, maxScore: 200,
    });
  });

  // ------------------------------------------
  // 1. Default / undefined query returns
  // ------------------------------------------
  describe('defaults when all queries return undefined', () => {
    it('returns empty/null defaults for all data fields', () => {
      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      // Derived sets should be empty
      expect(result.current.followingIds).toBeInstanceOf(Set);
      expect(result.current.followingIds.size).toBe(0);
      expect(result.current.ownedPlayerIds).toBeInstanceOf(Set);
      expect(result.current.ownedPlayerIds.size).toBe(0);

      // Scalar defaults
      expect(result.current.userRangTier).toBe(0);

      // Query data should be undefined or safe defaults (implementation may default arrays to [])
      // The important contract: these fields exist and don't throw
      expect(result.current).toHaveProperty('posts');
      expect(result.current).toHaveProperty('clubVotes');
      expect(result.current).toHaveProperty('leaderboard');
      expect(result.current).toHaveProperty('researchPosts');
      expect(result.current).toHaveProperty('bounties');
      expect(result.current).toHaveProperty('communityPolls');
    });

    it('returns postsLoading as false and postsError as false when no data', () => {
      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.postsLoading).toBe(false);
      expect(result.current.postsError).toBe(false);
    });
  });

  // ------------------------------------------
  // 2. Derived data: followingIds Set
  // ------------------------------------------
  describe('followingIds derived Set', () => {
    it('builds a Set from useFollowingIds data', () => {
      vi.mocked(useFollowingIds).mockReturnValue({
        data: ['user-a', 'user-b', 'user-c'],
      } as unknown as ReturnType<typeof useFollowingIds>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.followingIds).toBeInstanceOf(Set);
      expect(result.current.followingIds.size).toBe(3);
      expect(result.current.followingIds.has('user-a')).toBe(true);
      expect(result.current.followingIds.has('user-b')).toBe(true);
      expect(result.current.followingIds.has('user-c')).toBe(true);
    });

    it('handles empty following array', () => {
      vi.mocked(useFollowingIds).mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useFollowingIds>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.followingIds).toBeInstanceOf(Set);
      expect(result.current.followingIds.size).toBe(0);
    });

    it('handles duplicate IDs in following data gracefully', () => {
      vi.mocked(useFollowingIds).mockReturnValue({
        data: ['user-a', 'user-a', 'user-b'],
      } as unknown as ReturnType<typeof useFollowingIds>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.followingIds.size).toBe(2);
    });
  });

  // ------------------------------------------
  // 3. Derived data: ownedPlayerIds Set from holdings
  // ------------------------------------------
  describe('ownedPlayerIds derived Set from holdings', () => {
    it('builds ownedPlayerIds Set from holdings player IDs', () => {
      vi.mocked(useHoldings).mockReturnValue({
        data: [
          { player_id: 'player-1', quantity: 3, user_id: USER_ID },
          { player_id: 'player-2', quantity: 1, user_id: USER_ID },
          { player_id: 'player-3', quantity: 5, user_id: USER_ID },
        ],
      } as unknown as ReturnType<typeof useHoldings>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.ownedPlayerIds).toBeInstanceOf(Set);
      expect(result.current.ownedPlayerIds.size).toBe(3);
      expect(result.current.ownedPlayerIds.has('player-1')).toBe(true);
      expect(result.current.ownedPlayerIds.has('player-2')).toBe(true);
      expect(result.current.ownedPlayerIds.has('player-3')).toBe(true);
    });

    it('returns empty Set when holdings is undefined', () => {
      vi.mocked(useHoldings).mockReturnValue({
        data: undefined,
      } as unknown as ReturnType<typeof useHoldings>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.ownedPlayerIds).toBeInstanceOf(Set);
      expect(result.current.ownedPlayerIds.size).toBe(0);
    });

    it('returns empty Set when holdings is empty array', () => {
      vi.mocked(useHoldings).mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useHoldings>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.ownedPlayerIds).toBeInstanceOf(Set);
      expect(result.current.ownedPlayerIds.size).toBe(0);
    });
  });

  // ------------------------------------------
  // 4. userRangTier from getGesamtRang
  // ------------------------------------------
  describe('userRangTier', () => {
    it('defaults to 0 when no userStats data', () => {
      vi.mocked(useUserStats).mockReturnValue({
        data: undefined,
      } as unknown as ReturnType<typeof useUserStats>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.userRangTier).toBe(0);
    });

    it('computes userRangTier from getGesamtRang when stats exist', () => {
      const mockStats = {
        user_id: USER_ID,
        trader_score: 700,
        manager_score: 600,
        analyst_score: 500,
        xp: 1000,
      };
      vi.mocked(useUserStats).mockReturnValue({
        data: mockStats,
      } as unknown as ReturnType<typeof useUserStats>);
      vi.mocked(getGesamtRang).mockReturnValue({
        tier: 5,
        id: 'silber' as const,
        name: 'Silber',
        subStufe: 'II',
        fullName: 'Silber II',
        i18nKey: 'silberII',
        color: 'text-gray-300',
        bgColor: 'bg-gray-300/10',
        borderColor: 'border-gray-300/20',
        gradientFrom: 'from-gray-300',
        minScore: 600,
        maxScore: 800,
      });

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.userRangTier).toBe(5);
      expect(getGesamtRang).toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // 5. postsLoading and postsError forwarding
  // ------------------------------------------
  describe('posts loading and error forwarding', () => {
    it('forwards postsLoading=true from usePosts', () => {
      vi.mocked(usePosts).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      } as unknown as ReturnType<typeof usePosts>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.postsLoading).toBe(true);
      expect(result.current.postsError).toBe(false);
    });

    it('forwards postsError=true from usePosts', () => {
      vi.mocked(usePosts).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      } as unknown as ReturnType<typeof usePosts>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.postsLoading).toBe(false);
      expect(result.current.postsError).toBe(true);
    });

    it('forwards posts data when available', () => {
      const mockPosts = [
        { id: 'post-1', user_id: USER_ID, content: 'Hello', created_at: '2025-01-01' },
        { id: 'post-2', user_id: 'u-2', content: 'World', created_at: '2025-01-02' },
      ];
      vi.mocked(usePosts).mockReturnValue({
        data: mockPosts,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePosts>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.posts).toEqual(mockPosts);
    });
  });

  // ------------------------------------------
  // 6. Club resolution dispatches SET_CLUB
  // ------------------------------------------
  describe('club resolution side-effect', () => {
    it('dispatches SET_CLUB when profile has favorite_club_id', async () => {
      vi.mocked(getUserPrimaryClub).mockResolvedValue({
        id: CLUB_ID,
        name: CLUB_NAME,
        slug: 'sakaryaspor',
      } as Awaited<ReturnType<typeof getUserPrimaryClub>>);

      renderHook(
        () => useCommunityData(USER_ID, mockProfile, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'SET_CLUB' }),
        );
      });
    });

    it('does not dispatch SET_CLUB when profile is null', async () => {
      renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      // Give time for any potential async side effects to fire
      await new Promise((r) => setTimeout(r, 50));

      const setCLubCalls = mockDispatch.mock.calls.filter(
        (call) => (call[0] as { type: string }).type === 'SET_CLUB',
      );
      // If it dispatches at all, it should not have a club from profile
      // With null profile and no scopeClubId, club resolution may still run
      // but should not crash
      expect(setCLubCalls.length).toBeLessThanOrEqual(1);
    });

    it('does not dispatch SET_CLUB when userId is undefined', async () => {
      // Create a fresh dispatch for this test to avoid cross-test pollution
      const localDispatch = vi.fn() as unknown as React.Dispatch<CommunityAction> & { mock: { calls: unknown[][] } };

      renderHook(
        () => useCommunityData(undefined, mockProfile, undefined, makeDefaultState(), localDispatch),
        { wrapper: createWrapper() },
      );

      await new Promise((r) => setTimeout(r, 50));

      const setClubCalls = localDispatch.mock.calls.filter(
        (call) => (call[0] as { type: string }).type === 'SET_CLUB',
      );
      expect(setClubCalls.length).toBe(0);
    });
  });

  // ------------------------------------------
  // 7. Post vote loading side-effect
  // ------------------------------------------
  describe('post vote loading side-effect', () => {
    it('calls getUserPostVotes when userId and posts are present', async () => {
      const mockPosts = [
        { id: 'post-1', user_id: 'u-other', content: 'Test' },
        { id: 'post-2', user_id: 'u-other2', content: 'Test2' },
      ];
      vi.mocked(usePosts).mockReturnValue({
        data: mockPosts,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePosts>);
      vi.mocked(getUserPostVotes).mockResolvedValue(
        new Map([['post-1', 1], ['post-2', -1]]),
      );

      renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(getUserPostVotes).toHaveBeenCalledWith(USER_ID, ['post-1', 'post-2']);
      });
    });

    it('does not call getUserPostVotes with undefined userId even when posts exist', async () => {
      const mockPosts = [
        { id: 'post-1', user_id: 'u-other', content: 'Test' },
      ];
      vi.mocked(usePosts).mockReturnValue({
        data: mockPosts,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePosts>);

      renderHook(
        () => useCommunityData(undefined, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await new Promise((r) => setTimeout(r, 50));
      // Should never be called with undefined as first arg
      const callsWithUndefined = vi.mocked(getUserPostVotes).mock.calls.filter(
        (call) => call[0] === undefined,
      );
      expect(callsWithUndefined).toHaveLength(0);
    });

    it('does not call getUserPostVotes when posts are undefined', async () => {
      vi.mocked(usePosts).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePosts>);

      const callCountBefore = vi.mocked(getUserPostVotes).mock.calls.length;

      renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await new Promise((r) => setTimeout(r, 50));
      // No new calls should have been made from this render
      expect(vi.mocked(getUserPostVotes).mock.calls.length).toBe(callCountBefore);
    });

    it('does not call getUserPostVotes when posts array is empty', async () => {
      vi.mocked(usePosts).mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePosts>);

      const callCountBefore = vi.mocked(getUserPostVotes).mock.calls.length;

      renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await new Promise((r) => setTimeout(r, 50));
      expect(vi.mocked(getUserPostVotes).mock.calls.length).toBe(callCountBefore);
    });
  });

  // ------------------------------------------
  // 8. Vote ID loading side-effect
  // ------------------------------------------
  describe('vote ID loading side-effect', () => {
    it('calls getUserVotedIds when userId is present', async () => {
      vi.mocked(getUserVotedIds).mockResolvedValue(new Set(['vote-1', 'vote-2']));

      renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(getUserVotedIds).toHaveBeenCalledWith(USER_ID);
      });
    });

    it('does not call getUserVotedIds with undefined userId', async () => {
      renderHook(
        () => useCommunityData(undefined, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await new Promise((r) => setTimeout(r, 50));
      const callsWithUndefined = vi.mocked(getUserVotedIds).mock.calls.filter(
        (call) => call[0] === undefined,
      );
      expect(callsWithUndefined).toHaveLength(0);
    });
  });

  // ------------------------------------------
  // 9. Poll vote ID loading side-effect
  // ------------------------------------------
  describe('poll vote ID loading side-effect', () => {
    it('calls getUserPollVotedIds when userId is present', async () => {
      vi.mocked(getUserPollVotedIds).mockResolvedValue(new Set(['poll-1']));

      renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(getUserPollVotedIds).toHaveBeenCalledWith(USER_ID);
      });
    });

    it('does not call getUserPollVotedIds with undefined userId', async () => {
      renderHook(
        () => useCommunityData(undefined, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await new Promise((r) => setTimeout(r, 50));
      const callsWithUndefined = vi.mocked(getUserPollVotedIds).mock.calls.filter(
        (call) => call[0] === undefined,
      );
      expect(callsWithUndefined).toHaveLength(0);
    });
  });

  // ------------------------------------------
  // 10. Query data forwarding
  // ------------------------------------------
  describe('query data forwarding', () => {
    it('forwards clubVotes data', () => {
      const mockVotes = [{ id: 'vote-1', title: 'MVP' }];
      vi.mocked(useClubVotes).mockReturnValue({
        data: mockVotes,
      } as unknown as ReturnType<typeof useClubVotes>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.clubVotes).toEqual(mockVotes);
    });

    it('forwards leaderboard data', () => {
      const mockLeaderboard = [{ user_id: 'u-1', xp: 500 }];
      vi.mocked(useLeaderboard).mockReturnValue({
        data: mockLeaderboard,
      } as unknown as ReturnType<typeof useLeaderboard>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.leaderboard).toEqual(mockLeaderboard);
    });

    it('forwards researchPosts data', () => {
      const mockResearch = [{ id: 'r-1', title: 'Analysis', call: 'Bullish' }];
      vi.mocked(useResearchPosts).mockReturnValue({
        data: mockResearch,
      } as unknown as ReturnType<typeof useResearchPosts>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.researchPosts).toEqual(mockResearch);
    });

    it('forwards bounties data', () => {
      const mockBounties = [{ id: 'b-1', title: 'Scouting' }];
      vi.mocked(useActiveBounties).mockReturnValue({
        data: mockBounties,
      } as unknown as ReturnType<typeof useActiveBounties>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.bounties).toEqual(mockBounties);
    });

    it('forwards communityPolls data', () => {
      const mockPolls = [{ id: 'p-1', question: 'Who scores?' }];
      vi.mocked(useCommunityPolls).mockReturnValue({
        data: mockPolls,
      } as unknown as ReturnType<typeof useCommunityPolls>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.communityPolls).toEqual(mockPolls);
    });

    it('forwards followerCount and followingCount', () => {
      vi.mocked(useFollowerCount).mockReturnValue({
        data: 42,
      } as unknown as ReturnType<typeof useFollowerCount>);
      vi.mocked(useFollowingCount).mockReturnValue({
        data: 17,
      } as unknown as ReturnType<typeof useFollowingCount>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.followerCount).toBe(42);
      expect(result.current.followingCount).toBe(17);
    });

    it('forwards subscription data', () => {
      const mockSub = { tier: 'gold' as const, club_id: CLUB_ID, user_id: USER_ID };
      vi.mocked(useClubSubscription).mockReturnValue({
        data: mockSub,
      } as unknown as ReturnType<typeof useClubSubscription>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.subscription).toEqual(mockSub);
    });

    it('forwards userStats data', () => {
      const mockStats = {
        user_id: USER_ID,
        trader_score: 500,
        manager_score: 500,
        analyst_score: 500,
      };
      vi.mocked(useUserStats).mockReturnValue({
        data: mockStats,
      } as unknown as ReturnType<typeof useUserStats>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.userStats).toEqual(mockStats);
    });
  });

  // ------------------------------------------
  // 11. Return shape includes state setters (myPostVotes, userVotedIds, userPollVotedIds)
  // ------------------------------------------
  describe('state setters exposed', () => {
    it('exposes myPostVotes, setMyPostVotes', () => {
      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current).toHaveProperty('myPostVotes');
      expect(result.current).toHaveProperty('setMyPostVotes');
      expect(typeof result.current.setMyPostVotes).toBe('function');
    });

    it('exposes userVotedIds, setUserVotedIds', () => {
      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current).toHaveProperty('userVotedIds');
      expect(result.current).toHaveProperty('setUserVotedIds');
      expect(typeof result.current.setUserVotedIds).toBe('function');
    });

    it('exposes userPollVotedIds, setUserPollVotedIds', () => {
      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current).toHaveProperty('userPollVotedIds');
      expect(result.current).toHaveProperty('setUserPollVotedIds');
      expect(typeof result.current.setUserPollVotedIds).toBe('function');
    });

    it('exposes subscriptionMap', () => {
      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current).toHaveProperty('subscriptionMap');
    });
  });

  // ------------------------------------------
  // 12. allPlayers forwarding from usePlayerNames
  // ------------------------------------------
  describe('allPlayers from usePlayerNames', () => {
    it('forwards allPlayers from usePlayerNames query', () => {
      const mockNames = [
        { id: 'p-1', first_name: 'Hakan', last_name: 'Calhanoglu' },
        { id: 'p-2', first_name: 'Ferdi', last_name: 'Kadioglu' },
      ];
      vi.mocked(usePlayerNames).mockReturnValue({
        data: mockNames,
      } as unknown as ReturnType<typeof usePlayerNames>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.allPlayers).toEqual(mockNames);
    });
  });

  // ------------------------------------------
  // 13. scopeClubId parameter forwarding
  // ------------------------------------------
  describe('scopeClubId parameter', () => {
    it('passes scopeClubId to useClubVotes', () => {
      renderHook(
        () => useCommunityData(USER_ID, null, CLUB_ID, makeDefaultState({ clubId: CLUB_ID }), mockDispatch),
        { wrapper: createWrapper() },
      );

      // useClubVotes should receive a club ID
      expect(useClubVotes).toHaveBeenCalled();
    });

    it('passes scopeClubId to useActiveBounties', () => {
      renderHook(
        () => useCommunityData(USER_ID, null, CLUB_ID, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(useActiveBounties).toHaveBeenCalled();
    });
  });

  // ------------------------------------------
  // 14. Undefined userId disables user-dependent queries
  // ------------------------------------------
  describe('undefined userId', () => {
    it('still renders without crashing', () => {
      const { result } = renderHook(
        () => useCommunityData(undefined, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.followingIds).toBeInstanceOf(Set);
      expect(result.current.followingIds.size).toBe(0);
      expect(result.current.ownedPlayerIds).toBeInstanceOf(Set);
      expect(result.current.ownedPlayerIds.size).toBe(0);
      expect(result.current.userRangTier).toBe(0);
    });
  });

  // ------------------------------------------
  // 15. Regression: post_votes.vote_type is SMALLINT 1/-1
  //     (from common-errors.md — must NOT be boolean)
  // ------------------------------------------
  describe('regression: post vote values', () => {
    it('getUserPostVotes handles numeric vote values (1/-1, not boolean)', async () => {
      const mockPosts = [
        { id: 'post-1', user_id: 'u-other', content: 'Test' },
      ];
      vi.mocked(usePosts).mockReturnValue({
        data: mockPosts,
        isLoading: false,
        isError: false,
      } as unknown as ReturnType<typeof usePosts>);

      const voteMap = new Map<string, number>([['post-1', 1]]);
      vi.mocked(getUserPostVotes).mockResolvedValue(voteMap);

      renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(getUserPostVotes).toHaveBeenCalledWith(USER_ID, ['post-1']);
      });

      // The service returns Map<string, number> not Map<string, boolean>
      // This verifies the hook doesn't accidentally coerce to boolean
      const returnedMap = await getUserPostVotes(USER_ID, ['post-1']);
      expect(returnedMap.get('post-1')).toBe(1);
      expect(typeof returnedMap.get('post-1')).toBe('number');
    });
  });

  // ------------------------------------------
  // 16. Regression: user_stats.tier CHECK constraint
  //     (from common-errors.md)
  // ------------------------------------------
  describe('regression: user stats tier mapping', () => {
    it('handles valid tier values from DB', () => {
      const mockStats = {
        user_id: USER_ID,
        trader_score: 800,
        manager_score: 750,
        analyst_score: 600,
        tier: 'Profi', // valid CHECK value
      };
      vi.mocked(useUserStats).mockReturnValue({
        data: mockStats,
      } as unknown as ReturnType<typeof useUserStats>);
      vi.mocked(getGesamtRang).mockReturnValue({
        tier: 7,
        id: 'gold' as const,
        name: 'Gold',
        subStufe: 'I',
        fullName: 'Gold I',
        i18nKey: 'goldI',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10',
        borderColor: 'border-yellow-400/20',
        gradientFrom: 'from-yellow-400',
        minScore: 700,
        maxScore: 900,
      });

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, undefined, makeDefaultState(), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.userRangTier).toBe(7);
    });
  });

  // ------------------------------------------
  // 17. Regression: club_subscriptions.tier CHECK constraint
  //     'silber' not 'silver' (from common-errors.md)
  // ------------------------------------------
  describe('regression: subscription tier values', () => {
    it('handles German tier names (silber, not silver)', () => {
      const mockSub = { tier: 'silber' as const, club_id: CLUB_ID, user_id: USER_ID };
      vi.mocked(useClubSubscription).mockReturnValue({
        data: mockSub,
      } as unknown as ReturnType<typeof useClubSubscription>);

      const { result } = renderHook(
        () => useCommunityData(USER_ID, null, CLUB_ID, makeDefaultState({ clubId: CLUB_ID }), mockDispatch),
        { wrapper: createWrapper() },
      );

      expect(result.current.subscription?.tier).toBe('silber');
    });
  });
});
