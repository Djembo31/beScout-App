-- Slice 322 — rpc_get_scout_leaderboard_overall (P1-Demo Gamif #2)
-- Problem: getScoutLeaderboard('overall') holte limit*3 Zeilen nach trader_score sortiert +
--          client-median → Truncation-Bias (User mit hohem Median/niedrigem trader fallen
--          aus dem Top-limit*3-by-trader). Latent bei <300 Usern, real darüber.
-- Fix: Server-seitige Median-Sortierung (percentile_disc(0.5) über die 3 Dims) + Top-N.
--      Read-only, projiziert nur public-Profile-Felder (Leaderboard ist öffentlich).
--      JSONB-Return = kein 1000-Row-Cap, deterministische Reihenfolge.

CREATE OR REPLACE FUNCTION public.rpc_get_scout_leaderboard_overall(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(
    jsonb_agg(entry ORDER BY median_score DESC, trader_score DESC, user_id),
    '[]'::jsonb
  )
  FROM (
    SELECT
      jsonb_build_object(
        'user_id', ss.user_id,
        'trader_score', ss.trader_score,
        'manager_score', ss.manager_score,
        'analyst_score', ss.analyst_score,
        'handle', p.handle,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'verified', p.verified
      ) AS entry,
      ( SELECT percentile_disc(0.5) WITHIN GROUP (ORDER BY v)
        FROM unnest(ARRAY[ss.trader_score, ss.manager_score, ss.analyst_score]) v ) AS median_score,
      ss.trader_score,
      ss.user_id
    FROM scout_scores ss
    JOIN profiles p ON p.id = ss.user_id
    ORDER BY median_score DESC, ss.trader_score DESC, ss.user_id
    LIMIT GREATEST(p_limit, 0)
  ) t;
$function$;

-- AR-44: CREATE OR REPLACE resettet Privilegien → explizit REVOKE + GRANT.
REVOKE EXECUTE ON FUNCTION public.rpc_get_scout_leaderboard_overall(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_scout_leaderboard_overall(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_scout_leaderboard_overall(integer) TO authenticated;
