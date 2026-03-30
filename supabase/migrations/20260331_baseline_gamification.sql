-- =============================================================================
-- BASELINE SYNC: Gamification Domain Tables
-- Generated: 2026-03-31 from live Supabase DB (skzjfhvgccaeplydsunz)
-- Purpose: Document existing schema. DO NOT apply as migration — tables exist.
-- Scope: mission_definitions, user_missions, user_achievements,
--         achievement_definitions, user_streaks, dpc_mastery, score_road_claims,
--         score_road_config, streak_config, streak_milestones_claimed,
--         fan_rankings, rang_thresholds, elo_config, manager_points_config,
--         user_stats, airdrop_scores, score_events, score_history,
--         bescout_scores, scout_scores, daily_challenges, user_daily_challenges
-- =============================================================================

-- ---------------------------------------------------------------------------
-- achievement_definitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆'::text,
  featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  updated_by UUID
);

-- ---------------------------------------------------------------------------
-- airdrop_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.airdrop_scores (
  user_id UUID NOT NULL,
  trading_score INTEGER NOT NULL DEFAULT 0,
  content_score INTEGER NOT NULL DEFAULT 0,
  fantasy_score INTEGER NOT NULL DEFAULT 0,
  social_score INTEGER NOT NULL DEFAULT 0,
  activity_score INTEGER NOT NULL DEFAULT 0,
  referral_score INTEGER NOT NULL DEFAULT 0,
  trading_pnl_cents BIGINT NOT NULL DEFAULT 0,
  content_revenue_cents BIGINT NOT NULL DEFAULT 0,
  fantasy_earnings_cents BIGINT NOT NULL DEFAULT 0,
  fantasy_podiums INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  posts_upvotes INTEGER NOT NULL DEFAULT 0,
  active_days INTEGER NOT NULL DEFAULT 0,
  referral_count INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  tier TEXT NOT NULL DEFAULT 'bronze'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  founding_multiplier NUMERIC DEFAULT 1.0,
  mastery_score INTEGER NOT NULL DEFAULT 0,
  scout_rang_score INTEGER NOT NULL DEFAULT 0,
  abo_multiplier NUMERIC NOT NULL DEFAULT 1.0
);

-- ---------------------------------------------------------------------------
-- bescout_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bescout_scores (
  user_id UUID NOT NULL,
  arena_score INTEGER NOT NULL DEFAULT 0,
  club_score INTEGER NOT NULL DEFAULT 0,
  scout_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER,
  peak_score INTEGER NOT NULL DEFAULT 0,
  season_peak INTEGER NOT NULL DEFAULT 0,
  current_season INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- daily_challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  challenge_date DATE NOT NULL,
  question_type TEXT NOT NULL,
  question_de TEXT NOT NULL,
  question_tr TEXT,
  options JSONB NOT NULL,
  correct_option INTEGER,
  reward_correct INTEGER NOT NULL DEFAULT 20,
  reward_wrong INTEGER NOT NULL DEFAULT 5,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- dpc_mastery
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dpc_mastery (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  hold_days INTEGER NOT NULL DEFAULT 0,
  fantasy_uses INTEGER NOT NULL DEFAULT 0,
  content_count INTEGER NOT NULL DEFAULT 0,
  is_frozen BOOLEAN NOT NULL DEFAULT false,
  frozen_at TIMESTAMPTZ,
  first_acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- elo_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.elo_config (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  dimension TEXT NOT NULL,
  event_type TEXT NOT NULL,
  delta INTEGER NOT NULL,
  condition JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- fan_rankings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fan_rankings (
  user_id UUID NOT NULL,
  club_id UUID NOT NULL,
  rank_tier TEXT NOT NULL DEFAULT 'zuschauer'::text,
  csf_multiplier NUMERIC NOT NULL DEFAULT 1.00,
  event_score NUMERIC NOT NULL DEFAULT 0,
  dpc_score NUMERIC NOT NULL DEFAULT 0,
  abo_score NUMERIC NOT NULL DEFAULT 0,
  community_score NUMERIC NOT NULL DEFAULT 0,
  streak_score NUMERIC NOT NULL DEFAULT 0,
  total_score NUMERIC NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- manager_points_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manager_points_config (
  id INTEGER NOT NULL DEFAULT nextval('manager_points_config_id_seq'::regclass),
  max_percentile INTEGER,
  points INTEGER NOT NULL,
  label TEXT NOT NULL,
  small_event BOOLEAN NOT NULL DEFAULT false,
  max_rank INTEGER,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- mission_definitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.mission_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Zap'::text,
  target_value INTEGER NOT NULL DEFAULT 1,
  reward_cents BIGINT NOT NULL DEFAULT 0,
  tracking_type TEXT NOT NULL,
  tracking_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- rang_thresholds
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rang_thresholds (
  id INTEGER NOT NULL DEFAULT nextval('rang_thresholds_id_seq'::regclass),
  rang_key TEXT NOT NULL,
  rang_name TEXT NOT NULL,
  rang_i18n_key TEXT NOT NULL,
  tier_number INTEGER NOT NULL,
  min_score INTEGER NOT NULL,
  max_score INTEGER,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- score_events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.score_events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  source_id UUID,
  points INTEGER NOT NULL,
  component TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- score_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.score_history (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  dimension TEXT NOT NULL,
  delta INTEGER NOT NULL,
  score_before INTEGER NOT NULL,
  score_after INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  source_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- score_road_claims
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.score_road_claims (
  user_id UUID NOT NULL,
  milestone INTEGER NOT NULL,
  reward_bsd BIGINT NOT NULL DEFAULT 0,
  reward_type TEXT NOT NULL DEFAULT 'bsd'::text,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- score_road_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.score_road_config (
  id INTEGER NOT NULL DEFAULT nextval('score_road_config_id_seq'::regclass),
  score_threshold INTEGER NOT NULL,
  rang_name TEXT NOT NULL,
  rang_i18n_key TEXT NOT NULL,
  reward_cents BIGINT NOT NULL DEFAULT 0,
  reward_label TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- scout_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scout_scores (
  user_id UUID NOT NULL,
  trader_score INTEGER NOT NULL DEFAULT 500,
  manager_score INTEGER NOT NULL DEFAULT 500,
  analyst_score INTEGER NOT NULL DEFAULT 500,
  trader_peak INTEGER NOT NULL DEFAULT 500,
  manager_peak INTEGER NOT NULL DEFAULT 500,
  analyst_peak INTEGER NOT NULL DEFAULT 500,
  season_start_trader INTEGER NOT NULL DEFAULT 500,
  season_start_manager INTEGER NOT NULL DEFAULT 500,
  season_start_analyst INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- streak_config
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streak_config (
  id INTEGER NOT NULL DEFAULT nextval('streak_config_id_seq'::regclass),
  min_days INTEGER NOT NULL,
  daily_tickets INTEGER NOT NULL,
  fantasy_bonus_pct NUMERIC NOT NULL DEFAULT 0,
  elo_boost_pct NUMERIC NOT NULL DEFAULT 0,
  free_mystery_boxes_per_week INTEGER NOT NULL DEFAULT 0,
  mystery_box_ticket_discount INTEGER NOT NULL DEFAULT 0,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- streak_milestones_claimed
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streak_milestones_claimed (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  milestone INTEGER NOT NULL,
  reward_cents BIGINT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_achievements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_daily_challenges
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_daily_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL,
  selected_option INTEGER NOT NULL,
  is_correct BOOLEAN,
  tickets_awarded INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_missions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_missions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mission_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  target_value INTEGER NOT NULL,
  reward_cents BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'::text,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- user_stats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID NOT NULL,
  trading_score SMALLINT NOT NULL DEFAULT 0,
  manager_score SMALLINT NOT NULL DEFAULT 0,
  scout_score SMALLINT NOT NULL DEFAULT 0,
  total_score SMALLINT NOT NULL DEFAULT 0,
  trades_count INTEGER NOT NULL DEFAULT 0,
  trading_volume_cents BIGINT NOT NULL DEFAULT 0,
  portfolio_value_cents BIGINT NOT NULL DEFAULT 0,
  holdings_diversity INTEGER NOT NULL DEFAULT 0,
  events_count INTEGER NOT NULL DEFAULT 0,
  avg_rank NUMERIC NOT NULL DEFAULT 0,
  best_rank INTEGER NOT NULL DEFAULT 0,
  total_rewards_cents BIGINT NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  votes_cast INTEGER NOT NULL DEFAULT 0,
  achievements_count INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tier TEXT DEFAULT 'Rookie'::text,
  valuation_score NUMERIC DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- user_streaks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  shields_used INTEGER NOT NULL DEFAULT 0,
  shields_refreshed_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.airdrop_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bescout_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpc_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elo_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_points_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mission_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rang_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_road_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_road_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_milestones_claimed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
