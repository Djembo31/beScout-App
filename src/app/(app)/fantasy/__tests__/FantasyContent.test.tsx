import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import FantasyContent from '../FantasyContent';

// ============================================
// Mocks — Providers
// ============================================

const mockUser = { id: 'u1', email: 'test@test.com' };
const mockProfile = { display_name: 'Tester', favorite_club: null };
const mockAddToast = vi.fn();

vi.mock('@/components/providers/AuthProvider', () => ({
  useUser: () => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
    refreshProfile: vi.fn(),
    platformRole: null,
    clubAdmin: null,
  }),
}));

vi.mock('@/components/providers/WalletProvider', () => ({
  useWallet: () => ({
    balanceCents: 100000,
    lockedBalanceCents: 0,
    setBalanceCents: vi.fn(),
    refreshBalance: vi.fn(),
  }),
}));

vi.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}));

vi.mock('@/components/providers/ClubProvider', () => ({
  useClub: () => ({
    activeClub: { id: 'club-1', name: 'Test Club' },
    followedClubs: [],
    primaryClub: null,
    setActiveClub: vi.fn(),
    isFollowing: () => false,
    toggleFollow: vi.fn(),
    refreshClubs: vi.fn(),
    loading: false,
  }),
}));

// ============================================
// Mocks — React Query hooks
// ============================================

const mockUseEvents = vi.fn();
const mockUseJoinedEventIds = vi.fn();
const mockUsePlayerEventUsage = vi.fn();
const mockUseLeagueActiveGameweek = vi.fn();
const mockUseIsClubAdmin = vi.fn();

vi.mock('@/lib/queries/events', () => ({
  useEvents: (...args: unknown[]) => mockUseEvents(...args),
  useJoinedEventIds: (...args: unknown[]) => mockUseJoinedEventIds(...args),
  usePlayerEventUsage: (...args: unknown[]) => mockUsePlayerEventUsage(...args),
  useLeagueActiveGameweek: (...args: unknown[]) => mockUseLeagueActiveGameweek(...args),
  useIsClubAdmin: (...args: unknown[]) => mockUseIsClubAdmin(...args),
}));

const mockUseHoldings = vi.fn();
vi.mock('@/lib/queries/holdings', () => ({
  useHoldings: (...args: unknown[]) => mockUseHoldings(...args),
}));

const mockUseUserTickets = vi.fn();
vi.mock('@/lib/queries/tickets', () => ({
  useUserTickets: (...args: unknown[]) => mockUseUserTickets(...args),
}));

// ============================================
// Mocks — Services
// ============================================

vi.mock('@/lib/services/players', () => ({
  centsToBsd: (c: number) => c / 100,
}));

vi.mock('@/lib/services/events', () => ({
  lockEventEntry: vi.fn().mockResolvedValue({ ok: true }),
  unlockEventEntry: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/lib/services/lineups', () => ({
  submitLineup: vi.fn(),
  getLineup: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/services/fixtures', () => ({
  getFixtureDeadlinesByGameweek: vi.fn().mockResolvedValue(new Map()),
  getGameweekStatuses: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/queries/invalidation', () => ({
  invalidateFantasyQueries: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  queryClient: {
    invalidateQueries: vi.fn(),
  },
}));

vi.mock('@/lib/queries/keys', () => ({
  qk: {
    events: { leagueGw: ['events', 'leagueGw'], all: ['events'], joinedIds: (id: string) => ['events', 'joined', id], usage: (id: string) => ['events', 'usage', id] },
    tickets: { balance: (id: string) => ['tickets', 'balance', id] },
    holdings: { byUser: (id: string) => ['holdings', id] },
    clubAdmin: { check: (uid: string, cid: string) => ['clubAdmin', uid, cid] },
  },
}));

vi.mock('@/lib/errorMessages', () => ({
  mapErrorToKey: () => 'genericError',
  normalizeError: (e: unknown) => String(e),
}));

vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Mocks — Child components (stubs)
// ============================================

vi.mock('@/components/fantasy', () => ({
  CreateEventModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="create-event-modal">CreateEventModal</div> : null,
  SpieltagTab: (props: Record<string, unknown>) => (
    <div data-testid="spieltag-tab" data-gameweek={props.gameweek}>SpieltagTab</div>
  ),
  getFormationsForFormat: () => [{ id: '3-3-1', label: '3-3-1', positions: [] }],
  buildSlotDbKeys: () => [],
}));

vi.mock('@/components/fantasy/constants', () => ({
  getFormationsForFormat: () => [{ id: '3-3-1', label: '3-3-1', positions: [] }],
  buildSlotDbKeys: () => [],
}));

vi.mock('@/components/fantasy/SpieltagSelector', () => ({
  SpieltagSelector: (props: Record<string, unknown>) => (
    <div data-testid="spieltag-selector" data-gameweek={props.gameweek}>SpieltagSelector</div>
  ),
}));

vi.mock('@/components/fantasy/MitmachenTab', () => ({
  MitmachenTab: () => <div data-testid="mitmachen-tab">MitmachenTab</div>,
}));

vi.mock('@/components/fantasy/ErgebnisseTab', () => ({
  ErgebnisseTab: () => <div data-testid="ergebnisse-tab">ErgebnisseTab</div>,
}));

vi.mock('@/components/fantasy/EventsTab', () => ({
  EventsTab: () => <div data-testid="events-tab">EventsTab</div>,
}));

vi.mock('@/components/fantasy/ScoringRules', () => ({
  ScoringRules: () => <div data-testid="scoring-rules">ScoringRules</div>,
}));

vi.mock('@/components/fantasy/EventSummaryModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid="event-summary-modal">EventSummaryModal</div> : null,
  isEventSeen: () => true,
  markEventSeen: vi.fn(),
}));

vi.mock('@/components/fantasy/EventDetailModal', () => ({
  EventDetailModal: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div data-testid="event-detail-modal">EventDetailModal</div> : null,
}));

// Dynamic imports — mock next/dynamic to render stubs directly
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    // For MissionHintList and EventDetailModal — return a simple stub
    // The mock factory above will handle the actual component resolution
    const DynamicStub = (props: Record<string, unknown>) => {
      // Determine which component this is based on props
      if ('context' in props) {
        return <div data-testid="mission-hint-list" data-context={props.context}>MissionHintList</div>;
      }
      if ('isOpen' in props) {
        return props.isOpen ? <div data-testid="event-detail-modal">EventDetailModal</div> : null;
      }
      return null;
    };
    DynamicStub.displayName = 'DynamicStub';
    return DynamicStub;
  },
}));

vi.mock('@/components/onboarding/NewUserTip', () => ({
  default: ({ show, tipKey, title }: { show: boolean; tipKey: string; title: string }) =>
    show ? <div data-testid="new-user-tip" data-tip-key={tipKey}>{title}</div> : null,
}));

vi.mock('@/components/ui', () => ({
  Button: ({ children, onClick, ...rest }: { children: React.ReactNode; onClick?: () => void; variant?: string }) => (
    <button data-testid="button" onClick={onClick} {...rest}>{children}</button>
  ),
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
  SkeletonCard: ({ className }: { className?: string }) => (
    <div data-testid="skeleton-card" className={className} />
  ),
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ============================================
// Helpers
// ============================================

function setDefaultQueryMocks(overrides?: {
  eventsLoading?: boolean;
  eventsError?: boolean;
  activeGwLoading?: boolean;
  activeGw?: number;
  isAdmin?: boolean;
  joinedIds?: string[];
}) {
  const {
    eventsLoading = false,
    eventsError = false,
    activeGwLoading = false,
    activeGw = 5,
    isAdmin = false,
    joinedIds = [],
  } = overrides ?? {};

  mockUseEvents.mockReturnValue({
    data: [],
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: vi.fn(),
  });

  mockUseJoinedEventIds.mockReturnValue({
    data: joinedIds,
    isLoading: false,
  });

  mockUsePlayerEventUsage.mockReturnValue({
    data: new Map(),
    isLoading: false,
  });

  mockUseLeagueActiveGameweek.mockReturnValue({
    data: activeGw,
    isLoading: activeGwLoading,
  });

  mockUseIsClubAdmin.mockReturnValue({
    data: isAdmin,
    isLoading: false,
  });

  mockUseHoldings.mockReturnValue({
    data: [],
    isLoading: false,
  });

  mockUseUserTickets.mockReturnValue({
    data: { balance: 10 },
    isLoading: false,
  });
}

// ============================================
// Tests
// ============================================

describe('FantasyContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading skeleton when events loading', () => {
    setDefaultQueryMocks({ eventsLoading: true });
    renderWithProviders(<FantasyContent />);

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows loading skeleton when activeGw loading', () => {
    setDefaultQueryMocks({ activeGwLoading: true });
    renderWithProviders(<FantasyContent />);

    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders tab navigation after load', () => {
    setDefaultQueryMocks();
    renderWithProviders(<FantasyContent />);

    // 4 tab buttons: spieltag, events, mitmachen, ergebnisse
    expect(screen.getByText('tabFixtures')).toBeInTheDocument();
    expect(screen.getByText('events')).toBeInTheDocument();
    expect(screen.getByText('tabJoined')).toBeInTheDocument();
    expect(screen.getByText('tabResults')).toBeInTheDocument();
  });

  it('renders SpieltagSelector', () => {
    setDefaultQueryMocks();
    renderWithProviders(<FantasyContent />);

    expect(screen.getByTestId('spieltag-selector')).toBeInTheDocument();
  });

  it('shows SpieltagTab by default', () => {
    setDefaultQueryMocks();
    renderWithProviders(<FantasyContent />);

    expect(screen.getByTestId('spieltag-tab')).toBeInTheDocument();
  });

  it('shows EventsTab when events tab active', async () => {
    setDefaultQueryMocks();
    const user = userEvent.setup();
    renderWithProviders(<FantasyContent />);

    await user.click(screen.getByText('events'));
    expect(screen.getByTestId('events-tab')).toBeInTheDocument();
  });

  it('shows MitmachenTab when mitmachen tab active', async () => {
    setDefaultQueryMocks();
    const user = userEvent.setup();
    renderWithProviders(<FantasyContent />);

    await user.click(screen.getByText('tabJoined'));
    expect(screen.getByTestId('mitmachen-tab')).toBeInTheDocument();
  });

  it('shows ErgebnisseTab when ergebnisse tab active', async () => {
    setDefaultQueryMocks();
    const user = userEvent.setup();
    renderWithProviders(<FantasyContent />);

    await user.click(screen.getByText('tabResults'));
    expect(screen.getByTestId('ergebnisse-tab')).toBeInTheDocument();
  });

  it('renders ScoringRules component', () => {
    setDefaultQueryMocks();
    renderWithProviders(<FantasyContent />);

    expect(screen.getByTestId('scoring-rules')).toBeInTheDocument();
  });

  it('EventDetailModal not open by default', () => {
    setDefaultQueryMocks();
    renderWithProviders(<FantasyContent />);

    expect(screen.queryByTestId('event-detail-modal')).not.toBeInTheDocument();
  });

  it('shows NewUserTip for new users (no joined events)', () => {
    setDefaultQueryMocks({ joinedIds: [] });
    renderWithProviders(<FantasyContent />);

    expect(screen.getByTestId('new-user-tip')).toBeInTheDocument();
    expect(screen.getByTestId('new-user-tip')).toHaveAttribute('data-tip-key', 'fantasy-first-event');
  });

  it('does not show NewUserTip when user has joined events', () => {
    setDefaultQueryMocks({ joinedIds: ['e1'] });
    renderWithProviders(<FantasyContent />);

    expect(screen.queryByTestId('new-user-tip')).not.toBeInTheDocument();
  });

  it('renders MissionHintList', () => {
    setDefaultQueryMocks();
    renderWithProviders(<FantasyContent />);

    const missionHint = screen.getByTestId('mission-hint-list');
    expect(missionHint).toBeInTheDocument();
    expect(missionHint).toHaveAttribute('data-context', 'fantasy');
  });
});
