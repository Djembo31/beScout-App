-- =============================================================================
-- AR-53 (J8, 2026-04-15) — place_sell_order Error-Message Cleanup
--
-- PROBLEM (J3-Triple-Red-Flag):
--   place_sell_order enthaelt:
--     IF p_price > v_price_cap THEN RETURN json_build_object(
--       'success', false,
--       'error', 'Preis ueberschreitet Maximum (' || (v_price_cap / 100)
--                || ' $SCOUT). Max. erlaubt: 3x Referenzwert oder 3x Median...'
--     ); END IF;
--
--   Drei Verstoesse:
--     (a) DE/EN-Mix (Tech-Error mit DE)
--     (b) $SCOUT Ticker user-facing
--     (c) dynamischer Wert (v_price_cap / 100)
--
--   Plus:
--     'Ungueltiger Preis. Mindestens 1 Cent.' → business.md "Cent" ist DE,
--     statischer String aber weiter rawless.
--
-- FIX:
--   Ersetze beide Error-Strings durch static i18n-Keys via regexp_replace.
--   Frontend mapErrorToKey:
--     'maxPriceExceeded' → existing key
--     'invalidPrice' → existing key
-- =============================================================================

DO $$
DECLARE
  v_body TEXT;
  v_new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_body
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='place_sell_order';

  IF v_body !~ '\$SCOUT' AND v_body !~ 'Ungueltiger Preis' THEN
    RAISE NOTICE 'AR-53: place_sell_order bereits clean. Skipping.';
    RETURN;
  END IF;

  -- maxPriceExceeded: dynamic $SCOUT-error → static key
  v_new_body := regexp_replace(
    v_body,
    E'''error'', ''Preis ueberschreitet Maximum \\('' \\|\\| \\(v_price_cap / 100\\) \\|\\| '' \\$SCOUT\\)[^'']+''',
    '''error'', ''maxPriceExceeded''',
    'g'
  );

  -- invalidPrice: static DE-string → static key
  v_new_body := regexp_replace(
    v_new_body,
    '''error'', ''Ungueltiger Preis[^'']*''',
    '''error'', ''invalidPrice''',
    'g'
  );

  EXECUTE v_new_body;
END $$;

-- REVOKE-Block defensiv erneuern (CREATE OR REPLACE reset).
DO $$
DECLARE
  v_args TEXT;
BEGIN
  SELECT pg_get_function_identity_arguments(p.oid) INTO v_args
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='place_sell_order';

  EXECUTE format('REVOKE EXECUTE ON FUNCTION public.place_sell_order(%s) FROM PUBLIC', v_args);
  EXECUTE format('REVOKE EXECUTE ON FUNCTION public.place_sell_order(%s) FROM anon', v_args);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.place_sell_order(%s) TO authenticated', v_args);
END $$;
