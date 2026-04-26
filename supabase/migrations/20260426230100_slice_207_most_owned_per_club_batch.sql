-- ============================================================================
-- Slice 207: get_most_owned_players_per_club_batch — Backend-Aggregat-RPC (Batch)
-- Date: 2026-04-26
-- Spec: worklog/specs/207-most-owned-discovery-batch.md
-- Pattern-Vorbild:
--   - Slice 199 get_most_owned_players_per_club (Single-Club-RPC, anonymized projection)
--   - Slice 195e get_event_player_pick_rates (pct-Berechnung mit COUNT(DISTINCT) als Nenner)
-- Source-of-truth: NEU (separater Batch-RPC parallel zum Single-Club-RPC, D46-Kompatibel).
-- ============================================================================
-- Scope: SECURITY DEFINER RPC — aggregiert holdings GROUP BY (club_id, player_id)
-- (COUNT DISTINCT user_id) WHERE players.club_id = ANY(p_club_ids) AND quantity > 0,
-- partitioniert pro Club, ranked nach holders_count DESC, projiziert Top-N (p_limit).
--
-- Nenner fuer holders_pct: total_managers pro Club =
--   COUNT(DISTINCT user_id) WHERE EXISTS holding auf einem Player des Clubs.
-- Definition "Manager des Clubs" = User mit min. 1 Card eines Spielers dieses Clubs.
--
-- Output: plain JSONB-Array `[{club_id, player_id, first_name, last_name,
--          shirt_number, position, image_url, holders_count, holders_pct, rank}]`
--          sortiert nach (club_id ASC, holders_count DESC). Empty: `[]`.
--
-- RLS-Hinweis: holdings hat tighter RLS (Slice 014, INV-26) — eigene rows + RPCs.
-- Diese RPC ist SECURITY DEFINER → bypasst RLS, aber Output ist projektiert
-- (kein user_id), daher public-safe (Pattern Slice 095 + 199).
--
-- D46: Single-Club-RPC `get_most_owned_players_per_club` bleibt unangetastet
--      (TransferList + MostOwnedSection bestehen). Batch-RPC ist parallel.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_most_owned_players_per_club_batch(UUID[], INT);

CREATE OR REPLACE FUNCTION public.get_most_owned_players_per_club_batch(
  p_club_ids UUID[],
  p_limit    INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_result JSONB;
  v_limit  INT;
BEGIN
  -- Sanitize limit (cap at 10 — Discovery-Card-Density)
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 1), 10));

  -- NULL/empty array → leeres Array (defensive, consistent mit list-RPCs).
  IF p_club_ids IS NULL OR array_length(p_club_ids, 1) IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH
  -- Phase 1: Total managers pro Club (Nenner fuer pct).
  -- "Manager des Clubs" = User mit min. 1 Holding (qty>0) auf einem Player des Clubs.
  managers AS (
    SELECT
      p.club_id,
      COUNT(DISTINCT h.user_id)::INT AS total_managers
    FROM public.holdings h
    JOIN public.players p ON p.id = h.player_id
    WHERE p.club_id = ANY(p_club_ids)
      AND h.quantity > 0
    GROUP BY p.club_id
  ),
  -- Phase 2: Holdings GROUP BY (club_id, player_id).
  owned AS (
    SELECT
      p.club_id,
      h.player_id,
      COUNT(DISTINCT h.user_id)::INT AS holders_count
    FROM public.holdings h
    JOIN public.players p ON p.id = h.player_id
    WHERE p.club_id = ANY(p_club_ids)
      AND h.quantity > 0
    GROUP BY p.club_id, h.player_id
  ),
  -- Phase 3: Rank pro club_id, plus pct via JOIN auf managers.
  ranked AS (
    SELECT
      o.club_id,
      o.player_id,
      o.holders_count,
      pl.first_name,
      pl.last_name,
      pl.shirt_number,
      pl.position,
      pl.image_url,
      CASE
        WHEN COALESCE(m.total_managers, 0) = 0 THEN 0
        ELSE ROUND(100.0 * o.holders_count / m.total_managers::numeric, 2)
      END AS holders_pct,
      ROW_NUMBER() OVER (
        PARTITION BY o.club_id
        ORDER BY o.holders_count DESC, pl.last_name ASC, pl.first_name ASC, o.player_id ASC
      )::INT AS rank
    FROM owned o
    JOIN public.players pl ON pl.id = o.player_id
    LEFT JOIN managers m ON m.club_id = o.club_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'club_id',       r.club_id,
        'player_id',     r.player_id,
        'first_name',    r.first_name,
        'last_name',     r.last_name,
        'shirt_number',  r.shirt_number,
        'position',      r.position,
        'image_url',     r.image_url,
        'holders_count', r.holders_count,
        'holders_pct',   r.holders_pct,
        'rank',          r.rank
      )
      ORDER BY r.club_id ASC, r.rank ASC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM ranked r
  WHERE r.rank <= v_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.get_most_owned_players_per_club_batch(uuid[], int) IS
  'Slice 207 (2026-04-26): Most-owned scout cards BATCH per club_ids. '
  'Aggregates holdings GROUP BY (club_id, player_id) (COUNT DISTINCT user_id) '
  'WHERE players.club_id = ANY(p_club_ids) AND quantity > 0. Returns JSONB array '
  '[{club_id, player_id, first_name, last_name, shirt_number, position, '
  'image_url, holders_count, holders_pct, rank}] partitioned per club, sorted '
  'by (club_id ASC, rank ASC). holders_pct = COUNT(DISTINCT user_id) of player / '
  'COUNT(DISTINCT user_id) holding ANY player of club * 100. Empty/NULL '
  'p_club_ids: []. p_limit capped at 10 (Discovery-density). Public-safe via '
  'projection (NEVER returns user_id — only aggregate count + player metadata).';

-- ── AR-44: REVOKE/GRANT-Block ────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_most_owned_players_per_club_batch(uuid[], int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_most_owned_players_per_club_batch(uuid[], int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_most_owned_players_per_club_batch(uuid[], int) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_most_owned_players_per_club_batch(uuid[], int) TO service_role;
