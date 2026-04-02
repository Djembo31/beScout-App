import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import SquadSummaryStats from '../SquadSummaryStats';
import type { Player } from '@/types';

vi.mock('@/lib/utils', () => ({
  fmtScout: (n: number) => String(n),
}));

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: Math.random().toString(),
    pos: 'MID',
    perf: { l5: 60, l15: 55, trend: 0, ratings: [] },
    prices: { floor: 100, referencePrice: 100, initialListingPrice: 80 },
    stats: { goals: 0, assists: 0, matches: 10 },
    listings: [],
    ...overrides,
  } as unknown as Player;
}

describe('SquadSummaryStats', () => {
  it('shows squad value', () => {
    const players = [makePlayer({ prices: { floor: 200 } } as any)];
    renderWithProviders(
      <SquadSummaryStats players={players} ownedPlayers={players} assignedCount={1} totalSlots={7} />,
    );
    expect(screen.getByText(/200.*CR/)).toBeInTheDocument();
  });

  it('shows lineup fraction', () => {
    renderWithProviders(
      <SquadSummaryStats players={[]} ownedPlayers={[]} assignedCount={3} totalSlots={7} />,
    );
    expect(screen.getByText('3/7')).toBeInTheDocument();
  });

  it('shows position counts', () => {
    const owned = [
      makePlayer({ pos: 'GK' } as any),
      makePlayer({ pos: 'DEF' } as any),
      makePlayer({ pos: 'DEF' } as any),
      makePlayer({ pos: 'MID' } as any),
    ];
    renderWithProviders(
      <SquadSummaryStats players={[]} ownedPlayers={owned} assignedCount={0} totalSlots={7} />,
    );
    expect(screen.getByText('1 GK')).toBeInTheDocument();
    expect(screen.getByText('2 DEF')).toBeInTheDocument();
    expect(screen.getByText('1 MID')).toBeInTheDocument();
    expect(screen.getByText('0 ATT')).toBeInTheDocument();
  });

  it('shows avg performance when players exist', () => {
    const owned = [
      makePlayer({ perf: { l5: 70 } } as any),
      makePlayer({ perf: { l5: 50 } } as any),
    ];
    renderWithProviders(
      <SquadSummaryStats players={[]} ownedPlayers={owned} assignedCount={0} totalSlots={7} />,
    );
    expect(screen.getByText('60')).toBeInTheDocument(); // avg
  });

  it('shows portfolio change percentage', () => {
    const owned = [
      makePlayer({ prices: { floor: 120, referencePrice: 120, initialListingPrice: 100 } } as any),
    ];
    renderWithProviders(
      <SquadSummaryStats players={[]} ownedPlayers={owned} assignedCount={0} totalSlots={7} />,
    );
    expect(screen.getByText('+20.0%')).toBeInTheDocument();
  });

  it('does not show performance when no players', () => {
    renderWithProviders(
      <SquadSummaryStats players={[]} ownedPlayers={[]} assignedCount={0} totalSlots={7} />,
    );
    expect(screen.queryByText('summaryPerf')).not.toBeInTheDocument();
  });
});
