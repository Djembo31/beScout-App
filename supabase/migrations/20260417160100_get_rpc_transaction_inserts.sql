-- Slice 034 — Audit-Helper-RPC fuer transactions.type Drift-Erkennung
--
-- Liefert pro RPC alle INSERT INTO transactions Statement-Bloecke (eine Row pro Statement).
-- Der TS-Test (INV-30) parsed die snippets und extrahiert die type-Strings (Position 2 oder 3
-- in der VALUES-Tuple, je nach Spaltenreihenfolge), gleicht sie gegen den CHECK-Constraint
-- ab und meldet Drifts.
--
-- Konsumiert von INV-30 db-invariants Test + manuelle Audits via execute_sql.

CREATE OR REPLACE FUNCTION public.get_rpc_transaction_inserts()
RETURNS TABLE (rpc_name TEXT, snippet TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  r RECORD;
  m TEXT[];
BEGIN
  FOR r IN
    SELECT p.proname, p.prosrc
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosrc ILIKE '%INSERT%transactions%'
      AND p.prosrc !~* 'INSERT\s+INTO\s+(public\.)?(ticket|wildcard|pbt)_transactions'
  LOOP
    FOR m IN
      SELECT regexp_matches(
        r.prosrc,
        E'(INSERT\\s+INTO\\s+(?:public\\.)?transactions[\\s\\S]*?;)',
        'gi'
      )
    LOOP
      RETURN QUERY SELECT r.proname::TEXT, m[1]::TEXT;
    END LOOP;
  END LOOP;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_rpc_transaction_inserts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_rpc_transaction_inserts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rpc_transaction_inserts() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_rpc_transaction_inserts() TO service_role;

COMMENT ON FUNCTION public.get_rpc_transaction_inserts()
IS 'Slice 034 audit-helper. Returns one row per INSERT INTO transactions statement found in RPC bodies. Service-role only — used by INV-30 db-invariants test.';
