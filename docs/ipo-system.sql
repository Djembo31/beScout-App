-- ============================================================
-- BeScout IPO System — Clean Reset + Schema + Seed + RPCs
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

BEGIN;

-- ============================================================
-- 1. CLEAN RESET — Delete all trading data
-- ============================================================

DELETE FROM trades;
DELETE FROM orders;
DELETE FROM holdings;
DELETE FROM transactions;

-- Reset wallets to 10.000 BSD (1.000.000 Cents)
UPDATE wallets SET balance = 1000000, locked_balance = 0;

-- Reset player DPC availability (Club owns all 10.000)
UPDATE players SET
  dpc_available = dpc_total,
  floor_price = ipo_price,
  last_price = ipo_price,
  volume_24h = 0,
  price_change_24h = 0;

-- ============================================================
-- 2. NEW TABLE: ipos
-- ============================================================

CREATE TABLE IF NOT EXISTS ipos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'announced'
                CHECK (status IN ('announced', 'early_access', 'open', 'ended', 'cancelled')),
  format        TEXT NOT NULL DEFAULT 'fixed'
                CHECK (format IN ('fixed', 'tiered', 'dutch')),
  price         BIGINT NOT NULL,               -- Cents, base/fixed price
  price_min     BIGINT,                        -- Dutch: minimum price
  price_max     BIGINT,                        -- Dutch: starting price
  tiers         JSONB,                         -- Tiered: [{price, quantity, sold}]
  total_offered INT NOT NULL,
  sold          INT NOT NULL DEFAULT 0,
  max_per_user  INT NOT NULL DEFAULT 50,
  member_discount INT NOT NULL DEFAULT 0,      -- % discount for club members
  starts_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at       TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  early_access_ends_at TIMESTAMPTZ,
  season        INT NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipos_player_id ON ipos(player_id);
CREATE INDEX IF NOT EXISTS idx_ipos_status ON ipos(status);

-- ============================================================
-- 3. NEW TABLE: ipo_purchases
-- ============================================================

CREATE TABLE IF NOT EXISTS ipo_purchases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ipo_id        UUID NOT NULL REFERENCES ipos(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  quantity      INT NOT NULL,
  price         BIGINT NOT NULL,               -- Price per DPC in Cents
  purchased_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ipo_purchases_ipo_id ON ipo_purchases(ipo_id);
CREATE INDEX IF NOT EXISTS idx_ipo_purchases_user_id ON ipo_purchases(user_id);

-- ============================================================
-- 4. EXTEND trades TABLE
-- ============================================================

ALTER TABLE trades ADD COLUMN IF NOT EXISTS ipo_id UUID REFERENCES ipos(id);

-- ============================================================
-- 5. RLS POLICIES
-- ============================================================

ALTER TABLE ipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ipo_purchases ENABLE ROW LEVEL SECURITY;

-- ipos: everyone can read
DROP POLICY IF EXISTS "ipos_select_all" ON ipos;
CREATE POLICY "ipos_select_all" ON ipos FOR SELECT USING (true);

-- ipo_purchases: users can read their own
DROP POLICY IF EXISTS "ipo_purchases_select_own" ON ipo_purchases;
CREATE POLICY "ipo_purchases_select_own" ON ipo_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. SEED: (removed — IPOs are now created via Admin UI / create_ipo RPC)
-- ============================================================

-- ============================================================
-- 7. RPC: buy_from_ipo
-- ============================================================

CREATE OR REPLACE FUNCTION buy_from_ipo(
  p_user_id UUID,
  p_ipo_id UUID,
  p_quantity INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ipo RECORD;
  v_wallet RECORD;
  v_user_purchased INT;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_holding RECORD;
  v_trade_id UUID;
  v_ipo_remaining INT;
BEGIN
  -- 1. Lock and load IPO
  SELECT * INTO v_ipo FROM ipos WHERE id = p_ipo_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'IPO nicht gefunden.');
  END IF;

  -- 2. Check IPO status and time window
  IF v_ipo.status NOT IN ('open', 'early_access') THEN
    RETURN json_build_object('success', false, 'error', 'IPO ist nicht aktiv.');
  END IF;

  IF now() < v_ipo.starts_at THEN
    RETURN json_build_object('success', false, 'error', 'IPO hat noch nicht begonnen.');
  END IF;

  IF now() > v_ipo.ends_at THEN
    -- Auto-end
    UPDATE ipos SET status = 'ended', updated_at = now() WHERE id = p_ipo_id;
    RETURN json_build_object('success', false, 'error', 'IPO ist beendet.');
  END IF;

  -- 3. Check remaining supply
  v_ipo_remaining := v_ipo.total_offered - v_ipo.sold;
  IF p_quantity > v_ipo_remaining THEN
    RETURN json_build_object('success', false, 'error',
      format('Nur noch %s DPC verfügbar.', v_ipo_remaining));
  END IF;

  -- 4. Check user limit
  SELECT COALESCE(SUM(quantity), 0) INTO v_user_purchased
  FROM ipo_purchases WHERE ipo_id = p_ipo_id AND user_id = p_user_id;

  IF v_user_purchased + p_quantity > v_ipo.max_per_user THEN
    RETURN json_build_object('success', false, 'error',
      format('Limit erreicht. Du hast bereits %s/%s DPC gekauft.', v_user_purchased, v_ipo.max_per_user));
  END IF;

  -- 5. Calculate cost
  v_total_cost := v_ipo.price * p_quantity;

  -- 6. Check and deduct wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden.');
  END IF;

  IF v_wallet.balance < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.');
  END IF;

  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  -- 7. Create or update holding
  SELECT * INTO v_holding FROM holdings WHERE user_id = p_user_id AND player_id = v_ipo.player_id FOR UPDATE;
  IF FOUND THEN
    UPDATE holdings SET
      quantity = v_holding.quantity + p_quantity,
      avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost) / (v_holding.quantity + p_quantity),
      updated_at = now()
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
    VALUES (p_user_id, v_ipo.player_id, p_quantity, v_ipo.price);
  END IF;

  -- 8. Update IPO sold count
  UPDATE ipos SET
    sold = sold + p_quantity,
    updated_at = now()
  WHERE id = p_ipo_id;

  -- 9. Update player dpc_available
  UPDATE players SET
    dpc_available = dpc_available - p_quantity,
    last_price = v_ipo.price,
    volume_24h = volume_24h + v_total_cost,
    updated_at = now()
  WHERE id = v_ipo.player_id;

  -- 10. Trade log (seller_id = NULL for IPO)
  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, ipo_id)
  VALUES (v_ipo.player_id, p_user_id, NULL, NULL, NULL, v_ipo.price, p_quantity, 0, p_ipo_id)
  RETURNING id INTO v_trade_id;

  -- 11. IPO purchase log
  INSERT INTO ipo_purchases (ipo_id, user_id, quantity, price)
  VALUES (p_ipo_id, p_user_id, p_quantity, v_ipo.price);

  -- 12. Transaction log
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_user_id, 'ipo_buy', -v_total_cost, v_new_balance, v_trade_id,
    format('IPO: %s DPC für %s Cents/DPC', p_quantity, v_ipo.price));

  -- 13. Auto-end if sold out
  IF v_ipo.sold + p_quantity >= v_ipo.total_offered THEN
    UPDATE ipos SET status = 'ended', updated_at = now() WHERE id = p_ipo_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'total_cost', v_total_cost,
    'new_balance', v_new_balance,
    'quantity', p_quantity,
    'price_per_dpc', v_ipo.price,
    'source', 'ipo',
    'user_total_purchased', v_user_purchased + p_quantity,
    'ipo_remaining', v_ipo.total_offered - v_ipo.sold - p_quantity
  );
END;
$$;

-- ============================================================
-- 8. MODIFY buy_player_dpc — Remove Pool (PATH B)
-- ============================================================

CREATE OR REPLACE FUNCTION buy_player_dpc(
  p_user_id UUID,
  p_player_id UUID,
  p_quantity INT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_holding RECORD;
  v_trade_id UUID;
  v_remaining INT;
  v_seller_balance BIGINT;
  v_platform_fee BIGINT;
BEGIN
  -- PATH A: Buy from cheapest open sell order (skip own orders)
  SELECT * INTO v_order
  FROM orders
  WHERE player_id = p_player_id
    AND side = 'sell'
    AND status IN ('open', 'partial')
    AND user_id != p_user_id
  ORDER BY price ASC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    -- No user orders available (or only own orders)
    RETURN json_build_object('success', false, 'error',
      'Keine Angebote von anderen Usern verfügbar.');
  END IF;

  -- Calculate cost
  v_remaining := v_order.quantity - v_order.filled_qty;
  IF p_quantity > v_remaining THEN
    p_quantity := v_remaining;
  END IF;

  v_total_cost := v_order.price * p_quantity;
  v_platform_fee := GREATEST(v_total_cost / 100, 1); -- 1% fee, min 1 cent

  -- Check buyer wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_wallet.balance < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.');
  END IF;

  -- Deduct buyer
  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  -- Credit seller (minus fee)
  UPDATE wallets SET
    balance = balance + (v_total_cost - v_platform_fee),
    locked_balance = locked_balance - v_total_cost,
    updated_at = now()
  WHERE user_id = v_order.user_id
  RETURNING balance INTO v_seller_balance;

  -- Update order
  UPDATE orders SET
    filled_qty = filled_qty + p_quantity,
    status = CASE WHEN filled_qty + p_quantity >= quantity THEN 'filled' ELSE 'partial' END,
    updated_at = now()
  WHERE id = v_order.id;

  -- Buyer holding
  SELECT * INTO v_holding FROM holdings WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF FOUND THEN
    UPDATE holdings SET
      quantity = v_holding.quantity + p_quantity,
      avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost) / (v_holding.quantity + p_quantity),
      updated_at = now()
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
    VALUES (p_user_id, p_player_id, p_quantity, v_order.price);
  END IF;

  -- Trade log
  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee)
  VALUES (p_player_id, p_user_id, v_order.user_id, NULL, v_order.id, v_order.price, p_quantity, v_platform_fee)
  RETURNING id INTO v_trade_id;

  -- Update player prices
  UPDATE players SET
    last_price = v_order.price,
    floor_price = COALESCE(
      (SELECT MIN(price) FROM orders WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')),
      ipo_price
    ),
    volume_24h = volume_24h + v_total_cost,
    updated_at = now()
  WHERE id = p_player_id;

  -- Transaction logs
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, 'buy', -v_total_cost, v_new_balance, v_trade_id,
     format('%s DPC @ %s Cents (User-Order)', p_quantity, v_order.price)),
    (v_order.user_id, 'sell', v_total_cost - v_platform_fee, v_seller_balance, v_trade_id,
     format('%s DPC @ %s Cents verkauft', p_quantity, v_order.price));

  RETURN json_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'total_cost', v_total_cost,
    'new_balance', v_new_balance,
    'quantity', p_quantity,
    'price_per_dpc', v_order.price,
    'source', 'order'
  );
END;
$$;

COMMIT;
