-- Slice 396 Fix — transactions_type_check += 'fantasy_reward'
-- Vom force-rollback-Smoke aufgedeckt: score_event schreibt seit jeher 'fantasy_reward' bei der
-- Preis-Verteilung, der Wert fehlte aber im CHECK (latent, lief in Prod nie: alle Events prize_pool=0/tickets).
-- Gleiche Klasse wie event_entry_lock (B2). Für E-4a Settle (Gewinner-Auszahlung) zwingend.
-- 0 existierende Zeilen verletzen (verifiziert) → DROP/ADD safe.

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (ARRAY[
    'deposit','welcome_bonus','admin_adjustment','tier_bonus','trade_buy','trade_sell','ipo_buy',
    'order_cancel','offer_lock','offer_unlock','offer_execute','offer_sell','offer_buy','mission_reward',
    'streak_reward','liga_reward','mystery_box_reward','tip_send','tip_receive','subscription','founding_pass',
    'bounty_cost','bounty_reward','research_unlock','research_earn','referral_reward','poll_vote_cost','poll_earn',
    'withdrawal','vote_fee','ad_revenue_payout','creator_fund_payout','event_entry_unlock','scout_subscription',
    'scout_subscription_earning','pbt_liquidation','success_fee',
    'event_entry_lock','event_entry_charge','event_create_fee','fantasy_reward'
  ]::text[]));
