-- Slice 329 — Club-Treasury-Fundament: append-only Ledger + Saldo + Einnahmen-Verbuchung + Abo-Bug-Fix
-- D83 + worklog/concepts/csf-club-treasury-model.md §8. CEO-approved 2026-06-17:
--   Q1 = Eröffnungssaldo-Snapshot · Q2 = Backend-only (UI→329b) · Q3 = Pre-Migration-Abo-Verlust akzeptiert.
-- Design: trigger-zentrisch (D39). trades-Trigger fängt alle Trade/IPO/P2P-Income ohne RPC-Edit;
--   nur 2 Sub-RPCs + get_club_balance editiert (Slice-156 PATCH-AUDIT: Baseline = live pg_get_functiondef 2026-06-17).
-- Scope: credits only (REIN). Debits (CSF/Fan-Rewards/Withdrawal→Ledger) = Slice 330+ (Schema unterstützt debit).
-- treasury_balance_cents bleibt Legacy-Dead-Write (Cleanup eigener Slice).

-- ============================================================
-- 1. Ledger-Tabelle (Mirror transactions append-only, Slice 179)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.club_treasury_ledger (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id       uuid NOT NULL REFERENCES public.clubs(id),
  direction     text NOT NULL CHECK (direction IN ('credit','debit')),
  type          text NOT NULL CHECK (type IN (
                  -- REIN (Slice 329):
                  'trade_fee','ipo_fee','p2p_fee','subscription','opening_trade_fees','opening_subscription','deposit',
                  -- RAUS (Slice 330+ vorgehalten):
                  'withdrawal','csf','fan_reward','event_prize','poll_reward','bounty')),
  amount        bigint NOT NULL CHECK (amount > 0),  -- immer positiv; direction trägt das Vorzeichen
  balance_after bigint NOT NULL,
  reference_id  uuid,                                -- trade_id / subscription_id / ...
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_treasury_ledger_club_created
  ON public.club_treasury_ledger (club_id, created_at DESC, id DESC);

COMMENT ON TABLE public.club_treasury_ledger IS
  'Slice 329: append-only Kontoauszug des Club-Treasury. Saldo = SUM(credit)-SUM(debit) bzw. letzter balance_after. Pflege NUR via book_club_treasury(). UPDATE/DELETE Trigger-geblockt.';

-- ============================================================
-- 2. RLS — default-deny für Client-Rollen; nur SECURITY-DEFINER-RPCs (owner) lesen
-- ============================================================
ALTER TABLE public.club_treasury_ledger ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.club_treasury_ledger FROM anon, authenticated;
-- Keine permissive Policy → kein Client-Direktzugriff. get_club_balance (SECURITY DEFINER) liest als owner.

-- ============================================================
-- 3. Append-only-Enforcement (D39 Trigger+GUC-Pattern)
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_treasury_ledger_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_setting('bescout.allow_treasury_mutation', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'club_treasury_ledger_append_only: UPDATE/DELETE nicht erlaubt (Slice 329). Bypass: SET LOCAL bescout.allow_treasury_mutation = true.'
    USING ERRCODE = 'unique_violation';
END; $$;

DROP TRIGGER IF EXISTS trg_treasury_ledger_append_only ON public.club_treasury_ledger;
CREATE TRIGGER trg_treasury_ledger_append_only
  BEFORE UPDATE OR DELETE ON public.club_treasury_ledger
  FOR EACH ROW EXECUTE FUNCTION public.prevent_treasury_ledger_mutation();

-- ============================================================
-- 4. Buchungs-Helper (Bank-Ledger balance_after-Chain, race-frei via clubs-FOR-UPDATE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_club_treasury(
  p_club_id uuid, p_direction text, p_type text, p_amount bigint,
  p_ref uuid DEFAULT NULL, p_desc text DEFAULT NULL
) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_prev bigint; v_after bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN RETURN NULL; END IF;  -- no-op bei 0
  -- clubs-Zeilen-Lock IST der per-Club Serialisierungspunkt für die balance_after-Chain.
  -- NICHT entfernen/„optimieren" — ohne ihn racen parallele Buchungen die last-row-Lesung.
  PERFORM 1 FROM clubs WHERE id = p_club_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'book_club_treasury: club % nicht gefunden', p_club_id; END IF;
  SELECT balance_after INTO v_prev FROM club_treasury_ledger
    WHERE club_id = p_club_id ORDER BY created_at DESC, id DESC LIMIT 1;  -- HINWEIS: in slice_329b → SUM gehärtet
  v_after := COALESCE(v_prev, 0) + (CASE WHEN p_direction = 'debit' THEN -p_amount ELSE p_amount END);
  INSERT INTO club_treasury_ledger (club_id, direction, type, amount, balance_after, reference_id, description)
  VALUES (p_club_id, p_direction, p_type, p_amount, v_after, p_ref, p_desc);
  RETURN v_after;
END; $$;
REVOKE ALL ON FUNCTION public.book_club_treasury(uuid,text,text,bigint,uuid,text) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 5. trades AFTER INSERT → Club-Treasury-credit (fängt alle 4 Trade-RPCs + IPO + P2P ohne RPC-Edit)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_trades_book_club_treasury()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_club_id uuid;
BEGIN
  IF NEW.club_fee IS NULL OR NEW.club_fee <= 0 THEN RETURN NEW; END IF;
  SELECT club_id INTO v_club_id FROM players WHERE id = NEW.player_id;
  IF v_club_id IS NULL THEN RETURN NEW; END IF;  -- Spieler ohne Club → kein Club-Income
  -- Slice 329: bewusst grob als 'trade_fee' (auch IPO-85% + P2P-0,5% laufen über trades.club_fee).
  -- Semantik = identisch zur alten SUM(trades.club_fee). Feinere ipo_fee/p2p_fee-Labels (CHECK vorgehalten)
  -- = optionaler Audit-Komfort für einen Folge-Slice, kein Balance-Effekt.
  PERFORM public.book_club_treasury(v_club_id, 'credit', 'trade_fee', NEW.club_fee, NEW.id, 'Trade-Fee');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_trades_treasury_credit ON public.trades;
CREATE TRIGGER trg_trades_treasury_credit
  AFTER INSERT ON public.trades
  FOR EACH ROW EXECUTE FUNCTION public.trg_trades_book_club_treasury();

-- ============================================================
-- 6. Backfill — Eröffnungssaldo-Snapshot (2 credits/Club; 0-Werte geskippt)
--    Läuft NACH dem trades-Trigger (Trigger feuert nur auf künftige trade-INSERTs, nicht auf Bestand).
-- ============================================================
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.id AS club_id,
      COALESCE((SELECT SUM(t.club_fee) FROM trades t JOIN players p ON p.id = t.player_id
                WHERE p.club_id = c.id), 0)::bigint AS trade_fees,  -- SUM(bigint)=numeric → bigint-Cast für book_club_treasury-Signatur
      COALESCE((SELECT SUM(s.price_cents) FROM club_subscriptions s
                WHERE s.club_id = c.id AND s.status = 'active'), 0)::bigint AS sub_rev
    FROM clubs c
    WHERE NOT EXISTS (SELECT 1 FROM club_treasury_ledger l WHERE l.club_id = c.id)  -- idempotent: nur Clubs ohne Ledger-Zeilen
  LOOP
    IF r.trade_fees > 0 THEN
      PERFORM public.book_club_treasury(r.club_id, 'credit', 'opening_trade_fees', r.trade_fees, NULL,
        'Eröffnungssaldo Trade/IPO/P2P-Fees (Slice 329 Migration)');
    END IF;
    IF r.sub_rev > 0 THEN
      PERFORM public.book_club_treasury(r.club_id, 'credit', 'opening_subscription', r.sub_rev, NULL,
        'Eröffnungssaldo aktive Abos (Slice 329 Migration)');
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 7. get_club_balance — liest jetzt aus dem Ledger (5 Keys backward-compat)
--    Baseline: live pg_get_functiondef 2026-06-17 (auth+admin-Guard 1:1 erhalten).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_club_balance(p_club_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_is_club_admin boolean;
  v_is_platform_admin boolean;
  v_trade_fees bigint;
  v_sub_revenue bigint;
  v_total_earned bigint;
  v_total_withdrawn bigint;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'auth_required: Nicht authentifiziert'; END IF;

  SELECT EXISTS(SELECT 1 FROM club_admins WHERE club_id = p_club_id AND user_id = v_caller) INTO v_is_club_admin;
  SELECT EXISTS(SELECT 1 FROM platform_admins WHERE user_id = v_caller) INTO v_is_platform_admin;
  IF NOT (v_is_club_admin OR v_is_platform_admin) THEN
    RAISE EXCEPTION 'not_authorized: Kein Club-Admin oder Platform-Admin';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_trade_fees FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'credit'
      AND type IN ('trade_fee','ipo_fee','p2p_fee','opening_trade_fees');

  SELECT COALESCE(SUM(amount), 0) INTO v_sub_revenue FROM club_treasury_ledger
    WHERE club_id = p_club_id AND direction = 'credit'
      AND type IN ('subscription','opening_subscription');

  v_total_earned := v_trade_fees + v_sub_revenue;  -- gross credits (diese Slice = Saldo, keine debits)

  SELECT COALESCE(SUM(amount_cents), 0) INTO v_total_withdrawn FROM club_withdrawals
    WHERE club_id = p_club_id AND status IN ('pending','approved','paid');

  RETURN json_build_object(
    'total_earned', v_total_earned,
    'trade_fees', v_trade_fees,
    'sub_revenue', v_sub_revenue,
    'total_withdrawn', v_total_withdrawn,
    'available', v_total_earned - v_total_withdrawn
  );
END; $$;
-- Slice-156 PATCH-AUDIT: Baseline-Grants 1:1 erhalten (live verifiziert 2026-06-17: authenticated+postgres+service_role)
REVOKE ALL ON FUNCTION public.get_club_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_club_balance(uuid) TO authenticated, postgres, service_role;

-- ============================================================
-- 8. Abo-Bug-Fix — Sub-Zahlungen als permanenten Club-credit buchen
--    (Baseline: live pg_get_functiondef 2026-06-17; +1 book_club_treasury-Zeile nach der Zahlung)
-- ============================================================
CREATE OR REPLACE FUNCTION public.subscribe_to_club(p_user_id uuid, p_club_id uuid, p_tier text, p_idempotency_key text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_price BIGINT;
  v_wallet RECORD;
  v_existing RECORD;
  v_sub_id UUID;
  v_new_balance BIGINT;
  v_result JSONB;
  v_dedup_new BOOLEAN;
  v_dedup_cached JSONB;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  CASE p_tier
    WHEN 'bronze' THEN v_price := 50000;
    WHEN 'silber' THEN v_price := 150000;
    WHEN 'gold'   THEN v_price := 300000;
    ELSE RETURN jsonb_build_object('success', false, 'error', 'Ungültiger Tier: ' || p_tier);
  END CASE;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT is_new, existing_response INTO v_dedup_new, v_dedup_cached
    FROM public.check_or_reserve_dedup_key(p_user_id, p_idempotency_key, 300);

    IF NOT v_dedup_new THEN
      IF v_dedup_cached IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'idempotency_pending', 'idempotent_replay', true);
      END IF;
      RETURN v_dedup_cached;
    END IF;
  END IF;

  SELECT * INTO v_existing FROM club_subscriptions
  WHERE user_id = p_user_id AND club_id = p_club_id AND status = 'active'
  FOR UPDATE;

  IF FOUND THEN
    IF p_idempotency_key IS NULL
       AND v_existing.tier = p_tier
       AND v_existing.started_at > NOW() - INTERVAL '60 seconds'
    THEN
      SELECT balance INTO v_new_balance FROM wallets WHERE user_id = p_user_id;
      RETURN jsonb_build_object(
        'success', true,
        'subscription_id', v_existing.id,
        'tier', v_existing.tier,
        'price_cents', v_existing.price_cents,
        'expires_at', v_existing.expires_at::TEXT,
        'new_balance', COALESCE(v_new_balance, 0),
        'idempotent_retry', true
      );
    END IF;

    UPDATE club_subscriptions SET status = 'cancelled', updated_at = now()
    WHERE id = v_existing.id;
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR (v_wallet.balance - COALESCE(v_wallet.locked_balance, 0)) < v_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD. Benötigt: ' || (v_price / 100)::TEXT || ' BSD');
  END IF;

  v_new_balance := v_wallet.balance - v_price;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  INSERT INTO club_subscriptions (user_id, club_id, tier, price_cents, expires_at)
  VALUES (p_user_id, p_club_id, p_tier, v_price, now() + INTERVAL '30 days')
  ON CONFLICT (user_id, club_id) DO UPDATE SET
    tier = p_tier,
    price_cents = v_price,
    status = 'active',
    expires_at = now() + INTERVAL '30 days',
    auto_renew = true,
    started_at = now(),
    updated_at = now()
  RETURNING id INTO v_sub_id;

  INSERT INTO transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (p_user_id, -v_price, 'subscription',
    format('Club-Abo (%s) für 30 Tage', p_tier), v_sub_id, v_new_balance);

  -- Slice 329: Club-Treasury permanent gutschreiben (fixt Abo-Bug — verdient bleibt gebucht)
  PERFORM public.book_club_treasury(p_club_id, 'credit', 'subscription', v_price, v_sub_id,
    format('Club-Abo (%s)', p_tier));

  v_result := jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'tier', p_tier,
    'price_cents', v_price,
    'expires_at', (now() + INTERVAL '30 days')::TEXT,
    'new_balance', v_new_balance
  );

  IF p_idempotency_key IS NOT NULL THEN
    UPDATE public.request_dedup_keys
    SET response = v_result, status = 'completed'
    WHERE user_id = p_user_id AND dedup_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$function$;
-- Slice-156 PATCH-AUDIT: Baseline-Grants 1:1 (live: authenticated+postgres+service_role)
REVOKE ALL ON FUNCTION public.subscribe_to_club(uuid,uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.subscribe_to_club(uuid,uuid,text,text) TO authenticated, postgres, service_role;

CREATE OR REPLACE FUNCTION public.renew_club_subscription(p_user_id uuid, p_subscription_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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

  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM v_sub.user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF v_sub.status <> 'active' OR NOT v_sub.auto_renew THEN
    RETURN jsonb_build_object('success', false, 'error', 'Abo nicht aktiv oder Auto-Renew deaktiviert');
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = v_sub.user_id FOR UPDATE;
  IF NOT FOUND OR (v_wallet.balance - COALESCE(v_wallet.locked_balance, 0)) < v_sub.price_cents THEN
    UPDATE club_subscriptions SET status = 'expired', updated_at = now() WHERE id = p_subscription_id;
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD — Abo abgelaufen');
  END IF;

  v_new_balance := v_wallet.balance - v_sub.price_cents;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = v_sub.user_id;
  UPDATE club_subscriptions SET expires_at = expires_at + INTERVAL '30 days', updated_at = now() WHERE id = p_subscription_id;

  INSERT INTO transactions (user_id, amount, type, description, reference_id, balance_after)
  VALUES (v_sub.user_id, -v_sub.price_cents, 'subscription', format('Club-Abo Verlängerung (%s)', v_sub.tier), p_subscription_id, v_new_balance);

  -- Slice 329: Club-Treasury permanent gutschreiben (Renewal = neue Zahlung)
  PERFORM public.book_club_treasury(v_sub.club_id, 'credit', 'subscription', v_sub.price_cents, p_subscription_id,
    format('Club-Abo Verlängerung (%s)', v_sub.tier));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'new_expires_at', (v_sub.expires_at + INTERVAL '30 days')::TEXT);
END;
$function$;
-- Slice-156 PATCH-AUDIT: renew ist CRON-ONLY (Baseline 20260417 auth_guard_hardening, CEO-locked).
-- Live verifiziert 2026-06-17: NUR postgres+service_role, KEIN authenticated. Intent 1:1 erhalten.
REVOKE ALL ON FUNCTION public.renew_club_subscription(uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renew_club_subscription(uuid,uuid) TO postgres, service_role;
