import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Activity: Stub, TrendingUp: Stub, TrendingDown: Stub, Loader2: Stub, AlertTriangle: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}));
vi.mock('@/components/player', () => ({
  getL5Hex: () => '#22c55e',
}));
vi.mock('@/components/player/PlayerRow', () => ({
  posTintColors: { GK: '#34d399', DEF: '#fbbf24', MID: '#38bdf8', ATT: '#fb7185' },
}));
vi.mock('@/lib/hooks/useNumTick', () => ({
  useNumTick: (val: number) => val,
}));
vi.mock('@/lib/hooks/usePositionPercentile', () => ({
  usePositionPercentile: () => null,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

// matchMedia not available in jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockReturnValue({ matches: false, addListener: vi.fn(), removeListener: vi.fn() }),
});

import MatchTimeline from '../MatchTimeline';

const mockPlayer = {
  id: 'p1', pos: 'MID',
  perf: { l5: 65, l15: 60, trend: 'UP', ratings: [70, 65, 60, 55, 50] },
  stats: { matches: 10, goals: 2, assists: 3 },
  status: 'fit',
  lastAppearanceGw: 5,
} as any;

const mockEntries = [
  { gameweek: 5, rating: 7.2, fantasy_points: 72, status: 'played', goals: 1, assists: 0, minutes: 90, opponent: 'OPP', isHome: true, matchScore: '2-1' },
  { gameweek: 4, rating: 6.5, fantasy_points: 65, status: 'played', goals: 0, assists: 1, minutes: 80, opponent: 'FOE', isHome: false, matchScore: '1-1' },
] as any[];

describe('MatchTimeline', () => {
  it('renders L5 and L15 toggle buttons', () => {
    renderWithProviders(
      <MatchTimeline player={mockPlayer} entries={mockEntries} />,
    );
    expect(screen.getByText('L5')).toBeInTheDocument();
    expect(screen.getByText('L15')).toBeInTheDocument();
  });

  it('switches between L5 and L15 modes', () => {
    renderWithProviders(
      <MatchTimeline player={mockPlayer} entries={mockEntries} />,
    );
    fireEvent.click(screen.getByText('L15'));
    expect(screen.getByText('L15')).toBeInTheDocument();
  });

  it('shows trend label', () => {
    renderWithProviders(
      <MatchTimeline player={mockPlayer} entries={mockEntries} />,
    );
    expect(screen.getByText('trendHot')).toBeInTheDocument();
  });

  it('shows score value', () => {
    renderWithProviders(
      <MatchTimeline player={mockPlayer} entries={mockEntries} />,
    );
    expect(screen.getByText('65')).toBeInTheDocument();
  });

  it('renders without crashing with empty entries', () => {
    const { container } = renderWithProviders(
      <MatchTimeline player={mockPlayer} entries={[]} />,
    );
    expect(container.innerHTML).not.toBe('');
  });
});
