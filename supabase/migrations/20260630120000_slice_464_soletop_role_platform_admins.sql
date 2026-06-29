-- Slice 464 — D-37: SOLE-gate top_role-RPCs reparieren (platform_admins)
-- ---------------------------------------------------------------------------
-- CEO-approved (Anil 2026-06-30 "mach autonom weiter", W0-Thread §3 Money — selbst).
--
-- 3 live-verdrahtete Admin-RPCs gateten auf profiles.top_role='Admin' = 0 Match global
-- (Plattform migrierte auf platform_admins) -> SOLE-gate, kein club_admins-Fallback ->
-- always-reject = effektiv TOT (fail-closed). grant_founding_pass (MONEY/bcredits-Mint +
-- Kill-Switch), admin_grant_wildcards (MINTING user_wildcards), cancel_event_entries.
--
-- Fix: Admin-Guard je RPC auf kanonische platform_admins-Quelle (identisch D-36/v2/
-- get_club_balance/UI isPlatformAdmin). Money/Minting-Bodies (CASE-Tiers, Kill-Switch,
-- wallet/transactions/wildcard-INSERT) byte-treu aus live functiondef (D87, S156).
-- Unbenutzte DECLARE-Vars (v_admin_role/v_role) entfernt. admin_grant_wildcards:
-- auth_uid_mismatch-Spoof-Guard BLEIBT. Da die RPCs aktuell JEDEN ablehnen, kann der
-- Fix nur restaurieren (Platform-Admin-Zugang), nichts verschlechtern. Kanon: errors-db S463/S462.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.admin_grant_wildcards(p_admin_id uuid, p_target_user_id uuid, p_amount integer, p_league_id uuid, p_description text DEFAULT 'admin_grant'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_new_balance INT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = p_league_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_league');
  END IF;

  INSERT INTO public.user_wildcards (user_id, league_id, balance, earned_total, spent_total, updated_at)
  VALUES (p_target_user_id, p_league_id, p_amount, p_amount, 0, now())
  ON CONFLICT (user_id, league_id) DO UPDATE SET
    balance = public.user_wildcards.balance + EXCLUDED.balance,
    earned_total = public.user_wildcards.earned_total + EXCLUDED.earned_total,
    updated_at = now();

  SELECT balance INTO v_new_balance
  FROM public.user_wildcards
  WHERE user_id = p_target_user_id AND league_id = p_league_id;

  INSERT INTO public.wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_target_user_id, p_amount, COALESCE(v_new_balance, 0), 'admin_grant', NULL, COALESCE(p_description, 'admin_grant'));

  RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_new_balance, 0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_event_entries(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  RETURN public.rpc_cancel_event_entries(p_event_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.grant_founding_pass(p_user_id uuid, p_tier text, p_price_eur_cents integer, p_payment_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_bcredits BIGINT;
  v_bonus_pct INT;
  v_price_eur_cents BIGINT;
  v_pass_id UUID;
  v_new_balance BIGINT;
  v_wallet_exists BOOLEAN;
  v_total_eur_cents BIGINT;
  v_kill_switch_limit BIGINT := 90000000; -- 900,000 EUR in cents
BEGIN
  -- 1. Admin check (platform_admins = kanonische Quelle, D-37/S462)
  IF NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Nicht berechtigt: Nur Admins koennen Founding Passes vergeben';
  END IF;

  -- 2. Validate tier (VOR Preis/Kill-Switch — CASE braucht gültigen Tier)
  IF p_tier NOT IN ('fan', 'scout', 'pro', 'founder') THEN
    RAISE EXCEPTION 'Ungueltiger Tier: %', p_tier;
  END IF;

  -- 3. Derive bcredits + bonus + price SERVER-SIDE (Slice 316: Preis nicht mehr Client-Wahrheit)
  CASE p_tier
    WHEN 'fan'     THEN v_bcredits := 250000;   v_bonus_pct := 15; v_price_eur_cents := 999;
    WHEN 'scout'   THEN v_bcredits := 1000000;  v_bonus_pct := 25; v_price_eur_cents := 2999;
    WHEN 'pro'     THEN v_bcredits := 3500000;  v_bonus_pct := 35; v_price_eur_cents := 7499;
    WHEN 'founder' THEN v_bcredits := 10000000; v_bonus_pct := 50; v_price_eur_cents := 19999;
  END CASE;

  -- 4. Client-Preis gegen server-abgeleiteten Wert validieren (Drift/Manipulation laut)
  IF p_price_eur_cents IS DISTINCT FROM v_price_eur_cents::integer THEN
    RAISE EXCEPTION 'Preis-Mismatch fuer Tier %: erwartet % cents, erhalten %',
      p_tier, v_price_eur_cents, p_price_eur_cents;
  END IF;

  -- 5. KILL-SWITCH: EUR 900K Verkaufslimit (nutzt server-Preis, kein Client-Bypass)
  SELECT COALESCE(SUM(price_eur_cents), 0) INTO v_total_eur_cents
  FROM user_founding_passes;

  IF v_total_eur_cents + v_price_eur_cents > v_kill_switch_limit THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'KILL_SWITCH_ACTIVE',
      'message', 'EUR 900K Verkaufslimit erreicht. Keine weiteren Founding Passes moeglich.',
      'total_eur_cents', v_total_eur_cents,
      'limit_eur_cents', v_kill_switch_limit
    );
  END IF;

  -- 6. Insert founding pass record (server-Preis)
  INSERT INTO user_founding_passes (user_id, tier, price_eur_cents, bcredits_granted, migration_bonus_pct, payment_reference, granted_by)
  VALUES (p_user_id, p_tier, v_price_eur_cents, v_bcredits, v_bonus_pct, p_payment_reference, auth.uid())
  RETURNING id INTO v_pass_id;

  -- 7. Credit wallet (UPSERT)
  SELECT EXISTS(SELECT 1 FROM wallets WHERE user_id = p_user_id) INTO v_wallet_exists;

  IF v_wallet_exists THEN
    UPDATE wallets
    SET balance = balance + v_bcredits, updated_at = now()
    WHERE user_id = p_user_id
    RETURNING balance INTO v_new_balance;
  ELSE
    INSERT INTO wallets (user_id, balance, locked_balance)
    VALUES (p_user_id, v_bcredits, 0)
    RETURNING balance INTO v_new_balance;
  END IF;

  -- 8. Transaction log
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_user_id, 'founding_pass', v_bcredits, v_new_balance, v_pass_id,
          'Founding Pass: ' || initcap(p_tier));

  -- 9. Return result
  RETURN jsonb_build_object(
    'ok', true,
    'pass_id', v_pass_id,
    'bcredits_granted', v_bcredits,
    'new_balance', v_new_balance,
    'total_eur_cents', v_total_eur_cents + v_price_eur_cents,
    'limit_eur_cents', v_kill_switch_limit
  );
END;
$function$;

-- AR-44 (database.md): CREATE OR REPLACE erhaelt ACL (S368c) — Block re-assertet Grants (idempotent).
REVOKE EXECUTE ON FUNCTION public.admin_grant_wildcards(uuid, uuid, integer, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_grant_wildcards(uuid, uuid, integer, uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_event_entries(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cancel_event_entries(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_founding_pass(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.grant_founding_pass(uuid, text, integer, text) TO authenticated;
