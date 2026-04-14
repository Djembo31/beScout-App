-- =============================================================================
-- AR-48b (Operation Beta Ready, Journey #5) — Remove residual public SELECT
--   Policy on mystery_box_config. AR-48 hatte DROP POLICY auf falschen Namen
--   (mystery_box_config_public_select + _authenticated_select), die echte
--   Policy hiess `mystery_box_config_select` mit roles=public.
--
-- Verified 2026-04-15: nach DROP hat pg_policies 0 Rows auf mystery_box_config.
-- RLS ist aktiv, SELECT nur via get_mystery_box_drop_rates RPC + service_role.
-- =============================================================================

DROP POLICY IF EXISTS "mystery_box_config_select" ON public.mystery_box_config;

COMMENT ON TABLE public.mystery_box_config IS
  'AR-48 (2026-04-15): RLS enabled, kein Policy fuer Clients. SELECT nur via get_mystery_box_drop_rates() RPC (curated). service_role bypass via rolbypassrls.';
