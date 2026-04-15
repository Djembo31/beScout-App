-- =============================================================================
-- J1-02 Registry-Drift Backfill — claim_welcome_bonus + get_auth_state (2026-04-15)
--
-- Root Cause: beide RPCs existieren live (working) aber haben KEIN Migration-File
-- → Rollback oder Greenfield-db-reset wuerde sie nicht wiederherstellen.
-- Analog 20260414160000_backfill_ipo_rpcs_drift.sql (IPO-RPCs drift).
--
-- Body 1:1 via pg_get_functiondef() vom Live-DB extrahiert (2026-04-15).
-- +REVOKE/GRANT-Block (AR-44 Template).
--
-- NOTE: welcome_bonus = 100_000 cents = 1.000 bCredits (bleibt unveraendert).
-- =============================================================================

-- ----------------------------------------------------------------------------
-- claim_welcome_bonus
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_welcome_bonus()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_already_claimed BOOLEAN;
  v_amount BIGINT := 100000; -- 1000 bCredits
  v_new_balance BIGINT;
  v_wallet_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nicht authentifiziert';
  END IF;

  SELECT EXISTS(SELECT 1 FROM welcome_bonus_claims WHERE user_id = v_user_id)
  INTO v_already_claimed;

  IF v_already_claimed THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_claimed', true
    );
  END IF;

  INSERT INTO welcome_bonus_claims (user_id, amount_cents)
  VALUES (v_user_id, v_amount);

  SELECT EXISTS(SELECT 1 FROM wallets WHERE user_id = v_user_id) INTO v_wallet_exists;

  IF v_wallet_exists THEN
    UPDATE wallets
    SET balance = balance + v_amount, updated_at = now()
    WHERE user_id = v_user_id
    RETURNING balance INTO v_new_balance;
  ELSE
    INSERT INTO wallets (user_id, balance, locked_balance)
    VALUES (v_user_id, v_amount, 0)
    RETURNING balance INTO v_new_balance;
  END IF;

  INSERT INTO transactions (user_id, type, amount, balance_after, description)
  VALUES (v_user_id, 'welcome_bonus', v_amount, v_new_balance, 'Welcome Bonus: 1.000 bCredits');

  RETURN jsonb_build_object(
    'ok', true,
    'already_claimed', false,
    'amount_cents', v_amount,
    'new_balance', v_new_balance
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_welcome_bonus() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_welcome_bonus() FROM anon;
GRANT EXECUTE ON FUNCTION public.claim_welcome_bonus() TO authenticated;

COMMENT ON FUNCTION public.claim_welcome_bonus() IS
  'J1-02 (2026-04-15): Registry-Drift Backfill. Body 1:1 vom Live-DB.';

-- ----------------------------------------------------------------------------
-- get_auth_state
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_state(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_profile JSONB;
  v_platform_role TEXT;
  v_club_admin JSONB;
BEGIN
  SELECT to_jsonb(p.*) INTO v_profile
  FROM profiles p WHERE p.id = p_user_id;

  SELECT pa.role INTO v_platform_role
  FROM platform_admins pa WHERE pa.user_id = p_user_id;

  SELECT jsonb_build_object(
    'clubId', ca.club_id,
    'slug', c.slug,
    'role', ca.role
  ) INTO v_club_admin
  FROM club_admins ca
  JOIN clubs c ON c.id = ca.club_id
  WHERE ca.user_id = p_user_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'profile', v_profile,
    'platformRole', v_platform_role,
    'clubAdmin', v_club_admin
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_auth_state(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_state(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_auth_state(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_auth_state(uuid) IS
  'J1-02 (2026-04-15): Registry-Drift Backfill. Body 1:1 vom Live-DB.';
