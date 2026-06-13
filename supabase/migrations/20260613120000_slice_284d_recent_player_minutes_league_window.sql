-- Slice 284d (FANT-09) — Absolute-Liga-Window für Recent-Player-Minutes.
-- Bug: getRecentPlayerMinutes baute globales Top-5-GW-Window über ALLE Ligen →
-- 34-GW-Ligen sahen leere Minutes-Slots (Slice-270-Klasse, bei 274 nicht
-- mitgezogen). Fix mirrors rpc_get_recent_player_scores (Slice 274):
-- per-Liga letzte 5 finished/simulated GWs, Cross-Join Spieler × Liga-Window,
-- LEFT JOIN fixtures (club_id home/away-Match) + fixture_player_stats.
-- COALESCE(minutes,0) — DNP = 0 (Konsument KaderTab mittelt number[]).
-- Nested-aggregate-Trap: MAX(minutes) muss in CTE player_minutes, jsonb_agg drüber.
-- JSONB-Return (1000-cap-sicher, Slice-270d-Pattern). AR-44 REVOKE/GRANT.
DROP FUNCTION IF EXISTS public.rpc_get_recent_player_minutes();

CREATE OR REPLACE FUNCTION public.rpc_get_recent_player_minutes()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    SELECT p.id AS player_id, p.club_id, wg.gameweek, wg.league_id
    FROM public.players p
    JOIN public.clubs c ON c.id = p.club_id
    JOIN window_gws wg ON wg.league_id = c.league_id
    WHERE p.club_id IS NOT NULL
  ),
  player_minutes AS (
    SELECT
      pw.player_id,
      pw.gameweek,
      COALESCE(MAX(fps.minutes_played), 0) AS minutes
    FROM player_window pw
    LEFT JOIN public.fixtures f
      ON f.league_id = pw.league_id AND f.gameweek = pw.gameweek
      AND (f.home_club_id = pw.club_id OR f.away_club_id = pw.club_id)
    LEFT JOIN public.fixture_player_stats fps
      ON fps.fixture_id = f.id AND fps.player_id = pw.player_id
    GROUP BY pw.player_id, pw.gameweek
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'player_id', player_id,
      'gameweek', gameweek,
      'minutes', minutes
    ) ORDER BY player_id, gameweek DESC
  ), '[]'::jsonb)
  FROM player_minutes;
$$;

COMMENT ON FUNCTION public.rpc_get_recent_player_minutes() IS
  'Slice 284d (FANT-09) — Absolute Liga-Window für Recent-Minutes. JSONB-Array {player_id, gameweek, minutes} für jeden aktiven Spieler x letzte 5 Liga-GWs (finished|simulated), newest-first. COALESCE(minutes,0)=DNP. Mirror rpc_get_recent_player_scores (Slice 274). Public Fantasy-Daten, no PII.';

REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_minutes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_minutes() FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_recent_player_minutes() TO authenticated;
