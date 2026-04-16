-- =============================================================================
-- Slice 005 — Audit-Helper: get_auth_guard_audit (2026-04-17)
--
-- Returns auth-guard status for every SECURITY DEFINER RPC in public schema.
-- Used by INV-21 to verify: no SECURITY DEFINER with `p_user_id` parameter
-- and `authenticated`-grant lacks auth.uid() in body (the A-02 exploit class).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_auth_guard_audit()
RETURNS TABLE(
  proname text,
  has_authenticated_grant boolean,
  has_auth_uid_in_body boolean,
  has_p_user_id_param boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    p.proname::text,
    EXISTS (
      SELECT 1 FROM information_schema.routine_privileges rp
      WHERE rp.routine_schema = 'public'
        AND rp.specific_name LIKE p.proname || '_%'
        AND rp.grantee::text = 'authenticated'
        AND rp.privilege_type = 'EXECUTE'
    ) AS has_authenticated_grant,
    pg_get_functiondef(p.oid) ILIKE '%auth.uid()%' AS has_auth_uid_in_body,
    pg_get_function_arguments(p.oid) ILIKE '%p_user_id%uuid%' AS has_p_user_id_param
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
  ORDER BY p.proname;
$$;

REVOKE EXECUTE ON FUNCTION public.get_auth_guard_audit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_guard_audit() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_auth_guard_audit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_guard_audit() TO service_role;

COMMENT ON FUNCTION public.get_auth_guard_audit() IS
  'Slice 005 (2026-04-17): Audit-Helper. Returns auth-guard status per SECURITY DEFINER RPC. Used by INV-21.';
