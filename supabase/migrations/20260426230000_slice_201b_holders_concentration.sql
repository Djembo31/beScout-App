-- Slice 201b (2026-04-26): Holders-Distribution Aggregate-RPC (FM-4.3)
--
-- Closes Phase-A FM-Audit-Finding 4.3:
-- "Holders-Distribution-Mini-Bar in Row fehlt (z.B. Top-10 owners hold 60%)".
-- Sorare-Standard fuer Liquid/Iliquid-Erkennung — Floor-Price kann taeuschen
-- wenn 1 Holder 80% haelt.
--
-- Pattern: get_player_holder_count Blueprint (Slice 014).
-- SECURITY DEFINER bypasses holdings-RLS (Slice 014 tightened RLS to own-rows only).
-- Output ist anonymized — kein user_id, kein handle.

CREATE OR REPLACE FUNCTION public.get_player_holders_concentration(p_player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_total_holders INT := 0;
  v_total_supply BIGINT := 0;
  v_top_10_supply BIGINT := 0;
  v_top_10_pct NUMERIC := 0;
BEGIN
  -- Auth-guard: anon blocked at body level (analog Slice 014 RPCs).
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'auth_required',
      'total_holders', 0,
      'total_supply', 0,
      'top_10_supply', 0,
      'top_10_pct', 0
    );
  END IF;

  -- Aggregate per-user-Holdings (sum quantity per user, top 10 by sum).
  WITH per_user AS (
    SELECT user_id, SUM(quantity)::bigint AS user_supply
    FROM public.holdings
    WHERE player_id = p_player_id
      AND quantity > 0
    GROUP BY user_id
  ),
  top_10 AS (
    SELECT user_supply
    FROM per_user
    ORDER BY user_supply DESC
    LIMIT 10
  )
  SELECT
    (SELECT COUNT(*)::int FROM per_user),
    (SELECT COALESCE(SUM(user_supply), 0)::bigint FROM per_user),
    (SELECT COALESCE(SUM(user_supply), 0)::bigint FROM top_10)
  INTO v_total_holders, v_total_supply, v_top_10_supply;

  IF v_total_supply > 0 THEN
    v_top_10_pct := ROUND((v_top_10_supply::numeric / v_total_supply::numeric) * 100, 1);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_holders', v_total_holders,
    'total_supply', v_total_supply,
    'top_10_supply', v_top_10_supply,
    'top_10_pct', v_top_10_pct
  );
END;
$function$;

COMMENT ON FUNCTION public.get_player_holders_concentration(uuid) IS
  'Slice 201b (2026-04-26): Top-10-Holders-Concentration per player. Anonymized aggregate (no user_id). SECURITY DEFINER bypasses Slice 014 holdings-RLS. Returns {success, total_holders, total_supply, top_10_supply, top_10_pct}.';

REVOKE EXECUTE ON FUNCTION public.get_player_holders_concentration(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_player_holders_concentration(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_player_holders_concentration(uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_player_holders_concentration(uuid) TO service_role;
