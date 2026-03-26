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
  useIsClubAdmin: () => ({ data: false, isLoading: false }),
  useHoldingLocks: () => ({ data: new Map(), isLoading: false }),
  useWildcardBalance: () => ({ data: 0, isLoading: false }),
  useActiveGameweek: () => ({ data: 5, isLoading: false }),
  useEventEntry: () => ({ data: null, isLoading: false }),
  useEnteredEventIds: () => ({ data: [], isLoading: false }),
  useScoutEventsEnabled: () => false,
}));

// Also mock the feature module re-exports (same hooks, different path)
vi.mock('@/features/fantasy/queries/events', () => ({
  useEvents: (...args: unknown[]) => mockUseEvents(...args),
  useJoinedEventIds: (...args: unknown[]) => mockUseJoinedEventIds(...args),
  usePlayerEventUsage: (...args: unknown[]) => mockUsePlayerEventUsage(...args),
  useHoldingLocks: () => ({ data: new Map(), isLoading: false }),
  useWildcardBalance: () => ({ data: 0, isLoading: false }),
  useLeagueActiveGameweek: (...args: unknown[]) => mockUseLeagueActiveGameweek(...args),
  useIsClubAdmin: (...args: unknown[]) => mockUseIsClubAdmin(...args),
  useActiveGameweek: () => ({ data: 5, isLoading: false }),
  useEventEntry: () => ({ data: null, isLoading: false }),
  useEnteredEventIds: () => ({ data: [], isLoading: false }),
  useScoutEventsEnabled: () => false,
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

// Mock feature module services (prevent supabaseClient import)
vi.mock('@/features/fantasy/services/events.queries', () => ({
  getEvents: vi.fn().mockResolvedValue([]),
  getUserJoinedEventIds: vi.fn().mockResolvedValue([]),
  isClubEvent: vi.fn().mockReturnValue(false),
}));
vi.mock('@/features/fantasy/services/events.mutations', () => ({
  lockEventEntry: vi.fn().mockResolvedValue({ ok: true }),
  unlockEventEntry: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock('@/features/fantasy/services/lineups.queries', () => ({
  getLineup: vi.fn().mockResolvedValue(null),
  getPlayerEventUsage: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock('@/features/fantasy/services/lineups.mutations', () => ({
  submitLineup: vi.fn(),
}));
vi.mock('@/features/fantasy/services/fixtures', () => ({
  getFixtureDeadlinesByGameweek: vi.fn().mockResolvedValue(new Map()),
  getGameweekStatuses: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/fantasy/services/scoring.queries', () => ({
  getEventLeaderboard: vi.fn().mockResolvedValue([]),
  getProgressiveScores: vi.fn().mockResolvedValue(new Map()),
}));
vi.mock('@/features/fantasy/services/wildcards', () => ({
  getWildcardBalance: vi.fn().mockResolvedValue(0),
}));
vi.mock('@/features/fantasy/services/chips', () => ({
  getEventChips: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/features/fantasy/mappers/eventMapper', () => ({
  dbEventToFantasyEvent: vi.fn(),
  deriveEventStatus: vi.fn(),
}));
vi.mock('@/features/fantasy/mappers/holdingMapper', () => ({
  dbHoldingToUserDpcHolding: vi.fn(),
}));
vi.mock('@/features/fantasy/queries/invalidation', () => ({
  invalidateAfterJoin: vi.fn(),
  invalidateAfterLeave: vi.fn(),
  invalidateAfterLineupSave: vi.fn(),
  invalidateAfterScoring: vi.fn(),
}));
vi.mock('@/features/fantasy/queries/lineups', () => ({
  useLineupScores: () => ({ data: new Map(), isLoading: false }),
}));
vi.mock('@/features/fantasy/queries/scoring', () => ({
  useLeaderboard: () => ({ data: [], isLoading: false }),
  useProgressiveScores: () => ({ data: new Map(), isLoading: false }),
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

// ============================================
// Mocks — Feature Module Hooks
// ============================================

vi.mock('@/features/fantasy/store/fantasyStore', () => ({
  useFantasyStore: () => ({
    mainTab: 'paarungen',
    selectedGameweek: null,
    currentGw: 5,
    selectedEventId: null,
    showCreateModal: false,
    summaryEventId: null,
    interestedIds: new Set(),
    setMainTab: vi.fn(),
    setSelectedGameweek: vi.fn(),
    setCurrentGw: vi.fn(),
    openEvent: vi.fn(),
    closeEvent: vi.fn(),
    openCreateModal: vi.fn(),
    closeCreateModal: vi.fn(),
    setSummaryEventId: vi.fn(),
    toggleInterested: vi.fn(),
  }),
}));

vi.mock('@/features/fantasy/hooks/useGameweek', () => ({
  useGameweek: () => ({
    currentGw: 5,
    activeGw: 5,
    gwStatus: 'open' as const,
    fixtureCount: 9,
    isLoading: false,
    setSelectedGameweek: vi.fn(),
  }),
}));

vi.mock('@/features/fantasy/hooks/useFantasyEvents', () => ({
  useFantasyEvents: () => ({
    events: [],
    gwEvents: [],
    activeEvents: [],
    selectedEvent: null,
    joinedSet: new Set(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/fantasy/hooks/useFantasyHoldings', () => ({
  useFantasyHoldings: () => ({
    holdings: [],
  }),
}));

vi.mock('@/features/fantasy/hooks/useEventActions', () => ({
  useEventActions: () => ({
    joinEvent: vi.fn(),
    leaveEvent: vi.fn(),
    submitLineup: vi.fn(),
    joiningEventId: null,
    leavingEventId: null,
  }),
}));

vi.mock('@/features/fantasy/hooks/useFixtureDeadlines', () => ({
  useFixtureDeadlines: () => ({
    fixtureDeadlines: new Map(),
    isPlayerLocked: () => false,
    isPartiallyLocked: false,
    hasUnlockedFixtures: false,
    nextKickoff: null,
  }),
}));

vi.mock('@/features/fantasy/hooks/useScoredEvents', () => ({
  useScoredEvents: () => ({
    summaryEvent: null,
    summaryLeaderboard: [],
    dismissSummary: vi.fn(),
  }),
}));

// Mock the feature module components
vi.mock('@/features/fantasy/components/FantasyHeader', () => ({
  FantasyHeader: ({ activeCount }: { activeCount: number }) => (
    <div data-testid="fantasy-header" data-active-count={activeCount}>FantasyHeader</div>
  ),
}));

vi.mock('@/features/fantasy/components/FantasyNav', () => ({
  FantasyNav: (props: Record<string, unknown>) => (
    <div data-testid="fantasy-nav">{
      ['paarungen', 'events', 'mitmachen', 'ergebnisse'].map(id => (
        <button key={id} onClick={() => (props.onTabChange as (t: string) => void)(id)}>
          {id === 'paarungen' ? 'tabFixtures' : id === 'mitmachen' ? 'tabJoined' : id === 'ergebnisse' ? 'tabResults' : id}
        </button>
      ))
    }</div>
  ),
}));

vi.mock('@/features/fantasy/components/FantasySkeleton', () => ({
  FantasySkeleton: () => (
    <div data-testid="fantasy-skeleton">
      <div data-testid="skeleton" />
      <div data-testid="skeleton" />
      <div data-testid="skeleton" />
    </div>
  ),
}));

vi.mock('@/features/fantasy/components/FantasyError', () => ({
  FantasyError: ({ onRetry }: { onRetry: () => void }) => (
    <div data-testid="fantasy-error"><button onClick={onRetry}>Retry</button></div>
  ),
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

  it('renders header + nav + scoring rules', () => {
    renderWithProviders(<FantasyContent />);

    expect(screen.getByTestId('fantasy-header')).toBeInTheDocument();
    expect(screen.getByTestId('fantasy-nav')).toBeInTheDocument();
    expect(screen.getByTestId('scoring-rules')).toBeInTheDocument();
  });

  it('renders tab navigation with 4 tabs', () => {
    renderWithProviders(<FantasyContent />);

    expect(screen.getByText('tabFixtures')).toBeInTheDocument();
    expect(screen.getByText('events')).toBeInTheDocument();
    expect(screen.getByText('tabJoined')).toBeInTheDocument();
    expect(screen.getByText('tabResults')).toBeInTheDocument();
  });

  it('shows SpieltagTab by default (mainTab = paarungen)', () => {
    renderWithProviders(<FantasyContent />);

    expect(screen.getByTestId('spieltag-tab')).toBeInTheDocument();
  });

  it('EventDetailModal not open by default', () => {
    renderWithProviders(<FantasyContent />);

    expect(screen.queryByTestId('event-detail-modal')).not.toBeInTheDocument();
  });

  it('shows NewUserTip when joinedSet is empty', () => {
    renderWithProviders(<FantasyContent />);

    expect(screen.getByTestId('new-user-tip')).toBeInTheDocument();
    expect(screen.getByTestId('new-user-tip')).toHaveAttribute('data-tip-key', 'fantasy-first-event');
  });

  it('renders MissionHintList', () => {
    renderWithProviders(<FantasyContent />);

    const missionHint = screen.getByTestId('mission-hint-list');
    expect(missionHint).toBeInTheDocument();
    expect(missionHint).toHaveAttribute('data-context', 'fantasy');
  });
});
