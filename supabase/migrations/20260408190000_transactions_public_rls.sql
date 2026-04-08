-- ================================================================
-- B3 Transactions History — Public Profile Timeline RLS
-- ================================================================
-- Allow cross-user read on the `transactions` table for a whitelisted
-- set of "public-safe" transaction types. This enables showing trading
-- activity, achievements, fantasy results, and public revenue on other
-- users' profiles (e.g. the Timeline tab on /profile/{handle}).
--
-- Private types (deposit, offer_lock/unlock, bounty_cost, research_unlock,
-- poll_vote_cost, vote_fee, entry_fee) remain owner-only.
--
-- WHITELIST SSOT: src/lib/transactionTypes.ts :: PUBLIC_TX_TYPES
-- Pattern: identical to activity_log feed RLS (20260408180000)
-- ================================================================

-- Replace old owner-only policy with two explicit policies
DROP POLICY IF EXISTS transactions_select ON public.transactions;

-- Policy 1: owner always sees their own transactions (all types)
CREATE POLICY "transactions_select_own"
ON public.transactions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: public-safe types are cross-user readable
CREATE POLICY "transactions_select_public_types"
ON public.transactions
FOR SELECT
USING (
  type = ANY(ARRAY[
    -- Trading (market activity visible to everyone)
    'trade_buy', 'trade_sell', 'buy', 'sell', 'ipo_buy',
    'offer_buy', 'offer_sell',
    -- Achievements (earned public progress)
    'mission_reward', 'streak_reward', 'streak_bonus',
    'bounty_reward', 'research_earning',
    'tier_bonus', 'welcome_bonus',
    -- Fantasy (ranking visibility)
    'fantasy_reward', 'fantasy_join',
    -- Revenue / payouts
    'poll_earning', 'tip_receive',
    'scout_subscription_earning', 'creator_fund_payout', 'ad_revenue_payout',
    'pbt_liquidation'
  ])
);

COMMENT ON POLICY "transactions_select_public_types" ON public.transactions IS
  'B3 Transactions History — allows cross-user reads of public-safe tx types for the Timeline tab on public profiles. Whitelist MUST match src/lib/transactionTypes.ts::PUBLIC_TX_TYPES. Pattern mirrors activity_log feed RLS (20260408180000).';

COMMENT ON POLICY "transactions_select_own" ON public.transactions IS
  'B3 Transactions History — owner always sees their own transactions (all types, including private like deposit, offer_lock).';
