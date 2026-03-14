-- Fix: resolve_gameweek_predictions + calculate_dpc_of_week
-- Both RPCs blocked service_role (cron) because auth.uid() IS NULL for service role.
-- Predictions were NEVER resolved, DPC of Week NEVER calculated.
-- Fix: detect service_role via JWT claims and bypass admin guard.
-- Applied to production 2026-03-14.

-- Pattern: v_is_service_role := (current_setting('request.jwt.claims', true)::json->>'role') = 'service_role'
-- If service_role: skip auth.uid() and admin checks
-- If authenticated: require admin (club_admins or platform_admins)
-- If anon: reject

-- See full RPC bodies applied via Supabase MCP execute_sql (session 233)
