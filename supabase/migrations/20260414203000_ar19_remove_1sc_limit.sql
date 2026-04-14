-- AR-19 (Operation Beta Ready, Journey #3) — 1-SC-Limit in buy_player_sc entfernen.
-- Problem: Legacy Guard `IF p_quantity != 1 THEN reject` zwingt User zu Einzel-Trades.
-- Bei 10 SCs = 10 Fees, 10 Trigger-Chain = schlechte UX fuer Comunio-Veteranen (CEO J2-Q1).
-- CEO-Decision (Schnellbahn 2026-04-14): Guard entfernen, aligned an Service-Limit (300 max).
--
-- Alter Guard (Live, nach DPC-Sanitize):
--   IF p_quantity != 1 THEN
--     RETURN json_build_object('success', false, 'error', 'Im Pilot nur 1 SC pro Kauf');
--   END IF;
--
-- Neuer Guard (matching Service-Limit + i18n-Keys aus errorMessages.ts):
--   - quantity < 1 (oder NULL/non-integer) -> 'invalidQuantity'
--   - quantity > 300                       -> 'maxQuantityExceeded'
-- Service (trading.ts:85-86) wirft diese bereits Client-seitig. DB-Guard = defense-in-depth.
--
-- Fee-Loop Safety: `v_total_cost := v_order.price * p_quantity` funktioniert fuer quantity > 1 (Live-Body Line 55 in 20260331_pbt_rpc_consistency).
-- Velocity-Guard (`IF v_recent_trades >= 20`) unveraendert (per-player in 24h).
-- Circular-Guard bereits via AR-18 auf >= 2 gelockert.

DO $migrate$
DECLARE
  orig_body TEXT;
  new_body TEXT;
  v_old_guard_re TEXT;
  v_new_guard TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO orig_body
  FROM pg_proc
  WHERE proname = 'buy_player_sc'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF orig_body IS NULL THEN
    RAISE EXCEPTION 'buy_player_sc not found';
  END IF;

  -- Regex match: "IF p_quantity != 1 THEN" + RETURN json_build_object + 'Im Pilot nur 1 (DPC|SC) pro Kauf' + END IF;
  -- Whitespace tolerant via \s+
  -- Sowohl Pre-Sanitize ('DPC') als auch Post-Sanitize ('SC') matches.
  v_old_guard_re := 'IF\s+p_quantity\s*!=\s*1\s+THEN\s+RETURN\s+json_build_object\s*\(\s*''success''\s*,\s*false\s*,\s*''error''\s*,\s*''Im Pilot nur 1 (DPC|SC) pro Kauf''\s*\)\s*;\s+END IF\s*;';
  -- Zwei separate Guards: invalid (< 1) + max-exceeded (> 300), matching Service error-keys.
  v_new_guard := E'IF p_quantity IS NULL OR p_quantity < 1 THEN\n    RETURN json_build_object(''success'', false, ''error'', ''invalidQuantity'');\n  END IF;\n  IF p_quantity > 300 THEN\n    RETURN json_build_object(''success'', false, ''error'', ''maxQuantityExceeded'');\n  END IF;';

  new_body := regexp_replace(orig_body, v_old_guard_re, v_new_guard);

  IF new_body IS DISTINCT FROM orig_body THEN
    EXECUTE new_body;
    RAISE NOTICE 'AR-19: buy_player_sc Quantity-Guard aktualisiert (1-only -> 1..300)';
  ELSE
    RAISE EXCEPTION 'AR-19: Guard-Pattern nicht gefunden in buy_player_sc. '
                    'Moeglich: bereits appliiert ODER Live-Body abweichend vom erwarteten Format. '
                    'Manuell pruefen via: SELECT pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = ''buy_player_sc''));';
  END IF;
END $migrate$;
