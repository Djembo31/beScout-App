-- =============================================================================
-- Slice 178e-a — buy_from_order Idempotency-Integration (Tier A1, Money)
--
-- Baseline source-of-truth: live pg_get_functiondef (2026-04-24).
-- Ursprungs-File: 20260314120000_trading_missions_order_expiry.sql.
-- Spaetere Migrations (patch_rpcs_recalc_floor, pbt_rpc_consistency,
-- rpc_sanitize_dpc_descriptions, circular_guard_threshold, cleanup_zero_qty,
-- holdings_auto_delete_zero) haben buy_from_order NICHT modifiziert — sie
-- referenzieren nur. Live-Body ist authoritativ.
--
-- Pattern-Wiederholung von Slice 178a (buy_player_sc).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.buy_from_order(
  p_buyer_id uuid,
  p_order_id uuid,
  p_quantity integer,
  p_idempotency_key text DEFAULT NULL
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_order RECORD; v_buyer_wallet RECORD; v_seller_wallet RECORD; v_total_cost BIGINT;
  v_remaining INT; v_new_status TEXT; v_buyer_new_balance BIGINT; v_seller_new_balance BIGINT;
  v_trade_id UUID; v_player RECORD; v_fee_cfg RECORD; v_total_fee BIGINT; v_platform_fee BIGINT;
  v_pbt_fee BIGINT; v_club_fee BIGINT; v_seller_receives BIGINT; v_locked BIGINT;
  v_recent_trades INT; v_circular_count INT; v_buyer_sub RECORD; v_discount_bps INT; v_effective_fee_bps INT;
  v_result JSON;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_buyer_id THEN RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RETURN json_build_object('success', false, 'error', 'Ungueltige Menge.'); END IF;

  -- Slice 178e-a: Idempotency-check (cheap-validation-only passed).
  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_buyer_id, p_idempotency_key, 300);

    IF NOT v_dedup_new THEN
      IF v_dedup_cached IS NULL THEN
        RETURN json_build_object(
          'success', false,
          'error', 'idempotency_pending',
          'idempotent_replay', true
        );
      END IF;
      RETURN v_dedup_cached::JSON;
    END IF;
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Order nicht gefunden'); END IF;
  IF v_order.side != 'sell' THEN RETURN json_build_object('success', false, 'error', 'Keine Sell-Order'); END IF;
  IF v_order.status NOT IN ('open', 'partial') THEN RETURN json_build_object('success', false, 'error', 'Order nicht mehr aktiv'); END IF;
  IF v_order.user_id = p_buyer_id THEN RETURN json_build_object('success', false, 'error', 'Eigene Order kaufen nicht moeglich'); END IF;

  v_remaining := v_order.quantity - v_order.filled_qty;
  IF v_remaining < p_quantity THEN RETURN json_build_object('success', false, 'error', 'Nur ' || v_remaining || ' SCs verfuegbar'); END IF;
  v_total_cost := v_order.price * p_quantity;

  SELECT * INTO v_player FROM players WHERE id = v_order.player_id;
  IF v_player.is_liquidated THEN RETURN json_build_object('success', false, 'error', 'Spieler wurde liquidiert.'); END IF;
  IF is_club_admin_for_player(p_buyer_id, v_order.player_id) THEN RETURN json_build_object('success', false, 'error', 'Club-Admin Restriction'); END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_buyer_id::text || v_order.player_id::text));

  SELECT COUNT(*) INTO v_recent_trades FROM trades WHERE (buyer_id = p_buyer_id OR seller_id = p_buyer_id) AND player_id = v_order.player_id AND executed_at > now() - INTERVAL '24 hours';
  IF v_recent_trades >= 20 THEN RETURN json_build_object('success', false, 'error', 'Max 20 Trades/24h'); END IF;

  SELECT COUNT(*) INTO v_circular_count FROM trades WHERE seller_id = p_buyer_id AND buyer_id = v_order.user_id AND player_id = v_order.player_id AND executed_at > now() - INTERVAL '7 days';
  IF v_circular_count >= 2 THEN RETURN json_build_object('success', false, 'error', 'Verdaechtiges Handelsmuster.'); END IF;

  SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id = v_player.club_id ORDER BY club_id NULLS LAST LIMIT 1;
  IF NOT FOUND THEN SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL; END IF;

  v_discount_bps := 0;
  SELECT tier INTO v_buyer_sub FROM club_subscriptions WHERE user_id = p_buyer_id AND club_id = v_player.club_id AND status = 'active' AND expires_at > now() LIMIT 1;
  IF FOUND THEN
    IF v_buyer_sub.tier = 'gold' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_gold_bps, 150);
    ELSIF v_buyer_sub.tier = 'silber' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_silber_bps, 100);
    ELSIF v_buyer_sub.tier = 'bronze' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_bronze_bps, 50); END IF;
  END IF;
  v_effective_fee_bps := GREATEST(0, COALESCE(v_fee_cfg.trade_fee_bps, 600) - v_discount_bps);

  v_total_fee := (v_total_cost * v_effective_fee_bps) / 10000;
  IF v_total_fee < 1 AND v_total_cost > 0 AND v_effective_fee_bps > 0 THEN v_total_fee := 1; END IF;
  IF v_effective_fee_bps > 0 THEN
    v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_pbt_bps, 150)) / 10000;
    v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_club_bps, 100)) / 10000;
    v_platform_fee := GREATEST(0, v_total_fee - v_pbt_fee - v_club_fee);
  ELSE v_platform_fee := 0; v_pbt_fee := 0; v_club_fee := 0; v_total_fee := 0; END IF;
  v_seller_receives := v_total_cost - v_total_fee;

  SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = p_buyer_id FOR UPDATE;
  v_locked := COALESCE(v_buyer_wallet.locked_balance, 0);
  IF (v_buyer_wallet.balance - v_locked) < v_total_cost THEN RETURN json_build_object('success', false, 'error', 'Nicht genug BSD'); END IF;
  SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_order.user_id FOR UPDATE;

  v_buyer_new_balance := v_buyer_wallet.balance - v_total_cost;
  v_seller_new_balance := v_seller_wallet.balance + v_seller_receives;

  UPDATE wallets SET balance = v_buyer_new_balance, updated_at = now() WHERE user_id = p_buyer_id;
  UPDATE wallets SET balance = v_seller_new_balance, updated_at = now() WHERE user_id = v_order.user_id;

  INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price) VALUES (p_buyer_id, v_order.player_id, p_quantity, v_order.price)
  ON CONFLICT (user_id, player_id) DO UPDATE SET avg_buy_price = (holdings.avg_buy_price * holdings.quantity + v_order.price * p_quantity) / (holdings.quantity + p_quantity), quantity = holdings.quantity + p_quantity;

  PERFORM 1 FROM holdings WHERE user_id = v_order.user_id AND player_id = v_order.player_id FOR UPDATE;
  UPDATE holdings SET quantity = quantity - p_quantity WHERE user_id = v_order.user_id AND player_id = v_order.player_id;

  IF v_remaining = p_quantity THEN v_new_status := 'filled'; ELSE v_new_status := 'partial'; END IF;
  UPDATE orders SET filled_qty = filled_qty + p_quantity, status = v_new_status WHERE id = p_order_id;

  UPDATE players SET
    last_price = v_order.price,
    volume_24h = volume_24h + v_total_cost,
    price_change_24h = CASE WHEN v_player.last_price > 0 AND v_player.last_price != v_order.price
      THEN ((v_order.price::NUMERIC - v_player.last_price::NUMERIC) / v_player.last_price::NUMERIC * 100) ELSE 0 END,
    updated_at = now()
  WHERE id = v_order.player_id;
  PERFORM recalc_floor_price(v_order.player_id);

  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (v_order.player_id, p_buyer_id, v_order.user_id, NULL, p_order_id, v_order.price, p_quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
    (p_buyer_id, 'trade_buy', -v_total_cost, v_buyer_new_balance, v_trade_id, 'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
    (v_order.user_id, 'trade_sell', v_seller_receives, v_seller_new_balance, v_trade_id, 'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  PERFORM credit_pbt(v_order.player_id, v_pbt_fee, 'trading', v_trade_id, 'Trade Fee');
  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN UPDATE clubs SET treasury_balance_cents = treasury_balance_cents + v_club_fee WHERE id = v_player.club_id; END IF;

  v_result := json_build_object('success', true, 'trade_id', v_trade_id, 'total_cost', v_total_cost, 'buyer_new_balance', v_buyer_new_balance, 'seller_new_balance', v_seller_new_balance, 'quantity', p_quantity, 'price', v_order.price, 'fee_discount_bps', v_discount_bps, 'effective_fee_bps', v_effective_fee_bps, 'fees', json_build_object('total', v_total_fee, 'platform', v_platform_fee, 'pbt', v_pbt_fee, 'club', v_club_fee));

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result::JSONB, status = 'completed'
    WHERE user_id = p_buyer_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.buy_from_order(uuid, uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buy_from_order(uuid, uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_from_order(uuid, uuid, integer, text) TO authenticated;

DROP FUNCTION IF EXISTS public.buy_from_order(uuid, uuid, integer);

COMMENT ON FUNCTION public.buy_from_order(uuid, uuid, integer, text) IS
  'Slice 178e-a (2026-04-24): P2P buy-from-sell-order RPC with optional idempotency_key.';
