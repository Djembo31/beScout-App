-- ============================================
-- Economy Config Tables — All hardcoded values → DB
-- ============================================
-- 5 tables: elo_config, rang_thresholds, score_road_config, manager_points_config, streak_config
-- All seeded with current hardcoded values as initial data.

-- ── 1. elo_config ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS elo_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dimension TEXT NOT NULL CHECK (dimension IN ('trader','manager','analyst')),
  event_type TEXT NOT NULL,
  delta INT NOT NULL,
  condition JSONB DEFAULT '{}' NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(dimension, event_type, condition)
);

ALTER TABLE elo_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY elo_config_select ON elo_config FOR SELECT TO authenticated USING (true);
CREATE POLICY elo_config_update ON elo_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
CREATE POLICY elo_config_insert ON elo_config FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));
CREATE POLICY elo_config_delete ON elo_config FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

INSERT INTO elo_config (dimension, event_type, delta, condition, description) VALUES
  -- Trader
  ('trader', 'trade_buy',          5,   '{}',                        'Basis-Punkte fuer Kauf'),
  ('trader', 'ipo_buy',           30,   '{}',                        'IPO Scout Bonus'),
  ('trader', 'trade_profit',      50,   '{"profit_pct_min": 50}',    'Profit >= 50%'),
  ('trader', 'trade_profit',      30,   '{"profit_pct_min": 20}',    'Profit >= 20%'),
  ('trader', 'trade_profit',      10,   '{"profit_pct_min": 5}',     'Profit >= 5%'),
  ('trader', 'trade_loss',         0,   '{"profit_pct_min": -5}',    'Break-even (-5% bis +5%)'),
  ('trader', 'trade_loss',       -10,   '{"profit_pct_min": -20}',   'Loss -5% bis -20%'),
  ('trader', 'trade_loss',       -30,   '{}',                        'Loss > -20%'),
  ('trader', 'panic_sell_penalty',-20,   '{"hold_hours_max": 24}',   'Verkauf < 24h bei Verlust'),
  -- Analyst
  ('analyst', 'post_create',       3,   '{}',                        'Post erstellt'),
  ('analyst', 'research_create',   3,   '{}',                        'Research ohne Evaluation'),
  ('analyst', 'research_create_eval', 5, '{}',                       'Research mit Evaluation'),
  ('analyst', 'research_sold',     5,   '{}',                        'Research freigeschaltet'),
  ('analyst', 'post_upvote',       1,   '{}',                        'Upvote erhalten'),
  ('analyst', 'post_excessive_downvotes', -2, '{"downvote_count_min": 3}', '>3 Downvotes auf Post'),
  ('analyst', 'new_follower',      2,   '{}',                        'Neuer Follower'),
  -- Manager
  ('manager', 'absent_penalty',   -8,   '{}',                        'Event verpasst'),
  ('manager', 'captains_call',    15,   '{}',                        'Captain ist Top-Scorer');

-- ── 2. rang_thresholds ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rang_thresholds (
  id SERIAL PRIMARY KEY,
  rang_key TEXT NOT NULL UNIQUE,
  rang_name TEXT NOT NULL,
  rang_i18n_key TEXT NOT NULL,
  tier_number INT NOT NULL UNIQUE,
  min_score INT NOT NULL,
  max_score INT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE rang_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY rang_thresholds_select ON rang_thresholds FOR SELECT TO authenticated USING (true);
CREATE POLICY rang_thresholds_update ON rang_thresholds FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

INSERT INTO rang_thresholds (rang_key, rang_name, rang_i18n_key, tier_number, min_score, max_score) VALUES
  ('bronze_1',  'Bronze I',   'bronzeI',    1,    0,    349),
  ('bronze_2',  'Bronze II',  'bronzeII',   2,  350,    699),
  ('bronze_3',  'Bronze III', 'bronzeIII',  3,  700,    999),
  ('silber_1',  'Silber I',   'silberI',    4, 1000,   1299),
  ('silber_2',  'Silber II',  'silberII',   5, 1300,   1599),
  ('silber_3',  'Silber III', 'silberIII',  6, 1600,   1899),
  ('gold_1',    'Gold I',     'goldI',      7, 1900,   2199),
  ('gold_2',    'Gold II',    'goldII',     8, 2200,   2599),
  ('gold_3',    'Gold III',   'goldIII',    9, 2600,   2999),
  ('diamant',   'Diamant',    'diamant',   10, 3000,   3499),
  ('mythisch',  'Mythisch',   'mythisch',  11, 3500,   4999),
  ('legendaer', 'Legendaer',  'legendaer', 12, 5000,   NULL);

-- ── 3. score_road_config ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS score_road_config (
  id SERIAL PRIMARY KEY,
  score_threshold INT NOT NULL UNIQUE,
  rang_name TEXT NOT NULL,
  rang_i18n_key TEXT NOT NULL,
  reward_cents BIGINT NOT NULL DEFAULT 0,
  reward_label TEXT NOT NULL,
  reward_type TEXT NOT NULL CHECK (reward_type IN ('bsd','cosmetic','both')),
  sort_order INT NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE score_road_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY score_road_config_select ON score_road_config FOR SELECT TO authenticated USING (true);
CREATE POLICY score_road_config_update ON score_road_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

INSERT INTO score_road_config (score_threshold, rang_name, rang_i18n_key, reward_cents, reward_label, reward_type, sort_order) VALUES
  ( 350, 'Bronze II',  'bronzeII',   20000,   '200 CR',                          'bsd',      1),
  ( 700, 'Bronze III', 'bronzeIII',      0,   'Bronze-Rahmen',                   'cosmetic', 2),
  (1000, 'Silber I',   'silberI',    50000,   '500 CR',                          'bsd',      3),
  (1300, 'Silber II',  'silberII',       0,   '"Scout" Titel',                   'cosmetic', 4),
  (1600, 'Silber III', 'silberIII', 100000,   '1.000 CR',                        'bsd',      5),
  (1900, 'Gold I',     'goldI',          0,   'Gold-Rahmen',                     'cosmetic', 6),
  (2200, 'Gold II',    'goldII',    200000,   '2.000 CR',                        'bsd',      7),
  (2600, 'Gold III',   'goldIII',        0,   '"Stratege" Titel',                'cosmetic', 8),
  (3000, 'Diamant',    'diamant',   500000,   'Diamant-Rahmen + 5.000 CR',       'both',     9),
  (3500, 'Mythisch',   'mythisch',  750000,   'Mythisch-Avatar + 7.500 CR',      'both',    10),
  (5000, 'Legendaer',  'legendaer',2000000,   'Legendaer-Set + 20.000 CR',       'both',    11);

-- ── 4. manager_points_config ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS manager_points_config (
  id SERIAL PRIMARY KEY,
  max_percentile INT,
  points INT NOT NULL,
  label TEXT NOT NULL,
  small_event BOOLEAN NOT NULL DEFAULT false,
  max_rank INT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(COALESCE(max_percentile, -1), small_event, COALESCE(max_rank, -1))
);

ALTER TABLE manager_points_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY manager_points_config_select ON manager_points_config FOR SELECT TO authenticated USING (true);
CREATE POLICY manager_points_config_update ON manager_points_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

-- Normal events (>= 20 participants) — percentile-based
INSERT INTO manager_points_config (max_percentile, points, label, small_event) VALUES
  (  1,  50, 'Top 1%',     false),
  (  5,  40, 'Top 5%',     false),
  ( 10,  30, 'Top 10%',    false),
  ( 25,  20, 'Top 25%',    false),
  ( 50,  10, 'Top 50%',    false),
  ( 75,   0, 'Top 75%',    false),
  ( 90, -10, '75-90%',     false),
  (100, -25, 'Bottom 10%', false);

-- Small events (< 20 participants) — rank-based
INSERT INTO manager_points_config (max_rank, points, label, small_event) VALUES
  ( 1, 50, 'Platz 1',  true),
  ( 2, 40, 'Platz 2',  true),
  ( 3, 30, 'Platz 3',  true),
  ( 5, 20, 'Top 5',    true),
  (10, 10, 'Top 10',   true),
  (15,  0, 'Top 15',   true),
  (20,  0, 'Top 20',   true);

-- ── 5. streak_config ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streak_config (
  id SERIAL PRIMARY KEY,
  min_days INT NOT NULL UNIQUE,
  daily_tickets INT NOT NULL,
  fantasy_bonus_pct NUMERIC(5,4) NOT NULL DEFAULT 0,
  elo_boost_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  free_mystery_boxes_per_week INT NOT NULL DEFAULT 0,
  mystery_box_ticket_discount INT NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE streak_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY streak_config_select ON streak_config FOR SELECT TO authenticated USING (true);
CREATE POLICY streak_config_update ON streak_config FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()));

INSERT INTO streak_config (min_days, daily_tickets, fantasy_bonus_pct, elo_boost_pct, free_mystery_boxes_per_week, mystery_box_ticket_discount) VALUES
  (90, 40, 0.15, 10, 1, 1),
  (60, 30, 0.15, 10, 1, 1),
  (30, 25, 0.05, 10, 1, 1),
  (14, 20, 0.05, 10, 0, 1),
  ( 7, 15, 0.05,  0, 0, 1),
  ( 4, 10, 0,     0, 0, 1),
  ( 0,  5, 0,     0, 0, 0);
