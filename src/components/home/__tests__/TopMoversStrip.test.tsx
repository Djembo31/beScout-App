import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import TopMoversStrip from '../TopMoversStrip';
import type { Player } from '@/types';

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
      referencePrice: 100,
      lastTrade: null,
      change24h: overrides.change24h,
    },
    ...overrides,
  } as unknown as Player;
}

describe('TopMoversStrip', () => {
  it('renders nothing when no movers', () => {
    const { container } = renderWithProviders(
      <TopMoversStrip players={[makePlayer({ change24h: 0 })]} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when empty array', () => {
    const { container } = renderWithProviders(<TopMoversStrip players={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows player last name', () => {
    renderWithProviders(
      <TopMoversStrip players={[makePlayer({ last: 'Mueller', change24h: 5.2 })]} />,
    );
    expect(screen.getByText('Mueller')).toBeInTheDocument();
  });

  it('shows positive change with +', () => {
    renderWithProviders(
      <TopMoversStrip players={[makePlayer({ change24h: 3.5 })]} />,
    );
    expect(screen.getByText('+3.5%')).toBeInTheDocument();
    expect(screen.getByTestId('trending-up')).toBeInTheDocument();
  });

  it('shows negative change', () => {
    renderWithProviders(
      <TopMoversStrip players={[makePlayer({ change24h: -2.1 })]} />,
    );
    expect(screen.getByText('-2.1%')).toBeInTheDocument();
    expect(screen.getByTestId('trending-down')).toBeInTheDocument();
  });

  it('limits to top 5 movers', () => {
    const players = Array.from({ length: 10 }, (_, i) =>
      makePlayer({ id: `p${i}`, last: `P${i}`, change24h: (i + 1) * 2 }),
    );
    renderWithProviders(<TopMoversStrip players={players} />);
    const links = screen.getAllByRole('link');
    expect(links.length).toBe(5);
  });

  it('excludes liquidated players', () => {
    renderWithProviders(
      <TopMoversStrip players={[
        makePlayer({ last: 'Active', change24h: 10, isLiquidated: false } as any),
        makePlayer({ last: 'Gone', change24h: 20, isLiquidated: true } as any),
      ]} />,
    );
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.queryByText('Gone')).not.toBeInTheDocument();
  });
});
