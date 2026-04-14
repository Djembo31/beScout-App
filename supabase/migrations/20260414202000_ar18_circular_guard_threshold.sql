-- AR-18 (Operation Beta Ready, Journey #3) — Circular-Trade-Guard Threshold lockern.
-- Problem: `v_circular_count > 0` blockt fair A->B->A case. User verkauft Mo, kauft Do vom selben Partner
-- -> abgelehnt als "Verdaechtiges Handelsmuster". Bei 50-Mann Beta = Support-Tickets.
-- CEO-Decision (Schnellbahn 2026-04-14): Option B = Threshold auf >= 2 (nur echte Ping-Pong in 7d).
--
-- Betroffene RPCs: `buy_from_order` (Line 270-282 in 20260314120000) + `buy_player_sc` (Line 471-483).
-- Strategie: Live-Body lesen via pg_get_functiondef, Guard via regexp_replace patchen, EXECUTE.
-- Analog zum DPC->SC Rename-Pattern in 20260414151000.

DO $migrate$
DECLARE
  rpc_name TEXT;
  orig_body TEXT;
  new_body TEXT;
  v_patched_count INT := 0;
BEGIN
  FOR rpc_name IN
    SELECT unnest(ARRAY['buy_from_order', 'buy_player_sc'])
  LOOP
    SELECT pg_get_functiondef(oid) INTO orig_body
    FROM pg_proc
    WHERE proname = rpc_name
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

    IF orig_body IS NULL THEN
      RAISE EXCEPTION 'RPC not found: %', rpc_name;
    END IF;

    -- Guard: exact string match, threshold "> 0" -> ">= 2"
    -- Die Live-Bodies enthalten:
    --   IF v_circular_count > 0 THEN
    -- -> patchen auf:
    --   IF v_circular_count >= 2 THEN
    -- String ist eindeutig weil nur in diesem Guard verwendet.
    new_body := replace(orig_body, 'IF v_circular_count > 0 THEN', 'IF v_circular_count >= 2 THEN');

    IF new_body IS DISTINCT FROM orig_body THEN
      EXECUTE new_body;
      v_patched_count := v_patched_count + 1;
      RAISE NOTICE 'AR-18 patched RPC: % (threshold > 0 -> >= 2)', rpc_name;
    ELSE
      RAISE WARNING 'AR-18: No change applied for %, Guard-String nicht gefunden (bereits gepatched?)', rpc_name;
    END IF;
  END LOOP;

  IF v_patched_count = 0 THEN
    RAISE EXCEPTION 'AR-18: Keine RPC gepatched — Guard-String-Mismatch oder bereits appliiert';
  END IF;

  RAISE NOTICE 'AR-18 done: % RPCs patched', v_patched_count;
END $migrate$;
