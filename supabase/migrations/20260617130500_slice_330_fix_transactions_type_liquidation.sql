-- Slice 330 (Prereq-Fix) — transactions_type_check fehlten 'pbt_liquidation' + 'success_fee'.
-- Befund während Slice-330-PROVE: liquidate_player schreibt diese beiden transactions.type seit
-- Slice 178 (April), aber der CHECK enthielt sie NIE → JEDE Liquidation mit PBT- oder CSF-Auszahlung
-- failt zur Laufzeit (23514). Latent, weil in der Beta noch nie eine echte Liquidation mit Holdern lief
-- (verifiziert: 0 Rows mit diesen Typen). Ohne diesen Fix kann der CSF-Pfad (Slice 330) nicht greifen.
-- Reine Werte-Erweiterung: alle bestehenden Rows bleiben gültig (nur 2 zusätzliche erlaubte Werte).

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (type = ANY (ARRAY[
  'deposit'::text, 'welcome_bonus'::text, 'admin_adjustment'::text, 'tier_bonus'::text,
  'trade_buy'::text, 'trade_sell'::text, 'ipo_buy'::text, 'order_cancel'::text,
  'offer_lock'::text, 'offer_unlock'::text, 'offer_execute'::text, 'offer_sell'::text,
  'mission_reward'::text, 'streak_reward'::text, 'liga_reward'::text, 'mystery_box_reward'::text,
  'tip_send'::text, 'tip_receive'::text, 'subscription'::text, 'founding_pass'::text,
  'bounty_cost'::text, 'bounty_reward'::text, 'research_unlock'::text, 'research_earn'::text,
  'referral_reward'::text, 'poll_vote_cost'::text, 'poll_earn'::text, 'withdrawal'::text,
  'vote_fee'::text, 'ad_revenue_payout'::text, 'creator_fund_payout'::text, 'event_entry_unlock'::text,
  'scout_subscription'::text, 'scout_subscription_earning'::text,
  -- Slice 330: Liquidations-Auszahlungstypen (von liquidate_player seit Slice 178 geschrieben):
  'pbt_liquidation'::text, 'success_fee'::text
]));
