-- =============================================================================
-- AR-50 (J7, 2026-04-15) — record_login_streak Race Condition Fix
--
-- LIVE-EXPLOIT (2 User haben doppelte 100 $SCOUT kassiert):
--   User 99b601d2: 2x 10000c @ 2026-03-15 22:58:48.117 + .120 (3ms Race)
--   User 700c1316: 2x 10000c @ 2026-04-03 + 2026-04-09 (Drop-and-Rebuild)
--   → 200 $SCOUT excess gemintet
--
-- ROOT CAUSE:
--   1. Kein FOR UPDATE Lock auf user_streaks → parallele Calls credit BEIDE
--   2. Tabelle `streak_milestones_claimed` (UNIQUE user_id,milestone) existiert
--      baseline, aber RPC hat sie NIE genutzt → Re-Claim nach streak-reset moeglich
--
-- FIX:
--   - SELECT ... FOR UPDATE auf user_streaks (serialize)
--   - INSERT INTO streak_milestones_claimed ON CONFLICT DO NOTHING vor Wallet-Credit
--   - Wenn CONFLICT (bereits claimed) → skip Wallet + Tx (return 0 reward)
--
-- Reversal der historischen Duplikate + Backfill claimed-table in separater Migration
-- (20260415010100_ar50_j7_streak_backfill_and_reversal.sql).
--
-- SECURITY: REVOKE/GRANT-Block per AR-44 Template erneuert.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.record_login_streak(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_row user_streaks%ROWTYPE;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - 1;
  v_abo_tier TEXT;
  v_max_shields INT;
  v_shield_used BOOLEAN := false;
  v_milestone_reward INT := 0;
  v_milestone_label TEXT := NULL;
  v_new_balance BIGINT;
  v_claimed_id UUID;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  -- AR-50 FIX: FOR UPDATE lock serialisiert parallele Login-Streak-Aufrufe.
  SELECT * INTO v_row FROM user_streaks WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_login_date)
    VALUES (p_user_id, 1, 1, v_today) RETURNING * INTO v_row;
    PERFORM update_mission_progress(p_user_id, 'daily_login', 1);
    RETURN jsonb_build_object('ok', true, 'streak', 1, 'longest', 1, 'shield_used', false, 'shields_remaining', 0, 'milestone_reward', 0);
  END IF;

  IF v_row.last_login_date = v_today THEN
    RETURN jsonb_build_object('ok', true, 'streak', v_row.current_streak, 'longest', v_row.longest_streak, 'shield_used', false, 'shields_remaining', 0, 'milestone_reward', 0, 'already_today', true);
  END IF;

  SELECT cs.tier INTO v_abo_tier FROM club_subscriptions cs
  WHERE cs.user_id = p_user_id AND cs.status = 'active' AND cs.expires_at > now()
  ORDER BY CASE cs.tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1;
  v_max_shields := CASE v_abo_tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 ELSE 0 END;

  IF v_row.shields_refreshed_at IS NULL OR DATE_TRUNC('month', v_row.shields_refreshed_at) < DATE_TRUNC('month', now()) THEN
    UPDATE user_streaks SET shields_used = 0, shields_refreshed_at = now() WHERE user_id = p_user_id;
    v_row.shields_used := 0;
  END IF;

  IF v_row.last_login_date = v_yesterday THEN
    v_row.current_streak := v_row.current_streak + 1;
  ELSIF v_row.last_login_date = v_today - 2 AND v_row.shields_used < v_max_shields THEN
    v_row.current_streak := v_row.current_streak + 1;
    v_row.shields_used := v_row.shields_used + 1;
    v_shield_used := true;
  ELSE
    v_row.current_streak := 1;
  END IF;
  v_row.longest_streak := GREATEST(v_row.longest_streak, v_row.current_streak);

  v_milestone_reward := CASE v_row.current_streak WHEN 3 THEN 10000 WHEN 7 THEN 50000 WHEN 14 THEN 200000 WHEN 30 THEN 500000 ELSE 0 END;
  v_milestone_label := CASE v_row.current_streak
    WHEN 3 THEN '3-Tage-Streak: 100 $SCOUT' WHEN 7 THEN '7-Tage-Streak: 500 $SCOUT'
    WHEN 14 THEN '14-Tage-Streak: 2.000 $SCOUT' WHEN 30 THEN '30-Tage-Streak: 5.000 $SCOUT' ELSE NULL END;

  -- AR-50 FIX: INSERT claimed-row VOR wallet-credit. ON CONFLICT DO NOTHING gibt NULL
  -- zurueck in v_claimed_id wenn bereits claimed → Wallet-Credit skippen.
  IF v_milestone_reward > 0 THEN
    INSERT INTO streak_milestones_claimed (user_id, milestone, reward_cents)
    VALUES (p_user_id, v_row.current_streak, v_milestone_reward)
    ON CONFLICT (user_id, milestone) DO NOTHING
    RETURNING id INTO v_claimed_id;

    IF v_claimed_id IS NOT NULL THEN
      UPDATE wallets SET balance = balance + v_milestone_reward WHERE user_id = p_user_id
      RETURNING balance INTO v_new_balance;
      INSERT INTO transactions (user_id, type, amount, description, balance_after)
      VALUES (p_user_id, 'streak_reward', v_milestone_reward, v_milestone_label, v_new_balance);
    ELSE
      -- Already claimed (historical re-trigger via drop-and-rebuild) → skip.
      v_milestone_reward := 0;
      v_milestone_label := NULL;
    END IF;
  END IF;

  UPDATE user_streaks SET current_streak = v_row.current_streak, longest_streak = v_row.longest_streak,
    last_login_date = v_today, shields_used = v_row.shields_used, updated_at = now() WHERE user_id = p_user_id;

  PERFORM update_mission_progress(p_user_id, 'daily_login', 1);

  RETURN jsonb_build_object('ok', true, 'streak', v_row.current_streak, 'longest', v_row.longest_streak,
    'shield_used', v_shield_used, 'shields_remaining', GREATEST(0, v_max_shields - v_row.shields_used),
    'milestone_reward', v_milestone_reward, 'milestone_label', v_milestone_label);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_login_streak(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_login_streak(uuid) TO authenticated;

COMMENT ON FUNCTION public.record_login_streak(uuid) IS
  'AR-50 (2026-04-15): FOR UPDATE lock + streak_milestones_claimed ON CONFLICT guard gegen Race + Drop-and-Rebuild re-claims.';
