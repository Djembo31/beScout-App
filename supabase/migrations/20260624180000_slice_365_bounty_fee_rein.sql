-- Slice 365 (E3-2e, D96/D98): Bounty-Plattform-Fee (5 %) REIN in den BeScout-Topf.
-- LETZTE Fee-Quelle der Sequenz „Fees REIN" (358 Trading, 360 IPO, 363 Polls, 364 Research).
-- EINE additive Inline-Buchung vor dem finalen success-RETURN in `approve_bounty_submission`,
-- deckt alle 3 Zahlungspfade (user / club-nonescrow / club-escrow) ohne Doppelbuchung
-- (trg_bounties_settle bewegt bei status='completed' kein Geld, nur Flag-Flip).
-- Fee-Konstante (v_reward * 500) / 10000 unverändert (S356-Klasse). 'bounty' im
-- platform_treasury_ledger_source_check bereits erlaubt -> keine CHECK-Migration.
-- WICHTIG: Header OHNE `SET search_path` (exakter Live-Body-Original, nicht aufhübschen!).
CREATE OR REPLACE FUNCTION public.approve_bounty_submission(p_admin_id uuid, p_submission_id uuid, p_feedback text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
    IF NOT COALESCE(v_bounty.treasury_escrowed, false) THEN
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
  SET status = 'approved', admin_feedback = p_feedback, reviewed_by = p_admin_id,
      reviewed_at = now(), reward_paid = v_creator_net, updated_at = now()
  WHERE id = p_submission_id;
  UPDATE bounties SET status = 'completed', updated_at = now()
  WHERE id = v_sub.bounty_id;
  UPDATE bounty_submissions
  SET status = 'rejected', admin_feedback = 'Automatisch abgelehnt — anderer Beitrag wurde ausgewaehlt',
      reviewed_by = p_admin_id, reviewed_at = now(), updated_at = now()
  WHERE bounty_id = v_sub.bounty_id AND id != p_submission_id AND status = 'pending';
  -- E3-2e (Slice 365): Bounty-Plattform-Fee (5 %) in den BeScout-Topf — voller Auffang (D96/D98).
  -- Deckt alle 3 Zahlungspfade; v_platform_fee oben einmal berechnet; vor success-RETURN.
  IF v_platform_fee > 0 THEN
    PERFORM book_platform_treasury('credit', 'bounty', v_platform_fee, v_sub.bounty_id, 'Bounty-Fee');
  END IF;
  RETURN jsonb_build_object('success', true, 'reward', v_creator_net);
END;
$function$;

-- AR-44: CREATE OR REPLACE resettet Grants → explizit re-setzen.
REVOKE EXECUTE ON FUNCTION public.approve_bounty_submission(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_bounty_submission(uuid,uuid,text) TO authenticated;
