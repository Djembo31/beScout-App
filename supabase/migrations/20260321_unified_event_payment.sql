-- ============================================================================
-- Migration: Unified Event Payment Gateway
-- Date: 2026-03-21
-- Design Doc: docs/plans/2026-03-21-tickets-events-unified-payment-design.md
--
-- Adds dual-currency support (tickets / $SCOUT) for event entries.
-- Pilot phase: all events use tickets. After CASP + admin toggle: $SCOUT.
--
-- 1) events: add currency column
-- 2) Consolidate entry_fee → ticket_cost (entry_fee DEPRECATED)
-- 3) event_entries table (payment tracking, decoupled from lineups)
-- 4) platform_settings table (feature flags)
-- 5) Backfill event_entries from existing lineups
-- 6) Helper: scout_events_enabled()
-- 7) RPC: rpc_lock_event_entry
-- 8) RPC: rpc_unlock_event_entry
-- 9) RPC: rpc_cancel_event_entries
-- 10) REVOKE + authenticated wrappers
-- ============================================================================


-- ──────────────────────────────────────────────
-- 1. events: add currency column
-- ──────────────────────────────────────────────

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'tickets'
  CHECK (currency IN ('tickets', 'scout'));


-- ──────────────────────────────────────────────
-- 2. Consolidate entry_fee → ticket_cost
--    entry_fee is DEPRECATED after this migration
-- ──────────────────────────────────────────────

UPDATE public.events
SET ticket_cost = COALESCE(NULLIF(ticket_cost, 0), entry_fee, 0)
WHERE ticket_cost IS NULL OR ticket_cost = 0;

COMMENT ON COLUMN public.events.entry_fee IS 'DEPRECATED — use ticket_cost + currency';


-- ──────────────────────────────────────────────
-- 3. event_entries table
--    Tracks payment state, decoupled from lineups.
--    One entry per user per event.
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.event_entries (
  event_id      UUID        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id       UUID        NOT NULL REFERENCES public.profiles(id),
  currency      TEXT        NOT NULL CHECK (currency IN ('tickets', 'scout')),
  amount_locked BIGINT      NOT NULL DEFAULT 0,
  fee_split     JSONB,
  locked_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE public.event_entries ENABLE ROW LEVEL SECURITY;

-- Users can see their own entries
CREATE POLICY "Users see own entries"
  ON public.event_entries FOR SELECT
  USING (auth.uid() = user_id);

-- SECURITY DEFINER RPCs manage all entries (bypasses RLS)
-- No INSERT/UPDATE/DELETE policies needed for regular users

-- Index for user-centric lookups (e.g. "my events")
CREATE INDEX IF NOT EXISTS idx_event_entries_user
  ON public.event_entries(user_id);


-- ──────────────────────────────────────────────
-- 4. platform_settings table (feature flags)
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT 'false'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.platform_settings (key, value)
  VALUES ('scout_events_enabled', 'false'::jsonb)
  ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────
-- 5. Backfill event_entries from existing lineups
--    All existing entries are ticket-based with 0 cost locked
-- ──────────────────────────────────────────────

INSERT INTO public.event_entries (event_id, user_id, currency, amount_locked, locked_at)
  SELECT DISTINCT event_id, user_id, 'tickets', 0, COALESCE(submitted_at, now())
  FROM public.lineups
  WHERE event_id IS NOT NULL
  ON CONFLICT DO NOTHING;


-- ──────────────────────────────────────────────
-- 6. Helper: check if scout events are enabled
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.scout_events_enabled()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT value::text::boolean FROM public.platform_settings WHERE key = 'scout_events_enabled'),
    false
  );
$$;


-- ──────────────────────────────────────────────
-- 7. RPC: rpc_lock_event_entry
--    Atomically locks payment for an event entry.
--    Handles both tickets and $SCOUT currencies.
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_lock_event_entry(
  p_event_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event        RECORD;
  v_existing     RECORD;
  v_wallet       RECORD;
  v_tickets      RECORD;
  v_available    BIGINT;
  v_fee_platform BIGINT;
  v_fee_pbt      BIGINT;
  v_fee_club     BIGINT;
  v_balance_after BIGINT;
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

  -- 4. Duplicate guard (idempotent: return success if already entered)
  SELECT * INTO v_existing FROM public.event_entries
    WHERE event_id = p_event_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_entered', true, 'currency', v_existing.currency);
  END IF;

  -- 5. Advisory lock (prevent race condition on same user+event)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_event_id::text));

  -- 6. Currency branch
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

    -- Insert entry record
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

      -- Fee split: Platform 3.5% + PBT 1.5% + Club 1%
      v_fee_platform := (v_event.ticket_cost * 350) / 10000;
      v_fee_pbt      := (v_event.ticket_cost * 150) / 10000;
      v_fee_club     := (v_event.ticket_cost * 100) / 10000;

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
      v_fee_pbt := 0;
      v_fee_club := 0;
      v_balance_after := 0;
    END IF;

    -- Insert entry record with fee split
    INSERT INTO public.event_entries
      (event_id, user_id, currency, amount_locked, fee_split, locked_at)
      VALUES (p_event_id, p_user_id, 'scout', v_event.ticket_cost,
              jsonb_build_object('platform', v_fee_platform, 'pbt', v_fee_pbt, 'club', v_fee_club),
              now());
  END IF;

  -- 7. Increment entry count
  UPDATE public.events SET current_entries = current_entries + 1 WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'currency', v_event.currency, 'balance_after', v_balance_after);
END;
$$;


-- ──────────────────────────────────────────────
-- 8. RPC: rpc_unlock_event_entry (refund/leave)
--    Refunds payment and removes entry + lineup.
--    Only allowed before locks_at.
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
    -- Credit tickets back
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
    -- Unlock $SCOUT from escrow
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
-- 9. RPC: rpc_cancel_event_entries (admin action)
--    Refunds ALL entries for a cancelled event.
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
  -- Load event
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  -- Loop all entries, refund each
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

  -- Clean up all entries
  DELETE FROM public.event_entries WHERE event_id = p_event_id;

  -- Reset entry count
  UPDATE public.events SET current_entries = 0 WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'refunded_count', v_refunded);
END;
$$;


-- ──────────────────────────────────────────────
-- 10. REVOKE + Authenticated Wrappers
--     Internal RPCs are revoked from all roles.
--     Public-facing wrappers inject auth.uid().
-- ──────────────────────────────────────────────

-- Revoke direct access to internal RPCs
REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_unlock_event_entry FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.rpc_cancel_event_entries FROM PUBLIC, authenticated, anon;

-- Wrapper: lock_event_entry (any authenticated user)
CREATE OR REPLACE FUNCTION public.lock_event_entry(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN public.rpc_lock_event_entry(p_event_id, auth.uid());
END;
$$;

-- Wrapper: unlock_event_entry (any authenticated user)
CREATE OR REPLACE FUNCTION public.unlock_event_entry(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN public.rpc_unlock_event_entry(p_event_id, auth.uid());
END;
$$;

-- Wrapper: cancel_event_entries (admin-only)
CREATE OR REPLACE FUNCTION public.cancel_event_entries(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Admin guard: check profiles.top_role = 'Admin' (capital A)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND top_role = 'Admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  RETURN public.rpc_cancel_event_entries(p_event_id);
END;
$$;

-- Grant wrappers to authenticated users
GRANT EXECUTE ON FUNCTION public.lock_event_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_event_entry TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_event_entries TO authenticated;
