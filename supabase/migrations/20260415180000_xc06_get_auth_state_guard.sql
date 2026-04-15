-- =============================================================================
-- XC-06 (2026-04-15): get_auth_state auth.uid()-Guard gegen trust-client-Param
--
-- Context: Reviewer J1-Finding (LOW post-Beta). `get_auth_state(p_user_id)` hatte
-- KEINEN Guard gegen p_user_id != auth.uid(). AR-44 Template fordert Guard bei
-- SECURITY DEFINER + trust-client-Parametern (Pattern: adjust_user_wallet,
-- send_tip, spend_wildcards).
--
-- Risk (pre-fix): User A konnte Auth-State von User B lesen (Profile + platform-
-- role + club-admin-Zugehoerigkeit). RLS bremst weiter (profile+clubs SELECT),
-- aber SECURITY DEFINER umgeht RLS — pure Info-Leak.
--
-- Consumer-Check (2026-04-15, 3 Caller):
--   - AuthProvider.tsx:142 `getAuthState(userId)` — userId aus onAuthStateChange
--   - AuthProvider.tsx:193 `loadProfile(userId, ...)` — Pass-through derselbe u.id
--   - AuthProvider.tsx:204+271 `loadProfile(u.id)` — session.user.id, self-only
--   Alle self-only. Guard ist non-breaking.
--
-- Body 1:1 identisch mit 20260415160100_j1_backfill_drift_welcome_bonus_auth_state.sql
-- nur Guard-Block + Comment zugefuegt.
-- =============================================================================

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
  -- XC-06 Guard (AR-44): trust-client-Param muss gegen auth.uid() verifiziert werden
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

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
  'XC-06 (2026-04-15): auth.uid()-Guard gegen trust-client-Param zugefuegt (AR-44).';
