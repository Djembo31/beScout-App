-- =============================================================================
-- BASELINE SYNC: Community Domain Tables
-- Generated: 2026-03-31 from live Supabase DB (skzjfhvgccaeplydsunz)
-- Purpose: Document existing schema. DO NOT apply as migration — tables exist.
-- Scope: posts, post_votes, research_posts, research_ratings, research_unlocks,
--         bounties, bounty_submissions, community_polls, community_poll_votes,
--         content_reports, content_impressions, vote_entries, tips, predictions,
--         feedback
-- =============================================================================

-- ---------------------------------------------------------------------------
-- bounties
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bounties (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL,
  club_name TEXT NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_cents BIGINT NOT NULL,
  deadline_at TIMESTAMPTZ NOT NULL,
  max_submissions INTEGER NOT NULL DEFAULT 1,
  player_id UUID,
  position TEXT,
  status TEXT NOT NULL DEFAULT 'open'::text,
  submission_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  min_tier TEXT,
  type TEXT NOT NULL DEFAULT 'general'::text,
  fixture_id UUID,
  is_user_bounty BOOLEAN DEFAULT false
);

-- ---------------------------------------------------------------------------
-- bounty_submissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bounty_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  bounty_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  admin_feedback TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  reward_paid BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evaluation JSONB
);

-- ---------------------------------------------------------------------------
-- community_polls
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_polls (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  question TEXT NOT NULL,
  description TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active'::text,
  total_votes INTEGER NOT NULL DEFAULT 0,
  cost_bsd BIGINT NOT NULL DEFAULT 0,
  creator_earned BIGINT NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  club_id UUID
);

-- ---------------------------------------------------------------------------
-- community_poll_votes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  amount_paid BIGINT NOT NULL DEFAULT 0,
  creator_share BIGINT NOT NULL DEFAULT 0,
  platform_share BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- content_impressions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_impressions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  author_id UUID NOT NULL,
  viewer_id UUID,
  impression_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- content_reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- feedback
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT,
  status TEXT DEFAULT 'new'::text
);

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID,
  club_name TEXT,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  replies_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  parent_id UUID,
  category TEXT DEFAULT 'Meinung'::text,
  club_id UUID,
  post_type TEXT DEFAULT 'general'::text,
  rumor_source TEXT,
  rumor_club_target TEXT,
  event_id UUID,
  is_exclusive BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT
);

-- ---------------------------------------------------------------------------
-- post_votes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  vote_type SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- predictions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fixture_id UUID NOT NULL,
  gameweek INTEGER NOT NULL,
  prediction_type TEXT NOT NULL,
  player_id UUID,
  condition TEXT NOT NULL,
  predicted_value TEXT NOT NULL,
  confidence INTEGER NOT NULL,
  difficulty NUMERIC NOT NULL DEFAULT 1.0,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  actual_value TEXT,
  points_awarded NUMERIC DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- research_posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  player_id UUID,
  club_name TEXT,
  title TEXT NOT NULL,
  preview TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}'::text[],
  call TEXT NOT NULL,
  horizon TEXT NOT NULL,
  price BIGINT NOT NULL,
  unlock_count INTEGER DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  ratings_count INTEGER DEFAULT 0,
  avg_rating NUMERIC DEFAULT 0,
  price_at_creation BIGINT DEFAULT 0,
  price_at_resolution BIGINT,
  outcome TEXT,
  price_change_pct NUMERIC,
  resolved_at TIMESTAMPTZ,
  category TEXT NOT NULL DEFAULT 'Spieler-Analyse'::text,
  club_id UUID,
  is_exclusive BOOLEAN NOT NULL DEFAULT false,
  evaluation JSONB,
  fixture_id UUID
);

-- ---------------------------------------------------------------------------
-- research_ratings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating SMALLINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- research_unlocks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.research_unlocks (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount_paid BIGINT NOT NULL,
  author_earned BIGINT NOT NULL,
  platform_fee BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- tips
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tips (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  amount_cents BIGINT NOT NULL,
  platform_fee_cents BIGINT NOT NULL,
  receiver_earned_cents BIGINT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- vote_entries
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vote_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  vote_id UUID NOT NULL,
  user_id UUID NOT NULL,
  option_index SMALLINT NOT NULL,
  amount_paid BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  weight SMALLINT NOT NULL DEFAULT 1
);

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bounty_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vote_entries ENABLE ROW LEVEL SECURITY;
