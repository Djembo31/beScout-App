-- ============================================
-- BeScout Liga: Saison-Modell + Monats-Sieger
-- ============================================

-- 1. Liga Seasons (Fussball-Saison Aug-Mai)
CREATE TABLE IF NOT EXISTS liga_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                    -- e.g. "2025/26"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT liga_seasons_dates_check CHECK (end_date > start_date)
);

ALTER TABLE liga_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liga_seasons_select_all" ON liga_seasons
  FOR SELECT USING (true);

-- 2. Monthly Liga Snapshots (score delta per user per month)
CREATE TABLE IF NOT EXISTS monthly_liga_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,                   -- first day of month, e.g. '2026-04-01'
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dimension TEXT NOT NULL CHECK (dimension IN ('trader', 'manager', 'analyst', 'overall')),
  score_delta INTEGER NOT NULL DEFAULT 0,
  final_score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, user_id, dimension)
);

ALTER TABLE monthly_liga_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_liga_snapshots_select_all" ON monthly_liga_snapshots
  FOR SELECT USING (true);

CREATE INDEX idx_monthly_liga_snapshots_month_dim ON monthly_liga_snapshots (month, dimension);
CREATE INDEX idx_monthly_liga_snapshots_user ON monthly_liga_snapshots (user_id);

-- 3. Monthly Liga Winners (top 3 per dimension per month)
CREATE TABLE IF NOT EXISTS monthly_liga_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  dimension TEXT NOT NULL CHECK (dimension IN ('trader', 'manager', 'analyst', 'overall')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 3),
  reward_cents BIGINT NOT NULL DEFAULT 0,
  badge_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (month, dimension, rank)
);

ALTER TABLE monthly_liga_winners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_liga_winners_select_all" ON monthly_liga_winners
  FOR SELECT USING (true);

CREATE INDEX idx_monthly_liga_winners_month ON monthly_liga_winners (month);

-- 4. Seed: Current Season 2025/26
INSERT INTO liga_seasons (name, start_date, end_date, is_active)
VALUES ('2025/26', '2025-08-01', '2026-05-31', true)
ON CONFLICT DO NOTHING;

-- 5. RPC: get_current_liga_season
CREATE OR REPLACE FUNCTION get_current_liga_season()
RETURNS TABLE (
  id UUID,
  name TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT id, name, start_date, end_date, is_active
  FROM liga_seasons
  WHERE is_active = true
  LIMIT 1;
$$;

-- 6. RPC: get_monthly_liga_winners
CREATE OR REPLACE FUNCTION get_monthly_liga_winners(
  p_month DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 12
)
RETURNS TABLE (
  month DATE,
  dimension TEXT,
  user_id UUID,
  rank INTEGER,
  reward_cents BIGINT,
  badge_key TEXT,
  handle TEXT,
  display_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    w.month, w.dimension, w.user_id, w.rank, w.reward_cents, w.badge_key,
    p.handle, p.display_name, p.avatar_url
  FROM monthly_liga_winners w
  JOIN profiles p ON p.id = w.user_id
  WHERE (p_month IS NULL OR w.month = p_month)
  ORDER BY w.month DESC, w.dimension, w.rank
  LIMIT p_limit;
$$;

-- 7. RPC: close_monthly_liga — snapshots scores + picks top 3 per dimension
CREATE OR REPLACE FUNCTION close_monthly_liga(p_month DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_season liga_seasons%ROWTYPE;
  v_count INTEGER := 0;
  v_dim TEXT;
  v_dims TEXT[] := ARRAY['trader', 'manager', 'analyst', 'overall'];
  v_reward_1 BIGINT := 500000;   -- 5,000 $SCOUT for #1
  v_reward_2 BIGINT := 250000;   -- 2,500 $SCOUT for #2
  v_reward_3 BIGINT := 100000;   -- 1,000 $SCOUT for #3
BEGIN
  -- Get active season
  SELECT * INTO v_season FROM liga_seasons WHERE is_active = true LIMIT 1;
  IF v_season.id IS NULL THEN
    RETURN jsonb_build_object('error', 'no_active_season');
  END IF;

  -- Prevent duplicate close
  IF EXISTS (SELECT 1 FROM monthly_liga_snapshots WHERE month = p_month LIMIT 1) THEN
    RETURN jsonb_build_object('error', 'month_already_closed', 'month', p_month);
  END IF;

  -- Snapshot all users for each dimension
  FOREACH v_dim IN ARRAY v_dims LOOP
    IF v_dim = 'overall' THEN
      -- Overall = median score delta
      INSERT INTO monthly_liga_snapshots (month, user_id, dimension, score_delta, final_score, rank)
      SELECT
        p_month,
        s.user_id,
        'overall',
        -- median delta: sort 3 deltas, pick middle
        (ARRAY[
          s.trader_score - s.season_start_trader,
          s.manager_score - s.season_start_manager,
          s.analyst_score - s.season_start_analyst
        ])[2] AS score_delta,
        -- median current score
        (ARRAY[s.trader_score, s.manager_score, s.analyst_score])[2] AS final_score,
        ROW_NUMBER() OVER (ORDER BY
          (ARRAY[
            s.trader_score - s.season_start_trader,
            s.manager_score - s.season_start_manager,
            s.analyst_score - s.season_start_analyst
          ])[2] DESC
        )::INTEGER
      FROM scout_scores s;
    ELSE
      INSERT INTO monthly_liga_snapshots (month, user_id, dimension, score_delta, final_score, rank)
      SELECT
        p_month,
        s.user_id,
        v_dim,
        CASE v_dim
          WHEN 'trader' THEN s.trader_score - s.season_start_trader
          WHEN 'manager' THEN s.manager_score - s.season_start_manager
          WHEN 'analyst' THEN s.analyst_score - s.season_start_analyst
        END AS score_delta,
        CASE v_dim
          WHEN 'trader' THEN s.trader_score
          WHEN 'manager' THEN s.manager_score
          WHEN 'analyst' THEN s.analyst_score
        END AS final_score,
        ROW_NUMBER() OVER (ORDER BY
          CASE v_dim
            WHEN 'trader' THEN s.trader_score - s.season_start_trader
            WHEN 'manager' THEN s.manager_score - s.season_start_manager
            WHEN 'analyst' THEN s.analyst_score - s.season_start_analyst
          END DESC
        )::INTEGER
      FROM scout_scores s;
    END IF;

    -- Pick top 3 winners
    INSERT INTO monthly_liga_winners (month, dimension, user_id, rank, reward_cents, badge_key)
    SELECT
      p_month,
      v_dim,
      ms.user_id,
      ms.rank,
      CASE ms.rank WHEN 1 THEN v_reward_1 WHEN 2 THEN v_reward_2 WHEN 3 THEN v_reward_3 END,
      'monthly_winner_' || v_dim || '_' || ms.rank
    FROM monthly_liga_snapshots ms
    WHERE ms.month = p_month AND ms.dimension = v_dim AND ms.rank <= 3;

    GET DIAGNOSTICS v_count = ROW_COUNT;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'month', p_month, 'winners_inserted', v_count);
END;
$$;

-- 8. RPC: soft_reset_season — 80% soft reset + new season
CREATE OR REPLACE FUNCTION soft_reset_season(p_new_season_name TEXT, p_start DATE, p_end DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_season_id UUID;
  v_users_reset INTEGER;
BEGIN
  -- Deactivate current season
  UPDATE liga_seasons SET is_active = false WHERE is_active = true;

  -- Create new season
  INSERT INTO liga_seasons (name, start_date, end_date, is_active)
  VALUES (p_new_season_name, p_start, p_end, true)
  RETURNING id INTO v_new_season_id;

  -- Soft reset: 80% of current scores
  UPDATE scout_scores SET
    trader_score = GREATEST(0, (trader_score * 80 / 100)),
    manager_score = GREATEST(0, (manager_score * 80 / 100)),
    analyst_score = GREATEST(0, (analyst_score * 80 / 100)),
    season_start_trader = GREATEST(0, (trader_score * 80 / 100)),
    season_start_manager = GREATEST(0, (manager_score * 80 / 100)),
    season_start_analyst = GREATEST(0, (analyst_score * 80 / 100));

  GET DIAGNOSTICS v_users_reset = ROW_COUNT;

  RETURN jsonb_build_object(
    'ok', true,
    'new_season_id', v_new_season_id,
    'users_reset', v_users_reset
  );
END;
$$;

-- 9. Revoke dangerous RPCs from public (admin-only)
REVOKE EXECUTE ON FUNCTION close_monthly_liga(DATE) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION soft_reset_season(TEXT, DATE, DATE) FROM PUBLIC, authenticated, anon;

-- get_current_liga_season + get_monthly_liga_winners are public-readable
GRANT EXECUTE ON FUNCTION get_current_liga_season() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_liga_winners(DATE, INTEGER) TO authenticated;
