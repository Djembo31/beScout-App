-- ============================================================================
-- Slice 274 v2 — Absolute Liga-Window für rpc_get_recent_player_scores
-- ============================================================================
-- Bug-Klasse: Slice 270 Per-Player-Window war damals Liga-Lag-Workaround
-- (active_gameweek-Drift). Slice 273 hat Liga-Lag komplett gefixt
-- (DB-Heal active_gw). Per-Player-Window verursacht jetzt eigenen Bug:
-- DNP-Spieler (z.B. langzeitverletzt) zeigen 5 colored Bars aus alten GWs
-- → User-Verwirrung „on form / 1-2 GWs verpasst" obwohl 5+ GWs verpasst.
--
-- Fix: Absolute Liga-Window per Liga (5 letzte finished GWs aus
-- fixtures-truth, NICHT clubs.active_gameweek). Cross-Join Spieler ×
-- Liga-Window + LEFT JOIN player_gameweek_scores. Spieler ohne played
-- bekommen NULL-score-Slot → Frontend rendert dashed mit Tooltip
-- „GW {n} · nicht aufgestellt".
--
-- v1 → v2 Performance-Heal (in-Session 2026-05-06):
--   v1 (no filter): 125ms aber Bench-Players mit pgs.score=0 würden als
--     "played 0 pts" colored bar gerendert (visuell falsch — Bench != Cameo).
--   v2-attempt (fps-JOIN with minutes_played > 0 differentiation): 951ms
--     wegen Sequential Scan auf players (4472 rows) + Hash Aggregate.
--     8× über Mobile-Frontend-Latency-Budget.
--   v2-final (this version): NULLIF(pgs.score, 0). Pragmatischer Kompromiss
--     — 0-pt-Cameos (5-7min, 0 Pkte) UND Bench-Players beide als DNP/dashed
--     visualisiert. Cameos mit Punkten (selten aber existiert) bleiben
--     colored. Anil-Hauptbug (lange-DNP zeigt 5 colored aus alter Zeit)
--     bleibt 100% gelöst. Performance: ~125ms (sub-Mobile-Budget).
--
-- ORDER BY player_id, gameweek ASC (oldest→newest per player) — IDENTISCH
-- zu Slice 270d v2. Frontend FormBars rendert links→rechts → ORDER-Change
-- würde silent visual breakage bedeuten (Slice 270 Reviewer F-01 Lehre).
--
-- Spec: worklog/specs/274-form-bars-absolute-league-window.md
-- Pattern-Reference: errors-db.md "Per-Tenant-Window vs. Global-MAX
-- (Slice 270)" — direkt erweitert auf Liga-Tenant-Achse.
-- Pattern-Reference: errors-db.md "PostgREST RPC-Pfad ignoriert
-- .range()/?limit (Slice 270d v2)" — JSONB-Return-Pattern beibehalten.
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_get_recent_player_scores();

CREATE OR REPLACE FUNCTION public.rpc_get_recent_player_scores()
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
    SELECT
      p.id AS player_id,
      wg.gameweek
    FROM public.players p
    JOIN public.clubs c ON c.id = p.club_id
    JOIN window_gws wg ON wg.league_id = c.league_id
    WHERE p.club_id IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'player_id', pw.player_id,
      'gameweek', pw.gameweek,
      'score', NULLIF(pgs.score, 0)  -- score=0 (Bench/0-pt-Cameo) → NULL → dashed bar
    ) ORDER BY pw.player_id, pw.gameweek ASC
  ), '[]'::jsonb)
  FROM player_window pw
  LEFT JOIN public.player_gameweek_scores pgs
    ON pgs.player_id = pw.player_id
    AND pgs.gameweek = pw.gameweek;
$$;

COMMENT ON FUNCTION public.rpc_get_recent_player_scores() IS
  'Slice 274 v2 — Absolute Liga-Window. JSONB-Array {player_id, gameweek, score} fuer jeden aktiven Spieler x seine letzten 5 Liga-GWs (status=finished|simulated). NULLIF(pgs.score, 0): score=0 wird als DNP behandelt (Frontend dashed Bar) — pragmatischer Kompromiss weil fps-JOIN-Variante 951ms kostet (vs 125ms). Trade-off: 0-pt-Cameos (5-7min Einsatz, 0 Pkte) werden als DNP angezeigt — selten + visuell kaum unterscheidbar. Cameos mit Punkten bleiben colored. Public-readable Fantasy scores, no PII.';

REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() FROM anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_recent_player_scores() TO authenticated;
