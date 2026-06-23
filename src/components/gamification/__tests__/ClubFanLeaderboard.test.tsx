import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => <span data-testid="icon" />;
  return { Trophy: Stub, Loader2: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CosmeticAvatar: ({ displayName }: { displayName: string }) => (
    <span data-testid="avatar" aria-label={displayName} />
  ),
  ErrorState: ({ onRetry }: { onRetry: () => void }) => (
    <button data-testid="error-state" onClick={onRetry}>error</button>
  ),
}));
vi.mock('@/components/ui/FanRankBadge', () => ({
  default: ({ tier }: { tier: string }) => <span data-testid="fan-badge">{tier}</span>,
}));

const mockUseClubFanLeaderboard = vi.fn();
vi.mock('@/lib/queries/fanRanking', () => ({
  useClubFanLeaderboard: (clubId: string | undefined) => mockUseClubFanLeaderboard(clubId),
}));

import ClubFanLeaderboard from '../ClubFanLeaderboard';

function entry(userId: string, handle: string, tier: string, score: number) {
  return {
    user_id: userId, club_id: 'c1', rank_tier: tier,
    event_score: 0, dpc_score: 0, abo_score: 0, community_score: 0, streak_score: 0,
    total_score: score, calculated_at: '2026-06-23', created_at: '2026-01-01',
    profile: { handle, avatar_url: null },
  };
}

beforeEach(() => {
  mockUseClubFanLeaderboard.mockReset();
});

describe('ClubFanLeaderboard', () => {
  it('renders ranked fans with handle, tier badge and score', () => {
    mockUseClubFanLeaderboard.mockReturnValue({
      data: [entry('u1', 'alice', 'vereinsikone', 33), entry('u2', 'bob', 'stammgast', 12)],
      isLoading: false, isError: false, refetch: vi.fn(),
    });
    renderWithProviders(<ClubFanLeaderboard clubId="c1" />);
    expect(screen.getByText('clubFanLeaderboardTitle')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('33')).toBeInTheDocument();
    expect(screen.getAllByTestId('fan-badge')).toHaveLength(2);
  });

  it('returns null when there are no fans (and not loading)', () => {
    mockUseClubFanLeaderboard.mockReturnValue({
      data: [], isLoading: false, isError: false, refetch: vi.fn(),
    });
    const { container } = renderWithProviders(<ClubFanLeaderboard clubId="c1" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('clubFanLeaderboardTitle')).not.toBeInTheDocument();
  });

  it('highlights the current user own row', () => {
    mockUseClubFanLeaderboard.mockReturnValue({
      data: [entry('u1', 'alice', 'vereinsikone', 33), entry('u2', 'bob', 'stammgast', 12)],
      isLoading: false, isError: false, refetch: vi.fn(),
    });
    renderWithProviders(<ClubFanLeaderboard clubId="c1" currentUserId="u2" />);
    const selfLink = screen.getByText('bob').closest('a');
    expect(selfLink?.className).toContain('bg-gold');
    const otherLink = screen.getByText('alice').closest('a');
    expect(otherLink?.className).not.toContain('bg-gold');
  });

  it('shows a spinner while loading', () => {
    mockUseClubFanLeaderboard.mockReturnValue({
      data: [], isLoading: true, isError: false, refetch: vi.fn(),
    });
    renderWithProviders(<ClubFanLeaderboard clubId="c1" />);
    expect(screen.getByText('clubFanLeaderboardTitle')).toBeInTheDocument();
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument();
  });

  it('shows ErrorState with retry on error', () => {
    mockUseClubFanLeaderboard.mockReturnValue({
      data: [], isLoading: false, isError: true, refetch: vi.fn(),
    });
    renderWithProviders(<ClubFanLeaderboard clubId="c1" />);
    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });
});
