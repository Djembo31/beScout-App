-- ============================================================================
-- Slice 156 — Event Entry RPCs: balance_after NULL bei no-op-deduction
-- Date: 2026-04-23 (corrected after CTO-Review FAIL)
--
-- **Source-of-Truth-Baseline fuer diese Migration:**
--   - rpc_lock_event_entry:   20260417000000_auth_guard_hardening.sql:254-427 (Slice 005)
--   - rpc_unlock_event_entry: 20260325_sc_blocking_rpcs.sql:15-95
--
-- **Applied Patches ueber Original (20260321_unified_event_payment.sql):**
--   - 20260325_event_fee_from_config.sql  — min_subscription_tier + event_fee_config + {platform, beneficiary, prize_pool} fee-split shape
--   - 20260325_sc_blocking_rpcs.sql       — holding_locks cleanup in unlock
--   - 20260417000000_auth_guard_hardening.sql — auth.uid()-Guard + min_tier gamification-gate + REVOKE authenticated
--
-- **Diff-Intent dieser Migration (nur 3 Zeilen):**
--   rpc_lock_event_entry:
--     Zeile ~365 (ticket-free-branch): `v_balance_after := 0`  →  `v_balance_after := NULL`
--     Zeile ~409 (scout-free-branch):  `v_balance_after := 0`  →  `v_balance_after := NULL`
--   rpc_unlock_event_entry:
--     Zeile ~93 (RETURN):              `COALESCE(v_balance_after, 0)`  →  `v_balance_after`
--
-- Alle anderen Bodies sind 1:1-Kopie der Baselines. Client-Side: `balanceAfter != null`-Check.
--
-- **Bug-Fix-Motivation:**
--   - Free-Events (ticket_cost=0): RPC signalisiert "Wallet nicht beruehrt" via NULL statt 0.
--     Consumer (useEventActions.ts) kann jetzt unterscheiden zwischen "Balance unveraendert"
--     (null → skip setWalletBalance) und "auf 0 deducted" (0 → setWalletBalance(0)).
--   - Bugfix in unlock: COALESCE(v_balance_after, 0) setzte Wallet-Cache im Client
--     faelschlich auf 0 wenn amount_locked=0 (Free-Event Leave). Jetzt NULL → Client skippt.
--
-- Review: worklog/reviews/156-review.md (verdict FAIL bei v1, PASS bei v2)
-- Spec:   worklog/specs/156-event-lineup-ferrari.md
-- Impact: worklog/impact/156-event-lineup-ferrari.md
--
-- common-errors.md §2 erweitert um "CREATE OR REPLACE FUNCTION — PATCH-AUDIT PFLICHT".
-- ============================================================================


-- ──────────────────────────────────────────────
-- rpc_lock_event_entry — 1:1-Kopie von 20260417000000:254-427 mit 2x NULL-Zeilen
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rpc_lock_event_entry(p_event_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  v_user_gam_tier    TEXT;
  v_balance_after    BIGINT;  -- Slice 156: bleibt NULL bei Free-Events
BEGIN
  -- Slice 005 Auth-Guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  IF v_event.status NOT IN ('registering', 'late-reg') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_open');
  END IF;

  IF v_event.max_entries IS NOT NULL AND v_event.current_entries >= v_event.max_entries THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_full');
  END IF;

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

  IF v_event.min_tier IS NOT NULL THEN
    SELECT tier INTO v_user_gam_tier
    FROM public.user_stats
    WHERE user_id = p_user_id;

    IF v_user_gam_tier IS NULL
       OR public.gamification_tier_rank(v_user_gam_tier) < public.gamification_tier_rank(v_event.min_tier) THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'tier_required',
        'need', v_event.min_tier,
        'have', COALESCE(v_user_gam_tier, 'Rookie')
      );
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.event_entries
    WHERE event_id = p_event_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_entered', true, 'currency', v_existing.currency);
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_event_id::text));

  SELECT platform_pct, beneficiary_pct
  INTO v_platform_pct, v_beneficiary_pct
  FROM public.event_fee_config
  WHERE event_type = v_event.type;

  v_platform_pct := COALESCE(v_platform_pct, 500);
  v_beneficiary_pct := COALESCE(v_beneficiary_pct, 0);

  IF v_event.currency = 'tickets' THEN
    IF v_event.ticket_cost > 0 THEN
      SELECT * INTO v_tickets FROM public.user_tickets
        WHERE user_id = p_user_id FOR UPDATE;

      IF NOT FOUND OR v_tickets.balance < v_event.ticket_cost THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_tickets',
          'have', COALESCE(v_tickets.balance, 0), 'need', v_event.ticket_cost);
      END IF;

      UPDATE public.user_tickets
        SET balance     = balance - v_event.ticket_cost,
            spent_total = spent_total + v_event.ticket_cost,
            updated_at  = now()
        WHERE user_id = p_user_id;

      v_balance_after := v_tickets.balance - v_event.ticket_cost;

      INSERT INTO public.ticket_transactions
        (user_id, amount, balance_after, source, reference_id, description)
        VALUES (p_user_id, -v_event.ticket_cost, v_balance_after, 'event_entry',
                p_event_id, 'Event: ' || v_event.name);
    ELSE
      -- Slice 156: Free ticket event → NULL (nicht 0) signalisiert "Wallet nicht beruehrt"
      v_balance_after := NULL;
    END IF;

    INSERT INTO public.event_entries (event_id, user_id, currency, amount_locked, locked_at)
      VALUES (p_event_id, p_user_id, 'tickets', v_event.ticket_cost, now());

  ELSIF v_event.currency = 'scout' THEN
    IF NOT scout_events_enabled() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'scout_events_disabled');
    END IF;

    IF v_event.ticket_cost > 0 THEN
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

      v_fee_platform    := (v_event.ticket_cost * v_platform_pct) / 10000;
      v_fee_beneficiary := (v_event.ticket_cost * v_beneficiary_pct) / 10000;
      v_prize_amount    := v_event.ticket_cost - v_fee_platform - v_fee_beneficiary;

      UPDATE public.wallets
        SET locked_balance = COALESCE(locked_balance, 0) + v_event.ticket_cost,
            updated_at = now()
        WHERE user_id = p_user_id;

      v_balance_after := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0) - v_event.ticket_cost;

      INSERT INTO public.transactions
        (user_id, type, amount, balance_after, reference_id, description)
        VALUES (p_user_id, 'event_entry_lock', v_event.ticket_cost, v_balance_after,
                p_event_id, 'Event: ' || v_event.name);
    ELSE
      -- Slice 156: Free scout event → NULL (nicht 0) signalisiert "Wallet nicht beruehrt"
      v_fee_platform := 0;
      v_fee_beneficiary := 0;
      v_prize_amount := 0;
      v_balance_after := NULL;
    END IF;

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

  UPDATE public.events SET current_entries = current_entries + 1 WHERE id = p_event_id;

  -- Slice 156: balance_after kann NULL sein — Consumer nutzt != null-Check
  RETURN jsonb_build_object('ok', true, 'currency', v_event.currency, 'balance_after', v_balance_after);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) IS
  'Slice 005 (2026-04-17): REVOKED authenticated + auth.uid() guard. Client nutzt lock_event_entry(p_event_id) wrapper. Slice 156 (2026-04-23): balance_after kann NULL sein bei Free-Events (ticket_cost=0) — Consumer nutzt != null-Check statt > 0-Heuristik.';


-- ──────────────────────────────────────────────
-- rpc_unlock_event_entry — 1:1-Kopie von 20260325_sc_blocking_rpcs:15-95 mit 1x RETURN-Zeile
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
  v_balance_after BIGINT;  -- Slice 156: bleibt NULL wenn amount_locked=0
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

  -- 5.5 Release holding locks for this user+event (Slice 20260325_sc_blocking_rpcs)
  DELETE FROM public.holding_locks
    WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 6. Delete entry
  DELETE FROM public.event_entries WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 7. Also delete lineup if exists
  DELETE FROM public.lineups WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 8. Decrement entry count (never go below 0)
  UPDATE public.events SET current_entries = GREATEST(0, current_entries - 1) WHERE id = p_event_id;

  -- Slice 156: v_balance_after kann NULL sein (amount_locked=0) — Consumer nutzt != null.
  -- Bugfix: bisher COALESCE(v_balance_after, 0) setzte Wallet-Cache faelschlich auf 0.
  RETURN jsonb_build_object('ok', true, 'currency', v_entry.currency,
                            'balance_after', v_balance_after);
END;
$$;

COMMENT ON FUNCTION public.rpc_unlock_event_entry(uuid, uuid) IS
  'Slice 041 (Wrapper-Pattern) + Slice 20260325 (holding_locks cleanup) + Slice 156 (2026-04-23): balance_after kann NULL sein wenn amount_locked=0 (Free-Event Leave). Bug-Fix: bisher COALESCE(v_balance_after, 0) setzte Wallet-Cache faelschlich auf 0.';
