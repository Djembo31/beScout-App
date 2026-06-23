-- Slice 348 — Remove dead csf_multiplier from Fan-Rank (D83/D93)
--
-- Source-of-truth: LIVE pg_get_functiondef('public.calculate_fan_rank(uuid,uuid)')
--   read 2026-06-23 (D87) — the 20260330_streak_benefits_rpcs.sql file is STALE.
-- Applied patches preserved 1:1 from live body:
--   - Score components (event 0.30 / dpc 0.25 / abo 0.20 / community 0.15 / streak 0.10)
--   - ELO login-streak boost (fn_get_streak_elo_boost)
--   - Follow +5 entry signal (FRE-2 / Slice 345)
--   - Club-configurable thresholds (FRE-5 / Slice 347, club_fan_rank_thresholds + defaults)
--   - rank_tier CASE (6 tiers)
-- Removed (dead — verified live: liquidate_player is proportional_v3 and never reads it):
--   - v_csf_multiplier variable + tier-CASE assignments
--   - csf_multiplier INSERT column + ON CONFLICT update
--   - 'csf_multiplier' jsonb return key
--   - fan_rankings.csf_multiplier column (DROP COLUMN)
--
-- Deploy-gate (D82): Wave-1 TS (no longer selects/reads csf_multiplier) MUST be
-- deployed BEFORE this migration is applied — getFanRanking is mounted and selects
-- the column live; dropping it before the new bundle ships would 400 the read.

CREATE OR REPLACE FUNCTION public.calculate_fan_rank(p_user_id uuid, p_club_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event_score NUMERIC(5,2) := 0;
  v_dpc_score NUMERIC(5,2) := 0;
  v_abo_score NUMERIC(5,2) := 0;
  v_community_score NUMERIC(5,2) := 0;
  v_streak_score NUMERIC(5,2) := 0;
  v_total_score NUMERIC(5,2) := 0;
  v_rank_tier TEXT;
  v_holdings_count INT;
  v_avg_holding_days NUMERIC;
  v_sub_tier TEXT;
  v_post_count INT;
  v_vote_count INT;
  v_streak_count INT;
  v_total_entries INT;
  v_avg_percentile NUMERIC;
  v_login_streak INT;
  v_elo_boost_pct NUMERIC(5,2);
  v_th_stammgast smallint;
  v_th_ultra smallint;
  v_th_legende smallint;
  v_th_ehren smallint;
  v_th_ikone smallint;
BEGIN
  SELECT
    COUNT(*),
    AVG(
      CASE WHEN total_entries > 1 THEN
        (1.0 - (COALESCE(l.rank, total_entries)::NUMERIC - 1) / (total_entries - 1)) * 100
      ELSE 50 END
    )
  INTO v_total_entries, v_avg_percentile
  FROM lineups l
  JOIN events e ON e.id = l.event_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as total_entries
    FROM lineups l2
    WHERE l2.event_id = e.id
  ) entry_counts ON true
  WHERE l.user_id = p_user_id
    AND e.club_id = p_club_id
    AND e.status = 'ended';

  IF v_total_entries > 0 AND v_avg_percentile IS NOT NULL THEN
    v_event_score := LEAST(v_avg_percentile, 100);
  END IF;

  SELECT
    COALESCE(SUM(h.quantity), 0),
    COALESCE(AVG(EXTRACT(EPOCH FROM (now() - h.created_at)) / 86400), 0)
  INTO v_holdings_count, v_avg_holding_days
  FROM holdings h
  JOIN players p ON p.id = h.player_id
  WHERE h.user_id = p_user_id
    AND p.club_id = p_club_id
    AND h.quantity > 0;

  v_dpc_score := LEAST(v_holdings_count * 10, 70) + LEAST(v_avg_holding_days / 30.0 * 10, 30);
  v_dpc_score := LEAST(v_dpc_score, 100);

  SELECT tier INTO v_sub_tier
  FROM club_subscriptions
  WHERE user_id = p_user_id
    AND club_id = p_club_id
    AND status = 'active'
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  v_abo_score := CASE v_sub_tier
    WHEN 'gold' THEN 100
    WHEN 'silber' THEN 75
    WHEN 'bronze' THEN 50
    ELSE 0
  END;

  SELECT COALESCE(SUM(cnt), 0) INTO v_post_count FROM (
    SELECT COUNT(*) as cnt
    FROM posts
    WHERE user_id = p_user_id
      AND club_id = p_club_id
      AND created_at > now() - INTERVAL '90 days'
    UNION ALL
    SELECT COUNT(*) as cnt
    FROM research_posts
    WHERE user_id = p_user_id
      AND club_id = p_club_id
      AND created_at > now() - INTERVAL '90 days'
  ) sub;

  SELECT COUNT(*) INTO v_vote_count
  FROM post_votes pv
  JOIN posts p ON p.id = pv.post_id
  WHERE pv.user_id = p_user_id
    AND p.club_id = p_club_id
    AND pv.created_at > now() - INTERVAL '90 days';

  v_community_score := LEAST(v_post_count * 5 + v_vote_count * 1, 100);

  WITH ordered_events AS (
    SELECT e.id as event_id,
           e.starts_at,
           ROW_NUMBER() OVER (ORDER BY e.starts_at DESC) as rn,
           CASE WHEN EXISTS (
             SELECT 1 FROM lineups l WHERE l.event_id = e.id AND l.user_id = p_user_id
           ) THEN true ELSE false END as participated
    FROM events e
    WHERE e.club_id = p_club_id
      AND e.status = 'ended'
    ORDER BY e.starts_at DESC
  )
  SELECT COUNT(*) INTO v_streak_count
  FROM ordered_events
  WHERE participated = true
    AND rn <= (
      SELECT COALESCE(MIN(rn) - 1, (SELECT MAX(rn) FROM ordered_events WHERE participated = true))
      FROM ordered_events
      WHERE participated = false
    );

  v_streak_score := LEAST(COALESCE(v_streak_count, 0) * 15, 100);

  v_total_score := ROUND(
    v_event_score * 0.30 +
    v_dpc_score * 0.25 +
    v_abo_score * 0.20 +
    v_community_score * 0.15 +
    v_streak_score * 0.10,
    2
  );

  SELECT COALESCE(us.current_streak, 0) INTO v_login_streak
  FROM user_streaks us WHERE us.user_id = p_user_id;
  v_login_streak := COALESCE(v_login_streak, 0);

  v_elo_boost_pct := fn_get_streak_elo_boost(v_login_streak);

  IF v_elo_boost_pct > 0 THEN
    v_total_score := ROUND(v_total_score * (1 + v_elo_boost_pct / 100.0), 2);
  END IF;

  IF EXISTS (
    SELECT 1 FROM club_followers
    WHERE user_id = p_user_id AND club_id = p_club_id
  ) THEN
    v_total_score := LEAST(v_total_score + 5, 100);
  END IF;

  SELECT t.stammgast, t.ultra, t.legende, t.ehrenmitglied, t.vereinsikone
    INTO v_th_stammgast, v_th_ultra, v_th_legende, v_th_ehren, v_th_ikone
  FROM public.club_fan_rank_thresholds t
  WHERE t.club_id = p_club_id;
  v_th_stammgast := COALESCE(v_th_stammgast, 10);
  v_th_ultra     := COALESCE(v_th_ultra, 25);
  v_th_legende   := COALESCE(v_th_legende, 40);
  v_th_ehren     := COALESCE(v_th_ehren, 55);
  v_th_ikone     := COALESCE(v_th_ikone, 70);

  IF v_total_score >= v_th_ikone THEN
    v_rank_tier := 'vereinsikone';
  ELSIF v_total_score >= v_th_ehren THEN
    v_rank_tier := 'ehrenmitglied';
  ELSIF v_total_score >= v_th_legende THEN
    v_rank_tier := 'legende';
  ELSIF v_total_score >= v_th_ultra THEN
    v_rank_tier := 'ultra';
  ELSIF v_total_score >= v_th_stammgast THEN
    v_rank_tier := 'stammgast';
  ELSE
    v_rank_tier := 'zuschauer';
  END IF;

  INSERT INTO fan_rankings (
    user_id, club_id, rank_tier,
    event_score, dpc_score, abo_score, community_score, streak_score,
    total_score, calculated_at
  ) VALUES (
    p_user_id, p_club_id, v_rank_tier,
    v_event_score, v_dpc_score, v_abo_score, v_community_score, v_streak_score,
    v_total_score, now()
  )
  ON CONFLICT (user_id, club_id) DO UPDATE SET
    rank_tier = EXCLUDED.rank_tier,
    event_score = EXCLUDED.event_score,
    dpc_score = EXCLUDED.dpc_score,
    abo_score = EXCLUDED.abo_score,
    community_score = EXCLUDED.community_score,
    streak_score = EXCLUDED.streak_score,
    total_score = EXCLUDED.total_score,
    calculated_at = EXCLUDED.calculated_at;

  RETURN jsonb_build_object(
    'ok', true,
    'rank_tier', v_rank_tier,
    'total_score', v_total_score,
    'components', jsonb_build_object(
      'event_score', v_event_score,
      'dpc_score', v_dpc_score,
      'abo_score', v_abo_score,
      'community_score', v_community_score,
      'streak_score', v_streak_score
    )
  );
END;
$function$;

-- AR-44: CREATE OR REPLACE resets privileges → re-assert.
REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) TO authenticated;

-- Drop the now-unreferenced dead column. No view/index/trigger/RLS/constraint
-- depends on it (verified live 2026-06-23). IF EXISTS = idempotent / greenfield-safe.
ALTER TABLE public.fan_rankings DROP COLUMN IF EXISTS csf_multiplier;
