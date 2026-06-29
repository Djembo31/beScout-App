-- Slice 463 — D-36: Stats-Siblings Platform-Admin-Guard auf platform_admins
-- ---------------------------------------------------------------------------
-- CEO-approved (Anil 2026-06-29 "mach d36", §3).
--
-- rpc_get_club_trading_fees + rpc_get_club_fan_stats prueften Platform-Admin per
-- profiles.top_role='Admin' = 0 Match in DB (dead branch) -> Platform-Admin-Override tot,
-- seit S462 sichtbar inkonsistent (v2 erlaubt Platform-Admin via platform_admins, Siblings
-- RAISEn). Fix = je 1 Zeile auf die KANONISCHE Quelle platform_admins (wie v2/get_club_balance
-- + 21 weitere RPCs; = UI-Quelle isPlatformAdmin/supabaseMiddleware, kein S347-Drift).
-- club_admins-Branch unveraendert -> rein permissiver, bricht keinen Club-Admin-Caller.
-- Body byte-treu aus live functiondef (D87), nur die platform-admin-Guard-Zeile getauscht (S156).
-- anon schon revoked (anon_exec=false), kein Grant-Change. Kanon: errors-db S462/S347.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.rpc_get_club_trading_fees(p_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.club_admins WHERE user_id = v_caller AND club_id = p_club_id) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_club_admin_or_platform_admin';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'totalClubFee',     COALESCE(SUM(t.club_fee), 0),
      'totalPlatformFee', COALESCE(SUM(t.platform_fee), 0),
      'totalPbtFee',      COALESCE(SUM(t.pbt_fee), 0),
      'tradeCount',       COUNT(*)
    )
    FROM public.trades t
    JOIN public.players p ON p.id = t.player_id
    WHERE p.club_id = p_club_id
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_get_club_fan_stats(p_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
  v_active_7d int;
  v_active_30d int;
  v_top_fans jsonb;
  v_seven_days timestamptz := NOW() - INTERVAL '7 days';
  v_thirty_days timestamptz := NOW() - INTERVAL '30 days';
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.club_admins WHERE user_id = v_caller AND club_id = p_club_id) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_club_admin_or_platform_admin';
  END IF;

  -- active fans last 7d (distinct users involved in any trade of club's players)
  SELECT COUNT(DISTINCT uid)
  INTO v_active_7d
  FROM (
    SELECT t.buyer_id AS uid FROM public.trades t
    JOIN public.players p ON p.id = t.player_id
    WHERE p.club_id = p_club_id AND t.executed_at >= v_seven_days AND t.buyer_id IS NOT NULL
    UNION
    SELECT t.seller_id FROM public.trades t
    JOIN public.players p ON p.id = t.player_id
    WHERE p.club_id = p_club_id AND t.executed_at >= v_seven_days AND t.seller_id IS NOT NULL
  ) u;

  -- active fans last 30d + top fans computation
  SELECT COUNT(DISTINCT uid)
  INTO v_active_30d
  FROM (
    SELECT t.buyer_id AS uid FROM public.trades t
    JOIN public.players p ON p.id = t.player_id
    WHERE p.club_id = p_club_id AND t.executed_at >= v_thirty_days AND t.buyer_id IS NOT NULL
    UNION
    SELECT t.seller_id FROM public.trades t
    JOIN public.players p ON p.id = t.player_id
    WHERE p.club_id = p_club_id AND t.executed_at >= v_thirty_days AND t.seller_id IS NOT NULL
  ) u;

  -- top fans by volume (last 30d), joined with profile handle
  SELECT COALESCE(jsonb_agg(row_to_json(tf.*) ORDER BY tf.volume_cents DESC), '[]'::jsonb)
  INTO v_top_fans
  FROM (
    SELECT
      u.user_id,
      COALESCE(pr.handle, 'unknown') AS handle,
      pr.display_name,
      SUM(u.trade_count)::int AS trade_count,
      SUM(u.volume_cents)::bigint AS volume_cents
    FROM (
      SELECT t.buyer_id AS user_id, 1 AS trade_count, (t.price * t.quantity) AS volume_cents
      FROM public.trades t
      JOIN public.players p ON p.id = t.player_id
      WHERE p.club_id = p_club_id AND t.executed_at >= v_thirty_days AND t.buyer_id IS NOT NULL
      UNION ALL
      SELECT t.seller_id, 1, (t.price * t.quantity)
      FROM public.trades t
      JOIN public.players p ON p.id = t.player_id
      WHERE p.club_id = p_club_id AND t.executed_at >= v_thirty_days AND t.seller_id IS NOT NULL
    ) u
    LEFT JOIN public.profiles pr ON pr.id = u.user_id
    GROUP BY u.user_id, pr.handle, pr.display_name
    ORDER BY volume_cents DESC
    LIMIT 10
  ) tf;

  RETURN jsonb_build_object(
    'activeFans7d',  COALESCE(v_active_7d, 0),
    'activeFans30d', COALESCE(v_active_30d, 0),
    'topFans',       v_top_fans
  );
END;
$function$;

-- AR-44 (database.md): CREATE OR REPLACE erhaelt die bestehende ACL (S368c, anon war schon
-- revoked) — der REVOKE/GRANT-Block re-assertet die korrekten Grants explizit (idempotent,
-- kein Live-Change). Beide RPCs: anon/PUBLIC kein EXECUTE, authenticated ja, service_role bleibt.
REVOKE EXECUTE ON FUNCTION public.rpc_get_club_trading_fees(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_get_club_trading_fees(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.rpc_get_club_fan_stats(uuid)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rpc_get_club_fan_stats(uuid)    TO authenticated;
