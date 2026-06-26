-- Slice 396 — User-Events Geld-Kern (E-4a), Modell V3 (D108-Korrektur)
-- Money/CEO (§3). Ersteller zahlt nur Erstell-Gebühr (→ Topf); Pot = Σ Eintritte; kein Seed.
-- Trigger (escrow/settle/resync) bleiben UNANGETASTET — sie no-oppen für type='user'
-- (kein Branch trifft + prize_escrowed=false). PATCH-AUDIT: score_event nicht-user-Zweige byte-identisch.

-- ════════════════════════════════════════════════════════════════════
-- W1 — Schema, CHECK-Widen, Config, Schalter
-- ════════════════════════════════════════════════════════════════════

-- 1a. events.type += 'user'
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_type_check;
ALTER TABLE public.events ADD CONSTRAINT events_type_check
  CHECK (type = ANY (ARRAY['bescout'::text,'club'::text,'sponsor'::text,'special'::text,'user'::text]));

-- 1b. events.min_entries (optional Mindest-Teilnehmerzahl)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS min_entries integer;
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_min_entries_check;
ALTER TABLE public.events ADD CONSTRAINT events_min_entries_check
  CHECK (min_entries IS NULL OR min_entries >= 1);

-- 1c. transactions.type-CHECK widen: event_entry_lock (B2-FIX — fehlte, obwohl rpc_lock_event_entry ihn schreibt!)
--     + event_entry_charge (Settle-Spend) + event_create_fee (Erstell-Gebühr)
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
  CHECK (type = ANY (ARRAY[
    'deposit','welcome_bonus','admin_adjustment','tier_bonus','trade_buy','trade_sell','ipo_buy',
    'order_cancel','offer_lock','offer_unlock','offer_execute','offer_sell','offer_buy','mission_reward',
    'streak_reward','liga_reward','mystery_box_reward','tip_send','tip_receive','subscription','founding_pass',
    'bounty_cost','bounty_reward','research_unlock','research_earn','referral_reward','poll_vote_cost','poll_earn',
    'withdrawal','vote_fee','ad_revenue_payout','creator_fund_payout','event_entry_unlock','scout_subscription',
    'scout_subscription_earning','pbt_liquidation','success_fee',
    'event_entry_lock','event_entry_charge','event_create_fee','fantasy_reward'
  ]::text[]));

-- 1d. platform_treasury_ledger.source-CHECK widen: event_create_fee + event_entry_fee
ALTER TABLE public.platform_treasury_ledger DROP CONSTRAINT IF EXISTS platform_treasury_ledger_source_check;
ALTER TABLE public.platform_treasury_ledger ADD CONSTRAINT platform_treasury_ledger_source_check
  CHECK (source = ANY (ARRAY[
    'trading','ipo','poll','research','bounty','p2p','monthly_liga','bescout_event','special_event','genesis',
    'event_create_fee','event_entry_fee'
  ]::text[]));

-- 1e. event_fee_config('user') — Eintritt 100 % → Pot (kein Plattform-/Beneficiary-Schnitt)
ALTER TABLE public.event_fee_config DROP CONSTRAINT IF EXISTS chk_event_type;
ALTER TABLE public.event_fee_config ADD CONSTRAINT chk_event_type
  CHECK (event_type = ANY (ARRAY['bescout'::text,'club'::text,'sponsor'::text,'special'::text,'creator'::text,'user'::text]));
INSERT INTO public.event_fee_config (event_type, platform_pct, beneficiary_pct)
VALUES ('user', 0, 0)
ON CONFLICT (event_type) DO UPDATE SET platform_pct = 0, beneficiary_pct = 0;

-- 1f. platform_event_config — Singleton, admin-steuerbare Erstell-Gebühr (Default 5000 cents = 50 Cr)
CREATE TABLE IF NOT EXISTS public.platform_event_config (
  id boolean PRIMARY KEY DEFAULT true,
  user_event_create_fee_cents bigint NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT platform_event_config_singleton CHECK (id = true),
  CONSTRAINT user_event_create_fee_nonneg CHECK (user_event_create_fee_cents >= 0)
);
INSERT INTO public.platform_event_config (id) VALUES (true) ON CONFLICT (id) DO NOTHING;
-- RLS: 0 Policies (nur via SECURITY DEFINER RPCs erreichbar — Spiegel platform_treasury)
ALTER TABLE public.platform_event_config ENABLE ROW LEVEL SECURITY;

-- 1g. Schalter scout_events_enabled global an (B1) — sonst bricht rpc_lock_event_entry mit scout_events_disabled
UPDATE public.platform_settings SET value = 'true'::jsonb, updated_at = now()
  WHERE key = 'scout_events_enabled';
INSERT INTO public.platform_settings (key, value)
  SELECT 'scout_events_enabled', 'true'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings WHERE key = 'scout_events_enabled');

-- ════════════════════════════════════════════════════════════════════
-- W1 — Fee-Setter (platform_admin-Gate, AR-44 anon-REVOKE)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_user_event_create_fee(p_cents bigint)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;
  IF p_cents IS NULL OR p_cents < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_amount');
  END IF;
  UPDATE platform_event_config
    SET user_event_create_fee_cents = p_cents, updated_at = now(), updated_by = auth.uid()
    WHERE id = true;
  RETURN jsonb_build_object('ok', true, 'fee_cents', p_cents);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.set_user_event_create_fee(bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_user_event_create_fee(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_user_event_create_fee(bigint) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- W2 — create_user_event (Gebühr→Topf, KEIN Seed, prize_pool=0, prize_escrowed=false)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_user_event(
  p_user_id uuid,
  p_name text,
  p_entry_fee bigint,
  p_gameweek integer,
  p_locks_at timestamptz,
  p_reward_structure jsonb,
  p_min_entries integer DEFAULT NULL,
  p_max_entries integer DEFAULT NULL,
  p_league_id uuid DEFAULT NULL,
  p_lineup_rules jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_fee bigint;
  v_wallet RECORD;
  v_available bigint;
  v_pct_sum numeric;
  v_event_id uuid;
  v_bal_after bigint;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_uid_mismatch');
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'name_required');
  END IF;
  IF p_entry_fee IS NULL OR p_entry_fee < 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_entry_fee');
  END IF;
  IF p_gameweek IS NULL OR p_gameweek < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_gameweek');
  END IF;
  IF p_locks_at IS NULL OR p_locks_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_locks_at');
  END IF;
  IF p_reward_structure IS NULL OR jsonb_typeof(p_reward_structure) <> 'array'
     OR jsonb_array_length(p_reward_structure) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_reward_structure');
  END IF;
  SELECT COALESCE(SUM((elem->>'pct')::numeric), 0) INTO v_pct_sum
    FROM jsonb_array_elements(p_reward_structure) elem;
  IF v_pct_sum <> 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'reward_structure_not_100', 'sum', v_pct_sum);
  END IF;
  IF p_min_entries IS NOT NULL AND p_min_entries < 1 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_min_entries');
  END IF;
  IF p_min_entries IS NOT NULL AND p_max_entries IS NOT NULL AND p_min_entries > p_max_entries THEN
    RETURN jsonb_build_object('ok', false, 'error', 'min_gt_max');
  END IF;

  SELECT user_event_create_fee_cents INTO v_fee FROM platform_event_config WHERE id = true;
  v_fee := COALESCE(v_fee, 5000);

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
  END IF;
  v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
  IF v_available < v_fee THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance', 'have', v_available, 'need', v_fee);
  END IF;

  -- Event zuerst anlegen (für reference_id der Gebühr-Buchung)
  INSERT INTO events (
    type, name, status, currency, ticket_cost, entry_fee, prize_pool, prize_escrowed,
    gameweek, starts_at, locks_at, reward_structure, min_entries, max_entries,
    created_by, club_id, league_id, lineup_rules
  ) VALUES (
    'user', trim(p_name), 'registering', 'scout', p_entry_fee, p_entry_fee, 0, false,
    p_gameweek, now(), p_locks_at, p_reward_structure, p_min_entries, p_max_entries,
    p_user_id, NULL, p_league_id, p_lineup_rules
  ) RETURNING id INTO v_event_id;

  IF v_fee > 0 THEN
    UPDATE wallets SET balance = balance - v_fee, updated_at = now() WHERE user_id = p_user_id;
    v_bal_after := v_wallet.balance - v_fee;
    INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
      VALUES (p_user_id, 'event_create_fee', v_fee, v_bal_after, v_event_id, 'Event-Erstellung: ' || trim(p_name));
    PERFORM book_platform_treasury('credit', 'event_create_fee', v_fee, v_event_id,
      'User-Event Erstell-Gebühr: ' || trim(p_name));
  END IF;

  RETURN jsonb_build_object('ok', true, 'event_id', v_event_id, 'fee_charged', v_fee);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.create_user_event(uuid,text,bigint,integer,timestamptz,jsonb,integer,integer,uuid,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_event(uuid,text,bigint,integer,timestamptz,jsonb,integer,integer,uuid,jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_user_event(uuid,text,bigint,integer,timestamptz,jsonb,integer,integer,uuid,jsonb) TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- W2 — cancel_user_event (Auth: created_by ODER platform_admin; Refund Eintritte; KEIN Seed)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cancel_user_event(p_event_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_event RECORD; v_entry RECORD; v_refunded int := 0;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'event_not_found'); END IF;
  IF v_event.type <> 'user' THEN RETURN jsonb_build_object('ok', false, 'error', 'not_user_event'); END IF;
  IF auth.uid() IS NULL
     OR (auth.uid() IS DISTINCT FROM v_event.created_by
         AND NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authorized');
  END IF;
  IF v_event.status NOT IN ('registering', 'late-reg') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_open');
  END IF;

  FOR v_entry IN SELECT user_id, amount_locked FROM event_entries
                 WHERE event_id = p_event_id AND currency = 'scout' AND amount_locked > 0 LOOP
    UPDATE wallets
      SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_entry.amount_locked), updated_at = now()
      WHERE user_id = v_entry.user_id;
    INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
    SELECT v_entry.user_id, 'event_entry_unlock', v_entry.amount_locked,
           (w.balance - COALESCE(w.locked_balance, 0)), p_event_id, 'Event abgesagt: ' || v_event.name
    FROM wallets w WHERE w.user_id = v_entry.user_id;
    v_refunded := v_refunded + 1;
  END LOOP;

  DELETE FROM holding_locks WHERE event_id = p_event_id;
  DELETE FROM event_entries WHERE event_id = p_event_id;
  DELETE FROM lineups WHERE event_id = p_event_id;
  UPDATE events SET status = 'cancelled', current_entries = 0 WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'refunded_count', v_refunded);
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.cancel_user_event(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_user_event(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_user_event(uuid) TO authenticated;
