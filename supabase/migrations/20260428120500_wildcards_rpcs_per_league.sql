-- =============================================================================
-- Slice 251 Wave 2 Track F — Wildcard RPCs pro Liga
--
-- Source-of-truth: supabase/migrations/20260414200000_security_wildcard_rpcs_guards.sql (AR-27 hardening)
-- Applied patches (preserved):
--   AR-27: auth.uid()-Guard mit IS NOT NULL AND IS DISTINCT FROM-Pattern
--   AR-44: REVOKE EXECUTE FROM anon; GRANT EXECUTE TO authenticated
--   admin_grant_wildcards: auth.uid()=p_admin_id Guard + top_role='Admin' Check
--
-- Verify-Smoke post-apply:
--   SELECT pg_get_functiondef('public.earn_wildcards(uuid,int,text,uuid,uuid,text)'::regprocedure)
--   ILIKE '%auth.uid() IS NOT NULL%' AND
--   SELECT pg_get_functiondef('public.earn_wildcards(uuid,int,text,uuid,uuid,text)'::regprocedure)
--   ILIKE '%invalid_league%';
--   Expected: TRUE TRUE (auth-guard + league-validation preserved)
--
-- WICHTIG: NICHT via `mcp__supabase__apply_migration` ausfuehren —
--          Anil appliziert manuell post-Merge.
--
-- PATCH-AUDIT (Slice 156 Pflicht):
-- Letzter CREATE OR REPLACE: 20260414200000_security_wildcard_rpcs_guards.sql (AR-27)
-- Dieser File ersetzt: get_wildcard_balance, earn_wildcards, spend_wildcards,
--   refund_wildcards_on_leave, admin_grant_wildcards mit league-aware Versionen.
-- Preserve: alle Auth-Guards (IS NOT NULL + IS DISTINCT FROM), REVOKE/GRANT-Block.
--
-- Verify-SQL post-apply:
--   SELECT pg_get_functiondef('public.get_wildcard_balance(uuid,uuid)'::regprocedure);
--   -- Body muss p_league_id-Guard + SELECT ... WHERE user_id+league_id enthalten
--
--   SELECT pg_get_functiondef('public.earn_wildcards(uuid,int,text,uuid,uuid,text)'::regprocedure);
--   -- Body muss league_exists-Validate + ON CONFLICT (user_id, league_id) enthalten
--
--   SELECT pg_get_functiondef('public.spend_wildcards(uuid,int,text,uuid,uuid)'::regprocedure);
--   -- Body muss SELECT INTO + COALESCE (NICHT Scalar-Subquery) + league_exists enthalten
--
--   -- Function Smoke:
--   SELECT public.get_wildcard_balance('<test-uid>'::uuid, '<test-league-id>'::uuid);
--   -- Expected: 0 (wenn kein Row existiert) oder INT >= 0
--
--   -- REVOKE-Check:
--   SELECT grantee, privilege_type, is_grantable
--   FROM information_schema.role_routine_grants
--   WHERE routine_name IN ('get_wildcard_balance','earn_wildcards','spend_wildcards')
--     AND routine_schema = 'public';
--   -- Expected: authenticated = EXECUTE, anon/PUBLIC = nothing
-- =============================================================================

BEGIN;

-- =============================================================================
-- DROP old single-league signatures to avoid pg_proc Ambiguity (Slice 178, AR-44)
-- =============================================================================
DROP FUNCTION IF EXISTS public.get_wildcard_balance(uuid);
DROP FUNCTION IF EXISTS public.earn_wildcards(uuid, int, text, uuid, text);
DROP FUNCTION IF EXISTS public.spend_wildcards(uuid, int, text, uuid, text);
-- refund_wildcards_on_leave: different signature update below, keep old DROP for clarity
DROP FUNCTION IF EXISTS public.refund_wildcards_on_leave(uuid, uuid);

-- =============================================================================
-- RPC 1: get_wildcard_balance(p_user_id, p_league_id) RETURNS INT
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_wildcard_balance(
  p_user_id UUID,
  p_league_id UUID
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance INT;
BEGIN
  -- Auth guard: block cross-user reads (IS NOT NULL skips service_role which has uid=NULL)
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch';
  END IF;

  -- Validate league exists (AC-09 + Spam-Vektor-Mitigation)
  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = p_league_id AND is_active = true) THEN
    RAISE EXCEPTION 'invalid_league';
  END IF;

  SELECT balance INTO v_balance
  FROM public.user_wildcards
  WHERE user_id = p_user_id AND league_id = p_league_id;

  -- IF NOT FOUND: return 0 (no auto-init needed — earn_wildcards handles upsert)
  RETURN COALESCE(v_balance, 0);
END;
$$;

COMMENT ON FUNCTION public.get_wildcard_balance(uuid, uuid) IS
  'Slice 251 Wave 2 Track F: returns wildcard balance for a specific user+league. Returns 0 if no row exists. Validates league is active.';

REVOKE EXECUTE ON FUNCTION public.get_wildcard_balance(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_wildcard_balance(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_wildcard_balance(uuid, uuid) TO authenticated;

-- =============================================================================
-- RPC 2: earn_wildcards(p_user_id, p_amount, p_source, p_league_id, p_source_id, p_source_handle) RETURNS JSONB
-- =============================================================================
CREATE OR REPLACE FUNCTION public.earn_wildcards(
  p_user_id UUID,
  p_amount INT,
  p_source TEXT,
  p_league_id UUID,
  p_source_id UUID DEFAULT NULL,
  p_source_handle TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Auth guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'auth_uid_mismatch');
  END IF;

  -- Validate amount > 0
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Validate league exists + is active (AC-09 — Spam-Vektor: fake league_id)
  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = p_league_id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_league');
  END IF;

  -- Upsert: ON CONFLICT on composite PK (user_id, league_id)
  INSERT INTO public.user_wildcards (user_id, league_id, balance, earned_total, spent_total, updated_at)
  VALUES (p_user_id, p_league_id, p_amount, p_amount, 0, now())
  ON CONFLICT (user_id, league_id) DO UPDATE SET
    balance = public.user_wildcards.balance + EXCLUDED.balance,
    earned_total = public.user_wildcards.earned_total + EXCLUDED.earned_total,
    updated_at = now();

  -- Read new balance (SELECT INTO — KEIN Scalar-Subquery, errors-db.md NULL-in-Scalar-Subquery)
  SELECT balance INTO v_new_balance
  FROM public.user_wildcards
  WHERE user_id = p_user_id AND league_id = p_league_id;

  -- Log transaction (global wildcard_transactions table — no league_id column)
  INSERT INTO public.wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (
    p_user_id,
    p_amount,
    COALESCE(v_new_balance, 0),
    p_source,
    p_source_id,
    CASE WHEN p_source_handle IS NOT NULL THEN p_source_handle ELSE NULL END
  );

  RETURN jsonb_build_object(
    'success', true,
    'balance', COALESCE(v_new_balance, 0),
    'earned', p_amount
  );
END;
$$;

COMMENT ON FUNCTION public.earn_wildcards(uuid, int, text, uuid, uuid, text) IS
  'Slice 251 Wave 2 Track F: credits wildcard balance for a specific league. Validates league is active. Returns {success, balance, earned}.';

REVOKE EXECUTE ON FUNCTION public.earn_wildcards(uuid, int, text, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.earn_wildcards(uuid, int, text, uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.earn_wildcards(uuid, int, text, uuid, uuid, text) TO authenticated;

-- =============================================================================
-- RPC 3: spend_wildcards(p_user_id, p_amount, p_source, p_league_id, p_source_id) RETURNS JSONB
-- =============================================================================
CREATE OR REPLACE FUNCTION public.spend_wildcards(
  p_user_id UUID,
  p_amount INT,
  p_source TEXT,
  p_league_id UUID,
  p_source_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current INT;
  v_new_balance INT;
BEGIN
  -- Auth guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'auth_uid_mismatch');
  END IF;

  -- Validate amount > 0
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Validate league exists + is active
  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = p_league_id AND is_active = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_league');
  END IF;

  -- SELECT INTO (KEIN Scalar-Subquery! — errors-db.md "PL/pgSQL NULL-in-Scalar-Subquery MONEY")
  -- FOR UPDATE: pessimistic lock fuer concurrent spend
  SELECT balance INTO v_current
  FROM public.user_wildcards
  WHERE user_id = p_user_id AND league_id = p_league_id
  FOR UPDATE;

  -- Balance check: COALESCE auf Variable (NOT inside scalar subquery)
  IF COALESCE(v_current, 0) < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_wildcards');
  END IF;

  UPDATE public.user_wildcards SET
    balance = balance - p_amount,
    spent_total = spent_total + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id AND league_id = p_league_id;

  v_new_balance := v_current - p_amount;

  -- Log transaction
  INSERT INTO public.wildcard_transactions (user_id, amount, balance_after, source, reference_id)
  VALUES (p_user_id, -p_amount, v_new_balance, p_source, p_source_id);

  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'spent', p_amount
  );
END;
$$;

COMMENT ON FUNCTION public.spend_wildcards(uuid, int, text, uuid, uuid) IS
  'Slice 251 Wave 2 Track F: debits wildcard balance for a specific league. Uses SELECT INTO (not scalar subquery) for NULL-safe balance check. Returns {success, balance, spent}.';

REVOKE EXECUTE ON FUNCTION public.spend_wildcards(uuid, int, text, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.spend_wildcards(uuid, int, text, uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.spend_wildcards(uuid, int, text, uuid, uuid) TO authenticated;

-- =============================================================================
-- RPC 4: refund_wildcards_on_leave — update to use league_id from event
-- =============================================================================
CREATE OR REPLACE FUNCTION public.refund_wildcards_on_leave(p_user_id UUID, p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wc_count INT;
  v_event_league_id UUID;
BEGIN
  -- Count wild card slots from lineup
  SELECT COALESCE(array_length(wildcard_slots, 1), 0)
  INTO v_wc_count
  FROM public.lineups
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_wc_count > 0 THEN
    -- Lookup event → club → league_id for per-league refund
    SELECT c.league_id INTO v_event_league_id
    FROM public.events e
    JOIN public.clubs c ON c.id = e.club_id
    WHERE e.id = p_event_id;

    IF v_event_league_id IS NOT NULL THEN
      PERFORM public.earn_wildcards(
        p_user_id,
        v_wc_count,
        'event_refund',
        v_event_league_id,
        p_event_id,
        'Refund on event leave'
      );
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.refund_wildcards_on_leave(uuid, uuid) IS
  'Slice 251 Wave 2 Track F: refunds wildcard slots on lineup leave, credited to the event club league.';

REVOKE EXECUTE ON FUNCTION public.refund_wildcards_on_leave(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_wildcards_on_leave(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.refund_wildcards_on_leave(uuid, uuid) TO authenticated;

-- =============================================================================
-- RPC 5: admin_grant_wildcards — Composite-PK-aware rewrite (Fix #1, P0)
--
-- AR-27 baseline: admin_grant_wildcards(p_admin_id, p_target_user_id, p_amount, p_description)
-- Problem: old ON CONFLICT (user_id) fails after Composite-PK migration to (user_id, league_id).
-- Solution: new param p_league_id, ON CONFLICT (user_id, league_id).
--
-- Auth: auth.uid() MUSS mit p_admin_id matchen (AR-27 Guard).
--       Role-Check: profiles.top_role = 'Admin' auf auth.uid() (analog AR-27).
--
-- PATCH-AUDIT: AR-27 baseline (20260414200000) hatte p_admin_id + p_target_user_id + p_amount + p_description.
--   Neue Signatur ergänzt p_league_id. DROP alte Signaturen um pg_proc-Ambiguity zu vermeiden.
-- =============================================================================

-- DROP alte Signaturen (AR-27 + ältere Variante wenn vorhanden)
DROP FUNCTION IF EXISTS public.admin_grant_wildcards(uuid, uuid, int, text);
DROP FUNCTION IF EXISTS public.admin_grant_wildcards(uuid, int, text);

CREATE OR REPLACE FUNCTION public.admin_grant_wildcards(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_amount INT,
  p_league_id UUID,
  p_description TEXT DEFAULT 'admin_grant'
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
  v_new_balance INT;
BEGIN
  -- AUTH GUARD (AR-27): auth.uid() MUSS mit p_admin_id matchen
  -- IS NOT NULL skips service_role (Cron) where auth.uid() = NULL
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- ROLE GUARD: top_role auf auth.uid() (nicht p_admin_id) prüfen
  -- Analog AR-27 AR-40: SELECT top_role FROM profiles WHERE id = auth.uid()
  SELECT top_role INTO v_role FROM public.profiles WHERE id = auth.uid();
  IF v_role IS DISTINCT FROM 'Admin' THEN
    RAISE EXCEPTION 'admin_role_required' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Validate amount > 0
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Validate league exists (Spam-Vektor-Mitigation analog earn_wildcards)
  IF NOT EXISTS (SELECT 1 FROM public.leagues WHERE id = p_league_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_league');
  END IF;

  -- Composite-PK ON CONFLICT — Fix #1: correct conflict target after PK migration
  -- AR-27 baseline used ON CONFLICT (user_id) which breaks after (user_id, league_id) PK
  INSERT INTO public.user_wildcards (user_id, league_id, balance, earned_total, spent_total, updated_at)
  VALUES (p_target_user_id, p_league_id, p_amount, p_amount, 0, now())
  ON CONFLICT (user_id, league_id) DO UPDATE SET
    balance = public.user_wildcards.balance + EXCLUDED.balance,
    earned_total = public.user_wildcards.earned_total + EXCLUDED.earned_total,
    updated_at = now();

  -- SELECT INTO (KEIN Scalar-Subquery — errors-db.md NULL-in-Scalar-Subquery)
  SELECT balance INTO v_new_balance
  FROM public.user_wildcards
  WHERE user_id = p_target_user_id AND league_id = p_league_id;

  -- Log transaction (global wildcard_transactions — no league_id column)
  INSERT INTO public.wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_target_user_id, p_amount, COALESCE(v_new_balance, 0), 'admin_grant', NULL, COALESCE(p_description, 'admin_grant'));

  RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_new_balance, 0));
END;
$$;

COMMENT ON FUNCTION public.admin_grant_wildcards(uuid, uuid, int, uuid, text) IS
  'Slice 251 Wave 2 Track F: Composite-PK-aware admin_grant. p_league_id pflicht. Auth: auth.uid()=p_admin_id + top_role=Admin. Source-of-truth: 20260414200000_security_wildcard_rpcs_guards.sql (AR-27).';

-- AR-44 REVOKE/GRANT
REVOKE ALL ON FUNCTION public.admin_grant_wildcards(uuid, uuid, int, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_wildcards(uuid, uuid, int, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_wildcards(uuid, uuid, int, uuid, text) TO authenticated;

COMMIT;
