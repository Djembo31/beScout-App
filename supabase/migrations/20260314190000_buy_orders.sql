-- ============================================
-- Buy Orders (Kaufgesuche) — place_buy_order + cancel_buy_order
-- ============================================

-- RPC: Place a buy order (Kaufgesuch)
-- User wants to buy X DPCs of player Y at max price Z
-- Locks the total cost in wallet.locked_balance (escrow)
CREATE OR REPLACE FUNCTION place_buy_order(
  p_user_id UUID,
  p_player_id UUID,
  p_quantity INT,
  p_max_price BIGINT
) RETURNS JSONB AS $$
DECLARE
  v_total_cost BIGINT;
  v_available BIGINT;
  v_order_id UUID;
  v_wallet RECORD;
BEGIN
  -- Input validation
  IF p_quantity < 1 OR p_quantity > 10000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid quantity');
  END IF;
  IF p_max_price < 1 OR p_max_price > 100000000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid price');
  END IF;

  -- Auth check
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Check player exists and not liquidated
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player not found');
  END IF;
  IF EXISTS (SELECT 1 FROM players WHERE id = p_player_id AND is_liquidated = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Player liquidated');
  END IF;

  -- Check not club admin for this player
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club admins cannot trade own players');
  END IF;

  v_total_cost := p_max_price * p_quantity;

  -- Advisory lock to prevent race conditions on same user+player
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_player_id::text));

  -- Check balance (available = balance - locked)
  SELECT balance, locked_balance INTO v_wallet
  FROM wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_wallet IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet not found');
  END IF;

  v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
  IF v_available < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Lock the amount in escrow
  UPDATE wallets SET locked_balance = COALESCE(locked_balance, 0) + v_total_cost
  WHERE user_id = p_user_id;

  -- Create buy order
  INSERT INTO orders (user_id, player_id, side, price, quantity, filled_qty, status, expires_at)
  VALUES (p_user_id, p_player_id, 'buy', p_max_price, p_quantity, 0, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_locked', v_total_cost,
    'new_available', v_available - v_total_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke direct access, only through authenticated wrapper
REVOKE EXECUTE ON FUNCTION place_buy_order FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION place_buy_order TO authenticated;


-- RPC: Cancel a buy order (unlock escrowed funds)
CREATE OR REPLACE FUNCTION cancel_buy_order(
  p_user_id UUID,
  p_order_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_order RECORD;
  v_unlock_amount BIGINT;
BEGIN
  -- Auth check
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Get and lock order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;

  IF v_order IS NULL OR v_order.user_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not found');
  END IF;

  IF v_order.side != 'buy' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a buy order');
  END IF;

  IF v_order.status NOT IN ('open', 'partial') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Order not active');
  END IF;

  -- Calculate unfilled amount to unlock
  v_unlock_amount := (v_order.quantity - v_order.filled_qty) * v_order.price;

  -- Cancel order
  UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;

  -- Unlock funds
  UPDATE wallets SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_unlock_amount)
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'unlocked', v_unlock_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION cancel_buy_order FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION cancel_buy_order TO authenticated;
