-- Slice 045 — A-03 RLS-Matrix komplett
-- Audit-RPC fuer INV-32: alle public Tabellen + ihre Policy-Matrix klassifiziert.
-- Spec: worklog/specs/045-a03-rls-matrix-komplett.md
-- Date: 2026-04-18

CREATE OR REPLACE FUNCTION public.get_rls_policy_matrix()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  WITH tables_with_meta AS (
    SELECT
      t.relname AS table_name,
      t.relrowsecurity AS has_rls,
      t.relforcerowsecurity AS force_rls,
      COUNT(pol.polname) AS policy_count,
      COUNT(pol.polname) FILTER (
        WHERE (pg_get_expr(pol.polqual, pol.polrelid) = 'true' OR pol.polqual IS NULL)
          AND pol.polcmd <> 'a'  -- 'a' = INSERT, NULL qual ist hier OK
      ) AS permissive_select_update_delete_count,
      COUNT(pol.polname) FILTER (
        WHERE pg_get_expr(pol.polqual, pol.polrelid) = 'true'
          AND pol.polcmd <> 'a'
      ) AS qual_true_count
    FROM pg_class t
    JOIN pg_namespace n ON t.relnamespace = n.oid
    LEFT JOIN pg_policy pol ON pol.polrelid = t.oid
    WHERE n.nspname = 'public'
      AND t.relkind = 'r'
    GROUP BY t.relname, t.relrowsecurity, t.relforcerowsecurity
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'table_name', table_name,
      'has_rls', has_rls,
      'force_rls', force_rls,
      'policy_count', policy_count,
      'permissive_select_update_delete_count', permissive_select_update_delete_count,
      'qual_true_count', qual_true_count,
      'is_qual_true', (qual_true_count > 0)
    )
    ORDER BY table_name
  ) INTO v_result
  FROM tables_with_meta;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_rls_policy_matrix() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_matrix() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_matrix() TO anon;
GRANT EXECUTE ON FUNCTION public.get_rls_policy_matrix() TO service_role;

COMMENT ON FUNCTION public.get_rls_policy_matrix() IS
  'Slice 045 / INV-32: RLS-Policy-Matrix fuer alle public Tabellen. Read-only Scan von pg_class + pg_policy.';
