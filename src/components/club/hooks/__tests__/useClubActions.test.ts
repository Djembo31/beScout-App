import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Mocks
// ============================================

const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);
const mockAddToast = vi.fn();
const mockToggleFollowClub = vi.fn().mockResolvedValue(undefined);
const mockInvalidateQueries = vi.fn();
const mockLogSilentCatch = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({
    user: { id: 'u-1', email: 'test@test.com' },
    refreshProfile: mockRefreshProfile,
    loading: false,
  }),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/services/club', () => ({
  toggleFollowClub: (...args: unknown[]) => mockToggleFollowClub(...args),
}));

const mockSetQueryData = vi.fn();
vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: (...args: unknown[]) => mockInvalidateQueries(...args),
    setQueryData: (...args: unknown[]) => mockSetQueryData(...args),
  },
}));

vi.mock('@/lib/queries/keys', () => ({
  qk: {
    clubs: {
      isFollowing: (userId: string, clubId: string) => ['clubs', 'isFollowing', userId, clubId],
      followers: (clubId: string) => ['clubs', 'followers', clubId],
    },
  },
}));

vi.mock('@/lib/observability/silentRejects', () => ({
  logSilentCatch: (tag: string, err: unknown) => mockLogSilentCatch(tag, err),
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useClubActions } from '../useClubActions';
import { qk } from '@/lib/queries/keys';

// ============================================
// Fixtures & wrapper
// ============================================

function makeClub() {
  return {
    id: 'club-1',
    name: 'Sakaryaspor',
    slug: 'sakaryaspor',
    league: 'TFF 1. Lig',
    primary_color: '#006633',
    secondary_color: '#fff',
    is_admin: false,
    admin_role: null,
  };
}

// Slice 151b: useSafeMutation uses React Query — tests need QueryClientProvider.
function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

// ============================================
// Tests
// ============================================

describe('useClubActions (Slice 151b — useSafeMutation migration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleFollowClub.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
  });

  // ── Initial State ──

  it('returns isFollowing from data when no local override', () => {
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: true,
          followerCountData: 100,
        }),
      { wrapper: createWrapper() },
    );
    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followerCount).toBe(100);
    expect(result.current.followLoading).toBe(false);
  });

  it('returns isFollowing=false from data', () => {
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 50,
        }),
      { wrapper: createWrapper() },
    );
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followerCount).toBe(50);
  });

  // ── Follow Toggle — Success ──

  it('calls toggleFollowClub + refreshProfile + setQueryData on success', async () => {
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 100,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() =>
      expect(mockToggleFollowClub).toHaveBeenCalledWith('u-1', 'club-1', 'Sakaryaspor', true),
    );
    await waitFor(() => expect(mockRefreshProfile).toHaveBeenCalled());
    // Slice 143 pattern: setQueryData (deterministic ±1), NOT invalidateQueries
    await waitFor(() => expect(mockSetQueryData).toHaveBeenCalledTimes(2));
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });

  it('calls toggleFollowClub with correct args for unfollow', async () => {
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: true,
          followerCountData: 100,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() =>
      expect(mockToggleFollowClub).toHaveBeenCalledWith('u-1', 'club-1', 'Sakaryaspor', false),
    );
  });

  // ── Follow Toggle — Error ──

  it('reverts optimistic state + shows errorToast on error', async () => {
    mockToggleFollowClub.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 100,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() =>
      expect(mockAddToast).toHaveBeenCalledWith('followError', 'error'),
    );
    // Slice 151b: Sentry tag fires on error
    expect(mockLogSilentCatch).toHaveBeenCalledWith('club.follow', expect.any(Error));
    // State reverted to server-data
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followerCount).toBe(100);
  });

  // ── Guard: No Club ──

  it('does nothing when club is undefined', () => {
    const { result } = renderHook(
      () => useClubActions({ club: undefined, isFollowingData: false, followerCountData: 0 }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleFollow();
    });

    expect(mockToggleFollowClub).not.toHaveBeenCalled();
  });

  it('does nothing when club is null', () => {
    const { result } = renderHook(
      () => useClubActions({ club: null, isFollowingData: false, followerCountData: 0 }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleFollow();
    });

    expect(mockToggleFollowClub).not.toHaveBeenCalled();
  });

  // ── Invalidation ──

  it('sets correct query-cache values on success (Slice 143 pattern)', async () => {
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 10,
        }),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.handleFollow();
    });

    // isFollowing → boolean direkt
    await waitFor(() =>
      expect(mockSetQueryData).toHaveBeenCalledWith(
        qk.clubs.isFollowing('u-1', 'club-1'),
        true,
      ),
    );
    // followers → updater function
    const followersCall = mockSetQueryData.mock.calls.find(
      (c) => JSON.stringify(c[0]) === JSON.stringify(qk.clubs.followers('club-1')),
    );
    expect(followersCall).toBeDefined();
    expect(typeof followersCall![1]).toBe('function');
    // Simulate cache: undefined → undefined
    expect(followersCall![1](undefined)).toBeUndefined();
    // Simulate cache: 10 → 11 (follow = +1)
    expect(followersCall![1](10)).toBe(11);
    // Simulate cache: 0 → Math.max(0, -1) = 0 won't happen on follow; test unfollow separately
  });

  // ── Double-Click Prevention (the REAL reason for Slice 151b) ──

  it('rapid-click-prevention: only 1 toggleFollowClub-call even on 3 rapid clicks', async () => {
    let resolveFirst: (() => void) | undefined;
    mockToggleFollowClub.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveFirst = resolve; }),
    );

    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 10,
        }),
      { wrapper: createWrapper() },
    );

    // First click — starts the in-flight mutation
    act(() => {
      result.current.handleFollow();
    });

    // Wait for isPending to propagate
    await waitFor(() => expect(result.current.followLoading).toBe(true));

    // Three more clicks while the first is still in-flight
    act(() => {
      result.current.handleFollow();
      result.current.handleFollow();
      result.current.handleFollow();
    });

    // Guard: exactly 1 service call
    expect(mockToggleFollowClub).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => {
      resolveFirst?.();
    });
    await waitFor(() => expect(result.current.followLoading).toBe(false));
  });
});
