-- ============================================
-- reset_event RPC v2 — No longer deletes player_gameweek_scores
-- Run this in Supabase SQL Editor
-- ============================================
-- Changes from v1:
--   - Does NOT delete from player_gameweek_scores
--   - Scores belong to gameweeks (not events) — deleting them would affect other events
--   - Only resets lineups, rewards, transactions, and event status
--
-- WARNING: This is a testing/admin tool. Not for production use.

CREATE OR REPLACE FUNCTION reset_event(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event    RECORD;
  v_refund   RECORD;
BEGIN
  -- 1. Validate event exists
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event nicht gefunden');
  END IF;

  -- 2. Refund rewards: subtract reward_amount from wallets
  FOR v_refund IN
    SELECT user_id, reward_amount FROM lineups
    WHERE event_id = p_event_id AND reward_amount > 0
  LOOP
    UPDATE wallets
    SET balance = GREATEST(0, balance - v_refund.reward_amount),
        updated_at = NOW()
    WHERE user_id = v_refund.user_id;
  END LOOP;

  -- 3. Remove reward transactions for this event
  DELETE FROM transactions
  WHERE reference_id = p_event_id
    AND type = 'fantasy_reward';

  -- 4. Reset lineup scores, ranks, rewards
  UPDATE lineups
  SET total_score = NULL,
      slot_scores = NULL,
      rank = NULL,
      reward_amount = 0
  WHERE event_id = p_event_id;

  -- 5. GW scores are NOT deleted — they belong to gameweeks, not events.
  --    Other events referencing the same gameweek would lose data otherwise.

  -- 6. Reset event status AND shift timestamps into the future
  UPDATE events
  SET status = 'registering',
      scored_at = NULL,
      starts_at = NOW() + INTERVAL '1 hour',
      locks_at = NOW() + INTERVAL '55 minutes',
      ends_at = NOW() + INTERVAL '4 hours'
  WHERE id = p_event_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Event wurde zurückgesetzt (GW-Scores bleiben erhalten)'
  );
END;
$$;
