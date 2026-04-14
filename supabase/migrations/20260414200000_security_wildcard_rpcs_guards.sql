-- =============================================================================
-- AR-27 (Operation Beta Ready, Journey #4) — 🚨 P0 SECURITY HARDENING
--
-- PROBLEM (Live-Exploit verifiziert 2026-04-14 vom Backend-Audit-Agent):
--   5 Wildcard-RPCs sind SECURITY DEFINER + anon-callable ohne auth.uid()-Guard.
--   Anon-Client konnte via POST /rest/v1/rpc/earn_wildcards beliebigem User
--   99.999 Wildcards minten. Trace wurde reverted.
--
-- BETROFFEN:
--   1. earn_wildcards(p_user_id, p_amount, p_source, p_reference_id, p_description)
--   2. spend_wildcards(p_user_id, p_amount, p_source, p_reference_id, p_description)
--   3. get_wildcard_balance(p_user_id)
--   4. refund_wildcards_on_leave(p_user_id, p_event_id)
--   5. admin_grant_wildcards(p_admin_id, p_target_user_id, p_amount, p_description)
--
-- FIX-STRATEGIE (analog J2-AR-8 buy_from_ipo Pattern):
--   a) auth.uid()-Guard am RPC-Anfang: p_user_id (bzw. p_admin_id) MUSS auth.uid() matchen
--   b) admin_grant_wildcards zusaetzlich: top_role-Check auf auth.uid() (nicht auf p_admin_id)
--   c) REVOKE EXECUTE FROM PUBLIC, anon + GRANT TO authenticated (Layer 2 Defense)
--
-- BODIES: 1:1 aus supabase/migrations/20260326_wildcards.sql dupliziert,
--   OpenAPI-Signaturen gegengeprueft (keine Drift-Migration in der Zwischenzeit).
--   ONLY CHANGE: Auth-Guard-Block am Anfang + Fehlermessages deutsch.
--
-- ROLLBACK-PLAN: Falls Regression:
--   Re-apply 20260326_wildcards.sql (alte Bodies ohne Guard) — NICHT empfohlen
--   da Exploit re-live. Bevorzugt: Bug-Fix + neue Forward-Migration.
--
-- VERIFY nach Apply:
--   1. anon.rpc('earn_wildcards', ...) → HTTP 403/permission_denied ODER 'Nicht authentifiziert'
--   2. anon.rpc('get_wildcard_balance', ...) → permission_denied
--   3. authenticated.rpc(...) mit auth.uid()=p_user_id → funktioniert
--   4. authenticated.rpc(...) mit auth.uid()!=p_user_id → 'Nicht authentifiziert'
-- =============================================================================

-- =============================================================================
-- 1. get_wildcard_balance — Guard: auth.uid() = p_user_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_wildcard_balance(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance INT;
BEGIN
  -- AUTH GUARD (AR-27)
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT balance INTO v_balance FROM user_wildcards WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_wildcards (user_id, balance, earned_total, spent_total)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 0;
  END IF;
  RETURN v_balance;
END;
$$;

-- =============================================================================
-- 2. earn_wildcards — Guard: auth.uid() = p_user_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.earn_wildcards(
  p_user_id UUID,
  p_amount INT,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- AUTH GUARD (AR-27)
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Upsert user_wildcards
  INSERT INTO user_wildcards (user_id, balance, earned_total, spent_total)
  VALUES (p_user_id, p_amount, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_wildcards.balance + p_amount,
    earned_total = user_wildcards.earned_total + p_amount,
    updated_at = now();

  SELECT balance INTO v_new_balance FROM user_wildcards WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_user_id, p_amount, v_new_balance, p_source, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- =============================================================================
-- 3. spend_wildcards — Guard: auth.uid() = p_user_id
-- =============================================================================
CREATE OR REPLACE FUNCTION public.spend_wildcards(
  p_user_id UUID,
  p_amount INT,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current INT;
  v_new_balance INT;
BEGIN
  -- AUTH GUARD (AR-27)
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT balance INTO v_current FROM user_wildcards WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_current < p_amount THEN
    RAISE EXCEPTION 'insufficient_wildcards';
  END IF;

  UPDATE user_wildcards SET
    balance = balance - p_amount,
    spent_total = spent_total + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;

  v_new_balance := v_current - p_amount;

  INSERT INTO wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_user_id, -p_amount, v_new_balance, p_source, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- =============================================================================
-- 4. refund_wildcards_on_leave — Guard: auth.uid() = p_user_id
--    WICHTIG: Diese RPC callt intern earn_wildcards via PERFORM. Der innere Call
--    laeuft mit gleicher auth.uid() weiter (SECURITY DEFINER vererbt session-auth)
--    → Guard im Inner-Call wird auch erfuellt wenn p_user_id matcht.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.refund_wildcards_on_leave(p_user_id UUID, p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wc_count INT;
BEGIN
  -- AUTH GUARD (AR-27)
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Count wild card slots from lineup
  SELECT COALESCE(array_length(wildcard_slots, 1), 0)
  INTO v_wc_count
  FROM lineups
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_wc_count > 0 THEN
    PERFORM earn_wildcards(p_user_id, v_wc_count, 'event_refund', p_event_id, 'Refund on event leave');
  END IF;
END;
$$;

-- =============================================================================
-- 5. admin_grant_wildcards — Guards:
--    (a) auth.uid() = p_admin_id (verhindert trust-client p_admin_id spoofing)
--    (b) top_role = 'Admin' auf auth.uid() (nicht auf p_admin_id)
--    (c) Inner-Call earn_wildcards: auth.uid() bleibt Admin, aber Guard dort
--        erwartet auth.uid() = p_target_user_id → wuerde fehlschlagen.
--        LOESUNG: Direkt ins user_wildcards schreiben, NICHT via earn_wildcards.
--        (Admin grantet an Fremd-User → auth.uid() = Admin != p_target_user_id)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.admin_grant_wildcards(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_amount INT,
  p_description TEXT DEFAULT 'Admin grant'
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
  v_new_balance INT;
BEGIN
  -- AUTH GUARD (AR-27 + AR-40): auth.uid() MUSS mit p_admin_id matchen
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'Nicht authentifiziert' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ROLE GUARD: top_role auf auth.uid() pruefen (NICHT auf p_admin_id)
  SELECT top_role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'Admin' THEN
    RAISE EXCEPTION 'Nur Admins' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Direkt in user_wildcards schreiben (NICHT via earn_wildcards, weil dessen
  -- auth.uid()-Guard p_target_user_id erwartet, hier aber Admin granted an Fremd-User).
  INSERT INTO user_wildcards (user_id, balance, earned_total, spent_total)
  VALUES (p_target_user_id, p_amount, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_wildcards.balance + p_amount,
    earned_total = user_wildcards.earned_total + p_amount,
    updated_at = now();

  SELECT balance INTO v_new_balance FROM user_wildcards WHERE user_id = p_target_user_id;

  -- Log transaction
  INSERT INTO wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_target_user_id, p_amount, v_new_balance, 'admin_grant', NULL, p_description);

  RETURN v_new_balance;
END;
$$;

-- =============================================================================
-- REVOKE + GRANT (Layer 2 Defense)
-- =============================================================================

-- Pattern (laut database.md Zeile 34):
--   REVOKE: Von PUBLIC, authenticated, anon (alle 3!) → dann GRANT an authenticated
--   Layer-1-Defense = auth.uid()-Guard im Body
--   Layer-2-Defense = Role-based Privileges

-- 1. get_wildcard_balance(uuid)
REVOKE EXECUTE ON FUNCTION public.get_wildcard_balance(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_wildcard_balance(UUID) TO authenticated;

-- 2. earn_wildcards(uuid, int, text, uuid, text)
REVOKE EXECUTE ON FUNCTION public.earn_wildcards(UUID, INT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.earn_wildcards(UUID, INT, TEXT, UUID, TEXT) TO authenticated;

-- 3. spend_wildcards(uuid, int, text, uuid, text)
REVOKE EXECUTE ON FUNCTION public.spend_wildcards(UUID, INT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.spend_wildcards(UUID, INT, TEXT, UUID, TEXT) TO authenticated;

-- 4. refund_wildcards_on_leave(uuid, uuid)
REVOKE EXECUTE ON FUNCTION public.refund_wildcards_on_leave(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_wildcards_on_leave(UUID, UUID) TO authenticated;

-- 5. admin_grant_wildcards(uuid, uuid, int, text)
REVOKE EXECUTE ON FUNCTION public.admin_grant_wildcards(UUID, UUID, INT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_wildcards(UUID, UUID, INT, TEXT) TO authenticated;

-- =============================================================================
-- COMMENTS fuer Audit-Trail
-- =============================================================================
COMMENT ON FUNCTION public.earn_wildcards(UUID, INT, TEXT, UUID, TEXT) IS
  'AR-27 hardened 2026-04-14: auth.uid()-Guard + REVOKE anon. Exploit-Fix.';
COMMENT ON FUNCTION public.spend_wildcards(UUID, INT, TEXT, UUID, TEXT) IS
  'AR-27 hardened 2026-04-14: auth.uid()-Guard + REVOKE anon.';
COMMENT ON FUNCTION public.get_wildcard_balance(UUID) IS
  'AR-27 hardened 2026-04-14: auth.uid()-Guard + REVOKE anon.';
COMMENT ON FUNCTION public.refund_wildcards_on_leave(UUID, UUID) IS
  'AR-27 hardened 2026-04-14: auth.uid()-Guard + REVOKE anon.';
COMMENT ON FUNCTION public.admin_grant_wildcards(UUID, UUID, INT, TEXT) IS
  'AR-27+AR-40 hardened 2026-04-14: auth.uid()=p_admin_id + top_role-Check auf auth.uid().';
