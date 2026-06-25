-- Slice 384 — E-3 Türsteher: Follower-Pflicht + Fan-Rang-Gate auf Event-Eintritt
-- Spiegelt das Poll-Muster (Slice 356) für Events. Beide Gates blocken VOR jeder Geld-/Ticket-
-- Bewegung, nur bei club-gebundenen Events (analog subscription_required), fail-closed.
-- rpc_lock_event_entry-Body = aus LIVE pg_get_functiondef (D87, PATCH-AUDIT S156/S356), nur die
-- zwei Türsteher-Blöcke + DECLARE v_rank_tier ergänzt; alle bestehenden Patches byte-genau erhalten.

-- ============================================================
-- 1. Spalten: requires_follow (BOOLEAN, default false) + min_fan_rank_tier (NULL = offen) + CHECK
--    (6-Tier-Mirror wie community_polls/posts).
-- ============================================================
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS requires_follow BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS min_fan_rank_tier TEXT;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_min_fan_rank_tier_check;
ALTER TABLE public.events ADD CONSTRAINT events_min_fan_rank_tier_check
  CHECK (min_fan_rank_tier IS NULL OR min_fan_rank_tier IN
    ('zuschauer','stammgast','ultra','legende','ehrenmitglied','vereinsikone'));

-- ============================================================
-- 2. rpc_lock_event_entry v2 — +2 Türsteher-Gates NACH min_tier, VOR already_entered/Geld.
--    Signatur unverändert → CREATE OR REPLACE (kein DROP). ACL bleibt erhalten (S368c).
-- ============================================================
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
  v_balance_after    BIGINT;
  v_rank_tier        TEXT;            -- Slice 384
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

  -- Slice 384: Türsteher Follower-Pflicht. Nur bei club-gebundenen Events (analog
  -- subscription_required) — bescout/sponsor-Events ohne Verein haben kein Follower-Signal.
  IF v_event.requires_follow AND v_event.club_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.club_followers
      WHERE user_id = p_user_id AND club_id = v_event.club_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'follow_required');
    END IF;
  END IF;

  -- Slice 384: Türsteher Fan-Rang-Gate (Spiegel Poll-356). Gespeicherter Rang (stale-tolerant,
  -- money-safe da Reject VOR Geldfluss). fan_rank_tier_rank(NULL)=-1 < jede Mindeststufe → fail-closed.
  IF v_event.min_fan_rank_tier IS NOT NULL AND v_event.club_id IS NOT NULL THEN
    SELECT rank_tier INTO v_rank_tier FROM public.fan_rankings
    WHERE user_id = p_user_id AND club_id = v_event.club_id LIMIT 1;
    IF public.fan_rank_tier_rank(v_rank_tier) < public.fan_rank_tier_rank(v_event.min_fan_rank_tier) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'fan_rank_too_low', 'need', v_event.min_fan_rank_tier);
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
      -- Slice 156: Free ticket event → NULL
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
      -- Slice 156: Free scout event → NULL
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

  -- Slice 156: balance_after kann NULL sein
  RETURN jsonb_build_object('ok', true, 'currency', v_event.currency, 'balance_after', v_balance_after);
END;
$function$;

-- ACL: rpc_lock_event_entry ist Inner-RPC (Client ruft SEC-DEFINER-Wrapper lock_event_entry).
-- Live-proacl vor diesem Slice = {postgres, service_role}; CREATE OR REPLACE erhält das (S368c).
-- Defensiv anon/PUBLIC ausschließen (idempotent) — KEIN authenticated-GRANT (Wrapper braucht's nicht).
REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM anon;
