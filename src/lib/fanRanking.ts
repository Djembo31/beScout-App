/**
 * Fan Ranking — Tier Definitions & Constants
 *
 * 6 Tiers: Zuschauer → Stammgast → Ultra → Legende → Ehrenmitglied → Vereinsikone
 * Each tier grants a CSF multiplier (Community Success Fee bonus).
 */

import type { FanRankTier } from '@/types';

// ============================================
// TIER DEFINITIONS
// ============================================

export type FanRankTierDef = {
  tier: FanRankTier;
  name: string;
  csfMultiplier: number;
  minScore: number;
  maxScore: number | null;
  color: string;
  icon: string;
};

export const FAN_RANK_TIERS: FanRankTierDef[] = [
  { tier: 'zuschauer', name: 'Zuschauer', csfMultiplier: 1.00, minScore: 0, maxScore: 9, color: 'gray', icon: 'eye' },
  { tier: 'stammgast', name: 'Stammgast', csfMultiplier: 1.05, minScore: 10, maxScore: 24, color: 'blue', icon: 'users' },
  { tier: 'ultra', name: 'Ultra', csfMultiplier: 1.15, minScore: 25, maxScore: 39, color: 'purple', icon: 'flame' },
  { tier: 'legende', name: 'Legende', csfMultiplier: 1.25, minScore: 40, maxScore: 54, color: 'amber', icon: 'star' },
  { tier: 'ehrenmitglied', name: 'Ehrenmitglied', csfMultiplier: 1.35, minScore: 55, maxScore: 69, color: 'emerald', icon: 'award' },
  { tier: 'vereinsikone', name: 'Vereinsikone', csfMultiplier: 1.50, minScore: 70, maxScore: null, color: 'gold', icon: 'crown' },
];

// ============================================
// HELPERS
// ============================================

/** Get tier definition by tier id */
export function getFanRankDef(tier: FanRankTier): FanRankTierDef {
  return FAN_RANK_TIERS.find(t => t.tier === tier) ?? FAN_RANK_TIERS[0];
}

/** Get tier definition by score (returns the highest tier the score qualifies for) */
export function getFanRankByScore(score: number): FanRankTierDef {
  // Walk tiers from highest to lowest, return first match
  for (let i = FAN_RANK_TIERS.length - 1; i >= 0; i--) {
    if (score >= FAN_RANK_TIERS[i].minScore) {
      return FAN_RANK_TIERS[i];
    }
  }
  return FAN_RANK_TIERS[0];
}
