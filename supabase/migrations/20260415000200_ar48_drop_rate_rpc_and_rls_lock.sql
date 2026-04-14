-- =============================================================================
-- AR-48 (Operation Beta Ready, Journey #5) — Drop-Rate-Transparenz + RLS Lock
--
-- PROBLEM:
--   - App Store Review Guideline 3.1.1 fordert Loot-Box-Odds-Disclosure vor Kauf
--   - Drop-Raten liegen in `mystery_box_config` (Common 45% / Rare 30% / Epic 17%
--     / Legendary 6% / Mythic 2%), UI zeigt nichts
--   - `mystery_box_config` RLS war public SELECT — User konnten via direktem
--     Query Reverse-Engineering machen (z.B. ueber Supabase-Client)
--
-- FIX:
--   1. Neuer RPC `get_mystery_box_drop_rates()` returnt Raten als JSON,
--      aggregiert by rarity (Normalform: {rarity, drop_percent})
--   2. RLS-Lock: mystery_box_config SELECT von public auf service_role only.
--      Access jetzt AUSSCHLIESSLICH via RPC (curated Output, keine Raw-Config-Leaks).
--
-- Beta-Scope (CEO 2026-04-15: A-Schnellbahn):
--   Steps 1+2 hier. Steps 3 (Admin-Panel Drop-Rate-Editor) + 4 (env-Rate-Override)
--   kommen im Frontend-Agent-Sweep (Admin-Panel) bzw. post-Beta.
-- =============================================================================

-- Step 1: get_mystery_box_drop_rates RPC
CREATE OR REPLACE FUNCTION public.get_mystery_box_drop_rates()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_total_weight BIGINT;
  v_result jsonb;
BEGIN
  SELECT COALESCE(SUM(drop_weight), 0)::BIGINT INTO v_total_weight
  FROM (SELECT DISTINCT ON (rarity) rarity, drop_weight
        FROM public.mystery_box_config
        WHERE active) sub;

  IF v_total_weight = 0 THEN
    RETURN jsonb_build_object('rates', '[]'::jsonb, 'total_weight', 0);
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'rarity', rarity,
      'drop_weight', drop_weight,
      'drop_percent', ROUND((drop_weight::NUMERIC / v_total_weight) * 100, 2)
    ) ORDER BY
      CASE rarity
        WHEN 'common' THEN 1
        WHEN 'uncommon' THEN 2
        WHEN 'rare' THEN 3
        WHEN 'epic' THEN 4
        WHEN 'legendary' THEN 5
        WHEN 'mythic' THEN 6
        ELSE 99
      END
  ) INTO v_result
  FROM (SELECT DISTINCT ON (rarity) rarity, drop_weight
        FROM public.mystery_box_config
        WHERE active) sub;

  RETURN jsonb_build_object('rates', COALESCE(v_result, '[]'::jsonb), 'total_weight', v_total_weight);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_mystery_box_drop_rates() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_mystery_box_drop_rates() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_mystery_box_drop_rates() TO authenticated;

COMMENT ON FUNCTION public.get_mystery_box_drop_rates() IS
  'AR-48 (2026-04-15): Curated drop-rate exposure for App Store 3.1.1 compliance. Replaces direct mystery_box_config reads.';

-- Step 2: RLS-Lock mystery_box_config
DROP POLICY IF EXISTS "mystery_box_config_public_select" ON public.mystery_box_config;
DROP POLICY IF EXISTS "mystery_box_config_authenticated_select" ON public.mystery_box_config;

-- service_role bypasst RLS per Default. Keine Policies = alle blocked ausser service_role.
ALTER TABLE public.mystery_box_config ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.mystery_box_config IS
  'AR-48 (2026-04-15): RLS gelockt auf service_role. User-Zugriff nur via get_mystery_box_drop_rates() RPC (curated output).';
