import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import TrendingPlayersStrip from '../TrendingPlayersStrip';
import type { Player } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';

vi.mock('@/components/player', () => ({
  PlayerPhoto: () => <div data-testid="player-photo" />,
  PositionBadge: () => <span data-testid="position-badge" />,
}));

vi.mock('@/components/player/PlayerRow', () => ({
  posTintColors: { GK: '#10b981', DEF: '#f59e0b', MID: '#0ea5e9', ATT: '#f43f5e' },
}));

const messages = {
  home: {
    spotlightTrending: 'Trending',
    tradeCount: '{count, plural, one {# Trade} other {# Trades}}',
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

function makeTrending(overrides: Partial<TrendingPlayer> = {}): TrendingPlayer {
  return {
    playerId: 'p-1',
    firstName: 'Test',
    lastName: 'Player',
    position: 'MID',
    club: 'Club',
    floorPrice: 1500,
    change24h: 3.2,
    tradeCount: 12,
    ...overrides,
  } as unknown as TrendingPlayer;
}

function makePlayer(id: string): Player {
  return {
    id,
    first: 'Test',
    last: 'Player',
    pos: 'MID',
    club: 'Club',
    imageUrl: null,
  } as unknown as Player;
}

describe('TrendingPlayersStrip (Slice 269)', () => {
  it('returns null when trendingWithPlayers empty', () => {
    const { container } = renderWithIntl(
      <TrendingPlayersStrip trendingWithPlayers={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders trending players with trade-count', () => {
    renderWithIntl(
      <TrendingPlayersStrip
        trendingWithPlayers={[{ tp: makeTrending({ tradeCount: 17 }), player: makePlayer('p-1') }]}
      />,
    );
    expect(screen.getByText('Player')).toBeTruthy();
    expect(screen.getByText(/17×/)).toBeTruthy();
  });

  // Slice 282: unresolved Player wird bereits upstream (useHomeData-Join) gefiltert —
  // Items kommen vorgejoint an, der frühere /market-Fallback-Pfad existiert nicht mehr.
  it('links resolved player to player detail', () => {
    renderWithIntl(
      <TrendingPlayersStrip
        trendingWithPlayers={[{ tp: makeTrending(), player: makePlayer('p-1') }]}
      />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/player/p-1');
  });
});
