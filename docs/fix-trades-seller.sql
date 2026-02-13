-- ============================================
-- Fix: trades.seller_id nullable machen
-- ============================================
-- Problem: System-Kaeufe haben keinen echten Seller.
-- Loesung: seller_id darf NULL sein (= Kauf vom System-Pool).
-- ============================================

-- FK-Constraint entfernen
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_seller_id_fkey;

-- Spalte nullable machen
ALTER TABLE public.trades ALTER COLUMN seller_id DROP NOT NULL;

-- FK wieder hinzufuegen, aber ohne NOT NULL
ALTER TABLE public.trades
  ADD CONSTRAINT trades_seller_id_fkey
  FOREIGN KEY (seller_id) REFERENCES auth.users(id);


-- ============================================
-- buy_from_market Funktion updaten (NULL statt Fake-UUID)
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
