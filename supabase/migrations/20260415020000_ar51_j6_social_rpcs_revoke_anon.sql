-- =============================================================================
-- AR-51 (J6, 2026-04-15) — Social-RPCs Anon-Lockdown (4 RPCs)
--
-- PROBLEM:
--   4 J6-RPCs haben anon=EXECUTE grant live (verified pg_get_function_privileges).
--   Auth.uid()-Guards existieren im Body (defense-in-depth), aber AR-44
--   Template-Pflicht (REVOKE anon + GRANT authenticated) verletzt.
--
-- SCOPE:
--   - follow_user(p_follower_id uuid, p_following_id uuid)
--   - unfollow_user(p_follower_id uuid, p_following_id uuid)
--   - rpc_get_user_social_stats()
--   - refresh_my_stats()
--
-- Bodies unveraendert. Nur Grants.
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public'
      AND p.proname IN ('follow_user','unfollow_user','rpc_get_user_social_stats','refresh_my_stats')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', r.proname, r.args);
    RAISE NOTICE 'AR-51 J6: REVOKE anon + GRANT authenticated on %(%)', r.proname, r.args;
  END LOOP;
END $$;
