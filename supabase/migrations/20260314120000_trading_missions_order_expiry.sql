-- ============================================================================
-- Migration: Trading Mission Definitions + Order Expiry Policy
-- Date: 2026-03-14
-- ============================================================================

-- 1) Trading Mission Definitions
-- --------------------------------------------------------------------------
INSERT INTO mission_definitions (key, type, title, description, icon, target_value, reward_cents, tracking_type, tracking_config, active)
VALUES
  ('daily_trade', 'daily', 'Täglicher Handel', 'Führe heute mindestens 1 Trade durch', '💹', 1, 5000, 'manual', '{}', true),
  ('weekly_5_trades', 'weekly', '5 Trades diese Woche', 'Schließe 5 Trades in einer Woche ab', '📈', 5, 25000, 'manual', '{}', true),
  ('first_ipo_buy', 'weekly', 'IPO Teilnahme', 'Kaufe bei einem IPO ein', '🎯', 1, 15000, 'manual', '{}', true)
ON CONFLICT (key) DO NOTHING;


-- 2) Update place_sell_order to set expires_at
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.place_sell_order(
  p_user_id UUID, p_player_id UUID, p_quantity INT, p_price BIGINT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_holding RECORD;
  v_open_sell_qty INT;
  v_available_qty INT;
  v_order_id UUID;
  v_is_liquidated BOOLEAN;
  v_recent_orders INT;
BEGIN
  -- AUTH GUARD: verify caller identity
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- INPUT VALIDATION GUARD
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Menge. Mindestens 1 DPC.');
  END IF;
  IF p_price IS NULL OR p_price < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiger Preis. Mindestens 1 Cent.');
  END IF;

  -- LIQUIDATION GUARD
  SELECT is_liquidated INTO v_is_liquidated FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.');
  END IF;
  IF v_is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading möglich.');
  END IF;

  -- CLUB ADMIN TRADING RESTRICTION
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Club-Admins dürfen keine DPCs ihres eigenen Clubs handeln.');
  END IF;

  -- ORDER PLACEMENT RATE LIMIT: Max 10 new sell orders per player per hour
  SELECT COUNT(*) INTO v_recent_orders
  FROM public.orders
  WHERE user_id = p_user_id
    AND player_id = p_player_id
    AND side = 'sell'
    AND created_at > now() - INTERVAL '1 hour';

  IF v_recent_orders >= 10 THEN
    RETURN json_build_object('success', false, 'error',
      'Max 10 Verkaufsorders pro Spieler pro Stunde. Bitte warte.');
  END IF;

  SELECT * INTO v_holding FROM public.holdings
  WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF NOT FOUND OR v_holding.quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Keine DPCs zum Verkaufen');
  END IF;

  SELECT COALESCE(SUM(quantity - filled_qty), 0) INTO v_open_sell_qty
  FROM public.orders
  WHERE user_id = p_user_id AND player_id = p_player_id
    AND side = 'sell' AND status IN ('open', 'partial')
    AND (expires_at IS NULL OR expires_at > NOW());

  v_available_qty := v_holding.quantity - v_open_sell_qty;
  IF v_available_qty < p_quantity THEN
    RETURN json_build_object('success', false, 'error',
      'Nur ' || v_available_qty || ' DPCs verfuegbar (Rest bereits gelistet)');
  END IF;

  INSERT INTO public.orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (p_user_id, p_player_id, 'sell', p_price, p_quantity, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_order_id;

  UPDATE public.players
  SET floor_price = COALESCE(
    (SELECT MIN(price) FROM public.orders
     WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
    ipo_price
  )
  WHERE id = p_player_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', p_quantity,
    'price', p_price
  );
END;
$function$;


-- 3) Create expire_pending_orders RPC
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_pending_orders()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expired_count INT;
  affected_player RECORD;
BEGIN
  -- Collect affected player IDs BEFORE cancelling (reliable, no time-window hack)
  CREATE TEMP TABLE _expired_players ON COMMIT DROP AS
    SELECT DISTINCT o.player_id, p.ipo_price
    FROM public.orders o
    JOIN public.players p ON p.id = o.player_id
    WHERE o.status IN ('open', 'partial')
      AND o.expires_at IS NOT NULL
      AND o.expires_at < NOW();

  -- Cancel expired orders
  UPDATE public.orders
  SET status = 'cancelled'
  WHERE status IN ('open', 'partial')
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Recalculate floor_price for all affected players
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

REVOKE ALL ON FUNCTION public.expire_pending_orders() FROM PUBLIC, authenticated, anon;


-- 4) Backfill existing orders
-- --------------------------------------------------------------------------
UPDATE public.orders
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL
  AND status IN ('open', 'partial');


-- 5) Add expires_at guard to buy_player_dpc (prevents buying from expired orders)
-- --------------------------------------------------------------------------
-- The order selection query must exclude expired orders.
-- Current: WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial') AND user_id != p_user_id
-- Fixed: adds AND (expires_at IS NULL OR expires_at > NOW())
CREATE OR REPLACE FUNCTION public.buy_player_dpc(
  p_user_id UUID, p_player_id UUID, p_quantity INT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_player RECORD;
  v_fee_cfg RECORD;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_holding RECORD;
  v_trade_id UUID;
  v_remaining INT;
  v_seller_balance BIGINT;
  v_total_fee BIGINT;
  v_platform_fee BIGINT;
  v_pbt_fee BIGINT;
  v_club_fee BIGINT;
  v_seller_proceeds BIGINT;
  v_pbt_balance BIGINT;
  v_buyer_sub RECORD;
  v_effective_fee_bps INT;
  v_discount_bps INT;
  v_locked BIGINT;
  v_recent_trades INT;
  v_circular_count INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_quantity != 1 THEN
    RETURN json_build_object('success', false, 'error', 'Im Pilot nur 1 DPC pro Kauf');
  END IF;

  SELECT id, club_id, first_name, last_name, ipo_price, is_liquidated
  INTO v_player FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;

  IF v_player.is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading möglich.');
  END IF;

  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Club-Admins dürfen keine DPCs ihres eigenen Clubs handeln.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_player_id::text));

  -- VELOCITY GUARD
  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND player_id = p_player_id
    AND executed_at > now() - INTERVAL '24 hours';

  IF v_recent_trades >= 20 THEN
    RETURN json_build_object('success', false, 'error',
      'Tägliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;

  -- Fee config
  SELECT * INTO v_fee_cfg FROM fee_config
  WHERE club_id = v_player.club_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_discount_bps := 0;
  SELECT tier INTO v_buyer_sub FROM club_subscriptions
  WHERE user_id = p_user_id AND club_id = v_player.club_id AND status = 'active' AND expires_at > now() LIMIT 1;
  IF FOUND THEN
    IF v_buyer_sub.tier = 'gold' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_gold_bps, 150);
    ELSIF v_buyer_sub.tier = 'silber' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_silber_bps, 100);
    ELSIF v_buyer_sub.tier = 'bronze' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_bronze_bps, 50);
    END IF;
  END IF;

  v_effective_fee_bps := GREATEST(0, COALESCE(v_fee_cfg.trade_fee_bps, 600) - v_discount_bps);

  -- Find cheapest sell order — FIX: exclude expired orders
  SELECT * INTO v_order FROM orders
  WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial') AND user_id != p_user_id
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY price ASC LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Keine Angebote von anderen Usern verfügbar.');
  END IF;

  -- CIRCULAR TRADE GUARD
  SELECT COUNT(*) INTO v_circular_count
  FROM trades
  WHERE seller_id = p_user_id
    AND buyer_id = v_order.user_id
    AND player_id = p_player_id
    AND executed_at > now() - INTERVAL '7 days';

  IF v_circular_count > 0 THEN
    RETURN json_build_object('success', false, 'error',
      'Verdächtiges Handelsmuster erkannt. Handel mit demselben Partner innerhalb von 7 Tagen nicht erlaubt.');
  END IF;

  v_remaining := v_order.quantity - v_order.filled_qty;
  IF p_quantity > v_remaining THEN p_quantity := v_remaining; END IF;

  v_total_cost := v_order.price * p_quantity;

  v_total_fee := (v_total_cost * v_effective_fee_bps) / 10000;
  IF v_total_fee < 1 AND v_total_cost > 0 THEN v_total_fee := 1; END IF;

  IF v_effective_fee_bps > 0 THEN
    v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_pbt_bps, 150)) / 10000;
    v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_club_bps, 100)) / 10000;
    v_platform_fee := GREATEST(0, v_total_fee - v_pbt_fee - v_club_fee);
  ELSE
    v_platform_fee := 0; v_pbt_fee := 0; v_club_fee := 0; v_total_fee := 0;
  END IF;

  v_seller_proceeds := v_total_cost - v_total_fee;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  v_locked := COALESCE(v_wallet.locked_balance, 0);
  IF NOT FOUND OR (v_wallet.balance - v_locked) < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.');
  END IF;

  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  UPDATE wallets SET balance = balance + v_seller_proceeds, updated_at = now()
  WHERE user_id = v_order.user_id RETURNING balance INTO v_seller_balance;

  UPDATE holdings SET quantity = quantity - p_quantity, updated_at = now()
  WHERE user_id = v_order.user_id AND player_id = p_player_id;

  UPDATE orders SET
    filled_qty = filled_qty + p_quantity,
    status = CASE WHEN filled_qty + p_quantity >= quantity THEN 'filled' ELSE 'partial' END
  WHERE id = v_order.id;

  SELECT * INTO v_holding FROM holdings WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF FOUND THEN
    UPDATE holdings SET
      quantity = v_holding.quantity + p_quantity,
      avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost) / (v_holding.quantity + p_quantity),
      updated_at = now()
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price) VALUES (p_user_id, p_player_id, p_quantity, v_order.price);
  END IF;

  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (p_player_id, p_user_id, v_order.user_id, NULL, v_order.id, v_order.price, p_quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  IF v_pbt_fee > 0 THEN
    INSERT INTO pbt_treasury (player_id, balance, trading_inflow, last_inflow_at)
    VALUES (p_player_id, v_pbt_fee, v_pbt_fee, now())
    ON CONFLICT (player_id) DO UPDATE SET
      balance = pbt_treasury.balance + v_pbt_fee,
      trading_inflow = pbt_treasury.trading_inflow + v_pbt_fee,
      last_inflow_at = now(), updated_at = now();

    SELECT balance INTO v_pbt_balance FROM pbt_treasury WHERE player_id = p_player_id;
    INSERT INTO pbt_transactions (player_id, source, amount, balance_after, trade_id, description)
    VALUES (p_player_id, 'trading', v_pbt_fee, v_pbt_balance, v_trade_id,
            format('Trade Fee: %s Cents (PBT-Anteil von %s Cents Gesamtgebühr)', v_pbt_fee, v_total_fee));
  END IF;

  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN
    UPDATE clubs SET treasury_balance_cents = treasury_balance_cents + v_club_fee WHERE id = v_player.club_id;
  END IF;

  UPDATE players SET
    last_price = v_order.price,
    floor_price = COALESCE(
      (SELECT MIN(price) FROM orders WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      ipo_price),
    volume_24h = volume_24h + v_total_cost, updated_at = now()
  WHERE id = p_player_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, 'buy', -v_total_cost, v_new_balance, v_trade_id,
     format('%s DPC @ %s Cents', p_quantity, v_order.price)),
    (v_order.user_id, 'sell', v_seller_proceeds, v_seller_balance, v_trade_id,
     format('%s DPC @ %s Cents verkauft (-%s Gebühr)', p_quantity, v_order.price, v_total_fee));

  RETURN json_build_object(
    'success', true, 'trade_id', v_trade_id, 'total_cost', v_total_cost,
    'new_balance', v_new_balance, 'quantity', p_quantity, 'price_per_dpc', v_order.price,
    'source', 'order', 'order_id', v_order.id, 'seller_id', v_order.user_id,
    'platform_fee', v_platform_fee, 'pbt_fee', v_pbt_fee,
    'club_fee', v_club_fee, 'fee_discount_bps', v_discount_bps, 'effective_fee_bps', v_effective_fee_bps
  );
END;
$function$;


-- 6) Add expires_at guard to buy_from_order (prevents executing expired orders)
-- --------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.buy_from_order(
  p_buyer_id UUID, p_order_id UUID, p_quantity INT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_order RECORD;
  v_buyer_wallet RECORD;
  v_seller_wallet RECORD;
  v_total_cost BIGINT;
  v_remaining INT;
  v_new_status TEXT;
  v_buyer_new_balance BIGINT;
  v_seller_new_balance BIGINT;
  v_trade_id UUID;
  v_player RECORD;
  v_fee_cfg RECORD;
  v_total_fee BIGINT;
  v_platform_fee BIGINT;
  v_pbt_fee BIGINT;
  v_club_fee BIGINT;
  v_seller_receives BIGINT;
  v_locked BIGINT;
  v_recent_trades INT;
  v_circular_count INT;
  v_buyer_sub RECORD;
  v_discount_bps INT;
  v_effective_fee_bps INT;
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_buyer_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Menge. Mindestens 1 DPC.');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order nicht gefunden');
  END IF;
  IF v_order.side != 'sell' THEN
    RETURN json_build_object('success', false, 'error', 'Keine Sell-Order');
  END IF;
  IF v_order.status NOT IN ('open', 'partial') THEN
    RETURN json_build_object('success', false, 'error', 'Order nicht mehr aktiv');
  END IF;
  -- FIX: Reject expired orders
  IF v_order.expires_at IS NOT NULL AND v_order.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Diese Order ist abgelaufen.');
  END IF;
  IF v_order.user_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Eigene Order kaufen nicht möglich');
  END IF;

  v_remaining := v_order.quantity - v_order.filled_qty;
  IF v_remaining < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Nur ' || v_remaining || ' DPCs verfügbar');
  END IF;

  v_total_cost := v_order.price * p_quantity;

  SELECT * INTO v_player FROM players WHERE id = v_order.player_id;

  IF v_player.is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler wurde liquidiert. Trading nicht möglich.');
  END IF;

  IF is_club_admin_for_player(p_buyer_id, v_order.player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Club-Admins dürfen keine DPCs ihres eigenen Clubs handeln.');
  END IF;

  -- ADVISORY LOCK
  PERFORM pg_advisory_xact_lock(hashtext(p_buyer_id::text || v_order.player_id::text));

  -- VELOCITY GUARD
  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = p_buyer_id OR seller_id = p_buyer_id)
    AND player_id = v_order.player_id
    AND executed_at > now() - INTERVAL '24 hours';

  IF v_recent_trades >= 20 THEN
    RETURN json_build_object('success', false, 'error',
      'Tägliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;

  -- CIRCULAR TRADE GUARD
  SELECT COUNT(*) INTO v_circular_count
  FROM trades
  WHERE seller_id = p_buyer_id
    AND buyer_id = v_order.user_id
    AND player_id = v_order.player_id
    AND executed_at > now() - INTERVAL '7 days';

  IF v_circular_count > 0 THEN
    RETURN json_build_object('success', false, 'error',
      'Verdächtiges Handelsmuster erkannt. Handel mit demselben Partner innerhalb von 7 Tagen nicht erlaubt.');
  END IF;

  -- FEE CONFIG
  SELECT * INTO v_fee_cfg FROM fee_config
    WHERE club_id = v_player.club_id ORDER BY club_id NULLS LAST LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL;
  END IF;

  -- SUBSCRIPTION FEE DISCOUNT
  v_discount_bps := 0;
  SELECT tier INTO v_buyer_sub FROM club_subscriptions
  WHERE user_id = p_buyer_id AND club_id = v_player.club_id AND status = 'active' AND expires_at > now() LIMIT 1;
  IF FOUND THEN
    IF v_buyer_sub.tier = 'gold' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_gold_bps, 150);
    ELSIF v_buyer_sub.tier = 'silber' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_silber_bps, 100);
    ELSIF v_buyer_sub.tier = 'bronze' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_bronze_bps, 50);
    END IF;
  END IF;

  v_effective_fee_bps := GREATEST(0, COALESCE(v_fee_cfg.trade_fee_bps, 600) - v_discount_bps);

  v_total_fee := (v_total_cost * v_effective_fee_bps) / 10000;
  IF v_total_fee < 1 AND v_total_cost > 0 AND v_effective_fee_bps > 0 THEN v_total_fee := 1; END IF;

  IF v_effective_fee_bps > 0 THEN
    v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_pbt_bps, 150)) / 10000;
    v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_club_bps, 100)) / 10000;
    v_platform_fee := GREATEST(0, v_total_fee - v_pbt_fee - v_club_fee);
  ELSE
    v_platform_fee := 0; v_pbt_fee := 0; v_club_fee := 0; v_total_fee := 0;
  END IF;

  v_seller_receives := v_total_cost - v_total_fee;

  SELECT * INTO v_buyer_wallet FROM wallets WHERE user_id = p_buyer_id FOR UPDATE;
  v_locked := COALESCE(v_buyer_wallet.locked_balance, 0);
  IF (v_buyer_wallet.balance - v_locked) < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD');
  END IF;

  SELECT * INTO v_seller_wallet FROM wallets WHERE user_id = v_order.user_id FOR UPDATE;

  v_buyer_new_balance := v_buyer_wallet.balance - v_total_cost;
  v_seller_new_balance := v_seller_wallet.balance + v_seller_receives;

  UPDATE wallets SET balance = v_buyer_new_balance, updated_at = now() WHERE user_id = p_buyer_id;
  UPDATE wallets SET balance = v_seller_new_balance, updated_at = now() WHERE user_id = v_order.user_id;

  INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
  VALUES (p_buyer_id, v_order.player_id, p_quantity, v_order.price)
  ON CONFLICT (user_id, player_id) DO UPDATE SET
    avg_buy_price = (holdings.avg_buy_price * holdings.quantity + v_order.price * p_quantity) / (holdings.quantity + p_quantity),
    quantity = holdings.quantity + p_quantity;

  PERFORM 1 FROM holdings WHERE user_id = v_order.user_id AND player_id = v_order.player_id FOR UPDATE;
  UPDATE holdings SET quantity = quantity - p_quantity
  WHERE user_id = v_order.user_id AND player_id = v_order.player_id;

  IF v_remaining = p_quantity THEN v_new_status := 'filled';
  ELSE v_new_status := 'partial';
  END IF;
  UPDATE orders SET filled_qty = filled_qty + p_quantity, status = v_new_status WHERE id = p_order_id;

  UPDATE players SET
    last_price = v_order.price,
    volume_24h = volume_24h + v_total_cost,
    price_change_24h = CASE WHEN v_player.last_price > 0
      THEN ((v_order.price::NUMERIC - v_player.last_price::NUMERIC) / v_player.last_price::NUMERIC * 100) ELSE 0 END,
    floor_price = COALESCE(
      (SELECT MIN(price) FROM orders WHERE player_id = v_order.player_id AND side = 'sell' AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      ipo_price)
  WHERE id = v_order.player_id;

  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (v_order.player_id, p_buyer_id, v_order.user_id, NULL, p_order_id, v_order.price, p_quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_buyer_id, 'trade_buy', -v_total_cost, v_buyer_new_balance, v_trade_id,
     'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
    (v_order.user_id, 'trade_sell', v_seller_receives, v_seller_new_balance, v_trade_id,
     'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name || ' (Gebühr: ' || v_total_fee || ' Cents)');

  -- PBT Treasury credit
  PERFORM credit_pbt(v_order.player_id, v_pbt_fee, 'trading', v_trade_id,
    'Trade Fee: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  -- Club Treasury credit
  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN
    UPDATE clubs SET treasury_balance_cents = treasury_balance_cents + v_club_fee
    WHERE id = v_player.club_id;
  END IF;

  RETURN json_build_object(
    'success', true, 'trade_id', v_trade_id, 'total_cost', v_total_cost,
    'buyer_new_balance', v_buyer_new_balance, 'seller_new_balance', v_seller_new_balance,
    'quantity', p_quantity, 'price', v_order.price,
    'fee_discount_bps', v_discount_bps, 'effective_fee_bps', v_effective_fee_bps,
    'fees', json_build_object('total', v_total_fee, 'platform', v_platform_fee, 'pbt', v_pbt_fee, 'club', v_club_fee)
  );
END;
$function$;
