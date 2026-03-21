import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Trophy: Stub, Shield: Stub, Play: Stub, CheckCircle2: Stub, Heart: Stub, Gift: Stub, Coins: Stub, Activity: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  Chip: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
vi.mock('../helpers', () => ({
  formatCountdown: () => '2h',
  getFormResult: () => ({ bg: '', text: '', icon: '🔵' }),
  getScoreColor: () => 'text-green-500',
  getPosAccentColor: () => '#38bdf8',
}));
vi.mock('@/lib/queries', () => ({
  useSponsor: () => ({ data: null }),
}));

import { DashboardTab } from '../DashboardTab';

const defaultProps = {
  seasonPoints: 450,
  bestRank: 2,
  eventsPlayed: 8,
  totalRewardBsd: 250,
  pastParticipations: [
    { eventId: 'e1', eventName: 'Event 1', gameweek: 10, rank: 2, totalParticipants: 20, points: 90, rewardCents: 5000 },
  ],
  scoredLineups: [],
  activeEvents: [],
  registeredEvents: [],
  interestedEvents: [],
  onViewEvent: vi.fn(),
};

describe('DashboardTab', () => {
  it('shows total reward in BSD', () => {
    renderWithProviders(<DashboardTab {...defaultProps} />);
    expect(screen.getByText('250')).toBeInTheDocument();
  });

  it('shows season points', () => {
    renderWithProviders(<DashboardTab {...defaultProps} />);
    expect(screen.getByText('450')).toBeInTheDocument();
  });

  it('shows events played count', () => {
    renderWithProviders(<DashboardTab {...defaultProps} />);
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('shows best rank', () => {
    renderWithProviders(<DashboardTab {...defaultProps} />);
    expect(screen.getAllByText('#2').length).toBeGreaterThanOrEqual(1);
  });

  it('renders without crashing with empty data', () => {
    renderWithProviders(
      <DashboardTab
        {...defaultProps}
        pastParticipations={[]}
        scoredLineups={[]}
        activeEvents={[]}
        registeredEvents={[]}
        interestedEvents={[]}
        seasonPoints={0}
        bestRank={null}
        eventsPlayed={0}
        totalRewardBsd={0}
      />,
    );
    // Should not crash
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });
});
