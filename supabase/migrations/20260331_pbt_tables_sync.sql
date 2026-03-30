-- ============================================
-- PBT Tables Sync (documentation migration)
-- These tables already exist in production.
-- This migration ensures they are tracked in the local migration history.
-- ============================================

-- 1. PBT Treasury (per-player balance)
CREATE TABLE IF NOT EXISTS public.pbt_treasury (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  trading_inflow BIGINT NOT NULL DEFAULT 0,
  ipo_inflow BIGINT NOT NULL DEFAULT 0,
  votes_inflow BIGINT NOT NULL DEFAULT 0,
  content_inflow BIGINT NOT NULL DEFAULT 0,
  last_inflow_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PBT Transactions (audit log)
CREATE TABLE IF NOT EXISTS public.pbt_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('trading', 'ipo', 'votes', 'content', 'liquidation')),
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  trade_id UUID REFERENCES trades(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pbt_transactions_player_created
  ON pbt_transactions (player_id, created_at DESC);

-- 3. Fee Config (global + per-club overrides)
CREATE TABLE IF NOT EXISTS public.fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name TEXT,
  club_id UUID REFERENCES clubs(id),
  trade_fee_bps INT NOT NULL DEFAULT 600,
  trade_platform_bps INT NOT NULL DEFAULT 350,
  trade_pbt_bps INT NOT NULL DEFAULT 150,
  trade_club_bps INT NOT NULL DEFAULT 100,
  ipo_club_bps INT NOT NULL DEFAULT 8500,
  ipo_platform_bps INT NOT NULL DEFAULT 1000,
  ipo_pbt_bps INT NOT NULL DEFAULT 500,
  abo_discount_bronze_bps INT NOT NULL DEFAULT 50,
  abo_discount_silber_bps INT NOT NULL DEFAULT 100,
  abo_discount_gold_bps INT NOT NULL DEFAULT 150,
  offer_platform_bps INT NOT NULL DEFAULT 200,
  offer_pbt_bps INT NOT NULL DEFAULT 50,
  offer_club_bps INT NOT NULL DEFAULT 50,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS (idempotent)
ALTER TABLE pbt_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pbt_treasury' AND policyname = 'pbt_treasury_select') THEN
    CREATE POLICY pbt_treasury_select ON pbt_treasury FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pbt_transactions' AND policyname = 'pbt_transactions_select') THEN
    CREATE POLICY pbt_transactions_select ON pbt_transactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_config' AND policyname = 'fee_config_select') THEN
    CREATE POLICY fee_config_select ON fee_config FOR SELECT USING (true);
  END IF;
END $$;

-- 5. credit_pbt() function (idempotent)
CREATE OR REPLACE FUNCTION public.credit_pbt(
  p_player_id UUID,
  p_amount BIGINT,
  p_source TEXT,
  p_trade_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_new_balance BIGINT;
BEGIN
  IF p_amount <= 0 THEN RETURN 0; END IF;

  INSERT INTO pbt_treasury (player_id, balance, trading_inflow, ipo_inflow, last_inflow_at)
  VALUES (
    p_player_id, p_amount,
    CASE WHEN p_source = 'trading' THEN p_amount ELSE 0 END,
    CASE WHEN p_source = 'ipo' THEN p_amount ELSE 0 END,
    now()
  )
  ON CONFLICT (player_id) DO UPDATE SET
    balance = pbt_treasury.balance + p_amount,
    trading_inflow = pbt_treasury.trading_inflow + CASE WHEN p_source = 'trading' THEN p_amount ELSE 0 END,
    ipo_inflow = pbt_treasury.ipo_inflow + CASE WHEN p_source = 'ipo' THEN p_amount ELSE 0 END,
    last_inflow_at = now(),
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO pbt_transactions (player_id, source, amount, balance_after, trade_id, description)
  VALUES (p_player_id, p_source, p_amount, v_new_balance, p_trade_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- 6. Seed default fee config if missing
INSERT INTO fee_config (club_name, trade_fee_bps, trade_platform_bps, trade_pbt_bps, trade_club_bps, ipo_club_bps, ipo_platform_bps, ipo_pbt_bps)
SELECT NULL, 600, 350, 150, 100, 8500, 1000, 500
WHERE NOT EXISTS (SELECT 1 FROM fee_config WHERE club_name IS NULL AND club_id IS NULL);
