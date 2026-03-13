import { describe, it, expect } from 'vitest';
import {
  getRang,
  getGesamtRang,
  getMedianScore,
  didRangChange,
  getDimensionLabel,
  getDimensionColor,
  getDimensionBgColor,
  getDimensionBorderColor,
  getManagerPoints,
  SCORE_ROAD,
  MANAGER_POINTS,
  ABSENT_MANAGER_PENALTY,
  CAPTAINS_CALL_BONUS,
  type DimensionScores,
} from './gamification';

// ============================================
// getRang — 12 Tiers
// ============================================

describe('getRang', () => {
  it('returns Bronze I for score 0', () => {
    const r = getRang(0);
    expect(r.id).toBe('bronze');
    expect(r.subStufe).toBe('I');
    expect(r.tier).toBe(1);
    expect(r.fullName).toBe('Bronze I');
    expect(r.i18nKey).toBe('bronzeI');
  });

  it('returns Bronze I for score 349', () => {
    expect(getRang(349).tier).toBe(1);
    expect(getRang(349).subStufe).toBe('I');
  });

  it('returns Bronze II for score 350', () => {
    const r = getRang(350);
    expect(r.id).toBe('bronze');
    expect(r.subStufe).toBe('II');
    expect(r.tier).toBe(2);
  });

  it('returns Bronze III for score 700', () => {
    const r = getRang(700);
    expect(r.id).toBe('bronze');
    expect(r.subStufe).toBe('III');
    expect(r.tier).toBe(3);
  });

  it('returns Silber I for score 1000', () => {
    const r = getRang(1000);
    expect(r.id).toBe('silber');
    expect(r.subStufe).toBe('I');
    expect(r.tier).toBe(4);
  });

  it('returns Silber II for score 1400', () => {
    expect(getRang(1400).tier).toBe(5);
  });

  it('returns Silber III for score 1800', () => {
    expect(getRang(1800).tier).toBe(6);
  });

  it('returns Gold I for score 1900', () => {
    const r = getRang(1900);
    expect(r.id).toBe('gold');
    expect(r.subStufe).toBe('I');
    expect(r.tier).toBe(7);
  });

  it('returns Gold II for score 2200', () => {
    expect(getRang(2200).tier).toBe(8);
  });

  it('returns Gold III for score 2600', () => {
    expect(getRang(2600).tier).toBe(9);
  });

  it('returns Diamant for score 3000', () => {
    const r = getRang(3000);
    expect(r.id).toBe('diamant');
    expect(r.subStufe).toBeNull();
    expect(r.tier).toBe(10);
    expect(r.fullName).toBe('Diamant');
  });

  it('returns Mythisch for score 3500', () => {
    const r = getRang(3500);
    expect(r.id).toBe('mythisch');
    expect(r.subStufe).toBeNull();
    expect(r.tier).toBe(11);
  });

  it('returns Legendär for score 5000', () => {
    const r = getRang(5000);
    expect(r.id).toBe('legendaer');
    expect(r.subStufe).toBeNull();
    expect(r.tier).toBe(12);
    expect(r.maxScore).toBeNull();
  });

  it('returns Legendär for very high score', () => {
    expect(getRang(99999).tier).toBe(12);
  });

  it('returns Legendär for old threshold 7000', () => {
    expect(getRang(7000).tier).toBe(12);
  });

  it('returns Bronze I for negative score', () => {
    const r = getRang(-100);
    expect(r.id).toBe('bronze');
    expect(r.tier).toBe(1);
  });

  it('tier boundaries — maxScore is correct', () => {
    const bronzeI = getRang(0);
    expect(bronzeI.maxScore).toBe(349);

    const bronzeII = getRang(350);
    expect(bronzeII.maxScore).toBe(699);

    const goldIII = getRang(2600);
    expect(goldIII.maxScore).toBe(2999);

    const diamant = getRang(3000);
    expect(diamant.maxScore).toBe(3499);

    const mythisch = getRang(3500);
    expect(mythisch.maxScore).toBe(4999);
  });

  it('all tiers have correct colors (non-empty)', () => {
    const scores = [0, 350, 700, 1000, 1300, 1600, 1900, 2200, 2600, 3000, 3500, 5000];
    for (const s of scores) {
      const r = getRang(s);
      expect(r.color).toBeTruthy();
      expect(r.bgColor).toBeTruthy();
      expect(r.borderColor).toBeTruthy();
      expect(r.gradientFrom).toBeTruthy();
    }
  });
});

// ============================================
// getGesamtRang — Median der 3 Dimensionen
// ============================================

describe('getGesamtRang', () => {
  it('returns median rank of 3 equal scores', () => {
    const scores: DimensionScores = { trader_score: 1000, manager_score: 1000, analyst_score: 1000 };
    expect(getGesamtRang(scores).id).toBe('silber');
  });

  it('returns median rank with one outlier (high)', () => {
    const scores: DimensionScores = { trader_score: 7000, manager_score: 500, analyst_score: 500 };
    // Sorted: [500, 500, 7000] → median = 500 → Bronze II
    expect(getGesamtRang(scores).id).toBe('bronze');
  });

  it('returns median rank with one outlier (low)', () => {
    const scores: DimensionScores = { trader_score: 0, manager_score: 3000, analyst_score: 5000 };
    // Sorted: [0, 3000, 5000] → median = 3000 → Diamant
    expect(getGesamtRang(scores).id).toBe('diamant');
  });

  it('uses true median (middle value)', () => {
    const scores: DimensionScores = { trader_score: 100, manager_score: 1900, analyst_score: 5500 };
    // Sorted: [100, 1900, 5500] → median = 1900 → Gold I
    const r = getGesamtRang(scores);
    expect(r.id).toBe('gold');
    expect(r.subStufe).toBe('I');
  });
});

// ============================================
// getMedianScore
// ============================================

describe('getMedianScore', () => {
  it('returns the middle value', () => {
    expect(getMedianScore({ trader_score: 100, manager_score: 500, analyst_score: 300 })).toBe(300);
  });

  it('returns correct median with equal values', () => {
    expect(getMedianScore({ trader_score: 42, manager_score: 42, analyst_score: 42 })).toBe(42);
  });

  it('returns correct median regardless of dimension order', () => {
    expect(getMedianScore({ trader_score: 9000, manager_score: 100, analyst_score: 2000 })).toBe(2000);
  });
});

// ============================================
// didRangChange
// ============================================

describe('didRangChange', () => {
  it('detects upward rang change', () => {
    const result = didRangChange(999, 1000);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.rangBefore.id).toBe('bronze');
    expect(result.rangAfter.id).toBe('silber');
  });

  it('detects downward rang change', () => {
    const result = didRangChange(1000, 999);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('down');
  });

  it('returns no change within same tier', () => {
    const result = didRangChange(100, 200);
    expect(result.changed).toBe(false);
    expect(result.direction).toBeNull();
  });

  it('detects sub-tier change (Bronze I → Bronze II)', () => {
    const result = didRangChange(349, 350);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.rangBefore.subStufe).toBe('I');
    expect(result.rangAfter.subStufe).toBe('II');
  });

  it('detects multi-tier jump', () => {
    const result = didRangChange(0, 7000);
    expect(result.changed).toBe(true);
    expect(result.direction).toBe('up');
    expect(result.rangBefore.tier).toBe(1);
    expect(result.rangAfter.tier).toBe(12);
  });
});

// ============================================
// Dimension Helpers
// ============================================

describe('getDimensionLabel', () => {
  it('returns correct German labels', () => {
    expect(getDimensionLabel('trader')).toBe('Trader');
    expect(getDimensionLabel('manager')).toBe('Manager');
    expect(getDimensionLabel('analyst')).toBe('Analyst');
  });
});

describe('getDimensionColor', () => {
  it('returns distinct Tailwind classes per dimension', () => {
    const colors = [
      getDimensionColor('trader'),
      getDimensionColor('manager'),
      getDimensionColor('analyst'),
    ];
    // All different
    expect(new Set(colors).size).toBe(3);
    // All are valid text-* classes
    for (const c of colors) {
      expect(c).toMatch(/^text-/);
    }
  });
});

describe('getDimensionBgColor', () => {
  it('returns bg-* classes', () => {
    expect(getDimensionBgColor('trader')).toMatch(/^bg-/);
    expect(getDimensionBgColor('manager')).toMatch(/^bg-/);
    expect(getDimensionBgColor('analyst')).toMatch(/^bg-/);
  });
});

describe('getDimensionBorderColor', () => {
  it('returns border-* classes', () => {
    expect(getDimensionBorderColor('trader')).toMatch(/^border-/);
    expect(getDimensionBorderColor('manager')).toMatch(/^border-/);
    expect(getDimensionBorderColor('analyst')).toMatch(/^border-/);
  });
});

// ============================================
// getManagerPoints
// ============================================

describe('getManagerPoints', () => {
  it('returns 50 for Top 1%', () => {
    expect(getManagerPoints(0.5)).toBe(50);
    expect(getManagerPoints(1)).toBe(50);
  });

  it('returns 40 for Top 5%', () => {
    expect(getManagerPoints(3)).toBe(40);
    expect(getManagerPoints(5)).toBe(40);
  });

  it('returns 30 for Top 10%', () => {
    expect(getManagerPoints(7)).toBe(30);
  });

  it('returns 20 for Top 25%', () => {
    expect(getManagerPoints(20)).toBe(20);
  });

  it('returns 10 for Top 50%', () => {
    expect(getManagerPoints(40)).toBe(10);
  });

  it('returns 0 for Top 75%', () => {
    expect(getManagerPoints(60)).toBe(0);
  });

  it('returns -10 for 75-90%', () => {
    expect(getManagerPoints(85)).toBe(-10);
  });

  it('returns -25 for Bottom 10%', () => {
    expect(getManagerPoints(95)).toBe(-25);
    expect(getManagerPoints(100)).toBe(-25);
  });

  it('returns last entry for percentile > 100', () => {
    expect(getManagerPoints(150)).toBe(-25);
  });
});

// ============================================
// Constants sanity checks
// ============================================

describe('SCORE_ROAD', () => {
  it('has 11 milestones', () => {
    expect(SCORE_ROAD).toHaveLength(11);
  });

  it('milestones are in ascending score order', () => {
    for (let i = 1; i < SCORE_ROAD.length; i++) {
      expect(SCORE_ROAD[i].score).toBeGreaterThan(SCORE_ROAD[i - 1].score);
    }
  });

  it('first milestone is Bronze II (350)', () => {
    expect(SCORE_ROAD[0].score).toBe(350);
  });

  it('last milestone is Legendär (5000)', () => {
    expect(SCORE_ROAD[SCORE_ROAD.length - 1].score).toBe(5000);
  });

  it('all milestones have a rewardLabel', () => {
    for (const m of SCORE_ROAD) {
      expect(m.rewardLabel).toBeTruthy();
    }
  });
});

describe('MANAGER_POINTS', () => {
  it('has 8 entries', () => {
    expect(MANAGER_POINTS).toHaveLength(8);
  });

  it('points are descending', () => {
    for (let i = 1; i < MANAGER_POINTS.length; i++) {
      expect(MANAGER_POINTS[i].points).toBeLessThanOrEqual(MANAGER_POINTS[i - 1].points);
    }
  });
});

describe('Constants', () => {
  it('ABSENT_MANAGER_PENALTY is negative', () => {
    expect(ABSENT_MANAGER_PENALTY).toBeLessThan(0);
  });

  it('CAPTAINS_CALL_BONUS is positive', () => {
    expect(CAPTAINS_CALL_BONUS).toBeGreaterThan(0);
  });
});
