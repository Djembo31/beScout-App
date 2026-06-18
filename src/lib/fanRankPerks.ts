/**
 * Fan Ranking — Perk Catalog (Platform Default)
 *
 * Slice 344 (E1.1, Fan-Reward-Engine): maps each Fan-Rang tier to what it unlocks.
 * Platform-default set — club-configurable perks are a later slice (E1.5).
 *
 * Today only ONE real fan-rank perk exists: poll vote weight (Slice 343).
 * The status identity (badge) is implicit in the tier itself.
 * `csf_multiplier` is intentionally NOT a perk here — it is being removed (D83,
 * treasury.md §8: loyalty moves fully into the Fan-Reward-Engine).
 */

import type { FanRankTier } from '@/types';

export interface FanRankPerks {
  /**
   * Poll vote weight in community polls.
   *
   * ⚠️ MIRROR of `cast_community_poll_vote` (Slice 343) — DISPLAY ONLY.
   * The RPC is the single source of truth for the actual money/tally weight
   * (`weight = MAX(abo_weight, fanrank_weight)`). This catalog only surfaces it.
   * If the RPC mapping changes, update BOTH and the regression test in
   * FanRankLadder.test.tsx (guards against silent drift — "Money-RPC Pricing-Formel
   * Drift", errors-db.md). Mapping per 343: Ultra/Legende = 2×, Ehren/Ikone = 3×,
   * else 1×.
   */
  pollWeight: 1 | 2 | 3;
}

export const FAN_RANK_PERKS: Record<FanRankTier, FanRankPerks> = {
  zuschauer: { pollWeight: 1 },
  stammgast: { pollWeight: 1 },
  ultra: { pollWeight: 2 },
  legende: { pollWeight: 2 },
  ehrenmitglied: { pollWeight: 3 },
  vereinsikone: { pollWeight: 3 },
};

/** Perks for a given tier (always defined — falls back to zuschauer). */
export function getFanRankPerks(tier: FanRankTier): FanRankPerks {
  return FAN_RANK_PERKS[tier] ?? FAN_RANK_PERKS.zuschauer;
}
