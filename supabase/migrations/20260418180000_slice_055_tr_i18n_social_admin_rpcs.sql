-- Slice 055 — TR-i18n Social/Admin RPCs (048c)
-- Migriert 8 RPCs auf structured i18n_key + i18n_params Pattern.
-- Nebenbei-Fix: 4 RPCs nutzten `message`-Column die nicht existiert (notifications hat `body`).
--
-- RPCs migriert:
--   accept_mentee           (Bug-Fix message→body) → mentorAccepted
--   admin_delete_post       (body ok)             → postRemovedByAdmin
--   claim_scout_mission_reward (Bug-Fix + BSD→Credits) → scoutMissionReward
--   refresh_user_stats      (body ok)             → tierPromotion
--   request_mentor          (Bug-Fix message→body) → mentorRequest
--   subscribe_to_scout      (body ok, BSD→Credits) → scoutSubscriptionNew
--   sync_level_on_stats_update (Trigger, body ok) → tierPromotionLevel
--   verify_scout            (Bug-Fix message→body) → scoutVerified
--
-- Skip: notify_watchlist_price_change (AR-59 pattern bleibt, Trigger-based, client-side resolve)

-- Block 1: accept_mentee — message→body Bug-Fix + i18n
CREATE OR REPLACE FUNCTION public.accept_mentee(p_mentor_id uuid, p_mentorship_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_mentorship mentorships%ROWTYPE;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_mentor_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_mentorship FROM mentorships
    WHERE id = p_mentorship_id AND mentor_id = p_mentor_id AND status = 'pending';
  IF v_mentorship IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Anfrage nicht gefunden');
  END IF;

  UPDATE mentorships SET status = 'active', started_at = NOW() WHERE id = p_mentorship_id;

  -- Slice 055: message→body Bug-Fix + structured i18n
  INSERT INTO notifications (user_id, type, title, body, reference_id, i18n_key, i18n_params)
  VALUES (v_mentorship.mentee_id, 'system',
    'Mentor akzeptiert!',
    'Dein Mentor hat die Anfrage angenommen. Starte jetzt deine Academy-Reise!',
    p_mentorship_id,
    'mentorAccepted',
    '{}'::jsonb);

  RETURN jsonb_build_object('success', true);
END;
$function$;

-- Block 2: admin_delete_post — body ok, i18n mit contentSnippet param
CREATE OR REPLACE FUNCTION public.admin_delete_post(p_admin_id uuid, p_post_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_post RECORD; v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  SELECT id, user_id, club_id, content INTO v_post FROM posts WHERE id = p_post_id;
  IF v_post.id IS NULL THEN RETURN '{"success":false,"error":"Post nicht gefunden"}'::JSONB; END IF;
  IF v_post.club_id IS NULL THEN RETURN '{"success":false,"error":"Post gehört keinem Club"}'::JSONB; END IF;
  SELECT EXISTS(SELECT 1 FROM club_admins WHERE club_id=v_post.club_id AND user_id=p_admin_id AND role IN('owner','admin')) INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN '{"success":false,"error":"Keine Admin-Berechtigung"}'::JSONB; END IF;
  DELETE FROM post_votes WHERE post_id IN (SELECT id FROM posts WHERE parent_id=p_post_id) OR post_id=p_post_id;
  DELETE FROM posts WHERE parent_id=p_post_id;
  DELETE FROM posts WHERE id=p_post_id;
  IF v_post.user_id != p_admin_id THEN
    -- Slice 055: structured i18n
    INSERT INTO notifications(user_id, type, title, body, i18n_key, i18n_params)
    VALUES(v_post.user_id, 'system',
      'Post von Admin entfernt',
      LEFT(v_post.content, 100),
      'postRemovedByAdmin',
      jsonb_build_object('contentSnippet', LEFT(v_post.content, 100)));
  END IF;
  RETURN '{"success":true}'::JSONB;
END; $function$;

-- Block 3: claim_scout_mission_reward — message→body + BSD→Credits + i18n
CREATE OR REPLACE FUNCTION public.claim_scout_mission_reward(p_user_id uuid, p_mission_id uuid, p_gameweek integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_mission user_scout_missions%ROWTYPE;
  v_reward BIGINT;
  v_new_balance BIGINT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  SELECT * INTO v_mission FROM user_scout_missions
    WHERE user_id = p_user_id AND mission_id = p_mission_id AND gameweek = p_gameweek AND status = 'completed';
  IF v_mission IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Keine abgeschlossene Mission gefunden');
  END IF;

  SELECT reward_cents INTO v_reward FROM scout_mission_definitions WHERE id = p_mission_id;
  IF v_reward IS NULL OR v_reward <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ungültige Belohnung');
  END IF;

  UPDATE wallets SET balance = balance + v_reward, updated_at = now()
  WHERE user_id = p_user_id RETURNING balance INTO v_new_balance;

  INSERT INTO transactions (user_id, type, amount, balance_after, description)
  VALUES (p_user_id, 'mission_reward', v_reward, v_new_balance, 'Scout Mission Belohnung');

  UPDATE user_scout_missions SET status = 'claimed', claimed_at = NOW()
    WHERE id = v_mission.id;

  -- Slice 055: message→body + BSD→Credits + i18n
  INSERT INTO notifications (user_id, type, title, body, reference_id, i18n_key, i18n_params)
  VALUES (p_user_id, 'mission_reward',
    'Mission abgeschlossen!',
    'Du hast ' || (v_reward / 100) || ' Credits für eine Scout Mission verdient.',
    v_mission.id,
    'scoutMissionReward',
    jsonb_build_object('amount', (v_reward / 100)));

  RETURN jsonb_build_object('success', true, 'reward_cents', v_reward, 'new_balance', v_new_balance);
END;
$function$;

-- Block 4: refresh_user_stats — tier_promotion mit tier param
CREATE OR REPLACE FUNCTION public.refresh_user_stats(p_user_id uuid)
 RETURNS user_stats LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_result user_stats;
  v_trading_score INT;
  v_manager_score INT;
  v_scout_score INT;
  v_total_score INT;
  v_trades_count INT;
  v_trading_volume BIGINT;
  v_portfolio_value BIGINT;
  v_holdings_diversity INT;
  v_events_count INT;
  v_avg_rank NUMERIC;
  v_best_rank INT;
  v_total_rewards BIGINT;
  v_followers_count INT;
  v_following_count INT;
  v_votes_cast INT;
  v_achievements_count INT;
  v_new_tier TEXT;
  v_old_tier TEXT;
  v_top_role TEXT;
BEGIN
  SELECT tier INTO v_old_tier FROM user_stats WHERE user_id = p_user_id;

  SELECT COUNT(*), COALESCE(SUM(t.price * t.quantity), 0)
  INTO v_trades_count, v_trading_volume
  FROM trades t WHERE t.buyer_id = p_user_id OR t.seller_id = p_user_id;

  SELECT COALESCE(SUM(h.quantity * p.floor_price), 0), COUNT(DISTINCT h.player_id)
  INTO v_portfolio_value, v_holdings_diversity
  FROM holdings h JOIN players p ON p.id = h.player_id
  WHERE h.user_id = p_user_id AND h.quantity > 0;

  SELECT COUNT(*), COALESCE(AVG(l.rank), 0), COALESCE(MIN(l.rank), 0), COALESCE(SUM(l.reward_amount), 0)
  INTO v_events_count, v_avg_rank, v_best_rank, v_total_rewards
  FROM lineups l JOIN events e ON e.id = l.event_id
  WHERE l.user_id = p_user_id AND l.total_score IS NOT NULL;

  SELECT COUNT(*) INTO v_followers_count FROM user_follows WHERE following_id = p_user_id;
  SELECT COUNT(*) INTO v_following_count FROM user_follows WHERE follower_id = p_user_id;
  SELECT COUNT(*) INTO v_votes_cast FROM vote_entries WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_achievements_count FROM user_achievements WHERE user_id = p_user_id;

  v_trading_score := LEAST(1000, (v_trades_count * 5) + (v_trading_volume / 100000)::INT + (v_holdings_diversity * 10));
  v_manager_score := LEAST(1000, (v_events_count * 20) + (v_total_rewards / 10000)::INT + GREATEST(0, 100 - COALESCE(v_avg_rank, 100)::INT));
  v_scout_score := LEAST(1000, (v_votes_cast * 3) + (v_followers_count * 5) + (v_achievements_count * 15));
  v_total_score := v_trading_score + v_manager_score + v_scout_score;

  v_new_tier := CASE
    WHEN v_total_score >= 5000 THEN 'Ikone'
    WHEN v_total_score >= 3000 THEN 'Legende'
    WHEN v_total_score >= 1500 THEN 'Elite'
    WHEN v_total_score >= 500 THEN 'Profi'
    WHEN v_total_score >= 100 THEN 'Amateur'
    ELSE 'Rookie'
  END;

  v_top_role := CASE
    WHEN GREATEST(v_trading_score, v_manager_score, v_scout_score) < 100 THEN NULL
    WHEN v_trading_score >= v_manager_score AND v_trading_score >= v_scout_score THEN 'Trader'
    WHEN v_manager_score >= v_scout_score THEN 'Manager'
    ELSE 'Scout'
  END;

  INSERT INTO user_stats (
    user_id, trading_score, manager_score, scout_score, total_score,
    trades_count, trading_volume_cents, portfolio_value_cents, holdings_diversity,
    events_count, avg_rank, best_rank, total_rewards_cents,
    followers_count, following_count, votes_cast, achievements_count,
    tier, updated_at
  ) VALUES (
    p_user_id, v_trading_score, v_manager_score, v_scout_score, v_total_score,
    v_trades_count, v_trading_volume, v_portfolio_value, v_holdings_diversity,
    v_events_count, COALESCE(v_avg_rank, 0), COALESCE(v_best_rank, 0), v_total_rewards,
    v_followers_count, v_following_count, v_votes_cast, v_achievements_count,
    v_new_tier, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trading_score = EXCLUDED.trading_score,
    manager_score = EXCLUDED.manager_score,
    scout_score = EXCLUDED.scout_score,
    total_score = EXCLUDED.total_score,
    trades_count = EXCLUDED.trades_count,
    trading_volume_cents = EXCLUDED.trading_volume_cents,
    portfolio_value_cents = EXCLUDED.portfolio_value_cents,
    holdings_diversity = EXCLUDED.holdings_diversity,
    events_count = EXCLUDED.events_count,
    avg_rank = EXCLUDED.avg_rank,
    best_rank = EXCLUDED.best_rank,
    total_rewards_cents = EXCLUDED.total_rewards_cents,
    followers_count = EXCLUDED.followers_count,
    following_count = EXCLUDED.following_count,
    votes_cast = EXCLUDED.votes_cast,
    achievements_count = EXCLUDED.achievements_count,
    tier = EXCLUDED.tier,
    updated_at = NOW();

  WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_score DESC) as rn
    FROM user_stats
  )
  UPDATE user_stats us SET rank = ranked.rn
  FROM ranked WHERE us.user_id = ranked.user_id;

  UPDATE profiles SET top_role = v_top_role WHERE id = p_user_id;

  SELECT * INTO v_result FROM user_stats WHERE user_id = p_user_id;

  IF v_old_tier IS NOT NULL AND v_new_tier != v_old_tier THEN
    -- Slice 055: structured i18n
    INSERT INTO notifications (user_id, type, title, body, i18n_key, i18n_params)
    VALUES (p_user_id, 'tier_promotion',
      'Aufstieg: ' || v_new_tier || '!',
      'Du hast den Rang ' || v_new_tier || ' erreicht. Weiter so!',
      'tierPromotion',
      jsonb_build_object('tier', v_new_tier));
  END IF;

  RETURN v_result;
END;
$function$;

-- Block 5: request_mentor — message→body Bug-Fix + i18n
CREATE OR REPLACE FUNCTION public.request_mentor(p_mentee_id uuid, p_mentor_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_mentor_stats user_stats%ROWTYPE;
  v_existing mentorships%ROWTYPE;
  v_mentorship_id UUID;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_mentee_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_mentee_id = p_mentor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du kannst nicht dein eigener Mentor sein');
  END IF;

  SELECT * INTO v_mentor_stats FROM user_stats WHERE user_id = p_mentor_id;
  IF v_mentor_stats IS NULL OR v_mentor_stats.total_score < 500 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mentor benötigt mindestens 500 Scout Score');
  END IF;

  SELECT * INTO v_existing FROM mentorships
    WHERE mentee_id = p_mentee_id AND status IN ('pending', 'active');
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du hast bereits einen aktiven Mentor');
  END IF;

  INSERT INTO mentorships (mentor_id, mentee_id, status)
  VALUES (p_mentor_id, p_mentee_id, 'pending')
  RETURNING id INTO v_mentorship_id;

  INSERT INTO user_mentorship_progress (mentorship_id, milestone_id)
  SELECT v_mentorship_id, id FROM mentorship_milestones;

  -- Slice 055: message→body Bug-Fix + structured i18n
  INSERT INTO notifications (user_id, type, title, body, reference_id, i18n_key, i18n_params)
  VALUES (p_mentor_id, 'system',
    'Neue Mentee-Anfrage!',
    'Jemand möchte, dass du sein Mentor wirst.',
    v_mentorship_id,
    'mentorRequest',
    '{}'::jsonb);

  RETURN jsonb_build_object('success', true, 'mentorship_id', v_mentorship_id);
END;
$function$;

-- Block 6: subscribe_to_scout — BSD→Credits + i18n (message-col ok bereits body)
CREATE OR REPLACE FUNCTION public.subscribe_to_scout(p_subscriber_id uuid, p_scout_id uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_price_cents BIGINT;
  v_sub_enabled BOOLEAN;
  v_balance BIGINT;
  v_fee_pct INT;
  v_platform_fee BIGINT;
  v_scout_earned BIGINT;
  v_sub_id UUID;
  v_expires TIMESTAMPTZ;
  v_existing INT;
  v_subscriber_name TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_subscriber_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_subscriber_id = p_scout_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kein Self-Abo erlaubt');
  END IF;

  SELECT subscription_enabled, subscription_price_cents
  INTO v_sub_enabled, v_price_cents
  FROM profiles WHERE id = p_scout_id;

  IF NOT v_sub_enabled OR v_price_cents IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Scout hat kein Abo aktiviert');
  END IF;

  SELECT COUNT(*) INTO v_existing
  FROM scout_subscriptions
  WHERE subscriber_id = p_subscriber_id AND scout_id = p_scout_id AND status = 'active' AND expires_at > now();

  IF v_existing > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Du hast bereits ein aktives Abo');
  END IF;

  SELECT balance INTO v_balance FROM wallets WHERE user_id = p_subscriber_id FOR UPDATE;
  IF v_balance IS NULL OR (v_balance - COALESCE((SELECT locked_balance FROM wallets WHERE user_id = p_subscriber_id), 0)) < v_price_cents THEN
    -- Slice 055: BSD→Credits wording fix
    RETURN jsonb_build_object('success', false, 'error', 'Nicht genug Credits');
  END IF;

  SELECT COALESCE((value#>>'{}')::INT, 15) INTO v_fee_pct
  FROM creator_config WHERE key = 'beratervertrag_platform_fee_pct';
  IF v_fee_pct IS NULL THEN v_fee_pct := 15; END IF;

  v_platform_fee := (v_price_cents * v_fee_pct) / 100;
  v_scout_earned := v_price_cents - v_platform_fee;
  v_expires := now() + interval '30 days';

  UPDATE wallets SET balance = balance - v_price_cents, updated_at = now()
  WHERE user_id = p_subscriber_id;

  UPDATE wallets SET balance = balance + v_scout_earned, updated_at = now()
  WHERE user_id = p_scout_id;

  INSERT INTO scout_subscriptions (subscriber_id, scout_id, price_cents, scout_earned_cents, platform_fee_cents, expires_at)
  VALUES (p_subscriber_id, p_scout_id, v_price_cents, v_scout_earned, v_platform_fee, v_expires)
  RETURNING id INTO v_sub_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    p_subscriber_id, 'scout_subscription', -v_price_cents,
    (SELECT balance FROM wallets WHERE user_id = p_subscriber_id),
    v_sub_id, 'Beratervertrag abgeschlossen'
  );

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES (
    p_scout_id, 'scout_subscription_earning', v_scout_earned,
    (SELECT balance FROM wallets WHERE user_id = p_scout_id),
    v_sub_id, 'Beratervertrag-Einnahme'
  );

  SELECT COALESCE(display_name, handle) INTO v_subscriber_name FROM profiles WHERE id = p_subscriber_id;

  -- Slice 055: structured i18n
  INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type, i18n_key, i18n_params)
  VALUES (
    p_scout_id, 'subscription_new',
    'Neuer Abonnent!',
    v_subscriber_name || ' hat deinen Beratervertrag abgeschlossen',
    v_sub_id, 'scout_subscription',
    'scoutSubscriptionNew',
    jsonb_build_object('subscriberName', COALESCE(v_subscriber_name, 'Jemand'))
  );

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_sub_id,
    'price_cents', v_price_cents,
    'scout_earned', v_scout_earned,
    'expires_at', v_expires
  );
END;
$function$;

-- Block 7: sync_level_on_stats_update — tier_promotion mit tier+level params (Trigger)
CREATE OR REPLACE FUNCTION public.sync_level_on_stats_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_new_level INT;
  v_old_level INT;
  v_old_tier TEXT;
  v_new_tier TEXT;
BEGIN
  v_new_level := calculate_level_from_score(NEW.total_score);

  SELECT level INTO v_old_level FROM profiles WHERE id = NEW.user_id;
  v_old_level := COALESCE(v_old_level, 1);

  IF v_new_level <> v_old_level THEN
    UPDATE profiles SET level = v_new_level WHERE id = NEW.user_id;

    v_old_tier := CASE
      WHEN v_old_level >= 76 THEN 'Ikone'
      WHEN v_old_level >= 51 THEN 'Legende'
      WHEN v_old_level >= 31 THEN 'Elite'
      WHEN v_old_level >= 16 THEN 'Profi'
      WHEN v_old_level >= 6 THEN 'Amateur'
      ELSE 'Rookie'
    END;
    v_new_tier := CASE
      WHEN v_new_level >= 76 THEN 'Ikone'
      WHEN v_new_level >= 51 THEN 'Legende'
      WHEN v_new_level >= 31 THEN 'Elite'
      WHEN v_new_level >= 16 THEN 'Profi'
      WHEN v_new_level >= 6 THEN 'Amateur'
      ELSE 'Rookie'
    END;

    IF v_new_tier <> v_old_tier AND v_new_level > v_old_level THEN
      -- Slice 055: structured i18n
      INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type, i18n_key, i18n_params)
      VALUES (
        NEW.user_id,
        'tier_promotion',
        'Aufstieg: ' || v_new_tier || '!',
        'Du hast Level ' || v_new_level || ' erreicht und bist jetzt ' || v_new_tier || '.',
        NEW.user_id,
        'profile',
        'tierPromotionLevel',
        jsonb_build_object('tier', v_new_tier, 'level', v_new_level)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Block 8: verify_scout — message→body Bug-Fix + i18n
CREATE OR REPLACE FUNCTION public.verify_scout(p_admin_id uuid, p_user_id uuid, p_club_id uuid, p_badge_level text DEFAULT 'bronze'::text, p_specialty text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_admin_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;
  SELECT EXISTS(SELECT 1 FROM club_admins WHERE user_id = p_admin_id AND club_id = p_club_id) INTO v_is_admin;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nur Club-Admins können Scouts verifizieren');
  END IF;

  INSERT INTO verified_scouts (user_id, club_id, verified_by, badge_level, specialty)
  VALUES (p_user_id, p_club_id, p_admin_id, p_badge_level, p_specialty)
  ON CONFLICT (user_id, club_id) DO UPDATE SET
    badge_level = p_badge_level, specialty = p_specialty, active = TRUE, verified_at = NOW();

  -- Slice 055: message→body Bug-Fix + structured i18n
  INSERT INTO notifications (user_id, type, title, body, i18n_key, i18n_params)
  VALUES (p_user_id, 'system',
    'Scout verifiziert!',
    'Du wurdest als verifizierter Scout bestätigt. Badge: ' || p_badge_level,
    'scoutVerified',
    jsonb_build_object('badgeLevel', p_badge_level));

  RETURN jsonb_build_object('success', true);
END;
$function$;
