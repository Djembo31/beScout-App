-- FIX M4: Add advisory lock to cancel_buy_order to prevent concurrent cancel + fill race condition
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

  -- Advisory lock to prevent concurrent cancel + fill race condition
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_order_id::text));

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
