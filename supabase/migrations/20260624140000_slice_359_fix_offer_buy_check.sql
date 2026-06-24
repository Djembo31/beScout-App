-- Slice 359 — accept_offer side='sell' reparieren: 'offer_buy' in transactions_type_check.
-- Pre-existing Bug (S330-Klasse, aus 358-Money-Smoke): accept_offer schreibt im side='sell'-Zweig
-- type='offer_buy', aber der CHECK kannte den Wert nie → jeder Sell-Offer-Accept warf 23514.
-- Additiv: neuer Wertebereich = Superset des alten → bestehende Rows alle valide.
-- Voller Live-pg_get_constraintdef (36 Werte) als Baseline + 'offer_buy' = 37.

ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type = ANY (ARRAY[
  'deposit'::text, 'welcome_bonus'::text, 'admin_adjustment'::text, 'tier_bonus'::text,
  'trade_buy'::text, 'trade_sell'::text, 'ipo_buy'::text, 'order_cancel'::text,
  'offer_lock'::text, 'offer_unlock'::text, 'offer_execute'::text, 'offer_sell'::text, 'offer_buy'::text,
  'mission_reward'::text, 'streak_reward'::text, 'liga_reward'::text,
  'mystery_box_reward'::text, 'tip_send'::text, 'tip_receive'::text,
  'subscription'::text, 'founding_pass'::text, 'bounty_cost'::text, 'bounty_reward'::text,
  'research_unlock'::text, 'research_earn'::text, 'referral_reward'::text,
  'poll_vote_cost'::text, 'poll_earn'::text, 'withdrawal'::text,
  'vote_fee'::text, 'ad_revenue_payout'::text, 'creator_fund_payout'::text,
  'event_entry_unlock'::text, 'scout_subscription'::text, 'scout_subscription_earning'::text,
  'pbt_liquidation'::text, 'success_fee'::text
]));
