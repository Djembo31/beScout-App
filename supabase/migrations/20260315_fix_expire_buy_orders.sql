-- Fix: expire_pending_orders must unlock locked_balance for expired buy orders.
-- Previously, expired buy orders were cancelled but user funds stayed locked permanently.

CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INT;
  affected_player RECORD;
  v_buy_order RECORD;
BEGIN
  -- Collect expired buy orders BEFORE cancelling (to unlock funds)
  CREATE TEMP TABLE _expired_buy_orders ON COMMIT DROP AS
    SELECT o.id, o.user_id, o.player_id, o.price, (o.quantity - o.filled_qty) as remaining_qty
    FROM public.orders o
    WHERE o.status IN ('open', 'partial')
      AND o.side = 'buy'
      AND o.expires_at IS NOT NULL
      AND o.expires_at < NOW();

  -- Collect affected sell order players (for floor_price recalc)
  CREATE TEMP TABLE _expired_players ON COMMIT DROP AS
    SELECT DISTINCT o.player_id, p.ipo_price
    FROM public.orders o
    JOIN public.players p ON p.id = o.player_id
    WHERE o.status IN ('open', 'partial')
      AND o.side = 'sell'
      AND o.expires_at IS NOT NULL
      AND o.expires_at < NOW();

  -- Cancel ALL expired orders (both buy and sell)
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE status IN ('open', 'partial')
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Unlock funds for expired buy orders
  FOR v_buy_order IN SELECT user_id, SUM(price * remaining_qty) as unlock_amount
    FROM _expired_buy_orders GROUP BY user_id
  LOOP
    UPDATE public.wallets
    SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_buy_order.unlock_amount)
    WHERE user_id = v_buy_order.user_id;
  END LOOP;

  -- Recalculate floor_price for affected players (sell orders only)
  FOR affected_player IN SELECT * FROM _expired_players
  LOOP
    UPDATE public.players
    SET floor_price = COALESCE(
      (SELECT MIN(price) FROM public.orders
       WHERE player_id = affected_player.player_id AND side = 'sell' AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      affected_player.ipo_price
    )
    WHERE id = affected_player.player_id;
  END LOOP;

  RETURN expired_count;
END;
$$;
