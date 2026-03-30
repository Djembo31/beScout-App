-- ============================================================
-- Streak Benefits Integration into score_event + calculate_fan_rank
-- Matches TypeScript streakBenefits.ts tiers:
--   fantasyBonusPct: 0% (0-6d), 5% (7-59d), 15% (60+d)
--   eloBoostPct:     0% (0-13d), 10% (14+d)
-- ============================================================

-- 1. Add streak_bonus_pct to lineups for UI transparency
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS streak_bonus_pct NUMERIC(5,2) DEFAULT 0;

-- 2. score_event — apply fantasyBonusPct after synergy bonus
CREATE OR REPLACE FUNCTION public.score_event(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event RECORD;
  v_lineup RECORD;
  v_slot_keys TEXT[] := ARRAY['gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3'];
  v_scores JSONB;
  v_player_id UUID;
  v_gw_score INT;
  v_total INT;
  v_scored_count INT := 0;
  v_slot_key TEXT;
  v_i INT;
  v_captain_slot TEXT;
  v_has_triple_captain BOOLEAN;
  v_has_synergy_surge BOOLEAN;
  v_tier_bonuses JSONB;
  v_tier_bonus_total BIGINT;
  v_club_ids UUID[];
  v_club_id UUID;
  v_synergy_pct NUMERIC(5,2);
  v_synergy_details JSONB;
  v_synergy_bonus INT;
  v_ranked RECORD;
  v_prize_pool BIGINT;
  v_distributed BIGINT := 0;
  v_winner_name TEXT;
  v_total_entries INT;
  -- Streak benefit variables
  v_user_streak INT;
  v_fantasy_bonus_pct NUMERIC(5,2);
  v_streak_bonus INT;
BEGIN
  SELECT e.*, e.tier_bonuses AS tb INTO v_event
  FROM events e WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event nicht gefunden');
  END IF;

  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid() AND club_id = v_event.club_id)
     AND v_event.created_by IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nur Admins koennen Events auswerten');
  END IF;

  IF v_event.scored_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event bereits ausgewertet');
  END IF;
  IF v_event.gameweek IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event hat keinen Gameweek');
  END IF;

  v_tier_bonuses := COALESCE(v_event.tb, '{"decisive":500,"strong":300,"good":100}'::jsonb);

  FOR v_lineup IN
    SELECT l.id, l.user_id, l.captain_slot,
           ARRAY[l.slot_gk, l.slot_def1, l.slot_def2, l.slot_def3, l.slot_def4,
                 l.slot_mid1, l.slot_mid2, l.slot_mid3, l.slot_mid4,
                 l.slot_att, l.slot_att2, l.slot_att3] AS slot_players
    FROM lineups l WHERE l.event_id = p_event_id
  LOOP
    v_scores := '{}'::jsonb;
    v_total := 0;
    v_captain_slot := v_lineup.captain_slot;
    v_tier_bonus_total := 0;
    v_club_ids := ARRAY[]::UUID[];

    -- Check active chips for this user+event
    SELECT EXISTS(
      SELECT 1 FROM public.chip_usages
      WHERE user_id = v_lineup.user_id AND event_id = p_event_id AND chip_type = 'triple_captain'
    ) INTO v_has_triple_captain;

    SELECT EXISTS(
      SELECT 1 FROM public.chip_usages
      WHERE user_id = v_lineup.user_id AND event_id = p_event_id AND chip_type = 'synergy_surge'
    ) INTO v_has_synergy_surge;

    FOR v_i IN 1..12 LOOP
      v_slot_key := v_slot_keys[v_i];
      v_player_id := v_lineup.slot_players[v_i];

      IF v_player_id IS NOT NULL THEN
        SELECT pgs.score INTO v_gw_score
        FROM player_gameweek_scores pgs
        WHERE pgs.player_id = v_player_id AND pgs.gameweek = v_event.gameweek;

        IF v_gw_score IS NULL THEN v_gw_score := 40; END IF;

        -- Captain bonus: 3.0x with triple_captain chip, 1.5x default
        IF v_captain_slot IS NOT NULL AND v_captain_slot = v_slot_key THEN
          IF v_has_triple_captain THEN
            v_gw_score := LEAST(300, ROUND(v_gw_score * 3.0));
          ELSE
            v_gw_score := LEAST(150, ROUND(v_gw_score * 1.5));
          END IF;
        END IF;

        v_scores := v_scores || jsonb_build_object(v_slot_key, v_gw_score);
        v_total := v_total + v_gw_score;

        IF v_gw_score >= 80 THEN
          v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'decisive')::BIGINT, 500);
        ELSIF v_gw_score >= 70 THEN
          v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'strong')::BIGINT, 300);
        ELSIF v_gw_score >= 60 THEN
          v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'good')::BIGINT, 100);
        END IF;

        SELECT p.club_id INTO v_club_id FROM players p WHERE p.id = v_player_id;
        IF v_club_id IS NOT NULL THEN
          v_club_ids := array_append(v_club_ids, v_club_id);
        END IF;
      END IF;
    END LOOP;

    v_synergy_pct := 0;
    v_synergy_details := '[]'::jsonb;
    IF array_length(v_club_ids, 1) > 1 THEN
      DECLARE
        v_cid UUID;
        v_cnt INT;
        v_cname TEXT;
        v_seen UUID[] := ARRAY[]::UUID[];
      BEGIN
        FOR v_i IN 1..array_length(v_club_ids, 1) LOOP
          v_cid := v_club_ids[v_i];
          IF v_cid = ANY(v_seen) THEN CONTINUE; END IF;
          v_seen := array_append(v_seen, v_cid);
          v_cnt := 0;
          FOR v_gw_score IN 1..array_length(v_club_ids, 1) LOOP
            IF v_club_ids[v_gw_score] = v_cid THEN v_cnt := v_cnt + 1; END IF;
          END LOOP;
          IF v_cnt >= 2 THEN
            SELECT c.name INTO v_cname FROM clubs c WHERE c.id = v_cid;
            v_synergy_pct := LEAST(15.0, v_synergy_pct + 5.0);
            v_synergy_details := v_synergy_details || jsonb_build_array(jsonb_build_object(
              'type', 'club', 'source', COALESCE(v_cname, 'Club'), 'count', v_cnt, 'bonus_pct', 5.0
            ));
          END IF;
        END LOOP;
      END;
    END IF;

    -- Synergy surge chip: double all synergy bonuses (cap 30%)
    IF v_has_synergy_surge AND v_synergy_pct > 0 THEN
      v_synergy_pct := LEAST(30.0, v_synergy_pct * 2);
    END IF;

    IF v_synergy_pct > 0 THEN
      v_synergy_bonus := ROUND(v_total * v_synergy_pct / 100);
      v_total := v_total + v_synergy_bonus;
    END IF;

    -- ========================================
    -- STREAK BONUS: fantasyBonusPct from login streak
    -- Tiers match streakBenefits.ts:
    --   60+ days → 15%, 7-59 days → 5%, <7 days → 0%
    -- ========================================
    SELECT COALESCE(us.current_streak, 0) INTO v_user_streak
    FROM user_streaks us WHERE us.user_id = v_lineup.user_id;
    v_user_streak := COALESCE(v_user_streak, 0);

    v_fantasy_bonus_pct := CASE
      WHEN v_user_streak >= 60 THEN 0.15
      WHEN v_user_streak >= 7 THEN 0.05
      ELSE 0
    END;

    v_streak_bonus := 0;
    IF v_fantasy_bonus_pct > 0 THEN
      v_streak_bonus := ROUND(v_total * v_fantasy_bonus_pct);
      v_total := v_total + v_streak_bonus;
    END IF;

    UPDATE lineups SET
      slot_scores = v_scores,
      total_score = v_total,
      synergy_bonus_pct = v_synergy_pct,
      synergy_details = CASE WHEN v_synergy_pct > 0 THEN v_synergy_details ELSE NULL END,
      streak_bonus_pct = v_fantasy_bonus_pct * 100,
      locked = true
    WHERE id = v_lineup.id;

    IF v_tier_bonus_total > 0 THEN
      UPDATE wallets SET balance = balance + v_tier_bonus_total, updated_at = NOW()
      WHERE user_id = v_lineup.user_id;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
      SELECT v_lineup.user_id, 'tier_bonus', v_tier_bonus_total, w.balance, p_event_id,
        'Score-Tier Bonus (GW ' || v_event.gameweek || ')'
      FROM wallets w WHERE w.user_id = v_lineup.user_id;
    END IF;

    v_scored_count := v_scored_count + 1;
  END LOOP;

  IF v_scored_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Keine Lineups zum Bewerten');
  END IF;

  FOR v_ranked IN
    SELECT l.id, l.user_id, l.total_score,
           DENSE_RANK() OVER (ORDER BY l.total_score DESC) AS drank
    FROM lineups l
    WHERE l.event_id = p_event_id AND l.total_score IS NOT NULL
    ORDER BY l.total_score DESC
  LOOP
    UPDATE lineups SET rank = v_ranked.drank WHERE id = v_ranked.id;
    IF v_ranked.drank = 1 AND v_winner_name IS NULL THEN
      SELECT COALESCE(p.display_name, p.handle) INTO v_winner_name
      FROM profiles p WHERE p.id = v_ranked.user_id;
    END IF;
  END LOOP;

  v_prize_pool := v_event.prize_pool;
  SELECT COUNT(*) INTO v_total_entries FROM lineups WHERE event_id = p_event_id AND total_score IS NOT NULL;

  IF v_prize_pool > 0 AND v_total_entries > 0 THEN
    DECLARE
      v_rs JSONB;
      v_max_rank INT;
      v_rank_rewards BIGINT[];
      v_rk INT;
      v_rk_count INT;
      v_rk_total BIGINT;
      v_rk_per_person BIGINT;
      v_next_slot INT := 1;
    BEGIN
      v_rs := COALESCE(v_event.reward_structure,
        '[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]'::jsonb);
      v_max_rank := jsonb_array_length(v_rs);

      FOR v_i IN 0..v_max_rank-1 LOOP
        v_rank_rewards[v_i+1] := ROUND(
          v_prize_pool * (v_rs->v_i->>'pct')::NUMERIC / 100
        )::BIGINT;
      END LOOP;

      FOR v_rk IN 1..v_max_rank LOOP
        IF v_next_slot > v_max_rank THEN EXIT; END IF;
        SELECT COUNT(*) INTO v_rk_count
        FROM lineups WHERE event_id = p_event_id AND rank = v_rk;
        IF v_rk_count > 0 THEN
          v_rk_total := 0;
          FOR v_i IN v_next_slot..LEAST(v_next_slot + v_rk_count - 1, v_max_rank) LOOP
            v_rk_total := v_rk_total + v_rank_rewards[v_i];
          END LOOP;
          v_next_slot := v_next_slot + v_rk_count;
          v_rk_per_person := FLOOR(v_rk_total / v_rk_count);
          IF v_rk_per_person > 0 THEN
            UPDATE lineups SET reward_amount = v_rk_per_person
            WHERE event_id = p_event_id AND rank = v_rk;
            UPDATE wallets w SET balance = w.balance + v_rk_per_person, updated_at = NOW()
            FROM lineups l
            WHERE l.event_id = p_event_id AND l.rank = v_rk AND w.user_id = l.user_id;
            INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
            SELECT l.user_id, 'fantasy_reward', v_rk_per_person, ww.balance, p_event_id,
              'Platz #' || v_rk || ' — ' || v_event.name
            FROM lineups l JOIN wallets ww ON ww.user_id = l.user_id
            WHERE l.event_id = p_event_id AND l.rank = v_rk;
            v_distributed := v_distributed + (v_rk_per_person * v_rk_count);
          END IF;
        END IF;
      END LOOP;
    END;
  END IF;

  UPDATE events SET status = 'ended', scored_at = NOW() WHERE id = p_event_id;

  UPDATE players p SET
    perf_l5 = LEAST(100, ROUND(sub.avg5)),
    perf_l15 = LEAST(100, ROUND(sub.avg15))
  FROM (
    SELECT pgs.player_id,
      AVG(pgs.score) FILTER (WHERE pgs.rn <= 5) AS avg5,
      AVG(pgs.score) FILTER (WHERE pgs.rn <= 15) AS avg15
    FROM (
      SELECT player_id, score,
        ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY gameweek DESC) AS rn
      FROM player_gameweek_scores
    ) pgs
    GROUP BY pgs.player_id
  ) sub
  WHERE p.id = sub.player_id;

  RETURN jsonb_build_object(
    'success', true,
    'scored_count', v_scored_count,
    'winner_name', COALESCE(v_winner_name, 'Kein Gewinner'),
    'prize_distributed', v_distributed
  );
END;
$function$;

-- 3. calculate_fan_rank — apply eloBoostPct after total score calculation
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
  -- 2. DPC SCORE (25%)
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
  -- Tiers match streakBenefits.ts:
  --   14+ days → +10%, <14 days → 0%
  -- ========================================
  SELECT COALESCE(us.current_streak, 0) INTO v_login_streak
  FROM user_streaks us WHERE us.user_id = p_user_id;
  v_login_streak := COALESCE(v_login_streak, 0);

  v_elo_boost_pct := CASE
    WHEN v_login_streak >= 14 THEN 10.0
    ELSE 0
  END;

  IF v_elo_boost_pct > 0 THEN
    v_total_score := ROUND(v_total_score * (1 + v_elo_boost_pct / 100.0), 2);
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
