-- =============================================================================
-- XC-15 (2026-04-15) — expire_pending_orders Column-Mismatch Fix
--
-- BUG (live-reproduziert):
--   Cron-step `expire_pending_orders` liefert PG 42703:
--     "column \"filled_quantity\" does not exist"
--   AR-51 J8 Migration (20260415010400) hat `filled_quantity` statt `filled_qty`
--   im Buy-Branch referenziert. Live-Schema `public.orders` hat Spalte `filled_qty`.
--
-- PATTERN (common-errors.md — AR-42 "RPC INSERT Column-Mismatch"):
--   CREATE OR REPLACE FUNCTION parst Body aber validiert KEINE Column-Existenz.
--   Fehler wird erst beim RPC-Call geworfen. Silent seit AR-51 deploy.
--
-- IMPACT:
--   Seit AR-51-Deploy (2026-04-15) laufen Buy-Order-Expiries nicht durch.
--   Sell-Branch wird vor dem Buy-Loop abgeschlossen → UPDATE sell orders laeuft
--   noch, danach crasht FOR-Loop am SELECT `filled_quantity`. Ganze Transaction
--   rollback → ALLE expired orders (sell + buy) bleiben status='open'.
--
-- FIX:
--   Minimal-Scope: 2x `filled_quantity` → `filled_qty` im Body.
--   Rest der AR-51 Logik (escrow-release, transactions audit) bleibt unveraendert.
--
-- VERIFICATION:
--   Live-Schema via OpenAPI + Sample-Select 2026-04-15:
--   public.orders: id, user_id, player_id, side, price, quantity, filled_qty,
--                  status, created_at, expires_at
--   → `filled_qty` ist die einzige existierende "filled" Column.
--   116 occurrences von `filled_qty` in 43 Files (Migrations, Types, Services,
--   Tests) — established convention seit 20260314190000_buy_orders.sql.
--
-- ROLLBACK:
--   Re-apply von 20260415010400_ar51_j8_expire_pending_orders_buy_branch.sql
--   restored den Buggy-Body mit `filled_quantity` (nicht empfohlen).
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
    SELECT id, user_id, price, quantity, filled_qty, player_id
    FROM public.orders
    WHERE status IN ('open', 'partial')
      AND side = 'buy'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
    FOR UPDATE
  LOOP
    -- Release = remaining qty * price (filled part ist bereits released durch matching)
    v_release_amount := (expired_buy.quantity - COALESCE(expired_buy.filled_qty, 0)) * expired_buy.price;

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

-- AR-44 REVOKE-Block: nur service_role (Cron) darf callen.
-- service_role hat per Default EXECUTE auf public functions — kein extra GRANT.
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM anon;
REVOKE EXECUTE ON FUNCTION public.expire_pending_orders() FROM authenticated;

COMMENT ON FUNCTION public.expire_pending_orders() IS
  'XC-15 (2026-04-15): filled_quantity→filled_qty Column-Mismatch Fix. AR-51 Buy-Branch + Escrow-Release. Nur service_role/cron callable.';
