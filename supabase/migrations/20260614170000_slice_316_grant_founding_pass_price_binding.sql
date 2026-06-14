-- Slice 316 — Founding-Pass Money-Härtung (S7 Phase-2 #2)
-- Source-of-truth: live pg_get_functiondef('public.grant_founding_pass(uuid,text,integer,text)') 2026-06-14
-- Problem: p_price_eur_cents war freier Caller-Param, verbatim gespeichert + im EUR-900K-Kill-Switch
--          summiert → EUR-Wahrheit nur im Client (AdminFoundingPassesTab.tsx:171).
-- Fix: Preis server-seitig aus Tier ableiten (CASE, Kanon = TS-Preise 999/2999/7499/19999),
--      v_price für INSERT + Kill-Switch; p_price_eur_cents-Mismatch → RAISE (Client-Drift laut).
-- bcredits-CASE bleibt unverändert (Anil-Decision 2026-06-14: RPC-Werte sind Kanon).
-- Signatur unverändert → CREATE OR REPLACE ohne DROP. AR-44 REVOKE/GRANT-Block am Ende.

CREATE OR REPLACE FUNCTION public.grant_founding_pass(
  p_user_id uuid,
  p_tier text,
  p_price_eur_cents integer,
  p_payment_reference text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_admin_role TEXT;
  v_bcredits BIGINT;
  v_bonus_pct INT;
  v_price_eur_cents BIGINT;
  v_pass_id UUID;
  v_new_balance BIGINT;
  v_wallet_exists BOOLEAN;
  v_total_eur_cents BIGINT;
  v_kill_switch_limit BIGINT := 90000000; -- 900,000 EUR in cents
BEGIN
  -- 1. Admin check
  SELECT top_role INTO v_admin_role FROM profiles WHERE id = auth.uid();
  IF v_admin_role IS DISTINCT FROM 'Admin' THEN
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

-- AR-44: CREATE OR REPLACE resettet Privilegien → explizit REVOKE + GRANT.
REVOKE EXECUTE ON FUNCTION public.grant_founding_pass(uuid, text, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_founding_pass(uuid, text, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.grant_founding_pass(uuid, text, integer, text) TO authenticated;
