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
// Slice 347: stub the service so the ladder's DEFAULT_FAN_RANK_THRESHOLDS import
// does not pull in supabaseClient into the unit test.
vi.mock('@/lib/services/fanRanking', () => ({
  DEFAULT_FAN_RANK_THRESHOLDS: {
    stammgast: 10, ultra: 25, legende: 40, ehrenmitglied: 55, vereinsikone: 70,
  },
}));

import FanRankLadder from '../FanRankLadder';
import { FAN_RANK_PERKS } from '@/lib/fanRankPerks';
import type { ClubFanRankThresholds } from '@/types';

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

describe('FanRankLadder — Slice 347 dynamic thresholds', () => {
  it('renders default range labels when no thresholds prop is passed', () => {
    renderWithProviders(<FanRankLadder currentTier="ultra" currentScore={30} />);
    // Default platform thresholds: stammgast=10, ultra=25, legende=40, ...
    expect(screen.getByText('0–9')).toBeInTheDocument();      // zuschauer 0..stammgast-1
    expect(screen.getByText('10–24')).toBeInTheDocument();    // stammgast..ultra-1
    expect(screen.getByText('70+')).toBeInTheDocument();      // vereinsikone..∞
  });

  it('derives range labels from a club-specific thresholds prop', () => {
    const custom: ClubFanRankThresholds = {
      stammgast: 5, ultra: 12, legende: 20, ehrenmitglied: 30, vereinsikone: 45,
    };
    renderWithProviders(
      <FanRankLadder currentTier="legende" currentScore={20} thresholds={custom} />,
    );
    expect(screen.getByText('0–4')).toBeInTheDocument();      // zuschauer 0..4
    expect(screen.getByText('5–11')).toBeInTheDocument();     // stammgast 5..11
    expect(screen.getByText('12–19')).toBeInTheDocument();    // ultra 12..19
    expect(screen.getByText('20–29')).toBeInTheDocument();    // legende 20..29
    expect(screen.getByText('30–44')).toBeInTheDocument();    // ehrenmitglied 30..44
    expect(screen.getByText('45+')).toBeInTheDocument();      // vereinsikone 45..∞
    // Default labels must NOT appear when custom thresholds are active.
    expect(screen.queryByText('10–24')).not.toBeInTheDocument();
    expect(screen.queryByText('70+')).not.toBeInTheDocument();
  });
});
