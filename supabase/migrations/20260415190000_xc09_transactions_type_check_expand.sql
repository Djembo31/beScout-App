-- XC-09 P1 FIX: transactions_type_check war zu restriktiv — 7 Revenue/Engagement-RPCs
-- crashten mit CHECK-Violation (subscribe_to_club, renew_club_subscription,
-- grant_founding_pass, approve_bounty_submission, unlock_research, reward_referral,
-- cast_community_poll_vote).
--
-- E2E-Discovery 2026-04-15: subscribe_to_club INSERT transactions(type='subscription') crasht.
-- Audit via regex-match alle transactions-INSERTs aufgedeckt 7 RPCs mit non-allowed types.

ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check CHECK (
  type = ANY (ARRAY[
    -- Core Money Flow
    'deposit'::text, 'welcome_bonus'::text, 'admin_adjustment'::text, 'tier_bonus'::text,
    -- Trading
    'trade_buy'::text, 'trade_sell'::text, 'ipo_buy'::text, 'order_cancel'::text,
    -- P2P Offers
    'offer_lock'::text, 'offer_unlock'::text, 'offer_execute'::text, 'offer_sell'::text,
    -- Gamification
    'mission_reward'::text, 'streak_reward'::text, 'liga_reward'::text, 'mystery_box_reward'::text,
    -- Tips
    'tip_send'::text, 'tip_receive'::text,
    -- NEW (XC-09 Fix 2026-04-15):
    'subscription'::text,         -- subscribe_to_club, renew_club_subscription
    'founding_pass'::text,        -- grant_founding_pass
    'bounty_cost'::text,          -- approve_bounty_submission (creator zahlt)
    'bounty_reward'::text,        -- approve_bounty_submission (submitter verdient)
    'research_unlock'::text,      -- unlock_research (buyer zahlt)
    'research_earn'::text,        -- unlock_research (author verdient)
    'referral_reward'::text,      -- reward_referral
    'poll_vote_cost'::text,       -- cast_community_poll_vote (voter zahlt)
    'poll_earn'::text,            -- cast_community_poll_vote (creator verdient)
    'withdrawal'::text            -- club_withdrawal (future-proof)
  ])
);
