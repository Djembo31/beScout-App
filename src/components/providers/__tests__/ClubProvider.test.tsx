import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClubProvider, useClub } from '../ClubProvider';

// ============================================
// Mocks
// ============================================
// Slice 151b-RESET: Provider schrumpft auf activeClub + setActiveClub + loading.
// `followedClubs` / `toggleFollow` leben jetzt in `useFollowedClubs` + `useToggleFollowClub`
// — deren Regression-Tests stehen in:
//   - src/components/club/hooks/__tests__/useClubActions.test.ts (Slice 133/138/139/142)
//   - src/lib/hooks/__tests__/useToggleFollowClub.test.ts (Optimistic, Rollback)

const mockUseUser = vi.fn();
vi.mock('../AuthProvider', () => ({
  useUser: () => mockUseUser(),
}));

const mockInitClubCache = vi.fn();
vi.mock('@/lib/clubs', () => ({
  initClubCache: () => mockInitClubCache(),
  // Slice 251 Wave 3: useLeagueScope.hydrateFromCascade Stage 1 ruft getClub.
  getClub: () => null,
}));

const mockInitLeagueCache = vi.fn();
vi.mock('@/lib/leagues', () => ({
  initLeagueCache: () => mockInitLeagueCache(),
  // Slice 251 Wave 3: useLeagueScope.hydrateFromCascade Stage 3 ruft getActiveLeagues.
  getActiveLeagues: () => [],
}));

const mockGetUserFollowedClubs = vi.fn();
vi.mock('@/lib/services/club', () => ({
  getUserFollowedClubs: (...args: unknown[]) => mockGetUserFollowedClubs(...args),
}));

// ============================================
// Fixtures
// ============================================
const stableUser = { id: 'u1' };
const clubA = { id: 'c1', name: 'Club A', slug: 'club-a' };
const clubB = { id: 'c2', name: 'Club B', slug: 'club-b' };

// ============================================
// Test consumer
// ============================================
function ClubInspector() {
  const { activeClub, loading, setActiveClub } = useClub();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="active">{activeClub?.name ?? 'none'}</span>
      <button onClick={() => setActiveClub(clubB as never)}>switch</button>
    </div>
  );
}

function renderWithProviders(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <ClubProvider>{children}</ClubProvider>
    </QueryClientProvider>,
  );
}

// ============================================
// Tests
// ============================================
describe('ClubProvider (Slice 151b-RESET — shrunk to activeClub + loading)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserFollowedClubs.mockReset();
    mockInitClubCache.mockResolvedValue(undefined);
    mockInitLeagueCache.mockResolvedValue(undefined);
    try { localStorage.clear(); } catch (err) {
      console.error('[test] localStorage.clear failed:', err);
    }
  });

  it('renders children', () => {
    mockUseUser.mockReturnValue({ user: null });
    renderWithProviders(<div data-testid="child">Hi</div>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('finishes loading with activeClub=null when no user', async () => {
    mockUseUser.mockReturnValue({ user: null });
    renderWithProviders(<ClubInspector />);
    await waitFor(
      () => expect(screen.getByTestId('loading').textContent).toBe('false'),
      { timeout: 5000 },
    );
    expect(screen.getByTestId('active').textContent).toBe('none');
  });

  it('hydrates activeClub from primary when user has followed clubs', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([clubA, clubB]);
    renderWithProviders(<ClubInspector />);
    await waitFor(
      () => expect(screen.getByTestId('loading').textContent).toBe('false'),
      { timeout: 5000 },
    );
    // getUserFollowedClubs sortiert primary-first → erstes Element ist Primary
    expect(screen.getByTestId('active').textContent).toBe('Club A');
  });

  it('hydrates activeClub from localStorage when value still in followed list', async () => {
    localStorage.setItem('bescout-active-club', JSON.stringify(clubB));
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([clubA, clubB]);
    renderWithProviders(<ClubInspector />);
    await waitFor(
      () => expect(screen.getByTestId('loading').textContent).toBe('false'),
      { timeout: 5000 },
    );
    expect(screen.getByTestId('active').textContent).toBe('Club B');
  });

  it('falls back to primary when localStorage value is not in followed list', async () => {
    localStorage.setItem('bescout-active-club', JSON.stringify({ id: 'stale', name: 'Stale' }));
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([clubA]);
    renderWithProviders(<ClubInspector />);
    await waitFor(
      () => expect(screen.getByTestId('loading').textContent).toBe('false'),
      { timeout: 5000 },
    );
    expect(screen.getByTestId('active').textContent).toBe('Club A');
  });

  it('setActiveClub updates state + persists to localStorage', async () => {
    mockUseUser.mockReturnValue({ user: stableUser });
    mockGetUserFollowedClubs.mockResolvedValue([clubA, clubB]);
    const user = userEvent.setup();
    renderWithProviders(<ClubInspector />);
    await waitFor(
      () => expect(screen.getByTestId('loading').textContent).toBe('false'),
      { timeout: 5000 },
    );

    await user.click(screen.getByText('switch'));
    expect(screen.getByTestId('active').textContent).toBe('Club B');
    expect(localStorage.getItem('bescout-active-club')).toContain('"id":"c2"');
  });

  it('useClub default value outside provider', () => {
    let value: ReturnType<typeof useClub> | null = null;
    function Inspector() { value = useClub(); return null; }
    render(<Inspector />);
    expect(value).not.toBeNull();
    expect(value!.activeClub).toBeNull();
    expect(value!.loading).toBe(true);
  });
});
