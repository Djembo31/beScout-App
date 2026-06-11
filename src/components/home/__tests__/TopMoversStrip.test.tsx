import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import TopMoversStrip from '../TopMoversStrip';
import type { Player } from '@/types';

// Slice 282: Strip self-fetcht via useGlobalMovers (server-cached Endpoint).
// Filter (change24h≠0, !is_liquidated) + Top-5-abs-Sort sind SERVER-Semantik
// (src/app/api/players/route.ts movers-Branch) — Component rendert das Query-Result 1:1.
const mockUseGlobalMovers = vi.fn();
vi.mock('@/lib/queries', () => ({
  useGlobalMovers: (...a: unknown[]) => mockUseGlobalMovers(...a),
}));

vi.mock('lucide-react', () => ({
  TrendingUp: () => <span data-testid="trending-up" />,
  TrendingDown: () => <span data-testid="trending-down" />,
}));
vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));
vi.mock('@/components/player', () => ({
  PlayerPhoto: ({ first, last }: { first: string; last: string }) => <span>{first} {last}</span>,
}));

function makePlayer(overrides: Partial<Player> & { change24h: number }): Player {
  return {
    id: Math.random().toString(),
    first: 'Test',
    last: 'Player',
    pos: 'MID',
    club: 'Club A',
    imageUrl: null,
    isLiquidated: false,
    prices: {
      floor: 100,
      lastTrade: null,
      change24h: overrides.change24h,
    },
    ...overrides,
  } as unknown as Player;
}

function setMovers(players: Player[]) {
  mockUseGlobalMovers.mockReturnValue({ data: players, isLoading: false, isError: false });
}

describe('TopMoversStrip', () => {
  it('renders nothing when query returns empty', () => {
    setMovers([]);
    const { container } = renderWithProviders(<TopMoversStrip />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing while query has no data yet', () => {
    mockUseGlobalMovers.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    const { container } = renderWithProviders(<TopMoversStrip />);
    expect(container.innerHTML).toBe('');
  });

  it('shows player last name', () => {
    setMovers([makePlayer({ last: 'Mueller', change24h: 5.2 })]);
    renderWithProviders(<TopMoversStrip />);
    expect(screen.getByText('Mueller')).toBeInTheDocument();
  });

  it('shows positive change with +', () => {
    setMovers([makePlayer({ change24h: 3.5 })]);
    renderWithProviders(<TopMoversStrip />);
    expect(screen.getByText('+3.5%')).toBeInTheDocument();
    expect(screen.getByTestId('trending-up')).toBeInTheDocument();
  });

  it('shows negative change', () => {
    setMovers([makePlayer({ change24h: -2.1 })]);
    renderWithProviders(<TopMoversStrip />);
    expect(screen.getByText('-2.1%')).toBeInTheDocument();
    expect(screen.getByTestId('trending-down')).toBeInTheDocument();
  });

  it('requests limit=5 from the movers query', () => {
    setMovers([]);
    renderWithProviders(<TopMoversStrip />);
    expect(mockUseGlobalMovers).toHaveBeenCalledWith(5);
  });

  it('renders all returned movers (server already caps at limit)', () => {
    setMovers(
      Array.from({ length: 5 }, (_, i) =>
        makePlayer({ id: `p${i}`, last: `P${i}`, change24h: (i + 1) * 2 }),
      ),
    );
    renderWithProviders(<TopMoversStrip />);
    expect(screen.getAllByRole('link').length).toBe(5);
  });
});
