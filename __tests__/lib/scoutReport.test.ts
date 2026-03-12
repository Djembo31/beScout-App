import { describe, expect, it } from 'vitest';
import {
  getStrongestDimension,
  getDimensionTabOrder,
  getStrengthLabel,
  getAutoBadges,
  type BadgeInput,
  type ScoutReportScores,
} from '@/lib/scoutReport';

// ============================================
// getStrongestDimension
// ============================================
describe('getStrongestDimension', () => {
  it('returns manager when manager_score is highest', () => {
    expect(
      getStrongestDimension({ manager_score: 800, trading_score: 600, scout_score: 500 }),
    ).toBe('manager');
  });

  it('returns trader when trading_score is highest', () => {
    expect(
      getStrongestDimension({ manager_score: 400, trading_score: 900, scout_score: 500 }),
    ).toBe('trader');
  });

  it('returns analyst when scout_score is highest', () => {
    expect(
      getStrongestDimension({ manager_score: 300, trading_score: 400, scout_score: 950 }),
    ).toBe('analyst');
  });

  it('ties: manager wins over trader and analyst', () => {
    expect(
      getStrongestDimension({ manager_score: 700, trading_score: 700, scout_score: 700 }),
    ).toBe('manager');
  });

  it('ties: manager wins over trader when both tied above analyst', () => {
    expect(
      getStrongestDimension({ manager_score: 700, trading_score: 700, scout_score: 400 }),
    ).toBe('manager');
  });

  it('ties: trader wins over analyst when both tied above manager', () => {
    expect(
      getStrongestDimension({ manager_score: 300, trading_score: 700, scout_score: 700 }),
    ).toBe('trader');
  });
});

// ============================================
// getDimensionTabOrder
// ============================================
describe('getDimensionTabOrder', () => {
  it('returns dimensions sorted by score descending', () => {
    expect(
      getDimensionTabOrder({ manager_score: 300, trading_score: 900, scout_score: 600 }),
    ).toEqual(['trader', 'analyst', 'manager']);
  });

  it('tie order follows manager > trader > analyst', () => {
    expect(
      getDimensionTabOrder({ manager_score: 500, trading_score: 500, scout_score: 500 }),
    ).toEqual(['manager', 'trader', 'analyst']);
  });

  it('partial tie: highest first, then tie-break for rest', () => {
    expect(
      getDimensionTabOrder({ manager_score: 400, trading_score: 800, scout_score: 400 }),
    ).toEqual(['trader', 'manager', 'analyst']);
  });
});

// ============================================
// getStrengthLabel
// ============================================
describe('getStrengthLabel', () => {
  it('returns strengthAufsteiger when all scores are low (<400)', () => {
    expect(
      getStrengthLabel({ manager_score: 200, trading_score: 300, scout_score: 350 }),
    ).toBe('strengthAufsteiger');
  });

  it('returns strengthAllrounder when variance is <15%', () => {
    // 700, 680, 660 → (700-660)/700 = 5.7% < 15%
    expect(
      getStrengthLabel({ manager_score: 700, trading_score: 680, scout_score: 660 }),
    ).toBe('strengthAllrounder');
  });

  it('returns strengthTaktischerInvestor when manager+trader are close and above analyst', () => {
    // m=800, t=780 → diff/max = 2.5% < 10%. Both above s=400
    expect(
      getStrengthLabel({ manager_score: 800, trading_score: 780, scout_score: 400 }),
    ).toBe('strengthTaktischerInvestor');
  });

  it('returns strengthFantasyStratege when manager is dominant', () => {
    // m=900, t=600, s=500 → (900-600)/600 = 50% > 30%
    expect(
      getStrengthLabel({ manager_score: 900, trading_score: 600, scout_score: 500 }),
    ).toBe('strengthFantasyStratege');
  });

  it('returns strengthMarktkenner when trader is dominant', () => {
    // t=900, m=600, s=500 → (900-600)/600 = 50% > 30%
    expect(
      getStrengthLabel({ manager_score: 600, trading_score: 900, scout_score: 500 }),
    ).toBe('strengthMarktkenner');
  });

  it('returns strengthTreffsichererAnalyst when analyst is dominant', () => {
    // s=900, m=600, t=500 → (900-600)/600 = 50% > 30%
    expect(
      getStrengthLabel({ manager_score: 600, trading_score: 500, scout_score: 900 }),
    ).toBe('strengthTreffsichererAnalyst');
  });

  it('edge: all zero returns strengthAufsteiger', () => {
    expect(
      getStrengthLabel({ manager_score: 0, trading_score: 0, scout_score: 0 }),
    ).toBe('strengthAufsteiger');
  });

  it('edge: balanced at exactly 15% boundary is not allrounder', () => {
    // max=1000, min=850 → (1000-850)/1000 = 15% — NOT < 15%
    expect(
      getStrengthLabel({ manager_score: 1000, trading_score: 900, scout_score: 850 }),
    ).not.toBe('strengthAllrounder');
  });

  it('fallback: manager highest but not >30% dominant returns strengthFantasyStratege', () => {
    // m=700, t=600, s=400 → (700-600)/600 = 16.7% < 30%
    // Not balanced: (700-400)/700 = 42.8% > 15%
    // Not TaktischerInvestor: t and m diff = (700-600)/700 = 14.3% > 10%
    expect(
      getStrengthLabel({ manager_score: 700, trading_score: 600, scout_score: 400 }),
    ).toBe('strengthFantasyStratege');
  });
});

// ============================================
// getAutoBadges
// ============================================
describe('getAutoBadges', () => {
  const baseBadgeInput: BadgeInput = { isSelf: true };

  it('returns empty array when no conditions met', () => {
    expect(getAutoBadges({ isSelf: true })).toEqual([]);
  });

  it('returns hitRate badge when totalCalls >= 5 and hitRate >= 60', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      trackRecord: { hitRate: 72, totalCalls: 10 },
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({
      type: 'hitRate',
      labelKey: 'badgeHitRate',
      params: { rate: 72 },
    });
  });

  it('does not return hitRate badge when totalCalls < 5', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      trackRecord: { hitRate: 80, totalCalls: 4 },
    });
    expect(badges).toHaveLength(0);
  });

  it('does not return hitRate badge when hitRate < 60', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      trackRecord: { hitRate: 59, totalCalls: 10 },
    });
    expect(badges).toHaveLength(0);
  });

  it('returns topManager badge when rank pct <= 10', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      avgFantasyRank: 5,
      totalFantasyParticipants: 100,
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({
      type: 'topManager',
      labelKey: 'badgeTopManager',
      params: { pct: 5 },
    });
  });

  it('does not return topManager when pct > 10', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      avgFantasyRank: 20,
      totalFantasyParticipants: 100,
    });
    expect(badges).toHaveLength(0);
  });

  it('returns streak badge when currentStreak >= 30', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      currentStreak: 45,
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({
      type: 'streak',
      labelKey: 'badgeStreak',
      params: { days: 45 },
    });
  });

  it('returns clubAbo badge when subscription present', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      clubSubscription: { tier: 'gold', clubName: 'Sakaryaspor' },
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({
      type: 'clubAbo',
      labelKey: 'badgeClubAbo',
      params: { tier: 'gold', club: 'Sakaryaspor' },
    });
  });

  it('returns foundingPass badge when tier present', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      foundingPassTier: 'gold',
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({
      type: 'foundingPass',
      labelKey: 'badgeFoundingPass',
      params: { tier: 'gold' },
    });
  });

  it('returns portfolioPnl badge when isSelf and pnlPct > 20', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      isSelf: true,
      portfolioPnlPct: 35,
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({
      type: 'portfolioPnl',
      labelKey: 'badgePortfolioPnl',
      params: { pct: 35 },
    });
  });

  it('EXCLUDES portfolioPnl badge for public profiles (isSelf=false)', () => {
    const badges = getAutoBadges({
      isSelf: false,
      portfolioPnlPct: 50,
    });
    expect(badges).toHaveLength(0);
  });

  it('returns followers badge when count >= 100', () => {
    const badges = getAutoBadges({
      ...baseBadgeInput,
      followersCount: 150,
    });
    expect(badges).toHaveLength(1);
    expect(badges[0]).toEqual({
      type: 'followers',
      labelKey: 'badgeFollowers',
      params: { count: 150 },
    });
  });

  it('returns max 3 badges even when more qualify', () => {
    const badges = getAutoBadges({
      isSelf: true,
      trackRecord: { hitRate: 80, totalCalls: 20 },
      avgFantasyRank: 3,
      totalFantasyParticipants: 100,
      currentStreak: 60,
      clubSubscription: { tier: 'gold', clubName: 'Sakaryaspor' },
      foundingPassTier: 'silber',
      portfolioPnlPct: 50,
      followersCount: 500,
    });
    expect(badges).toHaveLength(3);
  });

  it('respects priority order — highest priority badges come first', () => {
    const badges = getAutoBadges({
      isSelf: true,
      trackRecord: { hitRate: 80, totalCalls: 20 },
      avgFantasyRank: 3,
      totalFantasyParticipants: 100,
      currentStreak: 60,
      clubSubscription: { tier: 'gold', clubName: 'Sakaryaspor' },
    });
    expect(badges).toHaveLength(3);
    expect(badges[0].type).toBe('hitRate');
    expect(badges[1].type).toBe('topManager');
    expect(badges[2].type).toBe('streak');
  });

  it('skips unqualified badges and includes next qualifying ones', () => {
    // hitRate fails (totalCalls < 5), topManager qualifies, streak fails,
    // clubAbo qualifies, foundingPass qualifies
    const badges = getAutoBadges({
      isSelf: true,
      trackRecord: { hitRate: 80, totalCalls: 3 },
      avgFantasyRank: 5,
      totalFantasyParticipants: 100,
      currentStreak: 10,
      clubSubscription: { tier: 'silber', clubName: 'Sakaryaspor' },
      foundingPassTier: 'gold',
      followersCount: 200,
    });
    expect(badges).toHaveLength(3);
    expect(badges[0].type).toBe('topManager');
    expect(badges[1].type).toBe('clubAbo');
    expect(badges[2].type).toBe('foundingPass');
  });

  it('handles null/undefined optional fields gracefully', () => {
    const badges = getAutoBadges({
      isSelf: false,
      trackRecord: null,
      clubSubscription: null,
      foundingPassTier: null,
    });
    expect(badges).toEqual([]);
  });
});
