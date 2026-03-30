-- =============================================================================
-- BASELINE SYNC: Fantasy Domain Tables
-- Generated: 2026-03-31 from live Supabase DB (skzjfhvgccaeplydsunz)
-- Purpose: Document existing schema. DO NOT apply as migration — tables exist.
-- Scope: events, event_entries, lineups, fantasy_leagues,
--         fantasy_league_members, leagues, fixtures, fixture_player_stats,
--         fixture_substitutions, player_gameweek_scores, user_wildcards,
--         wildcard_transactions, chip_usages, arena_seasons
-- =============================================================================

-- ---------------------------------------------------------------------------
-- arena_seasons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arena_seasons (
  id INTEGER NOT NULL DEFAULT nextval('arena_seasons_id_seq'::regclass),
  season_num INTEGER NOT NULL,
  name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- chip_usages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chip_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  chip_type TEXT NOT NULL,
  ticket_cost INTEGER NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bescout'::text,
  status TEXT NOT NULL DEFAULT 'upcoming'::text,
  format TEXT NOT NULL DEFAULT '6er'::text,
  gameweek INTEGER,
  entry_fee BIGINT NOT NULL DEFAULT 0,
  prize_pool BIGINT NOT NULL DEFAULT 0,
  max_entries INTEGER,
  current_entries INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL,
  locks_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  club_id UUID,
  tier_bonuses JSONB DEFAULT '{"good": 100, "strong": 300, "decisive": 500}'::jsonb,
  min_tier TEXT,
  sponsor_name TEXT,
  sponsor_logo TEXT,
  event_tier TEXT NOT NULL DEFAULT 'club'::text,
  min_subscription_tier TEXT,
  salary_cap BIGINT,
  reward_structure JSONB,
  scope TEXT NOT NULL DEFAULT 'global'::text,
  lineup_size INTEGER NOT NULL DEFAULT 11,
  ticket_cost INTEGER DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'tickets'::text,
  min_sc_per_slot SMALLINT NOT NULL DEFAULT 1,
  wildcards_allowed BOOLEAN NOT NULL DEFAULT false,
  max_wildcards_per_lineup SMALLINT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- event_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.event_entries (
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  currency TEXT NOT NULL,
  amount_locked BIGINT NOT NULL DEFAULT 0,
  fee_split JSONB,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- fantasy_leagues
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fantasy_leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL,
  invite_code TEXT NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'::text),
  max_members INTEGER NOT NULL DEFAULT 20,
  season TEXT NOT NULL DEFAULT '2025-26'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- fantasy_league_members
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fantasy_league_members (
  league_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- fixtures
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixtures (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  gameweek INTEGER NOT NULL,
  home_club_id UUID NOT NULL,
  away_club_id UUID NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled'::text,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  league_id UUID,
  api_fixture_id INTEGER,
  home_formation VARCHAR(10) DEFAULT NULL::character varying,
  away_formation VARCHAR(10) DEFAULT NULL::character varying
);

-- ---------------------------------------------------------------------------
-- fixture_player_stats
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixture_player_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL,
  player_id UUID,
  club_id UUID NOT NULL,
  minutes_played INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  clean_sheet BOOLEAN DEFAULT false,
  goals_conceded INTEGER DEFAULT 0,
  yellow_card BOOLEAN DEFAULT false,
  red_card BOOLEAN DEFAULT false,
  saves INTEGER DEFAULT 0,
  bonus INTEGER DEFAULT 0,
  fantasy_points INTEGER DEFAULT 0,
  rating NUMERIC,
  match_position VARCHAR(3) DEFAULT NULL::character varying,
  is_starter BOOLEAN DEFAULT false,
  grid_position TEXT,
  api_football_player_id INTEGER,
  player_name_api TEXT
);

-- ---------------------------------------------------------------------------
-- fixture_substitutions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fixture_substitutions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  fixture_id UUID NOT NULL,
  club_id UUID NOT NULL,
  minute INTEGER NOT NULL,
  extra_minute INTEGER,
  player_in_id UUID,
  player_out_id UUID,
  player_in_api_id INTEGER NOT NULL,
  player_out_api_id INTEGER NOT NULL,
  player_in_name TEXT NOT NULL,
  player_out_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- leagues
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Türkiye'::text,
  season TEXT NOT NULL DEFAULT '2025-26'::text,
  logo_url TEXT,
  active_gameweek INTEGER NOT NULL DEFAULT 1,
  max_gameweeks INTEGER NOT NULL DEFAULT 38,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- lineups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lineups (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  slot_gk UUID,
  slot_def1 UUID,
  slot_def2 UUID,
  slot_mid1 UUID,
  slot_mid2 UUID,
  slot_att UUID,
  total_score NUMERIC,
  rank INTEGER,
  reward_amount BIGINT NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked BOOLEAN NOT NULL DEFAULT false,
  formation TEXT DEFAULT '1-2-2-1'::text,
  slot_scores JSONB,
  captain_slot TEXT,
  synergy_bonus_pct NUMERIC DEFAULT 0,
  synergy_details JSONB,
  slot_def3 UUID,
  slot_def4 UUID,
  slot_mid3 UUID,
  slot_mid4 UUID,
  slot_att2 UUID,
  slot_att3 UUID,
  wildcard_slots TEXT[] NOT NULL DEFAULT '{}'::text[],
  streak_bonus_pct NUMERIC DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- player_gameweek_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.player_gameweek_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  gameweek INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- user_wildcards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_wildcards (
  user_id UUID NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  earned_total INTEGER NOT NULL DEFAULT 0,
  spent_total INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- wildcard_transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wildcard_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  source TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.arena_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chip_usages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fantasy_league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixture_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixture_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_gameweek_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wildcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wildcard_transactions ENABLE ROW LEVEL SECURITY;
