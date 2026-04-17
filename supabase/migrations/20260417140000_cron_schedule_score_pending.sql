-- ============================================================
-- Slice 024 (B5) — Event Scoring Automation, part 2/2
--
-- Schedules cron_score_pending_events() every 5 minutes.
-- Plus Audit-Helper get_cron_job_schedule() fuer INV-28.
-- ============================================================

-- Audit-Helper: reads cron.job (system schema, not client-accessible)
CREATE OR REPLACE FUNCTION public.get_cron_job_schedule(p_jobname text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, cron, pg_catalog
AS $function$
  SELECT jsonb_build_object(
    'jobname', jobname,
    'schedule', schedule,
    'command', command,
    'active', active
  )
  FROM cron.job
  WHERE jobname = p_jobname
  LIMIT 1;
$function$;

-- AR-44: service_role-only (analog zu get_rpc_source)
REVOKE EXECUTE ON FUNCTION public.get_cron_job_schedule(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_cron_job_schedule(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_cron_job_schedule(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_job_schedule(text) TO service_role;

COMMENT ON FUNCTION public.get_cron_job_schedule(text) IS
  'Audit-Helper fuer CI-Invariants (B5 Slice 024). Liest cron.job fuer benannten Job. Service_role only.';

-- Schedule: unschedule first (idempotent re-apply) then schedule fresh
DO $cron_schedule$
BEGIN
  -- Remove if already exists (idempotent)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'score-pending-events') THEN
    PERFORM cron.unschedule('score-pending-events');
  END IF;

  -- Schedule every 5 minutes
  PERFORM cron.schedule(
    'score-pending-events',
    '*/5 * * * *',
    'SELECT public.cron_score_pending_events();'
  );
END $cron_schedule$;
