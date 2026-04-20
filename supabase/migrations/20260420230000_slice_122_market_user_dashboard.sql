-- Slice 122: get_market_user_dashboard RPC
-- Consolidates 4 per-user /market queries (holdings + watchlist +
-- incoming_offers + open_bids) into a single SECURITY DEFINER RPC.
-- Analog zu Slice 109 get_home_dashboard_v1.
--
-- Security: AR-44 Guard pattern (auth.uid IS DISTINCT FROM p_user_id)
-- plus REVOKE PUBLIC/anon + GRANT authenticated.

CREATE OR REPLACE FUNCTION public.get_market_user_dashboard(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_holdings jsonb;
  v_watchlist jsonb;
  v_incoming_offers jsonb;
  v_open_bids jsonb;
  v_owned_player_ids uuid[];
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb) INTO v_holdings
  FROM (
    SELECT id, user_id, player_id, quantity, avg_buy_price, created_at, updated_at
    FROM holdings
    WHERE user_id = p_user_id AND quantity > 0
    ORDER BY updated_at DESC
  ) h;

  SELECT COALESCE(jsonb_agg(row_to_json(w)), '[]'::jsonb) INTO v_watchlist
  FROM (
    SELECT id, user_id, player_id, alert_threshold_pct, alert_direction,
           last_alert_price, created_at
    FROM watchlist
    WHERE user_id = p_user_id
    ORDER BY created_at DESC
  ) w;

  SELECT COALESCE(jsonb_agg(row_to_json(o)), '[]'::jsonb) INTO v_incoming_offers
  FROM (
    SELECT id, player_id, sender_id, receiver_id, side, price, quantity,
           status, counter_offer_id, message, expires_at, created_at, updated_at
    FROM offers
    WHERE receiver_id = p_user_id
      AND status = 'pending'
      AND expires_at > NOW()
    ORDER BY created_at DESC
  ) o;

  SELECT ARRAY(
    SELECT player_id FROM holdings WHERE user_id = p_user_id AND quantity > 0
  ) INTO v_owned_player_ids;

  IF array_length(v_owned_player_ids, 1) > 0 THEN
    SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb) INTO v_open_bids
    FROM (
      SELECT id, player_id, sender_id, receiver_id, side, price, quantity,
             status, counter_offer_id, message, expires_at, created_at, updated_at
      FROM offers
      WHERE receiver_id IS NULL
        AND status = 'pending'
        AND side = 'buy'
        AND expires_at > NOW()
        AND player_id = ANY(v_owned_player_ids)
      ORDER BY created_at DESC
      LIMIT 50
    ) b;
  ELSE
    v_open_bids := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'holdings', v_holdings,
    'watchlist', v_watchlist,
    'incoming_offers', v_incoming_offers,
    'open_bids', v_open_bids
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_market_user_dashboard(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_market_user_dashboard(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_market_user_dashboard(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_market_user_dashboard(uuid) IS
  'Slice 122: Konsolidiert 4 per-User /market Queries (holdings + watchlist + incoming_offers + open_bids) in 1 jsonb RPC. Analog zu get_home_dashboard_v1.';
