-- =============================================================================
-- Wild Cards — Phase 2 of SC Blocking
-- Tables: user_wildcards, wildcard_transactions
-- Column: lineups.wildcard_slots (tracks which slots used a wild card)
-- =============================================================================

-- 1. User Wild Card Balance
CREATE TABLE IF NOT EXISTS user_wildcards (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  earned_total INT NOT NULL DEFAULT 0,
  spent_total INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_wildcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own wildcard balance"
  ON user_wildcards FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Wild Card Transaction Log
CREATE TABLE IF NOT EXISTS wildcard_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'mystery_box', 'mission', 'event_reward', 'daily_quest',
    'milestone', 'event_refund', 'admin_grant', 'lineup_spend'
  )),
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE wildcard_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own wildcard transactions"
  ON wildcard_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_wildcard_tx_user ON wildcard_transactions(user_id, created_at DESC);

-- 3. Lineups: track which slots used a wild card
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS wildcard_slots TEXT[] NOT NULL DEFAULT '{}';

-- 4. RPC: Get wild card balance (auto-init if missing)
CREATE OR REPLACE FUNCTION get_wildcard_balance(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_balance INT;
BEGIN
  SELECT balance INTO v_balance FROM user_wildcards WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    INSERT INTO user_wildcards (user_id, balance, earned_total, spent_total)
    VALUES (p_user_id, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 0;
  END IF;
  RETURN v_balance;
END;
$$;

-- 5. RPC: Earn wild cards (credits balance)
CREATE OR REPLACE FUNCTION earn_wildcards(
  p_user_id UUID,
  p_amount INT,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_balance INT;
BEGIN
  -- Upsert user_wildcards
  INSERT INTO user_wildcards (user_id, balance, earned_total, spent_total)
  VALUES (p_user_id, p_amount, p_amount, 0)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = user_wildcards.balance + p_amount,
    earned_total = user_wildcards.earned_total + p_amount,
    updated_at = now();

  SELECT balance INTO v_new_balance FROM user_wildcards WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_user_id, p_amount, v_new_balance, p_source, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- 6. RPC: Spend wild cards (debits balance)
CREATE OR REPLACE FUNCTION spend_wildcards(
  p_user_id UUID,
  p_amount INT,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current INT;
  v_new_balance INT;
BEGIN
  SELECT balance INTO v_current FROM user_wildcards WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_current < p_amount THEN
    RAISE EXCEPTION 'insufficient_wildcards';
  END IF;

  UPDATE user_wildcards SET
    balance = balance - p_amount,
    spent_total = spent_total + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;

  v_new_balance := v_current - p_amount;

  INSERT INTO wildcard_transactions (user_id, amount, balance_after, source, reference_id, description)
  VALUES (p_user_id, -p_amount, v_new_balance, p_source, p_reference_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- 7. Refund wild cards on event leave (called from unlock_event_entry)
CREATE OR REPLACE FUNCTION refund_wildcards_on_leave(p_user_id UUID, p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_wc_count INT;
BEGIN
  -- Count wild card slots from lineup
  SELECT COALESCE(array_length(wildcard_slots, 1), 0)
  INTO v_wc_count
  FROM lineups
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_wc_count > 0 THEN
    PERFORM earn_wildcards(p_user_id, v_wc_count, 'event_refund', p_event_id, 'Refund on event leave');
  END IF;
END;
$$;

-- 8. Admin grant RPC (for testing + manual grants)
CREATE OR REPLACE FUNCTION admin_grant_wildcards(
  p_admin_id UUID,
  p_target_user_id UUID,
  p_amount INT,
  p_description TEXT DEFAULT 'Admin grant'
)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT top_role INTO v_role FROM profiles WHERE id = p_admin_id;
  IF v_role IS DISTINCT FROM 'Admin' THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN earn_wildcards(p_target_user_id, p_amount, 'admin_grant', NULL, p_description);
END;
$$;

-- Revoke direct access, use RPCs only
REVOKE ALL ON user_wildcards FROM PUBLIC, authenticated, anon;
REVOKE ALL ON wildcard_transactions FROM PUBLIC, authenticated, anon;

-- Grant SELECT for RLS policies
GRANT SELECT ON user_wildcards TO authenticated;
GRANT SELECT ON wildcard_transactions TO authenticated;
