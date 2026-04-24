-- =============================================================================
-- Slice 178a (Tier A1) — buy_player_sc Idempotency-Integration
--
-- Baseline source-of-truth: 20260417160000_buy_player_sc_transactions_type_fix.sql
-- (Slice 034). Keine Patches zwischen 034 und 178a — 1:1-Body-Kopie + Idempotency-Layer.
--
-- Context:
--   Money-Defense-in-Depth. Schliesst den Loop, den Slice 151c.2 fuer
--   subscribe_to_club inline etabliert hat — jetzt via wiederverwendbares
--   Primitive aus Slice 178 (request_dedup_keys + check_or_reserve_dedup_key).
--
-- Signatur-Erweiterung:
--   Alter:  buy_player_sc(p_user_id UUID, p_player_id UUID, p_quantity INT)
--   Neu:    buy_player_sc(p_user_id UUID, p_player_id UUID, p_quantity INT,
--                         p_idempotency_key TEXT DEFAULT NULL)
--
-- Backward-Compat:
--   DEFAULT NULL → bestehende Caller ohne Key funktionieren unveraendert.
--   NULL-Key = kein dedup-check, direkter Pfad wie vor 178a.
--
-- Idempotency-Flow (wenn Key gesetzt):
--   1. Nach auth-guard + quantity-validation: check_or_reserve_dedup_key().
--   2. Wenn existing completed-response vorhanden: return cached response,
--      kein wallet-deduct, kein Trade.
--   3. Wenn neu reserviert: normaler Flow bis RETURN, + UPDATE
--      request_dedup_keys SET response=<result>, status='completed' vor RETURN.
--
-- Preserved Guards (1:1 aus Slice 034 Baseline):
--   - auth.uid() mismatch exception
--   - quantity null / <1 / >300 guards
--   - player not found + is_liquidated checks
--   - is_club_admin_for_player restriction
--   - pg_advisory_xact_lock (user+player hash)
--   - 24h trade-count limit mit tier-multiplier
--   - fee_config lookup (club-specific + global fallback)
--   - abo-discount (gold 150bps, silber 100bps, bronze 50bps)
--   - circular-trade detection (>= 2 opposite trades in 7 days)
--   - wallet FOR UPDATE + available-balance check (locked-aware)
--   - holdings update seller + buyer (avg_buy_price recalc)
--   - trades row INSERT with all fees
--   - credit_pbt (unified PBT treasury credit)
--   - club fee → clubs.treasury_balance_cents
--   - players.last_price + volume_24h update
--   - recalc_floor_price side-effect
--   - transactions.type = 'trade_buy' / 'trade_sell' (Slice 034 fix)
--
-- Verify nach Apply:
--   SELECT proname, pronargs FROM pg_proc WHERE proname = 'buy_player_sc';
--   -- Expected: pronargs = 4
--
--   \df+ public.buy_player_sc
--   -- Expected signature: uuid, uuid, integer, text DEFAULT NULL
-- =============================================================================

CREATE OR REPLACE FUNCTION public.buy_player_sc(
  p_user_id uuid,
  p_player_id uuid,
  p_quantity integer,
  p_idempotency_key text DEFAULT NULL
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  v_order RECORD; v_wallet RECORD; v_player RECORD; v_fee_cfg RECORD;
  v_total_cost BIGINT; v_new_balance BIGINT; v_holding RECORD; v_trade_id UUID;
  v_remaining INT; v_seller_balance BIGINT; v_total_fee BIGINT; v_platform_fee BIGINT;
  v_pbt_fee BIGINT; v_club_fee BIGINT; v_seller_proceeds BIGINT;
  v_buyer_sub RECORD; v_effective_fee_bps INT; v_discount_bps INT; v_locked BIGINT;
  v_recent_trades INT; v_circular_count INT;
  v_result JSON;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'invalidQuantity');
  END IF;
  IF p_quantity > 300 THEN
    RETURN json_build_object('success', false, 'error', 'maxQuantityExceeded');
  END IF;

  -- Slice 178a: Idempotency-Check (nur wenn Key gesetzt).
  -- Call passiert NACH auth-guard + cheap-validation, aber VOR jeder DB-write.
  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);

    IF NOT v_dedup_new THEN
      -- Replay: cached response or still-pending (NULL). Return cached as-is.
      -- Client muss NULL-case handlen (pending in-flight retry).
      IF v_dedup_cached IS NULL THEN
        RETURN json_build_object(
          'success', false,
          'error', 'idempotency_pending',
          'idempotent_replay', true
        );
      END IF;
      RETURN v_dedup_cached::JSON;
    END IF;
  END IF;

  SELECT id, club_id, first_name, last_name, ipo_price, is_liquidated INTO v_player FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden'); END IF;
  IF v_player.is_liquidated THEN RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert.'); END IF;
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN RETURN json_build_object('success', false, 'error', 'Club-Admin Restriction'); END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_player_id::text));

  SELECT COUNT(*) INTO v_recent_trades FROM trades WHERE (buyer_id = p_user_id OR seller_id = p_user_id) AND player_id = p_player_id AND executed_at > now() - INTERVAL '24 hours';
  IF v_recent_trades >= COALESCE((SELECT CASE tier WHEN 'gold' THEN 200 WHEN 'silber' THEN 50 WHEN 'bronze' THEN 30 ELSE 20 END FROM club_subscriptions WHERE user_id = p_user_id AND status = 'active' AND expires_at > now() ORDER BY CASE tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1), 20) THEN RETURN json_build_object('success', false, 'error', 'Max 20 Trades/24h'); END IF;

  SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id = v_player.club_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL ORDER BY created_at DESC LIMIT 1; END IF;

  v_discount_bps := 0;
  SELECT tier INTO v_buyer_sub FROM club_subscriptions WHERE user_id = p_user_id AND club_id = v_player.club_id AND status = 'active' AND expires_at > now() LIMIT 1;
  IF FOUND THEN
    IF v_buyer_sub.tier = 'gold' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_gold_bps, 150);
    ELSIF v_buyer_sub.tier = 'silber' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_silber_bps, 100);
    ELSIF v_buyer_sub.tier = 'bronze' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_bronze_bps, 50); END IF;
  END IF;
  v_effective_fee_bps := GREATEST(0, COALESCE(v_fee_cfg.trade_fee_bps, 600) - v_discount_bps);

  SELECT * INTO v_order FROM orders WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial') AND user_id != p_user_id ORDER BY price ASC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Keine Angebote von anderen Usern verfuegbar.'); END IF;

  SELECT COUNT(*) INTO v_circular_count FROM trades WHERE seller_id = p_user_id AND buyer_id = v_order.user_id AND player_id = p_player_id AND executed_at > now() - INTERVAL '7 days';
  IF v_circular_count >= 2 THEN RETURN json_build_object('success', false, 'error', 'Verdaechtiges Handelsmuster.'); END IF;

  v_remaining := v_order.quantity - v_order.filled_qty;
  IF p_quantity > v_remaining THEN p_quantity := v_remaining; END IF;
  v_total_cost := v_order.price * p_quantity;

  v_total_fee := (v_total_cost * v_effective_fee_bps) / 10000;
  IF v_total_fee < 1 AND v_total_cost > 0 THEN v_total_fee := 1; END IF;
  IF v_effective_fee_bps > 0 THEN
    v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_pbt_bps, 150)) / 10000;
    v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_club_bps, 100)) / 10000;
    v_platform_fee := GREATEST(0, v_total_fee - v_pbt_fee - v_club_fee);
  ELSE v_platform_fee := 0; v_pbt_fee := 0; v_club_fee := 0; v_total_fee := 0; END IF;
  v_seller_proceeds := v_total_cost - v_total_fee;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  v_locked := COALESCE(v_wallet.locked_balance, 0);
  IF NOT FOUND OR (v_wallet.balance - v_locked) < v_total_cost THEN RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.'); END IF;

  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;
  UPDATE wallets SET balance = balance + v_seller_proceeds, updated_at = now() WHERE user_id = v_order.user_id RETURNING balance INTO v_seller_balance;
  UPDATE holdings SET quantity = quantity - p_quantity, updated_at = now() WHERE user_id = v_order.user_id AND player_id = p_player_id;
  UPDATE orders SET filled_qty = filled_qty + p_quantity, status = CASE WHEN filled_qty + p_quantity >= quantity THEN 'filled' ELSE 'partial' END WHERE id = v_order.id;

  SELECT * INTO v_holding FROM holdings WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF FOUND THEN
    UPDATE holdings SET quantity = v_holding.quantity + p_quantity, avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost) / (v_holding.quantity + p_quantity), updated_at = now() WHERE id = v_holding.id;
  ELSE INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price) VALUES (p_user_id, p_player_id, p_quantity, v_order.price); END IF;

  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (p_player_id, p_user_id, v_order.user_id, NULL, v_order.id, v_order.price, p_quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  -- PBT Treasury credit (unified — uses credit_pbt() instead of inline INSERT)
  PERFORM credit_pbt(p_player_id, v_pbt_fee, 'trading', v_trade_id,
    format('Trade Fee: %sx %s %s', p_quantity, v_player.first_name, v_player.last_name));

  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN UPDATE clubs SET treasury_balance_cents = treasury_balance_cents + v_club_fee WHERE id = v_player.club_id; END IF;

  UPDATE players SET last_price = v_order.price, volume_24h = volume_24h + v_total_cost, updated_at = now() WHERE id = p_player_id;
  PERFORM recalc_floor_price(p_player_id);

  -- Slice 034: 'buy'/'sell' → 'trade_buy'/'trade_sell' (CHECK constraint compliance, analog buy_from_order)
  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description) VALUES
    (p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
     'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
    (v_order.user_id, 'trade_sell', v_seller_proceeds, v_seller_balance, v_trade_id,
     'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  v_result := json_build_object('success', true, 'trade_id', v_trade_id, 'total_cost', v_total_cost, 'new_balance', v_new_balance, 'quantity', p_quantity, 'price_per_dpc', v_order.price, 'source', 'order', 'order_id', v_order.id, 'seller_id', v_order.user_id, 'platform_fee', v_platform_fee, 'pbt_fee', v_pbt_fee, 'club_fee', v_club_fee, 'fee_discount_bps', v_discount_bps, 'effective_fee_bps', v_effective_fee_bps);

  -- Slice 178a: Persist response for idempotent replay.
  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result::JSONB, status = 'completed'
    WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

-- AR-44: REVOKE/GRANT pairing for SECURITY DEFINER functions
-- (CREATE OR REPLACE resettet Privilegien auf Default → explicit renew)
REVOKE EXECUTE ON FUNCTION public.buy_player_sc(uuid, uuid, integer, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.buy_player_sc(uuid, uuid, integer, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.buy_player_sc(uuid, uuid, integer, text) TO authenticated;

-- Drop alte 3-arg Signatur falls sie noch existiert (war vor 178a). Neuer DEFAULT-NULL
-- Parameter macht 3-arg-Call weiterhin moeglich via omitted parameter — aber wir
-- wollen keine Signatur-Ambiguitaet in pg_proc.
DROP FUNCTION IF EXISTS public.buy_player_sc(uuid, uuid, integer);

COMMENT ON FUNCTION public.buy_player_sc(uuid, uuid, integer, text)
IS 'Slice 178a (2026-04-24): Trading buy-from-sell-order RPC with optional idempotency_key. '
   'Baseline: Slice 034 (transactions.type trade_buy/trade_sell). '
   'Idempotency via Slice 178 infrastructure (request_dedup_keys + check_or_reserve_dedup_key, 300s TTL).';
