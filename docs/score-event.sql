-- ============================================
-- score_event RPC v3 — Fixture-Aware Scoring
-- Run this in Supabase SQL Editor
-- ============================================
-- Changes from v2:
--   - FIXTURE-AWARE: If event has a gameweek, uses fixture_player_stats data
--   - Score conversion: LEAST(150, GREATEST(40, 40 + fantasy_points * 6))
--   - Falls back to random scoring for non-GW events or missing fixture data
-- Changes from v1:
--   - NEW TABLE player_gameweek_scores: one canonical score per player per event
--   - Each player gets ONE score (not random per lineup)
--   - All lineups with the same player get the same score
--   - perf_l5 / perf_l15 updated from gameweek history

-- ============================================
-- Step 1: Create player_gameweek_scores table
-- ============================================

CREATE TABLE IF NOT EXISTS player_gameweek_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id),
  event_id UUID NOT NULL REFERENCES events(id),
  score INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(player_id, event_id)
);

ALTER TABLE player_gameweek_scores ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all scores
CREATE POLICY "Authenticated users can read gameweek scores"
  ON player_gameweek_scores FOR SELECT
  TO authenticated
  USING (true);

-- Step 2: Ensure slot_scores column exists on lineups
ALTER TABLE lineups ADD COLUMN IF NOT EXISTS slot_scores JSONB DEFAULT NULL;

-- ============================================
-- Step 3: Rewritten score_event RPC
-- ============================================

CREATE OR REPLACE FUNCTION score_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event        RECORD;
  v_lineup       RECORD;
  v_player_rec   RECORD;
  v_slot_id      UUID;
  v_slot_name    TEXT;
  v_pos          TEXT;
  v_base         INT;
  v_bonus        INT;
  v_player_score INT;
  v_total        INT;
  v_scores       JSONB;
  v_scored_count INT := 0;
  v_winner_name  TEXT := '';
  v_prize_pool   BIGINT;
  v_rank_row     RECORD;
  v_total_ranked INT;
  v_avg          NUMERIC;
  v_all_player_ids UUID[];
  v_pid          UUID;
  v_fixture_score INT;
BEGIN
  -- 1. Validate event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event nicht gefunden');
  END IF;

  IF v_event.status = 'ended' AND v_event.scored_at IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event wurde bereits ausgewertet');
  END IF;

  v_prize_pool := v_event.prize_pool;

  -- 2. Collect ALL unique player IDs from all lineups of this event (NULL-safe)
  SELECT ARRAY(
    SELECT DISTINCT u FROM (
      SELECT unnest(ARRAY[slot_gk, slot_def1, slot_def2, slot_mid1, slot_mid2, slot_att]) AS u
      FROM lineups
      WHERE event_id = p_event_id
    ) sub WHERE u IS NOT NULL
  ) INTO v_all_player_ids;

  -- 3. Generate ONE canonical score per player and insert into player_gameweek_scores
  --    NEW v3: If event has a gameweek, try fixture_player_stats first
  FOREACH v_pid IN ARRAY v_all_player_ids
  LOOP
    -- Skip if already scored
    IF NOT EXISTS (SELECT 1 FROM player_gameweek_scores WHERE player_id = v_pid AND event_id = p_event_id) THEN
      v_fixture_score := NULL;

      -- Try to get score from fixture data if event has a gameweek
      IF v_event.gameweek IS NOT NULL THEN
        SELECT LEAST(150, GREATEST(40, 40 + (fps.fantasy_points * 6)))
        INTO v_fixture_score
        FROM fixture_player_stats fps
        JOIN fixtures f ON fps.fixture_id = f.id
        WHERE fps.player_id = v_pid AND f.gameweek = v_event.gameweek
        LIMIT 1;
      END IF;

      IF v_fixture_score IS NOT NULL THEN
        -- Use fixture-based score
        v_player_score := v_fixture_score;
      ELSE
        -- Fallback: random score (for non-GW events or players without fixture data)
        SELECT position INTO v_pos FROM players WHERE id = v_pid;
        v_base := 40 + floor(random() * 61)::INT;  -- 40..100
        CASE COALESCE(v_pos, 'MID')
          WHEN 'ATT' THEN v_bonus := floor(random() * 51)::INT;  -- 0..50
          WHEN 'MID' THEN v_bonus := floor(random() * 41)::INT;  -- 0..40
          WHEN 'DEF' THEN v_bonus := floor(random() * 26)::INT;  -- 0..25
          WHEN 'GK'  THEN v_bonus := floor(random() * 21)::INT;  -- 0..20
          ELSE v_bonus := floor(random() * 31)::INT;
        END CASE;
        v_player_score := v_base + v_bonus;
      END IF;

      INSERT INTO player_gameweek_scores (player_id, event_id, score)
      VALUES (v_pid, p_event_id, v_player_score)
      ON CONFLICT (player_id, event_id) DO NOTHING;
    END IF;
  END LOOP;

  -- 4. For each lineup, look up canonical scores and populate slot_scores + total_score
  FOR v_lineup IN
    SELECT * FROM lineups WHERE event_id = p_event_id
  LOOP
    v_total := 0;
    v_scores := '{}'::JSONB;

    -- slot_gk
    IF v_lineup.slot_gk IS NOT NULL THEN
      SELECT score INTO v_player_score FROM player_gameweek_scores WHERE player_id = v_lineup.slot_gk AND event_id = p_event_id;
      IF v_player_score IS NOT NULL THEN
        v_total := v_total + v_player_score;
        v_scores := v_scores || jsonb_build_object('gk', v_player_score);
      END IF;
    END IF;

    -- slot_def1
    IF v_lineup.slot_def1 IS NOT NULL THEN
      SELECT score INTO v_player_score FROM player_gameweek_scores WHERE player_id = v_lineup.slot_def1 AND event_id = p_event_id;
      IF v_player_score IS NOT NULL THEN
        v_total := v_total + v_player_score;
        v_scores := v_scores || jsonb_build_object('def1', v_player_score);
      END IF;
    END IF;

    -- slot_def2
    IF v_lineup.slot_def2 IS NOT NULL THEN
      SELECT score INTO v_player_score FROM player_gameweek_scores WHERE player_id = v_lineup.slot_def2 AND event_id = p_event_id;
      IF v_player_score IS NOT NULL THEN
        v_total := v_total + v_player_score;
        v_scores := v_scores || jsonb_build_object('def2', v_player_score);
      END IF;
    END IF;

    -- slot_mid1
    IF v_lineup.slot_mid1 IS NOT NULL THEN
      SELECT score INTO v_player_score FROM player_gameweek_scores WHERE player_id = v_lineup.slot_mid1 AND event_id = p_event_id;
      IF v_player_score IS NOT NULL THEN
        v_total := v_total + v_player_score;
        v_scores := v_scores || jsonb_build_object('mid1', v_player_score);
      END IF;
    END IF;

    -- slot_mid2
    IF v_lineup.slot_mid2 IS NOT NULL THEN
      SELECT score INTO v_player_score FROM player_gameweek_scores WHERE player_id = v_lineup.slot_mid2 AND event_id = p_event_id;
      IF v_player_score IS NOT NULL THEN
        v_total := v_total + v_player_score;
        v_scores := v_scores || jsonb_build_object('mid2', v_player_score);
      END IF;
    END IF;

    -- slot_att
    IF v_lineup.slot_att IS NOT NULL THEN
      SELECT score INTO v_player_score FROM player_gameweek_scores WHERE player_id = v_lineup.slot_att AND event_id = p_event_id;
      IF v_player_score IS NOT NULL THEN
        v_total := v_total + v_player_score;
        v_scores := v_scores || jsonb_build_object('att', v_player_score);
      END IF;
    END IF;

    -- Update lineup
    UPDATE lineups
    SET total_score = v_total,
        slot_scores = v_scores
    WHERE id = v_lineup.id;
    v_scored_count := v_scored_count + 1;
  END LOOP;

  -- 5. Assign ranks via ROW_NUMBER
  FOR v_rank_row IN
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rn
    FROM lineups
    WHERE event_id = p_event_id AND total_score IS NOT NULL
  LOOP
    UPDATE lineups SET rank = v_rank_row.rn WHERE id = v_rank_row.id;
  END LOOP;

  -- 6. Distribute rewards (same logic as before)
  SELECT COUNT(*) INTO v_total_ranked FROM lineups WHERE event_id = p_event_id AND rank IS NOT NULL;

  IF v_total_ranked >= 3 THEN
    UPDATE lineups SET reward_amount = (v_prize_pool * 50) / 100 WHERE event_id = p_event_id AND rank = 1;
    UPDATE lineups SET reward_amount = (v_prize_pool * 30) / 100 WHERE event_id = p_event_id AND rank = 2;
    UPDATE lineups SET reward_amount = (v_prize_pool * 20) / 100 WHERE event_id = p_event_id AND rank = 3;
  ELSIF v_total_ranked = 2 THEN
    UPDATE lineups SET reward_amount = (v_prize_pool * 60) / 100 WHERE event_id = p_event_id AND rank = 1;
    UPDATE lineups SET reward_amount = (v_prize_pool * 40) / 100 WHERE event_id = p_event_id AND rank = 2;
  ELSIF v_total_ranked = 1 THEN
    UPDATE lineups SET reward_amount = v_prize_pool WHERE event_id = p_event_id AND rank = 1;
  END IF;

  -- 7. Credit rewards to wallets
  FOR v_rank_row IN
    SELECT user_id, reward_amount FROM lineups
    WHERE event_id = p_event_id AND reward_amount > 0
  LOOP
    UPDATE wallets
    SET balance = balance + v_rank_row.reward_amount,
        updated_at = NOW()
    WHERE user_id = v_rank_row.user_id;

    INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
    SELECT
      v_rank_row.user_id,
      'fantasy_reward',
      v_rank_row.reward_amount,
      w.balance,
      p_event_id,
      'Fantasy Reward: ' || v_event.name
    FROM wallets w WHERE w.user_id = v_rank_row.user_id;
  END LOOP;

  -- 8. Update event status
  UPDATE events SET status = 'ended', scored_at = NOW() WHERE id = p_event_id;

  -- 9. Update perf_l5 and perf_l15 for all players who got scored
  FOREACH v_pid IN ARRAY v_all_player_ids
  LOOP
    -- perf_l5 = AVG of last 5 gameweek scores / 1.5 (normalize ~40-150 range to ~0-100)
    SELECT AVG(score) / 1.5 INTO v_avg
    FROM (
      SELECT score FROM player_gameweek_scores
      WHERE player_id = v_pid
      ORDER BY created_at DESC
      LIMIT 5
    ) sub;

    IF v_avg IS NOT NULL THEN
      UPDATE players SET perf_l5 = ROUND(v_avg)::INT WHERE id = v_pid;
    END IF;

    -- perf_l15 = AVG of last 15 gameweek scores / 1.5
    SELECT AVG(score) / 1.5 INTO v_avg
    FROM (
      SELECT score FROM player_gameweek_scores
      WHERE player_id = v_pid
      ORDER BY created_at DESC
      LIMIT 15
    ) sub;

    IF v_avg IS NOT NULL THEN
      UPDATE players SET perf_l15 = ROUND(v_avg)::INT WHERE id = v_pid;
    END IF;
  END LOOP;

  -- 10. Get winner name
  SELECT p.handle INTO v_winner_name
  FROM lineups l
  JOIN profiles p ON p.id = l.user_id
  WHERE l.event_id = p_event_id AND l.rank = 1
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'scored_count', v_scored_count,
    'winner_name', COALESCE(v_winner_name, 'Unbekannt')
  );
END;
$$;
