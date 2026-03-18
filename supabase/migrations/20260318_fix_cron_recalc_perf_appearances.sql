-- Fix cron_recalc_perf: add l5_appearances, l15_appearances, perf_season calculation
-- Previously only perf_l5/perf_l15 were computed, appearance counts were always 0

CREATE OR REPLACE FUNCTION public.cron_recalc_perf()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_perf_updated INT := 0;
  v_agg_updated INT := 0;
BEGIN
  -- Perf L5/L15/Season + Appearance counts
  UPDATE players p SET
    perf_l5 = LEAST(100, ROUND(sub.avg5)),
    perf_l15 = LEAST(100, ROUND(sub.avg15)),
    perf_season = LEAST(100, ROUND(sub.avg_all)),
    l5_appearances = sub.apps5,
    l15_appearances = sub.apps15
  FROM (
    SELECT pgs.player_id,
      AVG(pgs.score) FILTER (WHERE pgs.rn <= 5) AS avg5,
      AVG(pgs.score) FILTER (WHERE pgs.rn <= 15) AS avg15,
      AVG(pgs.score) AS avg_all,
      COUNT(*) FILTER (WHERE pgs.rn <= 5) AS apps5,
      COUNT(*) FILTER (WHERE pgs.rn <= 15) AS apps15
    FROM (
      SELECT player_id, score,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY gameweek DESC) AS rn
      FROM player_gameweek_scores
    ) pgs
    GROUP BY pgs.player_id
  ) sub
  WHERE p.id = sub.player_id;

  GET DIAGNOSTICS v_perf_updated = ROW_COUNT;

  -- Aggregate stats from fixture_player_stats
  UPDATE players p SET
    goals = COALESCE(agg.total_goals, 0),
    assists = COALESCE(agg.total_assists, 0),
    clean_sheets = COALESCE(agg.total_cs, 0),
    yellow_cards = COALESCE(agg.total_yellows, 0),
    red_cards = COALESCE(agg.total_reds, 0),
    total_minutes = COALESCE(agg.total_minutes, 0),
    total_saves = COALESCE(agg.total_saves, 0),
    matches = COALESCE(agg.total_matches, 0)
  FROM (
    SELECT player_id,
      SUM(goals) as total_goals,
      SUM(assists) as total_assists,
      COUNT(CASE WHEN clean_sheet THEN 1 END) as total_cs,
      COUNT(CASE WHEN yellow_card THEN 1 END) as total_yellows,
      COUNT(CASE WHEN red_card THEN 1 END) as total_reds,
      SUM(minutes_played) as total_minutes,
      SUM(saves) as total_saves,
      COUNT(*) as total_matches
    FROM fixture_player_stats
    WHERE player_id IS NOT NULL
    GROUP BY player_id
  ) agg
  WHERE p.id = agg.player_id;

  GET DIAGNOSTICS v_agg_updated = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'perf_updated', v_perf_updated,
    'agg_updated', v_agg_updated
  );
END;
$function$;
