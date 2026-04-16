-- =============================================================================
-- Slice 003 — Audit-Helper: get_check_enum_values (2026-04-16)
--
-- Kleiner read-only Helper-RPC fuer die INV-18-Testsuite.
-- Gibt die Enum-Werte eines "column = ANY (ARRAY[...])"-CHECK-Constraints zurueck.
-- Wird von `src/lib/__tests__/db-invariants.test.ts` INV-18 benutzt um
-- DB-CHECK-Werte mit TS-Union-Types zu vergleichen.
--
-- SECURITY: SECURITY INVOKER (keine Priv-Eskalation). pg_constraint ist via
-- service_role lesbar, via authenticated via grants auf pg_catalog.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_check_enum_values(p_constraint_name text)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_def text;
  v_inner text;
BEGIN
  -- Fetch pg_get_constraintdef fuer den gegebenen constraint-Namen in public schema
  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c
  JOIN pg_namespace n ON n.oid = c.connamespace
  WHERE n.nspname = 'public'
    AND c.conname = p_constraint_name
    AND c.contype = 'c'
  LIMIT 1;

  IF v_def IS NULL THEN
    RETURN NULL;
  END IF;

  -- Extract contents of ARRAY[...]
  v_inner := substring(v_def from 'ARRAY\[([^\]]+)\]');
  IF v_inner IS NULL THEN
    RETURN NULL;
  END IF;

  -- Split by ", ", strip surrounding quotes + ::type suffix
  -- Entry-Beispiel: "'trade_buy'::text"  → "trade_buy"
  RETURN ARRAY(
    SELECT trim(both '''' FROM regexp_replace(val, '''::[a-z_]+$', '', 'g'))
    FROM unnest(string_to_array(v_inner, ', ')) AS val
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_check_enum_values(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_check_enum_values(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_check_enum_values(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_check_enum_values(text) TO service_role;

COMMENT ON FUNCTION public.get_check_enum_values(text) IS
  'Slice 003 (2026-04-16): Audit-Helper. Returns enum values of a column CHECK constraint (ANY (ARRAY[...])). Used by INV-18.';
