-- Slice 462 — D-35: get_club_dashboard_stats_v2 Admin-Guard + REVOKE anon
-- ---------------------------------------------------------------------------
-- CEO-approved (Anil 2026-06-29 "Komplett: REVOKE anon + Admin-Guard", §3).
--
-- v2 war ohne Guard + an anon granted -> jeder anon/authenticated konnte fuer JEDEN
-- Club Club-IPO-Umsatz + Top-Fan-PII (user_id/holdings_count) lesen. Konsumenten =
-- nur AdminOverviewTab/AdminRevenueTab (admin-gated). Carry-forward D-35 aus S461.
--
-- Guard byte-exakt aus der KANONISCHEN club-scoped Referenz get_club_balance
-- (platform_admins-Tabelle = reale Platform-Admin-Quelle; NICHT die Stats-Siblings
-- rpc_get_club_trading_fees/fan_stats, die den dead profiles.top_role='Admin'-Branch
-- nutzen = 0 Match -> haetten echte Platform-Admins ausgesperrt). club_admin(p_club_id)
-- OR platform_admin, sonst RAISE. v2-Body sonst byte-identisch (PATCH-AUDIT S156).
--
-- Kanon: errors-db S095 (PII->admin-Guard), S347 (Platform-Admin-Override im RPC spiegeln),
--        S005 (SECDEF-Guard), AR-44/S368c (CREATE OR REPLACE erhaelt ACL -> REVOKE explizit).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_club_dashboard_stats_v2(p_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid := auth.uid();
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
  v_ipo_revenue BIGINT;
  v_total_fans BIGINT;
  v_top_fans JSONB;
BEGIN
  -- Guard (S095/S347): club-scoped PII/Finanz -> nur Club-Admin des Clubs ODER Platform-Admin.
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;
  SELECT EXISTS(SELECT 1 FROM club_admins    WHERE club_id = p_club_id AND user_id = v_caller) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = v_caller)                        INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_authorized: Kein Club-Admin oder Platform-Admin';
  END IF;

  -- IPO revenue: sum of all ipo_purchases for players of this club
  SELECT COALESCE(SUM(ip.price * ip.quantity), 0) INTO v_ipo_revenue
  FROM ipo_purchases ip
  JOIN ipos i ON i.id = ip.ipo_id
  JOIN players p ON p.id = i.player_id
  WHERE p.club_id = p_club_id;

  -- Total fans: profiles with this favorite_club_id
  SELECT COUNT(*) INTO v_total_fans
  FROM profiles
  WHERE favorite_club_id = p_club_id;

  -- Top fans: users with most holdings of this club's players
  SELECT COALESCE(jsonb_agg(fan ORDER BY fan->>'total_score' DESC), '[]'::jsonb) INTO v_top_fans
  FROM (
    SELECT jsonb_build_object(
      'user_id', h.user_id,
      'handle', pr.handle,
      'avatar_url', pr.avatar_url,
      'total_score', COALESCE(us.total_score, 0),
      'holdings_count', SUM(h.quantity)
    ) AS fan
    FROM holdings h
    JOIN players pl ON pl.id = h.player_id
    LEFT JOIN profiles pr ON pr.id = h.user_id
    LEFT JOIN user_stats us ON us.user_id = h.user_id
    WHERE pl.club_id = p_club_id AND h.quantity > 0
    GROUP BY h.user_id, pr.handle, pr.avatar_url, us.total_score
    ORDER BY SUM(h.quantity) DESC
    LIMIT 10
  ) sub;

  RETURN jsonb_build_object(
    'ipo_revenue_cents', v_ipo_revenue,
    'total_fans', v_total_fans,
    'top_fans', v_top_fans
  );
END;
$function$;

-- AR-44/S368c: CREATE OR REPLACE erhaelt die alte ACL (inkl. anon) -> explizit entziehen.
REVOKE EXECUTE ON FUNCTION public.get_club_dashboard_stats_v2(uuid) FROM anon, PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_club_dashboard_stats_v2(uuid) TO authenticated;
