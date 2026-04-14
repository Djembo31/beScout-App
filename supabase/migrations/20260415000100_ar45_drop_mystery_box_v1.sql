-- =============================================================================
-- AR-45 (Operation Beta Ready, Journey #5) — DROP Legacy open_mystery_box v1
--
-- PROBLEM:
--   `open_mystery_box(boolean)` v1 hat noch EXECUTE-Grants (authenticated, postgres,
--   service_role), wird aber nicht mehr von Services genutzt (alle Consumer nutzen
--   v2). Attack-Surface ohne Nutzen — API-Client koennte v1 aufrufen und hätte
--   keinen Daily-Cap.
--
-- FIX:
--   DROP FUNCTION IF EXISTS. Fall-Through: falls bereits gedroppt (in Remote),
--   Migration ist No-Op dank IF EXISTS.
-- =============================================================================

DROP FUNCTION IF EXISTS public.open_mystery_box(boolean);
