-- ============================================================================
-- Slice 270 — Per-Player Multi-League-Window for FormBars
-- ============================================================================
-- Bug-Class: Slice-102 Pilot-Default-Pattern (globale Annahme bricht
--            Multi-League). Pre-Slice-270 nutzte `getRecentPlayerScores` einen
--            globalen MAX(gw) als Fenster-Anker. TR-Süper-Lig latest=37 wurde
--            damit Anchor für ALLE Ligen → Bundesliga (latest=32, lag=5),
--            Premier League (33, lag=4), La Liga (33, lag=4) bekamen
--            5/5 NULL-Slots → leere FormBars.
--            Auch GAL-Stamm-XI (last_appearance_gw=30) hatte 0/5 Slots im
--            globalen [33..37]-Fenster, weil andere Süper-Lig-Clubs noch
--            spielten während GAL pausierte.
--
-- Fix: Per-Player Window-Function ROW_NUMBER → jeder Spieler bekommt seine
--      eigenen letzten 5 played GWs (score > 0), Liga-übergreifend
--      semantisch korrekt + visuell konsistent.
--
-- Spec: worklog/specs/270-perf-bars-multi-league-window.md
-- Impact: worklog/impact/270-perf-bars-multi-league-window.md
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_get_recent_player_scores()
RETURNS TABLE(
  player_id uuid,
  gameweek integer,
  score integer,
  position_in_window smallint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT player_id, gameweek, score, position_in_window
  FROM (
    SELECT
      player_id,
      gameweek,
      score,
      (ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY gameweek DESC))::smallint
        AS position_in_window
    FROM public.player_gameweek_scores
    WHERE score > 0
  ) t
  WHERE position_in_window <= 5
  ORDER BY player_id, gameweek ASC;
$$;

COMMENT ON FUNCTION public.rpc_get_recent_player_scores() IS
  'Slice 270 — Per-Player Multi-League Latest-5-played-GWs for FormBars. ROW_NUMBER window function avoids global MAX(gw) bug (Slice-102 pattern). Public-readable Fantasy scores, no PII. Returns oldest→newest per player (FormBars convention).';

-- ----------------------------------------------------------------------------
-- AR-44 REVOKE/GRANT block (CREATE OR REPLACE resets privileges to PUBLIC default)
-- ----------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() TO authenticated;

-- ----------------------------------------------------------------------------
-- Verify (run manually post-apply via mcp__supabase__execute_sql):
--   SELECT pg_get_functiondef('public.rpc_get_recent_player_scores()'::regprocedure);
--   SELECT COUNT(*) FROM public.rpc_get_recent_player_scores();
--     -- expect: ~ N_active_players * 5 ≤ 25k
-- ----------------------------------------------------------------------------
