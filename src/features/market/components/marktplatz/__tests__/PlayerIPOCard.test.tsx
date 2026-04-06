import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => null;
  return { Loader2: Stub, Target: Stub, TrendingUp: Stub, TrendingDown: Stub, Minus: Stub, FileText: Stub, Activity: Stub, Lock: Stub, Clock: Stub, AlertTriangle: Stub, CheckCircle2: Stub, Zap: Stub };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
  fmtScout: (n: number) => String(n),
  countryToFlag: () => '🇩🇪',
}));
vi.mock('@/lib/services/players', () => ({ centsToBsd: (n: number) => n / 100 }));
vi.mock('@/components/player', () => ({
  PlayerPhoto: () => null,
  PositionBadge: () => null,
  FormBars: () => null,
}));
vi.mock('@/components/player/positionColors', () => ({
  posCardFrame: { GK: '#000', DEF: '#000', MID: '#000', ATT: '#000' },
}));
vi.mock('@/components/player/PlayerRow', () => ({
  getContractInfo: () => ({ dateStr: 'Jun 2027', monthsLeft: 18, color: '', urgent: false }),
  posTintColors: { GK: '#000', DEF: '#000', MID: '#000', ATT: '#000' },
}));
vi.mock('../CountdownBadge', () => ({ default: () => null }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/lib/supabaseClient', () => ({
  supabase: { from: () => ({ select: () => ({ data: [], error: null }) }) },
}));

import PlayerIPOCard from '../PlayerIPOCard';

const mockPlayer = {
  id: 'p1', first: 'Test', last: 'Player', pos: 'MID',
  imageUrl: null, country: 'DE', contractMonthsLeft: 18,
  perf: { l5: 65, l15: 60, trend: 'UP', ratings: [70, 65, 60] },
  prices: { floor: 100 },
  dpc: { circulation: 300 },
  stats: { goals: 5, assists: 3, matches: 20 },
  status: 'fit',
} as any;

const mockIpo = {
  id: 'ipo1', price: 5000, total_offered: 100, sold: 30,
  status: 'open', end_time: new Date(Date.now() + 86400000).toISOString(),
} as any;

describe('PlayerIPOCard', () => {
  it('renders player link', () => {
    renderWithProviders(<PlayerIPOCard player={mockPlayer} ipo={mockIpo} buying={false} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/player/p1');
  });

  it('shows player last name', () => {
    renderWithProviders(<PlayerIPOCard player={mockPlayer} ipo={mockIpo} buying={false} />);
    expect(screen.getAllByText(/Player/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows IPO price', () => {
    renderWithProviders(<PlayerIPOCard player={mockPlayer} ipo={mockIpo} buying={false} />);
    // centsToBsd(5000) = 50
    expect(screen.getAllByText(/50/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders without crashing', () => {
    const { container } = renderWithProviders(<PlayerIPOCard player={mockPlayer} ipo={mockIpo} buying={false} />);
    expect(container.innerHTML).not.toBe('');
  });
});
