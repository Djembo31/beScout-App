-- ============================================================================
-- Migration: Event Fee from Config Table + Subscription Gate
-- Date: 2026-03-25
-- Design Doc: docs/plans/2026-03-25-event-ownership-system-design.md
--
-- Updates rpc_lock_event_entry to:
-- 1) Read fee splits from event_fee_config instead of hardcoded values
-- 2) Enforce min_subscription_tier server-side
-- 3) Store fee_split as {platform, beneficiary, prize_pool}
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_lock_event_entry(
  p_event_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event            RECORD;
  v_existing         RECORD;
  v_wallet           RECORD;
  v_tickets          RECORD;
  v_available        BIGINT;
  v_fee_platform     BIGINT;
  v_fee_beneficiary  BIGINT;
  v_prize_amount     BIGINT;
  v_platform_pct     SMALLINT;
  v_beneficiary_pct  SMALLINT;
  v_user_tier        TEXT;
  v_balance_after    BIGINT;
BEGIN
  -- 1. Load event
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  -- 2. Status guard
  IF v_event.status NOT IN ('registering', 'late-reg') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_open');
  END IF;

  -- 3. Capacity guard
  IF v_event.max_entries IS NOT NULL AND v_event.current_entries >= v_event.max_entries THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_full');
  END IF;

  -- 4. Subscription tier gate (server-side enforcement)
  IF v_event.min_subscription_tier IS NOT NULL AND v_event.club_id IS NOT NULL THEN
    SELECT tier INTO v_user_tier
    FROM public.club_subscriptions
    WHERE user_id = p_user_id
      AND club_id = v_event.club_id
      AND status = 'active'
      AND expires_at > now();

    IF v_user_tier IS NULL
       OR public.tier_rank(v_user_tier) < public.tier_rank(v_event.min_subscription_tier) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'subscription_required',
        'need', v_event.min_subscription_tier
      );
    END IF;
  END IF;

  -- 5. Duplicate guard (idempotent: return success if already entered)
  SELECT * INTO v_existing FROM public.event_entries
    WHERE event_id = p_event_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_entered', true, 'currency', v_existing.currency);
  END IF;

  -- 6. Advisory lock (prevent race condition on same user+event)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_event_id::text));

  -- 7. Load fee config for this event type
  SELECT platform_pct, beneficiary_pct
  INTO v_platform_pct, v_beneficiary_pct
  FROM public.event_fee_config
  WHERE event_type = v_event.type;

  -- Fallback to 5%/0% if no config found
  v_platform_pct := COALESCE(v_platform_pct, 500);
  v_beneficiary_pct := COALESCE(v_beneficiary_pct, 0);

  -- 8. Currency branch
  IF v_event.currency = 'tickets' THEN
    -- ── TICKET PATH ──
    IF v_event.ticket_cost > 0 THEN
      SELECT * INTO v_tickets FROM public.user_tickets
        WHERE user_id = p_user_id FOR UPDATE;

      IF NOT FOUND OR v_tickets.balance < v_event.ticket_cost THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_tickets',
          'have', COALESCE(v_tickets.balance, 0), 'need', v_event.ticket_cost);
      END IF;

      -- Debit tickets
      UPDATE public.user_tickets
        SET balance     = balance - v_event.ticket_cost,
            spent_total = spent_total + v_event.ticket_cost,
            updated_at  = now()
        WHERE user_id = p_user_id;

      v_balance_after := v_tickets.balance - v_event.ticket_cost;

      -- Record ticket transaction
      INSERT INTO public.ticket_transactions
        (user_id, amount, balance_after, source, reference_id, description)
        VALUES (p_user_id, -v_event.ticket_cost, v_balance_after, 'event_entry',
                p_event_id, 'Event: ' || v_event.name);
    ELSE
      -- Free ticket event
      v_balance_after := 0;
    END IF;

    -- Insert entry record (tickets don't have fee split)
    INSERT INTO public.event_entries (event_id, user_id, currency, amount_locked, locked_at)
      VALUES (p_event_id, p_user_id, 'tickets', v_event.ticket_cost, now());

  ELSIF v_event.currency = 'scout' THEN
    -- ── SCOUT PATH ──

    -- Feature flag guard
    IF NOT scout_events_enabled() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'scout_events_disabled');
    END IF;

    IF v_event.ticket_cost > 0 THEN
      -- Lock wallet
      SELECT * INTO v_wallet FROM public.wallets
        WHERE user_id = p_user_id FOR UPDATE;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
      END IF;

      v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
      IF v_available < v_event.ticket_cost THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance',
          'have', v_available, 'need', v_event.ticket_cost);
      END IF;

      -- Fee calculation from config
      v_fee_platform    := (v_event.ticket_cost * v_platform_pct) / 10000;
      v_fee_beneficiary := (v_event.ticket_cost * v_beneficiary_pct) / 10000;
      v_prize_amount    := v_event.ticket_cost - v_fee_platform - v_fee_beneficiary;

      -- Lock amount in wallet escrow
      UPDATE public.wallets
        SET locked_balance = COALESCE(locked_balance, 0) + v_event.ticket_cost,
            updated_at = now()
        WHERE user_id = p_user_id;

      v_balance_after := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0) - v_event.ticket_cost;

      -- Record $SCOUT transaction
      INSERT INTO public.transactions
        (user_id, type, amount, balance_after, reference_id, description)
        VALUES (p_user_id, 'event_entry_lock', v_event.ticket_cost, v_balance_after,
                p_event_id, 'Event: ' || v_event.name);
    ELSE
      -- Free scout event
      v_fee_platform := 0;
      v_fee_beneficiary := 0;
      v_prize_amount := 0;
      v_balance_after := 0;
    END IF;

    -- Insert entry record with fee split
    INSERT INTO public.event_entries
      (event_id, user_id, currency, amount_locked, fee_split, locked_at)
      VALUES (p_event_id, p_user_id, 'scout', v_event.ticket_cost,
              jsonb_build_object(
                'platform', v_fee_platform,
                'beneficiary', v_fee_beneficiary,
                'prize_pool', v_prize_amount
              ),
              now());
  END IF;

  -- 9. Increment entry count
  UPDATE public.events SET current_entries = current_entries + 1 WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'currency', v_event.currency, 'balance_after', v_balance_after);
END;
$$;
