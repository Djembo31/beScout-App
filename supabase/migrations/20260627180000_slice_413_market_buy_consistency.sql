-- Slice 413 — Welle 1.5(a/c/d/e): Markt-Kauf-RPCs vereinheitlichen
--
-- buy_player_sc (Markt, picked günstigste Fremd-Order) und buy_from_order (gewählte
-- Order) waren über 4 Dimensionen auseinandergedriftet (D87, Live-functiondef):
--   1.5d Menge-zu-viel : buy_player_sc kappte still / buy_from_order lehnte ab
--                        → Anil-Entscheid: BEIDE ABLEHNEN (buy_player_sc angeglichen)
--   1.5a Rate-Limit    : buy_player_sc tier-basiert / buy_from_order hart >=20
--                        → BEIDE tier-basiert (buy_from_order angeglichen)
--   1.5c fee_config    : buy_player_sc created_at DESC / buy_from_order club_id NULLS LAST
--                        → BEIDE created_at DESC (kanonisch, = buy_from_ipo; buy_from_order angeglichen)
--   1.5e price_change  : buy_player_sc setzte es NICHT / buy_from_order schon
--                        → BEIDE setzen (buy_player_sc angeglichen; v_player-SELECT um last_price erweitert)
--
-- Baseline = exakt der Live-Body beider RPCs (PATCH-AUDIT S156); nur die 4 markierten
-- Stellen geändert. Alle Guards/Fees/Escrow/Idempotenz/book_platform_treasury/Return-Shape
-- byte-identisch. fee_config-Count live = 1 (global) → 1.5c geldneutral.
-- AR-44: bestehende Funktionen, CREATE OR REPLACE erhält ACL.

-- ============================================================
-- buy_player_sc — Änderungen (d) Reject + (e) price_change_24h
-- ============================================================
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

  -- [Slice 413 (e)] last_price ergänzt — für price_change_24h-Berechnung beim UPDATE players.
  SELECT id, club_id, first_name, last_name, ipo_price, is_liquidated, last_price INTO v_player FROM players WHERE id = p_player_id;
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
  -- [Slice 413 (d)] vorher: still kappen (p_quantity := v_remaining). Jetzt: ABLEHNEN
  -- (Anil-Entscheid, wortgleich zu buy_from_order → identisches mapErrorToKey → notEnoughDpc).
  IF p_quantity > v_remaining THEN RETURN json_build_object('success', false, 'error', 'Nur ' || v_remaining || ' SCs verfuegbar'); END IF;
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

  -- [Slice 406] Counter-Write clubs.treasury_balance_cents entfernt (write-only Orphan);
  -- Club-Anteil wird kanonisch via Trigger trg_trades_book_club_treasury (trades-INSERT oben) gebucht.

  -- E3-2 (Slice 358): Plattform-Fee in den BeScout-Topf — voller Auffang (D96/D97)
  IF v_platform_fee > 0 THEN
    PERFORM book_platform_treasury('credit', 'trading', v_platform_fee, v_trade_id, 'Trading-Fee (Orderbuch)');
  END IF;

  -- [Slice 413 (e)] price_change_24h ergänzt (Spiegel buy_from_order) — vorher fehlte es hier.
  UPDATE players SET last_price = v_order.price, volume_24h = volume_24h + v_total_cost,
    price_change_24h = CASE WHEN v_player.last_price > 0 AND v_player.last_price != v_order.price
      THEN ((v_order.price::NUMERIC - v_player.last_price::NUMERIC) / v_player.last_price::NUMERIC * 100) ELSE 0 END,
    updated_at = now() WHERE id = p_player_id;
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

-- ============================================================
-- buy_from_order — Änderungen (a) tier-Rate-Limit + (c) fee_config created_at DESC
-- ============================================================
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
  -- [Slice 413 (a)] vorher: hart >= 20. Jetzt: tier-basiert (Spiegel buy_player_sc — Abo-Perk gilt auch beim Order-Kauf).
  IF v_recent_trades >= COALESCE((SELECT CASE tier WHEN 'gold' THEN 200 WHEN 'silber' THEN 50 WHEN 'bronze' THEN 30 ELSE 20 END FROM club_subscriptions WHERE user_id = p_buyer_id AND status = 'active' AND expires_at > now() ORDER BY CASE tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1), 20) THEN RETURN json_build_object('success', false, 'error', 'Max 20 Trades/24h'); END IF;

  SELECT COUNT(*) INTO v_circular_count FROM trades WHERE seller_id = p_buyer_id AND buyer_id = v_order.user_id AND player_id = v_order.player_id AND executed_at > now() - INTERVAL '7 days';
  IF v_circular_count >= 2 THEN RETURN json_build_object('success', false, 'error', 'Verdaechtiges Handelsmuster.'); END IF;

  -- [Slice 413 (c)] vorher: ORDER BY club_id NULLS LAST / Fallback ohne Order. Jetzt: created_at DESC (kanonisch, = buy_player_sc/buy_from_ipo).
  SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id = v_player.club_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL ORDER BY created_at DESC LIMIT 1; END IF;

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

  -- [Slice 406] Counter-Write clubs.treasury_balance_cents entfernt (write-only Orphan);
  -- Club-Anteil wird kanonisch via Trigger trg_trades_book_club_treasury (trades-INSERT oben) gebucht.

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
