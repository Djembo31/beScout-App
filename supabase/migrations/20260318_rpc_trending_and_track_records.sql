-- Performance Overhaul v2: DB-side aggregation RPCs
-- Replaces heavy JS-side aggregation with efficient DB queries

-- 1) Trending players: aggregates 24h trade volume in DB instead of fetching 1000 rows
CREATE OR REPLACE FUNCTION rpc_get_trending_players(p_limit INT DEFAULT 5)
RETURNS TABLE (
  player_id UUID,
  trade_count BIGINT,
  volume_24h BIGINT,
  first_name TEXT,
  last_name TEXT,
  player_position TEXT,
  club TEXT,
  floor_price BIGINT,
  price_change_24h NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    t.player_id,
    COUNT(*) AS trade_count,
    SUM(t.price * t.quantity) AS volume_24h,
    p.first_name,
    p.last_name,
    p.position AS player_position,
    p.club,
    p.floor_price,
    p.price_change_24h
  FROM trades t
  JOIN players p ON p.id = t.player_id
  WHERE t.executed_at > NOW() - INTERVAL '24 hours'
  GROUP BY t.player_id, p.first_name, p.last_name, p.position, p.club, p.floor_price, p.price_change_24h
  ORDER BY trade_count DESC
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION rpc_get_trending_players FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION rpc_get_trending_players TO authenticated;

-- 2) Author track records: aggregates research outcomes per author in DB
CREATE OR REPLACE FUNCTION rpc_get_author_track_records(p_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  total_calls BIGINT,
  correct_calls BIGINT,
  hit_rate NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    rp.user_id,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE rp.outcome = 'correct') AS correct_calls,
    ROUND(
      COUNT(*) FILTER (WHERE rp.outcome = 'correct')::numeric
      / NULLIF(COUNT(*), 0), 2
    ) AS hit_rate
  FROM research_posts rp
  WHERE rp.user_id = ANY(p_user_ids)
    AND rp.outcome IS NOT NULL
    AND rp.price_at_creation > 0
  GROUP BY rp.user_id;
$$;

REVOKE ALL ON FUNCTION rpc_get_author_track_records FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION rpc_get_author_track_records TO authenticated;
