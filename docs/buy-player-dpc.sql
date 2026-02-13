-- ============================================
-- Smart Buy: buy_player_dpc
-- ============================================
-- Ersetzt buy_from_market als primaere Kauf-Funktion.
-- Prueft zuerst ob Sell-Orders existieren und kauft
-- von der guenstigsten. Nur wenn keine Orders da sind,
-- wird aus dem System-Pool (dpc_available) gekauft.
-- Floor-Price wird immer neu berechnet.
-- ============================================
-- Ausfuehren im Supabase SQL Editor.
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
  -- Nur 1 DPC pro Kauf (Pilot-Vereinfachung)
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

  -- 3. Guenstigste Sell-Order suchen
  SELECT * INTO v_order FROM public.orders
  WHERE player_id = p_player_id
    AND side = 'sell'
    AND status IN ('open', 'partial')
    AND user_id != p_user_id  -- Nicht eigene Orders kaufen
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

    -- Balance pruefen
    IF v_wallet.balance < v_total_cost THEN
      RETURN json_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;

    -- Remaining pruefen
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
  -- PATH B: Keine Orders → vom System-Pool kaufen
  -- ============================================
  ELSE
    v_price := v_player.floor_price;
    v_total_cost := v_price * p_quantity;
    v_source := 'pool';

    IF v_player.dpc_available < p_quantity THEN
      RETURN json_build_object('success', false, 'error', 'Keine DPCs verfuegbar');
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

    -- Trade-Log (seller_id = NULL fuer System-Kauf)
    INSERT INTO public.trades (player_id, buyer_id, seller_id, price, quantity)
    VALUES (p_player_id, p_user_id, NULL, v_price, p_quantity)
    RETURNING id INTO v_trade_id;

    -- Transaction-Log
    INSERT INTO public.transactions (user_id, type, amount, balance_after, reference_id, description)
    VALUES (
      p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
      'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name
    );
  END IF;

  -- ============================================
  -- IMMER: Preis + Floor aktualisieren
  -- ============================================
  UPDATE public.players
  SET last_price = v_price,
      volume_24h = volume_24h + v_total_cost,
      price_change_24h = CASE
        WHEN v_player.last_price > 0
        THEN ((v_price::NUMERIC - v_player.last_price::NUMERIC) / v_player.last_price::NUMERIC * 100)
        ELSE 0
      END,
      floor_price = COALESCE(
        -- Guenstigste offene Order (nach dieser Transaktion)
        (SELECT MIN(price) FROM public.orders
         WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')),
        -- Fallback: letzter Trade-Preis
        v_price
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
