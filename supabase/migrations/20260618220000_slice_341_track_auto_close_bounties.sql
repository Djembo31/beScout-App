-- Slice 341 (AR-43): auto_close_expired_bounties() in eine getrackte Migration ziehen.
-- Die Funktion existierte live (vom Cron src/app/api/cron/close-expired-bounties/route.ts
-- aufgerufen), stand aber in KEINER Migration → supabase db reset / Greenfield-CI hätte sie
-- verloren. Body byte-identisch zur Live-pg_get_functiondef @ 2026-06-18 (kein Behavior-Change).

CREATE OR REPLACE FUNCTION public.auto_close_expired_bounties()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bounty RECORD;
BEGIN
  -- Release locked_balance for expired user bounties BEFORE closing
  -- FOR UPDATE prevents race condition with cancel_user_bounty
  FOR v_bounty IN
    SELECT id, created_by, reward_cents
    FROM bounties
    WHERE status = 'open' AND deadline_at < now() AND is_user_bounty = true
    FOR UPDATE
  LOOP
    UPDATE wallets SET
      locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_bounty.reward_cents),
      updated_at = now()
    WHERE user_id = v_bounty.created_by;
  END LOOP;

  -- Close all expired bounties (including non-user bounties)
  UPDATE bounties SET status = 'closed', updated_at = now()
  WHERE status = 'open' AND deadline_at < now();
END;
$function$;

-- AR-44: CREATE OR REPLACE resettet Privilegien → REVOKE/GRANT renew (Live-Stand: anon=false, auth=true).
REVOKE EXECUTE ON FUNCTION public.auto_close_expired_bounties() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.auto_close_expired_bounties() FROM anon;
GRANT EXECUTE ON FUNCTION public.auto_close_expired_bounties() TO authenticated;
