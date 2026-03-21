import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="prediction-stats" />,
}));
vi.mock('lucide-react', () => {
  const Stub = () => null;
  return {
    CheckCircle: Stub, XCircle: Stub, Clock: Stub, Shield: Stub, Star: Stub,
    Lock: Stub, FileText: Stub, Target: Stub, Vote: Stub, Coins: Stub,
    Search: Stub, TrendingUp: Stub, Trophy: Stub, Award: Stub, Users: Stub, Zap: Stub,
  };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/lib/services/wallet', () => ({ formatScout: (n: number) => `${n} CR` }));
vi.mock('@/lib/expertBadges', () => ({
  getExpertBadges: () => [],
}));
vi.mock('@/components/profile/ScoreProgress', () => ({
  default: () => <div data-testid="score-progress" />,
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import AnalystTab from '../AnalystTab';

const defaultProps = {
  userId: 'u1',
  userStats: {
    analyst_score: 680,
    total_research: 12,
  } as any,
  trackRecord: {
    accuracy_pct: 65,
    total_calls: 20,
    resolved_calls: 15,
    correct_calls: 10,
    avg_rating: 4.2,
    total_ratings: 50,
  } as any,
  myResearch: [],
  isSelf: true,
};

describe('AnalystTab', () => {
  it('renders score progress', () => {
    renderWithProviders(<AnalystTab {...defaultProps} />);
    expect(screen.getByTestId('score-progress')).toBeInTheDocument();
  });

  it('renders without crashing when stats are null', () => {
    renderWithProviders(<AnalystTab {...defaultProps} userStats={null} trackRecord={null} />);
    expect(screen.getByTestId('score-progress')).toBeInTheDocument();
  });

  it('renders content when track record exists', () => {
    const { container } = renderWithProviders(<AnalystTab {...defaultProps} />);
    expect(container.innerHTML.length).toBeGreaterThan(100);
  });
});
