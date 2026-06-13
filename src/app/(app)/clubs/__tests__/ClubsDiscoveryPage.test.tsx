import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import type { DbClub } from '@/types';

// ============================================
// Slice 295 — /clubs Discovery Page Contract Test (S3 F-2)
//
// Locks the 5 page-local contracts of ClubsDiscoveryPage:
//   loading · error · empty · follow · activate
// Test-only — no src/** runtime change. Mock-convention mirrors
// ClubContent.test.tsx (vi.mock per data source + renderWithProviders).
// ============================================

type ClubWithStats = DbClub & { follower_count: number; player_count: number };

// Mutable hoisted state — lets each test vary user/activeClub/followedClubs
// while the module-level vi.mock factories stay stable (no resetModules churn,
// testing.md Anti-Pattern SO-3).
const h = vi.hoisted(() => ({
  user: { id: 'u1' } as { id: string } | null,
  activeClub: null as { id: string } | null,
  setActiveClub: vi.fn(),
  followedClubs: [] as DbClub[],
  toggleAsync: vi.fn<(vars: { club: DbClub; follow: boolean }) => Promise<void>>(
    () => Promise.resolve(),
  ),
}));

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: h.user }),
}));

vi.mock('@/components/providers/ClubProvider', () => ({
  useClub: () => ({ activeClub: h.activeClub, setActiveClub: h.setActiveClub }),
}));

vi.mock('@/lib/hooks/useFollowedClubs', () => ({
  useFollowedClubs: () => ({ data: h.followedClubs }),
}));

vi.mock('@/lib/hooks/useToggleFollowClub', () => ({
  useToggleFollowClub: () => ({ toggleAsync: h.toggleAsync, isPending: false }),
}));

vi.mock('@/lib/services/club', () => ({
  getClubsWithStats: vi.fn(),
}));

vi.mock('@/lib/services/fixtures', () => ({
  getNextFixturesByClub: vi.fn(() => Promise.resolve(new Map())),
}));

vi.mock('@/lib/queries/trades', () => ({
  useMostOwnedPlayersPerClubBatch: () => ({ data: undefined }),
}));

vi.mock('@/lib/leagues', () => ({
  getLeaguesByCountry: () => [],
}));

vi.mock('@/components/layout/LeagueScopeHeader', () => ({
  LeagueScopeHeader: () => <div data-testid="league-scope-header" />,
}));

vi.mock('@/features/shared/store/leagueScopeStore', () => ({
  useLeagueScope: <T,>(selector: (s: {
    countryCode: string | null;
    leagueName: string | null;
    setLeagueScope: () => void;
  }) => T): T =>
    selector({ countryCode: null, leagueName: null, setLeagueScope: vi.fn() }),
}));

vi.mock('@/components/fan-wishes/FanWishModal', () => ({
  FanWishModal: () => <div data-testid="fan-wish-modal" />,
}));

// Import AFTER mocks so the page binds the mocked modules.
import ClubsDiscoveryPage from '../page';
import { getClubsWithStats } from '@/lib/services/club';

const mockGetClubs = vi.mocked(getClubsWithStats);

function makeClub(over: Partial<ClubWithStats> = {}): ClubWithStats {
  return {
    id: 'c1',
    slug: 'galatasaray',
    name: 'Galatasaray',
    short: 'GS',
    league: 'Süper Lig',
    country: 'TR',
    city: 'Istanbul',
    primary_color: '#FFD700',
    logo_url: null,
    is_verified: true,
    follower_count: 100,
    player_count: 25,
    ...over,
  } as unknown as ClubWithStats;
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  h.user = { id: 'u1' };
  h.activeClub = null;
  h.followedClubs = [];
  // ErrorState path logs console.error by design — silence to keep output clean.
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe('ClubsDiscoveryPage — page contract', () => {
  it('AC-1: shows skeletons while clubs are loading (no grid, no empty/error)', () => {
    // Never-resolving promise keeps loading=true.
    mockGetClubs.mockReturnValue(new Promise<ClubWithStats[]>(() => {}));

    const { container } = renderWithProviders(<ClubsDiscoveryPage />);

    // Loading branch renders 6 SkeletonCards (+1 header Skeleton) — assert the
    // grid placeholder count, not just presence (reviewer NIT #1).
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(6);
    expect(screen.queryByText('noClubsAvailable')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Galatasaray')).toBeNull();
  });

  it('AC-2: shows ErrorState with retry when club load rejects', async () => {
    mockGetClubs.mockRejectedValue(new Error('boom'));

    renderWithProviders(<ClubsDiscoveryPage />);

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    // ErrorState renders a retry button (common.retry → key 'retry' via mock).
    expect(screen.getByRole('button', { name: 'retry' })).toBeInTheDocument();
  });

  it('AC-3: shows EmptyState when no clubs are available', async () => {
    mockGetClubs.mockResolvedValue([]);

    renderWithProviders(<ClubsDiscoveryPage />);

    expect(await screen.findByText('noClubsAvailable')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('AC-4: clicking Follow on a club calls toggleAsync with follow:true', async () => {
    const club = makeClub();
    mockGetClubs.mockResolvedValue([club]);
    h.followedClubs = []; // not following yet

    const user = userEvent.setup();
    renderWithProviders(<ClubsDiscoveryPage />);

    const followBtn = await screen.findByRole('button', { name: 'follow' });
    await user.click(followBtn);

    await waitFor(() =>
      expect(h.toggleAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          club: expect.objectContaining({ id: 'c1' }),
          follow: true,
        }),
      ),
    );
  });

  it('AC-5: clicking Activate on a followed, non-active club calls setActiveClub', async () => {
    const club = makeClub();
    mockGetClubs.mockResolvedValue([club]);
    h.followedClubs = [club]; // already following
    h.activeClub = null; // not active → Activate button visible

    const user = userEvent.setup();
    renderWithProviders(<ClubsDiscoveryPage />);

    const activateBtn = await screen.findByRole('button', { name: 'activate' });
    await user.click(activateBtn);

    expect(h.setActiveClub).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1' }),
    );
  });

  it('edge: anonymous user clicking Follow does NOT call toggleAsync', async () => {
    const club = makeClub();
    mockGetClubs.mockResolvedValue([club]);
    h.user = null; // anonymous

    const user = userEvent.setup();
    renderWithProviders(<ClubsDiscoveryPage />);

    const followBtn = await screen.findByRole('button', { name: 'follow' });
    await user.click(followBtn);

    // Give any async handler a tick; handleToggleFollow returns early for !user.
    await Promise.resolve();
    expect(h.toggleAsync).not.toHaveBeenCalled();
  });

  it('edge: Activate button is absent for a non-followed club', async () => {
    const club = makeClub();
    mockGetClubs.mockResolvedValue([club]);
    h.followedClubs = []; // not following → no Activate affordance

    renderWithProviders(<ClubsDiscoveryPage />);

    // Wait for the grid to render the follow button first.
    await screen.findByRole('button', { name: 'follow' });
    expect(screen.queryByRole('button', { name: 'activate' })).toBeNull();
  });
});
