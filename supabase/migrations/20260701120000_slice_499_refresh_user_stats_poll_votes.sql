-- Slice 499 Wave 2a: refresh_user_stats liest votes_cast aus community_poll_votes
-- statt der zu droppenden vote_entries (altes club_votes-System entfernt, §0-Schnitt).
-- Body byte-true gegen Live-functiondef AUSSER der EINEN Zeile (S156 PATCH-AUDIT).
-- votes_cast = Display-Stat, kein tier/money-Impact (total_score kommt aus scout_scores, D-17/S454).
-- proacl {postgres,service_role} bleibt (CREATE OR REPLACE erhält ACL, S368c) — kein REVOKE/GRANT nötig.
-- MUSS vor der DROP-Migration (20260701120100) laufen: erst Reader umstellen, dann vote_entries droppen.
CREATE OR REPLACE FUNCTION public.refresh_user_stats(p_user_id uuid)
 RETURNS user_stats
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result user_stats;
  v_trading_score INT; v_manager_score INT; v_scout_score INT; v_total_score INT;
  v_trades_count INT; v_trading_volume BIGINT; v_portfolio_value BIGINT; v_holdings_diversity INT;
  v_events_count INT; v_avg_rank NUMERIC; v_best_rank INT; v_total_rewards BIGINT;
  v_followers_count INT; v_following_count INT; v_votes_cast INT; v_achievements_count INT;
  v_new_tier TEXT; v_old_tier TEXT; v_top_role TEXT;
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
  SELECT COUNT(*) INTO v_votes_cast FROM community_poll_votes WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO v_achievements_count FROM user_achievements WHERE user_id = p_user_id;

  -- D-17/S454: Scores = Projektion aus scout_scores (kanonisch). NICHT mehr eigene gedeckelte Formel.
  SELECT COALESCE(ss.trader_score, 0), COALESCE(ss.manager_score, 0), COALESCE(ss.analyst_score, 0)
  INTO v_trading_score, v_manager_score, v_scout_score
  FROM scout_scores ss WHERE ss.user_id = p_user_id;
  IF NOT FOUND THEN
    v_trading_score := 0; v_manager_score := 0; v_scout_score := 0;
  END IF;
  v_total_score := v_trading_score + v_manager_score + v_scout_score;

  v_new_tier := fn_compute_user_tier(v_total_score);
  v_top_role := CASE
    WHEN GREATEST(v_trading_score, v_manager_score, v_scout_score) < 100 THEN NULL
    WHEN v_trading_score >= v_manager_score AND v_trading_score >= v_scout_score THEN 'Trader'
    WHEN v_manager_score >= v_scout_score THEN 'Manager' ELSE 'Scout' END;
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
  ) ON CONFLICT (user_id) DO UPDATE SET
    trading_score = EXCLUDED.trading_score, manager_score = EXCLUDED.manager_score,
    scout_score = EXCLUDED.scout_score, total_score = EXCLUDED.total_score,
    trades_count = EXCLUDED.trades_count, trading_volume_cents = EXCLUDED.trading_volume_cents,
    portfolio_value_cents = EXCLUDED.portfolio_value_cents, holdings_diversity = EXCLUDED.holdings_diversity,
    events_count = EXCLUDED.events_count, avg_rank = EXCLUDED.avg_rank,
    best_rank = EXCLUDED.best_rank, total_rewards_cents = EXCLUDED.total_rewards_cents,
    followers_count = EXCLUDED.followers_count, following_count = EXCLUDED.following_count,
    votes_cast = EXCLUDED.votes_cast, achievements_count = EXCLUDED.achievements_count,
    tier = EXCLUDED.tier, updated_at = NOW();
  WITH ranked AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_score DESC) as rn FROM user_stats
  )
  UPDATE user_stats us SET rank = ranked.rn FROM ranked WHERE us.user_id = ranked.user_id;
  UPDATE profiles SET top_role = v_top_role WHERE id = p_user_id;
  SELECT * INTO v_result FROM user_stats WHERE user_id = p_user_id;
  IF v_old_tier IS NOT NULL AND v_new_tier != v_old_tier THEN
    INSERT INTO notifications (user_id, type, title, body, i18n_key, i18n_params)
    VALUES (p_user_id, 'tier_promotion',
      'Aufstieg: ' || v_new_tier || '!',
      'Du hast den Rang ' || v_new_tier || ' erreicht. Weiter so!',
      'tierPromotion', jsonb_build_object('tier', v_new_tier));
  END IF;
  RETURN v_result;
END;
$function$;

-- ACL-Erhalt (S368c: CREATE OR REPLACE erhält die ACL; dieser Block macht sie explizit
-- + erfüllt den AR-44-Hook). refresh_user_stats = internes SECDEF-Aggregat, gerufen nur von
-- anderen SECDEF-RPCs (als Owner) + service_role (Cron) — NICHT direkt von authenticated.
-- Live-ACL vor+nach = {postgres,service_role} (dieser Block ist ein No-op darauf).
-- KEIN GRANT authenticated (anders als das AR-44-Standard-Template) — sonst würde die Fläche geöffnet.
REVOKE EXECUTE ON FUNCTION public.refresh_user_stats(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_user_stats(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.refresh_user_stats(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_user_stats(uuid) TO service_role;
