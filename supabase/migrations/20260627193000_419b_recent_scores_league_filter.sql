-- Slice 419b — Reviewer-Fund #1 (HIGH): rpc_get_recent_player_scores Row-Fanout nach UNIQUE-Flip.
-- player_gameweek_scores ist seit 419 fixture-gebunden (UNIQUE player_id,fixture_id) → ein Spieler kann
-- >1 Zeile pro (player, gameweek) haben. Der alte LEFT JOIN ON (player_id, gameweek) OHNE Liga-Filter
-- fächert die eine player_window-Zeile in N auf (Duplikat-/Fremd-Liga-Slots in den Form-Bars).
-- Fix: (a) league_id in player_window ziehen, (b) Score als fanout-sichere Skalar-Subquery mit SUM
--      + Liga-Filter (konsistent zu score_event-Semantik). D87: gegen Live-Body rekonstruiert.
CREATE OR REPLACE FUNCTION public.rpc_get_recent_player_scores()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH league_recent_gws AS (
    SELECT
      league_id,
      gameweek,
      ROW_NUMBER() OVER (PARTITION BY league_id ORDER BY gameweek DESC) AS rn
    FROM (
      SELECT DISTINCT league_id, gameweek
      FROM public.fixtures
      WHERE status IN ('finished', 'simulated')
        AND league_id IS NOT NULL
    ) distinct_league_gws
  ),
  window_gws AS (
    SELECT league_id, gameweek FROM league_recent_gws WHERE rn <= 5
  ),
  player_window AS (
    SELECT
      p.id AS player_id,
      wg.gameweek,
      c.league_id
    FROM public.players p
    JOIN public.clubs c ON c.id = p.club_id
    JOIN window_gws wg ON wg.league_id = c.league_id
    WHERE p.club_id IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'player_id', pw.player_id,
      'gameweek', pw.gameweek,
      -- Slice 419b: fixture-bound → SUM league-scoped scores (fanout-frei via Skalar-Subquery).
      'score', NULLIF((
        SELECT SUM(pgs.score)::INT
        FROM public.player_gameweek_scores pgs
        WHERE pgs.player_id = pw.player_id
          AND pgs.gameweek = pw.gameweek
          AND pgs.league_id = pw.league_id
      ), 0)
    ) ORDER BY pw.player_id, pw.gameweek ASC
  ), '[]'::jsonb)
  FROM player_window pw;
$function$;
