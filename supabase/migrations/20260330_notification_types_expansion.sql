-- Add new notification types: post_upvoted, ipo_purchase
-- Add new reference types: post, ipo

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY(ARRAY[
  'research_unlock','research_rating','follow','fantasy_reward','poll_vote','reply',
  'system','trade','bounty_submission','bounty_approved','bounty_rejected',
  'pbt_liquidation','offer_received','offer_accepted','offer_rejected','offer_countered',
  'dpc_of_week','tier_promotion','price_alert','mission_reward',
  'event_starting','event_closing_soon','event_scored',
  'bounty_expiring','new_ipo_available','referral_reward','tip_received',
  'subscription_new','creator_fund_payout','ad_revenue_payout',
  'achievement','level_up','rang_up','rang_down','mastery_level_up','prediction_resolved',
  'post_upvoted','ipo_purchase'
]::text[]));

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_reference_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_reference_type_check CHECK (
  reference_type = ANY(ARRAY[
    'research','event','profile','poll','bounty','player','liquidation','prediction',
    'post','ipo'
  ]::text[])
);
