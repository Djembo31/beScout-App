-- RPC: rpc_get_player_percentiles
-- Returns pre-computed percentile ranks for a given player.
-- Eliminates client-side usePlayers() fetch (632 rows) on Player Detail Performance tab.
-- Returns JSONB with:
--   Global: floor_price_pct, l5_score_pct, l15_score_pct, holder_count_pct, total_trades_pct
--   Position-filtered: pos_l5_pct, pos_l5_rank, pos_l5_total,
--     pos_matches_pct, pos_goals_pct, pos_assists_pct,
--     pos_minutes_pct, pos_saves_pct, pos_clean_sheets_pct
-- All pct values are 0-1 range (multiply by 100 for display).

CREATE OR REPLACE FUNCTION rpc_get_player_percentiles(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  WITH
  holder_counts AS (
    SELECT player_id, COUNT(*)::int AS cnt
    FROM holdings
    GROUP BY player_id
  ),
  trade_counts AS (
    SELECT player_id, COUNT(*)::int AS cnt
    FROM trades
    GROUP BY player_id
  ),
  player_data AS (
    SELECT
      p.id,
      p.position,
      COALESCE(p.perf_l5, 0)          AS perf_l5,
      COALESCE(p.perf_l15, 0)         AS perf_l15,
      COALESCE(p.floor_price, 0)      AS floor_price,
      COALESCE(p.matches, 0)          AS matches,
      COALESCE(p.goals, 0)            AS goals,
      COALESCE(p.assists, 0)          AS assists,
      COALESCE(p.total_minutes, 0)    AS total_minutes,
      COALESCE(p.total_saves, 0)      AS total_saves,
      COALESCE(p.clean_sheets, 0)     AS clean_sheets,
      COALESCE(hc.cnt, 0)             AS holder_count,
      COALESCE(tc.cnt, 0)             AS trade_count
    FROM players p
    LEFT JOIN holder_counts hc ON hc.player_id = p.id
    LEFT JOIN trade_counts  tc ON tc.player_id  = p.id
    WHERE NOT p.is_liquidated
  ),
  global_ranks AS (
    SELECT
      id,
      ROUND(percent_rank() OVER (ORDER BY floor_price)::numeric,  4) AS floor_price_pct,
      ROUND(percent_rank() OVER (ORDER BY perf_l5)::numeric,      4) AS l5_score_pct,
      ROUND(percent_rank() OVER (ORDER BY perf_l15)::numeric,     4) AS l15_score_pct,
      ROUND(percent_rank() OVER (ORDER BY holder_count)::numeric, 4) AS holder_count_pct,
      ROUND(percent_rank() OVER (ORDER BY trade_count)::numeric,  4) AS total_trades_pct
    FROM player_data
  ),
  pos_ranks AS (
    SELECT
      id,
      COUNT(*)       OVER (PARTITION BY position)                                              AS pos_total,
      RANK()         OVER (PARTITION BY position ORDER BY perf_l5 DESC)                        AS pos_l5_rank,
      ROUND(percent_rank() OVER (PARTITION BY position ORDER BY perf_l5)::numeric,        4)  AS pos_l5_pct,
      ROUND(percent_rank() OVER (PARTITION BY position ORDER BY matches)::numeric,        4)  AS pos_matches_pct,
      ROUND(percent_rank() OVER (PARTITION BY position ORDER BY goals)::numeric,          4)  AS pos_goals_pct,
      ROUND(percent_rank() OVER (PARTITION BY position ORDER BY assists)::numeric,        4)  AS pos_assists_pct,
      ROUND(percent_rank() OVER (PARTITION BY position ORDER BY total_minutes)::numeric,  4)  AS pos_minutes_pct,
      ROUND(percent_rank() OVER (PARTITION BY position ORDER BY total_saves)::numeric,    4)  AS pos_saves_pct,
      ROUND(percent_rank() OVER (PARTITION BY position ORDER BY clean_sheets)::numeric,   4)  AS pos_clean_sheets_pct
    FROM player_data
  )
  SELECT jsonb_build_object(
    'floor_price_pct',      gr.floor_price_pct,
    'l5_score_pct',         gr.l5_score_pct,
    'l15_score_pct',        gr.l15_score_pct,
    'holder_count_pct',     gr.holder_count_pct,
    'total_trades_pct',     gr.total_trades_pct,
    'pos_l5_pct',           pr.pos_l5_pct,
    'pos_l5_rank',          pr.pos_l5_rank,
    'pos_l5_total',         pr.pos_total,
    'pos_matches_pct',      pr.pos_matches_pct,
    'pos_goals_pct',        pr.pos_goals_pct,
    'pos_assists_pct',      pr.pos_assists_pct,
    'pos_minutes_pct',      pr.pos_minutes_pct,
    'pos_saves_pct',        pr.pos_saves_pct,
    'pos_clean_sheets_pct', pr.pos_clean_sheets_pct
  ) INTO v_result
  FROM global_ranks gr
  JOIN pos_ranks pr ON pr.id = gr.id
  WHERE gr.id = p_player_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;

-- Revoke broad access, grant to authenticated only
REVOKE ALL ON FUNCTION rpc_get_player_percentiles(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION rpc_get_player_percentiles(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION rpc_get_player_percentiles(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION rpc_get_player_percentiles(uuid) TO authenticated;
