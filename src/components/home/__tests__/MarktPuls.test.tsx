import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import MarktPuls from '../MarktPuls';
import type { Player } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';

// ============================================
// Mocks
// ============================================

vi.mock('@/components/player', () => ({
  PlayerPhoto: () => <div data-testid="player-photo" />,
  PositionBadge: () => <span data-testid="position-badge" />,
}));

vi.mock('@/components/player/PlayerRow', () => ({
  posTintColors: { GK: '#10b981', DEF: '#f59e0b', MID: '#0ea5e9', ATT: '#f43f5e' },
}));

// MostWatchedStrip uses useMostWatchedPlayers internally — stub it.
// Slice 282: TopMoversStrip self-fetcht via useGlobalMovers (Barrel-Import) —
// Mock verhindert Module-Load-Cascade + liefert leeres Result (Strip gated via hasGlobalMovers).
vi.mock('@/lib/queries', () => ({
  useGlobalMovers: () => ({ data: [], isLoading: false, isError: false }),
}));

vi.mock('@/lib/queries/watchlist', () => ({
  useMostWatchedPlayers: () => ({
    data: [
      { playerId: 'p-1', firstName: 'Watch', lastName: 'One', club: 'CW', watcherCount: 5, position: 'MID' },
      { playerId: 'p-2', firstName: 'Watch', lastName: 'Two', club: 'CW', watcherCount: 4, position: 'DEF' },
    ],
  }),
}));

const messages = {
  home: {
    marketPulse: 'Markt-Puls',
    marketPulseTabs: {
      movers: 'Bewegung',
      moversShort: 'Movers',
      trending: 'Trends',
      trendingShort: 'Trends',
      watched: 'Beobachtet',
      watchedShort: 'Watched',
    },
    topMoversWeek: 'Top Mover der Woche',
    topMoversWeekEmpty: 'Keine Bewegung',
    spotlightTrending: 'Trending',
    mostWatched: 'Beobachtet',
    watcherCount: '{count} Beobachter',
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="de" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

// ============================================
// Fixtures
// ============================================

function makeTrending(overrides: Partial<TrendingPlayer> = {}): TrendingPlayer {
  return {
    playerId: 'p-1',
    firstName: 'Trend',
    lastName: 'Player',
    position: 'MID',
    club: 'Club',
    floorPrice: 1500,
    change24h: 3.2,
    tradeCount: 12,
    ...overrides,
  } as unknown as TrendingPlayer;
}

const baseProps = {
  topMovers: [],
  holdings: [],
  hasGlobalMovers: false,
  trendingWithPlayers: [] as Array<{ tp: TrendingPlayer; player: Player }>,
  watchedPlayers: [],
  uid: 'u1',
  moversLoading: false,
};

function makeTrendingPlayerRow(): Player {
  return {
    id: 'p-1',
    first: 'Test',
    last: 'Player',
    pos: 'MID',
    club: 'Club',
    imageUrl: null,
  } as unknown as Player;
}

const moversConfig = {
  topMovers: [{ playerId: 'p-1', player: 'Alice Mover', club: 'CA', change24h: 8.0 }],
  holdings: [{ playerId: 'p-1' }],
};

const trendingConfig = {
  trendingWithPlayers: [{ tp: makeTrending(), player: makeTrendingPlayerRow() }],
};

const watchedConfig = {
  watchedPlayers: [{ playerId: 'pw-1' }, { playerId: 'pw-2' }],
};

// ============================================
// Tests
// ============================================

describe('MarktPuls (Slice 269)', () => {
  // ── AC-04 8-Permutations Default-Cascade ──

  it('AC-04 #1: movers+trending+watched all true → default movers, 3 tabs', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...moversConfig} {...trendingConfig} {...watchedConfig} />);
    expect(screen.getByText('Markt-Puls')).toBeTruthy();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    const moversTab = screen.getByRole('tab', { name: /bewegung|movers/i });
    expect(moversTab.getAttribute('aria-selected')).toBe('true');
  });

  it('AC-04 #2: movers+trending true, watched false → default movers, 2 tabs', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...moversConfig} {...trendingConfig} />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /bewegung|movers/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('AC-04 #3: movers+watched true, trending false → default movers, 2 tabs', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...moversConfig} {...watchedConfig} />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /bewegung|movers/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('AC-04 #4: movers only → default movers, NO TabBar', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...moversConfig} />);
    expect(screen.getByText('Markt-Puls')).toBeTruthy();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByText('Alice Mover')).toBeTruthy();
  });

  it('AC-04 #5: trending+watched true, movers false → default trending, 2 tabs', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...trendingConfig} {...watchedConfig} />);
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: /trends/i }).getAttribute('aria-selected')).toBe('true');
  });

  it('AC-04 #6: trending only → default trending, NO TabBar', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...trendingConfig} />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    // TrendingPlayersStrip renders TrendingPlayer.lastName (no "Trending" text label).
    expect(screen.getByText('Player')).toBeTruthy();
  });

  it('AC-04 #7: watched only → default watched, NO TabBar', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...watchedConfig} />);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(screen.getByText('Markt-Puls')).toBeTruthy();
  });

  it('AC-04 #8: nothing active → return null (Section unsichtbar)', () => {
    const { container } = renderWithIntl(<MarktPuls {...baseProps} />);
    expect(container.firstChild).toBeNull();
  });

  // ── AC-02 Tab-Switch + Inactive-Panel-Conditional-Mount ──

  it('AC-02: Tab-Switch ändert active-tab + inactive panels NICHT im DOM', () => {
    renderWithIntl(<MarktPuls {...baseProps} {...moversConfig} {...trendingConfig} {...watchedConfig} />);

    // Initial: movers tab active, OwnTopMoversStrip-content visible
    expect(screen.getByText('Alice Mover')).toBeTruthy();

    // Switch to trending
    fireEvent.click(screen.getByRole('tab', { name: /trends/i }));

    // After switch: trending content visible, movers content NOT in DOM (TabPanel-conditional)
    expect(screen.queryByText('Alice Mover')).toBeNull();
    expect(screen.getByText('Player')).toBeTruthy(); // TrendingPlayer.lastName
  });

  // ── AC-01 + F-04 playersLoading-Gate ──

  it('AC-01 + F-04: movers-Tab suppressed when playersLoading=true', () => {
    renderWithIntl(
      <MarktPuls {...baseProps} {...moversConfig} {...trendingConfig} moversLoading={true} />,
    );
    // Only trending should be visible (movers gated by playersLoading)
    expect(screen.queryAllByRole('tab')).toHaveLength(0); // single-tab → no TabBar
    expect(screen.getByText('Player')).toBeTruthy(); // Trending strip rendered
  });
});
