-- =============================================================================
-- AR-53 (J7, 2026-04-15) — Full REVOKE-Sweep für Mission+Streak-RPCs
--
-- PROBLEM:
--   assign_user_missions + record_login_streak sind bereits via AR-50/AR-51
--   durch. Aber 2 weitere haben noch anon grants live:
--     - claim_mission_reward
--     - track_my_mission_progress
--   Bei nächstem CREATE OR REPLACE droht anon-grant-reset (AR-44-Pattern).
--
-- FIX:
--   DO-Block iteriert durch beide RPCs, setzt REVOKE + GRANT authenticated.
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('claim_mission_reward','track_my_mission_progress')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
  END LOOP;
END $$;
