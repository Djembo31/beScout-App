-- =============================================================================
-- Slice 019 — Audit-Helper: get_rls_policy_quals (2026-04-17)
--
-- Gibt pro Policy auf einer whitelist-Tabelle in public schema die qual-Expression
-- zurueck. Verwendet von INV-26 als Regression-Guard gegen die AUTH-08-Klasse
-- (Slice 014): qual='true' auf sensiblen Tabellen = permissive-for-all-authenticated.
--
-- SECURITY: SECURITY INVOKER (keine Priv-Eskalation). pg_policy ist fuer
-- authenticated + service_role lesbar via catalog-permissions.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_rls_policy_quals(p_tables text[])
RETURNS TABLE(
  table_name text,
  policy_name text,
  cmd text,
  qual text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  SELECT
    c.relname::text AS table_name,
    p.polname::text AS policy_name,
    CASE p.polcmd
      WHEN 'r' THEN 'SELECT'
      WHEN 'a' THEN 'INSERT'
      WHEN 'w' THEN 'UPDATE'
      WHEN 'd' THEN 'DELETE'
      WHEN '*' THEN 'ALL'
    END::text AS cmd,
    pg_get_expr(p.polqual, p.polrelid)::text AS qual
  FROM pg_policy p
  JOIN pg_class c ON c.oid = p.polrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(p_tables);
$$;

REVOKE EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_quals(text[]) TO service_role;

COMMENT ON FUNCTION public.get_rls_policy_quals(text[]) IS
  'Slice 019 (2026-04-17): Audit-Helper. Returns RLS policy quals for whitelisted tables. Used by INV-26 to guard against AUTH-08-class qual=true regressions.';
