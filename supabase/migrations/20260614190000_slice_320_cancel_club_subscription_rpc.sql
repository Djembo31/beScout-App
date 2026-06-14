-- Slice 320 — cancel_club_subscription RPC (S7 Phase-2 P1-Demo Club #4)
-- Problem: cancelSubscription (clubSubscriptions.ts) machte direkten RLS-.update() auf
--          club_subscriptions, das aber NUR SELECT-Policies hat (keine UPDATE-Policy)
--          → Update stumm geblockt (0 rows, kein Error) = Silent-No-Op. Feature dormant.
-- Fix: SEC-DEFINER-RPC (läuft als postgres → kann updaten), auth.uid()-basiert, discriminated.
--      Muster identisch Slice 317b apply_referral_code.

CREATE OR REPLACE FUNCTION public.cancel_club_subscription(p_club_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_count int;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  UPDATE club_subscriptions
     SET auto_renew = false, updated_at = now()
   WHERE user_id = v_uid AND club_id = p_club_id AND status = 'active';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  IF v_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_active_subscription');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- AR-44: CREATE OR REPLACE resettet Privilegien → explizit REVOKE + GRANT.
REVOKE EXECUTE ON FUNCTION public.cancel_club_subscription(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cancel_club_subscription(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.cancel_club_subscription(uuid) TO authenticated;
