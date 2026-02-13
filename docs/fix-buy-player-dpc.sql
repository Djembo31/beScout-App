-- ============================================================
-- Fix: buy_player_dpc — locked_balance Bug
-- Problem: locked_balance wird decrementiert, aber place_sell_order
--          hat es nie incrementiert → constraint "positive_locked" schlägt fehl
-- Fix: locked_balance nicht anfassen, Seller bekommt einfach balance + Erlös
-- ============================================================

CREATE OR REPLACE FUNCTION buy_player_dpc(
  p_user_id UUID,
  p_player_id UUID,
  p_quantity INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_holding RECORD;
  v_trade_id UUID;
  v_remaining INT;
  v_seller_balance BIGINT;
  v_platform_fee BIGINT;
BEGIN
  -- PATH A: Buy from cheapest open sell order (skip own orders)
  SELECT * INTO v_order
  FROM orders
  WHERE player_id = p_player_id
    AND side = 'sell'
    AND status IN ('open', 'partial')
    AND user_id != p_user_id
  ORDER BY price ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error',
      'Keine Angebote von anderen Usern verfügbar.');
  END IF;

  -- Calculate cost
  v_remaining := v_order.quantity - v_order.filled_qty;
  IF p_quantity > v_remaining THEN
    p_quantity := v_remaining;
  END IF;

  v_total_cost := v_order.price * p_quantity;
  v_platform_fee := GREATEST(v_total_cost / 100, 1); -- 1% fee, min 1 cent

  -- Check buyer wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.');
  END IF;

  -- Deduct buyer
  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  -- Credit seller (minus fee) — DO NOT touch locked_balance
  UPDATE wallets SET
    balance = balance + (v_total_cost - v_platform_fee),
    updated_at = now()
  WHERE user_id = v_order.user_id
  RETURNING balance INTO v_seller_balance;

  -- Update order
  UPDATE orders SET
    filled_qty = filled_qty + p_quantity,
    status = CASE WHEN filled_qty + p_quantity >= quantity THEN 'filled' ELSE 'partial' END
  WHERE id = v_order.id;

  -- Reduce seller holding
  UPDATE holdings SET
    quantity = quantity - p_quantity,
    updated_at = now()
  WHERE user_id = v_order.user_id AND player_id = p_player_id;

  -- Buyer holding
  SELECT * INTO v_holding FROM holdings WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF FOUND THEN
    UPDATE holdings SET
      quantity = v_holding.quantity + p_quantity,
      avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost) / (v_holding.quantity + p_quantity),
      updated_at = now()
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
    VALUES (p_user_id, p_player_id, p_quantity, v_order.price);
  END IF;

  -- Trade log
  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee)
  VALUES (p_player_id, p_user_id, v_order.user_id, NULL, v_order.id, v_order.price, p_quantity, v_platform_fee)
  RETURNING id INTO v_trade_id;

  -- Update player prices
  UPDATE players SET
    last_price = v_order.price,
    floor_price = COALESCE(
      (SELECT MIN(price) FROM orders WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')),
      ipo_price
    ),
    volume_24h = volume_24h + v_total_cost,
    updated_at = now()
  WHERE id = p_player_id;

  -- Transaction logs
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, 'buy', -v_total_cost, v_new_balance, v_trade_id,
     format('%s DPC @ %s Cents (User-Order)', p_quantity, v_order.price)),
    (v_order.user_id, 'sell', v_total_cost - v_platform_fee, v_seller_balance, v_trade_id,
     format('%s DPC @ %s Cents verkauft', p_quantity, v_order.price));

  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'total_cost', v_total_cost,
    'new_balance', v_new_balance,
    'quantity', p_quantity,
    'price_per_dpc', v_order.price,
    'source', 'order'
  );
END;
$$;
