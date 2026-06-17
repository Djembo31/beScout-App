-- Slice 332 — Club-Bounties ans Treasury (Escrow bei Erstellung, Variante A). Mirror Slice 331.
-- Befund (Live-PATCH-AUDIT): Club-Bounty (is_user_bounty=false) zahlt heute der ADMIN aus eigenem Wallet
--   bei Approval (kein Minting). Ziel (Anil A): aus der Vereins-Treasury, Escrow bei Erstellung.
-- User-Bounty (is_user_bounty=true, eigenes Wallet-Escrow) bleibt unangetastet.
-- Design (trigger-zentrisch + 1 Money-RPC-Edit):
--   1) Flag treasury_escrowed (Grandfathering wie events.prize_escrowed).
--   2) BEFORE INSERT: Club-Bounty → Admin-Gate + Treasury-Guard + Debit-Escrow.
--   3) BEFORE UPDATE OF status: cancelled/closed → Refund · completed → flag off (Escrow geliefert).
--   4) BEFORE UPDATE OF reward_cents: Resync (Defense-in-Depth, RLS erlaubt Admin-Update; 331-Finding-#1-Klasse).
--   5) approve_bounty_submission: bei treasury_escrowed=true KEIN Admin-Wallet-Abzug (Treasury hat schon gezahlt).
-- bounties.status hat keinen CHECK (Freitext). Ledger-Typ 'bounty' (debit) in 329-CHECK vorgehalten.

-- ============================================================
-- 1. Flag
-- ============================================================
ALTER TABLE public.bounties ADD COLUMN IF NOT EXISTS treasury_escrowed boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.bounties.treasury_escrowed IS
  'Slice 332: true = Club-Bounty-Reward bei Erstellung aus Club-Treasury debitiert (nur is_user_bounty=false). Gate für Settle/Refund + approve-Payer-Skip.';

-- PREREQ-FIX (Slice 332): bounties_status_check kannte 'completed' NICHT (nur open/closed/cancelled),
-- aber approve_bounty_submission setzt status='completed' → JEDE Bounty-Annahme failt (23514).
-- Latent: 0 approved submissions je. Blockiert den Auszahl-Pfad, den dieser Slice baut. Additiv.
ALTER TABLE public.bounties DROP CONSTRAINT IF EXISTS bounties_status_check;
ALTER TABLE public.bounties ADD CONSTRAINT bounties_status_check
  CHECK (status = ANY (ARRAY['open'::text, 'closed'::text, 'cancelled'::text, 'completed'::text]));

-- ============================================================
-- 2. BEFORE INSERT — Escrow + Admin-Gate (nur Club-Bounty)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_bounties_escrow_reward()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_available bigint;
BEGIN
  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;

  IF NEW.is_user_bounty IS NOT TRUE AND NEW.reward_cents > 0 AND NEW.club_id IS NOT NULL THEN
    -- Identitätsgrenze: nur Club-Admin darf Treasury-finanzierten Club-Bounty anlegen.
    -- auth.uid() IS NOT NULL-Guard lässt service_role/Seed durch, blockt Nicht-Admin-Clients.
    IF auth.uid() IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM club_admins WHERE club_id = NEW.club_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'not_club_admin_for_bounty';
    END IF;

    PERFORM 1 FROM clubs WHERE id = NEW.club_id FOR UPDATE;
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM club_treasury_ledger WHERE club_id = NEW.club_id;
    v_available := v_available - COALESCE((
      SELECT SUM(amount_cents) FROM club_withdrawals
      WHERE club_id = NEW.club_id AND status IN ('pending','approved','paid')), 0);
    IF v_available < NEW.reward_cents THEN
      RAISE EXCEPTION 'treasury_insufficient_for_bounty: benoetigt %, verfuegbar %', NEW.reward_cents, v_available;
    END IF;

    PERFORM public.book_club_treasury(NEW.club_id, 'debit', 'bounty', NEW.reward_cents, NEW.id,
      'Bounty-Escrow: ' || NEW.title);
    NEW.treasury_escrowed := true;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bounties_escrow_reward ON public.bounties;
CREATE TRIGGER trg_bounties_escrow_reward
  BEFORE INSERT ON public.bounties
  FOR EACH ROW EXECUTE FUNCTION public.trg_bounties_escrow_reward();

-- ============================================================
-- 3. BEFORE UPDATE OF status — Settle (cancelled/closed → Refund; completed → flag off)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_bounties_settle()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF OLD.treasury_escrowed AND OLD.reward_cents > 0 AND NEW.club_id IS NOT NULL
     AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status IN ('cancelled','closed') THEN
      -- unbezahlter terminaler Ausgang (completed ist eigener Status) → voller Refund
      PERFORM public.book_club_treasury(NEW.club_id, 'credit', 'bounty', OLD.reward_cents, NEW.id,
        'Bounty-Refund (' || NEW.status || '): ' || NEW.title);
      NEW.treasury_escrowed := false;
    ELSIF NEW.status = 'completed' THEN
      -- bezahlt via approve (Erfüller 95% + 5% Plattformgebühr) → Escrow geliefert, kein Refund
      NEW.treasury_escrowed := false;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bounties_settle ON public.bounties;
CREATE TRIGGER trg_bounties_settle
  BEFORE UPDATE OF status ON public.bounties
  FOR EACH ROW EXECUTE FUNCTION public.trg_bounties_settle();

-- ============================================================
-- 4. BEFORE UPDATE OF reward_cents — Resync (Defense-in-Depth, 331-Finding-#1-Klasse)
--    Hält Escrow = reward_cents, falls reward via RLS-Admin-Update geändert wird (kein App-Pfad heute).
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_bounties_resync_escrow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_target bigint; v_held bigint; v_delta bigint; v_available bigint;
BEGIN
  v_target := CASE WHEN NEW.is_user_bounty IS NOT TRUE AND NEW.reward_cents > 0 AND NEW.club_id IS NOT NULL
                   THEN NEW.reward_cents ELSE 0 END;
  v_held := CASE WHEN OLD.treasury_escrowed THEN OLD.reward_cents ELSE 0 END;
  v_delta := v_target - v_held;

  IF v_delta > 0 THEN
    PERFORM 1 FROM clubs WHERE id = NEW.club_id FOR UPDATE;
    SELECT COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END), 0)
      INTO v_available FROM club_treasury_ledger WHERE club_id = NEW.club_id;
    v_available := v_available - COALESCE((
      SELECT SUM(amount_cents) FROM club_withdrawals
      WHERE club_id = NEW.club_id AND status IN ('pending','approved','paid')), 0);
    IF v_available < v_delta THEN
      RAISE EXCEPTION 'treasury_insufficient_for_bounty: benoetigt %, verfuegbar %', v_delta, v_available;
    END IF;
    PERFORM public.book_club_treasury(NEW.club_id, 'debit', 'bounty', v_delta, NEW.id, 'Bounty-Escrow-Anpassung: ' || NEW.title);
  ELSIF v_delta < 0 THEN
    PERFORM public.book_club_treasury(NEW.club_id, 'credit', 'bounty', -v_delta, NEW.id, 'Bounty-Escrow-Anpassung: ' || NEW.title);
  END IF;

  NEW.treasury_escrowed := (v_target > 0);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_bounties_resync_escrow ON public.bounties;
CREATE TRIGGER trg_bounties_resync_escrow
  BEFORE UPDATE OF reward_cents ON public.bounties
  FOR EACH ROW EXECUTE FUNCTION public.trg_bounties_resync_escrow();

-- ============================================================
-- 5. approve_bounty_submission — bei treasury_escrowed=true KEIN Admin-Wallet-Abzug
--    (Treasury hat bei Erstellung gezahlt). Baseline = live functiondef 2026-06-17. 1:1 erhalten:
--    auth-Guard, club-admin-Check, User-Bounty-Branch, 5%-Fee, completed-Status, auto-reject-others.
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_bounty_submission(p_admin_id uuid, p_submission_id uuid, p_feedback text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  v_sub bounty_submissions%ROWTYPE;
  v_bounty bounties%ROWTYPE;
  v_admin_wallet RECORD;
  v_user_wallet RECORD;
  v_payer_wallet RECORD;
  v_reward BIGINT;
  v_platform_fee BIGINT;
  v_creator_net BIGINT;
  v_payer_id UUID;
  v_payer_new_balance BIGINT;
  v_recipient_new_balance BIGINT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_sub FROM bounty_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Einreichung nicht gefunden');
  END IF;

  IF v_sub.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Einreichung bereits bearbeitet');
  END IF;

  SELECT * INTO v_bounty FROM bounties WHERE id = v_sub.bounty_id FOR UPDATE;

  IF v_bounty.status <> 'open' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Auftrag ist nicht mehr offen');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM club_admins ca
    WHERE ca.club_id = v_bounty.club_id AND ca.user_id = p_admin_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Keine Admin-Berechtigung');
  END IF;

  v_reward := v_bounty.reward_cents;
  v_platform_fee := (v_reward * 500) / 10000;
  v_creator_net := v_reward - v_platform_fee;

  IF v_bounty.is_user_bounty = true THEN
    v_payer_id := v_bounty.created_by;

    SELECT * INTO v_payer_wallet FROM wallets WHERE user_id = v_payer_id FOR UPDATE;
    IF NOT FOUND OR v_payer_wallet.balance < v_reward THEN
      RETURN jsonb_build_object('success', false, 'error', 'Creator-Wallet hat nicht genug BSD');
    END IF;

    UPDATE wallets SET
      balance = balance - v_reward,
      locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_reward),
      updated_at = now()
    WHERE user_id = v_payer_id
    RETURNING balance INTO v_payer_new_balance;

    INSERT INTO transactions (user_id, amount, type, description, balance_after)
    VALUES (v_payer_id, -v_reward, 'bounty_cost',
      'Bounty-Zahlung: ' || v_bounty.title, v_payer_new_balance);
  ELSE
    -- Club-Bounty. Slice 332: bei Treasury-Escrow hat die Vereinskasse bei Erstellung gezahlt → KEIN Payer-Abzug.
    IF NOT COALESCE(v_bounty.treasury_escrowed, false) THEN
      -- Grandfathered (vor Slice 332): Admin zahlt aus eigenem Wallet (wie bisher).
      v_payer_id := p_admin_id;

      SELECT * INTO v_payer_wallet FROM wallets WHERE user_id = v_payer_id FOR UPDATE;
      IF NOT FOUND OR v_payer_wallet.balance < v_reward THEN
        RETURN jsonb_build_object('success', false, 'error', 'Nicht genug BSD im Wallet');
      END IF;

      UPDATE wallets SET balance = balance - v_reward, updated_at = now()
      WHERE user_id = v_payer_id
      RETURNING balance INTO v_payer_new_balance;

      INSERT INTO transactions (user_id, amount, type, description, balance_after)
      VALUES (v_payer_id, -v_reward, 'bounty_cost',
        'Bounty-Zahlung: ' || v_bounty.title, v_payer_new_balance);
    END IF;
  END IF;

  SELECT * INTO v_user_wallet FROM wallets WHERE user_id = v_sub.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User-Wallet nicht gefunden');
  END IF;

  UPDATE wallets SET balance = balance + v_creator_net, updated_at = now()
  WHERE user_id = v_sub.user_id
  RETURNING balance INTO v_recipient_new_balance;

  INSERT INTO transactions (user_id, amount, type, description, balance_after)
  VALUES (v_sub.user_id, v_creator_net, 'bounty_reward',
    format('Bounty-Belohnung: %s (abzgl. 5%% Plattformgebuehr)', v_bounty.title), v_recipient_new_balance);

  UPDATE bounty_submissions
  SET status = 'approved',
      admin_feedback = p_feedback,
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      reward_paid = v_creator_net,
      updated_at = now()
  WHERE id = p_submission_id;

  UPDATE bounties SET status = 'completed', updated_at = now()
  WHERE id = v_sub.bounty_id;

  UPDATE bounty_submissions
  SET status = 'rejected',
      admin_feedback = 'Automatisch abgelehnt — anderer Beitrag wurde ausgewaehlt',
      reviewed_by = p_admin_id,
      reviewed_at = now(),
      updated_at = now()
  WHERE bounty_id = v_sub.bounty_id AND id != p_submission_id AND status = 'pending';

  RETURN jsonb_build_object('success', true, 'reward', v_creator_net);
END;
$function$;
REVOKE ALL ON FUNCTION public.approve_bounty_submission(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_bounty_submission(uuid,uuid,text) TO authenticated, postgres, service_role;
