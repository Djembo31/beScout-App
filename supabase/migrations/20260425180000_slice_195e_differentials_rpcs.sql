-- ============================================================================
-- Slice 195e: Differentials-RPC + Captain-Pick-Rate
-- Date: 2026-04-25
-- CEO-Decision: Anil 2026-04-25 (Master-Spec 195) — F-06 Differentials P0 +
--   FM-Audit 2.1 (Captain-Pick-Rate) + 2.2 (Differential-%)
-- Scope: 2 SECURITY DEFINER RPCs die anonymisierte Aggregate ueber lineups
--   liefern. Anonymisiert: NIE user_id, handle, display_name. Nur counts/pcts.
-- Spec: worklog/specs/195e-differentials-rpc.md
-- Pattern-Vorbild: rpc_get_club_recent_trades (Slice 095) — public-safe RPC
--   via projizierten Output, kein Admin-Guard.
-- Source-of-truth: NEU (keine Vorgaenger-Migration).
-- Applied via mcp__supabase__apply_migration on 2026-04-25 (durch Parent-CTO).
-- ============================================================================

-- ── 1. RPC get_event_captain_distribution ────────────────────────────────────
-- Aggregiert: Wieviele Lineups picken Player X als Captain?
-- captain_slot ist TEXT (z.B. 'def1') → mapped via CASE auf player_id der
-- entsprechenden slot_*-Column. Lineups ohne captain_slot oder mit captain_slot
-- aber ohne Player im Slot werden ignoriert.
-- Return: JSONB-Array `[{player_id, count, pct}]` sortiert count DESC.
-- Empty-Event (0 Captains): `[]`.
CREATE OR REPLACE FUNCTION public.get_event_captain_distribution(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_total INT;
  v_result JSONB;
BEGIN
  -- Phase 1: Resolve captain_slot → player_id und filter NULLs.
  -- Materialize in TEMP via CTE-driven SELECT INTO (single pass, dann reuse).
  WITH captains AS (
    SELECT
      CASE l.captain_slot
        WHEN 'gk'   THEN l.slot_gk
        WHEN 'def1' THEN l.slot_def1
        WHEN 'def2' THEN l.slot_def2
        WHEN 'def3' THEN l.slot_def3
        WHEN 'def4' THEN l.slot_def4
        WHEN 'mid1' THEN l.slot_mid1
        WHEN 'mid2' THEN l.slot_mid2
        WHEN 'mid3' THEN l.slot_mid3
        WHEN 'mid4' THEN l.slot_mid4
        WHEN 'att'  THEN l.slot_att
        WHEN 'att2' THEN l.slot_att2
        WHEN 'att3' THEN l.slot_att3
        ELSE NULL
      END AS captain_player_id
    FROM public.lineups l
    WHERE l.event_id = p_event_id
      AND l.captain_slot IS NOT NULL
  ),
  filtered AS (
    SELECT captain_player_id
    FROM captains
    WHERE captain_player_id IS NOT NULL
  ),
  totals AS (
    SELECT COUNT(*)::INT AS total FROM filtered
  ),
  ranked AS (
    SELECT
      captain_player_id,
      COUNT(*)::INT AS cnt
    FROM filtered
    GROUP BY captain_player_id
  )
  SELECT
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'player_id', r.captain_player_id,
          'count', r.cnt,
          'pct', ROUND(100.0 * r.cnt / NULLIF(t.total, 0)::numeric, 2)
        )
        ORDER BY r.cnt DESC, r.captain_player_id ASC
      ),
      '[]'::jsonb
    )
  INTO v_result
  FROM ranked r
  CROSS JOIN totals t;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.get_event_captain_distribution(uuid) IS
  'Slice 195e (2026-04-25): Anonymized captain pick distribution per event. '
  'Returns JSONB array [{player_id, count, pct}] sorted by count DESC. '
  'NEVER returns user_id/handle/display_name. Empty event → [].';

-- ── 2. RPC get_event_player_pick_rates ───────────────────────────────────────
-- Aggregiert: Wieviele Lineups picken Player X (in irgendeinem starting-slot)?
-- Iteriert ueber alle 12 starting-slots der Lineups (NICHT bench_gk/o1/o2/o3).
-- Return: JSONB-Array `[{player_id, count, pct}]` sortiert count DESC.
-- Empty-Event (0 Lineups): `[]`.
CREATE OR REPLACE FUNCTION public.get_event_player_pick_rates(
  p_event_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_total_lineups INT;
  v_result JSONB;
BEGIN
  -- Phase 1: Total lineups fuer pct-Nenner
  SELECT COUNT(*)::INT INTO v_total_lineups
  FROM public.lineups
  WHERE event_id = p_event_id;

  -- Edge: Keine Lineups → leeres Array
  IF v_total_lineups IS NULL OR v_total_lineups = 0 THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Phase 2: Aggregate ueber alle 12 starting-slots via unnest.
  -- COUNT(DISTINCT lineup_id) damit ein Spieler in einem Lineup nur 1× zaehlt
  -- (sollte wegen Slot-Dedup-Constraints unmoeglich sein, aber defensiv).
  WITH pickings AS (
    SELECT
      l.id AS lineup_id,
      unnest(ARRAY[
        l.slot_gk,
        l.slot_def1, l.slot_def2, l.slot_def3, l.slot_def4,
        l.slot_mid1, l.slot_mid2, l.slot_mid3, l.slot_mid4,
        l.slot_att, l.slot_att2, l.slot_att3
      ]) AS player_id
    FROM public.lineups l
    WHERE l.event_id = p_event_id
  ),
  ranked AS (
    SELECT
      player_id,
      COUNT(DISTINCT lineup_id)::INT AS cnt
    FROM pickings
    WHERE player_id IS NOT NULL
    GROUP BY player_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'player_id', player_id,
        'count', cnt,
        'pct', ROUND(100.0 * cnt / v_total_lineups::numeric, 2)
      )
      ORDER BY cnt DESC, player_id ASC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM ranked;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.get_event_player_pick_rates(uuid) IS
  'Slice 195e (2026-04-25): Anonymized player pick-rate per event. '
  'Aggregates over all 12 starting slots (NOT bench). '
  'Returns JSONB array [{player_id, count, pct}] sorted by count DESC. '
  'NEVER returns user_id/handle/display_name. Empty event → [].';

-- ── 3. AR-44: REVOKE/GRANT-Block fuer beide SECURITY DEFINER RPCs ───────────
REVOKE EXECUTE ON FUNCTION public.get_event_captain_distribution(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_event_captain_distribution(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_event_captain_distribution(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_event_player_pick_rates(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_event_player_pick_rates(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_event_player_pick_rates(uuid) TO authenticated;
