import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ============================================
// Mocks
// ============================================

const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);
const mockAddToast = vi.fn();
const mockToggleFollowClub = vi.fn().mockResolvedValue(undefined);
const mockInvalidateQueries = vi.fn();

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
  toggleFollowClub: (...args: any[]) => mockToggleFollowClub(...args),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: { invalidateQueries: (...args: any[]) => mockInvalidateQueries(...args) },
}));

vi.mock('@/lib/queries/keys', () => ({
  qk: {
    clubs: {
      isFollowing: (userId: string, clubId: string) => ['clubs', 'isFollowing', userId, clubId],
      followers: (clubId: string) => ['clubs', 'followers', clubId],
    },
  },
}));

// ============================================
// Import AFTER mocks
// ============================================

import { useClubActions } from '../useClubActions';

// ============================================
// Fixtures
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

// ============================================
// Tests
// ============================================

describe('useClubActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleFollowClub.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
  });

  // ── Initial State ──

  it('returns isFollowing from data when no local override', () => {
    const { result } = renderHook(() =>
      useClubActions({ club: makeClub() as never, isFollowingData: true, followerCountData: 100 })
    );
    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followerCount).toBe(100);
    expect(result.current.followLoading).toBe(false);
  });

  it('returns isFollowing=false from data', () => {
    const { result } = renderHook(() =>
      useClubActions({ club: makeClub() as never, isFollowingData: false, followerCountData: 50 })
    );
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followerCount).toBe(50);
  });

  // ── Follow Toggle — Success ──

  it('optimistically updates follow state on toggle', async () => {
    const { result } = renderHook(() =>
      useClubActions({ club: makeClub() as never, isFollowingData: false, followerCountData: 100 })
    );

    // Before
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followerCount).toBe(100);

    // Act
    await act(async () => {
      await result.current.handleFollow();
    });

    // After success: local state reset, server data takes over
    expect(mockToggleFollowClub).toHaveBeenCalledWith('u-1', 'club-1', 'Sakaryaspor', true);
    expect(mockRefreshProfile).toHaveBeenCalled();
    expect(mockInvalidateQueries).toHaveBeenCalledTimes(2);
  });

  it('calls toggleFollowClub with correct args for unfollow', async () => {
    const { result } = renderHook(() =>
      useClubActions({ club: makeClub() as never, isFollowingData: true, followerCountData: 100 })
    );

    await act(async () => {
      await result.current.handleFollow();
    });

    expect(mockToggleFollowClub).toHaveBeenCalledWith('u-1', 'club-1', 'Sakaryaspor', false);
  });

  // ── Follow Toggle — Error ──

  it('reverts optimistic state on error', async () => {
    mockToggleFollowClub.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useClubActions({ club: makeClub() as never, isFollowingData: false, followerCountData: 100 })
    );

    await act(async () => {
      await result.current.handleFollow();
    });

    // Should revert to original state
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followerCount).toBe(100);
    expect(mockAddToast).toHaveBeenCalledWith('followError', 'error');
  });

  // ── Guard: No Club ──

  it('does nothing when club is undefined', async () => {
    const { result } = renderHook(() =>
      useClubActions({ club: undefined, isFollowingData: false, followerCountData: 0 })
    );

    await act(async () => {
      await result.current.handleFollow();
    });

    expect(mockToggleFollowClub).not.toHaveBeenCalled();
  });

  it('does nothing when club is null', async () => {
    const { result } = renderHook(() =>
      useClubActions({ club: null, isFollowingData: false, followerCountData: 0 })
    );

    await act(async () => {
      await result.current.handleFollow();
    });

    expect(mockToggleFollowClub).not.toHaveBeenCalled();
  });

  // ── Invalidation ──

  it('invalidates correct query keys on success', async () => {
    const { result } = renderHook(() =>
      useClubActions({ club: makeClub() as never, isFollowingData: false, followerCountData: 10 })
    );

    await act(async () => {
      await result.current.handleFollow();
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['clubs', 'isFollowing', 'u-1', 'club-1'],
    });
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['clubs', 'followers', 'club-1'],
    });
  });

  // ── Double-Click Prevention ──

  it('does not double-fire when already loading', async () => {
    let resolveFirst: () => void;
    mockToggleFollowClub.mockImplementationOnce(
      () => new Promise<void>((resolve) => { resolveFirst = resolve; })
    );

    const { result } = renderHook(() =>
      useClubActions({ club: makeClub() as never, isFollowingData: false, followerCountData: 10 })
    );

    // First call — starts loading
    act(() => {
      result.current.handleFollow();
    });

    // Second call while first is in-flight
    await act(async () => {
      await result.current.handleFollow();
    });

    // Only one call to the service
    expect(mockToggleFollowClub).toHaveBeenCalledTimes(1);

    // Cleanup
    await act(async () => { resolveFirst!(); });
  });
});
