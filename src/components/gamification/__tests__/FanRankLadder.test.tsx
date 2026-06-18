import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';

vi.mock('lucide-react', () => {
  const Stub = () => <span data-testid="icon" />;
  return {
    ListOrdered: Stub,
    Users: Stub,
    Star: Stub,
    Flame: Stub,
    Crown: Stub,
    Award: Stub,
    Shield: Stub,
  };
});
vi.mock('@/lib/utils', () => ({
  cn: (...c: (string | boolean | undefined | null)[]) => c.filter(Boolean).join(' '),
}));

import FanRankLadder from '../FanRankLadder';
import { FAN_RANK_PERKS } from '@/lib/fanRankPerks';

const ALL_TIER_LABELS = [
  'fanRankZuschauer',
  'fanRankStammgast',
  'fanRankUltra',
  'fanRankLegende',
  'fanRankEhrenmitglied',
  'fanRankVereinsikone',
];

describe('FanRankPerks catalog', () => {
  // AC-03: Mirror-Regression gegen cast_community_poll_vote (Slice 343).
  // Schlägt rot wenn jemand den Katalog ändert ohne den RPC zu syncen.
  it('mirrors the Slice 343 poll-weight mapping exactly', () => {
    expect(FAN_RANK_PERKS.zuschauer.pollWeight).toBe(1);
    expect(FAN_RANK_PERKS.stammgast.pollWeight).toBe(1);
    expect(FAN_RANK_PERKS.ultra.pollWeight).toBe(2);
    expect(FAN_RANK_PERKS.legende.pollWeight).toBe(2);
    expect(FAN_RANK_PERKS.ehrenmitglied.pollWeight).toBe(3);
    expect(FAN_RANK_PERKS.vereinsikone.pollWeight).toBe(3);
  });
});

describe('FanRankLadder', () => {
  it('renders all 6 tier rows', () => {
    renderWithProviders(<FanRankLadder currentTier="ultra" currentScore={30} />);
    for (const label of ALL_TIER_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('marks exactly the current tier (AC-01)', () => {
    renderWithProviders(<FanRankLadder currentTier="ultra" currentScore={30} />);
    expect(screen.getAllByText('fanRankCurrent')).toHaveLength(1);
  });

  it('renders the full ladder even without a rank (AC-02 empty state)', () => {
    renderWithProviders(<FanRankLadder currentTier={null} currentScore={0} />);
    for (const label of ALL_TIER_LABELS) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    // null → zuschauer is treated as current
    expect(screen.getAllByText('fanRankCurrent')).toHaveLength(1);
  });

  it('shows next-tier progress when not at the top (AC-06)', () => {
    renderWithProviders(<FanRankLadder currentTier="ultra" currentScore={30} />);
    expect(screen.getByText('fanRankNextTier')).toBeInTheDocument();
    expect(screen.queryByText('fanRankTopTier')).not.toBeInTheDocument();
  });

  it('shows top-tier label at Vereinsikone (AC-06 edge: maxScore=null)', () => {
    renderWithProviders(<FanRankLadder currentTier="vereinsikone" currentScore={120} />);
    expect(screen.getByText('fanRankTopTier')).toBeInTheDocument();
    expect(screen.queryByText('fanRankNextTier')).not.toBeInTheDocument();
  });
});
