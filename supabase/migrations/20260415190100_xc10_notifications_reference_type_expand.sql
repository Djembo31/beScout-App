-- XC-10 P1 FIX: notifications_reference_type_check war zu restriktiv.
-- E2E-Discovery: send_tip wirft mit reference_type='tip' CHECK-Violation.

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_reference_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_reference_type_check CHECK (
  reference_type = ANY (ARRAY[
    'research'::text, 'event'::text, 'profile'::text, 'poll'::text,
    'bounty'::text, 'player'::text, 'liquidation'::text, 'prediction'::text,
    'post'::text, 'ipo'::text, 'mission'::text,
    -- NEW (XC-10 Fix 2026-04-15):
    'tip'::text,              -- send_tip
    'subscription'::text,     -- subscribe_to_club / renew_club_subscription
    'trade'::text,            -- trades (post-execution notifications)
    'offer'::text,            -- create_offer, accept_offer, reject_offer
    'achievement'::text,      -- achievements unlock
    'equipment'::text,        -- equipment drops, equip-to-slot
    'cosmetic'::text,         -- cosmetic drops
    'referral'::text,         -- referral rewards
    'club'::text,             -- club-level notifications
    'system'::text            -- generic system notifications
  ])
);
