-- =============================================================================
-- BASELINE SYNC: Platform / Infrastructure Tables
-- Generated: 2026-03-31 from live Supabase DB (skzjfhvgccaeplydsunz)
-- Purpose: Document existing schema. DO NOT apply as migration — tables exist.
-- Scope: notification_preferences, push_subscriptions, user_follows,
--         user_founding_passes, welcome_bonus_claims, user_tickets,
--         ticket_transactions, mystery_box_results, watchlist, activity_log,
--         club_votes, club_withdrawals, cron_sync_log, player_external_ids,
--         club_external_ids, platform_admins, geofencing_config, sponsors,
--         sponsor_impressions, sponsor_stats, dpc_of_the_week,
--         player_fair_values, player_valuations, verified_scouts,
--         scout_assignments, scout_subscriptions, scout_mission_definitions,
--         user_scout_missions, mentorships, mentorship_milestones,
--         user_mentorship_progress, cosmetic_definitions,
--         cosmetic_shop_listings, user_cosmetics, creator_config,
--         creator_fund_payouts, holding_locks, event_fee_config, fee_config,
--         pbt_treasury, pbt_transactions, platform_settings, founder_clubs
-- =============================================================================

-- ---------------------------------------------------------------------------
-- activity_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT,
  action TEXT NOT NULL,
  category TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- club_external_ids
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_external_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- club_votes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  club_name TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'::text,
  total_votes INTEGER NOT NULL DEFAULT 0,
  cost_bsd BIGINT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  club_id UUID
);

-- ---------------------------------------------------------------------------
-- club_withdrawals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  amount_cents BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cosmetic_definitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cosmetic_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rarity TEXT NOT NULL,
  css_class TEXT,
  metadata JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cosmetic_shop_listings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cosmetic_shop_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  cosmetic_id UUID NOT NULL,
  price_tickets INTEGER NOT NULL,
  stock_limit INTEGER,
  stock_sold INTEGER DEFAULT 0,
  available_from TIMESTAMPTZ DEFAULT now(),
  available_until TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- creator_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_config (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- creator_fund_payouts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_fund_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payout_type TEXT NOT NULL DEFAULT 'creator_fund'::text,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  impression_count BIGINT NOT NULL,
  impression_share_pct NUMERIC NOT NULL,
  pool_total_cents BIGINT NOT NULL,
  payout_cents BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- cron_sync_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cron_sync_log (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gameweek INTEGER NOT NULL,
  step TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'started'::text,
  details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- dpc_of_the_week
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dpc_of_the_week (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  gameweek INTEGER NOT NULL,
  score INTEGER NOT NULL,
  holder_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- event_fee_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_fee_config (
  event_type TEXT NOT NULL,
  platform_pct SMALLINT NOT NULL DEFAULT 500,
  beneficiary_pct SMALLINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

-- ---------------------------------------------------------------------------
-- fee_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_config (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  club_name TEXT,
  trade_fee_bps SMALLINT NOT NULL DEFAULT 500,
  trade_platform_bps SMALLINT NOT NULL DEFAULT 350,
  trade_pbt_bps SMALLINT NOT NULL DEFAULT 150,
  trade_club_bps SMALLINT NOT NULL DEFAULT 0,
  ipo_club_bps SMALLINT NOT NULL DEFAULT 8500,
  ipo_platform_bps SMALLINT NOT NULL DEFAULT 1000,
  ipo_pbt_bps SMALLINT NOT NULL DEFAULT 500,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  club_id UUID,
  abo_discount_bronze_bps INTEGER NOT NULL DEFAULT 50,
  abo_discount_silber_bps INTEGER NOT NULL DEFAULT 100,
  abo_discount_gold_bps INTEGER NOT NULL DEFAULT 150,
  offer_platform_bps SMALLINT NOT NULL DEFAULT 200,
  offer_pbt_bps SMALLINT NOT NULL DEFAULT 50,
  offer_club_bps SMALLINT NOT NULL DEFAULT 50
);

-- ---------------------------------------------------------------------------
-- founder_clubs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.founder_clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  tier TEXT NOT NULL,
  shares INTEGER NOT NULL,
  price_eur_cents BIGINT NOT NULL,
  payment_reference TEXT,
  pool_balance_cents BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- geofencing_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geofencing_config (
  feature TEXT NOT NULL,
  region TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT true,
  note TEXT
);

-- ---------------------------------------------------------------------------
-- holding_locks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holding_locks (
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  event_id UUID NOT NULL,
  quantity_locked SMALLINT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- mentorships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorships (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL,
  mentee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'::text,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- mentorship_milestones
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mentorship_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  phase TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria JSONB NOT NULL,
  reward_mentor_cents BIGINT NOT NULL DEFAULT 200,
  reward_mentee_cents BIGINT NOT NULL DEFAULT 300,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- mystery_box_results
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mystery_box_results (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  rarity TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  tickets_amount INTEGER,
  cosmetic_id UUID,
  ticket_cost INTEGER NOT NULL DEFAULT 15,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID NOT NULL,
  trading BOOLEAN NOT NULL DEFAULT true,
  offers BOOLEAN NOT NULL DEFAULT true,
  fantasy BOOLEAN NOT NULL DEFAULT true,
  social BOOLEAN NOT NULL DEFAULT true,
  bounties BOOLEAN NOT NULL DEFAULT true,
  rewards BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- pbt_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pbt_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  source TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  trade_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- pbt_treasury
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pbt_treasury (
  player_id UUID NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  trading_inflow BIGINT NOT NULL DEFAULT 0,
  ipo_inflow BIGINT NOT NULL DEFAULT 0,
  votes_inflow BIGINT NOT NULL DEFAULT 0,
  content_inflow BIGINT NOT NULL DEFAULT 0,
  last_inflow_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- platform_admins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- platform_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT 'false'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- player_external_ids
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_external_ids (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- player_fair_values
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_fair_values (
  player_id UUID NOT NULL,
  median_cents BIGINT NOT NULL DEFAULT 0,
  mean_cents BIGINT NOT NULL DEFAULT 0,
  std_dev_cents BIGINT NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- player_valuations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  estimated_cents BIGINT NOT NULL,
  gameweek INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- scout_assignments
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scout_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  scout_id UUID NOT NULL,
  club_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  target_criteria JSONB,
  status TEXT NOT NULL DEFAULT 'active'::text,
  reward_cents BIGINT DEFAULT 0,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- scout_mission_definitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scout_mission_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  criteria JSONB NOT NULL,
  reward_cents BIGINT NOT NULL DEFAULT 500,
  difficulty TEXT NOT NULL DEFAULT 'easy'::text,
  min_tier TEXT,
  max_completions INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- scout_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scout_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL,
  scout_id UUID NOT NULL,
  price_cents BIGINT NOT NULL,
  scout_earned_cents BIGINT NOT NULL,
  platform_fee_cents BIGINT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sponsor_impressions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsor_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL,
  placement TEXT NOT NULL,
  context_author_ids UUID[] DEFAULT '{}'::uuid[],
  viewer_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sponsor_stats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsor_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL,
  placement TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- sponsors
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  link_url TEXT,
  placement TEXT NOT NULL,
  club_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revenue_cents_per_impression BIGINT
);

-- ---------------------------------------------------------------------------
-- ticket_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ticket_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  source TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_cosmetics
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_cosmetics (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cosmetic_id UUID NOT NULL,
  source TEXT NOT NULL,
  equipped BOOLEAN NOT NULL DEFAULT false,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_follows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_founding_passes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_founding_passes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tier TEXT NOT NULL,
  price_eur_cents INTEGER NOT NULL,
  bcredits_granted BIGINT NOT NULL,
  migration_bonus_pct INTEGER NOT NULL,
  payment_reference TEXT,
  granted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pass_number INTEGER NOT NULL DEFAULT nextval('founding_pass_number_seq'::regclass)
);

-- ---------------------------------------------------------------------------
-- user_mentorship_progress
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_mentorship_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  mentorship_id UUID NOT NULL,
  milestone_id UUID NOT NULL,
  completed BOOLEAN DEFAULT false,
  claimed_mentor BOOLEAN DEFAULT false,
  claimed_mentee BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_scout_missions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_scout_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_id UUID NOT NULL,
  gameweek INTEGER NOT NULL,
  submitted_player_id UUID,
  status TEXT NOT NULL DEFAULT 'active'::text,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_tickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_tickets (
  user_id UUID NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0,
  earned_total BIGINT NOT NULL DEFAULT 0,
  spent_total BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- verified_scouts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verified_scouts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  club_id UUID NOT NULL,
  verified_at TIMESTAMPTZ DEFAULT now(),
  verified_by UUID,
  specialty TEXT,
  badge_level TEXT NOT NULL DEFAULT 'bronze'::text,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- watchlist
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  alert_threshold_pct NUMERIC DEFAULT 5.0,
  alert_direction TEXT DEFAULT 'both'::text,
  last_alert_price BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- welcome_bonus_claims
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.welcome_bonus_claims (
  user_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL DEFAULT 100000,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cosmetic_shop_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_fund_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cron_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpc_of_the_week ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.geofencing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holding_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mystery_box_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pbt_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_external_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_fair_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_mission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cosmetics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_founding_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mentorship_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scout_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.welcome_bonus_claims ENABLE ROW LEVEL SECURITY;
