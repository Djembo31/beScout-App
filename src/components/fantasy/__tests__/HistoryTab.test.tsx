import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => null,
}));
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Heart: Stub, BarChart3: Stub, TrendingUp: Stub, History: Stub, Trophy: Stub, Crown: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));
vi.mock('@/lib/services/scoring', () => ({
  getSeasonLeaderboard: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/queries/cosmetics', () => ({
  useBatchEquippedCosmetics: () => ({ data: {} }),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Skeleton: () => <div data-testid="skeleton" />,
  CosmeticAvatar: () => null,
  CosmeticTitle: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('../helpers', () => ({
  getFormResult: () => ({ bg: '', text: '', icon: '🔵' }),
}));

import { HistoryTab } from '../HistoryTab';

const defaultProps = {
  participations: [
    { eventId: 'e1', eventName: 'Cup 1', gameweek: 5, rank: 3, totalParticipants: 20, points: 85, rewardCents: 5000 },
    { eventId: 'e2', eventName: 'Cup 2', gameweek: 6, rank: 1, totalParticipants: 15, points: 95, rewardCents: 10000 },
  ],
  userDisplayName: 'TestUser',
  userFavoriteClub: null,
  seasonPoints: 180,
  eventsPlayed: 2,
  bestRank: 1,
  totalRewardBsd: 150,
  wins: 1,
  top10: 2,
  avgPoints: 90,
  avgRank: 2,
};

describe('HistoryTab', () => {
  it('renders season stats', async () => {
    renderWithProviders(<HistoryTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('180')).toBeInTheDocument(); // seasonPoints
    });
  });

  it('shows number of events played', async () => {
    renderWithProviders(<HistoryTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // eventsPlayed
    });
  });

  it('shows best rank', async () => {
    renderWithProviders(<HistoryTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getAllByText('#1').length).toBeGreaterThanOrEqual(1); // bestRank
    });
  });

  it('shows participation history', async () => {
    renderWithProviders(<HistoryTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getAllByText('Cup 1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Cup 2').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows rewards in formatted BSD', async () => {
    renderWithProviders(<HistoryTab {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // totalRewardBsd
    });
  });
});
