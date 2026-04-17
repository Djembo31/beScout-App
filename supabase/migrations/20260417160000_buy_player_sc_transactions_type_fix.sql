-- Slice 034 — buy_player_sc transactions.type Fix (P0 Hot-Fix)
--
-- Bug: buy_player_sc schrieb 'buy'/'sell' in transactions.type. CHECK constraint
-- 'transactions_type_check' erlaubt nur 'trade_buy'/'trade_sell' (analog buy_from_order).
-- Folge: jeder Buy-Versuch crashte mit HTTP 400, kein Money-Move passierte.
--
-- Fix: 'buy' → 'trade_buy', 'sell' → 'trade_sell'. Description analog buy_from_order.
-- Restlicher RPC-Body bleibt identisch (advisory_lock, fee_split, circular-trade-check,
-- subscription-discount, recalc_floor_price, etc.).
--
-- Discovered: Slice 032 Flow 5 Live-Verify auf bescout.net.

CREATE OR REPLACE FUNCTION public.buy_player_sc(p_user_id uuid, p_player_id uuid, p_quantity integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_order RECORD; v_wallet RECORD; v_player RECORD; v_fee_cfg RECORD;
  v_total_cost BIGINT; v_new_balance BIGINT; v_holding RECORD; v_trade_id UUID;
  v_remaining INT; v_seller_balance BIGINT; v_total_fee BIGINT; v_platform_fee BIGINT;
  v_pbt_fee BIGINT; v_club_fee BIGINT; v_seller_proceeds BIGINT;
  v_buyer_sub RECORD; v_effective_fee_bps INT; v_discount_bps INT; v_locked BIGINT;
  v_recent_trades INT; v_circular_count INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'invalidQuantity');
  END IF;
  IF p_quantity > 300 THEN
    RETURN json_build_object('success', false, 'error', 'maxQuantityExceeded');
  END IF;

  SELECT id, club_id, first_name, last_name, ipo_price, is_liquidated INTO v_player FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden'); END IF;
  IF v_player.is_liquidated THEN RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert.'); END IF;
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN RETURN json_build_object('success', false, 'error', 'Club-Admin Restriction'); END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_player_id::text));

  SELECT COUNT(*) INTO v_recent_trades FROM trades WHERE (buyer_id = p_user_id OR seller_id = p_user_id) AND player_id = p_player_id AND executed_at > now() - INTERVAL '24 hours';
  IF v_recent_trades >= COALESCE((SELECT CASE tier WHEN 'gold' THEN 200 WHEN 'silber' THEN 50 WHEN 'bronze' THEN 30 ELSE 20 END FROM club_subscriptions WHERE user_id = p_user_id AND status = 'active' AND expires_at > now() ORDER BY CASE tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1), 20) THEN RETURN json_build_object('success', false, 'error', 'Max 20 Trades/24h'); END IF;

  SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id = v_player.club_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL ORDER BY created_at DESC LIMIT 1; END IF;

  v_discount_bps := 0;
  SELECT tier INTO v_buyer_sub FROM club_subscriptions WHERE user_id = p_user_id AND club_id = v_player.club_id AND status = 'active' AND expires_at > now() LIMIT 1;
  IF FOUND THEN
    IF v_buyer_sub.tier = 'gold' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_gold_bps, 150);
    ELSIF v_buyer_sub.tier = 'silber' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_silber_bps, 100);
    ELSIF v_buyer_sub.tier = 'bronze' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_bronze_bps, 50); END IF;
  END IF;
  v_effective_fee_bps := GREATEST(0, COALESCE(v_fee_cfg.trade_fee_bps, 600) - v_discount_bps);

  SELECT * INTO v_order FROM orders WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial') AND user_id != p_user_id ORDER BY price ASC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Keine Angebote von anderen Usern verfuegbar.'); END IF;

  SELECT COUNT(*) INTO v_circular_count FROM trades WHERE seller_id = p_user_id AND buyer_id = v_order.user_id AND player_id = p_player_id AND executed_at > now() - INTERVAL '7 days';
  IF v_circular_count >= 2 THEN RETURN json_build_object('success', false, 'error', 'Verdaechtiges Handelsmuster.'); END IF;

  v_remaining := v_order.quantity - v_order.filled_qty;
  IF p_quantity > v_remaining THEN p_quantity := v_remaining; END IF;
  v_total_cost := v_order.price * p_quantity;

  v_total_fee := (v_total_cost * v_effective_fee_bps) / 10000;
  IF v_total_fee < 1 AND v_total_cost > 0 THEN v_total_fee := 1; END IF;
  IF v_effective_fee_bps > 0 THEN
    v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_pbt_bps, 150)) / 10000;
    v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_club_bps, 100)) / 10000;
    v_platform_fee := GREATEST(0, v_total_fee - v_pbt_fee - v_club_fee);
  ELSE v_platform_fee := 0; v_pbt_fee := 0; v_club_fee := 0; v_total_fee := 0; END IF;
  v_seller_proceeds := v_total_cost - v_total_fee;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  v_locked := COALESCE(v_wallet.locked_balance, 0);
  IF NOT FOUND OR (v_wallet.balance - v_locked) < v_total_cost THEN RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.'); END IF;

  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;
  UPDATE wallets SET balance = balance + v_seller_proceeds, updated_at = now() WHERE user_id = v_order.user_id RETURNING balance INTO v_seller_balance;
  UPDATE holdings SET quantity = quantity - p_quantity, updated_at = now() WHERE user_id = v_order.user_id AND player_id = p_player_id;
  UPDATE orders SET filled_qty = filled_qty + p_quantity, status = CASE WHEN filled_qty + p_quantity >= quantity THEN 'filled' ELSE 'partial' END WHERE id = v_order.id;

  SELECT * INTO v_holding FROM holdings WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF FOUND THEN
    UPDATE holdings SET quantity = v_holding.quantity + p_quantity, avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost) / (v_holding.quantity + p_quantity), updated_at = now() WHERE id = v_holding.id;
  ELSE INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price) VALUES (p_user_id, p_player_id, p_quantity, v_order.price); END IF;

  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (p_player_id, p_user_id, v_order.user_id, NULL, v_order.id, v_order.price, p_quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  -- PBT Treasury credit (unified — uses credit_pbt() instead of inline INSERT)
  PERFORM credit_pbt(p_player_id, v_pbt_fee, 'trading', v_trade_id,
    format('Trade Fee: %sx %s %s', p_quantity, v_player.first_name, v_player.last_name));

  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN UPDATE clubs SET treasury_balance_cents = treasury_balance_cents + v_club_fee WHERE id = v_player.club_id; END IF;

  UPDATE players SET last_price = v_order.price, volume_24h = volume_24h + v_total_cost, updated_at = now() WHERE id = p_player_id;
  PERFORM recalc_floor_price(p_player_id);

  -- Slice 034: 'buy'/'sell' → 'trade_buy'/'trade_sell' (CHECK constraint compliance, analog buy_from_order)
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
    (p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
     'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
    (v_order.user_id, 'trade_sell', v_seller_proceeds, v_seller_balance, v_trade_id,
     'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  RETURN json_build_object('success', true, 'trade_id', v_trade_id, 'total_cost', v_total_cost, 'new_balance', v_new_balance, 'quantity', p_quantity, 'price_per_dpc', v_order.price, 'source', 'order', 'order_id', v_order.id, 'seller_id', v_order.user_id, 'platform_fee', v_platform_fee, 'pbt_fee', v_pbt_fee, 'club_fee', v_club_fee, 'fee_discount_bps', v_discount_bps, 'effective_fee_bps', v_effective_fee_bps);
END;
$function$;

-- AR-44: REVOKE/GRANT pairing for SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.buy_player_sc(uuid, uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buy_player_sc(uuid, uuid, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_player_sc(uuid, uuid, integer) TO authenticated;

COMMENT ON FUNCTION public.buy_player_sc(uuid, uuid, integer)
IS 'Trading buy-from-sell-order RPC. Slice 034 fixed transactions.type drift (''buy''/''sell'' → ''trade_buy''/''trade_sell'') discovered via Slice 032 Flow 5 live-verify on bescout.net.';
