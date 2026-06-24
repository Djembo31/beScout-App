-- Slice 358 — E3-2 Fees REIN (Trading): Plattform-Fee in den BeScout-Topf
-- Policy: voller Auffang 100% (CEO-approved 2026-06-24, D96/D97).
-- Drei Trading-RPCs bekommen je EINEN inline-Block book_platform_treasury(...) direkt nach
-- dem Club-Fee-Block. Bodies = exakter Live-pg_get_functiondef (2026-06-24, D87), sonst unverändert.
--   buy_player_sc  → source 'trading' (Orderbuch Auto-Match)
--   buy_from_order → source 'trading' (konkrete Sell-Order)
--   accept_offer   → source 'p2p'     (P2P-Angebote)

-- ════════════════════════════════════════════════════════════════════
-- 1) buy_player_sc (Orderbuch, 3,5 %)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.buy_player_sc(p_user_id uuid, p_player_id uuid, p_quantity integer, p_idempotency_key text DEFAULT NULL::text)
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
  v_result JSON;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'invalidQuantity');
  END IF;
  IF p_quantity > 300 THEN
    RETURN json_build_object('success', false, 'error', 'maxQuantityExceeded');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);

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

  PERFORM credit_pbt(p_player_id, v_pbt_fee, 'trading', v_trade_id,
    format('Trade Fee: %sx %s %s', p_quantity, v_player.first_name, v_player.last_name));

  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN UPDATE clubs SET treasury_balance_cents = treasury_balance_cents + v_club_fee WHERE id = v_player.club_id; END IF;

  -- E3-2 (Slice 358): Plattform-Fee in den BeScout-Topf — voller Auffang (D96/D97)
  IF v_platform_fee > 0 THEN
    PERFORM book_platform_treasury('credit', 'trading', v_platform_fee, v_trade_id, 'Trading-Fee (Orderbuch)');
  END IF;

  UPDATE players SET last_price = v_order.price, volume_24h = volume_24h + v_total_cost, updated_at = now() WHERE id = p_player_id;
  PERFORM recalc_floor_price(p_player_id);

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
    (p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
     'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
    (v_order.user_id, 'trade_sell', v_seller_proceeds, v_seller_balance, v_trade_id,
     'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  v_result := json_build_object('success', true, 'trade_id', v_trade_id, 'total_cost', v_total_cost, 'new_balance', v_new_balance, 'quantity', p_quantity, 'price_per_dpc', v_order.price, 'source', 'order', 'order_id', v_order.id, 'seller_id', v_order.user_id, 'platform_fee', v_platform_fee, 'pbt_fee', v_pbt_fee, 'club_fee', v_club_fee, 'fee_discount_bps', v_discount_bps, 'effective_fee_bps', v_effective_fee_bps);

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result::JSONB, status = 'completed'
    WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

-- ════════════════════════════════════════════════════════════════════
-- 2) buy_from_order (Orderbuch konkrete Order, 3,5 %)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.buy_from_order(p_buyer_id uuid, p_order_id uuid, p_quantity integer, p_idempotency_key text DEFAULT NULL::text)
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

  -- E3-2 (Slice 358): Plattform-Fee in den BeScout-Topf — voller Auffang (D96/D97)
  IF v_platform_fee > 0 THEN
    PERFORM book_platform_treasury('credit', 'trading', v_platform_fee, v_trade_id, 'Trading-Fee (Orderbuch)');
  END IF;

  v_result := json_build_object('success', true, 'trade_id', v_trade_id, 'total_cost', v_total_cost, 'buyer_new_balance', v_buyer_new_balance, 'seller_new_balance', v_seller_new_balance, 'quantity', p_quantity, 'price', v_order.price, 'fee_discount_bps', v_discount_bps, 'effective_fee_bps', v_effective_fee_bps, 'fees', json_build_object('total', v_total_fee, 'platform', v_platform_fee, 'pbt', v_pbt_fee, 'club', v_club_fee));

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result::JSONB, status = 'completed'
    WHERE user_id = p_buyer_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

-- ════════════════════════════════════════════════════════════════════
-- 3) accept_offer (P2P-Angebote, 2 %)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.accept_offer(p_user_id uuid, p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offer offers%ROWTYPE;
  v_sender_wallet wallets%ROWTYPE;
  v_receiver_wallet wallets%ROWTYPE;
  v_player players%ROWTYPE;
  v_fee_cfg RECORD;
  v_total_cost BIGINT;
  v_platform_fee BIGINT;
  v_pbt_fee BIGINT;
  v_club_fee BIGINT;
  v_total_fee BIGINT;
  v_seller_net BIGINT;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_buyer_new_balance BIGINT;
  v_seller_new_balance BIGINT;
  v_trade_id UUID;
  v_pbt_balance BIGINT;
  v_recent_trades INT;
  v_circular_count INT;
  v_seller_qty INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Angebot nicht gefunden');
  END IF;

  IF v_offer.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Angebot nicht mehr verfuegbar');
  END IF;

  IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at < now() THEN
    UPDATE offers SET status = 'expired', updated_at = now() WHERE id = p_offer_id;
    IF v_offer.side = 'buy' THEN
      UPDATE wallets SET locked_balance = GREATEST(0, locked_balance - (v_offer.price * v_offer.quantity)), updated_at = now()
      WHERE user_id = v_offer.sender_id;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Angebot abgelaufen');
  END IF;

  IF v_offer.sender_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Eigenes Angebot kann nicht angenommen werden');
  END IF;

  IF v_offer.side = 'buy' THEN
    v_buyer_id := v_offer.sender_id;
    v_seller_id := p_user_id;
  ELSE
    v_buyer_id := p_user_id;
    v_seller_id := v_offer.sender_id;
  END IF;

  SELECT * INTO v_player FROM players WHERE id = v_offer.player_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;

  IF v_player.is_liquidated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading moeglich.');
  END IF;

  IF is_club_admin_for_player(v_buyer_id, v_offer.player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Admins duerfen keine SCs ihres eigenen Clubs handeln.');
  END IF;
  IF is_club_admin_for_player(v_seller_id, v_offer.player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Admins duerfen keine SCs ihres eigenen Clubs handeln.');
  END IF;

  -- ── SELLER-OWNERSHIP GUARD (CRITICAL FIX) ──
  -- Fetch the seller's current holdings quantity with a row-lock so we
  -- can compare atomically. COALESCE is applied OUTSIDE the scalar
  -- subquery — a missing row resolves to NULL here, then becomes 0.
  SELECT quantity INTO v_seller_qty
  FROM holdings
  WHERE user_id = v_seller_id AND player_id = v_offer.player_id
  FOR UPDATE;

  IF COALESCE(v_seller_qty, 0) < v_offer.quantity THEN
    -- Release any buy-side escrow and cancel the offer so it stops being
    -- offered to non-holders; a fresh offer can be placed after.
    IF v_offer.side = 'buy' THEN
      UPDATE wallets SET locked_balance = GREATEST(0, locked_balance - (v_offer.price * v_offer.quantity)), updated_at = now()
      WHERE user_id = v_offer.sender_id;
    END IF;
    UPDATE offers SET status = 'cancelled', updated_at = now() WHERE id = p_offer_id;
    RETURN jsonb_build_object('success', false, 'error', 'Verkaeufer hat nicht genug SCs');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_buyer_id::text || v_offer.player_id::text));

  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = v_buyer_id OR seller_id = v_buyer_id)
    AND player_id = v_offer.player_id
    AND executed_at > now() - INTERVAL '24 hours';

  IF v_recent_trades >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Taegliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;

  SELECT COUNT(*) INTO v_circular_count
  FROM trades
  WHERE seller_id = v_buyer_id
    AND buyer_id = v_seller_id
    AND player_id = v_offer.player_id
    AND executed_at > now() - INTERVAL '7 days';

  IF v_circular_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Verdaechtiges Handelsmuster erkannt. Handel mit demselben Partner innerhalb von 7 Tagen nicht erlaubt.');
  END IF;

  SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id = v_player.club_id
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_total_cost := v_offer.price * v_offer.quantity;
  v_platform_fee := (v_total_cost * COALESCE(v_fee_cfg.offer_platform_bps, 200)) / 10000;
  v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.offer_pbt_bps, 50)) / 10000;
  v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.offer_club_bps, 50)) / 10000;
  v_total_fee := v_platform_fee + v_pbt_fee + v_club_fee;
  v_seller_net := v_total_cost - v_total_fee;

  SELECT * INTO v_sender_wallet FROM wallets WHERE user_id = v_buyer_id FOR UPDATE;
  SELECT * INTO v_receiver_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;

  IF v_offer.side = 'buy' THEN
    UPDATE wallets SET
      balance = balance - v_total_cost,
      locked_balance = GREATEST(0, locked_balance - v_total_cost),
      updated_at = now()
    WHERE user_id = v_buyer_id
    RETURNING balance INTO v_buyer_new_balance;
  ELSE
    IF (v_sender_wallet.balance - COALESCE(v_sender_wallet.locked_balance, 0)) < v_total_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;
    UPDATE wallets SET balance = balance - v_total_cost, updated_at = now()
    WHERE user_id = v_buyer_id
    RETURNING balance INTO v_buyer_new_balance;
  END IF;

  UPDATE wallets SET balance = balance + v_seller_net, updated_at = now()
  WHERE user_id = v_seller_id
  RETURNING balance INTO v_seller_new_balance;

  UPDATE holdings SET quantity = quantity - v_offer.quantity, updated_at = now()
  WHERE user_id = v_seller_id AND player_id = v_offer.player_id;

  INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
  VALUES (v_buyer_id, v_offer.player_id, v_offer.quantity, v_offer.price)
  ON CONFLICT (user_id, player_id) DO UPDATE SET
    quantity = holdings.quantity + v_offer.quantity,
    avg_buy_price = CASE
      WHEN holdings.quantity = 0 THEN v_offer.price
      ELSE ((holdings.avg_buy_price * holdings.quantity) + (v_offer.price * v_offer.quantity))
        / (holdings.quantity + v_offer.quantity)
    END,
    updated_at = now();

  INSERT INTO trades (buyer_id, seller_id, player_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (v_buyer_id, v_seller_id, v_offer.player_id, v_offer.price, v_offer.quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  IF v_pbt_fee > 0 THEN
    INSERT INTO pbt_treasury (player_id, balance, trading_inflow, last_inflow_at)
    VALUES (v_offer.player_id, v_pbt_fee, v_pbt_fee, now())
    ON CONFLICT (player_id) DO UPDATE SET
      balance = pbt_treasury.balance + v_pbt_fee,
      trading_inflow = pbt_treasury.trading_inflow + v_pbt_fee,
      last_inflow_at = now(), updated_at = now();

    SELECT balance INTO v_pbt_balance FROM pbt_treasury WHERE player_id = v_offer.player_id;
    INSERT INTO pbt_transactions (player_id, source, amount, balance_after, trade_id, description)
    VALUES (v_offer.player_id, 'trading', v_pbt_fee, v_pbt_balance, v_trade_id,
            format('Offer Fee: %s Cents (PBT-Anteil)', v_pbt_fee));
  END IF;

  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN
    UPDATE clubs SET treasury_balance_cents = COALESCE(treasury_balance_cents, 0) + v_club_fee
    WHERE id = v_player.club_id;
  END IF;

  -- E3-2 (Slice 358): Plattform-Fee in den BeScout-Topf — voller Auffang (D96/D97)
  IF v_platform_fee > 0 THEN
    PERFORM book_platform_treasury('credit', 'p2p', v_platform_fee, v_trade_id, 'P2P-Angebots-Fee');
  END IF;

  UPDATE players SET
    last_price = v_offer.price,
    volume_24h = COALESCE(volume_24h, 0) + v_total_cost,
    floor_price = COALESCE(
      (SELECT MIN(price) FROM orders
       WHERE player_id = v_offer.player_id AND side = 'sell' AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      ipo_price),
    updated_at = now()
  WHERE id = v_offer.player_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    v_buyer_id,
    CASE WHEN v_offer.side = 'buy' THEN 'offer_execute' ELSE 'offer_buy' END,
    -v_total_cost,
    v_buyer_new_balance,
    v_trade_id,
    'SC-Kauf via Angebot: ' || v_player.first_name || ' ' || v_player.last_name
  );

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    v_seller_id,
    'offer_sell',
    v_seller_net,
    v_seller_new_balance,
    v_trade_id,
    'SC-Verkauf via Angebot: ' || v_player.first_name || ' ' || v_player.last_name
  );

  UPDATE offers SET
    status = 'accepted',
    receiver_id = p_user_id,
    updated_at = now()
  WHERE id = p_offer_id;

  PERFORM update_mission_progress(v_buyer_id, 'daily_trade', 1);
  PERFORM update_mission_progress(v_seller_id, 'daily_trade', 1);

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'trade_price', v_offer.price,
    'buyer_new_balance', v_buyer_new_balance,
    'seller_net', v_seller_net,
    'platform_fee', v_platform_fee,
    'pbt_fee', v_pbt_fee,
    'club_fee', v_club_fee
  );
END;
$function$;
