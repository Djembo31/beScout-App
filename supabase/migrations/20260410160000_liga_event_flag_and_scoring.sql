-- ============================================
-- BeScout Liga: is_liga_event flag + differentiated scoring
-- ============================================

-- 1. Add is_liga_event to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_liga_event BOOLEAN NOT NULL DEFAULT false;

-- 2. Add non-liga manager season tracker to scout_scores
ALTER TABLE scout_scores ADD COLUMN IF NOT EXISTS non_liga_manager_season INTEGER NOT NULL DEFAULT 0;

-- 3. Backfill: mark existing bescout-type free events as Liga events
UPDATE events SET is_liga_event = true WHERE type = 'bescout' AND ticket_cost = 0;

-- 4. Replace trg_fn_event_scored_manager with Liga-aware version
CREATE OR REPLACE FUNCTION public.trg_fn_event_scored_manager() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE
  v_total_participants INT;
  v_lineup RECORD;
  v_percentile NUMERIC;
  v_mgr_pts INT;
  v_is_liga BOOLEAN;
  v_final_pts INT;
  v_user_scores RECORD;
  v_max_non_liga INT;
BEGIN
  IF OLD.scored_at IS NOT NULL OR NEW.scored_at IS NULL THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_total_participants FROM lineups WHERE event_id = NEW.id AND rank IS NOT NULL;
  IF v_total_participants = 0 THEN RETURN NEW; END IF;

  v_is_liga := COALESCE(NEW.is_liga_event, false);

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

    IF v_is_liga THEN
      v_final_pts := v_mgr_pts;
    ELSE
      v_final_pts := ROUND(v_mgr_pts * 0.25)::INT;
      IF v_final_pts > 0 THEN
        SELECT manager_score, non_liga_manager_season INTO v_user_scores
        FROM scout_scores WHERE user_id = v_lineup.user_id;
        IF v_user_scores IS NOT NULL THEN
          v_max_non_liga := GREATEST(CEIL(v_user_scores.manager_score * 0.10), 10);
          IF v_user_scores.non_liga_manager_season + v_final_pts > v_max_non_liga THEN
            v_final_pts := GREATEST(v_max_non_liga - v_user_scores.non_liga_manager_season, 0);
          END IF;
          IF v_final_pts > 0 THEN
            UPDATE scout_scores SET non_liga_manager_season = non_liga_manager_season + v_final_pts
            WHERE user_id = v_lineup.user_id;
          END IF;
        END IF;
      END IF;
    END IF;

    IF v_final_pts <> 0 THEN
      PERFORM award_dimension_score(v_lineup.user_id, 'manager', v_final_pts, 'fantasy_placement', NEW.id::TEXT);
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

-- 5. Update soft_reset_season to also reset non_liga_manager_season
CREATE OR REPLACE FUNCTION soft_reset_season(p_new_season_name TEXT, p_start DATE, p_end DATE)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_new_season_id UUID;
  v_users_reset INTEGER;
BEGIN
  UPDATE liga_seasons SET is_active = false WHERE is_active = true;
  INSERT INTO liga_seasons (name, start_date, end_date, is_active)
  VALUES (p_new_season_name, p_start, p_end, true)
  RETURNING id INTO v_new_season_id;
  UPDATE scout_scores SET
    trader_score = GREATEST(0, (trader_score * 80 / 100)),
    manager_score = GREATEST(0, (manager_score * 80 / 100)),
    analyst_score = GREATEST(0, (analyst_score * 80 / 100)),
    season_start_trader = GREATEST(0, (trader_score * 80 / 100)),
    season_start_manager = GREATEST(0, (manager_score * 80 / 100)),
    season_start_analyst = GREATEST(0, (analyst_score * 80 / 100)),
    non_liga_manager_season = 0;
  GET DIAGNOSTICS v_users_reset = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'new_season_id', v_new_season_id, 'users_reset', v_users_reset);
END;
$$;
