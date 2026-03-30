-- ============================================
-- Gamification Triggers Documentation Migration
-- ============================================
-- These triggers were applied manually and are now tracked here.
-- All use CREATE OR REPLACE so this migration is idempotent.
--
-- System: 3-Dimension Elo (trader/manager/analyst)
-- Core function: award_dimension_score() — updates scout_scores + score_history
-- Trigger pattern: AFTER INSERT → award_dimension_score() → refresh_user_stats()
--
-- Trigger Inventory:
-- 1. trg_trader_score_on_trade      → trades INSERT       → Trader +5/+30 (IPO)
-- 2. trg_analyst_score_on_post      → posts INSERT        → Analyst +3
-- 3. trg_analyst_score_on_research  → research_posts INSERT → Analyst +3/+5
-- 4. trg_research_unlock_gamification → research_unlocks INSERT → Analyst +5
-- 5. trg_post_vote_gamification     → post_votes INSERT   → Analyst +1 (upvote)
-- 6. trg_follow_gamification        → user_follows INSERT → Analyst +2
-- 7. trg_event_scored_manager       → events UPDATE (scored_at) → Manager (percentile-based)
-- 8. trg_create_scout_scores        → profiles INSERT     → Init scout_scores row

-- ── award_dimension_score ──
CREATE OR REPLACE FUNCTION public.award_dimension_score(
  p_user_id uuid, p_dimension text, p_delta integer, p_event_type text,
  p_source_id text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_current INT; v_new INT; v_peak INT;
  v_abo_tier TEXT; v_effective_delta INT;
  v_rang_before INT; v_rang_after INT; v_rang_name TEXT; v_dim_label TEXT;
BEGIN
  IF p_dimension NOT IN ('trader', 'manager', 'analyst') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid dimension: ' || p_dimension);
  END IF;
  IF p_delta = 0 THEN RETURN jsonb_build_object('ok', true, 'delta', 0, 'skipped', true); END IF;

  INSERT INTO scout_scores (user_id) VALUES (p_user_id) ON CONFLICT (user_id) DO NOTHING;

  -- Gold subscribers get 20% boost on positive scores
  v_effective_delta := p_delta;
  IF p_delta > 0 THEN
    SELECT cs.tier INTO v_abo_tier FROM club_subscriptions cs
    WHERE cs.user_id = p_user_id AND cs.status = 'active' AND cs.expires_at > now()
    ORDER BY CASE cs.tier WHEN 'gold' THEN 3 WHEN 'silber' THEN 2 WHEN 'bronze' THEN 1 END DESC LIMIT 1;
    IF v_abo_tier = 'gold' THEN v_effective_delta := CEIL(p_delta * 1.2); END IF;
  END IF;

  IF p_dimension = 'trader' THEN
    SELECT trader_score, trader_peak INTO v_current, v_peak FROM scout_scores WHERE user_id = p_user_id;
  ELSIF p_dimension = 'manager' THEN
    SELECT manager_score, manager_peak INTO v_current, v_peak FROM scout_scores WHERE user_id = p_user_id;
  ELSE
    SELECT analyst_score, analyst_peak INTO v_current, v_peak FROM scout_scores WHERE user_id = p_user_id;
  END IF;

  v_new := GREATEST(0, v_current + v_effective_delta);

  IF p_dimension = 'trader' THEN
    UPDATE scout_scores SET trader_score = v_new, trader_peak = GREATEST(trader_peak, v_new), updated_at = now() WHERE user_id = p_user_id;
  ELSIF p_dimension = 'manager' THEN
    UPDATE scout_scores SET manager_score = v_new, manager_peak = GREATEST(manager_peak, v_new), updated_at = now() WHERE user_id = p_user_id;
  ELSE
    UPDATE scout_scores SET analyst_score = v_new, analyst_peak = GREATEST(analyst_peak, v_new), updated_at = now() WHERE user_id = p_user_id;
  END IF;

  INSERT INTO score_history (user_id, dimension, delta, score_before, score_after, event_type, source_id, metadata)
  VALUES (p_user_id, p_dimension, v_effective_delta, v_current, v_new, p_event_type, p_source_id, p_metadata);

  -- Rang change notification
  v_rang_before := get_rang_id(v_current);
  v_rang_after := get_rang_id(v_new);
  IF v_rang_before IS DISTINCT FROM v_rang_after THEN
    v_rang_name := get_rang_name(v_new);
    v_dim_label := CASE p_dimension WHEN 'trader' THEN 'Trader' WHEN 'manager' THEN 'Manager' ELSE 'Analyst' END;
    BEGIN
      INSERT INTO notifications (user_id, type, title, body)
      VALUES (p_user_id,
        CASE WHEN v_new > v_current THEN 'rang_up' ELSE 'rang_down' END,
        CASE WHEN v_new > v_current THEN v_dim_label || ': Aufstieg zu ' || v_rang_name || '!'
          ELSE v_dim_label || ': Abstieg auf ' || v_rang_name END,
        CASE WHEN v_new > v_current THEN 'Dein ' || v_dim_label || '-Rang ist auf ' || v_rang_name || ' gestiegen. Weiter so!'
          ELSE 'Dein ' || v_dim_label || '-Rang ist auf ' || v_rang_name || ' gefallen.' END
      );
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'rang notification failed: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('ok', true, 'dimension', p_dimension, 'score_before', v_current, 'score_after', v_new, 'delta', v_effective_delta, 'boosted', v_abo_tier = 'gold');
END;
$function$;

-- ── Trigger Functions ──

CREATE OR REPLACE FUNCTION public.fn_trader_score_on_trade() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_delta_buyer INT; v_delta_seller INT;
  v_buy_price INT; v_sell_price INT; v_profit_pct NUMERIC;
  v_is_ipo BOOLEAN; v_hold_hours NUMERIC;
BEGIN
  v_is_ipo := NEW.seller_id IS NULL;
  v_delta_buyer := CASE WHEN v_is_ipo THEN 30 ELSE 5 END;

  PERFORM award_dimension_score(NEW.buyer_id, 'trader', v_delta_buyer,
    CASE WHEN v_is_ipo THEN 'ipo_buy' ELSE 'trade_buy' END, NEW.id::TEXT);

  IF NEW.seller_id IS NOT NULL THEN
    SELECT COALESCE(AVG(h.avg_buy_price), NEW.price) INTO v_buy_price
    FROM holdings h WHERE h.user_id = NEW.seller_id AND h.player_id = NEW.player_id;
    v_sell_price := NEW.price;
    v_profit_pct := CASE WHEN v_buy_price > 0 THEN ((v_sell_price - v_buy_price)::NUMERIC / v_buy_price) * 100 ELSE 0 END;

    v_delta_seller := CASE
      WHEN v_profit_pct >= 50 THEN 50 WHEN v_profit_pct >= 20 THEN 30
      WHEN v_profit_pct >= 5 THEN 10 WHEN v_profit_pct >= -5 THEN 0
      WHEN v_profit_pct >= -20 THEN -10 ELSE -30
    END;

    IF v_delta_seller < 0 THEN
      SELECT EXTRACT(EPOCH FROM (now() - MIN(t.executed_at))) / 3600 INTO v_hold_hours
      FROM trades t WHERE t.buyer_id = NEW.seller_id AND t.player_id = NEW.player_id;
      IF v_hold_hours IS NOT NULL AND v_hold_hours < 24 THEN
        v_delta_seller := v_delta_seller - 20;
      END IF;
    END IF;

    IF v_delta_seller != 0 THEN
      PERFORM award_dimension_score(NEW.seller_id, 'trader', v_delta_seller,
        CASE WHEN v_delta_seller > 0 THEN 'trade_profit' ELSE 'trade_loss' END,
        NEW.id::TEXT, jsonb_build_object('profit_pct', round(v_profit_pct, 1)));
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_analyst_score_on_post() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM award_dimension_score(NEW.user_id, 'analyst', 3, 'post_create', NEW.id::TEXT);
  IF NEW.player_id IS NOT NULL THEN
    PERFORM award_mastery_xp(NEW.user_id, NEW.player_id, 15, 'content');
  END IF;
  PERFORM update_mission_progress(NEW.user_id, 'daily_post', 1);
  PERFORM update_mission_progress(NEW.user_id, 'weekly_3_posts', 1);
  PERFORM refresh_user_stats(NEW.user_id);
  PERFORM refresh_airdrop_score(NEW.user_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg fn_analyst_score_on_post failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_analyst_score_on_research() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM award_dimension_score(NEW.user_id, 'analyst',
    CASE WHEN NEW.evaluation IS NOT NULL THEN 5 ELSE 3 END,
    'research_create', NEW.id::TEXT);
  IF NEW.player_id IS NOT NULL THEN
    PERFORM award_mastery_xp(NEW.user_id, NEW.player_id, 15, 'content');
  END IF;
  PERFORM update_mission_progress(NEW.user_id, 'weekly_research', 1);
  PERFORM refresh_user_stats(NEW.user_id);
  PERFORM refresh_airdrop_score(NEW.user_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg fn_analyst_score_on_research failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_fn_research_unlock_gamification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_author_id UUID;
BEGIN
  SELECT user_id INTO v_author_id FROM research_posts WHERE id = NEW.research_id;
  IF v_author_id IS NULL THEN RETURN NEW; END IF;
  PERFORM award_dimension_score(v_author_id, 'analyst', 5, 'research_sold', NEW.research_id::TEXT);
  PERFORM update_mission_progress(NEW.user_id, 'daily_unlock_research', 1);
  PERFORM refresh_airdrop_score(v_author_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg research_unlock_gamification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_fn_post_vote_gamification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_author_id UUID; v_down_count INT;
BEGIN
  SELECT user_id INTO v_author_id FROM posts WHERE id = NEW.post_id;
  IF v_author_id IS NULL OR v_author_id = NEW.user_id THEN RETURN NEW; END IF;
  IF NEW.vote_type = 1 THEN
    PERFORM award_dimension_score(v_author_id, 'analyst', 1, 'post_upvote', NEW.post_id::TEXT);
  ELSIF NEW.vote_type = -1 THEN
    SELECT COUNT(*) INTO v_down_count FROM post_votes WHERE post_id = NEW.post_id AND vote_type = -1;
    IF v_down_count > 3 THEN
      PERFORM award_dimension_score(v_author_id, 'analyst', -2, 'post_excessive_downvotes', NEW.post_id::TEXT);
    END IF;
  END IF;
  PERFORM refresh_airdrop_score(v_author_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg post_vote_gamification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_fn_follow_gamification() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM award_dimension_score(NEW.following_id, 'analyst', 2, 'new_follower', NEW.follower_id::TEXT);
  PERFORM update_mission_progress(NEW.follower_id, 'weekly_follow_3', 1);
  PERFORM refresh_user_stats(NEW.following_id);
  PERFORM refresh_airdrop_score(NEW.following_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg follow_gamification failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_fn_event_scored_manager() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_total_participants INT; v_lineup RECORD; v_percentile NUMERIC; v_mgr_pts INT;
BEGIN
  IF OLD.scored_at IS NOT NULL OR NEW.scored_at IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_total_participants FROM lineups WHERE event_id = NEW.id AND rank IS NOT NULL;
  IF v_total_participants = 0 THEN RETURN NEW; END IF;

  FOR v_lineup IN SELECT user_id, rank FROM lineups WHERE event_id = NEW.id AND rank IS NOT NULL
  LOOP
    IF v_total_participants < 20 THEN
      v_mgr_pts := CASE
        WHEN v_lineup.rank = 1 THEN 50 WHEN v_lineup.rank = 2 THEN 40
        WHEN v_lineup.rank = 3 THEN 30 WHEN v_lineup.rank <= 5 THEN 20
        WHEN v_lineup.rank <= 10 THEN 10 ELSE 0
      END;
    ELSE
      v_percentile := (v_lineup.rank::NUMERIC / v_total_participants) * 100;
      v_mgr_pts := CASE
        WHEN v_percentile <= 1 THEN 50 WHEN v_percentile <= 5 THEN 40
        WHEN v_percentile <= 10 THEN 30 WHEN v_percentile <= 25 THEN 20
        WHEN v_percentile <= 50 THEN 10 WHEN v_percentile <= 75 THEN 0
        WHEN v_percentile <= 90 THEN -10 ELSE -25
      END;
    END IF;

    IF v_mgr_pts <> 0 THEN
      PERFORM award_dimension_score(v_lineup.user_id, 'manager', v_mgr_pts, 'fantasy_placement', NEW.id::TEXT);
    END IF;
    PERFORM refresh_user_stats(v_lineup.user_id);
    PERFORM refresh_airdrop_score(v_lineup.user_id);
  END LOOP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'trg event_scored_manager failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_create_scout_scores_on_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  INSERT INTO scout_scores (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

-- ── Triggers (CREATE IF NOT EXISTS via DROP + CREATE) ──
DROP TRIGGER IF EXISTS trg_trader_score_on_trade ON trades;
CREATE TRIGGER trg_trader_score_on_trade AFTER INSERT ON trades FOR EACH ROW EXECUTE FUNCTION fn_trader_score_on_trade();

DROP TRIGGER IF EXISTS trg_analyst_score_on_post ON posts;
CREATE TRIGGER trg_analyst_score_on_post AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION fn_analyst_score_on_post();

DROP TRIGGER IF EXISTS trg_analyst_score_on_research ON research_posts;
CREATE TRIGGER trg_analyst_score_on_research AFTER INSERT ON research_posts FOR EACH ROW EXECUTE FUNCTION fn_analyst_score_on_research();

DROP TRIGGER IF EXISTS trg_research_unlock_gamification ON research_unlocks;
CREATE TRIGGER trg_research_unlock_gamification AFTER INSERT ON research_unlocks FOR EACH ROW EXECUTE FUNCTION trg_fn_research_unlock_gamification();

DROP TRIGGER IF EXISTS trg_post_vote_gamification ON post_votes;
CREATE TRIGGER trg_post_vote_gamification AFTER INSERT ON post_votes FOR EACH ROW EXECUTE FUNCTION trg_fn_post_vote_gamification();

DROP TRIGGER IF EXISTS trg_follow_gamification ON user_follows;
CREATE TRIGGER trg_follow_gamification AFTER INSERT ON user_follows FOR EACH ROW EXECUTE FUNCTION trg_fn_follow_gamification();

DROP TRIGGER IF EXISTS trg_event_scored_manager ON events;
CREATE TRIGGER trg_event_scored_manager AFTER UPDATE ON events FOR EACH ROW WHEN ((OLD.scored_at IS NULL) AND (NEW.scored_at IS NOT NULL)) EXECUTE FUNCTION trg_fn_event_scored_manager();

DROP TRIGGER IF EXISTS trg_create_scout_scores ON profiles;
CREATE TRIGGER trg_create_scout_scores AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION fn_create_scout_scores_on_profile();
