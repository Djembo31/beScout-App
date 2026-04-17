-- ============================================================
-- Slice 024 (B5) — Event Scoring Automation, part 1/2
--
-- Wrapper-RPC fuer pg_cron: findet events mit abgelaufenem ends_at
-- und noch-nicht-gescored-Status, ruft score_event() idempotent auf.
--
-- CEO-Approved (c) pg_cron am 2026-04-17.
--
-- Selektions-Filter:
--   - status='ended' (schon via event-status-sync transitioniert) ODER
--     status='running' AND ends_at <= NOW() (Race mit 15min-cron)
--   - scored_at IS NULL (idempotency marker)
--   - gameweek IS NOT NULL (score_event requirement)
--
-- Fail-Isolation: Jeder score_event-Aufruf in eigenem BEGIN/EXCEPTION-Block.
-- score_event selbst ist idempotent (checkt scored_at + no_player_game_stats).
--
-- Worst-Case-Delay: gameweek-sync-trigger (30min) + cron-score (5min) = ~35min
-- zwischen Event-Ende und User sieht Reward. Akzeptabel fuer Pilot.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cron_score_pending_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  v_event RECORD;
  v_result JSONB;
  v_scored INT := 0;
  v_skipped INT := 0;
  v_errored INT := 0;
  v_errors JSONB := '[]'::jsonb;
BEGIN
  FOR v_event IN
    SELECT id, name, ends_at, gameweek
    FROM public.events
    WHERE (status = 'ended' OR (status = 'running' AND ends_at <= NOW()))
      AND scored_at IS NULL
      AND gameweek IS NOT NULL
    ORDER BY ends_at ASC
    LIMIT 50  -- safety-bound; typischer Lauf 0-3 events
  LOOP
    BEGIN
      v_result := public.score_event(v_event.id);
      IF (v_result->>'success')::BOOLEAN = true THEN
        v_scored := v_scored + 1;
      ELSE
        v_skipped := v_skipped + 1;
        v_errors := v_errors || jsonb_build_array(jsonb_build_object(
          'event_id', v_event.id,
          'name', v_event.name,
          'reason', COALESCE(v_result->>'error', 'unknown')
        ));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errored := v_errored + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'event_id', v_event.id,
        'name', v_event.name,
        'reason', 'EXCEPTION: ' || SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'scored', v_scored,
    'skipped', v_skipped,
    'errored', v_errored,
    'errors', v_errors,
    'ran_at', NOW()
  );
END;
$function$;

-- AR-44 Block — service_role only, kein Client-Zugriff
REVOKE EXECUTE ON FUNCTION public.cron_score_pending_events() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_score_pending_events() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_score_pending_events() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cron_score_pending_events() TO service_role;

COMMENT ON FUNCTION public.cron_score_pending_events() IS
  'B5 Slice 024: pg_cron Wrapper — scored events mit ends_at <= NOW() und scored_at IS NULL. '
  'Idempotent via score_event internal-Guards. Scheduled */5 * * * *.';
