-- Slice 048 Pilot — reward_referral mit i18n_key + i18n_params
-- Spec: worklog/specs/048-tr-i18n-notifications-foundation.md
-- Date: 2026-04-18
--
-- Migration: RPC schreibt zusaetzlich zu title/body (DE fallback) auch
-- i18n_key (notifTemplates-Namespace) + i18n_params (jsonb mit handle).
-- Frontend-Resolver bevorzugt i18n_key wenn vorhanden.

CREATE OR REPLACE FUNCTION public.reward_referral(p_referee_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_referrer_id UUID;
  v_reward BIGINT := 50000; -- 500 bCredits always (no decay for pilot)
  v_referee_reward BIGINT := 25000; -- 250 bCredits always
  v_referee_handle TEXT;
  v_referrer_handle TEXT;
  v_new_balance BIGINT;
  v_referee_balance BIGINT;
BEGIN
  -- Get referrer
  SELECT invited_by INTO v_referrer_id
  FROM profiles WHERE id = p_referee_id;

  IF v_referrer_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'no_referrer');
  END IF;

  -- Idempotent: check if already rewarded for this referee
  IF EXISTS (
    SELECT 1 FROM transactions
    WHERE user_id = v_referrer_id
    AND type = 'referral_reward'
    AND reference_id = p_referee_id
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'already_rewarded');
  END IF;

  -- Get handles for notifications
  SELECT handle INTO v_referee_handle FROM profiles WHERE id = p_referee_id;
  SELECT handle INTO v_referrer_handle FROM profiles WHERE id = v_referrer_id;

  -- ===== REFERRER REWARD (flat 500 for pilot) =====
  UPDATE wallets
  SET balance = balance + v_reward
  WHERE user_id = v_referrer_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (v_referrer_id, 'referral_reward', v_reward, v_new_balance, p_referee_id,
          'Empfehlungsbonus für @' || COALESCE(v_referee_handle, 'unbekannt'));

  -- Slice 048: Structured i18n key + params fuer Client-Resolver (TR-i18n)
  INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type, i18n_key, i18n_params)
  VALUES (v_referrer_id, 'referral_reward',
          'Empfehlungsbonus!',
          '@' || COALESCE(v_referee_handle, 'Jemand') || ' hat den ersten Trade gemacht – du erhältst 500 Credits!',
          p_referee_id, 'profile',
          'referralRewardReferrer',
          jsonb_build_object(
            'refereeHandle', COALESCE(v_referee_handle, 'unbekannt'),
            'amount', 500
          ));

  -- ===== REFEREE REWARD (250 always) =====
  UPDATE wallets
  SET balance = balance + v_referee_reward
  WHERE user_id = p_referee_id
  RETURNING balance INTO v_referee_balance;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (p_referee_id, 'referral_reward', v_referee_reward, v_referee_balance, v_referrer_id,
          'Willkommensbonus — eingeladen von @' || COALESCE(v_referrer_handle, 'unbekannt'));

  INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type, i18n_key, i18n_params)
  VALUES (p_referee_id, 'referral_reward',
          'Willkommensbonus!',
          'Du erhältst 250 Credits für deinen ersten Trade! Eingeladen von @' || COALESCE(v_referrer_handle, 'Jemand'),
          v_referrer_id, 'profile',
          'referralRewardReferee',
          jsonb_build_object(
            'referrerHandle', COALESCE(v_referrer_handle, 'unbekannt'),
            'amount', 250
          ));

  RETURN json_build_object('success', true, 'referrer_id', v_referrer_id, 'reward', v_reward, 'referee_reward', v_referee_reward);
END;
$function$;

COMMENT ON FUNCTION public.reward_referral(uuid) IS
  'Slice 048 / TR-i18n-Pilot: schreibt title/body (DE) + i18n_key + i18n_params fuer Client-Resolver. AR-44 NICHT noetig (p_referee_id ist anderer User — getriggert von trade-flow nicht user-direct).';
