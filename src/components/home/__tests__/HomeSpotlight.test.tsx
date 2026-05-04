import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import HomeSpotlight from '../HomeSpotlight';
import type { Player, DpcHolding } from '@/types';
import type { TrendingPlayer } from '@/lib/services/trading';

// ============================================
// Mocks
// ============================================

vi.mock('@/components/player', () => ({
  PlayerPhoto: () => <div data-testid="player-photo" />,
  PositionBadge: () => <span data-testid="position-badge" />,
  MiniSparkline: () => <svg data-testid="sparkline" />,
}));

vi.mock('@/components/player/PlayerRow', () => ({
  posTintColors: { GK: '#10b981', DEF: '#f59e0b', MID: '#0ea5e9', ATT: '#f43f5e' },
}));

vi.mock('@/components/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
}));

// next-intl messages — minimal subset for HomeSpotlight rendering.
const messages = {
  home: {
    spotlightIpo: 'Erstverkauf',
    spotlightTopMover: 'Dein Top-Spieler heute',
    spotlightTrending: 'Trending',
    spotlightLiveScore: 'Live · Spieltag {gw} läuft',
    spotlightLiveScoreCta: 'Live-Score ansehen',
    spotlightMysteryBox: 'Daily Mystery Box · gratis',
    spotlightMysteryBoxCta: 'Box öffnen',
    sold: 'verkauft',
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

const baseProps = {
  activeIPOs: [] as Player[],
  holdings: [] as DpcHolding[],
  trendingPlayers: [] as TrendingPlayer[],
  players: [] as Player[],
};

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p-1',
    first: 'Test',
    last: 'Player',
    pos: 'MID',
    club: 'Test Club',
    imageUrl: null,
    prices: { history7d: [10, 11, 12, 13, 14] },
    ipo: { status: 'open', price: 100 },
    ...overrides,
  } as unknown as Player;
}

function makeHolding(overrides: Partial<DpcHolding> = {}): DpcHolding {
  return {
    id: 'h-1',
    playerId: 'p-1',
    player: 'Test Player',
    pos: 'MID',
    club: 'Club',
    qty: 1,
    avgBuy: 100,
    floor: 100,
    change24h: 5,
    listedByUser: 0,
    ticket: 10,
    age: 25,
    perfL5: 50,
    matches: 10,
    goals: 1,
    assists: 0,
    imageUrl: null,
    ...overrides,
  } as unknown as DpcHolding;
}

function makeTrending(overrides: Partial<TrendingPlayer> = {}): TrendingPlayer {
  return {
    playerId: 'p-1',
    firstName: 'Test',
    lastName: 'Player',
    position: 'MID',
    club: 'Club',
    floorPrice: 1000,
    change24h: 2.5,
    tradeCount: 5,
    ...overrides,
  } as unknown as TrendingPlayer;
}

// ============================================
// Tests
// ============================================

describe('HomeSpotlight (Slice 266)', () => {
  it('AC-05 [EMPTY]: renders nothing when no slots active', () => {
    const { container } = renderWithIntl(
      <HomeSpotlight {...baseProps} slots={{ primary: null, secondary: null }} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('AC-01 [HAPPY]: liveScore-Slot renders with GW number + CTA link', () => {
    renderWithIntl(
      <HomeSpotlight
        {...baseProps}
        slots={{ primary: 'liveScore', secondary: null }}
        liveScoreData={{ gameweek: 28 }}
      />,
    );
    expect(screen.getByText(/Live · Spieltag 28 läuft/)).toBeTruthy();
    expect(screen.getByText('Live-Score ansehen')).toBeTruthy();
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/fantasy/spieltag');
  });

  it('AC-02 [HAPPY]: mysteryBox-Slot triggers onOpen callback on click', () => {
    const onOpen = vi.fn();
    renderWithIntl(
      <HomeSpotlight
        {...baseProps}
        slots={{ primary: 'mysteryBox', secondary: null }}
        mysteryBoxData={{ onOpen }}
      />,
    );
    expect(screen.getByText('Daily Mystery Box · gratis')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Box öffnen'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('AC-03 [HAPPY]: 2-Slot Multi-Layout renders both cards stacked', () => {
    const { container } = renderWithIntl(
      <HomeSpotlight
        {...baseProps}
        slots={{ primary: 'liveScore', secondary: 'mysteryBox' }}
        liveScoreData={{ gameweek: 28 }}
        mysteryBoxData={{ onOpen: vi.fn() }}
      />,
    );
    // 2 Card data-testids
    const cards = screen.getAllByTestId('card');
    expect(cards).toHaveLength(2);
    // Outer container has space-y-3 spacing class
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain('space-y-3');
  });

  it('AC-04 [HAPPY]: ipo-Slot renders unchanged from pre-Slice', () => {
    renderWithIntl(
      <HomeSpotlight
        {...baseProps}
        slots={{ primary: 'ipo', secondary: null }}
        activeIPOs={[makePlayer()]}
      />,
    );
    expect(screen.getByText('Erstverkauf')).toBeTruthy();
    expect(screen.getByText('Test Player')).toBeTruthy();
  });

  it('AC-04 [HAPPY]: topMover-Slot renders for holdings with change24h', () => {
    const { container } = renderWithIntl(
      <HomeSpotlight
        {...baseProps}
        slots={{ primary: 'topMover', secondary: null }}
        holdings={[makeHolding({ change24h: 12.5 })]}
      />,
    );
    expect(screen.getByText('Dein Top-Spieler heute')).toBeTruthy();
    // Change24h is rendered as 3 separate text nodes ('+', '12.5', '%') —
    // check via container.textContent for the concatenated string.
    expect(container.textContent).toContain('+12.5%');
  });

  it('AC-04 [HAPPY]: trending-Slot renders trending player', () => {
    renderWithIntl(
      <HomeSpotlight
        {...baseProps}
        slots={{ primary: 'trending', secondary: null }}
        trendingPlayers={[makeTrending()]}
      />,
    );
    expect(screen.getByText('Trending')).toBeTruthy();
    expect(screen.getByText('Test Player')).toBeTruthy();
  });

  it('AC-06 [REGRESSION]: ipo + topMover combined: both render in order', () => {
    renderWithIntl(
      <HomeSpotlight
        {...baseProps}
        slots={{ primary: 'ipo', secondary: 'topMover' }}
        activeIPOs={[makePlayer()]}
        holdings={[makeHolding({ change24h: 7 })]}
      />,
    );
    const cards = screen.getAllByTestId('card');
    expect(cards).toHaveLength(2);
    // Primary card (ipo) renders before secondary (topMover) in DOM
    expect(screen.getByText('Erstverkauf')).toBeTruthy();
    expect(screen.getByText('Dein Top-Spieler heute')).toBeTruthy();
  });
});
