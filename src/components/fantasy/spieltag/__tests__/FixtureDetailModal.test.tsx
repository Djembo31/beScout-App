import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { FixtureDetailModal } from '../FixtureDetailModal';
import type { Fixture, FixturePlayerStat, FixtureSubstitution } from '@/types';

// ============================================
// Mocks — services/fixtures
// ============================================
const mockGetFixturePlayerStats = vi.fn();
const mockGetFixtureSubstitutions = vi.fn();
const mockGetFloorPricesForPlayers = vi.fn();
vi.mock('@/lib/services/fixtures', () => ({
  getFixturePlayerStats: (...args: unknown[]) => mockGetFixturePlayerStats(...args),
  getFixtureSubstitutions: (...args: unknown[]) => mockGetFixtureSubstitutions(...args),
  getFloorPricesForPlayers: (...args: unknown[]) => mockGetFloorPricesForPlayers(...args),
}));

// ============================================
// Mocks — clubs
// ============================================
vi.mock('@/lib/clubs', () => ({
  getClub: (key: string) => {
    if (key === 'HOM' || key === 'Home FC') return { name: 'Home FC', short: 'HOM', logo: '/home.png', colors: { primary: '#22C55E', secondary: '#fff' } };
    if (key === 'AWY' || key === 'Away United') return { name: 'Away United', short: 'AWY', logo: '/away.png', colors: { primary: '#3B82F6', secondary: '#fff' } };
    return null;
  },
}));

// ============================================
// Mocks — UI components (stubs)
// ============================================
vi.mock('@/components/ui', () => ({
  Modal: ({ open, children, onClose }: { open: boolean; children: React.ReactNode; title?: string; onClose?: () => void }) =>
    open ? (
      <div data-testid="modal">
        <button data-testid="modal-close" onClick={onClose}>close</button>
        {children}
      </div>
    ) : null,
}));

vi.mock('@/components/player', () => ({
  PlayerPhoto: ({ first, last, pos }: { first: string; last: string; pos?: string; imageUrl?: string | null; size?: number }) => (
    <div data-testid="player-photo">{first} {last} ({pos})</div>
  ),
}));

vi.mock('../ClubLogo', () => ({
  ClubLogo: ({ short }: { club: unknown; size?: number; short?: string }) => (
    <div data-testid="club-logo">{short ?? 'logo'}</div>
  ),
}));

// ============================================
// Mocks — helpers
// ============================================
vi.mock('../helpers', () => ({
  posColor: () => 'text-emerald-400 bg-emerald-500/15',
  getPosAccent: () => '#34d399',
  ratingHeatStyle: () => ({ background: '#00C424', color: '#fff' }),
  getRating: (stat: { rating?: number | null; fantasy_points: number }) =>
    stat.rating ?? stat.fantasy_points / 10,
}));

// ============================================
// Mocks — MatchIcons
// ============================================
vi.mock('../MatchIcons', () => ({
  GoalIcon: ({ size }: { size?: number }) => <span data-testid="goal-icon" data-size={size} />,
  AssistIcon: ({ size }: { size?: number }) => <span data-testid="assist-icon" data-size={size} />,
  CleanSheetIcon: ({ size }: { size?: number }) => <span data-testid="cleansheet-icon" data-size={size} />,
  MvpCrownIcon: ({ size }: { size?: number }) => <span data-testid="mvp-crown" data-size={size} />,
  SubInIcon: ({ size }: { size?: number }) => <span data-testid="sub-in-icon" data-size={size} />,
  SubOutIcon: ({ size }: { size?: number }) => <span data-testid="sub-out-icon" data-size={size} />,
}));

// ============================================
// Mocks — dynamic imports (lazy-loaded tabs)
// ============================================
vi.mock('../fixture-tabs/RankingTab', () => ({
  default: () => <div data-testid="ranking-tab">RankingTab</div>,
}));

vi.mock('../fixture-tabs/FormationTab', () => ({
  default: () => <div data-testid="formation-tab">FormationTab</div>,
}));

// ============================================
// Mocks — next/link
// ============================================
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string; [k: string]: unknown }) => (
    <a href={href} data-testid="link" {...rest}>{children}</a>
  ),
}));

// ============================================
// Mocks — next/dynamic (passthrough to direct imports)
// ============================================
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // Eagerly load the dynamic component for tests
    const LazyComp = (props: Record<string, unknown>) => {
      const [Comp, setComp] = React.useState<React.ComponentType | null>(null);
      React.useEffect(() => {
        loader().then(mod => setComp(() => mod.default));
      }, []);
      if (!Comp) return <div data-testid="lazy-loading">Loading...</div>;
      return <Comp {...props} />;
    };
    LazyComp.displayName = 'DynamicComponent';
    return LazyComp;
  },
}));

import React from 'react';

// ============================================
// Mocks — lucide-react
// ============================================
vi.mock('lucide-react', () => ({
  Loader2: (props: { className?: string }) => <div data-testid="loader" className={props.className} />,
  ChevronRight: () => <span data-testid="chevron-right" />,
}));

// ============================================
// Mocks — utils
// ============================================
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Fixture factory helpers
// ============================================
function makeFixture(overrides: Partial<Fixture> = {}): Fixture {
  return {
    id: 'f1',
    gameweek: 5,
    home_club_id: 'club-home',
    away_club_id: 'club-away',
    home_score: 2,
    away_score: 1,
    status: 'finished',
    played_at: '2025-01-15T18:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    home_club_name: 'Home FC',
    home_club_short: 'HOM',
    away_club_name: 'Away United',
    away_club_short: 'AWY',
    home_club_primary_color: '#22C55E',
    away_club_primary_color: '#3B82F6',
    ...overrides,
  };
}

function makePlayerStat(overrides: Partial<FixturePlayerStat> = {}): FixturePlayerStat {
  return {
    id: 'stat-1',
    fixture_id: 'f1',
    player_id: 'p1',
    club_id: 'club-home',
    minutes_played: 90,
    goals: 0,
    assists: 0,
    clean_sheet: false,
    goals_conceded: 0,
    yellow_card: false,
    red_card: false,
    saves: 0,
    bonus: 0,
    fantasy_points: 70,
    rating: 7.0,
    match_position: null,
    is_starter: true,
    grid_position: null,
    api_football_player_id: null,
    player_name_api: null,
    player_first_name: 'Max',
    player_last_name: 'Mustermann',
    player_position: 'MID',
    club_short: 'HOM',
    player_image_url: null,
    ...overrides,
  };
}

function makeSubstitution(overrides: Partial<FixtureSubstitution> = {}): FixtureSubstitution {
  return {
    id: 'sub-1',
    fixture_id: 'f1',
    club_id: 'club-home',
    minute: 65,
    extra_minute: null,
    player_in_id: 'p3',
    player_out_id: 'p1',
    player_in_api_id: 300,
    player_out_api_id: 100,
    player_in_name: 'Sub In Player',
    player_out_name: 'Sub Out Player',
    player_in_last_name: 'SubIn',
    player_out_last_name: 'SubOut',
    ...overrides,
  };
}

const defaultOnClose = vi.fn();

// ============================================
// Tests
// ============================================
describe('FixtureDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFixturePlayerStats.mockResolvedValue([]);
    mockGetFixtureSubstitutions.mockResolvedValue([]);
    mockGetFloorPricesForPlayers.mockResolvedValue(new Map());
  });

  // ── 1. renders nothing when fixture is null ──
  it('renders nothing when fixture is null', () => {
    const { container } = renderWithProviders(
      <FixtureDetailModal fixture={null} isOpen={true} onClose={defaultOnClose} />,
    );
    expect(container.innerHTML).toBe('');
  });

  // ── 2. renders nothing when isOpen is false ──
  it('renders nothing when isOpen is false', () => {
    const fixture = makeFixture();
    const { container } = renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={false} onClose={defaultOnClose} />,
    );
    expect(container.innerHTML).toBe('');
  });

  // ── 3. renders modal when open with fixture ──
  it('renders modal when open with a valid fixture', async () => {
    const fixture = makeFixture();
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });
  });

  // ── 4. shows team names ──
  it('displays both team names', async () => {
    const fixture = makeFixture({ home_club_name: 'Home FC', away_club_name: 'Away United' });
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByText('Home FC')).toBeInTheDocument();
      expect(screen.getByText('Away United')).toBeInTheDocument();
    });
  });

  // ── 5. shows score for finished fixture ──
  it('shows score when fixture is finished', async () => {
    const fixture = makeFixture({ home_score: 2, away_score: 1, status: 'finished' });
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('fullTime')).toBeInTheDocument();
    });
  });

  // ── 6. shows "vs" for scheduled fixture (no score) ──
  it('shows "vs" for scheduled fixture without score', async () => {
    const fixture = makeFixture({ home_score: null, away_score: null, status: 'scheduled' });
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByText('vs')).toBeInTheDocument();
    });
  });

  // ── 7. shows loading state while fetching data ──
  it('shows loading spinner while fetching fixture data', async () => {
    // Make the fetch hang by never resolving
    mockGetFixturePlayerStats.mockReturnValue(new Promise(() => {}));
    mockGetFixtureSubstitutions.mockReturnValue(new Promise(() => {}));

    const fixture = makeFixture();
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('loader')).toBeInTheDocument();
      expect(screen.getByText('loading')).toBeInTheDocument();
    });
  });

  // ── 8. shows no-player-data message when stats empty and finished ──
  it('shows no-player-data message when finished but no stats', async () => {
    mockGetFixturePlayerStats.mockResolvedValue([]);
    mockGetFixtureSubstitutions.mockResolvedValue([]);

    const fixture = makeFixture({ status: 'finished' });
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByText('noPlayerData')).toBeInTheDocument();
    });
  });

  // ── 9. shows not-simulated message when scheduled and no stats ──
  it('shows not-simulated message when fixture is scheduled', async () => {
    mockGetFixturePlayerStats.mockResolvedValue([]);
    mockGetFixtureSubstitutions.mockResolvedValue([]);

    const fixture = makeFixture({ status: 'scheduled', home_score: null, away_score: null });
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByText('notSimulated')).toBeInTheDocument();
    });
  });

  // ── 10. fetches stats and subs when opened ──
  it('calls getFixturePlayerStats and getFixtureSubstitutions on open', async () => {
    const fixture = makeFixture({ id: 'fixture-abc' });
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(mockGetFixturePlayerStats).toHaveBeenCalledWith('fixture-abc');
      expect(mockGetFixtureSubstitutions).toHaveBeenCalledWith('fixture-abc');
    });
  });

  // ── 11. shows tab buttons when stats are loaded ──
  it('shows overview, ranking, formation tabs when stats loaded', async () => {
    const stats = [
      makePlayerStat({ id: 's1', player_id: 'p1', club_id: 'club-home', rating: 8.0, minutes_played: 90 }),
    ];
    mockGetFixturePlayerStats.mockResolvedValue(stats);
    mockGetFixtureSubstitutions.mockResolvedValue([]);

    const fixture = makeFixture();
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      expect(screen.getByText('overviewTab')).toBeInTheDocument();
      expect(screen.getByText('ranking')).toBeInTheDocument();
      expect(screen.getByText('formationTab')).toBeInTheDocument();
    });
  });

  // ── 12. tab switching to ranking tab ──
  it('switches to ranking tab when clicked', async () => {
    const user = userEvent.setup();
    const stats = [
      makePlayerStat({ id: 's1', player_id: 'p1', club_id: 'club-home', rating: 8.0, minutes_played: 90 }),
    ];
    mockGetFixturePlayerStats.mockResolvedValue(stats);
    mockGetFixtureSubstitutions.mockResolvedValue([]);

    const fixture = makeFixture();
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );

    // Wait for tabs to appear
    await waitFor(() => {
      expect(screen.getByText('ranking')).toBeInTheDocument();
    });

    // Click ranking tab
    await user.click(screen.getByText('ranking'));

    await waitFor(() => {
      expect(screen.getByTestId('ranking-tab')).toBeInTheDocument();
    });
  });

  // ── 13. tab switching to formation tab ──
  it('switches to formation tab when clicked', async () => {
    const user = userEvent.setup();
    const stats = [
      makePlayerStat({ id: 's1', player_id: 'p1', club_id: 'club-home', rating: 8.0, minutes_played: 90 }),
    ];
    mockGetFixturePlayerStats.mockResolvedValue(stats);
    mockGetFixtureSubstitutions.mockResolvedValue([]);

    const fixture = makeFixture();
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );

    await waitFor(() => {
      expect(screen.getByText('formationTab')).toBeInTheDocument();
    });

    await user.click(screen.getByText('formationTab'));

    await waitFor(() => {
      expect(screen.getByTestId('formation-tab')).toBeInTheDocument();
    });
  });

  // ── 14. calls onClose when close button is clicked ──
  it('calls onClose when modal close button is triggered', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const fixture = makeFixture();
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={onClose} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('modal')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('modal-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ── 15. shows gameweek label ──
  it('shows gameweek label in the score header', async () => {
    const fixture = makeFixture({ gameweek: 12 });
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );
    await waitFor(() => {
      // useTranslations returns key, so ts('label') returns 'label'
      // The text is `{ts('label')} {fixture.gameweek}` => "label 12"
      expect(screen.getByText(/label/)).toBeInTheDocument();
      expect(screen.getByText(/12/)).toBeInTheDocument();
    });
  });

  // ── 16. fetches floor prices when stats arrive ──
  it('fetches floor prices after stats are loaded', async () => {
    const stats = [
      makePlayerStat({ id: 's1', player_id: 'p1', club_id: 'club-home' }),
      makePlayerStat({ id: 's2', player_id: 'p2', club_id: 'club-away' }),
    ];
    mockGetFixturePlayerStats.mockResolvedValue(stats);
    mockGetFixtureSubstitutions.mockResolvedValue([]);
    mockGetFloorPricesForPlayers.mockResolvedValue(new Map([['p1', 5000], ['p2', 3000]]));

    const fixture = makeFixture();
    renderWithProviders(
      <FixtureDetailModal fixture={fixture} isOpen={true} onClose={defaultOnClose} />,
    );

    await waitFor(() => {
      expect(mockGetFloorPricesForPlayers).toHaveBeenCalledWith(['p1', 'p2']);
    });
  });
});
