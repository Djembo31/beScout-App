-- ============================================================
-- BeScout IPO Management RPCs: create_ipo + update_ipo_status
-- Run in Supabase SQL Editor AFTER ipo-system.sql
-- ============================================================

-- ============================================================
-- 1. RPC: create_ipo
-- ============================================================

CREATE OR REPLACE FUNCTION create_ipo(
  p_user_id UUID,
  p_player_id UUID,
  p_price BIGINT,
  p_total_offered INT,
  p_max_per_user INT DEFAULT 50,
  p_duration_days INT DEFAULT 14,
  p_start_immediately BOOLEAN DEFAULT false
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player RECORD;
  v_existing_ipo RECORD;
  v_status TEXT;
  v_starts_at TIMESTAMPTZ;
  v_ends_at TIMESTAMPTZ;
  v_ipo_id UUID;
BEGIN
  -- 1. Validate player exists
  SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.');
  END IF;

  -- 2. No active IPO for this player
  SELECT * INTO v_existing_ipo FROM ipos
  WHERE player_id = p_player_id
    AND status IN ('announced', 'early_access', 'open')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Es gibt bereits eine aktive IPO für diesen Spieler.');
  END IF;

  -- 3. Validate total_offered <= dpc_available
  IF p_total_offered > v_player.dpc_available THEN
    RETURN json_build_object('success', false, 'error',
      format('Nur %s DPC verfügbar (angefordert: %s).', v_player.dpc_available, p_total_offered));
  END IF;

  -- 4. Validate price > 0
  IF p_price <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Preis muss größer als 0 sein.');
  END IF;

  -- 5. Determine status and timestamps
  IF p_start_immediately THEN
    v_status := 'open';
    v_starts_at := now();
  ELSE
    v_status := 'announced';
    v_starts_at := now();
  END IF;

  v_ends_at := v_starts_at + (p_duration_days || ' days')::INTERVAL;

  -- 6. Insert IPO
  INSERT INTO ipos (
    player_id, status, format, price, total_offered, sold,
    max_per_user, starts_at, ends_at, season
  )
  VALUES (
    p_player_id, v_status, 'fixed', p_price, p_total_offered, 0,
    p_max_per_user, v_starts_at, v_ends_at, 1
  )
  RETURNING id INTO v_ipo_id;

  RETURN json_build_object(
    'success', true,
    'ipo_id', v_ipo_id,
    'status', v_status,
    'starts_at', v_starts_at,
    'ends_at', v_ends_at
  );
END;
$$;

-- ============================================================
-- 2. RPC: update_ipo_status
-- ============================================================

CREATE OR REPLACE FUNCTION update_ipo_status(
  p_user_id UUID,
  p_ipo_id UUID,
  p_new_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ipo RECORD;
  v_allowed BOOLEAN := false;
BEGIN
  -- 1. Lock and load IPO
  SELECT * INTO v_ipo FROM ipos WHERE id = p_ipo_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'IPO nicht gefunden.');
  END IF;

  -- 2. Validate state transition
  CASE v_ipo.status
    WHEN 'announced' THEN
      v_allowed := p_new_status IN ('open', 'cancelled');
    WHEN 'early_access' THEN
      v_allowed := p_new_status IN ('open', 'ended', 'cancelled');
    WHEN 'open' THEN
      v_allowed := p_new_status IN ('ended', 'cancelled');
    ELSE
      v_allowed := false;
  END CASE;

  IF NOT v_allowed THEN
    RETURN json_build_object('success', false, 'error',
      format('Ungültiger Statuswechsel: %s → %s', v_ipo.status, p_new_status));
  END IF;

  -- 3. Update status
  UPDATE ipos SET
    status = p_new_status,
    starts_at = CASE WHEN p_new_status = 'open' AND v_ipo.status = 'announced' THEN now() ELSE starts_at END,
    updated_at = now()
  WHERE id = p_ipo_id;

  RETURN json_build_object(
    'success', true,
    'ipo_id', p_ipo_id,
    'new_status', p_new_status
  );
END;
$$;
