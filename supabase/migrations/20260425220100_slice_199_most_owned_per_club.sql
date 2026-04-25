-- ============================================================================
-- Slice 199: get_most_owned_players_per_club — Backend-Aggregat-RPC
-- Date: 2026-04-25
-- Spec: worklog/specs/199-backend-aggregate-rpcs.md
-- Pattern-Vorbild: rpc_get_club_recent_trades (Slice 095) +
--                  Slice 195e differentials (plain JSONB array, anonymized projection).
-- Source-of-truth: NEU (keine Vorgaenger-Migration).
-- ============================================================================
-- Scope: SECURITY DEFINER RPC — aggregiert holdings GROUP BY player_id
-- (COUNT DISTINCT user_id) WHERE players.club_id = p_club_id AND quantity > 0.
-- Return-Shape ist anonymized (kein user_id im Output, nur holders_count).
--
-- Output: plain JSONB-Array `[{player_id, first_name, last_name, shirt_number,
--          position, image_url, holders_count, rank}]` sortiert nach
--          holders_count DESC. Empty: `[]`.
--
-- RLS-Hinweis: holdings hat tighter RLS (Slice 014, INV-26) — eigene rows + RPCs.
-- Diese RPC ist SECURITY DEFINER → bypasst RLS, aber Output ist projektiert
-- (kein user_id), daher public-safe (Pattern Slice 095).
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_most_owned_players_per_club(UUID, INT);

CREATE OR REPLACE FUNCTION public.get_most_owned_players_per_club(
  p_club_id UUID,
  p_limit   INT DEFAULT 5
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
  -- Sanitize limit
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 5), 100));

  -- NULL-Club-Guard: leeres Array statt error (consistent mit list-RPCs).
  IF p_club_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  WITH owned AS (
    SELECT
      h.player_id,
      COUNT(DISTINCT h.user_id)::INT AS holders_count
    FROM public.holdings h
    JOIN public.players  p ON p.id = h.player_id
    WHERE p.club_id = p_club_id
      AND h.quantity > 0
    GROUP BY h.player_id
  ),
  ranked AS (
    SELECT
      o.player_id,
      o.holders_count,
      pl.first_name,
      pl.last_name,
      pl.shirt_number,
      pl.position,
      pl.image_url,
      ROW_NUMBER() OVER (
        ORDER BY o.holders_count DESC, pl.last_name ASC, pl.first_name ASC, o.player_id ASC
      )::INT AS rank
    FROM owned o
    JOIN public.players pl ON pl.id = o.player_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'player_id',     r.player_id,
        'first_name',    r.first_name,
        'last_name',     r.last_name,
        'shirt_number',  r.shirt_number,
        'position',      r.position,
        'image_url',     r.image_url,
        'holders_count', r.holders_count,
        'rank',          r.rank
      )
      ORDER BY r.rank ASC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM ranked r
  WHERE r.rank <= v_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.get_most_owned_players_per_club(uuid, int) IS
  'Slice 199 (2026-04-25): Most-owned scout cards per club. Aggregates '
  'holdings GROUP BY player_id (COUNT DISTINCT user_id) WHERE players.club_id '
  '= p_club_id AND quantity > 0. Returns JSONB array sorted by holders_count '
  'DESC. Empty club / NULL club_id: []. Public-safe via projection (NEVER '
  'returns user_id — only aggregate count + player metadata).';

-- ── AR-44: REVOKE/GRANT-Block ────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_most_owned_players_per_club(uuid, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_most_owned_players_per_club(uuid, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_most_owned_players_per_club(uuid, int) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_most_owned_players_per_club(uuid, int) TO service_role;
