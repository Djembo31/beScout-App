-- =============================================================================
-- Slice 004 — Audit-Helper: get_rls_policy_coverage (2026-04-16)
--
-- Gibt pro RLS-enabled Tabelle in public schema die Policy-cmd-Coverage zurueck.
-- Used von INV-19 (keine RLS-Tabelle mit 0 Policies ausser Whitelist) und
-- INV-20 (critical money-tables coverage match).
--
-- SECURITY: SECURITY INVOKER (keine Priv-Eskalation). pg_policy ist fuer
-- service_role lesbar.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_rls_policy_coverage()
RETURNS TABLE(table_name text, cmds text, policy_count int)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
  WITH tables AS (
    SELECT c.oid, c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity = true
  ),
  policies AS (
    SELECT
      p.polrelid,
      string_agg(DISTINCT
        CASE p.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END, ',' ORDER BY
        CASE p.polcmd
          WHEN 'r' THEN 'SELECT'
          WHEN 'a' THEN 'INSERT'
          WHEN 'w' THEN 'UPDATE'
          WHEN 'd' THEN 'DELETE'
          WHEN '*' THEN 'ALL'
        END
      ) AS cmds,
      COUNT(*)::int AS policy_count
    FROM pg_policy p
    GROUP BY p.polrelid
  )
  SELECT t.table_name, COALESCE(p.cmds, '') AS cmds, COALESCE(p.policy_count, 0) AS policy_count
  FROM tables t
  LEFT JOIN policies p ON p.polrelid = t.oid
  ORDER BY t.table_name;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rls_policy_coverage() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rls_policy_coverage() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_coverage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_coverage() TO service_role;

COMMENT ON FUNCTION public.get_rls_policy_coverage() IS
  'Slice 004 (2026-04-16): Audit-Helper. Returns RLS policy coverage per public table. Used by INV-19/INV-20.';
