-- ============================================
-- Add 20/24h velocity guard to place_buy_order
-- Matches pattern from buy_player_dpc + place_sell_order
-- Existing: auth check, input validation, liquidation, club admin, 10/hour rate limit
-- Added: 20/24h velocity guard on trades per player
-- ============================================

CREATE OR REPLACE FUNCTION public.place_buy_order(
  p_user_id UUID, p_player_id UUID, p_quantity INT, p_max_price BIGINT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_wallet RECORD;
  v_total_cost BIGINT;
  v_order_id UUID;
  v_is_liquidated BOOLEAN;
  v_recent_orders INT;
  v_recent_trades INT;
BEGIN
  -- Auth check
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  -- Input validation
  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 300 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungueltige Menge (1-300)');
  END IF;
  IF p_max_price IS NULL OR p_max_price < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungueltiger Preis');
  END IF;

  -- Liquidation check
  SELECT is_liquidated INTO v_is_liquidated FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;
  IF v_is_liquidated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler ist liquidiert');
  END IF;

  -- Club admin restriction
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Admins duerfen keine DPCs ihres eigenen Clubs handeln');
  END IF;

  -- Rate limit: max 10 buy orders per player per hour
  SELECT COUNT(*) INTO v_recent_orders
  FROM orders
  WHERE user_id = p_user_id AND player_id = p_player_id AND side = 'buy'
    AND created_at > NOW() - INTERVAL '1 hour';
  IF v_recent_orders >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max 10 Kaufgebote pro Spieler pro Stunde');
  END IF;

  -- Velocity guard: max 20 trades per player per 24h (matches buy_player_dpc)
  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND player_id = p_player_id
    AND executed_at > NOW() - INTERVAL '24 hours';
  IF v_recent_trades >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Taegliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;

  -- Calculate total cost to lock
  v_total_cost := p_quantity * p_max_price;

  -- Advisory lock to prevent concurrent wallet race
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || 'buy_order'));

  -- Check & lock balance
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet nicht gefunden');
  END IF;

  IF (v_wallet.balance - COALESCE(v_wallet.locked_balance, 0)) < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug verfuegbares Guthaben');
  END IF;

  -- Lock funds (move to escrow)
  UPDATE wallets
  SET locked_balance = COALESCE(locked_balance, 0) + v_total_cost
  WHERE user_id = p_user_id;

  -- Create buy order
  INSERT INTO orders (user_id, player_id, side, price, quantity, filled_qty, status, expires_at)
  VALUES (p_user_id, p_player_id, 'buy', p_max_price, p_quantity, 0, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_locked', v_total_cost,
    'new_available', v_wallet.balance - COALESCE(v_wallet.locked_balance, 0) - v_total_cost
  );
END;
$function$;
