-- =============================================================================
-- AR-50 (J8, 2026-04-15) — Trade-RPCs Anon-Lockdown (7 RPCs)
--
-- PROBLEM:
--   7 Trade-RPCs haben anon=EXECUTE grant live — J4 earn_wildcards-Muster.
--   Alle RPCs haben auth.uid()-Guard im Body (defense-in-depth), aber die
--   AR-44 Template-Pflicht (REVOKE anon) ist nicht durchgesetzt.
--
-- SCOPE:
--   - accept_offer
--   - buy_from_market (wird AR-52 gedropt aber hier defensiv REVOKE)
--   - cancel_buy_order
--   - cancel_offer_rpc
--   - counter_offer
--   - create_offer
--   - reject_offer
--
-- Bodies bleiben unveraendert — nur Grants werden angepasst.
-- =============================================================================

-- accept_offer (signatures kommen live — meist uuid)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN (
        'accept_offer','buy_from_market','cancel_buy_order',
        'cancel_offer_rpc','counter_offer','create_offer','reject_offer'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    RAISE NOTICE 'AR-50 J8: REVOKE anon + GRANT authenticated on %(%)', r.proname, r.args;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.accept_offer IS
  'AR-50 (2026-04-15): REVOKE anon + GRANT authenticated only.';
