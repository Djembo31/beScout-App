-- Slice 059 — Data-Quality-Audit-RPC
-- Baseline fuer Daten-Integritaet-Plan.
-- Liefert pro Liga: Total, Stammkader (shirt_number IS NOT NULL),
--                   Completeness-% fuer Kritisch-Felder, gold_tier-Flag
-- Gold-Target: Stammkader >= 99.9% auf [nationality, image_url, market_value_eur, contract_end, api_football_id]

CREATE OR REPLACE FUNCTION public.get_player_data_completeness()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  WITH categorized AS (
    SELECT
      c.league,
      p.id AS player_id,
      (p.shirt_number IS NOT NULL) AS is_stammkader,
      (p.nationality IS NOT NULL AND p.nationality <> '') AS has_nationality,
      (p.image_url IS NOT NULL AND p.image_url <> '') AS has_photo,
      (p.market_value_eur IS NOT NULL AND p.market_value_eur > 0) AS has_market_value,
      (p.contract_end IS NOT NULL) AS has_contract_end,
      (p.api_football_id IS NOT NULL) AS has_api_mapping,
      (p.age IS NOT NULL) AS has_age
    FROM players p
    JOIN clubs c ON c.id = p.club_id
  ),
  per_liga AS (
    SELECT
      league,
      COUNT(*) FILTER (WHERE is_stammkader) AS stamm_total,
      COUNT(*) FILTER (WHERE is_stammkader AND has_nationality) AS stamm_nat,
      COUNT(*) FILTER (WHERE is_stammkader AND has_photo) AS stamm_photo,
      COUNT(*) FILTER (WHERE is_stammkader AND has_market_value) AS stamm_mv,
      COUNT(*) FILTER (WHERE is_stammkader AND has_contract_end) AS stamm_contract,
      COUNT(*) FILTER (WHERE is_stammkader AND has_api_mapping) AS stamm_api,
      COUNT(*) FILTER (WHERE is_stammkader AND has_age) AS stamm_age,
      COUNT(*) FILTER (WHERE NOT is_stammkader) AS youth_total,
      COUNT(*) AS league_total
    FROM categorized
    GROUP BY league
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'league', league,
      'league_total', league_total,
      'stammkader', jsonb_build_object(
        'total', stamm_total,
        'nationality_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_nat::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'photo_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_photo::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'market_value_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_mv::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'contract_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_contract::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'api_mapping_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_api::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'age_pct', CASE WHEN stamm_total > 0 THEN ROUND((stamm_age::NUMERIC / stamm_total) * 100, 1) ELSE 0 END,
        'gold_tier', (
          stamm_total > 0
          AND stamm_nat::NUMERIC / stamm_total >= 0.999
          AND stamm_photo::NUMERIC / stamm_total >= 0.999
          AND stamm_mv::NUMERIC / stamm_total >= 0.999
          AND stamm_contract::NUMERIC / stamm_total >= 0.999
          AND stamm_api::NUMERIC / stamm_total >= 0.999
        )
      ),
      'youth_reserve_total', youth_total
    )
    ORDER BY league
  ) INTO v_result
  FROM per_liga;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_player_data_completeness() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_data_completeness() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_data_completeness() TO service_role;

COMMENT ON FUNCTION public.get_player_data_completeness() IS
  'Slice 059: Data-Quality-Audit. Pro Liga: Stammkader-Completeness-% fuer 6 Kritisch-Felder + gold_tier Flag (99.9%).';
