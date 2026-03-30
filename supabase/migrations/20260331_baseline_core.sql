-- =============================================================================
-- BASELINE SYNC: Core Domain Tables
-- Generated: 2026-03-31 from live Supabase DB (skzjfhvgccaeplydsunz)
-- Purpose: Document existing schema. DO NOT apply as migration — tables exist.
-- Scope: players, profiles, wallets, holdings, orders, trades, transactions,
--         offers, ipos, ipo_purchases, clubs, club_admins, club_followers,
--         club_subscriptions, notifications
-- =============================================================================

-- ---------------------------------------------------------------------------
-- clubs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  league TEXT NOT NULL DEFAULT 'TFF 1. Lig'::text,
  country TEXT NOT NULL DEFAULT 'Türkiye'::text,
  city TEXT,
  stadium TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  plan TEXT NOT NULL DEFAULT 'pilot'::text,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  community_guidelines TEXT,
  active_gameweek INTEGER DEFAULT 1,
  league_id UUID,
  api_football_id INTEGER,
  treasury_balance_cents BIGINT NOT NULL DEFAULT 0,
  fantasy_entry_fee_cents BIGINT NOT NULL DEFAULT 0,
  fantasy_jurisdiction_preset TEXT NOT NULL DEFAULT 'TR'::text,
  fantasy_allow_entry_fees BOOLEAN NOT NULL DEFAULT false,
  referral_code TEXT
);

-- ---------------------------------------------------------------------------
-- club_admins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_admins (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- club_followers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  club_id UUID NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- club_subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.club_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  club_id UUID NOT NULL,
  tier TEXT NOT NULL,
  price_cents BIGINT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active'::text,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position TEXT NOT NULL,
  club TEXT NOT NULL DEFAULT 'Sakaryaspor'::text,
  age INTEGER,
  shirt_number INTEGER,
  nationality TEXT,
  image_url TEXT,
  matches INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  clean_sheets INTEGER NOT NULL DEFAULT 0,
  perf_l5 NUMERIC NOT NULL DEFAULT 50.00,
  perf_l15 NUMERIC NOT NULL DEFAULT 50.00,
  perf_season NUMERIC NOT NULL DEFAULT 50.00,
  dpc_total INTEGER NOT NULL DEFAULT 10000,
  dpc_available INTEGER NOT NULL DEFAULT 5000,
  floor_price BIGINT NOT NULL DEFAULT 10000,
  last_price BIGINT NOT NULL DEFAULT 10000,
  price_change_24h NUMERIC NOT NULL DEFAULT 0,
  volume_24h BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(20) DEFAULT 'fit'::character varying,
  ipo_price BIGINT NOT NULL DEFAULT 1000,
  club_id UUID,
  success_fee_cap_cents BIGINT,
  is_liquidated BOOLEAN NOT NULL DEFAULT false,
  api_football_id INTEGER,
  max_supply INTEGER NOT NULL DEFAULT 300,
  market_value_eur INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  total_saves INTEGER NOT NULL DEFAULT 0,
  contract_end DATE,
  fixture_api_football_id INTEGER,
  last_appearance_gw INTEGER DEFAULT 0,
  l5_appearances SMALLINT NOT NULL DEFAULT 0,
  l15_appearances SMALLINT NOT NULL DEFAULT 0,
  reference_price BIGINT,
  initial_listing_price BIGINT
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL,
  handle TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  favorite_club TEXT,
  language TEXT NOT NULL DEFAULT 'de'::text,
  plan TEXT NOT NULL DEFAULT 'Free'::text,
  level INTEGER NOT NULL DEFAULT 1,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  favorite_club_id UUID,
  top_role TEXT,
  referral_code TEXT,
  invited_by UUID,
  subscription_price_cents BIGINT,
  subscription_enabled BOOLEAN NOT NULL DEFAULT false,
  subscription_description TEXT,
  invited_by_club UUID,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  region TEXT
);

-- ---------------------------------------------------------------------------
-- wallets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID NOT NULL,
  balance BIGINT NOT NULL DEFAULT 1000000,
  locked_balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- holdings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  avg_buy_price BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID NOT NULL,
  side TEXT NOT NULL,
  price BIGINT NOT NULL,
  quantity INTEGER NOT NULL,
  filled_qty INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- ---------------------------------------------------------------------------
-- trades
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  buyer_id UUID NOT NULL,
  seller_id UUID,
  buy_order_id UUID,
  sell_order_id UUID,
  price BIGINT NOT NULL,
  quantity INTEGER NOT NULL,
  platform_fee BIGINT NOT NULL DEFAULT 0,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ipo_id UUID,
  pbt_fee BIGINT NOT NULL DEFAULT 0,
  club_fee BIGINT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- offers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  receiver_id UUID,
  side TEXT NOT NULL,
  price BIGINT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  counter_offer_id UUID,
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ipos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ipos (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'announced'::text,
  format TEXT NOT NULL DEFAULT 'fixed'::text,
  price BIGINT NOT NULL,
  price_min BIGINT,
  price_max BIGINT,
  tiers JSONB,
  total_offered INTEGER NOT NULL,
  sold INTEGER NOT NULL DEFAULT 0,
  max_per_user INTEGER NOT NULL DEFAULT 50,
  member_discount INTEGER NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + '14 days'::interval),
  early_access_ends_at TIMESTAMPTZ,
  season INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- ipo_purchases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ipo_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  ipo_id UUID NOT NULL,
  user_id UUID NOT NULL,
  quantity INTEGER NOT NULL,
  price BIGINT NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  platform_fee BIGINT NOT NULL DEFAULT 0,
  pbt_fee BIGINT NOT NULL DEFAULT 0,
  club_fee BIGINT NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  reference_id TEXT,
  reference_type TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ipo_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
