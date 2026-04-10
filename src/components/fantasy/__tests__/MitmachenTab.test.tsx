import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { MitmachenTab } from '../MitmachenTab';
import type { FantasyEvent } from '../types';

// ============================================
// Mocks
// ============================================

const mockGetLineup = vi.fn();

vi.mock('@/lib/services/lineups', () => ({
  getLineup: (...args: unknown[]) => mockGetLineup(...args),
}));

vi.mock('../PredictionsTab', () => ({
  PredictionsTab: ({ gameweek, userId }: { gameweek: number; userId: string }) => (
    <div data-testid="predictions-tab" data-gameweek={gameweek} data-userid={userId}>
      PredictionsTab
    </div>
  ),
}));

vi.mock('../LeaguesSection', () => ({
  default: ({ mode }: { mode: string }) => (
    <div data-testid="leagues-section" data-mode={mode}>
      LeaguesSection
    </div>
  ),
}));

vi.mock('../helpers', () => ({
  getStatusStyle: (status: string) => ({
    bg: `bg-${status}`,
    text: `text-${status}`,
    labelKey: `status_${status}`,
    pulse: status === 'running',
  }),
}));

// ============================================
// Fixtures
// ============================================

function makeEvent(overrides: Partial<FantasyEvent> = {}): FantasyEvent {
  return {
    id: 'e1',
    name: 'Event 1',
    description: '',
    type: 'bescout',
    mode: 'tournament',
    status: 'registering',
    format: '7er',
    startTime: 0,
    endTime: 0,
    lockTime: 0,
    buyIn: 0,
    entryFeeCents: 0,
    prizePool: 0,
    participants: 10,
    maxParticipants: null,
    entryType: 'single',
    speed: 'normal',
    isPromoted: false,
    isFeatured: false,
    isJoined: true,
    isInterested: false,
    scoredAt: null,
    eventTier: 'arena',
    requirements: {},
    rewards: [],
    ticketCost: 0,
    currency: 'tickets' as const,
    isLigaEvent: false,
    ...overrides,
  };
}

function makeDbLineup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lineup-1',
    event_id: 'e1',
    user_id: 'user-1',
    formation: '4-3-3',
    slot_gk: null,
    slot_def1: null,
    slot_def2: null,
    slot_def3: null,
    slot_def4: null,
    slot_mid1: null,
    slot_mid2: null,
    slot_mid3: null,
    slot_mid4: null,
    slot_att: null,
    slot_att2: null,
    slot_att3: null,
    captain_slot: null,
    total_score: null,
    slot_scores: null,
    rank: null,
    reward_amount: 0,
    submitted_at: '2025-01-01T00:00:00Z',
    locked: false,
    synergy_bonus_pct: 0,
    synergy_details: null,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  gameweek: 5,
  activeGameweek: 5,
  userId: 'user-1',
  onEventClick: vi.fn(),
  onTabChange: vi.fn(),
};

// ============================================
// Tests
// ============================================

describe('MitmachenTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLineup.mockResolvedValue(null);
  });

  // --- 1. Empty state: no joined events ---
  it('shows empty state when no joined events', () => {
    const events = [makeEvent({ isJoined: false })];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    expect(screen.getByText('mitmachen.noLineups')).toBeInTheDocument();
    expect(screen.getByText('mitmachen.noLineupsCta')).toBeInTheDocument();
    expect(screen.getByText('mitmachen.noLineupsAction')).toBeInTheDocument();
  });

  // --- 2. CTA button calls onTabChange('events') ---
  it('calls onTabChange with "events" when CTA is clicked', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const events: FantasyEvent[] = [];
    renderWithProviders(
      <MitmachenTab {...DEFAULT_PROPS} events={events} onTabChange={onTabChange} />,
    );

    await user.click(screen.getByText('mitmachen.noLineupsAction'));
    expect(onTabChange).toHaveBeenCalledWith('events');
  });

  // --- 3. Joined events count badge ---
  it('shows joined events count badge', () => {
    const events = [
      makeEvent({ id: 'e1', isJoined: true }),
      makeEvent({ id: 'e2', isJoined: true }),
      makeEvent({ id: 'e3', isJoined: false }),
    ];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    // 2 joined events
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  // --- 4. Joined events list renders event names ---
  it('renders event names for joined events', () => {
    const events = [
      makeEvent({ id: 'e1', name: 'Alpha Cup', isJoined: true }),
      makeEvent({ id: 'e2', name: 'Beta League', isJoined: true }),
      makeEvent({ id: 'e3', name: 'Gamma Open', isJoined: false }),
    ];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    expect(screen.getByText('Alpha Cup')).toBeInTheDocument();
    expect(screen.getByText('Beta League')).toBeInTheDocument();
    expect(screen.queryByText('Gamma Open')).not.toBeInTheDocument();
  });

  // --- 5. Event click calls onEventClick with correct event ---
  it('calls onEventClick with the event when event button is clicked', async () => {
    const user = userEvent.setup();
    const onEventClick = vi.fn();
    const event = makeEvent({ id: 'e1', name: 'Click Me' });
    renderWithProviders(
      <MitmachenTab {...DEFAULT_PROPS} events={[event]} onEventClick={onEventClick} />,
    );

    await user.click(screen.getByText('Click Me'));
    expect(onEventClick).toHaveBeenCalledWith(event);
  });

  // --- 6. Lineup status: no lineup → orange warning ---
  it('shows "mitmachen.noLineup" when getLineup returns null', async () => {
    mockGetLineup.mockResolvedValue(null);
    const events = [makeEvent({ id: 'e1' })];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    await waitFor(() => {
      expect(screen.getByText('mitmachen.noLineup')).toBeInTheDocument();
    });
  });

  // --- 7. Lineup status: has lineup → green text ---
  it('shows "mitmachen.lineupSet" when lineup exists', async () => {
    mockGetLineup.mockResolvedValue(makeDbLineup());
    const events = [makeEvent({ id: 'e1' })];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    await waitFor(() => {
      expect(screen.getByText('mitmachen.lineupSet')).toBeInTheDocument();
    });
  });

  // --- 8. Lineup status: scored with rank ---
  it('shows rank badge when event is scored and lineup has rank', async () => {
    mockGetLineup.mockResolvedValue(makeDbLineup({ total_score: 85, rank: 3 }));
    const events = [makeEvent({ id: 'e1', scoredAt: '2025-01-02T00:00:00Z', participants: 50 })];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    await waitFor(() => {
      expect(screen.getByText('#3')).toBeInTheDocument();
    });
  });

  // --- 9. Status style is used for event badge ---
  it('renders status badge using getStatusStyle labelKey', async () => {
    const events = [makeEvent({ id: 'e1', status: 'running' })];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    // Mock getStatusStyle returns labelKey = 'status_running', which goes through tf()
    // tf returns the key, so we see 'status_running'
    expect(screen.getByText('status_running')).toBeInTheDocument();
  });

  // --- 10. PredictionsTab rendered as child ---
  it('renders PredictionsTab with correct props', () => {
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={[]} />);

    const predictions = screen.getByTestId('predictions-tab');
    expect(predictions).toBeInTheDocument();
    expect(predictions).toHaveAttribute('data-gameweek', '5');
    expect(predictions).toHaveAttribute('data-userid', 'user-1');
  });

  // --- 11. LeaguesSection rendered as child ---
  it('renders LeaguesSection in compact mode', () => {
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={[]} />);

    const leagues = screen.getByTestId('leagues-section');
    expect(leagues).toBeInTheDocument();
    expect(leagues).toHaveAttribute('data-mode', 'compact');
  });

  // --- 12. No userId → lineup statuses reset ---
  it('does not call getLineup when userId is empty', () => {
    const events = [makeEvent({ id: 'e1' })];
    renderWithProviders(
      <MitmachenTab {...DEFAULT_PROPS} userId="" events={events} />,
    );

    expect(mockGetLineup).not.toHaveBeenCalled();
  });

  // --- 13. getLineup error → falls back to hasLineup: false ---
  it('falls back to no lineup when getLineup throws', async () => {
    mockGetLineup.mockRejectedValue(new Error('network error'));
    const events = [makeEvent({ id: 'e1' })];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    await waitFor(() => {
      expect(screen.getByText('mitmachen.noLineup')).toBeInTheDocument();
    });
  });

  // --- 14. Count badge not shown when no joined events ---
  it('does not show count badge when no joined events', () => {
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={[]} />);

    // The header should still render but no count badge
    expect(screen.getByText('myLineups')).toBeInTheDocument();
    // No number badge
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  // --- 15. Scored event shows scoredRankOf text ---
  it('shows scoredRankOf for scored events with score and rank', async () => {
    mockGetLineup.mockResolvedValue(makeDbLineup({ total_score: 92, rank: 1 }));
    const events = [makeEvent({ id: 'e1', scoredAt: '2025-01-02', participants: 20 })];
    renderWithProviders(<MitmachenTab {...DEFAULT_PROPS} events={events} />);

    await waitFor(() => {
      // tf returns the key for scoredRankOf — useTranslations mock returns the key string
      expect(screen.getByText('scoredRankOf')).toBeInTheDocument();
    });
  });
});
