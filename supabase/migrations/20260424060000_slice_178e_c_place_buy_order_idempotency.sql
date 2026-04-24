-- =============================================================================
-- Slice 178e-c — place_buy_order Idempotency-Integration (Tier A1, Money)
--
-- Baseline: live pg_get_functiondef.
-- RPC lockt Funds in escrow (locked_balance). Retry ohne Idempotency wuerde
-- 2× lock + 2× order erzeugen → Wallet-available-leak.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.place_buy_order(
  p_user_id uuid,
  p_player_id uuid,
  p_quantity integer,
  p_max_price bigint,
  p_idempotency_key text DEFAULT NULL
)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  v_wallet RECORD;
  v_total_cost BIGINT;
  v_order_id UUID;
  v_is_liquidated BOOLEAN;
  v_recent_orders INT;
  v_recent_trades INT;
  v_result JSONB;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht berechtigt');
  END IF;

  IF p_quantity IS NULL OR p_quantity < 1 OR p_quantity > 300 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungueltige Menge (1-300)');
  END IF;
  IF p_max_price IS NULL OR p_max_price < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungueltiger Preis');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);

    IF NOT v_dedup_new THEN
      IF v_dedup_cached IS NULL THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'idempotency_pending',
          'idempotent_replay', true
        );
      END IF;
      RETURN v_dedup_cached;
    END IF;
  END IF;

  SELECT is_liquidated INTO v_is_liquidated FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;
  IF v_is_liquidated THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spieler ist liquidiert');
  END IF;

  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Club-Admins duerfen keine SCs ihres eigenen Clubs handeln');
  END IF;

  SELECT COUNT(*) INTO v_recent_orders
  FROM orders
  WHERE user_id = p_user_id AND player_id = p_player_id AND side = 'buy'
    AND created_at > NOW() - INTERVAL '1 hour';
  IF v_recent_orders >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Max 10 Kaufgebote pro Spieler pro Stunde');
  END IF;

  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND player_id = p_player_id
    AND executed_at > NOW() - INTERVAL '24 hours';
  IF v_recent_trades >= 20 THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Taegliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;

  v_total_cost := p_quantity * p_max_price;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || 'buy_order'));

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet nicht gefunden');
  END IF;

  IF (v_wallet.balance - COALESCE(v_wallet.locked_balance, 0)) < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug verfuegbares Guthaben');
  END IF;

  UPDATE wallets
  SET locked_balance = COALESCE(locked_balance, 0) + v_total_cost
  WHERE user_id = p_user_id;

  INSERT INTO orders (user_id, player_id, side, price, quantity, filled_qty, status, expires_at)
  VALUES (p_user_id, p_player_id, 'buy', p_max_price, p_quantity, 0, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_order_id;

  v_result := jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'total_locked', v_total_cost,
    'new_available', v_wallet.balance - COALESCE(v_wallet.locked_balance, 0) - v_total_cost
  );

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result, status = 'completed'
    WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.place_buy_order(uuid, uuid, integer, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.place_buy_order(uuid, uuid, integer, bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.place_buy_order(uuid, uuid, integer, bigint, text) TO authenticated;

DROP FUNCTION IF EXISTS public.place_buy_order(uuid, uuid, integer, bigint);

COMMENT ON FUNCTION public.place_buy_order(uuid, uuid, integer, bigint, text) IS
  'Slice 178e-c (2026-04-24): Buy-Order placement with optional idempotency_key. Prevents double-escrow-lock on retry.';
