-- Slice 396 W3+W4 — User-Event Settle (score_event additiver type='user'-Zweig) + Wildcard-Fix (rpc_save_lineup)
-- Money/CEO (§3). PATCH-AUDIT: nicht-user-Zweige byte-identisch zur Live-Baseline; alle 396-Blöcke sind
-- mit `IF v_event.type = 'user'` geguarded → non-user-Verhalten unverändert.
-- Baseline live gezogen 2026-06-26 (D87).

-- ════════════════════════════════════════════════════════════════════
-- W3 — score_event: dynamischer Entry-Pot (Pot = Σ Eintritte; charge; FLOOR-Rest → Topf)
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.score_event(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event RECORD; v_lineup RECORD;
  v_slot_keys TEXT[] := ARRAY['gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3'];
  v_scores JSONB; v_player_id UUID; v_gw_score INT; v_total INT;
  v_scored_count INT := 0; v_slot_key TEXT; v_i INT;
  v_captain_slot TEXT; v_has_captain_boost BOOLEAN; v_has_synergy_surge BOOLEAN;
  v_tier_bonuses JSONB; v_tier_bonus_total BIGINT;
  v_club_ids UUID[]; v_club_id UUID;
  v_synergy_pct NUMERIC(5,2); v_synergy_details JSONB; v_synergy_bonus INT;
  v_ranked RECORD; v_prize_pool BIGINT; v_distributed BIGINT := 0;
  v_winner_name TEXT; v_total_entries INT;
  v_user_streak INT; v_fantasy_bonus_pct NUMERIC(5,2); v_streak_bonus INT;
  v_equipment_map JSONB; v_eq_id UUID; v_eq_multiplier NUMERIC(4,2);
  -- Slice 195d Auto-Sub
  v_played JSONB; v_starter_pos TEXT;
  v_sub_player_id UUID; v_sub_pos TEXT; v_sub_minutes INT;
  v_used_bench UUID[]; v_bench_o_arr UUID[];
  v_bench_idx INT; v_bench_loop INT;
  v_starter_minutes INT; v_did_sub BOOLEAN;
  -- Slice 396 user-event settlement
  v_uentry RECORD; v_user_pot BIGINT := 0; v_user_fee BIGINT := 0; v_user_rest BIGINT := 0;
BEGIN
  SELECT e.*, e.tier_bonuses AS tb INTO v_event FROM events e WHERE e.id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Event nicht gefunden'); END IF;

  IF auth.uid() IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid() AND club_id = v_event.club_id)
     AND v_event.created_by IS DISTINCT FROM auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nur Admins koennen Events auswerten');
  END IF;

  IF v_event.scored_at IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Event bereits ausgewertet'); END IF;
  IF v_event.gameweek IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Event hat keinen Gameweek'); END IF;

  v_tier_bonuses := COALESCE(v_event.tb, '{"decisive":500,"strong":300,"good":100}'::jsonb);

  FOR v_lineup IN
    SELECT l.id, l.user_id, l.captain_slot, l.equipment_map,
           ARRAY[l.slot_gk, l.slot_def1, l.slot_def2, l.slot_def3, l.slot_def4,
                 l.slot_mid1, l.slot_mid2, l.slot_mid3, l.slot_mid4,
                 l.slot_att, l.slot_att2, l.slot_att3] AS slot_players,
           l.bench_gk, l.bench_o1, l.bench_o2, l.bench_o3, l.bench_order
    FROM lineups l WHERE l.event_id = p_event_id
  LOOP
    v_scores := '{}'::jsonb; v_total := 0;
    v_captain_slot := v_lineup.captain_slot;
    v_tier_bonus_total := 0; v_club_ids := ARRAY[]::UUID[];
    v_equipment_map := COALESCE(v_lineup.equipment_map, '{}'::jsonb);
    v_used_bench := ARRAY[]::UUID[];
    v_bench_o_arr := ARRAY[v_lineup.bench_o1, v_lineup.bench_o2, v_lineup.bench_o3];

    SELECT EXISTS(SELECT 1 FROM public.chip_usages WHERE user_id = v_lineup.user_id AND event_id = p_event_id AND chip_type = 'captain_boost') INTO v_has_captain_boost;
    SELECT EXISTS(SELECT 1 FROM public.chip_usages WHERE user_id = v_lineup.user_id AND event_id = p_event_id AND chip_type = 'synergy_surge') INTO v_has_synergy_surge;

    SELECT COALESCE(jsonb_object_agg(p::text, mp), '{}'::jsonb) INTO v_played
    FROM (
      SELECT fps.player_id AS p, COALESCE(SUM(fps.minutes_played), 0)::INT AS mp
      FROM public.fixture_player_stats fps
      JOIN public.fixtures f ON f.id = fps.fixture_id
      WHERE f.gameweek = v_event.gameweek AND fps.player_id IS NOT NULL
        AND fps.player_id = ANY(v_lineup.slot_players || ARRAY[v_lineup.bench_gk, v_lineup.bench_o1, v_lineup.bench_o2, v_lineup.bench_o3])
      GROUP BY fps.player_id
    ) sub;

    FOR v_i IN 1..12 LOOP
      v_slot_key := v_slot_keys[v_i];
      v_player_id := v_lineup.slot_players[v_i];
      v_did_sub := FALSE; v_starter_minutes := 0;
      v_starter_pos := NULL; v_sub_minutes := 0;
      v_sub_pos := NULL; v_sub_player_id := NULL;

      IF v_player_id IS NOT NULL THEN
        v_starter_minutes := COALESCE((v_played->>v_player_id::text)::INT, 0);
        IF v_starter_minutes <= 0 THEN
          IF v_slot_key = 'gk' THEN
            IF v_lineup.bench_gk IS NOT NULL AND NOT (v_lineup.bench_gk = ANY(v_used_bench)) THEN
              v_sub_minutes := COALESCE((v_played->>v_lineup.bench_gk::text)::INT, 0);
              IF v_sub_minutes > 0 THEN
                v_player_id := v_lineup.bench_gk;
                v_used_bench := array_append(v_used_bench, v_lineup.bench_gk);
                v_did_sub := TRUE;
              END IF;
            END IF;
          ELSE
            SELECT position INTO v_starter_pos FROM public.players WHERE id = v_player_id;
            IF v_starter_pos IN ('DEF','MID','ATT') THEN
              FOR v_bench_loop IN 1..3 LOOP
                EXIT WHEN v_did_sub;
                v_bench_idx := v_lineup.bench_order[v_bench_loop];
                v_sub_player_id := v_bench_o_arr[v_bench_idx];
                IF v_sub_player_id IS NULL THEN CONTINUE; END IF;
                IF v_sub_player_id = ANY(v_used_bench) THEN CONTINUE; END IF;
                v_sub_minutes := COALESCE((v_played->>v_sub_player_id::text)::INT, 0);
                IF v_sub_minutes <= 0 THEN CONTINUE; END IF;
                SELECT position INTO v_sub_pos FROM public.players WHERE id = v_sub_player_id;
                IF v_sub_pos = v_starter_pos THEN
                  v_player_id := v_sub_player_id;
                  v_used_bench := array_append(v_used_bench, v_sub_player_id);
                  v_did_sub := TRUE;
                END IF;
              END LOOP;
            END IF;
          END IF;
        END IF;

        SELECT pgs.score INTO v_gw_score FROM player_gameweek_scores pgs
        WHERE pgs.player_id = v_player_id AND pgs.gameweek = v_event.gameweek;

        IF NOT v_did_sub AND v_starter_minutes <= 0 THEN
          v_gw_score := 0;
        ELSIF v_gw_score IS NULL THEN
          v_gw_score := 40;
        END IF;

        IF v_captain_slot IS NOT NULL AND v_captain_slot = v_slot_key THEN
          IF v_has_captain_boost THEN
            v_gw_score := LEAST(150, ROUND(v_gw_score * 1.25));
          ELSE
            v_gw_score := LEAST(150, ROUND(v_gw_score * 1.1));
          END IF;
        END IF;

        IF v_equipment_map ? v_slot_key THEN
          v_eq_id := (v_equipment_map->>v_slot_key)::UUID;
          SELECT er.multiplier INTO v_eq_multiplier
          FROM public.user_equipment ue JOIN public.equipment_ranks er ON er.rank = ue.rank
          WHERE ue.id = v_eq_id AND ue.user_id = v_lineup.user_id;
          IF v_eq_multiplier IS NOT NULL THEN v_gw_score := ROUND(v_gw_score * v_eq_multiplier); END IF;
        END IF;

        v_scores := v_scores || jsonb_build_object(v_slot_key, v_gw_score);
        v_total := v_total + v_gw_score;

        IF v_gw_score >= 80 THEN v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'decisive')::BIGINT, 500);
        ELSIF v_gw_score >= 70 THEN v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'strong')::BIGINT, 300);
        ELSIF v_gw_score >= 60 THEN v_tier_bonus_total := v_tier_bonus_total + COALESCE((v_tier_bonuses->>'good')::BIGINT, 100);
        END IF;

        SELECT p.club_id INTO v_club_id FROM players p WHERE p.id = v_player_id;
        IF v_club_id IS NOT NULL THEN v_club_ids := array_append(v_club_ids, v_club_id); END IF;
      END IF;
    END LOOP;

    v_synergy_pct := 0; v_synergy_details := '[]'::jsonb;
    IF array_length(v_club_ids, 1) > 1 THEN
      DECLARE v_cid UUID; v_cnt INT; v_cname TEXT; v_seen UUID[] := ARRAY[]::UUID[];
      BEGIN
        FOR v_i IN 1..array_length(v_club_ids, 1) LOOP
          v_cid := v_club_ids[v_i];
          IF v_cid = ANY(v_seen) THEN CONTINUE; END IF;
          v_seen := array_append(v_seen, v_cid); v_cnt := 0;
          FOR v_gw_score IN 1..array_length(v_club_ids, 1) LOOP
            IF v_club_ids[v_gw_score] = v_cid THEN v_cnt := v_cnt + 1; END IF;
          END LOOP;
          IF v_cnt >= 2 THEN
            SELECT c.name INTO v_cname FROM clubs c WHERE c.id = v_cid;
            v_synergy_pct := LEAST(15.0, v_synergy_pct + 5.0);
            v_synergy_details := v_synergy_details || jsonb_build_array(jsonb_build_object('type', 'club', 'source', COALESCE(v_cname, 'Club'), 'count', v_cnt, 'bonus_pct', 5.0));
          END IF;
        END LOOP;
      END;
    END IF;

    IF v_has_synergy_surge AND v_synergy_pct > 0 THEN v_synergy_pct := LEAST(30.0, v_synergy_pct * 2); END IF;
    IF v_synergy_pct > 0 THEN v_synergy_bonus := ROUND(v_total * v_synergy_pct / 100); v_total := v_total + v_synergy_bonus; END IF;

    SELECT COALESCE(us.current_streak, 0) INTO v_user_streak FROM user_streaks us WHERE us.user_id = v_lineup.user_id;
    v_user_streak := COALESCE(v_user_streak, 0);
    v_fantasy_bonus_pct := CASE WHEN v_user_streak >= 60 THEN 0.15 WHEN v_user_streak >= 7 THEN 0.05 ELSE 0 END;
    v_streak_bonus := 0;
    IF v_fantasy_bonus_pct > 0 THEN v_streak_bonus := ROUND(v_total * v_fantasy_bonus_pct); v_total := v_total + v_streak_bonus; END IF;

    UPDATE lineups SET slot_scores = v_scores, total_score = v_total,
      synergy_bonus_pct = v_synergy_pct,
      synergy_details = CASE WHEN v_synergy_pct > 0 THEN v_synergy_details ELSE NULL END,
      streak_bonus_pct = v_fantasy_bonus_pct * 100, locked = true
    WHERE id = v_lineup.id;

    IF v_equipment_map <> '{}'::jsonb THEN
      UPDATE public.user_equipment SET consumed_at = now()
      WHERE equipped_event_id = p_event_id AND user_id = v_lineup.user_id AND consumed_at IS NULL;
    END IF;

    IF v_tier_bonus_total > 0 THEN
      UPDATE wallets SET balance = balance + v_tier_bonus_total, updated_at = NOW() WHERE user_id = v_lineup.user_id;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
      SELECT v_lineup.user_id, 'tier_bonus', v_tier_bonus_total, w.balance, p_event_id,
        'Score-Tier Bonus (GW ' || v_event.gameweek || ')'
      FROM wallets w WHERE w.user_id = v_lineup.user_id;
    END IF;

    v_scored_count := v_scored_count + 1;
  END LOOP;

  -- Slice 396: User-Event Eintritts-Settlement (Charge gesperrte Eintritte → virtueller Pot; Fees → Topf).
  -- Additiv, NUR type='user'. Pot = Σ fee_split.prize_pool; Fee = Σ (amount_locked − prize_pool-Anteil) → Topf.
  IF v_event.type = 'user' THEN
    SELECT COALESCE(SUM((fee_split->>'prize_pool')::bigint), 0),
           COALESCE(SUM(amount_locked - COALESCE((fee_split->>'prize_pool')::bigint, 0)), 0)
      INTO v_user_pot, v_user_fee
      FROM event_entries WHERE event_id = p_event_id AND currency = 'scout';
    FOR v_uentry IN SELECT user_id, amount_locked FROM event_entries
                    WHERE event_id = p_event_id AND currency = 'scout' AND amount_locked > 0 LOOP
      UPDATE wallets SET balance = balance - v_uentry.amount_locked,
                         locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_uentry.amount_locked),
                         updated_at = NOW()
        WHERE user_id = v_uentry.user_id;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
      SELECT v_uentry.user_id, 'event_entry_charge', v_uentry.amount_locked, w.balance, p_event_id,
             'Event-Eintritt: ' || v_event.name
      FROM wallets w WHERE w.user_id = v_uentry.user_id;
    END LOOP;
    IF v_user_fee > 0 THEN
      PERFORM book_platform_treasury('credit', 'event_entry_fee', v_user_fee, p_event_id,
        'User-Event Eintritts-Fee: ' || v_event.name);
    END IF;
    DELETE FROM event_entries WHERE event_id = p_event_id;
  END IF;

  IF v_scored_count = 0 THEN
    -- Slice 396: User-Event mit Eintritten aber ohne Aufstellungen → Pot ohne Gewinner → Topf (Zero-Sum).
    IF v_event.type = 'user' AND v_user_pot > 0 THEN
      PERFORM book_platform_treasury('credit', 'event_entry_fee', v_user_pot, p_event_id,
        'User-Event Pot ohne Gewinner: ' || v_event.name);
    END IF;
    UPDATE events SET status = 'ended', scored_at = NOW() WHERE id = p_event_id;
    RETURN jsonb_build_object('success', true, 'scored_count', 0, 'note', 'no_lineups', 'winner_name', 'Keine Top-Platzierung', 'prize_distributed', 0);
  END IF;

  FOR v_ranked IN
    SELECT l.id, l.user_id, l.total_score, DENSE_RANK() OVER (ORDER BY l.total_score DESC) AS drank
    FROM lineups l WHERE l.event_id = p_event_id AND l.total_score IS NOT NULL
    ORDER BY l.total_score DESC
  LOOP
    UPDATE lineups SET rank = v_ranked.drank WHERE id = v_ranked.id;
    IF v_ranked.drank = 1 AND v_winner_name IS NULL THEN
      SELECT COALESCE(p.display_name, p.handle) INTO v_winner_name FROM profiles p WHERE p.id = v_ranked.user_id;
    END IF;
  END LOOP;

  v_prize_pool := v_event.prize_pool;
  -- Slice 396: User-Event nutzt dynamischen Pot aus Eintritten statt v_event.prize_pool (=0).
  IF v_event.type = 'user' THEN v_prize_pool := v_user_pot; END IF;
  SELECT COUNT(*) INTO v_total_entries FROM lineups WHERE event_id = p_event_id AND total_score IS NOT NULL;

  IF v_prize_pool > 0 AND v_total_entries > 0 THEN
    DECLARE v_rs JSONB; v_max_rank INT; v_rank_rewards BIGINT[]; v_rk INT; v_rk_count INT; v_rk_total BIGINT; v_rk_per_person BIGINT; v_next_slot INT := 1;
    BEGIN
      v_rs := COALESCE(v_event.reward_structure, '[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]'::jsonb);
      v_max_rank := jsonb_array_length(v_rs);
      FOR v_i IN 0..v_max_rank-1 LOOP v_rank_rewards[v_i+1] := ROUND(v_prize_pool * (v_rs->v_i->>'pct')::NUMERIC / 100)::BIGINT; END LOOP;
      FOR v_rk IN 1..v_max_rank LOOP
        IF v_next_slot > v_max_rank THEN EXIT; END IF;
        SELECT COUNT(*) INTO v_rk_count FROM lineups WHERE event_id = p_event_id AND rank = v_rk;
        IF v_rk_count > 0 THEN
          v_rk_total := 0;
          FOR v_i IN v_next_slot..LEAST(v_next_slot + v_rk_count - 1, v_max_rank) LOOP v_rk_total := v_rk_total + v_rank_rewards[v_i]; END LOOP;
          v_next_slot := v_next_slot + v_rk_count;
          v_rk_per_person := FLOOR(v_rk_total / v_rk_count);
          IF v_rk_per_person > 0 THEN
            UPDATE lineups SET reward_amount = v_rk_per_person WHERE event_id = p_event_id AND rank = v_rk;
            UPDATE wallets w SET balance = w.balance + v_rk_per_person, updated_at = NOW() FROM lineups l WHERE l.event_id = p_event_id AND l.rank = v_rk AND w.user_id = l.user_id;
            INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
            SELECT l.user_id, 'fantasy_reward', v_rk_per_person, ww.balance, p_event_id, 'Platz #' || v_rk || ' — ' || v_event.name
            FROM lineups l JOIN wallets ww ON ww.user_id = l.user_id WHERE l.event_id = p_event_id AND l.rank = v_rk;
            v_distributed := v_distributed + (v_rk_per_person * v_rk_count);
          END IF;
        END IF;
      END LOOP;
    END;
  END IF;

  -- Slice 396: User-Event FLOOR-Rest (Pot − ausgezahlt) → Topf, damit Zero-Sum exakt (Pot ist virtuell).
  IF v_event.type = 'user' THEN
    v_user_rest := v_prize_pool - v_distributed;
    IF v_user_rest > 0 THEN
      PERFORM book_platform_treasury('credit', 'event_entry_fee', v_user_rest, p_event_id,
        'User-Event Rest-Pot: ' || v_event.name);
    END IF;
  END IF;

  UPDATE events SET status = 'ended', scored_at = NOW() WHERE id = p_event_id;

  UPDATE players p SET perf_l5 = LEAST(100, ROUND(sub.avg5)), perf_l15 = LEAST(100, ROUND(sub.avg15))
  FROM (
    SELECT pgs.player_id, AVG(pgs.score) FILTER (WHERE pgs.rn <= 5) AS avg5, AVG(pgs.score) FILTER (WHERE pgs.rn <= 15) AS avg15
    FROM (SELECT player_id, score, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY gameweek DESC) AS rn FROM player_gameweek_scores) pgs
    GROUP BY pgs.player_id
  ) sub WHERE p.id = sub.player_id;

  RETURN jsonb_build_object('success', true, 'scored_count', v_scored_count, 'winner_name', COALESCE(v_winner_name, 'Keine Top-Platzierung'), 'prize_distributed', v_distributed);
END;
$function$;

-- ════════════════════════════════════════════════════════════════════
-- W4 — rpc_save_lineup: Wildcard-Liga-Lookup COALESCE(events.league_id, club→league)
--      Nur EINE Stelle geändert (Liga-Auflösung im Wildcard-Delta-Block); Rest byte-identisch.
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_save_lineup(p_event_id uuid, p_user_id uuid, p_formation text, p_captain_slot text DEFAULT NULL::text, p_wildcard_slots text[] DEFAULT '{}'::text[], p_slot_gk uuid DEFAULT NULL::uuid, p_slot_def1 uuid DEFAULT NULL::uuid, p_slot_def2 uuid DEFAULT NULL::uuid, p_slot_def3 uuid DEFAULT NULL::uuid, p_slot_def4 uuid DEFAULT NULL::uuid, p_slot_mid1 uuid DEFAULT NULL::uuid, p_slot_mid2 uuid DEFAULT NULL::uuid, p_slot_mid3 uuid DEFAULT NULL::uuid, p_slot_mid4 uuid DEFAULT NULL::uuid, p_slot_att uuid DEFAULT NULL::uuid, p_slot_att2 uuid DEFAULT NULL::uuid, p_slot_att3 uuid DEFAULT NULL::uuid, p_bench_gk uuid DEFAULT NULL::uuid, p_bench_o1 uuid DEFAULT NULL::uuid, p_bench_o2 uuid DEFAULT NULL::uuid, p_bench_o3 uuid DEFAULT NULL::uuid, p_bench_order integer[] DEFAULT ARRAY[1, 2, 3])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_event RECORD; v_entry RECORD; v_existing RECORD;
  v_lineup_id UUID; v_all_slots UUID[];
  v_slot_keys TEXT[] := ARRAY['gk','def1','def2','def3','def4','mid1','mid2','mid3','mid4','att','att2','att3'];
  v_pid UUID; v_key TEXT;
  v_min_sc INT; v_available INT; v_seen UUID[]; v_i INT;
  v_wildcard_count INT; v_old_wildcard_count INT; v_wildcard_delta INT;
  v_total_salary INT; v_player_perf INT;
  v_formation_trim TEXT; v_parts TEXT[];
  v_def_n INT; v_mid_n INT; v_att_n INT;
  v_def_f INT := 0; v_mid_f INT := 0; v_att_f INT := 0;
  v_slot_filled BOOLEAN;
  v_max_per_club_used INT;
  v_bench_pos TEXT;
  v_bench_holdings INT;
  v_bench_uids UUID[];
  v_event_league_id UUID;
  v_rule JSONB; v_rule_type TEXT; v_rule_value BIGINT; v_own_club_count INT;
  v_player_age INT;
  v_rule_position TEXT; v_pos_count INT;
  v_player_mv INT;
  v_nation_values TEXT[]; v_player_nat TEXT; v_nat_count INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'auth_mismatch');
  END IF;

  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'event_not_found'); END IF;
  IF v_event.status IN ('ended', 'scoring') THEN RETURN jsonb_build_object('ok', false, 'error', 'event_ended'); END IF;
  IF v_event.locks_at <= now() THEN RETURN jsonb_build_object('ok', false, 'error', 'event_locked'); END IF;

  SELECT * INTO v_entry FROM public.event_entries WHERE event_id = p_event_id AND user_id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'must_enter_first'); END IF;

  v_all_slots := ARRAY[
    p_slot_gk, p_slot_def1, p_slot_def2, p_slot_def3, p_slot_def4,
    p_slot_mid1, p_slot_mid2, p_slot_mid3, p_slot_mid4,
    p_slot_att, p_slot_att2, p_slot_att3
  ];

  v_formation_trim := TRIM(COALESCE(p_formation, ''));
  IF v_formation_trim = '' THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation'); END IF;
  IF NOT v_formation_trim = ANY(ARRAY['1-4-3-3','1-4-4-2','1-3-4-3','1-3-5-2','1-4-5-1','1-5-3-2','1-5-4-1','1-2-2-2','1-3-2-1','1-2-3-1','1-3-1-2','1-1-3-2']) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_formation', 'formation', p_formation);
  END IF;

  v_parts := string_to_array(v_formation_trim, '-');
  v_def_n := v_parts[2]::INT; v_mid_n := v_parts[3]::INT; v_att_n := v_parts[4]::INT;

  IF p_slot_gk IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'gk_required'); END IF;

  IF v_def_n < 4 AND p_slot_def4 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def4'); END IF;
  IF v_def_n < 3 AND p_slot_def3 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def3'); END IF;
  IF v_def_n < 2 AND p_slot_def2 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'def2'); END IF;
  IF p_slot_def1 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def2 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def3 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF p_slot_def4 IS NOT NULL THEN v_def_f := v_def_f + 1; END IF;
  IF v_def_f != v_def_n THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_def', 'expected', v_def_n, 'actual', v_def_f); END IF;

  IF v_mid_n < 4 AND p_slot_mid4 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid4'); END IF;
  IF v_mid_n < 3 AND p_slot_mid3 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid3'); END IF;
  IF v_mid_n < 2 AND p_slot_mid2 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'mid2'); END IF;
  IF p_slot_mid1 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid2 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid3 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF p_slot_mid4 IS NOT NULL THEN v_mid_f := v_mid_f + 1; END IF;
  IF v_mid_f != v_mid_n THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_mid', 'expected', v_mid_n, 'actual', v_mid_f); END IF;

  IF v_att_n < 3 AND p_slot_att3 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'att3'); END IF;
  IF v_att_n < 2 AND p_slot_att2 IS NOT NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'extra_slot_for_formation', 'slot', 'att2'); END IF;
  IF p_slot_att IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF p_slot_att2 IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF p_slot_att3 IS NOT NULL THEN v_att_f := v_att_f + 1; END IF;
  IF v_att_f != v_att_n THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_slot_count_att', 'expected', v_att_n, 'actual', v_att_f); END IF;

  IF p_captain_slot IS NOT NULL THEN
    v_slot_filled := CASE p_captain_slot
      WHEN 'gk' THEN p_slot_gk IS NOT NULL
      WHEN 'def1' THEN p_slot_def1 IS NOT NULL WHEN 'def2' THEN p_slot_def2 IS NOT NULL
      WHEN 'def3' THEN p_slot_def3 IS NOT NULL WHEN 'def4' THEN p_slot_def4 IS NOT NULL
      WHEN 'mid1' THEN p_slot_mid1 IS NOT NULL WHEN 'mid2' THEN p_slot_mid2 IS NOT NULL
      WHEN 'mid3' THEN p_slot_mid3 IS NOT NULL WHEN 'mid4' THEN p_slot_mid4 IS NOT NULL
      WHEN 'att' THEN p_slot_att IS NOT NULL WHEN 'att2' THEN p_slot_att2 IS NOT NULL
      WHEN 'att3' THEN p_slot_att3 IS NOT NULL ELSE FALSE
    END;
    IF NOT v_slot_filled THEN RETURN jsonb_build_object('ok', false, 'error', 'captain_slot_empty', 'captain_slot', p_captain_slot); END IF;
  END IF;

  v_wildcard_count := COALESCE(array_length(p_wildcard_slots, 1), 0);
  IF v_wildcard_count > 0 THEN
    FOR v_i IN 1..v_wildcard_count LOOP
      v_key := p_wildcard_slots[v_i];
      IF NOT v_key = ANY(v_slot_keys) THEN RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_invalid', 'slot', v_key); END IF;
      v_slot_filled := CASE v_key
        WHEN 'gk' THEN p_slot_gk IS NOT NULL
        WHEN 'def1' THEN p_slot_def1 IS NOT NULL WHEN 'def2' THEN p_slot_def2 IS NOT NULL
        WHEN 'def3' THEN p_slot_def3 IS NOT NULL WHEN 'def4' THEN p_slot_def4 IS NOT NULL
        WHEN 'mid1' THEN p_slot_mid1 IS NOT NULL WHEN 'mid2' THEN p_slot_mid2 IS NOT NULL
        WHEN 'mid3' THEN p_slot_mid3 IS NOT NULL WHEN 'mid4' THEN p_slot_mid4 IS NOT NULL
        WHEN 'att' THEN p_slot_att IS NOT NULL WHEN 'att2' THEN p_slot_att2 IS NOT NULL
        WHEN 'att3' THEN p_slot_att3 IS NOT NULL ELSE FALSE
      END;
      IF NOT v_slot_filled THEN RETURN jsonb_build_object('ok', false, 'error', 'wildcard_slot_empty', 'slot', v_key); END IF;
    END LOOP;
  END IF;

  v_seen := '{}';
  FOR v_i IN 1..12 LOOP
    v_pid := v_all_slots[v_i];
    IF v_pid IS NOT NULL THEN
      IF v_pid = ANY(v_seen) THEN RETURN jsonb_build_object('ok', false, 'error', 'duplicate_player', 'player_id', v_pid); END IF;
      v_seen := array_append(v_seen, v_pid);
    END IF;
  END LOOP;

  IF v_event.max_per_club IS NOT NULL THEN
    SELECT MAX(cnt) INTO v_max_per_club_used FROM (
      SELECT p.club_id, COUNT(*) AS cnt
      FROM unnest(v_all_slots) AS s(pid)
      JOIN public.players p ON p.id = s.pid
      WHERE s.pid IS NOT NULL AND p.club_id IS NOT NULL
      GROUP BY p.club_id
    ) club_counts;
    IF v_max_per_club_used > v_event.max_per_club THEN
      RETURN jsonb_build_object('ok', false, 'error', 'max_per_club_exceeded', 'max', v_event.max_per_club, 'used', v_max_per_club_used);
    END IF;
  END IF;

  IF p_bench_order IS NULL OR array_length(p_bench_order, 1) IS DISTINCT FROM 3
     OR NOT (1 = ANY(p_bench_order)) OR NOT (2 = ANY(p_bench_order)) OR NOT (3 = ANY(p_bench_order)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_bench_order');
  END IF;

  IF p_bench_gk IS NOT NULL THEN
    SELECT position INTO v_bench_pos FROM public.players WHERE id = p_bench_gk;
    IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_player_not_found', 'slot', 'bench_gk'); END IF;
    IF v_bench_pos IS DISTINCT FROM 'GK' THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bench_gk_position_mismatch', 'actual', v_bench_pos);
    END IF;
  END IF;

  FOR v_i IN 1..3 LOOP
    v_pid := CASE v_i WHEN 1 THEN p_bench_o1 WHEN 2 THEN p_bench_o2 WHEN 3 THEN p_bench_o3 END;
    IF v_pid IS NOT NULL THEN
      SELECT position INTO v_bench_pos FROM public.players WHERE id = v_pid;
      IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_player_not_found', 'slot', 'bench_o' || v_i); END IF;
      IF v_bench_pos NOT IN ('DEF','MID','ATT') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'bench_outfield_position_mismatch', 'slot', 'bench_o' || v_i, 'actual', v_bench_pos);
      END IF;
    END IF;
  END LOOP;

  v_bench_uids := ARRAY[]::UUID[];
  FOREACH v_pid IN ARRAY ARRAY[p_bench_gk, p_bench_o1, p_bench_o2, p_bench_o3] LOOP
    IF v_pid IS NOT NULL THEN
      IF v_pid = ANY(v_bench_uids) THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_duplicate', 'player_id', v_pid); END IF;
      IF v_pid = ANY(v_seen) THEN RETURN jsonb_build_object('ok', false, 'error', 'bench_overlaps_starter', 'player_id', v_pid); END IF;
      v_bench_uids := array_append(v_bench_uids, v_pid);
    END IF;
  END LOOP;

  FOREACH v_pid IN ARRAY v_bench_uids LOOP
    SELECT COALESCE(h.quantity, 0) INTO v_bench_holdings FROM public.holdings h
    WHERE h.user_id = p_user_id AND h.player_id = v_pid;
    IF NOT FOUND OR COALESCE(v_bench_holdings, 0) < 1 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'bench_not_in_holdings', 'player_id', v_pid, 'available', COALESCE(v_bench_holdings, 0));
    END IF;
  END LOOP;

  IF v_event.league_id IS NOT NULL THEN
    FOR v_i IN 1..12 LOOP
      v_pid := v_all_slots[v_i];
      IF v_pid IS NOT NULL THEN
        PERFORM 1 FROM public.players p
        JOIN public.clubs c ON c.id = p.club_id
        WHERE p.id = v_pid AND c.league_id = v_event.league_id;
        IF NOT FOUND THEN
          RETURN jsonb_build_object('ok', false, 'error', 'player_not_in_event_league', 'player_id', v_pid);
        END IF;
      END IF;
    END LOOP;
    FOREACH v_pid IN ARRAY v_bench_uids LOOP
      PERFORM 1 FROM public.players p
      JOIN public.clubs c ON c.id = p.club_id
      WHERE p.id = v_pid AND c.league_id = v_event.league_id;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'player_not_in_event_league', 'player_id', v_pid);
      END IF;
    END LOOP;
  END IF;

  IF v_event.lineup_rules IS NOT NULL AND jsonb_typeof(v_event.lineup_rules) = 'array'
     AND jsonb_array_length(v_event.lineup_rules) > 0 THEN
    FOR v_rule IN SELECT * FROM jsonb_array_elements(v_event.lineup_rules) LOOP
      v_rule_type := v_rule->>'type';
      IF v_rule_type IS NULL OR v_rule_type NOT IN ('min_per_own_club','age_max','age_min','min_per_position','mv_max_eur','max_per_position','mv_min_eur','nation_in','max_per_nation') THEN
        RETURN jsonb_build_object('ok', false, 'error', 'unknown_lineup_rule', 'rule', v_rule_type);
      END IF;

      IF v_rule_type = 'nation_in' THEN
        IF jsonb_typeof(v_rule->'values') IS DISTINCT FROM 'array'
           OR jsonb_array_length(v_rule->'values') = 0 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        v_nation_values := ARRAY(SELECT jsonb_array_elements_text(v_rule->'values'));
        IF EXISTS (SELECT 1 FROM unnest(v_nation_values) AS e
                   WHERE char_length(e) < 2 OR char_length(e) > 6) THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        FOR v_i IN 1..12 LOOP
          v_pid := v_all_slots[v_i];
          IF v_pid IS NOT NULL THEN
            SELECT nationality_iso INTO v_player_nat FROM public.players WHERE id = v_pid;
            IF COALESCE(v_player_nat, '') = '' OR NOT (v_player_nat = ANY(v_nation_values)) THEN
              RETURN jsonb_build_object('ok', false, 'error', 'nation_not_allowed',
                'player_id', v_pid, 'nation', COALESCE(v_player_nat, ''));
            END IF;
          END IF;
        END LOOP;
        FOREACH v_pid IN ARRAY v_bench_uids LOOP
          SELECT nationality_iso INTO v_player_nat FROM public.players WHERE id = v_pid;
          IF COALESCE(v_player_nat, '') = '' OR NOT (v_player_nat = ANY(v_nation_values)) THEN
            RETURN jsonb_build_object('ok', false, 'error', 'nation_not_allowed',
              'player_id', v_pid, 'nation', COALESCE(v_player_nat, ''));
          END IF;
        END LOOP;
        CONTINUE;
      END IF;

      IF (v_rule->>'value') IS NULL OR (v_rule->>'value') !~ '^[0-9]+$' THEN
        RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
      END IF;
      v_rule_value := (v_rule->>'value')::BIGINT;

      IF v_rule_type = 'min_per_own_club' THEN
        IF v_rule_value < 1 OR v_rule_value > 11 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        SELECT COUNT(*) INTO v_own_club_count
        FROM unnest(v_all_slots) AS s(pid)
        JOIN public.players p ON p.id = s.pid
        WHERE s.pid IS NOT NULL
          AND v_event.club_id IS NOT NULL
          AND p.club_id = v_event.club_id;
        IF COALESCE(v_own_club_count, 0) < v_rule_value THEN
          RETURN jsonb_build_object('ok', false, 'error', 'min_per_own_club_not_met',
                                    'min', v_rule_value, 'used', COALESCE(v_own_club_count, 0));
        END IF;

      ELSIF v_rule_type IN ('age_max','age_min') THEN
        IF v_rule_value < 14 OR v_rule_value > 50 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        FOR v_i IN 1..12 LOOP
          v_pid := v_all_slots[v_i];
          IF v_pid IS NOT NULL THEN
            SELECT age INTO v_player_age FROM public.players WHERE id = v_pid;
            IF v_player_age IS NULL
               OR (v_rule_type = 'age_max' AND v_player_age > v_rule_value)
               OR (v_rule_type = 'age_min' AND v_player_age < v_rule_value) THEN
              RETURN jsonb_build_object('ok', false,
                'error', CASE v_rule_type WHEN 'age_max' THEN 'age_max_exceeded' ELSE 'age_min_not_met' END,
                'limit', v_rule_value, 'player_id', v_pid, 'age', v_player_age);
            END IF;
          END IF;
        END LOOP;
        FOREACH v_pid IN ARRAY v_bench_uids LOOP
          SELECT age INTO v_player_age FROM public.players WHERE id = v_pid;
          IF v_player_age IS NULL
             OR (v_rule_type = 'age_max' AND v_player_age > v_rule_value)
             OR (v_rule_type = 'age_min' AND v_player_age < v_rule_value) THEN
            RETURN jsonb_build_object('ok', false,
              'error', CASE v_rule_type WHEN 'age_max' THEN 'age_max_exceeded' ELSE 'age_min_not_met' END,
              'limit', v_rule_value, 'player_id', v_pid, 'age', v_player_age);
          END IF;
        END LOOP;

      ELSIF v_rule_type = 'mv_max_eur' THEN
        IF v_rule_value < 1 OR v_rule_value > 1000000000 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        FOR v_i IN 1..12 LOOP
          v_pid := v_all_slots[v_i];
          IF v_pid IS NOT NULL THEN
            SELECT market_value_eur INTO v_player_mv FROM public.players WHERE id = v_pid;
            IF v_player_mv IS NULL OR v_player_mv = 0 OR v_player_mv > v_rule_value THEN
              RETURN jsonb_build_object('ok', false, 'error', 'mv_max_exceeded',
                'limit', v_rule_value, 'player_id', v_pid, 'mv', v_player_mv);
            END IF;
          END IF;
        END LOOP;
        FOREACH v_pid IN ARRAY v_bench_uids LOOP
          SELECT market_value_eur INTO v_player_mv FROM public.players WHERE id = v_pid;
          IF v_player_mv IS NULL OR v_player_mv = 0 OR v_player_mv > v_rule_value THEN
            RETURN jsonb_build_object('ok', false, 'error', 'mv_max_exceeded',
              'limit', v_rule_value, 'player_id', v_pid, 'mv', v_player_mv);
          END IF;
        END LOOP;

      ELSIF v_rule_type = 'mv_min_eur' THEN
        IF v_rule_value < 1 OR v_rule_value > 1000000000 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        FOR v_i IN 1..12 LOOP
          v_pid := v_all_slots[v_i];
          IF v_pid IS NOT NULL THEN
            SELECT market_value_eur INTO v_player_mv FROM public.players WHERE id = v_pid;
            IF v_player_mv IS NULL OR v_player_mv = 0 OR v_player_mv < v_rule_value THEN
              RETURN jsonb_build_object('ok', false, 'error', 'mv_min_not_met',
                'limit', v_rule_value, 'player_id', v_pid, 'mv', v_player_mv);
            END IF;
          END IF;
        END LOOP;
        FOREACH v_pid IN ARRAY v_bench_uids LOOP
          SELECT market_value_eur INTO v_player_mv FROM public.players WHERE id = v_pid;
          IF v_player_mv IS NULL OR v_player_mv = 0 OR v_player_mv < v_rule_value THEN
            RETURN jsonb_build_object('ok', false, 'error', 'mv_min_not_met',
              'limit', v_rule_value, 'player_id', v_pid, 'mv', v_player_mv);
          END IF;
        END LOOP;

      ELSIF v_rule_type IN ('min_per_position','max_per_position') THEN
        v_rule_position := v_rule->>'position';
        IF v_rule_position IS NULL OR v_rule_position NOT IN ('GK','DEF','MID','ATT') THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        IF v_rule_value < 1 OR v_rule_value > 11 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        SELECT COUNT(*) INTO v_pos_count
        FROM unnest(v_all_slots) AS s(pid)
        JOIN public.players p ON p.id = s.pid
        WHERE s.pid IS NOT NULL AND p.position = v_rule_position;
        IF v_rule_type = 'min_per_position' AND COALESCE(v_pos_count, 0) < v_rule_value THEN
          RETURN jsonb_build_object('ok', false, 'error', 'min_per_position_not_met',
            'position', v_rule_position, 'min', v_rule_value, 'used', COALESCE(v_pos_count, 0));
        END IF;
        IF v_rule_type = 'max_per_position' AND COALESCE(v_pos_count, 0) > v_rule_value THEN
          RETURN jsonb_build_object('ok', false, 'error', 'max_per_position_exceeded',
            'position', v_rule_position, 'max', v_rule_value, 'used', COALESCE(v_pos_count, 0));
        END IF;

      ELSIF v_rule_type = 'max_per_nation' THEN
        IF v_rule_value < 1 OR v_rule_value > 11 THEN
          RETURN jsonb_build_object('ok', false, 'error', 'invalid_lineup_rule_value', 'rule', v_rule_type);
        END IF;
        SELECT MAX(cnt) INTO v_nat_count FROM (
          SELECT p.nationality_iso, COUNT(*) AS cnt
          FROM unnest(v_all_slots) AS s(pid)
          JOIN public.players p ON p.id = s.pid
          WHERE s.pid IS NOT NULL AND p.nationality_iso <> ''
          GROUP BY p.nationality_iso
        ) nat_counts;
        IF COALESCE(v_nat_count, 0) > v_rule_value THEN
          RETURN jsonb_build_object('ok', false, 'error', 'max_per_nation_exceeded',
            'max', v_rule_value, 'used', COALESCE(v_nat_count, 0));
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_min_sc := COALESCE(v_event.min_sc_per_slot, 1);
  FOR v_i IN 1..12 LOOP
    v_pid := v_all_slots[v_i]; v_key := v_slot_keys[v_i];
    IF v_pid IS NOT NULL AND NOT (v_key = ANY(p_wildcard_slots)) THEN
      SELECT COALESCE(h.quantity, 0) - COALESCE(
        (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
         WHERE hl.user_id = p_user_id AND hl.player_id = v_pid AND hl.event_id != p_event_id), 0)
      INTO v_available FROM public.holdings h WHERE h.user_id = p_user_id AND h.player_id = v_pid;
      IF NOT FOUND OR COALESCE(v_available, 0) < v_min_sc THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_sc', 'player_id', v_pid, 'available', COALESCE(v_available, 0), 'required', v_min_sc);
      END IF;
    END IF;
  END LOOP;

  IF v_wildcard_count > 0 THEN
    IF NOT COALESCE(v_event.wildcards_allowed, false) THEN RETURN jsonb_build_object('ok', false, 'error', 'wildcards_not_allowed'); END IF;
    IF v_wildcard_count > COALESCE(v_event.max_wildcards_per_lineup, 0) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'too_many_wildcards', 'used', v_wildcard_count, 'max', v_event.max_wildcards_per_lineup);
    END IF;
  END IF;

  IF v_event.salary_cap IS NOT NULL THEN
    v_total_salary := 0;
    FOR v_i IN 1..12 LOOP
      v_pid := v_all_slots[v_i];
      IF v_pid IS NOT NULL THEN
        SELECT COALESCE(p.perf_l5, 50) INTO v_player_perf FROM public.players p WHERE p.id = v_pid;
        v_total_salary := v_total_salary + COALESCE(v_player_perf, 50);
      END IF;
    END LOOP;
    IF v_total_salary > v_event.salary_cap THEN
      RETURN jsonb_build_object('ok', false, 'error', 'salary_cap_exceeded', 'total_salary', v_total_salary, 'cap', v_event.salary_cap);
    END IF;
  END IF;

  SELECT id, COALESCE(array_length(wildcard_slots, 1), 0) AS wc_count INTO v_existing
  FROM public.lineups WHERE event_id = p_event_id AND user_id = p_user_id;
  v_old_wildcard_count := COALESCE(v_existing.wc_count, 0);

  IF v_existing IS NULL THEN
    INSERT INTO public.lineups (
      event_id, user_id, formation, captain_slot, wildcard_slots, submitted_at, locked,
      slot_gk, slot_def1, slot_def2, slot_def3, slot_def4,
      slot_mid1, slot_mid2, slot_mid3, slot_mid4,
      slot_att, slot_att2, slot_att3,
      bench_gk, bench_o1, bench_o2, bench_o3, bench_order
    ) VALUES (
      p_event_id, p_user_id, v_formation_trim, p_captain_slot, p_wildcard_slots, now(), false,
      p_slot_gk, p_slot_def1, p_slot_def2, p_slot_def3, p_slot_def4,
      p_slot_mid1, p_slot_mid2, p_slot_mid3, p_slot_mid4,
      p_slot_att, p_slot_att2, p_slot_att3,
      p_bench_gk, p_bench_o1, p_bench_o2, p_bench_o3, p_bench_order
    ) RETURNING id INTO v_lineup_id;
  ELSE
    UPDATE public.lineups SET
      formation = v_formation_trim, captain_slot = p_captain_slot,
      wildcard_slots = p_wildcard_slots, submitted_at = now(),
      slot_gk = p_slot_gk, slot_def1 = p_slot_def1, slot_def2 = p_slot_def2,
      slot_def3 = p_slot_def3, slot_def4 = p_slot_def4,
      slot_mid1 = p_slot_mid1, slot_mid2 = p_slot_mid2,
      slot_mid3 = p_slot_mid3, slot_mid4 = p_slot_mid4,
      slot_att = p_slot_att, slot_att2 = p_slot_att2, slot_att3 = p_slot_att3,
      bench_gk = p_bench_gk, bench_o1 = p_bench_o1,
      bench_o2 = p_bench_o2, bench_o3 = p_bench_o3,
      bench_order = p_bench_order
    WHERE event_id = p_event_id AND user_id = p_user_id RETURNING id INTO v_lineup_id;
  END IF;

  DELETE FROM public.holding_locks WHERE event_id = p_event_id AND user_id = p_user_id;

  INSERT INTO public.holding_locks (user_id, player_id, event_id, quantity_locked)
  SELECT p_user_id, pid, p_event_id, v_min_sc
  FROM unnest(v_all_slots) WITH ORDINALITY AS t(pid, ord)
  WHERE pid IS NOT NULL AND NOT v_slot_keys[ord::int] = ANY(p_wildcard_slots);

  v_wildcard_delta := v_wildcard_count - v_old_wildcard_count;
  IF v_wildcard_delta != 0 THEN
    -- Slice 396: Liga-Auflösung = COALESCE(events.league_id, club→league).
    -- Vereinslose user-Events (club_id NULL) + liga-gebunden nutzen events.league_id direkt.
    v_event_league_id := v_event.league_id;
    IF v_event_league_id IS NULL AND v_event.club_id IS NOT NULL THEN
      SELECT c.league_id INTO v_event_league_id
      FROM public.clubs c
      WHERE c.id = v_event.club_id;
    END IF;

    IF v_event_league_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'success', false, 'error', 'invalid_event_no_league');
    END IF;

    IF v_wildcard_delta > 0 THEN
      PERFORM public.spend_wildcards(
        p_user_id, v_wildcard_delta, 'lineup_wildcard', v_event_league_id, p_event_id);
    ELSE
      PERFORM public.earn_wildcards(
        p_user_id, ABS(v_wildcard_delta), 'lineup_wildcard_refund', v_event_league_id, p_event_id,
        format('Wildcard Refund (%s) fuer Event', ABS(v_wildcard_delta)));
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'lineup_id', v_lineup_id, 'is_new', v_existing IS NULL);
END;
$function$;
