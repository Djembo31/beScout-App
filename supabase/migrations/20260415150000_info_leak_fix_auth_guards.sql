-- ============================================================================
-- FIX-01 + FIX-02: Info-Leak Auth-Guards (HIGH-RISK RPC Audit 2026-04-15)
-- ============================================================================
-- Kontext: audit-high-risk-rpcs-2026-04-15.md
-- Findings:
--   XC-01: get_club_balance anon-callable, NO auth-Guard
--   XC-02: get_available_sc anon-callable, NO auth-Guard
-- Kein Money-Exploit, aber Business-Privacy-Leak (anon kann Club-Treasury
-- bzw. fremde User-Holdings lesen).
--
-- Fix-Pattern: auth.uid() Guard + Role-Check + REVOKE/GRANT Template (AR-44)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FIX-01: get_club_balance — nur club_admin ODER platform_admin
-- ----------------------------------------------------------------------------
-- Consumer-Analyse: src/components/admin/AdminWithdrawalTab.tsx (admin-only UI)
-- Interner Aufruf aus request_club_withdrawal (SECURITY DEFINER → postgres-owner
-- bypasst auth-check wenn via PERFORM, aber direkter RPC-Call aus Service geht
-- durch den Guard).
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_club_balance(p_club_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_is_club_admin BOOLEAN;
  v_is_platform_admin BOOLEAN;
  v_trade_fees BIGINT;
  v_sub_revenue BIGINT;
  v_total_earned BIGINT;
  v_total_withdrawn BIGINT;
BEGIN
  -- Auth Guard (XC-01 Fix)
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM club_admins WHERE club_id = p_club_id AND user_id = v_caller
  ) INTO v_is_club_admin;

  SELECT EXISTS(
    SELECT 1 FROM platform_admins WHERE user_id = v_caller
  ) INTO v_is_platform_admin;

  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_authorized: Kein Club-Admin oder Platform-Admin';
  END IF;

  -- Trading fees earned
  SELECT COALESCE(SUM(club_fee), 0) INTO v_trade_fees
  FROM trades
  WHERE player_id IN (SELECT id FROM players WHERE club_id = p_club_id);

  -- Subscription revenue
  SELECT COALESCE(SUM(price_cents), 0) INTO v_sub_revenue
  FROM club_subscriptions
  WHERE club_id = p_club_id AND status = 'active';

  v_total_earned := v_trade_fees + v_sub_revenue;

  -- Total withdrawn (pending + approved + paid count against available)
  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_withdrawn
  FROM club_withdrawals
  WHERE club_id = p_club_id AND status IN ('pending', 'approved', 'paid');

  RETURN json_build_object(
    'total_earned', v_total_earned,
    'trade_fees', v_trade_fees,
    'sub_revenue', v_sub_revenue,
    'total_withdrawn', v_total_withdrawn,
    'available', v_total_earned - v_total_withdrawn
  );
END;
$function$;

-- REVOKE/GRANT Template (AR-44)
REVOKE EXECUTE ON FUNCTION public.get_club_balance(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_club_balance(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_club_balance(uuid) TO authenticated;

-- Internal-Call-Kompatibilitaet: request_club_withdrawal ruft get_club_balance
-- via PL/pgSQL internal call (nicht via supabase.rpc) → Owner-Privileges (postgres)
-- bypassen die Auth-Guard. Trotzdem Sicherheitsnetz: postgres darf aufrufen.
GRANT EXECUTE ON FUNCTION public.get_club_balance(uuid) TO postgres;

-- ----------------------------------------------------------------------------
-- FIX-02: get_available_sc — nur eigenes p_user_id ODER platform_admin
-- ----------------------------------------------------------------------------
-- Consumer: src/lib/services/wallet.ts:87 (getAvailableSc — immer fuer aktuellen User)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_available_sc(p_user_id uuid, p_player_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_caller UUID := auth.uid();
  v_is_platform_admin BOOLEAN;
BEGIN
  -- Auth Guard (XC-02 Fix)
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;

  IF v_caller <> p_user_id THEN
    SELECT EXISTS(
      SELECT 1 FROM platform_admins WHERE user_id = v_caller
    ) INTO v_is_platform_admin;

    IF NOT v_is_platform_admin THEN
      RAISE EXCEPTION 'not_authorized: Nur eigene Holdings abrufbar';
    END IF;
  END IF;

  RETURN COALESCE(
    (SELECT h.quantity FROM public.holdings h
     WHERE h.user_id = p_user_id AND h.player_id = p_player_id),
    0
  ) - COALESCE(
    (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
     WHERE hl.user_id = p_user_id AND hl.player_id = p_player_id),
    0
  );
END;
$function$;

-- REVOKE/GRANT Template (AR-44)
REVOKE EXECUTE ON FUNCTION public.get_available_sc(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_available_sc(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_available_sc(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_sc(uuid, uuid) TO postgres;
