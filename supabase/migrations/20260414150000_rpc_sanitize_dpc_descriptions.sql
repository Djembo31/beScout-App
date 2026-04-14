-- Phase 1.3 Kategorie A: DPC to SC Sanitize in 10 RPC Bodies
-- Sanitizes user-facing UPPER-CASE "DPC"/"DPCs" (error messages, descriptions, comments).
-- Does NOT touch lowercase dpc identifiers (table/column names like dpc_mastery, dpc_available).
-- Does NOT rename functions (separate migration for buy_player_dpc / calculate_dpc_of_week).

DO $migrate$
DECLARE
  rpc_name TEXT;
  orig_body TEXT;
  new_body TEXT;
BEGIN
  FOR rpc_name IN
    SELECT unnest(ARRAY[
      'accept_offer',
      'buy_from_ipo',
      'buy_from_market',
      'buy_from_order',
      'calculate_fan_rank',
      'create_ipo',
      'create_offer',
      'liquidate_player',
      'place_buy_order',
      'place_sell_order'
    ])
  LOOP
    SELECT pg_get_functiondef(oid) INTO orig_body
    FROM pg_proc
    WHERE proname = rpc_name
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    IF orig_body IS NULL THEN
      RAISE EXCEPTION 'RPC not found: %', rpc_name;
    END IF;

    new_body := regexp_replace(orig_body, '\yDPCs\y', 'SCs', 'g');
    new_body := regexp_replace(new_body, '\yDPC\y', 'SC', 'g');

    IF new_body IS DISTINCT FROM orig_body THEN
      EXECUTE new_body;
      RAISE NOTICE 'Sanitized RPC: %', rpc_name;
    ELSE
      RAISE NOTICE 'No changes needed for: %', rpc_name;
    END IF;
  END LOOP;
END $migrate$;
