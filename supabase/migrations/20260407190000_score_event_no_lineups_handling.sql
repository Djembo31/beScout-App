-- ============================================================================
-- Migration: score_event handles 0-lineup case gracefully
-- Date: 2026-04-07
-- Bug:
--   When current_entries > 0 (user paid entry fee) but no lineups were
--   submitted, score_event returned early with success=false and never set
--   scored_at. Event became orphaned: status='ended' but scored_at IS NULL,
--   causing the SM-EVT-08 / business-flows / race-conditions tests to fail.
--
-- Root cause:
--   `current_entries` counts event_entries (paid lock), but the scoring loop
--   iterates `lineups` (submitted lineup). These are not equivalent — paying
--   the fee does not require submitting a lineup.
--
-- Fix:
--   When v_scored_count = 0, treat it as a successfully closed empty
--   competition: set status='ended' and scored_at=NOW(), return success=true
--   with scored_count=0 and a note 'no_lineups'. Both callers (cron +
--   scoring.admin.ts) handle success=true correctly without changes.
-- ============================================================================

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
  v_user_streak INT;
  v_fantasy_bonus_pct NUMERIC(5,2);
  v_streak_bonus INT;
  -- Equipment variables
  v_equipment_map JSONB;
  v_eq_id UUID;
  v_eq_multiplier NUMERIC(4,2);
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
    SELECT l.id, l.user_id, l.captain_slot, l.equipment_map,
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
    v_equipment_map := COALESCE(v_lineup.equipment_map, '{}'::jsonb);

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

        -- ═══════════════════════════════════════════
        -- EQUIPMENT MULTIPLIER (after captain bonus)
        -- ═══════════════════════════════════════════
        IF v_equipment_map ? v_slot_key THEN
          v_eq_id := (v_equipment_map->>v_slot_key)::UUID;
          SELECT er.multiplier INTO v_eq_multiplier
          FROM public.user_equipment ue
          JOIN public.equipment_ranks er ON er.rank = ue.rank
          WHERE ue.id = v_eq_id AND ue.user_id = v_lineup.user_id;

          IF v_eq_multiplier IS NOT NULL THEN
            v_gw_score := ROUND(v_gw_score * v_eq_multiplier);
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

    IF v_has_synergy_surge AND v_synergy_pct > 0 THEN
      v_synergy_pct := LEAST(30.0, v_synergy_pct * 2);
    END IF;

    IF v_synergy_pct > 0 THEN
      v_synergy_bonus := ROUND(v_total * v_synergy_pct / 100);
      v_total := v_total + v_synergy_bonus;
    END IF;

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

    -- ═══════════════════════════════════════════
    -- CONSUME EQUIPMENT after scoring
    -- ═══════════════════════════════════════════
    IF v_equipment_map <> '{}'::jsonb THEN
      UPDATE public.user_equipment
      SET consumed_at = now()
      WHERE equipped_event_id = p_event_id
        AND user_id = v_lineup.user_id
        AND consumed_at IS NULL;
    END IF;

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

  -- ═══════════════════════════════════════════
  -- 0-LINEUP GUARD (graceful close)
  -- Bug fix 2026-04-07: previously returned error and orphaned the event.
  -- Now: mark as ended + scored_at, return success with scored_count=0.
  -- ═══════════════════════════════════════════
  IF v_scored_count = 0 THEN
    UPDATE events SET status = 'ended', scored_at = NOW() WHERE id = p_event_id;
    RETURN jsonb_build_object(
      'success', true,
      'scored_count', 0,
      'note', 'no_lineups',
      'winner_name', 'Kein Gewinner',
      'prize_distributed', 0
    );
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
