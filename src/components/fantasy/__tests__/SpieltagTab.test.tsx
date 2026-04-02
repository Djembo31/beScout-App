import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { SpieltagTab } from '../SpieltagTab';
import type { Fixture } from '@/types';
import type { FantasyEvent } from '../types';

// ============================================
// Mocks — services
// ============================================
const mockGetFixturesByGameweek = vi.fn<(gw: number) => Promise<Fixture[]>>();
vi.mock('@/lib/services/fixtures', () => ({
  getFixturesByGameweek: (...args: unknown[]) => mockGetFixturesByGameweek(args[0] as number),
}));

const mockSimulateGameweekFlow = vi.fn();
const mockImportProgressiveStats = vi.fn();
const mockFinalizeGameweek = vi.fn();
vi.mock('@/lib/services/scoring', () => ({
  simulateGameweekFlow: (...args: unknown[]) => mockSimulateGameweekFlow(...args),
  importProgressiveStats: (...args: unknown[]) => mockImportProgressiveStats(...args),
  finalizeGameweek: (...args: unknown[]) => mockFinalizeGameweek(...args),
}));

const mockIsApiConfigured = vi.fn<() => boolean>();
const mockHasApiFixtures = vi.fn<(gw: number) => Promise<boolean>>();
vi.mock('@/lib/services/footballData', () => ({
  isApiConfigured: () => mockIsApiConfigured(),
  hasApiFixtures: (...args: unknown[]) => mockHasApiFixtures(args[0] as number),
}));

// ============================================
// Mocks — child components (stubs)
// ============================================
const mockPickTopspiel = vi.fn<(fixtures: Fixture[], clubId: string) => Fixture | null>();
vi.mock('../spieltag', () => ({
  TopspielCard: ({ fixture }: { fixture: Fixture }) => (
    <div data-testid="topspiel-card">{fixture.home_club_name} vs {fixture.away_club_name}</div>
  ),
  pickTopspiel: (...args: unknown[]) => mockPickTopspiel(args[0] as Fixture[], args[1] as string),
}));

vi.mock('../spieltag/SpieltagPulse', () => ({
  SpieltagPulse: () => <div data-testid="spieltag-pulse">SpieltagPulse</div>,
}));

vi.mock('../spieltag/SpieltagBrowser', () => ({
  SpieltagBrowser: ({ fixtures }: { fixtures: Fixture[] }) => (
    <div data-testid="spieltag-browser">SpieltagBrowser ({fixtures.length})</div>
  ),
}));

vi.mock('../spieltag/FixtureDetailModal', () => ({
  FixtureDetailModal: () => <div data-testid="fixture-detail-modal" />,
}));

// Mock dynamic SponsorBanner
vi.mock('@/components/player/detail/SponsorBanner', () => ({
  default: () => <div data-testid="sponsor-banner">SponsorBanner</div>,
}));

// Mock UI components
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  Modal: ({ open, children, title }: { open: boolean; children: React.ReactNode; title?: string }) =>
    open ? <div data-testid="modal" data-title={title}>{children}</div> : null,
}));

// ============================================
// Helpers
// ============================================
function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: 'f1',
    gameweek: 5,
    home_club_id: 'c1',
    away_club_id: 'c2',
    home_score: null,
    away_score: null,
    status: 'scheduled',
    played_at: null,
    created_at: '2025-01-01',
    home_club_name: 'Team A',
    home_club_short: 'TEA',
    away_club_name: 'Team B',
    away_club_short: 'TEB',
    home_club_primary_color: null,
    away_club_primary_color: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<FantasyEvent> = {}): FantasyEvent {
  return {
    id: 'e1',
    name: 'Event 1',
    description: '',
    type: 'bescout',
    mode: 'tournament',
    status: 'running',
    format: '11er',
    startTime: 0,
    endTime: 0,
    lockTime: 0,
    buyIn: 0,
    entryFeeCents: 0,
    prizePool: 0,
    participants: 5,
    maxParticipants: null,
    entryType: 'single',
    speed: 'normal',
    isPromoted: false,
    isFeatured: false,
    isJoined: false,
    isInterested: false,
    scoredAt: null,
    eventTier: 'arena',
    requirements: {},
    rewards: [],
    ticketCost: 0,
    currency: 'tickets' as const,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  gameweek: 5,
  activeGameweek: 5,
  clubId: 'club-1',
  isAdmin: false,
  events: [] as FantasyEvent[],
  userId: 'user-1',
  onSimulated: vi.fn(),
  onTabChange: vi.fn(),
};

// ============================================
// Tests
// ============================================
describe('SpieltagTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFixturesByGameweek.mockResolvedValue([]);
    mockIsApiConfigured.mockReturnValue(false);
    mockHasApiFixtures.mockResolvedValue(false);
    mockPickTopspiel.mockReturnValue(null);
    mockSimulateGameweekFlow.mockResolvedValue({ eventsScored: 0, fixturesSimulated: 0, errors: [] });
    mockImportProgressiveStats.mockResolvedValue({ fixturesImported: 0, scoresSynced: 0, errors: [] });
    mockFinalizeGameweek.mockResolvedValue({ eventsScored: 0, errors: [] });
  });

  // ------------------------------------------
  // 1. Loading state
  // ------------------------------------------
  it('shows loading state initially before fixtures resolve', () => {
    // Never resolve the promise so loading stays true
    mockGetFixturesByGameweek.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    // Loading state shows the logo pulse image (alt="" gives role="presentation")
    const img = screen.getByAltText('');
    expect(img).toHaveAttribute('src', '/icons/bescout_icon_premium.svg');
  });

  // ------------------------------------------
  // 2. Empty state
  // ------------------------------------------
  it('shows empty state when getFixturesByGameweek returns []', async () => {
    mockGetFixturesByGameweek.mockResolvedValue([]);
    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('noActivityDesc')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 3. SpieltagPulse renders after fixtures load
  // ------------------------------------------
  it('renders SpieltagPulse after fixtures load', async () => {
    const fixtures = [makeFixture()];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId('spieltag-pulse')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 4. TopspielCard when pickTopspiel returns a fixture
  // ------------------------------------------
  it('renders TopspielCard when pickTopspiel returns a fixture', async () => {
    const topFixture = makeFixture({ id: 'top-1', home_club_name: 'TopHome', away_club_name: 'TopAway' });
    const fixtures = [topFixture, makeFixture({ id: 'f2' })];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    mockPickTopspiel.mockReturnValue(topFixture);

    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId('topspiel-card')).toBeInTheDocument();
      expect(screen.getByText('TopHome vs TopAway')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 5. SpieltagBrowser for non-topspiel fixtures
  // ------------------------------------------
  it('renders SpieltagBrowser for non-topspiel fixtures', async () => {
    const topFixture = makeFixture({ id: 'top-1' });
    const otherFixture = makeFixture({ id: 'f2' });
    const fixtures = [topFixture, otherFixture];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    mockPickTopspiel.mockReturnValue(topFixture);

    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId('spieltag-browser')).toBeInTheDocument();
      // Browser should show 1 fixture (the non-topspiel one)
      expect(screen.getByText('SpieltagBrowser (1)')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 6. League label "TFF 1. Lig"
  // ------------------------------------------
  it('shows league label "TFF 1. Lig"', () => {
    mockGetFixturesByGameweek.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    expect(screen.getByText('TFF 1. Lig')).toBeInTheDocument();
  });

  // ------------------------------------------
  // 7. Prediction CTA visible when fixtures exist and gw not simulated
  // ------------------------------------------
  it('shows prediction CTA when fixtures exist and gwStatus is not simulated', async () => {
    const fixtures = [makeFixture({ status: 'scheduled' })];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText('predictionCta')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 8. Prediction CTA calls onTabChange('mitmachen')
  // ------------------------------------------
  it('prediction CTA calls onTabChange with mitmachen on click', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const fixtures = [makeFixture({ status: 'scheduled' })];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);

    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} onTabChange={onTabChange} />);

    await waitFor(() => {
      expect(screen.getByText('predictionCta')).toBeInTheDocument();
    });

    await user.click(screen.getByText('predictionCta'));
    expect(onTabChange).toHaveBeenCalledWith('mitmachen');
  });

  // ------------------------------------------
  // 9. Hides prediction CTA when gwStatus is simulated
  // ------------------------------------------
  it('hides prediction CTA when gwStatus is simulated', async () => {
    // All fixtures simulated → gwStatus = 'simulated'
    const fixtures = [makeFixture({ status: 'simulated' }), makeFixture({ id: 'f2', status: 'simulated' })];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);

    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId('spieltag-pulse')).toBeInTheDocument();
    });

    expect(screen.queryByText('predictionCta')).not.toBeInTheDocument();
  });

  // ------------------------------------------
  // 10. Admin: shows import button when apiAvailable + isCurrentGw
  // ------------------------------------------
  it('admin: shows import button when apiAvailable + isCurrentGw', async () => {
    const fixtures = [makeFixture()];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    mockIsApiConfigured.mockReturnValue(true);
    mockHasApiFixtures.mockResolvedValue(true);

    const events = [makeEvent()];

    renderWithProviders(
      <SpieltagTab
        {...DEFAULT_PROPS}
        isAdmin={true}
        events={events}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/importBtn/)).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 11. Admin: shows finalize button when allFixturesFinished
  // ------------------------------------------
  it('admin: shows finalize button when allFixturesFinished', async () => {
    const fixtures = [
      makeFixture({ id: 'f1', status: 'finished' }),
      makeFixture({ id: 'f2', status: 'finished' }),
    ];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    const events = [makeEvent()];

    renderWithProviders(
      <SpieltagTab
        {...DEFAULT_PROPS}
        isAdmin={true}
        events={events}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('finalizeBtn')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 12. Admin: shows simulate button when !apiAvailable + open status
  // ------------------------------------------
  it('admin: shows simulate button when !apiAvailable and gwStatus open', async () => {
    const fixtures = [makeFixture({ status: 'scheduled' })];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    mockIsApiConfigured.mockReturnValue(false);
    const events = [makeEvent()];

    renderWithProviders(
      <SpieltagTab
        {...DEFAULT_PROPS}
        isAdmin={true}
        events={events}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('startSimulation')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 13. Admin: shows "gwSimulatedLabel" when all simulated
  // ------------------------------------------
  it('admin: shows gwSimulatedLabel when gwStatus is simulated', async () => {
    const fixtures = [
      makeFixture({ id: 'f1', status: 'simulated' }),
      makeFixture({ id: 'f2', status: 'simulated' }),
    ];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);

    renderWithProviders(
      <SpieltagTab
        {...DEFAULT_PROPS}
        isAdmin={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('gwSimulatedLabel')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 14. Non-admin: hides all admin buttons
  // ------------------------------------------
  it('non-admin: hides all admin buttons', async () => {
    const fixtures = [makeFixture({ status: 'finished' })];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    const events = [makeEvent()];

    renderWithProviders(
      <SpieltagTab
        {...DEFAULT_PROPS}
        isAdmin={false}
        events={events}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('spieltag-pulse')).toBeInTheDocument();
    });

    expect(screen.queryByText(/importBtn/)).not.toBeInTheDocument();
    expect(screen.queryByText('finalizeBtn')).not.toBeInTheDocument();
    expect(screen.queryByText('startSimulation')).not.toBeInTheDocument();
    expect(screen.queryByText('gwSimulatedLabel')).not.toBeInTheDocument();
  });

  // ------------------------------------------
  // 15. Import button calls importProgressiveStats
  // ------------------------------------------
  it('import button calls importProgressiveStats', async () => {
    const user = userEvent.setup();
    const fixtures = [makeFixture()];
    mockGetFixturesByGameweek.mockResolvedValue(fixtures);
    mockIsApiConfigured.mockReturnValue(true);
    mockHasApiFixtures.mockResolvedValue(true);
    mockImportProgressiveStats.mockResolvedValue({ fixturesImported: 2, scoresSynced: 10, errors: [] });

    const events = [makeEvent()];

    renderWithProviders(
      <SpieltagTab
        {...DEFAULT_PROPS}
        isAdmin={true}
        events={events}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/importBtn/)).toBeInTheDocument();
    });

    await user.click(screen.getByText(/importBtn/));

    await waitFor(() => {
      expect(mockImportProgressiveStats).toHaveBeenCalledWith('club-1', 5, 'user-1');
    });
  });

  // ------------------------------------------
  // 16. SponsorBanner rendered
  // ------------------------------------------
  it('renders SponsorBanner', async () => {
    mockGetFixturesByGameweek.mockResolvedValue([]);
    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId('sponsor-banner')).toBeInTheDocument();
    });
  });

  // ------------------------------------------
  // 17. Calls getFixturesByGameweek with correct gameweek
  // ------------------------------------------
  it('calls getFixturesByGameweek with correct gameweek', async () => {
    mockGetFixturesByGameweek.mockResolvedValue([]);
    renderWithProviders(<SpieltagTab {...DEFAULT_PROPS} gameweek={7} activeGameweek={7} />);

    await waitFor(() => {
      expect(mockGetFixturesByGameweek).toHaveBeenCalledWith(7);
    });
  });

  // ------------------------------------------
  // 18. Reloads fixtures when gameweek prop changes
  // ------------------------------------------
  it('reloads fixtures when gameweek prop changes', async () => {
    mockGetFixturesByGameweek.mockResolvedValue([]);
    const { rerender } = renderWithProviders(
      <SpieltagTab {...DEFAULT_PROPS} gameweek={5} activeGameweek={5} />,
    );

    await waitFor(() => {
      expect(mockGetFixturesByGameweek).toHaveBeenCalledWith(5);
    });

    mockGetFixturesByGameweek.mockClear();
    const newFixtures = [makeFixture({ id: 'f-new', gameweek: 6 })];
    mockGetFixturesByGameweek.mockResolvedValue(newFixtures);

    rerender(<SpieltagTab {...DEFAULT_PROPS} gameweek={6} activeGameweek={6} />);

    await waitFor(() => {
      expect(mockGetFixturesByGameweek).toHaveBeenCalledWith(6);
    });
  });
});
