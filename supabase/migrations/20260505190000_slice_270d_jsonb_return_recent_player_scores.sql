-- ============================================================================
-- Slice 270d v2 — JSONB-Array-Return statt TABLE-Set
-- ============================================================================
-- Bug-Klasse: PostgREST 1000-row-Default-Cap auf TABLE-Return-RPCs.
--
-- 270d v1 (.range(0, 99999) am Client-Call) war wirkungslos — Supabase-JS
-- übersetzt .range() für RPCs zu URL-Params `?offset=0&limit=100000`, aber
-- PostgREST IGNORIERT den Override für RPC-Calls und sendet stets nur 1000
-- Rows zurück. Live-Verify Network-Trace bestätigte:
--   Response-Header: content-range: 0-999/*
-- trotz Request-URL ?limit=100000.
--
-- Fix: RPC returns JSONB-Array statt TABLE-Set. Single-Row × Single-Column
-- = kein Row-Cap. JSONB-Aggregation übernimmt Server-Side ORDER BY.
--
-- Spec: worklog/specs/270-perf-bars-multi-league-window.md (270d-Heal inline)
-- Reference: errors-db.md §1 PostgREST 1000-row cap (RPC-Variante)
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_recent_player_scores();

CREATE OR REPLACE FUNCTION public.rpc_get_recent_player_scores()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'player_id', player_id,
      'gameweek', gameweek,
      'score', score
    ) ORDER BY player_id, gameweek ASC
  ), '[]'::jsonb)
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
  WHERE position_in_window <= 5;
$$;

COMMENT ON FUNCTION public.rpc_get_recent_player_scores() IS
  'Slice 270d v2 — JSONB-Array of {player_id, gameweek, score} for the last 5 played GWs per player. JSONB statt TABLE-Set, weil PostgREST .range()/?limit auf RPC-Calls ignoriert und 1000-row-Cap erzwingt. Public-readable Fantasy scores, no PII.';

REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() TO authenticated;

-- ----------------------------------------------------------------------------
-- Verify (manual via mcp__supabase__execute_sql):
--   SELECT jsonb_array_length(public.rpc_get_recent_player_scores());
--   -- expect ~15k entries (active players × 5 GWs each)
-- ----------------------------------------------------------------------------
