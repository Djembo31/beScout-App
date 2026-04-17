-- Slice 036 — sync_event_statuses Permission-Denied Fix
--
-- Problem: /api/events route ruft sync_event_statuses mit anon-key client.
-- RPC body forderet auth.uid() IS NOT NULL UND admin → fail BEFORE body even runs
-- (kein anon GRANT). Folge: 42501 permission denied wiederholt in postgres-Logs.
--
-- Fix:
-- 1. _sync_event_statuses_internal(): no guards, service_role only (cron + future internal)
-- 2. Public sync_event_statuses() behaelt admin-guard fuer manuelle admin-call
--    (Admin-Panel button), delegiert an internal
-- 3. pg_cron schedule alle 1 min calls internal — replaces the broken API-route call
-- 4. /api/events sync-call wird in separater frontend-commit entfernt

-- ============================================================
-- 1. Internal helper (no guards)
-- ============================================================
CREATE OR REPLACE FUNCTION public._sync_event_statuses_internal()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Registering/Upcoming -> Running (Start-Zeit vorbei)
  UPDATE events
  SET status = 'running'
  WHERE status IN ('upcoming', 'registering', 'late-reg')
    AND starts_at <= NOW()
    AND (ends_at IS NULL OR ends_at > NOW());

  -- Running -> Ended (End-Zeit vorbei)
  UPDATE events
  SET status = 'ended'
  WHERE status = 'running'
    AND ends_at IS NOT NULL
    AND ends_at <= NOW();
END;
$function$;

REVOKE ALL ON FUNCTION public._sync_event_statuses_internal() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._sync_event_statuses_internal() FROM anon;
REVOKE ALL ON FUNCTION public._sync_event_statuses_internal() FROM authenticated;
GRANT EXECUTE ON FUNCTION public._sync_event_statuses_internal() TO service_role;

COMMENT ON FUNCTION public._sync_event_statuses_internal()
IS 'Slice 036 internal helper. NO guards. Service-role only. Used by cron + future internal callers.';

-- ============================================================
-- 2. Public wrapper (with admin guard)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_event_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'admin_required: Keine Berechtigung';
  END IF;
  PERFORM public._sync_event_statuses_internal();
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.sync_event_statuses() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_event_statuses() FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_event_statuses() TO authenticated;

COMMENT ON FUNCTION public.sync_event_statuses()
IS 'Slice 036 public wrapper with admin-guard. For manual admin-driven sync (Admin Panel). Cron uses _sync_event_statuses_internal directly.';

-- ============================================================
-- 3. Cron-wrapper RPC (separated for monitoring)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cron_sync_event_statuses()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_running_now INT;
  v_ended_now INT;
BEGIN
  -- Snapshot pre-counts
  SELECT count(*) INTO v_running_now FROM events WHERE status = 'running';
  SELECT count(*) INTO v_ended_now FROM events WHERE status = 'ended';

  PERFORM public._sync_event_statuses_internal();

  -- Snapshot post-counts (for monitoring delta)
  RETURN jsonb_build_object(
    'success', true,
    'running_before', v_running_now,
    'ended_before', v_ended_now,
    'running_after', (SELECT count(*) FROM events WHERE status = 'running'),
    'ended_after', (SELECT count(*) FROM events WHERE status = 'ended'),
    'ran_at', NOW()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'ran_at', NOW());
END;
$function$;

REVOKE ALL ON FUNCTION public.cron_sync_event_statuses() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cron_sync_event_statuses() FROM anon;
REVOKE ALL ON FUNCTION public.cron_sync_event_statuses() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cron_sync_event_statuses() TO service_role;

COMMENT ON FUNCTION public.cron_sync_event_statuses()
IS 'Slice 036 cron wrapper. Returns jsonb with pre/post counts for monitoring via cron.job_run_details. Service-role only.';

-- ============================================================
-- 4. Schedule cron job (every minute)
-- ============================================================
SELECT cron.schedule(
  'sync-event-statuses',
  '* * * * *',  -- every minute
  $$SELECT public.cron_sync_event_statuses();$$
);
