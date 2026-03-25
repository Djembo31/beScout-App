-- ============================================================================
-- Migration: SC Blocking — RPC patches + auto-unlock trigger
-- Date: 2026-03-25
-- 1) rpc_unlock_event_entry: clean up holding_locks on leave
-- 2) rpc_cancel_event_entries: clean up holding_locks on cancel
-- 3) place_sell_order: subtract locked SCs from available qty
-- 4) Trigger: auto-unlock on event status → ended/scoring/cancelled
-- ============================================================================


-- ──────────────────────────────────────────────
-- 1. Patch rpc_unlock_event_entry — add holding_locks cleanup
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_unlock_event_entry(
  p_event_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event        RECORD;
  v_entry        RECORD;
  v_balance_after BIGINT;
BEGIN
  -- 1. Load event
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  -- 2. Refund guard: only before locks_at
  IF v_event.locks_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_locked');
  END IF;

  -- 3. Load entry
  SELECT * INTO v_entry FROM public.event_entries
    WHERE event_id = p_event_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_entered');
  END IF;

  -- 4. Advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_event_id::text));

  -- 5. Currency branch: refund
  IF v_entry.currency = 'tickets' AND v_entry.amount_locked > 0 THEN
    UPDATE public.user_tickets
      SET balance     = balance + v_entry.amount_locked,
          spent_total = GREATEST(0, spent_total - v_entry.amount_locked),
          updated_at  = now()
      WHERE user_id = p_user_id;

    SELECT balance INTO v_balance_after
      FROM public.user_tickets WHERE user_id = p_user_id;

    INSERT INTO public.ticket_transactions
      (user_id, amount, balance_after, source, reference_id, description)
      VALUES (p_user_id, v_entry.amount_locked, v_balance_after, 'event_entry_refund',
              p_event_id, 'Refund: ' || v_event.name);

  ELSIF v_entry.currency = 'scout' AND v_entry.amount_locked > 0 THEN
    UPDATE public.wallets
      SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_entry.amount_locked),
          updated_at = now()
      WHERE user_id = p_user_id;

    SELECT (balance - COALESCE(locked_balance, 0)) INTO v_balance_after
      FROM public.wallets WHERE user_id = p_user_id;

    INSERT INTO public.transactions
      (user_id, type, amount, balance_after, reference_id, description)
      VALUES (p_user_id, 'event_entry_unlock', v_entry.amount_locked, v_balance_after,
              p_event_id, 'Refund: ' || v_event.name);
  END IF;

  -- 5.5 Release holding locks for this user+event
  DELETE FROM public.holding_locks
    WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 6. Delete entry
  DELETE FROM public.event_entries WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 7. Also delete lineup if exists
  DELETE FROM public.lineups WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 8. Decrement entry count (never go below 0)
  UPDATE public.events SET current_entries = GREATEST(0, current_entries - 1) WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'currency', v_entry.currency,
                            'balance_after', COALESCE(v_balance_after, 0));
END;
$$;


-- ──────────────────────────────────────────────
-- 2. Patch rpc_cancel_event_entries — add holding_locks cleanup
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_cancel_event_entries(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event    RECORD;
  v_entry    RECORD;
  v_refunded INT := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  FOR v_entry IN SELECT * FROM public.event_entries WHERE event_id = p_event_id LOOP
    IF v_entry.currency = 'tickets' AND v_entry.amount_locked > 0 THEN
      UPDATE public.user_tickets
        SET balance = balance + v_entry.amount_locked, updated_at = now()
        WHERE user_id = v_entry.user_id;

      INSERT INTO public.ticket_transactions
        (user_id, amount, balance_after, source, reference_id, description)
        VALUES (v_entry.user_id, v_entry.amount_locked,
                (SELECT balance FROM public.user_tickets WHERE user_id = v_entry.user_id),
                'event_entry_refund', p_event_id, 'Event cancelled: ' || v_event.name);

    ELSIF v_entry.currency = 'scout' AND v_entry.amount_locked > 0 THEN
      UPDATE public.wallets
        SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_entry.amount_locked),
            updated_at = now()
        WHERE user_id = v_entry.user_id;

      INSERT INTO public.transactions
        (user_id, type, amount, balance_after, reference_id, description)
        VALUES (v_entry.user_id, 'event_entry_unlock', v_entry.amount_locked,
                (SELECT balance - COALESCE(locked_balance, 0) FROM public.wallets WHERE user_id = v_entry.user_id),
                p_event_id, 'Event cancelled: ' || v_event.name);
    END IF;

    v_refunded := v_refunded + 1;
  END LOOP;

  -- Release ALL holding locks for this event
  DELETE FROM public.holding_locks WHERE event_id = p_event_id;

  -- Clean up all entries
  DELETE FROM public.event_entries WHERE event_id = p_event_id;

  -- Reset entry count
  UPDATE public.events SET current_entries = 0 WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'refunded_count', v_refunded);
END;
$$;


-- ──────────────────────────────────────────────
-- 3. Patch place_sell_order — subtract locked SCs
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.place_sell_order(
  p_user_id UUID, p_player_id UUID, p_quantity INT, p_price BIGINT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_holding RECORD;
  v_open_sell_qty INT;
  v_locked_qty INT;
  v_available_qty INT;
  v_order_id UUID;
  v_is_liquidated BOOLEAN;
  v_recent_orders INT;
  v_price_cap BIGINT;
BEGIN
  -- AUTH GUARD
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- INPUT VALIDATION
  IF p_quantity IS NULL OR p_quantity < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültige Menge. Mindestens 1 DPC.');
  END IF;
  IF p_price IS NULL OR p_price < 1 THEN
    RETURN json_build_object('success', false, 'error', 'Ungültiger Preis. Mindestens 1 Cent.');
  END IF;

  -- LIQUIDATION GUARD
  SELECT is_liquidated INTO v_is_liquidated FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden.');
  END IF;
  IF v_is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading möglich.');
  END IF;

  -- CLUB ADMIN RESTRICTION
  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Club-Admins dürfen keine DPCs ihres eigenen Clubs handeln.');
  END IF;

  -- PRICE CAP CHECK
  v_price_cap := public.get_price_cap(p_player_id);
  IF p_price > v_price_cap THEN
    RETURN json_build_object('success', false, 'error',
      'Preis überschreitet Maximum (' || (v_price_cap / 100) || ' $SCOUT). '
      || 'Max. erlaubt: 3x Referenzwert oder 3x Median der letzten Trades.');
  END IF;

  -- RATE LIMIT
  SELECT COUNT(*) INTO v_recent_orders
  FROM public.orders
  WHERE user_id = p_user_id
    AND player_id = p_player_id
    AND side = 'sell'
    AND created_at > now() - INTERVAL '1 hour';

  IF v_recent_orders >= 10 THEN
    RETURN json_build_object('success', false, 'error',
      'Max 10 Verkaufsorders pro Spieler pro Stunde. Bitte warte.');
  END IF;

  -- HOLDINGS CHECK
  SELECT * INTO v_holding FROM public.holdings
  WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF NOT FOUND OR v_holding.quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Keine DPCs zum Verkaufen');
  END IF;

  -- AVAILABLE QUANTITY CHECK (open sell orders)
  SELECT COALESCE(SUM(quantity - filled_qty), 0) INTO v_open_sell_qty
  FROM public.orders
  WHERE user_id = p_user_id AND player_id = p_player_id
    AND side = 'sell' AND status IN ('open', 'partial')
    AND (expires_at IS NULL OR expires_at > NOW());

  -- EVENT LOCK CHECK (locked SCs in fantasy events)
  SELECT COALESCE(SUM(quantity_locked), 0)::INT INTO v_locked_qty
  FROM public.holding_locks
  WHERE user_id = p_user_id AND player_id = p_player_id;

  v_available_qty := v_holding.quantity - v_open_sell_qty - v_locked_qty;
  IF v_available_qty < p_quantity THEN
    RETURN json_build_object('success', false, 'error',
      'Nur ' || v_available_qty || ' SC verfuegbar (' || v_locked_qty || ' in Events gesperrt)');
  END IF;

  -- CREATE ORDER
  INSERT INTO public.orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (p_user_id, p_player_id, 'sell', p_price, p_quantity, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_order_id;

  -- RECALC FLOOR PRICE
  PERFORM public.recalc_floor_price(p_player_id);

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'quantity', p_quantity,
    'price', p_price
  );
END;
$function$;


-- ──────────────────────────────────────────────
-- 4. Auto-unlock trigger on event end/score/cancel
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_fn_event_status_unlock_holdings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('ended', 'scoring', 'cancelled')
     AND OLD.status NOT IN ('ended', 'scoring', 'cancelled') THEN
    DELETE FROM public.holding_locks WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_status_unlock_holdings ON public.events;
CREATE TRIGGER trg_event_status_unlock_holdings
  AFTER UPDATE OF status ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_event_status_unlock_holdings();
