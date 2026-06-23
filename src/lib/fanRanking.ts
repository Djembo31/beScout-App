/**
 * Fan Ranking — Tier Definitions & Constants
 *
 * 6 Tiers: Zuschauer → Stammgast → Ultra → Legende → Ehrenmitglied → Vereinsikone
 * Tiers are a loyalty/perks axis (Fan-Reward-Engine). The old CSF tier-multiplier
 * was removed in Slice 348 — CSF payout is purely proportional (liquidate_player
 * proportional_v3), and loyalty rewards run through the Fan-Reward-Engine (D83/D93).
 */

import type { FanRankTier } from '@/types';

// ============================================
// TIER DEFINITIONS
// ============================================

export type FanRankTierDef = {
  tier: FanRankTier;
  name: string;
  minScore: number;
  maxScore: number | null;
  color: string;
  icon: string;
};

export const FAN_RANK_TIERS: FanRankTierDef[] = [
  { tier: 'zuschauer', name: 'Zuschauer', minScore: 0, maxScore: 9, color: 'gray', icon: 'eye' },
  { tier: 'stammgast', name: 'Stammgast', minScore: 10, maxScore: 24, color: 'blue', icon: 'users' },
  { tier: 'ultra', name: 'Ultra', minScore: 25, maxScore: 39, color: 'purple', icon: 'flame' },
  { tier: 'legende', name: 'Legende', minScore: 40, maxScore: 54, color: 'amber', icon: 'star' },
  { tier: 'ehrenmitglied', name: 'Ehrenmitglied', minScore: 55, maxScore: 69, color: 'emerald', icon: 'award' },
  { tier: 'vereinsikone', name: 'Vereinsikone', minScore: 70, maxScore: null, color: 'gold', icon: 'crown' },
];

// ============================================
// HELPERS
// ============================================

/** Get tier definition by tier id */
export function getFanRankDef(tier: FanRankTier): FanRankTierDef {
  return FAN_RANK_TIERS.find(t => t.tier === tier) ?? FAN_RANK_TIERS[0];
}

// NOTE (Slice 347): `getFanRankByScore` was removed. Score→tier resolution lives in
// the `calculate_fan_rank` RPC (now club-configurable via club_fan_rank_thresholds).
// A client-side copy would silently drift from per-club thresholds. The Fan-Rang ladder
// reads resolved thresholds via `getClubFanRankThresholds` (services/fanRanking.ts).
