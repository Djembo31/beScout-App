-- Slice 317b — apply_referral_code RPC (Folge aus 317 Reviewer-Finding #1)
-- Problem: applyReferralCode (referral.ts) machte client-seitig authenticated .update({invited_by}).
--          invited_by ist im Freeze-Set des Slice-317-Triggers → der Client-Write würde jetzt silent
--          eingefroren (success:true, aber invited_by bleibt NULL) = Silent-Fail-Landmine.
--          (Aktuell dormant: 0 Production-Consumer, nur Tests.)
-- Fix: invited_by-Setzung in SECURITY-DEFINER-RPC (läuft als postgres → Bypass des Freeze-Triggers).
--      Validierung server-seitig (vorher client-seitig = via direktem PostgREST umgehbar): valid-code,
--      self-invite, already-invited. auth.uid() statt Caller-param (keine Cross-User-Setzung).

CREATE OR REPLACE FUNCTION public.apply_referral_code(p_referrer_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_referrer_id uuid;
  v_existing uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  -- Referrer per Code (uppercase) auflösen
  SELECT id INTO v_referrer_id FROM profiles WHERE referral_code = upper(p_referrer_code);
  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalidCode');
  END IF;

  IF v_referrer_id = v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'selfInvite');
  END IF;

  -- Bereits eingeladen?
  SELECT invited_by INTO v_existing FROM profiles WHERE id = v_uid;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'alreadyInvited');
  END IF;

  -- invited_by setzen (SEC DEFINER = postgres → Slice-317-Freeze-Trigger bypassed)
  UPDATE profiles SET invited_by = v_referrer_id WHERE id = v_uid;

  -- Referrer-Airdrop-Refresh läuft via periodischem pg_cron-Job (unverändert).
  RETURN jsonb_build_object('success', true);
END;
$function$;

-- AR-44: CREATE OR REPLACE resettet Privilegien → explizit REVOKE + GRANT.
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_referral_code(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_referral_code(text) TO authenticated;
