-- Slice 201d (2026-04-26): Prediction-Consensus-Aggregate-RPC (C-03)
-- Returns anonymized distribution of predicted_value for a fixture+condition[+player_id].
-- Used by CreatePredictionModal to show "X% der Community tippte gleich" hint.

CREATE OR REPLACE FUNCTION public.get_prediction_consensus(
  p_fixture_id uuid,
  p_condition text,
  p_player_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_total_count INT := 0;
  v_distribution jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'auth_required',
      'total_count', 0,
      'distribution', '[]'::jsonb
    );
  END IF;

  WITH per_value AS (
    SELECT predicted_value, COUNT(*)::int AS cnt
    FROM public.predictions
    WHERE fixture_id = p_fixture_id
      AND condition = p_condition
      AND (p_player_id IS NULL OR player_id = p_player_id)
    GROUP BY predicted_value
  ),
  total AS (
    SELECT COALESCE(SUM(cnt), 0)::int AS total FROM per_value
  )
  SELECT
    (SELECT total FROM total),
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'value', predicted_value,
          'count', cnt,
          'pct', CASE
            WHEN (SELECT total FROM total) > 0
            THEN ROUND((cnt::numeric / (SELECT total FROM total)::numeric) * 100, 1)
            ELSE 0
          END
        )
        ORDER BY cnt DESC
      ) FROM per_value),
      '[]'::jsonb
    )
  INTO v_total_count, v_distribution;

  RETURN jsonb_build_object(
    'success', true,
    'total_count', v_total_count,
    'distribution', v_distribution
  );
END;
$function$;

COMMENT ON FUNCTION public.get_prediction_consensus(uuid, text, uuid) IS
  'Slice 201d (2026-04-26): Anonymized predicted_value distribution per fixture+condition[+player]. Returns {success, total_count, distribution: [{value, count, pct}]}.';

REVOKE EXECUTE ON FUNCTION public.get_prediction_consensus(uuid, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_prediction_consensus(uuid, text, uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_prediction_consensus(uuid, text, uuid) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_prediction_consensus(uuid, text, uuid) TO service_role;
