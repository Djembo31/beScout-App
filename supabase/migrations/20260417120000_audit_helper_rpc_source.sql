-- ============================================================
-- Slice 023 (B4) — Audit-Helper RPC fuer RPC-Body-Scan
--
-- Ermoeglicht Live-DB-Invariant-Tests den pg_get_functiondef() Output
-- eines RPC zu lesen (analog zu Slice 019's get_rls_policy_quals).
--
-- Security: SECURITY DEFINER + REVOKE anon + REVOKE authenticated.
-- Nur service_role (Backend-only / CI-Tests) hat EXECUTE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_rpc_source(p_rpc_name text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
  SELECT pg_get_functiondef(p.oid)
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = p_rpc_name
  LIMIT 1;
$function$;

-- AR-44 Pflicht-Block: REVOKE default + GRANT explizit
REVOKE EXECUTE ON FUNCTION public.get_rpc_source(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rpc_source(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rpc_source(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_rpc_source(text) TO service_role;

COMMENT ON FUNCTION public.get_rpc_source(text) IS
  'Audit-Helper fuer CI-Invariants. Liefert pg_get_functiondef() fuer einen RPC. '
  'GRANTed nur service_role — anon/authenticated geblockt, keine RPC-Body-Enumeration fuer Clients.';
