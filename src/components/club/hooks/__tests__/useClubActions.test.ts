import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ============================================
// Mocks (service + auth + toast + i18n + query-keys)
// ============================================

const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);
const mockAddToast = vi.fn();
const mockToggleFollowClub = vi.fn().mockResolvedValue(undefined);
const mockGetUserFollowedClubs = vi.fn().mockResolvedValue([]);
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
  getUserFollowedClubs: (...args: unknown[]) => mockGetUserFollowedClubs(...args),
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

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const wrapper = function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
  return { client, wrapper };
}

// ============================================
// Tests
// ============================================

describe('useClubActions (Slice 151b-RESET — query-cache single-source)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleFollowClub.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
    mockGetUserFollowedClubs.mockResolvedValue([]);
  });

  // ── Initial State ──

  it('returns isFollowing and count directly from props (no local mirrors)', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: true,
          followerCountData: 100,
        }),
      { wrapper },
    );
    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followerCount).toBe(100);
    expect(result.current.followLoading).toBe(false);
  });

  // ── Follow Toggle — Success ──

  it('calls toggleFollowClub with correct args for follow', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 100,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() =>
      expect(mockToggleFollowClub).toHaveBeenCalledWith('u-1', 'club-1', 'Sakaryaspor', true),
    );
    await waitFor(() => expect(mockRefreshProfile).toHaveBeenCalled());
  });

  it('calls toggleFollowClub with correct args for unfollow', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: true,
          followerCountData: 100,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() =>
      expect(mockToggleFollowClub).toHaveBeenCalledWith('u-1', 'club-1', 'Sakaryaspor', false),
    );
  });

  // ── Follow Toggle — Optimistic Cache ──

  it('writes optimistic values to query-cache on follow', async () => {
    const { client, wrapper } = createWrapper();
    // Seed cache so setQueryData updaters see defined values
    client.setQueryData(qk.clubs.isFollowing('u-1', 'club-1'), false);
    client.setQueryData(qk.clubs.followers('club-1'), 100);
    client.setQueryData(qk.clubs.followedByUser('u-1'), []);

    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 100,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() =>
      expect(client.getQueryData(qk.clubs.isFollowing('u-1', 'club-1'))).toBe(true),
    );
    expect(client.getQueryData(qk.clubs.followers('club-1'))).toBe(101);
    const followed = client.getQueryData<Array<{ id: string }>>(qk.clubs.followedByUser('u-1'));
    expect(followed).toBeDefined();
    expect(followed![0]?.id).toBe('club-1');
  });

  it('writes optimistic values to query-cache on unfollow (count -1, removed from list)', async () => {
    const { client, wrapper } = createWrapper();
    client.setQueryData(qk.clubs.isFollowing('u-1', 'club-1'), true);
    client.setQueryData(qk.clubs.followers('club-1'), 100);
    client.setQueryData(qk.clubs.followedByUser('u-1'), [makeClub()]);

    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: true,
          followerCountData: 100,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() =>
      expect(client.getQueryData(qk.clubs.isFollowing('u-1', 'club-1'))).toBe(false),
    );
    expect(client.getQueryData(qk.clubs.followers('club-1'))).toBe(99);
    const followed = client.getQueryData<Array<{ id: string }>>(qk.clubs.followedByUser('u-1'));
    expect(followed).toEqual([]);
  });

  // ── Error Rollback ──

  it('rolls back optimistic cache + shows errorToast on error', async () => {
    mockToggleFollowClub.mockRejectedValueOnce(new Error('Network error'));

    const { client, wrapper } = createWrapper();
    client.setQueryData(qk.clubs.isFollowing('u-1', 'club-1'), false);
    client.setQueryData(qk.clubs.followers('club-1'), 100);
    client.setQueryData(qk.clubs.followedByUser('u-1'), []);

    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 100,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() => expect(mockAddToast).toHaveBeenCalledWith('followError', 'error'));
    expect(mockLogSilentCatch).toHaveBeenCalledWith('club.follow', expect.any(Error));

    // Cache rolled back to initial values
    expect(client.getQueryData(qk.clubs.isFollowing('u-1', 'club-1'))).toBe(false);
    expect(client.getQueryData(qk.clubs.followers('club-1'))).toBe(100);
    expect(client.getQueryData(qk.clubs.followedByUser('u-1'))).toEqual([]);
  });

  // ── Guards ──

  it('does nothing when club is undefined', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useClubActions({ club: undefined, isFollowingData: false, followerCountData: 0 }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    expect(mockToggleFollowClub).not.toHaveBeenCalled();
  });

  it('does nothing when club is null', () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => useClubActions({ club: null, isFollowingData: false, followerCountData: 0 }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    expect(mockToggleFollowClub).not.toHaveBeenCalled();
  });

  // ── Double-Click Prevention ──

  it('rapid-click-prevention: only 1 toggleFollowClub call on 3 rapid clicks', async () => {
    let resolveFirst: (() => void) | undefined;
    mockToggleFollowClub.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveFirst = resolve; }),
    );

    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () =>
        useClubActions({
          club: makeClub() as never,
          isFollowingData: false,
          followerCountData: 10,
        }),
      { wrapper },
    );

    act(() => {
      result.current.handleFollow();
    });

    await waitFor(() => expect(result.current.followLoading).toBe(true));

    act(() => {
      result.current.handleFollow();
      result.current.handleFollow();
      result.current.handleFollow();
    });

    expect(mockToggleFollowClub).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst?.();
    });
    await waitFor(() => expect(result.current.followLoading).toBe(false));
  });
});
