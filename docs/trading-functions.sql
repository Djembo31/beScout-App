-- ============================================
-- BeScout Trading Functions (Atomic)
-- ============================================
-- Alle Geld-Operationen als DB-Funktionen,
-- damit sie atomar (alles-oder-nichts) laufen.
-- Ausfuehren im Supabase SQL Editor.
-- ============================================


-- ============================================
-- 1. BUY FROM MARKET (Kauf vom System-Pool)
-- ============================================
-- User kauft DPCs direkt zum floor_price.
-- dpc_available wird reduziert.
-- ============================================

CREATE OR REPLACE FUNCTION public.buy_from_market(
  p_user_id UUID,
  p_player_id UUID,
  p_quantity INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player RECORD;
  v_wallet RECORD;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_holding_id UUID;
  v_trade_id UUID;
BEGIN
  -- 1. Spieler laden und pruefen
  SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;

  IF v_player.dpc_available < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug DPCs verfuegbar');
  END IF;

  -- 2. Wallet laden und Balance pruefen
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden');
  END IF;

  v_total_cost := v_player.floor_price * p_quantity;

  IF v_wallet.balance < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD');
  END IF;

  -- 3. Wallet belasten
  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE public.wallets SET balance = v_new_balance WHERE user_id = p_user_id;

  -- 4. Holdings erstellen oder updaten
  INSERT INTO public.holdings (user_id, player_id, quantity, avg_buy_price)
  VALUES (p_user_id, p_player_id, p_quantity, v_player.floor_price)
  ON CONFLICT (user_id, player_id) DO UPDATE SET
    avg_buy_price = (
      (holdings.avg_buy_price * holdings.quantity + v_player.floor_price * p_quantity)
      / (holdings.quantity + p_quantity)
    ),
    quantity = holdings.quantity + p_quantity
  RETURNING id INTO v_holding_id;

  -- 5. Spieler dpc_available reduzieren
  UPDATE public.players
  SET dpc_available = dpc_available - p_quantity,
      last_price = floor_price,
      volume_24h = volume_24h + v_total_cost
  WHERE id = p_player_id;

  -- 6. Trade-Log (seller_id = NULL fuer System-Kauf)
  INSERT INTO public.trades (player_id, buyer_id, seller_id, price, quantity)
  VALUES (p_player_id, p_user_id, NULL, v_player.floor_price, p_quantity)
  RETURNING id INTO v_trade_id;

  -- 7. Transaction-Log
  INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
    'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name
  );

  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'total_cost', v_total_cost,
    'new_balance', v_new_balance,
    'quantity', p_quantity,
    'price_per_dpc', v_player.floor_price
  );
END;
$$;


-- ============================================
-- 2. PLACE SELL ORDER (Verkaufsorder erstellen)
-- ============================================
-- User listet eigene DPCs zum Verkauf.
-- Holdings werden geprueft.
-- ============================================

CREATE OR REPLACE FUNCTION public.place_sell_order(
  p_user_id UUID,
  p_player_id UUID,
  p_quantity INT,
  p_price BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_holding RECORD;
  v_open_sell_qty INT;
  v_available_qty INT;
  v_order_id UUID;
BEGIN
  -- 1. Holdings pruefen
  SELECT * INTO v_holding FROM public.holdings
  WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;

  IF NOT FOUND OR v_holding.quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Keine DPCs zum Verkaufen');
  END IF;

  -- 2. Bereits gelistete Menge pruefen
  SELECT COALESCE(SUM(quantity - filled_qty), 0) INTO v_open_sell_qty
  FROM public.orders
  WHERE user_id = p_user_id AND player_id = p_player_id
    AND side = 'sell' AND status IN ('open', 'partial');

  v_available_qty := v_holding.quantity - v_open_sell_qty;

  IF v_available_qty < p_quantity THEN
    RETURN json_build_object('success', false, 'error',
      'Nur ' || v_available_qty || ' DPCs verfuegbar (Rest bereits gelistet)');
  END IF;

  -- 3. Order erstellen
  INSERT INTO public.orders (user_id, player_id, side, price, quantity, status)
  VALUES (p_user_id, p_player_id, 'sell', p_price, p_quantity, 'open')
  RETURNING id INTO v_order_id;

  -- 4. Floor Price aktualisieren (guenstigstes Angebot)
  UPDATE public.players
  SET floor_price = LEAST(floor_price, p_price)
  WHERE id = p_player_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', p_quantity,
    'price', p_price
  );
END;
$$;


-- ============================================
-- 3. BUY FROM ORDER (Kauf von einem User-Listing)
-- ============================================
-- Buyer kauft DPCs von einem Sell-Order.
-- Atomic: Geld, Holdings, Order, Trade-Log.
-- ============================================

CREATE OR REPLACE FUNCTION public.buy_from_order(
  p_buyer_id UUID,
  p_order_id UUID,
  p_quantity INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
BEGIN
  -- 1. Order laden und pruefen
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order nicht gefunden');
  END IF;

  IF v_order.side != 'sell' THEN
    RETURN json_build_object('success', false, 'error', 'Keine Sell-Order');
  END IF;

  IF v_order.status NOT IN ('open', 'partial') THEN
    RETURN json_build_object('success', false, 'error', 'Order nicht mehr aktiv');
  END IF;

  IF v_order.user_id = p_buyer_id THEN
    RETURN json_build_object('success', false, 'error', 'Eigene Order kaufen nicht moeglich');
  END IF;

  v_remaining := v_order.quantity - v_order.filled_qty;
  IF v_remaining < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Nur ' || v_remaining || ' DPCs verfuegbar');
  END IF;

  v_total_cost := v_order.price * p_quantity;

  -- 2. Buyer Wallet pruefen
  SELECT * INTO v_buyer_wallet FROM public.wallets WHERE user_id = p_buyer_id FOR UPDATE;
  IF v_buyer_wallet.balance < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD');
  END IF;

  -- 3. Seller Wallet laden
  SELECT * INTO v_seller_wallet FROM public.wallets WHERE user_id = v_order.user_id FOR UPDATE;

  -- 4. Geld transferieren
  v_buyer_new_balance := v_buyer_wallet.balance - v_total_cost;
  v_seller_new_balance := v_seller_wallet.balance + v_total_cost;

  UPDATE public.wallets SET balance = v_buyer_new_balance WHERE user_id = p_buyer_id;
  UPDATE public.wallets SET balance = v_seller_new_balance WHERE user_id = v_order.user_id;

  -- 5. Buyer Holdings updaten
  INSERT INTO public.holdings (user_id, player_id, quantity, avg_buy_price)
  VALUES (p_buyer_id, v_order.player_id, p_quantity, v_order.price)
  ON CONFLICT (user_id, player_id) DO UPDATE SET
    avg_buy_price = (
      (holdings.avg_buy_price * holdings.quantity + v_order.price * p_quantity)
      / (holdings.quantity + p_quantity)
    ),
    quantity = holdings.quantity + p_quantity;

  -- 6. Seller Holdings reduzieren
  UPDATE public.holdings
  SET quantity = quantity - p_quantity
  WHERE user_id = v_order.user_id AND player_id = v_order.player_id;

  -- 7. Order updaten
  IF v_remaining = p_quantity THEN
    v_new_status := 'filled';
  ELSE
    v_new_status := 'partial';
  END IF;

  UPDATE public.orders
  SET filled_qty = filled_qty + p_quantity, status = v_new_status
  WHERE id = p_order_id;

  -- 8. Player Preis aktualisieren
  SELECT * INTO v_player FROM public.players WHERE id = v_order.player_id;
  UPDATE public.players
  SET last_price = v_order.price,
      volume_24h = volume_24h + v_total_cost,
      price_change_24h = CASE
        WHEN v_player.last_price > 0
        THEN ((v_order.price::NUMERIC - v_player.last_price::NUMERIC) / v_player.last_price::NUMERIC * 100)
        ELSE 0
      END
  WHERE id = v_order.player_id;

  -- 9. Neuen Floor Price berechnen
  UPDATE public.players
  SET floor_price = COALESCE(
    (SELECT MIN(price) FROM public.orders
     WHERE player_id = v_order.player_id AND side = 'sell' AND status IN ('open', 'partial')),
    last_price
  )
  WHERE id = v_order.player_id;

  -- 10. Trade-Log
  INSERT INTO public.trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity)
  VALUES (v_order.player_id, p_buyer_id, v_order.user_id, NULL, p_order_id, v_order.price, p_quantity)
  RETURNING id INTO v_trade_id;

  -- 11. Transaction-Logs (beide Seiten)
  INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_buyer_id, 'trade_buy', -v_total_cost, v_buyer_new_balance, v_trade_id,
     'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
    (v_order.user_id, 'trade_sell', v_total_cost, v_seller_new_balance, v_trade_id,
     'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'total_cost', v_total_cost,
    'buyer_new_balance', v_buyer_new_balance,
    'seller_new_balance', v_seller_new_balance,
    'quantity', p_quantity,
    'price', v_order.price
  );
END;
$$;


-- ============================================
-- 4. CANCEL ORDER (Order stornieren)
-- ============================================

CREATE OR REPLACE FUNCTION public.cancel_order(
  p_user_id UUID,
  p_order_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Order nicht gefunden');
  END IF;

  IF v_order.user_id != p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Nicht deine Order');
  END IF;

  IF v_order.status NOT IN ('open', 'partial') THEN
    RETURN json_build_object('success', false, 'error', 'Order kann nicht storniert werden');
  END IF;

  UPDATE public.orders SET status = 'cancelled' WHERE id = p_order_id;

  -- Floor Price neu berechnen
  UPDATE public.players
  SET floor_price = COALESCE(
    (SELECT MIN(price) FROM public.orders
     WHERE player_id = v_order.player_id AND side = 'sell' AND status IN ('open', 'partial')),
    last_price
  )
  WHERE id = v_order.player_id;

  RETURN json_build_object('success', true, 'order_id', p_order_id);
END;
$$;


-- ============================================
-- FERTIG! Trading-Funktionen bereit.
-- ============================================
-- Test: SELECT public.buy_from_market('USER_UUID', 'PLAYER_UUID', 5);
-- ============================================
