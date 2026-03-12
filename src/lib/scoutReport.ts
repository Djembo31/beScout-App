import type { Dimension } from '@/lib/gamification';

// ============================================
// TYPES
// ============================================

export type BadgeType =
  | 'hitRate'
  | 'topManager'
  | 'streak'
  | 'clubAbo'
  | 'foundingPass'
  | 'portfolioPnl'
  | 'followers';

export interface AutoBadge {
  type: BadgeType;
  labelKey: string;
  params: Record<string, string | number>;
}

export interface BadgeInput {
  trackRecord?: { hitRate: number; totalCalls: number } | null;
  avgFantasyRank?: number;
  totalFantasyParticipants?: number;
  currentStreak?: number;
  clubSubscription?: { tier: string; clubName: string } | null;
  foundingPassTier?: string | null;
  portfolioPnlPct?: number;
  followersCount?: number;
  isSelf: boolean;
}

/** Input scores — uses scout_score for the analyst dimension (DB column name) */
export interface ScoutReportScores {
  manager_score: number;
  trading_score: number;
  scout_score: number;
}

// ============================================
// DIMENSION HELPERS
// ============================================

/** Map DB score fields to Dimension type */
function toDimensionEntries(
  scores: ScoutReportScores,
): [Dimension, number][] {
  return [
    ['manager', scores.manager_score],
    ['trader', scores.trading_score],
    ['analyst', scores.scout_score],
  ];
}

/**
 * Returns the strongest dimension. Ties: manager > trader > analyst.
 */
export function getStrongestDimension(scores: ScoutReportScores): Dimension {
  const entries = toDimensionEntries(scores);

  // Sort descending by score; stable sort preserves insertion order for ties
  // Insertion order is manager, trader, analyst — which matches tie priority
  entries.sort((a, b) => b[1] - a[1]);

  return entries[0][0];
}

/**
 * Returns dimensions ordered by score descending (strongest first).
 * Ties follow manager > trader > analyst priority.
 */
export function getDimensionTabOrder(scores: ScoutReportScores): Dimension[] {
  const entries = toDimensionEntries(scores);
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([dim]) => dim);
}

// ============================================
// STRENGTH LABEL
// ============================================

/**
 * Returns an i18n key describing the user's strength profile.
 *
 * Decision tree (evaluated in order):
 * 1. All low (max < 400) → 'strengthAufsteiger'
 * 2. Balanced (variance < 15%) → 'strengthAllrounder'
 * 3. Manager + Trader both high, close (<10% diff) → 'strengthTaktischerInvestor'
 * 4. Manager dominant (>30% above 2nd) → 'strengthFantasyStratege'
 * 5. Trader dominant → 'strengthMarktkenner'
 * 6. Analyst dominant → 'strengthTreffsichererAnalyst'
 */
export function getStrengthLabel(scores: ScoutReportScores): string {
  const m = scores.manager_score;
  const t = scores.trading_score;
  const s = scores.scout_score;

  const max = Math.max(m, t, s);
  const min = Math.min(m, t, s);

  // 1. All low
  if (max < 400) return 'strengthAufsteiger';

  // 2. Balanced — variance < 15% between highest and lowest
  // We compare (max - min) / max to avoid division by zero edge cases
  if (max > 0 && (max - min) / max < 0.15) return 'strengthAllrounder';

  // 3. Manager + Trader both high and close (<10% diff)
  // "Both high" = both above analyst, "close" = diff / max(m,t) < 10%
  const mtMax = Math.max(m, t);
  const mtMin = Math.min(m, t);
  if (mtMin > s && mtMax > 0 && (mtMax - mtMin) / mtMax < 0.1) {
    return 'strengthTaktischerInvestor';
  }

  // Find sorted scores for dominant check
  const sorted = [
    { dim: 'manager' as const, score: m },
    { dim: 'trader' as const, score: t },
    { dim: 'analyst' as const, score: s },
  ].sort((a, b) => b.score - a.score);

  const highest = sorted[0];
  const second = sorted[1];

  // 4-6. Dominant dimension (>30% above 2nd)
  if (second.score > 0 && (highest.score - second.score) / second.score > 0.3) {
    if (highest.dim === 'manager') return 'strengthFantasyStratege';
    if (highest.dim === 'trader') return 'strengthMarktkenner';
    return 'strengthTreffsichererAnalyst';
  }

  // Fallback: strongest dimension without 30% dominance threshold
  if (highest.dim === 'manager') return 'strengthFantasyStratege';
  if (highest.dim === 'trader') return 'strengthMarktkenner';
  return 'strengthTreffsichererAnalyst';
}

// ============================================
// AUTO BADGES
// ============================================

const MAX_BADGES = 3;

/**
 * Returns up to 3 automatically awarded badges, sorted by priority (1 = highest).
 * portfolioPnl badge is excluded for public profiles (isSelf=false).
 */
export function getAutoBadges(input: BadgeInput): AutoBadge[] {
  const badges: AutoBadge[] = [];

  // Priority 1: Hit Rate
  if (
    input.trackRecord &&
    input.trackRecord.totalCalls >= 5 &&
    input.trackRecord.hitRate >= 60
  ) {
    badges.push({
      type: 'hitRate',
      labelKey: 'badgeHitRate',
      params: { rate: input.trackRecord.hitRate },
    });
  }

  // Priority 2: Top Manager
  if (
    input.avgFantasyRank != null &&
    input.totalFantasyParticipants != null &&
    input.totalFantasyParticipants > 0
  ) {
    const pct = Math.round(
      (input.avgFantasyRank / input.totalFantasyParticipants) * 100,
    );
    if (pct <= 10) {
      badges.push({
        type: 'topManager',
        labelKey: 'badgeTopManager',
        params: { pct },
      });
    }
  }

  // Priority 3: Streak
  if (input.currentStreak != null && input.currentStreak >= 30) {
    badges.push({
      type: 'streak',
      labelKey: 'badgeStreak',
      params: { days: input.currentStreak },
    });
  }

  // Priority 4: Club Abo
  if (input.clubSubscription) {
    badges.push({
      type: 'clubAbo',
      labelKey: 'badgeClubAbo',
      params: {
        tier: input.clubSubscription.tier,
        club: input.clubSubscription.clubName,
      },
    });
  }

  // Priority 5: Founding Pass
  if (input.foundingPassTier) {
    badges.push({
      type: 'foundingPass',
      labelKey: 'badgeFoundingPass',
      params: { tier: input.foundingPassTier },
    });
  }

  // Priority 6: Portfolio PnL (self-only)
  if (
    input.isSelf &&
    input.portfolioPnlPct != null &&
    input.portfolioPnlPct > 20
  ) {
    badges.push({
      type: 'portfolioPnl',
      labelKey: 'badgePortfolioPnl',
      params: { pct: input.portfolioPnlPct },
    });
  }

  // Priority 7: Followers
  if (input.followersCount != null && input.followersCount >= 100) {
    badges.push({
      type: 'followers',
      labelKey: 'badgeFollowers',
      params: { count: input.followersCount },
    });
  }

  // Already in priority order, just cap at MAX_BADGES
  return badges.slice(0, MAX_BADGES);
}
