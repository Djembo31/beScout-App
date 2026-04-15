-- =============================================================================
-- J1-03 + J1-04 (Operation Beta Ready, Journey #1) — 2026-04-15
--
-- BETA-BLOCKER #1 (J1-03): Kein Wallet-Init-Trigger auf profiles.
--   Live-DB hat trg_init_user_tickets + trg_create_scout_scores (profiles AFTER INSERT),
--   aber KEIN Wallet-Trigger. User der claim_welcome_bonus nicht durchlaeuft
--   (App-Crash/Netzwerkfehler) hat KEIN wallets-Row → alle Trading/Fantasy-RPCs
--   crashen mit NOT FOUND oder silent NULL-Propagation.
--
--   FIX:
--     - Funktion init_user_wallet() analog init_user_tickets()
--     - Trigger trg_init_user_wallet AFTER INSERT ON profiles
--     - INSERT mit balance=0, locked_balance=0 (Welcome-Bonus kommt separat via
--       claim_welcome_bonus RPC → sauberer Audit-Trail via transactions)
--     - ON CONFLICT (user_id) DO NOTHING — idempotent
--     - BACKFILL: existing profiles ohne wallet bekommen wallet(balance=0)
--       NOTE: Der Default-Wert balance=1000000 aus dem baseline-Schema
--       wird durch den EXPLIZITEN INSERT mit balance=0 ueberschrieben.
--       Legacy-User die noch keinen claim haben, bekommen 0 — der Welcome-Bonus
--       wird via claim_welcome_bonus RPC ausgezahlt (mit korrekter transactions-Row).
--
-- BETA-BLOCKER #2 (J1-04): record_login_streak ohne Wallet-NULL-Guard.
--   L95 in 20260415010000_ar50_j7_record_login_streak_race_fix.sql macht
--   UPDATE wallets ... RETURNING balance INTO v_new_balance — wenn wallet fehlt:
--   v_new_balance = NULL → INSERT transactions(..., balance_after=NULL) → NOT NULL violation → Crash.
--
--   FIX: Defensive Guard nach UPDATE. Mit J1-03-Trigger sollte das nie passieren,
--   aber belt-and-suspenders — wenn v_new_balance IS NULL, skip transactions + reward.
--   Legacy-User die durch Backfill jetzt wallet(0) haben, werden normal upgedated.
--
-- SECURITY: Trigger-Funktion ist SECURITY DEFINER (analog init_user_tickets),
--   wird NUR via Trigger aufgerufen — kein REVOKE/GRANT noetig (nicht direkt RPC-callable).
--   record_login_streak behaelt REVOKE/GRANT aus AR-50 Migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- J1-03: Wallet-Init-Trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.init_user_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.wallets (user_id, balance, locked_balance)
    VALUES (NEW.id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_init_user_wallet ON public.profiles;
CREATE TRIGGER trg_init_user_wallet
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.init_user_wallet();

COMMENT ON FUNCTION public.init_user_wallet() IS
  'J1-03 (2026-04-15): Auto-create wallets row for new profiles. Welcome-Bonus kommt separat via claim_welcome_bonus RPC (sauberer audit trail).';

-- Backfill: existing profiles ohne wallet bekommen wallet(balance=0, locked_balance=0)
INSERT INTO public.wallets (user_id, balance, locked_balance)
  SELECT p.id, 0, 0
  FROM public.profiles p
  LEFT JOIN public.wallets w ON w.user_id = p.id
  WHERE w.user_id IS NULL
  ON CONFLICT (user_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- J1-04: record_login_streak defensive wallet-NULL-Guard
--   1:1 Body aus 20260415010000_ar50_j7_record_login_streak_race_fix.sql,
--   + IF v_new_balance IS NULL THEN skip reward (belt-and-suspenders).
-- -----------------------------------------------------------------------------
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

      -- J1-04 FIX: Defensive NULL-Guard. Mit J1-03 Wallet-Init-Trigger sollte wallet
      -- fuer jeden profile existieren, aber belt-and-suspenders: wenn UPDATE 0 Rows
      -- matcht (kein wallet), ist v_new_balance NULL → transactions-INSERT wuerde
      -- an NOT NULL balance_after crashen. Wir skippen den reward silent (streak bleibt,
      -- kein Double-Spend da streak_milestones_claimed-Row bereits eingefuegt).
      IF v_new_balance IS NULL THEN
        RAISE WARNING 'record_login_streak: wallet missing for user %, skipping reward (J1-04 guard)', p_user_id;
        v_milestone_reward := 0;
        v_milestone_label := NULL;
      ELSE
        INSERT INTO transactions (user_id, type, amount, description, balance_after)
        VALUES (p_user_id, 'streak_reward', v_milestone_reward, v_milestone_label, v_new_balance);
      END IF;
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
  'J1-04 (2026-04-15): AR-50 Race-Fix + defensive Wallet-NULL-Guard. Primary Wallet-Existenz via J1-03 Trigger.';
