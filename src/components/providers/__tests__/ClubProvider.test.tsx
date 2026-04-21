import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClubProvider, useClub } from '../ClubProvider';

// ============================================
// Mocks
// ============================================
const stableUser = { id: 'u1' };
const mockUseUser = vi.fn();
vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => mockUseUser(),
}));

const mockInitClubCache = vi.fn();
vi.mock('@/lib/clubs', () => ({
  initClubCache: () => mockInitClubCache(),
}));

const mockGetUserFollowedClubs = vi.fn();
const mockGetUserPrimaryClub = vi.fn();
const mockToggleFollowClub = vi.fn();
vi.mock('@/lib/services/club', () => ({
  getUserFollowedClubs: (...args: unknown[]) => mockGetUserFollowedClubs(...args),
  getUserPrimaryClub: (...args: unknown[]) => mockGetUserPrimaryClub(...args),
  toggleFollowClub: (...args: unknown[]) => mockToggleFollowClub(...args),
}));

// ============================================
// Test consumer
// ============================================
function ClubInspector() {
  const { activeClub, followedClubs, primaryClub, loading, isFollowing, setActiveClub } = useClub();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="active">{activeClub?.name ?? 'none'}</span>
      <span data-testid="primary">{primaryClub?.name ?? 'none'}</span>
      <span data-testid="followed-count">{followedClubs.length}</span>
      <span data-testid="is-following-c1">{String(isFollowing('c1'))}</span>
      <button onClick={() => setActiveClub({ id: 'c2', name: 'Club B' } as any)}>switch</button>
    </div>
  );
}

// ============================================
// Fixtures
// ============================================
const clubA = { id: 'c1', name: 'Club A', slug: 'club-a' };
const clubB = { id: 'c2', name: 'Club B', slug: 'club-b' };

// ============================================
// Tests
// ============================================
describe('ClubProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementation stacks (mockResolvedValueOnce queues leak across tests otherwise).
    mockGetUserFollowedClubs.mockReset();
    mockGetUserPrimaryClub.mockReset();
    mockToggleFollowClub.mockReset();
    mockInitClubCache.mockResolvedValue(undefined);
    try { sessionStorage.clear(); } catch { /* ignore */ }
  });

  it('renders children', () => {
    mockUseUser.mockReturnValue({ user: null });
    mockGetUserFollowedClubs.mockResolvedValue([]);
    mockGetUserPrimaryClub.mockResolvedValue(null);
    render(
      <ClubProvider><div data-testid="child">Hi</div></ClubProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('starts loading, then finishes when no user', async () => {
    mockUseUser.mockReturnValue({ user: null });
    render(
      <ClubProvider><ClubInspector /></ClubProvider>,
    );
    // Slice 040: timeout 5000ms fuer CI-Stability (default 1000ms flaky auf CI-Runner)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    }, { timeout: 5000 });
    expect(screen.getByTestId('active').textContent).toBe('none');
  });

  it('loads clubs when user is available', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([clubA, clubB]);
    mockGetUserPrimaryClub.mockResolvedValue(clubA);
    render(
      <ClubProvider><ClubInspector /></ClubProvider>,
    );
    // Slice 040: timeout 5000ms fuer CI-Stability (default 1000ms flaky auf CI-Runner)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    }, { timeout: 5000 });
    expect(screen.getByTestId('active').textContent).toBe('Club A');
    expect(screen.getByTestId('primary').textContent).toBe('Club A');
    expect(screen.getByTestId('followed-count').textContent).toBe('2');
    expect(screen.getByTestId('is-following-c1').textContent).toBe('true');
  });

  it('sets active club via setActiveClub', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([clubA]);
    mockGetUserPrimaryClub.mockResolvedValue(clubA);
    const user = userEvent.setup();
    render(
      <ClubProvider><ClubInspector /></ClubProvider>,
    );
    // Slice 040: timeout 5000ms fuer CI-Stability (default 1000ms flaky auf CI-Runner)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    }, { timeout: 5000 });

    await user.click(screen.getByText('switch'));
    expect(screen.getByTestId('active').textContent).toBe('Club B');
  });

  it('useClub returns context value outside provider', () => {
    let value: ReturnType<typeof useClub> | null = null;
    function Inspector() { value = useClub(); return null; }
    render(<Inspector />);
    // Default values when no provider
    expect(value).not.toBeNull();
    expect(value!.activeClub).toBeNull();
    expect(value!.loading).toBe(true);
  });

  // ============================================
  // Slice 133 — Optimistic toggleFollow
  // ============================================
  function FollowTestbed() {
    const { followedClubs, toggleFollow } = useClub();
    return (
      <div>
        <span data-testid="count">{followedClubs.length}</span>
        <span data-testid="names">{followedClubs.map(c => c.name).join(',')}</span>
        <button
          onClick={() => toggleFollow('c1', 'Club A', clubA as any).catch(() => {})}
        >
          follow
        </button>
      </div>
    );
  }

  it('toggleFollow optimistically adds clubData before DB resolve (Slice 133)', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    // User starts with no follows.
    mockGetUserFollowedClubs.mockResolvedValueOnce([]);
    mockGetUserPrimaryClub.mockResolvedValue(null);
    // Reconcile after toggle returns server truth (clubA is now followed).
    mockGetUserFollowedClubs.mockResolvedValueOnce([clubA]);
    mockToggleFollowClub.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ClubProvider><FollowTestbed /></ClubProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0');
    }, { timeout: 5000 });

    await user.click(screen.getByText('follow'));
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    }, { timeout: 5000 });
    expect(screen.getByTestId('names').textContent).toBe('Club A');
  });

  it('toggleFollow reverts optimistic add when DB call throws (Slice 133)', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([]);
    mockGetUserPrimaryClub.mockResolvedValue(null);
    mockToggleFollowClub.mockRejectedValue(new Error('network-fail'));
    const user = userEvent.setup();

    render(<ClubProvider><FollowTestbed /></ClubProvider>);
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0');
    }, { timeout: 5000 });

    await user.click(screen.getByText('follow'));
    // After the failed toggle, followedClubs must be back to empty.
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('0');
    }, { timeout: 5000 });
    expect(screen.getByTestId('names').textContent).toBe('');
  });

  // ============================================
  // Slice 138 — Race-Safe Parallel Toggles
  // ============================================
  function ParallelTestbed() {
    const { followedClubs, toggleFollow } = useClub();
    return (
      <div>
        <span data-testid="count">{followedClubs.length}</span>
        <span data-testid="ids">{followedClubs.map(c => c.id).sort().join(',')}</span>
        <button onClick={() => toggleFollow('c1', 'Club A', clubA as any).catch(() => {})}>follow-a</button>
        <button onClick={() => toggleFollow('c2', 'Club B', clubB as any).catch(() => {})}>follow-b</button>
      </div>
    );
  }

  it('silently discards re-click on same club while in-flight (Slice 138)', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValueOnce([]);       // initial load
    mockGetUserPrimaryClub.mockResolvedValue(null);
    let resolveToggle: ((v: unknown) => void) | undefined;
    mockToggleFollowClub.mockImplementationOnce(() => new Promise(r => { resolveToggle = r; }));
    mockGetUserFollowedClubs.mockResolvedValueOnce([clubA]);  // reconcile
    const user = userEvent.setup();

    render(<ClubProvider><ParallelTestbed /></ClubProvider>);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'), { timeout: 5000 });

    // First click starts DB call (hanging), second click must be discarded silently.
    await user.click(screen.getByText('follow-a'));
    await user.click(screen.getByText('follow-a'));
    await user.click(screen.getByText('follow-a'));

    expect(mockToggleFollowClub).toHaveBeenCalledTimes(1);

    // Resolve the hanging DB call and verify reconcile fires once.
    resolveToggle?.(undefined);
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    }, { timeout: 5000 });
  });

  it('parallel follow-toggles on different clubs do not overwrite (Slice 138)', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValueOnce([]); // initial load

    let resolveA: ((v: unknown) => void) | undefined;
    let resolveB: ((v: unknown) => void) | undefined;
    mockToggleFollowClub.mockImplementationOnce(() => new Promise(r => { resolveA = r; }));
    mockToggleFollowClub.mockImplementationOnce(() => new Promise(r => { resolveB = r; }));
    mockGetUserPrimaryClub.mockResolvedValue(null);

    const user = userEvent.setup();
    render(<ClubProvider><ParallelTestbed /></ClubProvider>);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'), { timeout: 5000 });

    await user.click(screen.getByText('follow-a'));
    await user.click(screen.getByText('follow-b'));
    expect(screen.getByTestId('ids').textContent).toBe('c1,c2');

    // Resolve A — no reconcile (B in-flight AND follow-path skips reconcile anyway).
    resolveA?.(undefined);
    await Promise.resolve();
    expect(screen.getByTestId('ids').textContent).toBe('c1,c2');
    expect(mockGetUserFollowedClubs).toHaveBeenCalledTimes(1);

    // Resolve B — Slice 139: follow-path skips reconcile even for last-in-flight.
    resolveB?.(undefined);
    await Promise.resolve();
    expect(screen.getByTestId('ids').textContent).toBe('c1,c2');
    // Still only the initial load call, no reconcile after follow.
    expect(mockGetUserFollowedClubs).toHaveBeenCalledTimes(1);
  });

  // ============================================
  // Slice 139 — Skip reconcile on follow-success, keep on unfollow
  // ============================================
  it('skips reconcile after follow success (Slice 139 — avoids read-after-write race)', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValueOnce([]); // initial load
    mockGetUserPrimaryClub.mockResolvedValue(null);
    mockToggleFollowClub.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<ClubProvider><FollowTestbed /></ClubProvider>);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'), { timeout: 5000 });

    await user.click(screen.getByText('follow'));
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'), { timeout: 5000 });

    // Only the initial load — no post-follow reconcile.
    expect(mockGetUserFollowedClubs).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('names').textContent).toBe('Club A');
  });

  it('reconciles after unfollow success (Slice 139 — needed for primary-promotion)', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    // Initial load: user follows both clubs, A is primary.
    mockGetUserFollowedClubs.mockResolvedValueOnce([clubA, clubB]);
    mockGetUserPrimaryClub.mockResolvedValue(clubA);
    mockToggleFollowClub.mockResolvedValue(undefined);
    // After unfollowing A, server promotes B to primary and reconcile returns [clubB].
    mockGetUserFollowedClubs.mockResolvedValueOnce([clubB]);

    const user = userEvent.setup();
    render(<ClubProvider><FollowTestbed /></ClubProvider>);
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('2'), { timeout: 5000 });

    // FollowTestbed's button toggles c1 — currently=true → unfollow path.
    await user.click(screen.getByText('follow'));

    // Reconcile fires after unfollow (initial load + post-unfollow = 2 calls).
    await waitFor(() => expect(mockGetUserFollowedClubs).toHaveBeenCalledTimes(2), { timeout: 5000 });
    await waitFor(() => expect(screen.getByTestId('names').textContent).toBe('Club B'), { timeout: 5000 });
  });
});
