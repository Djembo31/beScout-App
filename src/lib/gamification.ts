/**
 * BeScout Gamification System — Elo-artiges Skill-Rating
 *
 * 3 Dimensionen: Trader / Manager / Analyst
 * Jede Dimension hat eigenen Score (Start 500) der steigt UND sinkt.
 * Gesamt-Rang = Median der 3 Einzel-Ränge.
 *
 * 12 Tiers: Bronze I-III → Silber I-III → Gold I-III → Diamant → Mythisch → Legendär
 * Sub-Tier Ordering: I (lowest) < II < III (highest) — Star-System
 */

// ============================================
// TYPES
// ============================================

export type RangId =
  | 'bronze' | 'silber' | 'gold'
  | 'diamant' | 'mythisch' | 'legendaer';

export type SubStufe = 'III' | 'II' | 'I';

export type Rang = {
  id: RangId;
  name: string;
  subStufe: SubStufe | null;     // null for Diamant, Mythisch, Legendär
  fullName: string;              // e.g. "Gold II" (German fallback)
  i18nKey: string;               // e.g. "bronzeI", "diamant" — maps to gamification.rang.*
  color: string;                 // Tailwind text color
  bgColor: string;               // Tailwind bg color
  borderColor: string;           // Tailwind border color
  gradientFrom: string;          // For gradient backgrounds
  minScore: number;
  maxScore: number | null;       // null = no upper limit
  tier: number;                  // 1-12 for comparison
};

export type Dimension = 'trader' | 'manager' | 'analyst';

export type DimensionScores = {
  trader_score: number;
  manager_score: number;
  analyst_score: number;
};

// ============================================
// RANG THRESHOLDS (12 Tiers)
// ============================================

type RangDef = {
  id: RangId;
  name: string;
  thresholds: [number, number, number] | null; // III/II/I — null = single tier
  color: string;
  bgColor: string;
  borderColor: string;
  gradientFrom: string;
};

const RANG_DEFS: RangDef[] = [
  {
    id: 'bronze', name: 'Bronze',
    thresholds: [0, 350, 700],          // I=0-349, II=350-699, III=700-999
    color: 'text-amber-600', bgColor: 'bg-amber-600/15', borderColor: 'border-amber-600/25',
    gradientFrom: 'from-amber-600/20',
  },
  {
    id: 'silber', name: 'Silber',
    thresholds: [1000, 1400, 1800],     // I=1000-1399, II=1400-1799, III=1800-2199
    color: 'text-slate-300', bgColor: 'bg-slate-300/15', borderColor: 'border-slate-300/25',
    gradientFrom: 'from-slate-300/20',
  },
  {
    id: 'gold', name: 'Gold',
    thresholds: [2200, 2800, 3400],     // I=2200-2799, II=2800-3399, III=3400-3999
    color: 'text-[#FFD700]', bgColor: 'bg-[#FFD700]/15', borderColor: 'border-[#FFD700]/25',
    gradientFrom: 'from-[#FFD700]/20',
  },
  {
    id: 'diamant', name: 'Diamant',
    thresholds: null,                    // 4000-4999
    color: 'text-cyan-300', bgColor: 'bg-cyan-300/15', borderColor: 'border-cyan-300/25',
    gradientFrom: 'from-cyan-300/20',
  },
  {
    id: 'mythisch', name: 'Mythisch',
    thresholds: null,                    // 5000-6999
    color: 'text-purple-400', bgColor: 'bg-purple-400/15', borderColor: 'border-purple-400/25',
    gradientFrom: 'from-purple-400/20',
  },
  {
    id: 'legendaer', name: 'Legendär',
    thresholds: null,                    // 7000+
    color: 'text-[#FFD700]', bgColor: 'bg-[#FFD700]/20', borderColor: 'border-[#FFD700]/30',
    gradientFrom: 'from-[#FFD700]/25',
  },
];

const SUB_STUFEN: SubStufe[] = ['I', 'II', 'III'];

// ============================================
// CORE FUNCTION: getRang(score) → Rang
// ============================================

export function getRang(score: number): Rang {
  // Legendär: 7000+
  if (score >= 7000) {
    return {
      id: 'legendaer', name: 'Legendär', subStufe: null, fullName: 'Legendär', i18nKey: 'legendaer',
      color: RANG_DEFS[5].color, bgColor: RANG_DEFS[5].bgColor,
      borderColor: RANG_DEFS[5].borderColor, gradientFrom: RANG_DEFS[5].gradientFrom,
      minScore: 7000, maxScore: null, tier: 12,
    };
  }

  // Mythisch: 5000-6999
  if (score >= 5000) {
    return {
      id: 'mythisch', name: 'Mythisch', subStufe: null, fullName: 'Mythisch', i18nKey: 'mythisch',
      color: RANG_DEFS[4].color, bgColor: RANG_DEFS[4].bgColor,
      borderColor: RANG_DEFS[4].borderColor, gradientFrom: RANG_DEFS[4].gradientFrom,
      minScore: 5000, maxScore: 6999, tier: 11,
    };
  }

  // Diamant: 4000-4999
  if (score >= 4000) {
    return {
      id: 'diamant', name: 'Diamant', subStufe: null, fullName: 'Diamant', i18nKey: 'diamant',
      color: RANG_DEFS[3].color, bgColor: RANG_DEFS[3].bgColor,
      borderColor: RANG_DEFS[3].borderColor, gradientFrom: RANG_DEFS[3].gradientFrom,
      minScore: 4000, maxScore: 4999, tier: 10,
    };
  }

  // Tiered ranks: Bronze, Silber, Gold (each with III/II/I)
  for (let i = 2; i >= 0; i--) {
    const def = RANG_DEFS[i];
    if (!def.thresholds) continue;
    for (let s = 2; s >= 0; s--) {
      if (score >= def.thresholds[s]) {
        const tierBase = i * 3 + 1; // bronze=1, silber=4, gold=7
        const nextThreshold = s < 2
          ? def.thresholds[s + 1]
          : (i < 2 ? RANG_DEFS[i + 1].thresholds![0] : 4000);
        return {
          id: def.id,
          name: def.name,
          subStufe: SUB_STUFEN[s],
          fullName: `${def.name} ${SUB_STUFEN[s]}`,
          i18nKey: `${def.id}${SUB_STUFEN[s]}`,
          color: def.color,
          bgColor: def.bgColor,
          borderColor: def.borderColor,
          gradientFrom: def.gradientFrom,
          minScore: def.thresholds[s],
          maxScore: nextThreshold - 1,
          tier: tierBase + s,
        };
      }
    }
  }

  // Fallback: Bronze I (lowest tier)
  return {
    id: 'bronze', name: 'Bronze', subStufe: 'I', fullName: 'Bronze I', i18nKey: 'bronzeI',
    color: RANG_DEFS[0].color, bgColor: RANG_DEFS[0].bgColor,
    borderColor: RANG_DEFS[0].borderColor, gradientFrom: RANG_DEFS[0].gradientFrom,
    minScore: 0, maxScore: 349, tier: 1,
  };
}

// ============================================
// GESAMT-RANG: Median der 3 Dimensionen
// ============================================

export function getGesamtRang(scores: DimensionScores): Rang {
  const vals = [scores.trader_score, scores.manager_score, scores.analyst_score];
  const sorted = [...vals].sort((a, b) => a - b);
  return getRang(sorted[1]); // Median
}

export function getMedianScore(scores: DimensionScores): number {
  const vals = [scores.trader_score, scores.manager_score, scores.analyst_score];
  const sorted = [...vals].sort((a, b) => a - b);
  return sorted[1];
}

/** Check if a score change caused a rang change */
export function didRangChange(scoreBefore: number, scoreAfter: number): { changed: boolean; direction: 'up' | 'down' | null; rangBefore: Rang; rangAfter: Rang } {
  const rangBefore = getRang(scoreBefore);
  const rangAfter = getRang(scoreAfter);
  if (rangBefore.tier === rangAfter.tier) {
    return { changed: false, direction: null, rangBefore, rangAfter };
  }
  return {
    changed: true,
    direction: rangAfter.tier > rangBefore.tier ? 'up' : 'down',
    rangBefore,
    rangAfter,
  };
}

// ============================================
// DIMENSION HELPERS
// ============================================

export function getDimensionLabel(dim: Dimension): string {
  switch (dim) {
    case 'trader': return 'Trader';
    case 'manager': return 'Manager';
    case 'analyst': return 'Analyst';
  }
}

export function getDimensionColor(dim: Dimension): string {
  switch (dim) {
    case 'trader': return 'text-sky-400';
    case 'manager': return 'text-purple-400';
    case 'analyst': return 'text-emerald-400';
  }
}

export function getDimensionBgColor(dim: Dimension): string {
  switch (dim) {
    case 'trader': return 'bg-sky-400/15';
    case 'manager': return 'bg-purple-400/15';
    case 'analyst': return 'bg-emerald-400/15';
  }
}

export function getDimensionBorderColor(dim: Dimension): string {
  switch (dim) {
    case 'trader': return 'border-sky-400/25';
    case 'manager': return 'border-purple-400/25';
    case 'analyst': return 'border-emerald-400/25';
  }
}

// ============================================
// SCORE ROAD (12 Rang-Milestones)
// ============================================

export type ScoreRoadMilestone = {
  score: number;
  rangName: string;            // German fallback
  rangI18nKey: string;         // maps to gamification.rang.*
  rewardBsd: number;           // in cents (0 = cosmetic only)
  rewardLabel: string;
  rewardType: 'bsd' | 'cosmetic' | 'both';
};

export const SCORE_ROAD: ScoreRoadMilestone[] = [
  { score: 350, rangName: 'Bronze II', rangI18nKey: 'bronzeII', rewardBsd: 20000, rewardLabel: '200 BSD', rewardType: 'bsd' },
  { score: 700, rangName: 'Bronze III', rangI18nKey: 'bronzeIII', rewardBsd: 0, rewardLabel: 'Bronze-Rahmen', rewardType: 'cosmetic' },
  { score: 1000, rangName: 'Silber I', rangI18nKey: 'silberI', rewardBsd: 50000, rewardLabel: '500 BSD', rewardType: 'bsd' },
  { score: 1400, rangName: 'Silber II', rangI18nKey: 'silberII', rewardBsd: 0, rewardLabel: '"Scout" Titel', rewardType: 'cosmetic' },
  { score: 1800, rangName: 'Silber III', rangI18nKey: 'silberIII', rewardBsd: 100000, rewardLabel: '1.000 BSD', rewardType: 'bsd' },
  { score: 2200, rangName: 'Gold I', rangI18nKey: 'goldI', rewardBsd: 0, rewardLabel: 'Gold-Rahmen', rewardType: 'cosmetic' },
  { score: 2800, rangName: 'Gold II', rangI18nKey: 'goldII', rewardBsd: 200000, rewardLabel: '2.000 BSD', rewardType: 'bsd' },
  { score: 3400, rangName: 'Gold III', rangI18nKey: 'goldIII', rewardBsd: 0, rewardLabel: '"Stratege" Titel', rewardType: 'cosmetic' },
  { score: 4000, rangName: 'Diamant', rangI18nKey: 'diamant', rewardBsd: 500000, rewardLabel: 'Diamant-Rahmen + 5.000 BSD', rewardType: 'both' },
  { score: 5000, rangName: 'Mythisch', rangI18nKey: 'mythisch', rewardBsd: 750000, rewardLabel: 'Mythisch-Avatar + 7.500 BSD', rewardType: 'both' },
  { score: 7000, rangName: 'Legendär', rangI18nKey: 'legendaer', rewardBsd: 2000000, rewardLabel: 'Legendär-Set + 20.000 BSD', rewardType: 'both' },
];

// ============================================
// MANAGER POINT TABLE (by percentile)
// ============================================

export type ManagerPointEntry = {
  maxPercentile: number;
  points: number;
  label: string;
};

export const MANAGER_POINTS: ManagerPointEntry[] = [
  { maxPercentile: 1, points: 50, label: 'Top 1%' },
  { maxPercentile: 5, points: 40, label: 'Top 5%' },
  { maxPercentile: 10, points: 30, label: 'Top 10%' },
  { maxPercentile: 25, points: 20, label: 'Top 25%' },
  { maxPercentile: 50, points: 10, label: 'Top 50%' },
  { maxPercentile: 75, points: 0, label: 'Top 75%' },
  { maxPercentile: 90, points: -10, label: '75-90%' },
  { maxPercentile: 100, points: -25, label: 'Bottom 10%' },
];

/** Absent Manager Penalty: -15 per missed event */
export const ABSENT_MANAGER_PENALTY = -15;

/** Captain's Call Bonus: captain is top scorer → +15 */
export const CAPTAINS_CALL_BONUS = 15;

/** Get manager points for a given placement percentile */
export function getManagerPoints(percentile: number): number {
  for (const entry of MANAGER_POINTS) {
    if (percentile <= entry.maxPercentile) return entry.points;
  }
  return MANAGER_POINTS[MANAGER_POINTS.length - 1].points;
}
