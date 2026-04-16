-- =============================================================================
-- Slice 005 — Auth-Guard Hardening (2026-04-17, A-02)
--
-- 4 SECURITY DEFINER RPCs hatten `authenticated`-Grant ohne auth.uid() Guard.
-- Ermoeglichte authenticated-User auf fremde User-IDs zu zielen:
--   [HIGH] rpc_lock_event_entry: Event-Entry fuer fremden User locken → Wallet/Tickets des fremden Users werden gespent
--   [HIGH] renew_club_subscription: Club-Abo fuer fremden User renewen → fremdes Wallet deducted
--   [MED]  check_analyst_decay: fremden User -10 analyst-Score geben (once-per-30d)
--   [LOW]  refresh_airdrop_score: fremden User's airdrop score recomputen
--
-- FIX pro RPC:
--   1. REVOKE EXECUTE FROM authenticated (nur service_role + postgres behalten)
--      → Client muss bestehende Wrapper nutzen: lock_event_entry, refresh_my_airdrop_score.
--   2. Defense-in-depth Body-Guard:
--      IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN RAISE
--      (NULL-skip fuer service_role; DISTINCT-reject fuer authenticated falls
--       GRANT versehentlich wiederhergestellt wird)
--
-- CEO-approved 2026-04-17. Referenz: walkthrough/04-blocker-a.md A-02, P3-22.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. check_analyst_decay — add guard, REVOKE auth
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_analyst_decay(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last_content TIMESTAMPTZ;
  v_last_decay TIMESTAMPTZ;
  v_days_since INT;
BEGIN
  -- Slice 005 Auth-Guard: service_role (auth.uid()=NULL) skipped, authenticated must match
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT GREATEST(
    COALESCE((SELECT MAX(created_at) FROM posts WHERE user_id = p_user_id), '2000-01-01'),
    COALESCE((SELECT MAX(created_at) FROM research_posts WHERE author_id = p_user_id), '2000-01-01')
  ) INTO v_last_content;

  IF v_last_content = '2000-01-01' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'never_posted');
  END IF;

  v_days_since := EXTRACT(DAY FROM (now() - v_last_content));

  IF v_days_since < 30 THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'days_since', v_days_since);
  END IF;

  SELECT MAX(created_at) INTO v_last_decay
  FROM score_history
  WHERE user_id = p_user_id
    AND dimension = 'analyst'
    AND event_type = 'analyst_decay';

  IF v_last_decay IS NOT NULL AND v_last_decay > now() - INTERVAL '30 days' THEN
    RETURN jsonb_build_object('ok', true, 'skipped', true, 'reason', 'already_decayed');
  END IF;

  PERFORM award_dimension_score(
    p_user_id, 'analyst', -10, 'analyst_decay', NULL,
    jsonb_build_object('days_inactive', v_days_since)
  );

  RETURN jsonb_build_object('ok', true, 'decayed', true, 'days_inactive', v_days_since);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_analyst_decay(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_analyst_decay(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_analyst_decay(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.check_analyst_decay(uuid) TO service_role;

COMMENT ON FUNCTION public.check_analyst_decay(uuid) IS
  'Slice 005 (2026-04-17): REVOKED authenticated + auth.uid() guard. Cron-only.';

-- -----------------------------------------------------------------------------
-- 2. refresh_airdrop_score — add guard, REVOKE auth
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_airdrop_score(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_active_days INT;
  v_total_trades INT;
  v_research_count INT;
  v_referral_count INT;
  v_is_founding BOOLEAN;
  v_founding_mult NUMERIC;
  v_mastery_score INT;
  v_rang_score INT;
  v_abo_tier TEXT;
  v_abo_mult NUMERIC;
  v_median_score INT;
  v_scores INT[];
  v_activity_component INT;
  v_total INT;
  v_tier TEXT;
BEGIN
  -- Slice 005 Auth-Guard
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT count(DISTINCT DATE(created_at)) INTO v_active_days
  FROM activity_log WHERE user_id = p_user_id AND created_at > now() - INTERVAL '90 days';

  SELECT count(*) INTO v_total_trades
  FROM trades WHERE buyer_id = p_user_id OR seller_id = p_user_id;

  SELECT count(*) INTO v_research_count
  FROM research_posts WHERE user_id = p_user_id;

  SELECT count(*) INTO v_referral_count
  FROM transactions WHERE user_id = p_user_id AND type = 'referral_reward';

  v_activity_component := v_active_days * 2 + v_total_trades + v_research_count * 3 + v_referral_count * 5;

  SELECT ARRAY[COALESCE(trader_score, 500), COALESCE(manager_score, 500), COALESCE(analyst_score, 500)]
  INTO v_scores FROM scout_scores WHERE user_id = p_user_id;

  IF v_scores IS NULL THEN v_scores := ARRAY[500, 500, 500]; END IF;
  SELECT (ARRAY(SELECT unnest(v_scores) ORDER BY 1))[2] INTO v_median_score;

  v_rang_score := CASE
    WHEN v_median_score >= 7000 THEN 25 WHEN v_median_score >= 5000 THEN 18
    WHEN v_median_score >= 4000 THEN 12 WHEN v_median_score >= 2200 THEN 7
    WHEN v_median_score >= 1000 THEN 3 ELSE 1
  END;

  SELECT COALESCE(SUM(level) * 2, 0) INTO v_mastery_score
  FROM dpc_mastery WHERE user_id = p_user_id AND is_frozen = false;

  SELECT EXISTS(SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_key = 'founding_scout')
  INTO v_is_founding;
  v_founding_mult := CASE WHEN v_is_founding THEN 3.0 ELSE 1.0 END;

  SELECT cs.tier INTO v_abo_tier FROM club_subscriptions cs
  WHERE cs.user_id = p_user_id AND cs.status = 'active' AND cs.expires_at > now()
  ORDER BY CASE cs.tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1;
  v_abo_mult := CASE v_abo_tier WHEN 'gold' THEN 1.5 WHEN 'silber' THEN 1.25 WHEN 'bronze' THEN 1.1 ELSE 1.0 END;

  v_total := CEIL((v_activity_component + v_rang_score + v_mastery_score) * v_founding_mult * v_abo_mult);

  v_tier := CASE
    WHEN v_total >= 1000 THEN 'diamond' WHEN v_total >= 500 THEN 'gold'
    WHEN v_total >= 200 THEN 'silber' ELSE 'bronze'
  END;

  INSERT INTO airdrop_scores (
    user_id, total_score, tier, active_days, referral_count,
    founding_multiplier, mastery_score, scout_rang_score, abo_multiplier,
    activity_score, updated_at
  ) VALUES (
    p_user_id, v_total, v_tier, v_active_days, v_referral_count,
    v_founding_mult, v_mastery_score, v_rang_score, v_abo_mult,
    v_activity_component, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_score = EXCLUDED.total_score,
    tier = EXCLUDED.tier,
    active_days = EXCLUDED.active_days,
    referral_count = EXCLUDED.referral_count,
    founding_multiplier = EXCLUDED.founding_multiplier,
    mastery_score = EXCLUDED.mastery_score,
    scout_rang_score = EXCLUDED.scout_rang_score,
    abo_multiplier = EXCLUDED.abo_multiplier,
    activity_score = EXCLUDED.activity_score,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'total', v_total, 'tier', v_tier);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_airdrop_score(uuid) TO service_role;

COMMENT ON FUNCTION public.refresh_airdrop_score(uuid) IS
  'Slice 005 (2026-04-17): REVOKED authenticated + auth.uid() guard. Client nutzt refresh_my_airdrop_score() wrapper.';

-- -----------------------------------------------------------------------------
-- 3. renew_club_subscription — add guard gegen v_sub.user_id (p_user_id ignored in body)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.renew_club_subscription(p_user_id uuid, p_subscription_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_wallet RECORD;
  v_new_balance BIGINT;
BEGIN
  SELECT * INTO v_sub FROM club_subscriptions WHERE id = p_subscription_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Abo nicht gefunden');
  END IF;

  -- Slice 005 Auth-Guard: authenticated callers muessen Owner der Subscription sein
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM v_sub.user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF v_sub.status <> 'active' OR NOT v_sub.auto_renew THEN
    RETURN jsonb_build_object('success', false, 'error', 'Abo nicht aktiv oder Auto-Renew deaktiviert');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_sub.user_id FOR UPDATE;
  IF NOT FOUND OR (v_wallet.balance - COALESCE(v_wallet.locked_balance, 0)) < v_sub.price_cents THEN
    UPDATE club_subscriptions SET status = 'expired', updated_at = now()
    WHERE id = p_subscription_id;
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD — Abo abgelaufen');
  END IF;

  v_new_balance := v_wallet.balance - v_sub.price_cents;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = v_sub.user_id;

  UPDATE club_subscriptions SET
    expires_at = expires_at + INTERVAL '30 days',
    updated_at = now()
  WHERE id = p_subscription_id;

  INSERT INTO transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (v_sub.user_id, -v_sub.price_cents, 'subscription',
    format('Club-Abo Verlängerung (%s)', v_sub.tier), p_subscription_id, v_new_balance);

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'new_expires_at', (v_sub.expires_at + INTERVAL '30 days')::TEXT);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.renew_club_subscription(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.renew_club_subscription(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.renew_club_subscription(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.renew_club_subscription(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.renew_club_subscription(uuid, uuid) IS
  'Slice 005 (2026-04-17): REVOKED authenticated + auth.uid() guard against v_sub.user_id (p_user_id is ignored in body). Cron-only.';

-- -----------------------------------------------------------------------------
-- 4. rpc_lock_event_entry — add guard, REVOKE auth
-- -----------------------------------------------------------------------------
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
      v_balance_after := 0;
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
      v_fee_platform := 0;
      v_fee_beneficiary := 0;
      v_prize_amount := 0;
      v_balance_after := 0;
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

  RETURN jsonb_build_object('ok', true, 'currency', v_event.currency, 'balance_after', v_balance_after);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) TO service_role;

COMMENT ON FUNCTION public.rpc_lock_event_entry(uuid, uuid) IS
  'Slice 005 (2026-04-17): REVOKED authenticated + auth.uid() guard. Client nutzt lock_event_entry(p_event_id) wrapper.';
