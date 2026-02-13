-- ============================================
-- Fix: IPO-Preis vs. Markt-Preis Trennung
-- ============================================
-- Problem: floor_price wurde gleichzeitig als Pool-Preis
-- und als Markt-Minimum genutzt. Wenn ein User bei 8 listet,
-- fiel der Pool-Preis von 10 auf 8 mit.
--
-- Loesung:
-- - ipo_price = fester Club-Preis (aendert sich NIE durch Markt)
-- - floor_price = guenstigstes User-Angebot (Transfermarkt)
-- - Pool verkauft IMMER zu ipo_price
-- - Transfermarkt = nur User-to-User Orders
-- ============================================
-- Ausfuehren im Supabase SQL Editor.
-- ============================================


-- ============================================
-- SCHRITT 1: ipo_price Spalte hinzufuegen
-- ============================================

-- Spalte hinzufuegen (Standard = aktueller floor_price ist falsch,
-- daher setzen wir Defaults manuell nach Seed-Daten)
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS ipo_price BIGINT NOT NULL DEFAULT 1000;

-- ipo_price auf die ORIGINAL Seed-Werte setzen
-- (floor_price ist durch Trading bereits korrumpiert)
-- Formel aus Seed: Marktwert / 50 = BSD Startpreis in Cents
-- Wir nutzen die bekannten Seed-Werte:
UPDATE public.players SET ipo_price = 6000 WHERE last_name = 'Dadakdeniz';
UPDATE public.players SET ipo_price = 1000 WHERE last_name = 'Szumski';
UPDATE public.players SET ipo_price = 1000 WHERE last_name = 'Baytekin';
UPDATE public.players SET ipo_price = 18000 WHERE last_name = 'Kocaman';
UPDATE public.players SET ipo_price = 6000 WHERE last_name = 'Akdag';
UPDATE public.players SET ipo_price = 4000 WHERE last_name = 'Maresic';
UPDATE public.players SET ipo_price = 9000 WHERE last_name = 'Huboccan';
UPDATE public.players SET ipo_price = 3000 WHERE last_name = 'Mercan';
UPDATE public.players SET ipo_price = 1000 WHERE last_name = 'Ndiaye' AND first_name LIKE '%Moustapha%';
UPDATE public.players SET ipo_price = 12000 WHERE last_name = 'Kapalidis';
UPDATE public.players SET ipo_price = 3000 WHERE last_name = 'Sari';
UPDATE public.players SET ipo_price = 15000 WHERE last_name = 'Soro';
UPDATE public.players SET ipo_price = 24000 WHERE last_name = 'Pena';
UPDATE public.players SET ipo_price = 7000 WHERE last_name = 'Sen';
UPDATE public.players SET ipo_price = 1000 WHERE last_name = 'Demir' AND first_name = 'Alparslan';
UPDATE public.players SET ipo_price = 1000 WHERE last_name = 'Fofana';
UPDATE public.players SET ipo_price = 11000 WHERE last_name = 'Haspolat';
UPDATE public.players SET ipo_price = 3500 WHERE last_name = 'Teber';
UPDATE public.players SET ipo_price = 8000 WHERE last_name = 'Al-Ghaddioui';
UPDATE public.players SET ipo_price = 4000 WHERE last_name = 'Ciftci';
UPDATE public.players SET ipo_price = 5500 WHERE last_name = 'Kayode';
UPDATE public.players SET ipo_price = 5500 WHERE last_name = 'Dursun';
UPDATE public.players SET ipo_price = 30000 WHERE last_name = 'Trezeguet';
UPDATE public.players SET ipo_price = 16000 WHERE last_name = 'Ndiaye' AND first_name = 'Abdallah';
UPDATE public.players SET ipo_price = 4000 WHERE last_name = 'Demir' AND first_name = 'Sahin';

-- floor_price korrigieren: NUR offene Sell-Orders zaehlen
-- Wenn keine Orders offen: floor_price = ipo_price
UPDATE public.players p
SET floor_price = COALESCE(
  (SELECT MIN(o.price) FROM public.orders o
   WHERE o.player_id = p.id AND o.side = 'sell' AND o.status IN ('open', 'partial')),
  p.ipo_price
);


-- ============================================
-- SCHRITT 2: buy_player_dpc (Smart Buy) neu
-- ============================================
-- Logik:
-- 1. Guenstigste Sell-Order suchen → von User kaufen
-- 2. Wenn keine Orders → vom Club-Pool kaufen zu ipo_price
-- 3. floor_price = MIN(offene Orders) oder NULL wenn keine
-- ============================================

CREATE OR REPLACE FUNCTION public.buy_player_dpc(
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
  v_order RECORD;
  v_seller_wallet RECORD;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_seller_new_balance BIGINT;
  v_remaining INT;
  v_new_status TEXT;
  v_holding_id UUID;
  v_trade_id UUID;
  v_source TEXT;
  v_price BIGINT;
BEGIN
  -- Pilot: nur 1 DPC pro Kauf
  IF p_quantity != 1 THEN
    RETURN json_build_object('success', false, 'error', 'Im Pilot nur 1 DPC pro Kauf');
  END IF;

  -- 1. Spieler laden
  SELECT * INTO v_player FROM public.players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;

  -- 2. Buyer Wallet laden
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden');
  END IF;

  -- 3. Guenstigste Sell-Order suchen (nur User-Orders)
  SELECT * INTO v_order FROM public.orders
  WHERE player_id = p_player_id
    AND side = 'sell'
    AND status IN ('open', 'partial')
    AND user_id != p_user_id
  ORDER BY price ASC
  LIMIT 1
  FOR UPDATE;

  -- ============================================
  -- PATH A: Sell-Order vorhanden → von User kaufen
  -- ============================================
  IF FOUND THEN
    v_price := v_order.price;
    v_total_cost := v_price * p_quantity;
    v_source := 'order';

    IF v_wallet.balance < v_total_cost THEN
      RETURN json_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;

    v_remaining := v_order.quantity - v_order.filled_qty;
    IF v_remaining < p_quantity THEN
      RETURN json_build_object('success', false, 'error', 'Order hat nur ' || v_remaining || ' DPCs');
    END IF;

    -- Seller Wallet laden
    SELECT * INTO v_seller_wallet FROM public.wallets WHERE user_id = v_order.user_id FOR UPDATE;

    -- Geld transferieren
    v_new_balance := v_wallet.balance - v_total_cost;
    v_seller_new_balance := v_seller_wallet.balance + v_total_cost;
    UPDATE public.wallets SET balance = v_new_balance WHERE user_id = p_user_id;
    UPDATE public.wallets SET balance = v_seller_new_balance WHERE user_id = v_order.user_id;

    -- Buyer Holdings updaten
    INSERT INTO public.holdings (user_id, player_id, quantity, avg_buy_price)
    VALUES (p_user_id, p_player_id, p_quantity, v_price)
    ON CONFLICT (user_id, player_id) DO UPDATE SET
      avg_buy_price = (
        (holdings.avg_buy_price * holdings.quantity + v_price * p_quantity)
        / (holdings.quantity + p_quantity)
      ),
      quantity = holdings.quantity + p_quantity;

    -- Seller Holdings reduzieren
    UPDATE public.holdings
    SET quantity = quantity - p_quantity
    WHERE user_id = v_order.user_id AND player_id = p_player_id;

    -- Order updaten
    IF v_remaining = p_quantity THEN
      v_new_status := 'filled';
    ELSE
      v_new_status := 'partial';
    END IF;
    UPDATE public.orders
    SET filled_qty = filled_qty + p_quantity, status = v_new_status
    WHERE id = v_order.id;

    -- Trade-Log
    INSERT INTO public.trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity)
    VALUES (p_player_id, p_user_id, v_order.user_id, NULL, v_order.id, v_price, p_quantity)
    RETURNING id INTO v_trade_id;

    -- Transaction-Logs (beide Seiten)
    INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
    VALUES
      (p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
       'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
      (v_order.user_id, 'trade_sell', v_total_cost, v_seller_new_balance, v_trade_id,
       'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  -- ============================================
  -- PATH B: Keine Orders → vom Club-Pool kaufen
  -- Preis = ipo_price (NICHT floor_price!)
  -- ============================================
  ELSE
    v_price := v_player.ipo_price;
    v_total_cost := v_price * p_quantity;
    v_source := 'ipo';

    IF v_player.dpc_available < p_quantity THEN
      RETURN json_build_object('success', false, 'error', 'Keine DPCs im Club-Pool verfuegbar');
    END IF;

    IF v_wallet.balance < v_total_cost THEN
      RETURN json_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;

    -- Wallet belasten
    v_new_balance := v_wallet.balance - v_total_cost;
    UPDATE public.wallets SET balance = v_new_balance WHERE user_id = p_user_id;

    -- Holdings updaten
    INSERT INTO public.holdings (user_id, player_id, quantity, avg_buy_price)
    VALUES (p_user_id, p_player_id, p_quantity, v_price)
    ON CONFLICT (user_id, player_id) DO UPDATE SET
      avg_buy_price = (
        (holdings.avg_buy_price * holdings.quantity + v_price * p_quantity)
        / (holdings.quantity + p_quantity)
      ),
      quantity = holdings.quantity + p_quantity;

    -- dpc_available reduzieren
    UPDATE public.players
    SET dpc_available = dpc_available - p_quantity
    WHERE id = p_player_id;

    -- Trade-Log (seller_id = NULL fuer Club/IPO-Kauf)
    INSERT INTO public.trades (player_id, buyer_id, seller_id, price, quantity)
    VALUES (p_player_id, p_user_id, NULL, v_price, p_quantity)
    RETURNING id INTO v_trade_id;

    -- Transaction-Log
    INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
    VALUES (
      p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
      'IPO-Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name
    );
  END IF;

  -- ============================================
  -- IMMER: Preis aktualisieren
  -- ============================================
  -- last_price = letzter Trade-Preis
  -- floor_price = guenstigste offene User-Sell-Order (oder ipo_price als Fallback)
  -- ipo_price wird NIE geaendert (nur vom Club-Admin)
  UPDATE public.players
  SET last_price = v_price,
      volume_24h = volume_24h + v_total_cost,
      price_change_24h = CASE
        WHEN v_player.last_price > 0
        THEN ((v_price::NUMERIC - v_player.last_price::NUMERIC) / v_player.last_price::NUMERIC * 100)
        ELSE 0
      END,
      floor_price = COALESCE(
        (SELECT MIN(price) FROM public.orders
         WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')),
        ipo_price
      )
  WHERE id = p_player_id;

  RETURN json_build_object(
    'success', true,
    'source', v_source,
    'trade_id', v_trade_id,
    'total_cost', v_total_cost,
    'new_balance', v_new_balance,
    'quantity', p_quantity,
    'price_per_dpc', v_price
  );
END;
$$;


-- ============================================
-- SCHRITT 3: place_sell_order (Fix Floor Calc)
-- ============================================
-- Floor = MIN(offene Orders) — Pool hat keinen Einfluss

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

  -- 4. Floor Price = guenstigste User-Order
  -- (NICHT LEAST mit altem floor — das hat den Pool-Preis korrumpiert!)
  UPDATE public.players
  SET floor_price = COALESCE(
    (SELECT MIN(price) FROM public.orders
     WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')),
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
$$;


-- ============================================
-- SCHRITT 4: buy_from_order (Fix Floor Calc)
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
      END,
      -- Floor = guenstigste offene Order, Fallback = ipo_price
      floor_price = COALESCE(
        (SELECT MIN(price) FROM public.orders
         WHERE player_id = v_order.player_id AND side = 'sell' AND status IN ('open', 'partial')),
        ipo_price
      )
  WHERE id = v_order.player_id;

  -- 9. Trade-Log
  INSERT INTO public.trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity)
  VALUES (v_order.player_id, p_buyer_id, v_order.user_id, NULL, p_order_id, v_order.price, p_quantity)
  RETURNING id INTO v_trade_id;

  -- 10. Transaction-Logs (beide Seiten)
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
-- SCHRITT 5: cancel_order (Fix Floor Calc)
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

  -- Floor = guenstigste offene Order, Fallback = ipo_price
  UPDATE public.players
  SET floor_price = COALESCE(
    (SELECT MIN(price) FROM public.orders
     WHERE player_id = v_order.player_id AND side = 'sell' AND status IN ('open', 'partial')),
    ipo_price
  )
  WHERE id = v_order.player_id;

  RETURN json_build_object('success', true, 'order_id', p_order_id);
END;
$$;


-- ============================================
-- FERTIG!
-- ============================================
-- Zusammenfassung:
-- 1. ipo_price = fester Club/IPO-Preis (aendert sich nie durch Markt)
-- 2. floor_price = MIN(offene User-Sell-Orders) oder ipo_price als Fallback
-- 3. Pool verkauft zu ipo_price, nicht zu floor_price
-- 4. Transfermarkt = nur User-to-User Orders
-- ============================================
