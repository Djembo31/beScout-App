-- Slice 044 — A-02 Vollstaendiger auth.uid() Body-Audit
-- Spec:   worklog/specs/044-a02-auth-uid-body-audit.md
-- Impact: worklog/impact/044-a02-auth-uid-body-audit.md
-- Date:   2026-04-18
--
-- Fixes 4 Kategorie-A SECURITY DEFINER RPCs mit authenticated-Grant + no_guard:
--   1. accept_mentee       — Body-Guard auf p_mentor_id
--   2. request_mentor      — Body-Guard auf p_mentee_id
--   3. subscribe_to_scout  — Body-Guard auf p_subscriber_id
--   4. award_dimension_score — REVOKE authenticated (Intent bereits in src/lib/services/scoutScores.ts:109)
--
-- Zusaetzlich: Audit-RPC public.get_security_definer_user_param_audit() fuer INV-31.
--
-- Pattern (AR-44 — siehe .claude/rules/common-errors.md):
--   IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_<user_id_param> THEN
--     RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
--   END IF;
-- IS NOT NULL skip-t Cron/System-Context (auth.uid()=NULL), IS DISTINCT FROM reject-t Cross-User.

-- =========================================================================
-- BLOCK 1: accept_mentee mit Guard auf p_mentor_id
-- =========================================================================
CREATE OR REPLACE FUNCTION public.accept_mentee(p_mentor_id uuid, p_mentorship_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mentorship mentorships%ROWTYPE;
BEGIN
  -- AR-44 Guard: Nur der Mentor selbst darf die Anfrage akzeptieren
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_mentor_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_mentorship FROM mentorships
    WHERE id = p_mentorship_id AND mentor_id = p_mentor_id AND status = 'pending';
  IF v_mentorship IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anfrage nicht gefunden');
  END IF;

  UPDATE mentorships SET status = 'active', started_at = NOW() WHERE id = p_mentorship_id;

  -- Notify mentee
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  VALUES (v_mentorship.mentee_id, 'system', 'Mentor akzeptiert!',
    'Dein Mentor hat die Anfrage angenommen. Starte jetzt deine Academy-Reise!', p_mentorship_id);

  RETURN jsonb_build_object('success', true);
END;
$function$;

COMMENT ON FUNCTION public.accept_mentee(uuid, uuid) IS
  'Slice 044 / AR-44: Body-Guard auf p_mentor_id. Nur Mentor selbst (oder service_role) darf aufrufen.';

-- =========================================================================
-- BLOCK 2: request_mentor mit Guard auf p_mentee_id
-- =========================================================================
CREATE OR REPLACE FUNCTION public.request_mentor(p_mentee_id uuid, p_mentor_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_mentor_stats user_stats%ROWTYPE;
  v_existing mentorships%ROWTYPE;
  v_mentorship_id UUID;
BEGIN
  -- AR-44 Guard: Nur der Mentee selbst darf eine Anfrage stellen
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_mentee_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_mentee_id = p_mentor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du kannst nicht dein eigener Mentor sein');
  END IF;

  -- Check mentor eligibility (Tier >= Profi, total_score >= 500)
  SELECT * INTO v_mentor_stats FROM user_stats WHERE user_id = p_mentor_id;
  IF v_mentor_stats IS NULL OR v_mentor_stats.total_score < 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mentor benötigt mindestens 500 Scout Score');
  END IF;

  -- Check for existing active mentorship
  SELECT * INTO v_existing FROM mentorships
    WHERE mentee_id = p_mentee_id AND status IN ('pending', 'active');
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du hast bereits einen aktiven Mentor');
  END IF;

  -- Create mentorship
  INSERT INTO mentorships (mentor_id, mentee_id, status)
  VALUES (p_mentor_id, p_mentee_id, 'pending')
  RETURNING id INTO v_mentorship_id;

  -- Initialize milestone progress
  INSERT INTO user_mentorship_progress (mentorship_id, milestone_id)
  SELECT v_mentorship_id, id FROM mentorship_milestones;

  -- Notify mentor
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  VALUES (p_mentor_id, 'system', 'Neue Mentee-Anfrage!',
    'Jemand möchte, dass du sein Mentor wirst.', v_mentorship_id);

  RETURN jsonb_build_object('success', true, 'mentorship_id', v_mentorship_id);
END;
$function$;

COMMENT ON FUNCTION public.request_mentor(uuid, uuid) IS
  'Slice 044 / AR-44: Body-Guard auf p_mentee_id. Nur Mentee selbst (oder service_role) darf aufrufen.';

-- =========================================================================
-- BLOCK 3: subscribe_to_scout mit Guard auf p_subscriber_id (HIGH-RISK: Money-Path)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.subscribe_to_scout(p_subscriber_id uuid, p_scout_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_price_cents BIGINT;
  v_sub_enabled BOOLEAN;
  v_balance BIGINT;
  v_fee_pct INT;
  v_platform_fee BIGINT;
  v_scout_earned BIGINT;
  v_sub_id UUID;
  v_expires TIMESTAMPTZ;
  v_existing INT;
  v_subscriber_name TEXT;
BEGIN
  -- AR-44 Guard: Nur der Subscriber selbst darf ein Abo abschliessen (Money-Path)
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_subscriber_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- Guard: self-sub
  IF p_subscriber_id = p_scout_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kein Self-Abo erlaubt');
  END IF;

  -- Check scout has subscriptions enabled
  SELECT subscription_enabled, subscription_price_cents
  INTO v_sub_enabled, v_price_cents
  FROM profiles WHERE id = p_scout_id;

  IF NOT v_sub_enabled OR v_price_cents IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Scout hat kein Abo aktiviert');
  END IF;

  -- Check no active subscription
  SELECT COUNT(*) INTO v_existing
  FROM scout_subscriptions
  WHERE subscriber_id = p_subscriber_id AND scout_id = p_scout_id AND status = 'active' AND expires_at > now();

  IF v_existing > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du hast bereits ein aktives Abo');
  END IF;

  -- Check balance
  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_subscriber_id FOR UPDATE;
  IF v_balance IS NULL OR (v_balance - COALESCE((SELECT locked_balance FROM wallets WHERE user_id = p_subscriber_id), 0)) < v_price_cents THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
  END IF;

  -- Fee from config (default 15%)
  SELECT COALESCE((value#>>'{}')::INT, 15) INTO v_fee_pct
  FROM creator_config WHERE key = 'beratervertrag_platform_fee_pct';
  IF v_fee_pct IS NULL THEN v_fee_pct := 15; END IF;

  v_platform_fee := (v_price_cents * v_fee_pct) / 100;
  v_scout_earned := v_price_cents - v_platform_fee;
  v_expires := now() + interval '30 days';

  -- Deduct subscriber
  UPDATE wallets SET balance = balance - v_price_cents, updated_at = now()
  WHERE user_id = p_subscriber_id;

  -- Credit scout
  UPDATE wallets SET balance = balance + v_scout_earned, updated_at = now()
  WHERE user_id = p_scout_id;

  -- Insert subscription
  INSERT INTO scout_subscriptions (subscriber_id, scout_id, price_cents, scout_earned_cents, platform_fee_cents, expires_at)
  VALUES (p_subscriber_id, p_scout_id, v_price_cents, v_scout_earned, v_platform_fee, v_expires)
  RETURNING id INTO v_sub_id;

  -- Transaction logs
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    p_subscriber_id, 'scout_subscription', -v_price_cents,
    (SELECT balance FROM wallets WHERE user_id = p_subscriber_id),
    v_sub_id, 'Beratervertrag abgeschlossen'
  );

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    p_scout_id, 'scout_subscription_earning', v_scout_earned,
    (SELECT balance FROM wallets WHERE user_id = p_scout_id),
    v_sub_id, 'Beratervertrag-Einnahme'
  );

  -- Notification
  SELECT COALESCE(display_name, handle) INTO v_subscriber_name FROM profiles WHERE id = p_subscriber_id;
  INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type)
  VALUES (
    p_scout_id, 'subscription_new',
    'Neuer Abonnent!',
    v_subscriber_name || ' hat deinen Beratervertrag abgeschlossen',
    v_sub_id, 'scout_subscription'
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'price_cents', v_price_cents,
    'scout_earned', v_scout_earned,
    'expires_at', v_expires
  );
END;
$function$;

COMMENT ON FUNCTION public.subscribe_to_scout(uuid, uuid) IS
  'Slice 044 / AR-44: Body-Guard auf p_subscriber_id. Nur Subscriber selbst (oder service_role) darf aufrufen. Money-Path: Wallet-Deduct.';

-- =========================================================================
-- BLOCK 4: REVOKE authenticated from award_dimension_score
-- ACHTUNG: RPC wird NUR intern von 11 Triggern/Cron-Funktionen aufgerufen.
-- Frontend-Kommentar in src/lib/services/scoutScores.ts:109 sagt bereits
-- "award_dimension_score is REVOKED from PUBLIC — all scoring now happens via DB triggers".
-- Diese Migration bringt DB-Grants mit Intent in Einklang.
-- =========================================================================
REVOKE EXECUTE ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb)
  FROM authenticated;

COMMENT ON FUNCTION public.award_dimension_score(uuid, text, integer, text, text, jsonb) IS
  'Slice 044: REVOKED authenticated. Aufruf nur intern via Trigger/Cron (service_role owner-context). Direkter Client-Call blockiert.';

-- =========================================================================
-- BLOCK 5: Audit-RPC fuer INV-31
-- Klassifiziert alle SECURITY DEFINER RPCs mit user-identity-Parametern.
-- Return: JSONB-Array mit Eintraegen {proname, args, guard_type, grant_status, allowlist_reason}
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_security_definer_user_param_audit()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  -- Allowlist: RPCs die OHNE strict_guard authenticated sind, aber aus validem Grund OK
  WITH user_param_rpcs AS (
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proacl,
      pg_get_functiondef(p.oid) AS body
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proargnames IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(p.proargnames) an
        WHERE an ~ '^p_(user_id|target_user_id|owner_id|seller_id|buyer_id|voter_id|caller_id|requester_id|authored_by|created_by|holder_id|profile_id|member_id|follower_id|following_id|scout_id|mentor_id|mentee_id|tipper_id|recipient_id|sender_id|subscriber_id|from_user_id|to_user_id)$'
      )
  ),
  classified AS (
    SELECT
      proname,
      args,
      CASE
        WHEN proacl::text ~ 'authenticated=X' THEN 'authenticated'
        WHEN proacl::text ~ 'service_role=X' AND proacl::text !~ 'authenticated' THEN 'service_role_only'
        WHEN proacl IS NULL THEN 'default_public'
        ELSE 'other'
      END AS grant_status,
      CASE
        WHEN body ~* 'auth\.uid\(\)\s*IS\s+NOT\s+NULL\s+AND\s+auth\.uid\(\)\s*IS\s+DISTINCT\s+FROM' THEN 'strict_guard'
        WHEN body ~* 'auth\.uid\(\)\s*IS\s+DISTINCT\s+FROM\s+p_' THEN 'loose_guard'
        WHEN body ~* 'is_admin\s*\(\s*auth\.uid\(\)\s*\)' THEN 'admin_role_guard'
        WHEN body ~* 'top_role\s+IS\s+DISTINCT\s+FROM\s+''Admin''' THEN 'admin_role_guard'
        WHEN body ~* 'v_caller_uid\s+IS\s+NOT\s+NULL\s+AND\s+p_user_id\s*<>\s*v_caller_uid' THEN 'explicit_caller_check'
        WHEN body ~* 'v_caller\s*<>\s*p_user_id' THEN 'explicit_caller_check'
        WHEN body ~* 'club_admins\s+WHERE\s+[^;]*user_id\s*=\s*auth\.uid\(\)' THEN 'club_admin_guard'
        WHEN body ~* 'auth\.uid\(\)' THEN 'other_auth_use'
        ELSE 'no_guard'
      END AS guard_type,
      proname AS name_for_allowlist
    FROM user_param_rpcs
  ),
  with_reason AS (
    SELECT
      proname,
      args,
      grant_status,
      guard_type,
      CASE
        WHEN guard_type IN ('strict_guard','admin_role_guard','club_admin_guard','explicit_caller_check') THEN NULL
        WHEN guard_type = 'loose_guard' AND grant_status = 'authenticated' THEN 'loose_guard_client_only'
        WHEN grant_status = 'service_role_only' THEN 'service_role_only'
        WHEN proname IN ('is_club_admin','get_club_by_slug') AND guard_type IN ('no_guard','other_auth_use') THEN 'read_only_helper'
        WHEN proname IN ('credit_tickets','spend_tickets','get_available_sc') AND guard_type = 'explicit_caller_check' THEN 'explicit_caller_check'
        ELSE NULL
      END AS allowlist_reason
    FROM classified
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'proname', proname,
      'args', args,
      'grant_status', grant_status,
      'guard_type', guard_type,
      'allowlist_reason', allowlist_reason,
      'needs_fix', (guard_type = 'no_guard' AND grant_status = 'authenticated' AND allowlist_reason IS NULL)
    )
    ORDER BY proname
  ) INTO v_result
  FROM with_reason;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

-- Grants for audit function: authenticated + service_role (INV-31 runs with anon-key in vitest)
REVOKE ALL ON FUNCTION public.get_security_definer_user_param_audit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_security_definer_user_param_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_definer_user_param_audit() TO anon;
GRANT EXECUTE ON FUNCTION public.get_security_definer_user_param_audit() TO service_role;

COMMENT ON FUNCTION public.get_security_definer_user_param_audit() IS
  'Slice 044 / INV-31: Audit aller SECURITY DEFINER RPCs mit user-identity-Parameter. Liefert guard_type + grant_status + allowlist_reason pro RPC. Read-only Scan von pg_proc.';
