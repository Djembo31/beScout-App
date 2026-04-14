-- =============================================================================
-- AR-51 (J8, 2026-04-15) — expire_pending_orders Buy-Branch + Escrow-Release
--
-- PROBLEM:
--   `expire_pending_orders()` expires NUR side='sell'. Buy-Orders mit
--   expires_at < NOW() bleiben status='open', aber das escrow'd `locked_balance`
--   in wallets bleibt gefangen → Money-Time-Bomb bei Buy-Order-Volumen.
--
-- FIX:
--   1. Separate UPDATE fuer side='buy' mit expires_at < NOW()
--   2. Fuer jede expired buy-order: release locked_balance (zurueck zu balance)
--   3. transactions audit-row pro release
--   4. recalc_floor_price bleibt gecalled
-- =============================================================================

CREATE OR REPLACE FUNCTION public.expire_pending_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  expired_count INT := 0;
  sell_count INT;
  buy_count INT;
  affected_player RECORD;
  expired_buy RECORD;
  v_release_amount BIGINT;
  v_new_balance BIGINT;
BEGIN
  CREATE TEMP TABLE _expired_players ON COMMIT DROP AS
    SELECT DISTINCT o.player_id
    FROM public.orders o
    WHERE o.status IN ('open', 'partial')
      AND o.expires_at IS NOT NULL
      AND o.expires_at < NOW();

  -- SELL: cancel (kein escrow-release, nur order-status)
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE status IN ('open', 'partial')
    AND side = 'sell'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
  GET DIAGNOSTICS sell_count = ROW_COUNT;

  -- AR-51 FIX: BUY branch mit escrow-release
  -- Capture jede expired buy-order BEFORE status-change
  FOR expired_buy IN
    SELECT id, user_id, price, quantity, filled_quantity, player_id
    FROM public.orders
    WHERE status IN ('open', 'partial')
      AND side = 'buy'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    FOR UPDATE
  LOOP
    -- Release = remaining qty * price (filled part ist bereits released durch matching)
    v_release_amount := (expired_buy.quantity - COALESCE(expired_buy.filled_quantity, 0)) * expired_buy.price;

    IF v_release_amount > 0 THEN
      UPDATE public.wallets
      SET locked_balance = GREATEST(0, locked_balance - v_release_amount), updated_at = now()
      WHERE user_id = expired_buy.user_id
      RETURNING balance INTO v_new_balance;

      INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
      VALUES (
        expired_buy.user_id, 'order_cancel', 0, v_new_balance, expired_buy.id,
        'AR-51: Buy-Order expired, ' || (v_release_amount / 100) || ' $SCOUT Escrow released'
      );
    END IF;

    UPDATE public.orders SET status = 'cancelled' WHERE id = expired_buy.id;
  END LOOP;
  GET DIAGNOSTICS buy_count = ROW_COUNT;

  expired_count := sell_count + buy_count;

  FOR affected_player IN SELECT * FROM _expired_players
  LOOP
    PERFORM public.recalc_floor_price(affected_player.player_id);
  END LOOP;

  RETURN expired_count;
END;
$function$;

-- expire_pending_orders wird nur von Cron aufgerufen → kein authenticated grant noetig
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM authenticated;

COMMENT ON FUNCTION public.expire_pending_orders() IS
  'AR-51 (2026-04-15): Buy-branch hinzugefuegt mit escrow-release. Nur service_role/cron callable.';
