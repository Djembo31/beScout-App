-- ============================================================================
-- Slice 199: get_top_predictors_leaderboard — Backend-Aggregat-RPC
-- Date: 2026-04-25
-- Spec: worklog/specs/199-backend-aggregate-rpcs.md
-- Pattern-Vorbild: rpc_get_club_recent_trades (Slice 095) +
--                  Slice 195e differentials (plain JSONB array, anonymized projection).
-- Source-of-truth: NEU (keine Vorgaenger-Migration).
-- ============================================================================
-- Scope: SECURITY DEFINER RPC — aggregiert prediction hit-rate pro user (mind. 5
-- resolved predictions) + JOIN profiles fuer handle/display_name. Tier wird aus
-- user_founding_passes (highest) abgeleitet, NULL → 'fan' (Default).
-- predictions.status: 'correct'|'wrong'|'pending'|'void' — nur correct/wrong
-- zaehlen fuer hit-rate.
--
-- Return: JSONB-Array `[{user_id, handle, display_name, tier, predictions_total,
--          predictions_correct, hit_rate_pct, rank}]` sortiert nach hit_rate DESC,
--          predictions_total DESC. Empty-Result: `[]`.
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_top_predictors_leaderboard(INT);

CREATE OR REPLACE FUNCTION public.get_top_predictors_leaderboard(
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $function$
DECLARE
  v_result JSONB;
  v_limit  INT;
BEGIN
  -- Sanitize limit (defensive — protect against insane values via PostgREST)
  v_limit := GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));

  WITH stats AS (
    SELECT
      pr.user_id,
      COUNT(*) FILTER (WHERE pr.status IN ('correct', 'wrong'))::INT
        AS predictions_total,
      COUNT(*) FILTER (WHERE pr.status = 'correct')::INT
        AS predictions_correct
    FROM public.predictions pr
    WHERE pr.status IN ('correct', 'wrong')
    GROUP BY pr.user_id
    HAVING COUNT(*) FILTER (WHERE pr.status IN ('correct', 'wrong')) >= 5
  ),
  -- Tier-derivation: highest founding-pass tier per user (founder > pro > scout > fan).
  -- LEFT JOIN: NULL → coalesced to 'fan' (lowest tier, sane default).
  user_tier AS (
    SELECT DISTINCT ON (fp.user_id)
      fp.user_id,
      fp.tier
    FROM public.user_founding_passes fp
    ORDER BY fp.user_id,
      CASE fp.tier
        WHEN 'founder' THEN 4
        WHEN 'pro'     THEN 3
        WHEN 'scout'   THEN 2
        WHEN 'fan'     THEN 1
        ELSE 0
      END DESC,
      fp.created_at DESC
  ),
  ranked AS (
    SELECT
      s.user_id,
      p.handle,
      p.display_name,
      COALESCE(ut.tier, 'fan') AS tier,
      s.predictions_total,
      s.predictions_correct,
      ROUND(
        s.predictions_correct::numeric / NULLIF(s.predictions_total, 0)::numeric * 100,
        0
      )::INT AS hit_rate_pct,
      ROW_NUMBER() OVER (
        ORDER BY
          (s.predictions_correct::numeric / NULLIF(s.predictions_total, 0)::numeric) DESC,
          s.predictions_total DESC,
          s.user_id ASC
      )::INT AS rank
    FROM stats s
    JOIN public.profiles p   ON p.id = s.user_id
    LEFT JOIN user_tier ut   ON ut.user_id = s.user_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'user_id',             r.user_id,
        'handle',              r.handle,
        'display_name',        r.display_name,
        'tier',                r.tier,
        'predictions_total',   r.predictions_total,
        'predictions_correct', r.predictions_correct,
        'hit_rate_pct',        r.hit_rate_pct,
        'rank',                r.rank
      )
      ORDER BY r.rank ASC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM ranked r
  WHERE r.rank <= v_limit;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;

COMMENT ON FUNCTION public.get_top_predictors_leaderboard(int) IS
  'Slice 199 (2026-04-25): Top-predictors leaderboard by hit-rate (correct/total). '
  'Min 5 resolved predictions per user (HAVING-clause). Tier derived from highest '
  'user_founding_passes.tier (NULL → "fan"). Returns JSONB array sorted by '
  'hit_rate DESC, predictions_total DESC. Empty result: []. Public-safe via '
  'projection (handle/display_name only — kein Email, keine PII jenseits Profile-Public).';

-- ── AR-44: REVOKE/GRANT-Block ────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.get_top_predictors_leaderboard(int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_top_predictors_leaderboard(int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.get_top_predictors_leaderboard(int) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.get_top_predictors_leaderboard(int) TO service_role;
