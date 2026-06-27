-- Slice 407 — P2P-Offer-Fee auf 6% (= Markt) angleichen [Welle 1.4a, D112]
--
-- CEO-approved Fee-Änderung (Anil 2026-06-27): P2P = 6% wie Orderbuch, gleicher Split
-- 3,5% Platform + 1,5% PBT + 1% Club. Vorher 3% (2/0,5/0,5) → unterlief den Markt.
--
-- (1) fee_config-Daten auf 350/150/100. (2) accept_offer COALESCE-Defaults gleich
--     mitziehen (deckt künftige NULL-offer_*-Rows ab). Body 1:1 aus Live-functiondef
--     (Stand Slice 406), NUR die 3 COALESCE-Konstanten geändert (PATCH-AUDIT S156).

-- (1) Daten
UPDATE public.fee_config
SET offer_platform_bps = 350,
    offer_pbt_bps      = 150,
    offer_club_bps     = 100;

-- (2) accept_offer — COALESCE-Defaults 200/50/50 -> 350/150/100
CREATE OR REPLACE FUNCTION public.accept_offer(p_user_id uuid, p_offer_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_offer offers%ROWTYPE;
  v_sender_wallet wallets%ROWTYPE;
  v_receiver_wallet wallets%ROWTYPE;
  v_player players%ROWTYPE;
  v_fee_cfg RECORD;
  v_total_cost BIGINT;
  v_platform_fee BIGINT;
  v_pbt_fee BIGINT;
  v_club_fee BIGINT;
  v_total_fee BIGINT;
  v_seller_net BIGINT;
  v_buyer_id UUID;
  v_seller_id UUID;
  v_buyer_new_balance BIGINT;
  v_seller_new_balance BIGINT;
  v_trade_id UUID;
  v_pbt_balance BIGINT;
  v_recent_trades INT;
  v_circular_count INT;
  v_seller_qty INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Angebot nicht gefunden');
  END IF;

  IF v_offer.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Angebot nicht mehr verfuegbar');
  END IF;

  IF v_offer.expires_at IS NOT NULL AND v_offer.expires_at < now() THEN
    UPDATE offers SET status = 'expired', updated_at = now() WHERE id = p_offer_id;
    IF v_offer.side = 'buy' THEN
      UPDATE wallets SET locked_balance = GREATEST(0, locked_balance - (v_offer.price * v_offer.quantity)), updated_at = now()
      WHERE user_id = v_offer.sender_id;
    END IF;
    RETURN jsonb_build_object('success', false, 'error', 'Angebot abgelaufen');
  END IF;

  IF v_offer.sender_id = p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Eigenes Angebot kann nicht angenommen werden');
  END IF;

  IF v_offer.side = 'buy' THEN
    v_buyer_id := v_offer.sender_id;
    v_seller_id := p_user_id;
  ELSE
    v_buyer_id := p_user_id;
    v_seller_id := v_offer.sender_id;
  END IF;

  SELECT * INTO v_player FROM players WHERE id = v_offer.player_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;

  IF v_player.is_liquidated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading moeglich.');
  END IF;

  IF is_club_admin_for_player(v_buyer_id, v_offer.player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Admins duerfen keine SCs ihres eigenen Clubs handeln.');
  END IF;
  IF is_club_admin_for_player(v_seller_id, v_offer.player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Admins duerfen keine SCs ihres eigenen Clubs handeln.');
  END IF;

  SELECT quantity INTO v_seller_qty
  FROM holdings
  WHERE user_id = v_seller_id AND player_id = v_offer.player_id
  FOR UPDATE;

  IF COALESCE(v_seller_qty, 0) < v_offer.quantity THEN
    IF v_offer.side = 'buy' THEN
      UPDATE wallets SET locked_balance = GREATEST(0, locked_balance - (v_offer.price * v_offer.quantity)), updated_at = now()
      WHERE user_id = v_offer.sender_id;
    END IF;
    UPDATE offers SET status = 'cancelled', updated_at = now() WHERE id = p_offer_id;
    RETURN jsonb_build_object('success', false, 'error', 'Verkaeufer hat nicht genug SCs');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_buyer_id::text || v_offer.player_id::text));

  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = v_buyer_id OR seller_id = v_buyer_id)
    AND player_id = v_offer.player_id
    AND executed_at > now() - INTERVAL '24 hours';

  IF v_recent_trades >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Taegliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;

  SELECT COUNT(*) INTO v_circular_count
  FROM trades
  WHERE seller_id = v_buyer_id
    AND buyer_id = v_seller_id
    AND player_id = v_offer.player_id
    AND executed_at > now() - INTERVAL '7 days';

  IF v_circular_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Verdaechtiges Handelsmuster erkannt. Handel mit demselben Partner innerhalb von 7 Tagen nicht erlaubt.');
  END IF;

  SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id = v_player.club_id
  ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_total_cost := v_offer.price * v_offer.quantity;
  v_platform_fee := (v_total_cost * COALESCE(v_fee_cfg.offer_platform_bps, 350)) / 10000;
  v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.offer_pbt_bps, 150)) / 10000;
  v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.offer_club_bps, 100)) / 10000;
  v_total_fee := v_platform_fee + v_pbt_fee + v_club_fee;
  v_seller_net := v_total_cost - v_total_fee;

  SELECT * INTO v_sender_wallet FROM wallets WHERE user_id = v_buyer_id FOR UPDATE;
  SELECT * INTO v_receiver_wallet FROM wallets WHERE user_id = v_seller_id FOR UPDATE;

  IF v_offer.side = 'buy' THEN
    UPDATE wallets SET
      balance = balance - v_total_cost,
      locked_balance = GREATEST(0, locked_balance - v_total_cost),
      updated_at = now()
    WHERE user_id = v_buyer_id
    RETURNING balance INTO v_buyer_new_balance;
  ELSE
    IF (v_sender_wallet.balance - COALESCE(v_sender_wallet.locked_balance, 0)) < v_total_cost THEN
      RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD');
    END IF;
    UPDATE wallets SET balance = balance - v_total_cost, updated_at = now()
    WHERE user_id = v_buyer_id
    RETURNING balance INTO v_buyer_new_balance;
  END IF;

  UPDATE wallets SET balance = balance + v_seller_net, updated_at = now()
  WHERE user_id = v_seller_id
  RETURNING balance INTO v_seller_new_balance;

  UPDATE holdings SET quantity = quantity - v_offer.quantity, updated_at = now()
  WHERE user_id = v_seller_id AND player_id = v_offer.player_id;

  INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price)
  VALUES (v_buyer_id, v_offer.player_id, v_offer.quantity, v_offer.price)
  ON CONFLICT (user_id, player_id) DO UPDATE SET
    quantity = holdings.quantity + v_offer.quantity,
    avg_buy_price = CASE
      WHEN holdings.quantity = 0 THEN v_offer.price
      ELSE ((holdings.avg_buy_price * holdings.quantity) + (v_offer.price * v_offer.quantity))
        / (holdings.quantity + v_offer.quantity)
    END,
    updated_at = now();

  INSERT INTO trades (buyer_id, seller_id, player_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (v_buyer_id, v_seller_id, v_offer.player_id, v_offer.price, v_offer.quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  IF v_pbt_fee > 0 THEN
    INSERT INTO pbt_treasury (player_id, balance, trading_inflow, last_inflow_at)
    VALUES (v_offer.player_id, v_pbt_fee, v_pbt_fee, now())
    ON CONFLICT (player_id) DO UPDATE SET
      balance = pbt_treasury.balance + v_pbt_fee,
      trading_inflow = pbt_treasury.trading_inflow + v_pbt_fee,
      last_inflow_at = now(), updated_at = now();

    SELECT balance INTO v_pbt_balance FROM pbt_treasury WHERE player_id = v_offer.player_id;
    INSERT INTO pbt_transactions (player_id, source, amount, balance_after, trade_id, description)
    VALUES (v_offer.player_id, 'trading', v_pbt_fee, v_pbt_balance, v_trade_id,
            format('Offer Fee: %s Cents (PBT-Anteil)', v_pbt_fee));
  END IF;

  -- [Slice 406] Counter-Write clubs.treasury_balance_cents entfernt (write-only Orphan);
  -- Club-Anteil wird kanonisch via Trigger trg_trades_book_club_treasury (trades-INSERT oben) gebucht.

  -- E3-2 (Slice 358): Plattform-Fee in den BeScout-Topf — voller Auffang (D96/D97)
  IF v_platform_fee > 0 THEN
    PERFORM book_platform_treasury('credit', 'p2p', v_platform_fee, v_trade_id, 'P2P-Angebots-Fee');
  END IF;

  UPDATE players SET
    last_price = v_offer.price,
    volume_24h = COALESCE(volume_24h, 0) + v_total_cost,
    floor_price = COALESCE(
      (SELECT MIN(price) FROM orders
       WHERE player_id = v_offer.player_id AND side = 'sell' AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      ipo_price),
    updated_at = now()
  WHERE id = v_offer.player_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    v_buyer_id,
    CASE WHEN v_offer.side = 'buy' THEN 'offer_execute' ELSE 'offer_buy' END,
    -v_total_cost,
    v_buyer_new_balance,
    v_trade_id,
    'SC-Kauf via Angebot: ' || v_player.first_name || ' ' || v_player.last_name
  );

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    v_seller_id,
    'offer_sell',
    v_seller_net,
    v_seller_new_balance,
    v_trade_id,
    'SC-Verkauf via Angebot: ' || v_player.first_name || ' ' || v_player.last_name
  );

  UPDATE offers SET
    status = 'accepted',
    receiver_id = p_user_id,
    updated_at = now()
  WHERE id = p_offer_id;

  PERFORM update_mission_progress(v_buyer_id, 'daily_trade', 1);
  PERFORM update_mission_progress(v_seller_id, 'daily_trade', 1);

  RETURN jsonb_build_object(
    'success', true,
    'trade_id', v_trade_id,
    'trade_price', v_offer.price,
    'buyer_new_balance', v_buyer_new_balance,
    'seller_net', v_seller_net,
    'platform_fee', v_platform_fee,
    'pbt_fee', v_pbt_fee,
    'club_fee', v_club_fee
  );
END;
$function$;
