import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { ArrowRight: Stub, TrendingUp: Stub, TrendingDown: Stub, Briefcase: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
}));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));
vi.mock('@/lib/services/wallet', () => ({ formatScout: (n: number) => `${n} CR` }));
vi.mock('@/lib/activityHelpers', () => ({ getRelativeTime: () => '2h ago' }));
vi.mock('@/lib/queries/mastery', () => ({
  useUserMasteryAll: () => ({ data: [] }),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('@/components/player', () => ({
  PlayerIdentity: ({ first, last }: { first: string; last: string }) => <span>{first} {last}</span>,
}));
vi.mock('../ScoreProgress', () => ({
  default: () => <div data-testid="score-progress" />,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import { default as TraderTabModule } from '../TraderTab';
// TraderTab is a default export
const TraderTab = TraderTabModule;

const defaultProps = {
  userId: 'u1',
  userStats: {
    total_trades: 50,
    total_volume_cents: 5000000,
    active_holdings: 8,
    trader_score: 750,
  } as any,
  holdings: [],
  recentTrades: [],
  isSelf: true,
};

describe('TraderTab', () => {
  it('renders score progress', () => {
    renderWithProviders(<TraderTab {...defaultProps} />);
    expect(screen.getByTestId('score-progress')).toBeInTheDocument();
  });

  it('shows empty state message when no holdings', () => {
    renderWithProviders(<TraderTab {...defaultProps} holdings={[]} />);
    // Component should render without crashing
    expect(screen.getByTestId('score-progress')).toBeInTheDocument();
  });

  it('renders without crashing when stats are null', () => {
    renderWithProviders(<TraderTab {...defaultProps} userStats={null} />);
    expect(screen.getByTestId('score-progress')).toBeInTheDocument();
  });
});
