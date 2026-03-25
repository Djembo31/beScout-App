import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import LeaderboardPanel from '../LeaderboardPanel';
import type { FantasyEvent } from '../../types';
import type { LeaderboardEntry } from '@/lib/services/scoring';

// ============================================
// Mocks
// ============================================

const mockGetLineupWithPlayers = vi.fn();

vi.mock('@/lib/services/lineups', () => ({
  getLineupWithPlayers: (...args: unknown[]) => mockGetLineupWithPlayers(...args),
}));

vi.mock('@/lib/queries/cosmetics', () => ({
  useBatchEquippedCosmetics: () => ({ data: new Map() }),
}));

vi.mock('@/components/ui', () => ({
  CosmeticAvatar: ({ displayName }: { displayName: string }) => (
    <span data-testid="cosmetic-avatar">{displayName}</span>
  ),
  CosmeticTitle: () => <span data-testid="cosmetic-title" />,
}));

vi.mock('@/components/player', () => ({
  PositionBadge: ({ pos }: { pos: string }) => <span data-testid="position-badge">{pos}</span>,
  PlayerIdentity: ({ player }: { player: { last: string } }) => (
    <span data-testid="player-identity">{player.last}</span>
  ),
  PlayerPhoto: ({ last }: { last: string }) => <span data-testid="player-photo">{last}</span>,
}));

vi.mock('../../helpers', () => ({
  getScoreColor: () => '#fff',
  getPosAccentColor: () => '#fff',
}));

vi.mock('@/components/player/detail/SponsorBanner', () => ({
  default: () => <div data-testid="sponsor-banner" />,
}));

vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ============================================
// Fixtures
// ============================================

function makeEvent(overrides: Partial<FantasyEvent> = {}): FantasyEvent {
  return {
    id: 'e1',
    name: 'Test Event',
    description: '',
    type: 'bescout',
    mode: 'tournament',
    status: 'running',
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
    ...overrides,
  };
}

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    userId: 'u1',
    handle: 'scout1',
    displayName: 'Scout One',
    avatarUrl: 'https://example.com/avatar.png',
    totalScore: 120,
    rank: 1,
    rewardAmount: 5000,
    ...overrides,
  };
}

const mockLineupData = {
  lineup: { formation: '1-2-2-1' },
  players: [
    {
      slotKey: 'gk1',
      playerId: 'p1',
      score: 80,
      player: {
        firstName: 'Test',
        lastName: 'Player',
        position: 'GK',
        imageUrl: null,
        club: 'Test FC',
        perfL5: 75,
      },
    },
  ],
};

// ============================================
// Tests
// ============================================

describe('LeaderboardPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Loading state
  it('renders loading spinner when leaderboardLoading=true', () => {
    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={[]}
        leaderboardLoading={true}
        isScored={false}
      />,
    );

    expect(screen.getByText('rankingLoading')).toBeInTheDocument();
  });

  // 2. Empty state
  it('renders empty state when leaderboard=[] and not loading', () => {
    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={[]}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    expect(screen.getByText('noResultsYet')).toBeInTheDocument();
    expect(screen.getByText('scoringPending')).toBeInTheDocument();
  });

  // 3. Renders entries
  it('renders leaderboard entries with names and scores', () => {
    const entries = [
      makeEntry({ userId: 'u1', displayName: 'Alice', totalScore: 150, rank: 1 }),
      makeEntry({ userId: 'u2', handle: 'bob', displayName: 'Bob', totalScore: 130, rank: 2, rewardAmount: 0 }),
    ];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('130')).toBeInTheDocument();
    // Names rendered in both CosmeticAvatar mock and display span
    expect(screen.getAllByText(/Alice/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Bob/).length).toBeGreaterThanOrEqual(1);
  });

  // 4. Highlights current user
  it('highlights current user entry with "youLabel"', () => {
    const entries = [
      makeEntry({ userId: 'me', displayName: 'Me', totalScore: 100, rank: 1 }),
      makeEntry({ userId: 'u2', displayName: 'Other', totalScore: 80, rank: 2, rewardAmount: 0 }),
    ];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        userId="me"
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    expect(screen.getByText(/youLabel/)).toBeInTheDocument();
  });

  // 5. Reward display for entries with rewardAmount > 0
  it('shows reward amount for entries with rewardAmount > 0', () => {
    const entries = [
      makeEntry({ userId: 'u1', rewardAmount: 5000, rank: 1 }),
    ];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    // rewardAmount 5000 / 100 = 50, fmtScout(50) => "50"
    expect(screen.getByText(/\+50 CR/)).toBeInTheDocument();
  });

  // 6. Hides reward for entries with rewardAmount = 0
  it('hides reward for entries with rewardAmount = 0', () => {
    const entries = [
      makeEntry({ userId: 'u1', rewardAmount: 0, rank: 1 }),
    ];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    expect(screen.queryByText(/CR/)).not.toBeInTheDocument();
  });

  // 7. Polling indicator visible
  it('shows Live indicator when isPolling=true', () => {
    const entries = [makeEntry()];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
        isPolling={true}
      />,
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  // 8. Polling indicator hidden
  it('hides Live indicator when isPolling=false', () => {
    const entries = [makeEntry()];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
        isPolling={false}
      />,
    );

    expect(screen.queryByText('Live')).not.toBeInTheDocument();
  });

  // 9. Scored banner
  it('shows scored banner when isScored=true with event.scoredAt set', () => {
    const entries = [makeEntry()];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent({ scoredAt: '2025-06-15T14:30:00Z' })}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={true}
      />,
    );

    // The t() mock returns the key, so we expect "scoredAt"
    expect(screen.getByText(/scoredAt/)).toBeInTheDocument();
  });

  // 10. No scored banner
  it('does not show scored banner when isScored=false', () => {
    const entries = [makeEntry()];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    expect(screen.queryByText(/scoredAt/)).not.toBeInTheDocument();
  });

  // 11. Click entry loads detail view
  it('clicking entry loads lineup detail view', async () => {
    const user = userEvent.setup();
    mockGetLineupWithPlayers.mockResolvedValueOnce(mockLineupData);

    const entries = [
      makeEntry({ userId: 'u1', displayName: 'Alice', rank: 1 }),
    ];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    // Click the leaderboard entry button
    const entryButton = screen.getByRole('button', { name: /Alice/ });
    await user.click(entryButton);

    await waitFor(() => {
      expect(mockGetLineupWithPlayers).toHaveBeenCalledWith('e1', 'u1');
    });

    // Detail view should show back button with "backToRanking" text
    await waitFor(() => {
      expect(screen.getByText('backToRanking')).toBeInTheDocument();
    });

    // Detail view shows the user's score
    expect(screen.getByText(/120 Pkt/)).toBeInTheDocument();
  });

  // 12. Detail view shows back button
  it('detail view shows back button', async () => {
    const user = userEvent.setup();
    mockGetLineupWithPlayers.mockResolvedValueOnce(mockLineupData);

    const entries = [makeEntry({ userId: 'u1', displayName: 'Alice', rank: 1 })];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Alice/ }));

    await waitFor(() => {
      expect(screen.getByText('backToRanking')).toBeInTheDocument();
    });
  });

  // 13. Back button returns to list view
  it('clicking back button returns to list view', async () => {
    const user = userEvent.setup();
    mockGetLineupWithPlayers.mockResolvedValueOnce(mockLineupData);

    const entries = [makeEntry({ userId: 'u1', displayName: 'Alice', rank: 1 })];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    // Navigate to detail view
    await user.click(screen.getByRole('button', { name: /Alice/ }));

    await waitFor(() => {
      expect(screen.getByText('backToRanking')).toBeInTheDocument();
    });

    // Click back
    await user.click(screen.getByText('backToRanking'));

    // Should be back to list view — entry should be visible again
    await waitFor(() => {
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    // Back button should no longer be visible
    expect(screen.queryByText('backToRanking')).not.toBeInTheDocument();
  });

  // 14. Rank 1 gets gold styling
  it('rank 1 gets gold styling', () => {
    const entries = [
      makeEntry({ userId: 'u1', rank: 1 }),
      makeEntry({ userId: 'u2', handle: 'other', displayName: 'Other', rank: 4, totalScore: 50, rewardAmount: 0 }),
    ];

    renderWithProviders(
      <LeaderboardPanel
        event={makeEvent()}
        leaderboard={entries}
        leaderboardLoading={false}
        isScored={false}
      />,
    );

    // Rank 1 badge should have gold classes
    const rankBadges = screen.getAllByText('1');
    // The rank badge for rank 1 should contain 'text-gold' class
    const rankOneBadge = rankBadges.find(el => el.closest('.bg-gold\\/20'));
    expect(rankOneBadge).toBeTruthy();
  });
});
