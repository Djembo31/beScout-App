-- =============================================================================
-- Slice 178e-b — place_sell_order Idempotency-Integration (Tier A1)
--
-- Baseline: live pg_get_functiondef (2026-04-24).
-- RPC erzeugt open sell-order (kein money-transfer, aber idempotency wichtig:
-- network-retry wuerde 2 orders mit gleicher qty anlegen → Holdings-leak via
-- over-subscription-bug).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.place_sell_order(
  p_user_id uuid,
  p_player_id uuid,
  p_quantity integer,
  p_price bigint,
  p_idempotency_key text DEFAULT NULL
)
  RETURNS json
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
DECLARE
  v_holding RECORD; v_open_sell_qty INT; v_locked_qty INT; v_available_qty INT;
  v_order_id UUID; v_is_liquidated BOOLEAN; v_recent_orders INT; v_price_cap BIGINT;
  v_result JSON;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt'; END IF;
  IF p_quantity IS NULL OR p_quantity < 1 THEN RETURN json_build_object('success', false, 'error', 'Ungueltige Menge. Mindestens 1 SC.'); END IF;
  IF p_price IS NULL OR p_price < 1 THEN RETURN json_build_object('success', false, 'error', 'invalidPrice'); END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);

    IF NOT v_dedup_new THEN
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

  SELECT is_liquidated INTO v_is_liquidated FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.'); END IF;
  IF v_is_liquidated THEN RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading moeglich.'); END IF;
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN RETURN json_build_object('success', false, 'error', 'Club-Admins duerfen keine SCs ihres eigenen Clubs handeln.'); END IF;

  v_price_cap := public.get_price_cap(p_player_id);
  IF p_price > v_price_cap THEN RETURN json_build_object('success', false, 'error', 'maxPriceExceeded'); END IF;

  SELECT COUNT(*) INTO v_recent_orders FROM public.orders WHERE user_id = p_user_id AND player_id = p_player_id AND side = 'sell' AND created_at > now() - INTERVAL '1 hour';
  IF v_recent_orders >= COALESCE((SELECT CASE tier WHEN 'gold' THEN 100 WHEN 'silber' THEN 20 WHEN 'bronze' THEN 15 ELSE 10 END FROM club_subscriptions WHERE user_id = p_user_id AND status = 'active' AND expires_at > now() ORDER BY CASE tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1), 10) THEN RETURN json_build_object('success', false, 'error', 'Max 10 Verkaufsorders pro Spieler pro Stunde. Bitte warte.'); END IF;

  SELECT * INTO v_holding FROM public.holdings WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF NOT FOUND OR v_holding.quantity <= 0 THEN RETURN json_build_object('success', false, 'error', 'Keine SCs zum Verkaufen'); END IF;

  SELECT COALESCE(SUM(quantity - filled_qty), 0) INTO v_open_sell_qty FROM public.orders WHERE user_id = p_user_id AND player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial') AND (expires_at IS NULL OR expires_at > NOW());
  SELECT COALESCE(SUM(quantity_locked), 0)::INT INTO v_locked_qty FROM public.holding_locks WHERE user_id = p_user_id AND player_id = p_player_id;
  v_available_qty := v_holding.quantity - v_open_sell_qty - v_locked_qty;
  IF v_available_qty < p_quantity THEN RETURN json_build_object('success', false, 'error', 'Nur ' || v_available_qty || ' SC verfuegbar (' || v_locked_qty || ' in Events gesperrt)'); END IF;

  INSERT INTO public.orders (user_id, player_id, side, price, quantity, status, expires_at) VALUES (p_user_id, p_player_id, 'sell', p_price, p_quantity, 'open', NOW() + INTERVAL '30 days') RETURNING id INTO v_order_id;
  PERFORM public.recalc_floor_price(p_player_id);

  v_result := json_build_object('success', true, 'order_id', v_order_id, 'quantity', p_quantity, 'price', p_price);

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result::JSONB, status = 'completed'
    WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.place_sell_order(uuid, uuid, integer, bigint, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.place_sell_order(uuid, uuid, integer, bigint, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.place_sell_order(uuid, uuid, integer, bigint, text) TO authenticated;

DROP FUNCTION IF EXISTS public.place_sell_order(uuid, uuid, integer, bigint);

COMMENT ON FUNCTION public.place_sell_order(uuid, uuid, integer, bigint, text) IS
  'Slice 178e-b (2026-04-24): Sell-Order placement with optional idempotency_key.';
