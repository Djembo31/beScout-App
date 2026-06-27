-- Slice 419 — Welle 2.1+2.2: player_gameweek_scores fixture-gebunden (Sorare-Pro) + score_event liga-bewusst
-- CEO-Entscheid Anil 2026-06-27: Option A Fixture-bound. Orphans (1401, GW32-35 ohne Spiel) löschen.
-- D87: gegen Live-pg_get_functiondef (sync_fixture_scores + score_event), nicht Migrations-Datei.
-- Force-rollback bewiesen: orphans_deleted=1401, null_after=0, total_after=60061, UNIQUE-Flip OK.

-- ============================================================
-- 1. SCHEMA: fixture_id + league_id, Backfill, Orphan-Delete, UNIQUE-Flip
-- ============================================================
ALTER TABLE player_gameweek_scores ADD COLUMN IF NOT EXISTS fixture_id uuid;
ALTER TABLE player_gameweek_scores ADD COLUMN IF NOT EXISTS league_id uuid;

-- Backfill aus der Wahrheits-Quelle fixture_player_stats JOIN fixtures.
-- DISTINCT ON (player, gameweek): 60058 sauber eindeutig; 3 Kollisions-Zeilen
-- bekommen deterministisch das jüngste Fixture (played_at DESC) — Score bleibt,
-- künftige Syncs splitten per-fixture. fps.player_id nullable → gefiltert.
UPDATE player_gameweek_scores pgs
SET fixture_id = sub.fid, league_id = sub.lid
FROM (
  SELECT DISTINCT ON (fps.player_id, f.gameweek)
         fps.player_id AS pid, f.gameweek AS gw, f.id AS fid, f.league_id AS lid
  FROM fixture_player_stats fps
  JOIN fixtures f ON f.id = fps.fixture_id
  WHERE f.status IN ('simulated','finished') AND fps.player_id IS NOT NULL
  ORDER BY fps.player_id, f.gameweek, f.played_at DESC NULLS LAST, f.id
) sub
WHERE pgs.player_id = sub.pid AND pgs.gameweek = sub.gw;

-- Orphans (1401, herkunftslose Mock-Scores GW32-35) löschen — CEO-approved.
DELETE FROM player_gameweek_scores WHERE fixture_id IS NULL;

-- Constraints: NOT NULL + UNIQUE-Flip (player,gameweek)→(player,fixture) + FKs
ALTER TABLE player_gameweek_scores
  ALTER COLUMN fixture_id SET NOT NULL,
  ALTER COLUMN league_id SET NOT NULL;

ALTER TABLE player_gameweek_scores
  DROP CONSTRAINT IF EXISTS player_gameweek_scores_player_gameweek_key;

ALTER TABLE player_gameweek_scores
  ADD CONSTRAINT player_gameweek_scores_player_fixture_key UNIQUE (player_id, fixture_id);

ALTER TABLE player_gameweek_scores
  ADD CONSTRAINT player_gameweek_scores_fixture_id_fkey FOREIGN KEY (fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE;

ALTER TABLE player_gameweek_scores
  ADD CONSTRAINT player_gameweek_scores_league_id_fkey FOREIGN KEY (league_id) REFERENCES leagues(id);

-- Index für liga-gefilterte Reads (score_event: player+gameweek+league). gameweek-Index bleibt.
CREATE INDEX IF NOT EXISTS idx_pgs_player_gw_league
  ON player_gameweek_scores USING btree (player_id, gameweek, league_id);

-- ============================================================
-- 2. WRITER: sync_fixture_scores — pro Spiel schreiben (kein GW-Kollaps mehr)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_fixture_scores(p_gameweek integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INT := 0;
BEGIN
  -- Auth guard
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required: Nicht authentifiziert';
  END IF;

  -- Admin guard: must be any club admin
  IF NOT EXISTS (SELECT 1 FROM club_admins WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'admin_required: Keine Berechtigung';
  END IF;

  -- Slice 419: one row per (player, fixture) — fixture-bound, league denormalized.
  -- Score: rating*10 when available, fallback fantasy_points*5 for legacy data.
  INSERT INTO player_gameweek_scores (player_id, fixture_id, league_id, gameweek, score)
  SELECT
    fps.player_id,
    fps.fixture_id,
    f.league_id,
    p_gameweek,
    CASE
      WHEN fps.rating IS NOT NULL THEN LEAST(100, GREATEST(0, ROUND(fps.rating * 10)))::INT
      ELSE LEAST(100, GREATEST(0, ROUND(fps.fantasy_points * 5)))::INT
    END
  FROM fixture_player_stats fps
  JOIN fixtures f ON f.id = fps.fixture_id
  WHERE f.gameweek = p_gameweek AND f.status IN ('simulated', 'finished')
    AND fps.player_id IS NOT NULL
  ON CONFLICT (player_id, fixture_id)
  DO UPDATE SET score = EXCLUDED.score, league_id = EXCLUDED.league_id, gameweek = EXCLUDED.gameweek;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object('success', true, 'synced_count', v_count);
END;
$function$;

-- ============================================================
-- 3. MONEY-READER: score_event — Event-Liga auflösen, liga-gefiltert lesen
--    PATCH-AUDIT (S156): nur 4 Änderungen ggü. Live-Baseline (D87):
--      (a) DECLARE v_event_league UUID;
--      (b) v_event_league := COALESCE(events.league_id, clubs.league_id) nach gameweek-Check
--      (c) v_played-Join: + (v_event_league IS NULL OR f.league_id = v_event_league)
--      (d) Score-Lookup: SELECT INTO → SUM(score)::INT + league-Filter
--    Alles andere (Auto-Sub, Captain 1.1/1.25, Equipment, Synergy, Streak,
--    Reward-FLOOR, User-Event-Settlement, perf_l5/l15, Treasury) byte-identisch.
-- ============================================================
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
  -- Slice 419: fixture-bound scores are league-scoped
  v_event_league UUID;
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

  -- Slice 419: resolve the event's league once. events.league_id rarely set (1/210);
  -- club_id covers 208/210 → fall back to the club's league. NULL (2 club-/league-less
  -- events) → league-open read (legacy gameweek-only semantics, no break).
  v_event_league := COALESCE(v_event.league_id, (SELECT league_id FROM clubs WHERE id = v_event.club_id));

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

    -- Slice 419: minutes-join now league-filtered (no cross-league minute-summing on GW collision).
    SELECT COALESCE(jsonb_object_agg(p::text, mp), '{}'::jsonb) INTO v_played
    FROM (
      SELECT fps.player_id AS p, COALESCE(SUM(fps.minutes_played), 0)::INT AS mp
      FROM public.fixture_player_stats fps
      JOIN public.fixtures f ON f.id = fps.fixture_id
      WHERE f.gameweek = v_event.gameweek AND fps.player_id IS NOT NULL
        AND (v_event_league IS NULL OR f.league_id = v_event_league)
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

        -- Slice 419: SUM league-filtered fixture scores (deterministic; 99.9% = 1 row = unchanged).
        SELECT SUM(pgs.score)::INT INTO v_gw_score FROM player_gameweek_scores pgs
        WHERE pgs.player_id = v_player_id AND pgs.gameweek = v_event.gameweek
          AND (v_event_league IS NULL OR pgs.league_id = v_event_league);

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
