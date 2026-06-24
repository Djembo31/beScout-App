-- Slice 360 (E3-2b, D96/D98): IPO-Plattform-Fee REIN in den BeScout-Topf.
-- Additiver Inline-Booking-Block (1:1 gespiegelt aus buy_player_sc/358), sonst exakter Live-Body.
-- 'ipo' ist im platform_treasury_ledger_source_check bereits erlaubt -> keine CHECK-Migration.
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
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_ipo_id::text));

  SELECT * INTO v_ipo FROM ipos WHERE id = p_ipo_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'IPO nicht gefunden.');
  END IF;

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

  -- AR-6: Zero-Price Exploit-Guard.
  IF v_ipo.price IS NULL OR v_ipo.price <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'ipo_misconfigured');
  END IF;

  SELECT id, club_id, is_liquidated INTO v_player FROM players WHERE id = v_ipo.player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.');
  END IF;

  IF v_player.is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading möglich.');
  END IF;

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

  v_ipo_remaining := v_ipo.total_offered - v_ipo.sold;
  IF p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Menge.');
  END IF;
  IF p_quantity > v_ipo_remaining THEN
    RETURN json_build_object('success', false, 'error',
      format('Nur noch %s SC verfügbar.', v_ipo_remaining));
  END IF;

  SELECT COALESCE(SUM(quantity), 0) INTO v_user_purchased
  FROM ipo_purchases WHERE ipo_id = p_ipo_id AND user_id = p_user_id;

  IF v_user_purchased + p_quantity > v_ipo.max_per_user THEN
    RETURN json_build_object('success', false, 'error',
      format('Limit erreicht. Du hast bereits %s/%s SC gekauft.', v_user_purchased, v_ipo.max_per_user));
  END IF;

  SELECT * INTO v_fee_cfg FROM fee_config
  WHERE club_id = v_player.club_id
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_fee_cfg FROM fee_config
    WHERE club_id IS NULL
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_total_cost := v_ipo.price * p_quantity;
  v_club_share := (v_total_cost * COALESCE(v_fee_cfg.ipo_club_bps, 8500)) / 10000;
  v_platform_share := (v_total_cost * COALESCE(v_fee_cfg.ipo_platform_bps, 1000)) / 10000;
  v_pbt_share := v_total_cost - v_club_share - v_platform_share;

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

  UPDATE ipos SET sold = sold + p_quantity, updated_at = now() WHERE id = p_ipo_id;

  UPDATE players SET
    dpc_available = dpc_available - p_quantity,
    last_price = v_ipo.price,
    volume_24h = volume_24h + v_total_cost,
    updated_at = now()
  WHERE id = v_ipo.player_id;

  INSERT INTO trades (
    player_id, buyer_id, seller_id, buy_order_id, sell_order_id,
    price, quantity, platform_fee, pbt_fee, club_fee, ipo_id
  )
  VALUES (
    v_ipo.player_id, p_user_id, NULL, NULL, NULL,
    v_ipo.price, p_quantity, v_platform_share, v_pbt_share, v_club_share, p_ipo_id
  )
  RETURNING id INTO v_trade_id;

  INSERT INTO ipo_purchases (ipo_id, user_id, quantity, price)
  VALUES (p_ipo_id, p_user_id, p_quantity, v_ipo.price);

  IF v_club_share > 0 AND v_player.club_id IS NOT NULL THEN
    UPDATE clubs
    SET treasury_balance_cents = treasury_balance_cents + v_club_share
    WHERE id = v_player.club_id;
  END IF;

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

  -- E3-2b (Slice 360): IPO-Plattform-Fee in den BeScout-Topf — voller Auffang (D96/D98)
  IF v_platform_share > 0 THEN
    PERFORM book_platform_treasury('credit', 'ipo', v_platform_share, v_trade_id, 'IPO-Fee (Erstverkauf)');
  END IF;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_user_id, 'ipo_buy', -v_total_cost, v_new_balance, v_trade_id,
    format('IPO: %s SC für %s Cents/SC', p_quantity, v_ipo.price));

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
