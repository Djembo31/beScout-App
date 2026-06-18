-- Slice 345 (FRE-2) — Follow zählt als Einstiegssignal in den Fan-Rang (+5)
-- Money-nah: Fan-Rang steuert Poll-Stimmgewicht (Slice 343). Abo-Floor (D92) bleibt unberührt.
-- Source-of-truth: Live pg_get_functiondef('calculate_fan_rank') @ 2026-06-18 (D87).
-- Änderung gegenüber Baseline: NUR additiver Block "6.6 FOLLOW BONUS" (+5 wenn Follower).
-- Plus: Recalc-Trigger auf club_followers (sofortige Neuberechnung bei (Un)Follow, best-effort).

-- ============================================================
-- 1. calculate_fan_rank — Baseline byte-identisch + 6.6 FOLLOW BONUS
-- ============================================================
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
  v_csf_multiplier NUMERIC(3,2);
  v_holdings_count INT;
  v_avg_holding_days NUMERIC;
  v_sub_tier TEXT;
  v_post_count INT;
  v_vote_count INT;
  v_streak_count INT;
  v_total_entries INT;
  v_avg_percentile NUMERIC;
  -- Streak benefit variables
  v_login_streak INT;
  v_elo_boost_pct NUMERIC(5,2);
BEGIN
  -- ============================
  -- 1. EVENT SCORE (30%)
  -- ============================
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

  -- ============================
  -- 2. SC SCORE (25%)
  -- ============================
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

  -- ============================
  -- 3. ABO SCORE (20%)
  -- ============================
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

  -- ============================
  -- 4. COMMUNITY SCORE (15%)
  -- ============================
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

  -- ============================
  -- 5. STREAK SCORE (10%)
  -- ============================
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

  -- ============================
  -- 6. TOTAL SCORE
  -- ============================
  v_total_score := ROUND(
    v_event_score * 0.30 +
    v_dpc_score * 0.25 +
    v_abo_score * 0.20 +
    v_community_score * 0.15 +
    v_streak_score * 0.10,
    2
  );

  -- ========================================
  -- 6.5 ELO BOOST: eloBoostPct from login streak
  -- Reads from streak_config table (admin-editable)
  -- ========================================
  SELECT COALESCE(us.current_streak, 0) INTO v_login_streak
  FROM user_streaks us WHERE us.user_id = p_user_id;
  v_login_streak := COALESCE(v_login_streak, 0);

  v_elo_boost_pct := fn_get_streak_elo_boost(v_login_streak);

  IF v_elo_boost_pct > 0 THEN
    v_total_score := ROUND(v_total_score * (1 + v_elo_boost_pct / 100.0), 2);
  END IF;

  -- ========================================
  -- 6.6 FOLLOW BONUS (Slice 345 / FRE-2): +5 wenn der Fan dem Club folgt.
  -- Kleines Einstiegssignal (D93). Monoton (nur anheben), cap 100.
  -- Money-Hinweis: kann an einer Tier-Grenze das Poll-Stimmgewicht heben (gewollt);
  -- Abo-Floor (D92, weight=MAX(abo,fanrank)) bleibt unberührt.
  -- ========================================
  IF EXISTS (
    SELECT 1 FROM club_followers
    WHERE user_id = p_user_id AND club_id = p_club_id
  ) THEN
    v_total_score := LEAST(v_total_score + 5, 100);
  END IF;

  -- ============================
  -- 7. RANK TIER + CSF MULTIPLIER (lowered thresholds for pilot)
  -- ============================
  IF v_total_score >= 70 THEN
    v_rank_tier := 'vereinsikone'; v_csf_multiplier := 1.50;
  ELSIF v_total_score >= 55 THEN
    v_rank_tier := 'ehrenmitglied'; v_csf_multiplier := 1.35;
  ELSIF v_total_score >= 40 THEN
    v_rank_tier := 'legende'; v_csf_multiplier := 1.25;
  ELSIF v_total_score >= 25 THEN
    v_rank_tier := 'ultra'; v_csf_multiplier := 1.15;
  ELSIF v_total_score >= 10 THEN
    v_rank_tier := 'stammgast'; v_csf_multiplier := 1.05;
  ELSE
    v_rank_tier := 'zuschauer'; v_csf_multiplier := 1.00;
  END IF;

  -- ============================
  -- 8. UPSERT fan_rankings
  -- ============================
  INSERT INTO fan_rankings (
    user_id, club_id, rank_tier, csf_multiplier,
    event_score, dpc_score, abo_score, community_score, streak_score,
    total_score, calculated_at
  ) VALUES (
    p_user_id, p_club_id, v_rank_tier, v_csf_multiplier,
    v_event_score, v_dpc_score, v_abo_score, v_community_score, v_streak_score,
    v_total_score, now()
  )
  ON CONFLICT (user_id, club_id) DO UPDATE SET
    rank_tier = EXCLUDED.rank_tier,
    csf_multiplier = EXCLUDED.csf_multiplier,
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
    'csf_multiplier', v_csf_multiplier,
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

-- AR-44: CREATE OR REPLACE resettet Privilegien → REVOKE/GRANT erneuern.
REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid) TO authenticated;

-- ============================================================
-- 2. Recalc-Trigger auf club_followers — sofortige Neuberechnung bei (Un)Follow
--    Best-effort: ein Recalc-Fehler darf das (Un)Follow NIE blockieren.
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_recalc_fan_rank_on_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_uid uuid;
  v_cid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_uid := OLD.user_id; v_cid := OLD.club_id;
  ELSE
    v_uid := NEW.user_id; v_cid := NEW.club_id;
  END IF;

  BEGIN
    PERFORM public.calculate_fan_rank(v_uid, v_cid);
  EXCEPTION WHEN OTHERS THEN
    -- Best-effort: Recalc-Fehler ignorieren, (Un)Follow gelingt trotzdem.
    NULL;
  END;

  RETURN NULL; -- AFTER-Trigger
END;
$function$;

DROP TRIGGER IF EXISTS club_followers_recalc_fan_rank ON public.club_followers;
CREATE TRIGGER club_followers_recalc_fan_rank
  AFTER INSERT OR DELETE ON public.club_followers
  FOR EACH ROW EXECUTE FUNCTION public.trg_recalc_fan_rank_on_follow();

COMMENT ON FUNCTION public.trg_recalc_fan_rank_on_follow() IS
  'Slice 345/FRE-2: recalc Fan-Rang sofort bei (Un)Follow. Best-effort (Exception-gekapselt), blockiert (Un)Follow nie.';
