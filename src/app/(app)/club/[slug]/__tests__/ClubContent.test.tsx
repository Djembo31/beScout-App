import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import ClubContent from '../ClubContent';

// ============================================
// Stub all child components
// ============================================

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
    rpc: () => Promise.resolve({ data: null, error: null }),
  },
}));

vi.mock('@/components/club/ClubHero', () => ({
  ClubHero: (props: Record<string, unknown>) => <div data-testid="club-hero" data-club-name={(props.club as { name: string })?.name} />,
}));

vi.mock('@/components/club/ClubStatsBar', () => ({
  ClubStatsBar: () => <div data-testid="club-stats-bar" />,
}));

vi.mock('@/components/club/ClubSkeleton', () => ({
  ClubSkeleton: () => <div data-testid="club-skeleton" />,
}));

vi.mock('@/components/club/SquadOverviewWidget', () => ({
  SquadOverviewWidget: () => <div data-testid="squad-overview-widget" />,
}));

vi.mock('@/components/club/FixtureCards', () => ({
  FixtureRow: () => <div data-testid="fixture-row" />,
  SeasonSummary: () => <div data-testid="season-summary" />,
  NextMatchCard: () => <div data-testid="next-match-card" />,
  LastResultsCard: () => <div data-testid="last-results-card" />,
  getFixtureResult: () => null,
  resultBadge: () => null,
}));

vi.mock('@/components/club/sections/ActiveOffersSection', () => ({
  ActiveOffersSection: () => <div data-testid="active-offers-section" />,
}));

vi.mock('@/components/club/sections/SquadPreviewSection', () => ({
  SquadPreviewSection: () => <div data-testid="squad-preview-section" />,
}));

vi.mock('@/components/club/sections/MitmachenSection', () => ({
  MitmachenSection: () => <div data-testid="mitmachen-section" />,
}));

vi.mock('@/components/club/sections/ClubEventsSection', () => ({
  ClubEventsSection: () => <div data-testid="club-events-section" />,
}));

vi.mock('@/components/club/sections/MembershipSection', () => ({
  MembershipSection: () => <div data-testid="membership-section" />,
}));

vi.mock('@/components/club/sections/CollectionProgress', () => ({
  CollectionProgress: () => <div data-testid="collection-progress" />,
}));

vi.mock('@/components/club/sections/RecentActivitySection', () => ({
  RecentActivitySection: () => <div data-testid="recent-activity-section" />,
}));

vi.mock('@/components/club/sections/FeatureShowcase', () => ({
  FeatureShowcase: () => <div data-testid="feature-showcase" />,
}));

vi.mock('@/components/ui/FanRankBadge', () => ({
  default: () => <div data-testid="fan-rank-badge" />,
}));

vi.mock('@/components/gamification/FanRankOverview', () => ({
  default: () => <div data-testid="fan-rank-overview" />,
}));

vi.mock('@/components/player', () => ({
  PlayerIdentity: () => <div data-testid="player-identity" />,
}));

vi.mock('@/components/player/PlayerRow', () => ({
  PlayerDisplay: () => <div data-testid="player-display" />,
}));

vi.mock('@/components/player/detail/SponsorBanner', () => ({
  default: () => <div data-testid="sponsor-banner" />,
}));

vi.mock('@/components/community/PostCard', () => ({
  formatTimeAgo: (d: string) => d,
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType }>) => {
    // Return a stub for dynamically imported components (SponsorBanner)
    return () => <div data-testid="sponsor-banner" />;
  },
}));

// ============================================
// Mock UI components
// ============================================

vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
    <div data-testid="error-state"><button onClick={onRetry}>Retry</button></div>
  ),
  TabBar: ({ tabs, activeTab, onChange }: { tabs: { id: string; label: string }[]; activeTab: string; onChange: (id: string) => void }) => (
    <div data-testid="tab-bar">
      {tabs.map((tab: { id: string; label: string }) => (
        <button key={tab.id} data-testid={`tab-${tab.id}`} onClick={() => onChange(tab.id)}>
          {tab.label}
        </button>
      ))}
    </div>
  ),
  SearchInput: () => <div data-testid="search-input" />,
  PosFilter: () => <div data-testid="pos-filter" />,
  SortPills: () => <div data-testid="sort-pills" />,
}));

// ============================================
// Mock hooks
// ============================================

const mockUser = { id: 'user-1', email: 'test@test.com' };
const mockRefreshProfile = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({ user: mockUser, refreshProfile: mockRefreshProfile, loading: false }),
}));

const mockAddToast = vi.fn();
vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/hooks/useScrollReveal', () => ({
  useScrollReveal: () => ({ ref: { current: null }, revealed: true }),
}));

// ============================================
// Mock services
// ============================================

vi.mock('@/lib/services/players', () => ({
  dbToPlayers: vi.fn(() => []),
  centsToBsd: vi.fn((n: number) => n / 100),
}));

vi.mock('@/lib/services/club', () => ({
  toggleFollowClub: vi.fn(),
}));

vi.mock('@/lib/services/research', () => ({
  resolveExpiredResearch: vi.fn(() => Promise.resolve()),
  getResearchPosts: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/services/posts', () => ({
  getPosts: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
  fmtScout: vi.fn((n: number) => String(n)),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

vi.mock('@/lib/queries/keys', () => ({
  qk: {
    clubs: {
      bySlug: vi.fn(),
      isFollowing: vi.fn(),
      followers: vi.fn(),
      subscription: vi.fn(),
    },
    players: {
      byClub: vi.fn(),
    },
  },
}));

// ============================================
// Mock React Query hooks
// ============================================

const mockClub = {
  id: 'club-1',
  name: 'Test Club',
  slug: 'test-club',
  logo: '/logo.png',
  primary_color: '#006633',
  secondary_color: '#ffffff',
  league: 'Test League',
  stadium: 'Test Arena',
  city: 'Test City',
  is_admin: false,
  referral_code: null,
};

const mockUseClubBySlug = vi.fn();
const mockUsePlayersByClub = vi.fn();
const mockUseClubFollowerCount = vi.fn();
const mockUseIsFollowingClub = vi.fn();

vi.mock('@/lib/queries/misc', () => ({
  useClubBySlug: (...args: unknown[]) => mockUseClubBySlug(...args),
}));

vi.mock('@/lib/queries/players', () => ({
  usePlayersByClub: (...args: unknown[]) => mockUsePlayersByClub(...args),
}));

vi.mock('@/lib/queries/social', () => ({
  useClubFollowerCount: (...args: unknown[]) => mockUseClubFollowerCount(...args),
  useIsFollowingClub: (...args: unknown[]) => mockUseIsFollowingClub(...args),
}));

const mockUseHoldings = vi.fn();
vi.mock('@/lib/queries/holdings', () => ({
  useHoldings: (...args: unknown[]) => mockUseHoldings(...args),
}));

const mockUseClubFixtures = vi.fn();
vi.mock('@/lib/queries/fixtures', () => ({
  useClubFixtures: (...args: unknown[]) => mockUseClubFixtures(...args),
}));

const mockUseClubPrestige = vi.fn();
vi.mock('@/lib/queries/scouting', () => ({
  useClubPrestige: (...args: unknown[]) => mockUseClubPrestige(...args),
}));

const mockUseActiveIpos = vi.fn();
vi.mock('@/lib/queries/ipos', () => ({
  useActiveIpos: (...args: unknown[]) => mockUseActiveIpos(...args),
}));

const mockUseEvents = vi.fn();
vi.mock('@/lib/queries/events', () => ({
  useEvents: (...args: unknown[]) => mockUseEvents(...args),
}));

const mockUseClubRecentTrades = vi.fn();
vi.mock('@/lib/queries/trades', () => ({
  useClubRecentTrades: (...args: unknown[]) => mockUseClubRecentTrades(...args),
}));

const mockUseFanRanking = vi.fn();
vi.mock('@/lib/queries/fanRanking', () => ({
  useFanRanking: (...args: unknown[]) => mockUseFanRanking(...args),
}));

// ============================================
// Helpers
// ============================================

function setDefaultHookReturns() {
  mockUseClubBySlug.mockReturnValue({ data: mockClub, isLoading: false, isError: false });
  mockUsePlayersByClub.mockReturnValue({ data: [], isLoading: false, isError: false });
  mockUseClubFollowerCount.mockReturnValue({ data: 42 });
  mockUseIsFollowingClub.mockReturnValue({ data: false });
  mockUseHoldings.mockReturnValue({ data: [] });
  mockUseClubFixtures.mockReturnValue({ data: [] });
  mockUseClubPrestige.mockReturnValue({ data: null });
  mockUseActiveIpos.mockReturnValue({ data: [] });
  mockUseEvents.mockReturnValue({ data: [] });
  mockUseClubRecentTrades.mockReturnValue({ data: [] });
  mockUseFanRanking.mockReturnValue({ data: null, isLoading: false });
}

// ============================================
// Tests
// ============================================

describe('ClubContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDefaultHookReturns();
  });

  // 1. Shows ClubSkeleton while loading
  it('shows ClubSkeleton while loading', () => {
    mockUseClubBySlug.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('club-skeleton')).toBeInTheDocument();
  });

  // 2. Shows error state when club not found
  it('shows error state when club not found', () => {
    mockUseClubBySlug.mockReturnValue({ data: undefined, isLoading: false, isError: false });
    renderWithProviders(<ClubContent slug="nonexistent" />);
    // notFound = !clubLoading && !club => renders the "not found" view
    expect(screen.getByText('notFoundTitle')).toBeInTheDocument();
  });

  // 3. Renders ClubHero after load
  it('renders ClubHero after load', () => {
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('club-hero')).toBeInTheDocument();
  });

  // 4. Renders ClubStatsBar after load
  it('renders ClubStatsBar after load', () => {
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('club-stats-bar')).toBeInTheDocument();
  });

  // 5. Renders SquadPreviewSection
  it('renders SquadPreviewSection in overview tab', () => {
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('squad-preview-section')).toBeInTheDocument();
  });

  // 6. Renders ActiveOffersSection
  it('renders ActiveOffersSection in overview tab', () => {
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('active-offers-section')).toBeInTheDocument();
  });

  // 7. Renders MitmachenSection (when FeatureShowcase is not shown, i.e. emptySections < 2)
  it('renders MitmachenSection when sections are populated', () => {
    // emptySections counts: clubIpos empty, clubEvents empty, recentTrades empty
    // Need at least 2 non-empty so emptySections < 2 and FeatureShowcase is NOT shown
    // clubEvents: filtered by club_id from allEvents
    // recentTrades: from useClubRecentTrades
    mockUseEvents.mockReturnValue({ data: [{ club_id: 'club-1' }] });
    mockUseClubRecentTrades.mockReturnValue({
      data: [{ id: 't1', player: { first_name: 'Test', last_name: 'Player' }, price: 1000, executed_at: '2025-01-01' }],
    });
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('mitmachen-section')).toBeInTheDocument();
  });

  // 8. Renders ClubEventsSection (when FeatureShowcase is not shown)
  it('renders ClubEventsSection when sections are populated', () => {
    mockUseEvents.mockReturnValue({ data: [{ club_id: 'club-1' }] });
    mockUseClubRecentTrades.mockReturnValue({
      data: [{ id: 't1', player: { first_name: 'Test', last_name: 'Player' }, price: 1000, executed_at: '2025-01-01' }],
    });
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('club-events-section')).toBeInTheDocument();
  });

  // 9. Renders MembershipSection
  it('renders MembershipSection in overview tab', () => {
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('membership-section')).toBeInTheDocument();
  });

  // 10. Renders SponsorBanner
  it('renders SponsorBanner', () => {
    renderWithProviders(<ClubContent slug="test-club" />);
    // SponsorBanner is rendered via next/dynamic stub
    expect(screen.getAllByTestId('sponsor-banner').length).toBeGreaterThan(0);
  });

  // 11. Shows admin link when user is club admin
  it('shows admin settings link when user is club admin', () => {
    mockUseClubBySlug.mockReturnValue({
      data: { ...mockClub, is_admin: true },
      isLoading: false,
      isError: false,
    });
    renderWithProviders(<ClubContent slug="test-club" />);
    const adminLink = screen.getByRole('link', { name: /admin/i });
    expect(adminLink).toBeInTheDocument();
    expect(adminLink).toHaveAttribute('href', '/club/test-club/admin');
  });

  // 12. Renders FanRankBadge and FanRankOverview when fanRanking data exists
  it('renders FanRankBadge and FanRankOverview when fan ranking data exists', () => {
    mockUseFanRanking.mockReturnValue({
      data: { rank_tier: 'gold', csf_multiplier: 1.5 },
      isLoading: false,
    });
    renderWithProviders(<ClubContent slug="test-club" />);
    expect(screen.getByTestId('fan-rank-badge')).toBeInTheDocument();
    expect(screen.getByTestId('fan-rank-overview')).toBeInTheDocument();
  });
});
