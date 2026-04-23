-- =============================================================================
-- Slice 179 (Tier A2) — Transactions Append-Only Enforcement
--
-- Context:
--   CLAUDE.md Money-Regel: "Trades/Transactions append-only (kein UPDATE/DELETE
--   auf Logs)". Bisher nur Dokumentation, nicht DB-enforced. Slice 179 setzt
--   das als Database-Invariant durch.
--
-- Implementation (defense-in-depth):
--   1. REVOKE UPDATE, DELETE from anon + authenticated (Client-Rollen)
--   2. BEFORE UPDATE OR DELETE trigger raises exception — blockt auch
--      SECURITY DEFINER RPCs die versehentlich mutieren
--   3. Opt-in GUC `bescout.allow_transactions_mutation = 'true'` via SET LOCAL
--      erlaubt legitimierten one-time-backfill-Migrations den Bypass
--
-- Verify nach Apply:
--   SELECT policyname, cmd FROM pg_policies WHERE tablename='transactions'
--     ORDER BY policyname;
--   SELECT tgname, tgtype FROM pg_trigger
--     WHERE tgrelid = 'public.transactions'::regclass AND NOT tgisinternal;
--
-- Referenz: common-errors.md "Transactions/Trades append-only — hart enforced".
-- =============================================================================

-- 1. REVOKE client-role DML privileges (RPC bleibt via SECURITY DEFINER operational)
REVOKE UPDATE, DELETE ON public.transactions FROM anon;
REVOKE UPDATE, DELETE ON public.transactions FROM authenticated;

-- 2. Defense-in-depth trigger guard
CREATE OR REPLACE FUNCTION public.transactions_enforce_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Legitimate one-time-backfill opt-in:
  --   BEGIN;
  --   SET LOCAL bescout.allow_transactions_mutation = 'true';
  --   UPDATE public.transactions SET ... WHERE ...;
  --   COMMIT;
  IF current_setting('bescout.allow_transactions_mutation', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'transactions is append-only (slice 179). % blocked on row %.',
    TG_OP, COALESCE(OLD.id::TEXT, NEW.id::TEXT);
END;
$$;

COMMENT ON FUNCTION public.transactions_enforce_append_only() IS
  'Slice 179 (2026-04-24): Blocks UPDATE/DELETE on transactions. '
  'Bypass via SET LOCAL bescout.allow_transactions_mutation = ''true'' for one-time-backfills.';

-- Drop trigger first (idempotent — migration can be re-applied safely)
DROP TRIGGER IF EXISTS transactions_append_only_guard ON public.transactions;

CREATE TRIGGER transactions_append_only_guard
BEFORE UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.transactions_enforce_append_only();

COMMENT ON TRIGGER transactions_append_only_guard ON public.transactions IS
  'Slice 179: Defense-in-depth append-only guard. '
  'Even SECURITY DEFINER RPCs must opt-in via SET LOCAL GUC to mutate.';
