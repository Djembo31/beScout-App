-- AR-8 (Operation Beta Ready, Journey #2) — Migration-Drift Backfill fuer 3 IPO-RPCs.
-- Bodies 1:1 aus pg_get_functiondef() dumped am 2026-04-14 via mcp__supabase__execute_sql.
-- NO BEHAVIOR CHANGE — reine Registry-Dokumentation fuer DR / Rollback / neues Env.
-- Analog zu J1-AR-1 (claim_welcome_bonus, record_login_streak, get_auth_state drift).
-- Zero-Price Guards (AR-6) kommen in SEPARATER Migration 20260414161000.

-- =============================================================================
-- 1. buy_from_ipo
-- =============================================================================

CREATE OR REPLACE FUNCTION public.buy_from_ipo(p_user_id uuid, p_ipo_id uuid, p_quantity integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ipo RECORD;
  v_wallet RECORD;
  v_player RECORD;
  v_fee_cfg RECORD;
  v_user_purchased INT;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_holding RECORD;
  v_trade_id UUID;
  v_ipo_remaining INT;
  v_club_share BIGINT;
  v_platform_share BIGINT;
  v_pbt_share BIGINT;
  v_pbt_balance BIGINT;
  v_sub_tier TEXT;
  v_locked BIGINT;
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- ADVISORY LOCK: serialize IPO purchases per user+ipo (prevents concurrent balance race)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_ipo_id::text));

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
    UPDATE ipos SET status = 'ended', updated_at = now() WHERE id = p_ipo_id;
    RETURN json_build_object('success', false, 'error', 'IPO ist beendet.');
  END IF;

  -- 2b. Load player
  SELECT id, club_id, is_liquidated INTO v_player FROM players WHERE id = v_ipo.player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.');
  END IF;

  IF v_player.is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading möglich.');
  END IF;

  -- 2c. Early Access gate
  IF v_ipo.status = 'early_access' THEN
    IF v_player.club_id IS NOT NULL THEN
      SELECT cs.tier INTO v_sub_tier
      FROM club_subscriptions cs
      WHERE cs.user_id = p_user_id
        AND cs.club_id = v_player.club_id
        AND cs.status = 'active'
        AND cs.expires_at > now()
      LIMIT 1;

      IF v_sub_tier IS NULL OR v_sub_tier = 'bronze' THEN
        RETURN json_build_object('success', false, 'error',
          'IPO-Vorkaufsrecht nur für Silber+ Mitglieder. Upgrade dein Club-Abo!');
      END IF;
    END IF;
  END IF;

  -- 3. Check remaining supply
  v_ipo_remaining := v_ipo.total_offered - v_ipo.sold;
  IF p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Menge.');
  END IF;
  IF p_quantity > v_ipo_remaining THEN
    RETURN json_build_object('success', false, 'error',
      format('Nur noch %s SC verfügbar.', v_ipo_remaining));
  END IF;

  -- 4. Check user limit
  SELECT COALESCE(SUM(quantity), 0) INTO v_user_purchased
  FROM ipo_purchases WHERE ipo_id = p_ipo_id AND user_id = p_user_id;

  IF v_user_purchased + p_quantity > v_ipo.max_per_user THEN
    RETURN json_build_object('success', false, 'error',
      format('Limit erreicht. Du hast bereits %s/%s SC gekauft.', v_user_purchased, v_ipo.max_per_user));
  END IF;

  -- 5. Load fee config
  SELECT * INTO v_fee_cfg FROM fee_config
  WHERE club_id = v_player.club_id
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_fee_cfg FROM fee_config
    WHERE club_id IS NULL
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  -- 6. Calculate cost and split
  v_total_cost := v_ipo.price * p_quantity;
  v_club_share := (v_total_cost * COALESCE(v_fee_cfg.ipo_club_bps, 8500)) / 10000;
  v_platform_share := (v_total_cost * COALESCE(v_fee_cfg.ipo_platform_bps, 1000)) / 10000;
  v_pbt_share := v_total_cost - v_club_share - v_platform_share;

  -- 7. Check and deduct buyer wallet
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Wallet nicht gefunden.');
  END IF;

  v_locked := COALESCE(v_wallet.locked_balance, 0);
  IF (v_wallet.balance - v_locked) < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.');
  END IF;

  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  -- 8. Create or update holding
  SELECT * INTO v_holding FROM holdings
  WHERE user_id = p_user_id AND player_id = v_ipo.player_id FOR UPDATE;

  IF FOUND THEN
    UPDATE holdings SET
      quantity = v_holding.quantity + p_quantity,
      avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost)
                      / (v_holding.quantity + p_quantity),
      updated_at = now()
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
    VALUES (p_user_id, v_ipo.player_id, p_quantity, v_ipo.price);
  END IF;

  -- 9. Update IPO sold count
  UPDATE ipos SET sold = sold + p_quantity, updated_at = now() WHERE id = p_ipo_id;

  -- 10. Update player
  UPDATE players SET
    dpc_available = dpc_available - p_quantity,
    last_price = v_ipo.price,
    volume_24h = volume_24h + v_total_cost,
    updated_at = now()
  WHERE id = v_ipo.player_id;

  -- 11. Trade log
  INSERT INTO trades (
    player_id, buyer_id, seller_id, buy_order_id, sell_order_id,
    price, quantity, platform_fee, pbt_fee, club_fee, ipo_id
  )
  VALUES (
    v_ipo.player_id, p_user_id, NULL, NULL, NULL,
    v_ipo.price, p_quantity, v_platform_share, v_pbt_share, v_club_share, p_ipo_id
  )
  RETURNING id INTO v_trade_id;

  -- 12. IPO purchase log
  INSERT INTO ipo_purchases (ipo_id, user_id, quantity, price)
  VALUES (p_ipo_id, p_user_id, p_quantity, v_ipo.price);

  -- 13. Club Treasury
  IF v_club_share > 0 AND v_player.club_id IS NOT NULL THEN
    UPDATE clubs
    SET treasury_balance_cents = treasury_balance_cents + v_club_share
    WHERE id = v_player.club_id;
  END IF;

  -- 14. PBT Treasury
  IF v_pbt_share > 0 THEN
    INSERT INTO pbt_treasury (player_id, balance, ipo_inflow, last_inflow_at)
    VALUES (v_ipo.player_id, v_pbt_share, v_pbt_share, now())
    ON CONFLICT (player_id) DO UPDATE SET
      balance = pbt_treasury.balance + v_pbt_share,
      ipo_inflow = pbt_treasury.ipo_inflow + v_pbt_share,
      last_inflow_at = now(),
      updated_at = now();

    SELECT balance INTO v_pbt_balance FROM pbt_treasury WHERE player_id = v_ipo.player_id;

    INSERT INTO pbt_transactions (player_id, source, amount, balance_after, trade_id, description)
    VALUES (
      v_ipo.player_id, 'ipo', v_pbt_share, v_pbt_balance, v_trade_id,
      format('IPO: %s Cents (5%% von %s Cents)', v_pbt_share, v_total_cost)
    );
  END IF;

  -- 15. Transaction log
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_user_id, 'ipo_buy', -v_total_cost, v_new_balance, v_trade_id,
    format('IPO: %s SC für %s Cents/SC', p_quantity, v_ipo.price));

  -- 16. Auto-end if sold out
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
    'ipo_remaining', v_ipo.total_offered - v_ipo.sold - p_quantity,
    'club_share', v_club_share,
    'platform_share', v_platform_share,
    'pbt_share', v_pbt_share
  );
END;
$function$;

-- =============================================================================
-- 2. create_ipo
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_ipo(p_user_id uuid, p_player_id uuid, p_price bigint, p_total_offered integer, p_max_per_user integer DEFAULT 50, p_duration_days integer DEFAULT 14, p_start_immediately boolean DEFAULT false)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_player RECORD;
  v_existing_ipo RECORD;
  v_status TEXT;
  v_starts_at TIMESTAMPTZ;
  v_ends_at TIMESTAMPTZ;
  v_ipo_id UUID;
  v_total_committed INT;
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;

  -- 1. Validate player exists
  SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.');
  END IF;

  -- Club admin check (player's club)
  IF NOT EXISTS (
    SELECT 1 FROM club_admins
    WHERE user_id = auth.uid() AND club_id = v_player.club_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Keine Admin-Berechtigung für diesen Club.');
  END IF;

  -- 2. No active IPO for this player
  SELECT * INTO v_existing_ipo FROM ipos
  WHERE player_id = p_player_id
    AND status IN ('announced', 'early_access', 'open')
  LIMIT 1;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Es gibt bereits eine aktive IPO für diesen Spieler.');
  END IF;

  -- 3. Check max_supply cap
  v_total_committed := (v_player.dpc_total - v_player.dpc_available) + p_total_offered;
  IF v_total_committed > v_player.max_supply THEN
    RETURN json_build_object('success', false, 'error',
      format('Supply-Cap überschritten. Max: %s, Im Umlauf: %s, Verfügbar für IPO: %s.',
        v_player.max_supply,
        v_player.dpc_total - v_player.dpc_available,
        v_player.max_supply - (v_player.dpc_total - v_player.dpc_available)));
  END IF;

  -- 4. Validate total_offered <= dpc_available
  IF p_total_offered > v_player.dpc_available THEN
    RETURN json_build_object('success', false, 'error',
      format('Nur %s SC verfügbar (angefordert: %s).', v_player.dpc_available, p_total_offered));
  END IF;

  -- 5. Validate price > 0
  IF p_price <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Preis muss größer als 0 sein.');
  END IF;

  -- 6. Determine status and timestamps
  IF p_start_immediately THEN
    v_status := 'open';
    v_starts_at := now();
  ELSE
    v_status := 'announced';
    v_starts_at := now();
  END IF;

  v_ends_at := v_starts_at + (p_duration_days || ' days')::INTERVAL;

  -- 7. Insert IPO
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
$function$;

-- =============================================================================
-- 3. update_ipo_status
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_ipo_status(p_user_id uuid, p_ipo_id uuid, p_new_status text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ipo RECORD;
  v_player_club_id UUID;
  v_allowed BOOLEAN := false;
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;

  -- 1. Lock and load IPO
  SELECT * INTO v_ipo FROM ipos WHERE id = p_ipo_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'IPO nicht gefunden.');
  END IF;

  -- Club admin check (IPO's player's club)
  SELECT club_id INTO v_player_club_id FROM players WHERE id = v_ipo.player_id;
  IF NOT EXISTS (
    SELECT 1 FROM club_admins
    WHERE user_id = auth.uid() AND club_id = v_player_club_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Keine Admin-Berechtigung für diesen Club.');
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
$function$;
