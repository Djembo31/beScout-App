-- Slice 330b — Treasury-Saldo Debit-Reconcile + Kontoauszug-RPC.
-- Problem: Slice 330 führte CSF-Debits ins club_treasury_ledger ein. get_club_balance (329) rechnete
--   available = brutto-Credits − Withdrawals (Debits ignoriert). request_club_withdrawal liest exakt
--   diesen available → ausgezahltes CSF wäre nochmal abhebbar = Money-Leck.
-- Fix: available = Ledger-Netto (SUM credit − SUM debit) − Withdrawals — identisch zum 330-Guard-Maß.
--   + csf_paid / total_debited exposen. 5 alte Keys erhalten (backward-compat).
-- Plus: get_club_treasury_ledger (Kontoauszug, JSONB-Return gegen 1000-Cap, admin-Guard).
-- CEO 2026-06-17: Deposit NICHT in dieser Slice. Baseline get_club_balance = live functiondef 2026-06-17 (= 329).

-- ============================================================
-- 1. get_club_balance v2 — available reflektiert Debits
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_club_balance(p_club_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
  v_trade_fees bigint;
  v_sub_revenue bigint;
  v_total_earned bigint;
  v_total_withdrawn bigint;
  v_ledger_net bigint;
  v_total_debited bigint;
  v_csf_paid bigint;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'auth_required: Nicht authentifiziert'; END IF;
  SELECT EXISTS(SELECT 1 FROM club_admins WHERE club_id = p_club_id AND user_id = v_caller) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_authorized: Kein Club-Admin oder Platform-Admin';
  END IF;

  -- Brutto-Credit-Breakdown (Anzeige "verdient" — unverändert)
  SELECT COALESCE(SUM(amount), 0) INTO v_trade_fees FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'credit'
      AND type IN ('trade_fee','ipo_fee','p2p_fee','opening_trade_fees');
  SELECT COALESCE(SUM(amount), 0) INTO v_sub_revenue FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'credit'
      AND type IN ('subscription','opening_subscription');
  v_total_earned := v_trade_fees + v_sub_revenue;

  -- Debit-Summen (NEU)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_debited FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'debit';
  SELECT COALESCE(SUM(amount), 0) INTO v_csf_paid FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'debit' AND type = 'csf';

  -- Ledger-Netto = ALLE Credits − ALLE Debits (deckt auch künftige Credit-/Debit-Typen ab,
  -- identisch zum 330-Guard-Maß → Guard == UI == Withdrawal-Gate konsistent)
  SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
    INTO v_ledger_net FROM club_treasury_ledger WHERE club_id = p_club_id;

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_withdrawn FROM club_withdrawals
    WHERE club_id = p_club_id AND status IN ('pending','approved','paid');

  RETURN json_build_object(
    'total_earned', v_total_earned,
    'trade_fees', v_trade_fees,
    'sub_revenue', v_sub_revenue,
    'total_withdrawn', v_total_withdrawn,
    'csf_paid', v_csf_paid,
    'total_debited', v_total_debited,
    'available', v_ledger_net - v_total_withdrawn
  );
END; $$;
-- Baseline-Grants 1:1 (live verifiziert 2026-06-17: authenticated+postgres+service_role).
REVOKE ALL ON FUNCTION public.get_club_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_balance(uuid) TO authenticated, postgres, service_role;

-- ============================================================
-- 2. get_club_treasury_ledger — Kontoauszug (JSONB-Return, admin-Guard)
--    JSONB statt TABLE+range (errors-db.md: PostgREST RPC ignoriert .range()).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_club_treasury_ledger(p_club_id uuid, p_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
  v_result jsonb;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'auth_required: Nicht authentifiziert'; END IF;
  SELECT EXISTS(SELECT 1 FROM club_admins WHERE club_id = p_club_id AND user_id = v_caller) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_authorized: Kein Club-Admin oder Platform-Admin';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC, t.id DESC), '[]'::jsonb)
    INTO v_result
  FROM (
    SELECT id, direction, type, amount, balance_after, description, created_at
    FROM club_treasury_ledger
    WHERE club_id = p_club_id
    ORDER BY created_at DESC, id DESC
    LIMIT GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1)
  ) t;

  RETURN v_result;
END; $$;
REVOKE ALL ON FUNCTION public.get_club_treasury_ledger(uuid, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_treasury_ledger(uuid, int) TO authenticated, postgres, service_role;

COMMENT ON FUNCTION public.get_club_treasury_ledger(uuid, int) IS
  'Slice 330b: Kontoauszug des Club-Treasury (Credits + Debits inkl. CSF). JSONB-Array, admin-Guard. Read-only.';
