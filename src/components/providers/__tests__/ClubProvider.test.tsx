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
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('active').textContent).toBe('none');
  });

  it('loads clubs when user is available', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([clubA, clubB]);
    mockGetUserPrimaryClub.mockResolvedValue(clubA);
    render(
      <ClubProvider><ClubInspector /></ClubProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
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
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

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
});
