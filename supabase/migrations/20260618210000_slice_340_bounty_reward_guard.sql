-- Slice 340: create_user_bounty Reward-Guard an bounties_reward_cents_check (500–100000) angleichen.
-- Source-of-truth: Live pg_get_functiondef @ 2026-06-18 (D87). Body byte-identisch erhalten,
-- NUR der Amount-Guard-Block angeglichen:
--   alt: IF p_reward_cents < 100 → 'Mindestbetrag: 1 $SCOUT' (zu niedrig, kein Max-Guard)
--   neu: < 500 → '5 $SCOUT' + > 100000 → 'Maximum: 1.000 $SCOUT' (= CHECK-Band)
-- CEO-Entscheid (Anil 2026-06-18): Max 1.000 $SCOUT / 100.000 cents ist korrekt (CHECK gewinnt).
-- Effekt: reward 100–499 cents / >100000 cents lieferte vorher rohen 23514; jetzt sauberer
-- discriminated {success:false,error}. Geld war durch CHECK ohnehin geschützt (kein Overspend).

CREATE OR REPLACE FUNCTION public.create_user_bounty(
  p_user_id uuid, p_club_id uuid, p_club_name text, p_title text, p_description text,
  p_reward_cents bigint, p_deadline_days integer, p_max_submissions integer,
  p_player_id uuid DEFAULT NULL::uuid
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_wallet RECORD;
  v_available BIGINT;
  v_deadline TIMESTAMPTZ;
  v_bounty_id UUID;
BEGIN
  -- Auth guard
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- Amount guard (Slice 340: an bounties_reward_cents_check 500–100000 angeglichen)
  IF p_reward_cents < 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mindestbetrag: 5 $SCOUT');
  END IF;
  IF p_reward_cents > 100000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Maximum: 1.000 $SCOUT');
  END IF;

  -- Lock wallet (FOR UPDATE prevents race condition)
  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Wallet nicht gefunden');
  END IF;

  v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
  IF v_available < p_reward_cents THEN
    RETURN jsonb_build_object('success', false, 'error',
      'Nicht genug $SCOUT. Verfügbar: ' || (v_available / 100)::TEXT);
  END IF;

  -- Lock funds
  UPDATE wallets SET
    locked_balance = COALESCE(locked_balance, 0) + p_reward_cents,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Create bounty
  v_deadline := now() + (p_deadline_days || ' days')::INTERVAL;
  INSERT INTO bounties (club_id, club_name, created_by, title, description,
    reward_cents, deadline_at, max_submissions, player_id, type, is_user_bounty)
  VALUES (p_club_id, p_club_name, p_user_id, p_title, p_description,
    p_reward_cents, v_deadline, p_max_submissions, p_player_id, 'general', true)
  RETURNING id INTO v_bounty_id;

  RETURN jsonb_build_object('success', true, 'bounty_id', v_bounty_id);
END; $function$;

-- AR-44: CREATE OR REPLACE resettet Privilegien → REVOKE/GRANT renew auf der 9-arg-Signatur.
REVOKE EXECUTE ON FUNCTION public.create_user_bounty(uuid,uuid,text,text,text,bigint,integer,integer,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_user_bounty(uuid,uuid,text,text,text,bigint,integer,integer,uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_user_bounty(uuid,uuid,text,text,text,bigint,integer,integer,uuid) TO authenticated;
