/**
 * Single Source of Truth for Transaction Types
 *
 * Contains all credit transaction types that exist in the `transactions` table
 * (verified via DB 2026-04-08), plus future-proof additions.
 *
 * IMPORTANT: If you add a new type here, also:
 *   1. Add it to `src/lib/activityHelpers.ts` (icon + color + label key)
 *   2. Add i18n label under `activity.*` in `messages/{de,tr}.json`
 *   3. If public-safe → update DB RLS policy `transactions_select_public_types`
 *      (migration `20260408190000_transactions_public_rls.sql`)
 *
 * The DB RLS whitelist MUST match PUBLIC_TX_TYPES below.
 */

// All known credit transaction types (union of DB reality + extended future types)
export const ALL_CREDIT_TX_TYPES = [
  // Trading (P1)
  'trade_buy', 'trade_sell', 'buy', 'sell', 'ipo_buy',
  'offer_buy', 'offer_sell', 'offer_lock', 'offer_unlock',
  // Wallet operations (private)
  'deposit', 'welcome_bonus',
  // Achievements (public-safe)
  'mission_reward', 'streak_reward', 'streak_bonus',
  'bounty_reward', 'bounty_cost',
  'research_earning', 'research_unlock',
  'tier_bonus',
  // Fantasy
  'fantasy_reward', 'fantasy_join', 'entry_fee', 'entry_refund',
  // Polls / Votes
  'poll_earning', 'poll_vote_cost', 'vote_fee',
  // Revenue / Payouts
  'tip_receive', 'scout_subscription_earning',
  'creator_fund_payout', 'ad_revenue_payout',
  'pbt_liquidation',
] as const;

export type CreditTxType = typeof ALL_CREDIT_TX_TYPES[number];

/**
 * Transaction types safe to show on another user's public profile.
 *
 * This whitelist must stay in sync with the DB RLS policy
 * `transactions_select_public_types` on the `transactions` table.
 *
 * Guiding principle (Anil 2026-04-08, answer 2B + Fantasy Ranking):
 *   - Trading actions (shows what the user is doing on the market)
 *   - Earned achievements (missions, streaks, bounties, research, tiers, welcome)
 *   - Fantasy results (shows fantasy ranking)
 *   - Public revenue streams (polls, tips, subscriptions, creator fund, ad revenue)
 *
 * NOT public:
 *   - `deposit` — wallet top-ups are private
 *   - `offer_lock` / `offer_unlock` — escrow internals
 *   - `bounty_cost` / `research_unlock` / `poll_vote_cost` / `vote_fee` / `entry_fee` — spending details are private
 */
export const PUBLIC_TX_TYPES: ReadonlySet<string> = new Set([
  // Trading
  'trade_buy', 'trade_sell', 'buy', 'sell', 'ipo_buy',
  'offer_buy', 'offer_sell',
  // Achievements
  'mission_reward', 'streak_reward', 'streak_bonus',
  'bounty_reward', 'research_earning',
  'tier_bonus', 'welcome_bonus',
  // Fantasy (Anil: Fantasy Ranking)
  'fantasy_reward', 'fantasy_join',
  // Revenue / Payouts
  'poll_earning', 'tip_receive',
  'scout_subscription_earning', 'creator_fund_payout', 'ad_revenue_payout',
  'pbt_liquidation',
]);

export function isPublicTxType(type: string): boolean {
  return PUBLIC_TX_TYPES.has(type);
}

/**
 * Filter groups for the TimelineTab UI.
 * Each group is a set of credit transaction types.
 *
 * NOTE: `credits` and `tickets` are currency-level filters (handled in UI).
 * These sub-filters apply to credits only.
 */
export const FILTER_TYPE_MAP: Record<'trades' | 'fantasy' | 'research' | 'rewards', ReadonlySet<string>> = {
  trades: new Set([
    'trade_buy', 'trade_sell', 'buy', 'sell', 'ipo_buy',
    'offer_buy', 'offer_sell',
  ]),
  fantasy: new Set([
    'fantasy_join', 'fantasy_reward', 'entry_fee', 'entry_refund',
  ]),
  research: new Set([
    'research_earning', 'research_unlock', 'mission_reward',
  ]),
  rewards: new Set([
    'bounty_reward', 'streak_reward', 'streak_bonus', 'poll_earning',
    'tip_receive', 'scout_subscription_earning', 'creator_fund_payout',
    'ad_revenue_payout', 'pbt_liquidation', 'tier_bonus', 'welcome_bonus',
  ]),
};
