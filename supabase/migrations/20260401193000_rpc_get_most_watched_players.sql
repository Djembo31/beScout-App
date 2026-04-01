-- Internal RPC: aggregates watchlist data (not directly callable by clients)
CREATE OR REPLACE FUNCTION rpc_get_most_watched_players(p_limit INT DEFAULT 5)
RETURNS TABLE (
  player_id     UUID,
  watcher_count BIGINT,
  first_name    TEXT,
  last_name     TEXT,
  player_pos    TEXT,
  club          TEXT,
  image_url     TEXT,
  floor_price   BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.player_id,
    COUNT(*)::BIGINT           AS watcher_count,
    p.first_name,
    p.last_name,
    p.position                 AS player_pos,
    p.club,
    p.image_url,
    COALESCE(p.floor_price, 0) AS floor_price
  FROM watchlist w
  JOIN players p ON p.id = w.player_id
  WHERE p.is_liquidated = false
  GROUP BY
    w.player_id,
    p.first_name, p.last_name,
    p.position, p.club,
    p.image_url, p.floor_price
  ORDER BY watcher_count DESC
  LIMIT p_limit;
$$;

-- Revoke internal RPC from all roles
REVOKE ALL ON FUNCTION rpc_get_most_watched_players(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_most_watched_players(INT) FROM authenticated;
REVOKE ALL ON FUNCTION rpc_get_most_watched_players(INT) FROM anon;

-- Public wrapper: auth-gated, calls internal RPC
CREATE OR REPLACE FUNCTION get_most_watched_players(p_limit INT DEFAULT 5)
RETURNS TABLE (
  player_id     UUID,
  watcher_count BIGINT,
  first_name    TEXT,
  last_name     TEXT,
  player_pos    TEXT,
  club          TEXT,
  image_url     TEXT,
  floor_price   BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY SELECT * FROM rpc_get_most_watched_players(p_limit);
END;
$$;

-- Grant wrapper to authenticated only
REVOKE ALL ON FUNCTION get_most_watched_players(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_most_watched_players(INT) FROM anon;
GRANT EXECUTE ON FUNCTION get_most_watched_players(INT) TO authenticated;
