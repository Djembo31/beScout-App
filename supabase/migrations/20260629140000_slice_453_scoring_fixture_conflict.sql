-- Slice 453 — D-01: Scoring-Funktionen aufs Fixture-Modell migrieren (42P10-Landmine)
--
-- Problem (Live-D87-verifiziert, DB skzjfhvgccaeplydsunz):
--   D113 (Slice 419, migration 20260627155835) machte player_gameweek_scores fixture-gebunden
--   (UNIQUE(player_id, fixture_id), fixture_id+league_id NOT NULL) — ließ aber 2 von 3 Schreib-Pfaden
--   auf dem alten GW-Modell. cron_process_gameweek (Step 4) + admin_resync_gw_scores schreiben
--   weiter INSERT ... (player_id, gameweek, score) ON CONFLICT (player_id, gameweek)
--   => Doppel-Crash beim 1. echten Spieltag: 42P10 (Conflict-Target weg) + NOT-NULL (fixture_id/league_id).
--   BEFORE-Proof live: SELECT admin_resync_gw_scores(26) -> 42P10.
--
-- Fix: beide INSERTs exakt auf die korrekte, verdrahtete Referenz sync_fixture_scores spiegeln
--   (+fixture_id +league_id, ON CONFLICT (player_id, fixture_id) DO UPDATE score/league/gameweek,
--    admin_resync zusätzlich AND fps.player_id IS NOT NULL). Rest byte-treu (PATCH-AUDIT).
--   sync_fixture_scores bleibt UNANGETASTET.
-- Proof: force-rollback Smoke GW26 -> fresh_insert=2805 reinsert_idempotent=2805 null_fk=0.
-- Residual (Schnitt-Regel): 3-Wege-Scoring-Write-Duplikation -> W2 Score-SSOT-Konsolidierung.

-- ============================================================================
-- 1) admin_resync_gw_scores — fixture-bound
-- ============================================================================
CREATE OR REPLACE FUNCTION public.admin_resync_gw_scores(p_gameweek integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INT := 0;
BEGIN
  -- Re-sync scores from fixture_player_stats using rating*10 (fixture-bound, D113 — Slice 453)
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

-- ============================================================================
-- 2) cron_process_gameweek — nur Step 4 fixture-bound (Steps 1-3 byte-treu)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cron_process_gameweek(p_gameweek integer, p_fixture_results jsonb, p_player_stats jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fix JSONB;
  v_stat JSONB;
  v_fixtures_count INT := 0;
  v_stats_count INT := 0;
  v_synced_count INT := 0;
  v_player_id UUID;
BEGIN
  -- 1. Update fixture scores
  FOR v_fix IN SELECT * FROM jsonb_array_elements(p_fixture_results)
  LOOP
    UPDATE fixtures
    SET home_score = (v_fix->>'home_score')::INT,
        away_score = (v_fix->>'away_score')::INT,
        status = 'finished'
    WHERE id = (v_fix->>'fixture_id')::UUID;
    IF FOUND THEN v_fixtures_count := v_fixtures_count + 1; END IF;
  END LOOP;

  -- 2. Delete existing stats for these fixtures (idempotent reimport)
  DELETE FROM fixture_player_stats
  WHERE fixture_id IN (
    SELECT (elem->>'fixture_id')::UUID
    FROM jsonb_array_elements(p_fixture_results) AS elem
  );

  -- 3. Insert new player stats (with new columns)
  FOR v_stat IN SELECT * FROM jsonb_array_elements(p_player_stats)
  LOOP
    -- Handle nullable player_id
    v_player_id := NULL;
    IF v_stat->>'player_id' IS NOT NULL AND v_stat->>'player_id' != '' THEN
      v_player_id := (v_stat->>'player_id')::UUID;
    END IF;

    INSERT INTO fixture_player_stats (
      id, fixture_id, player_id, club_id,
      minutes_played, goals, assists, clean_sheet,
      goals_conceded, yellow_card, red_card, saves, bonus, fantasy_points,
      rating, match_position,
      is_starter, grid_position, api_football_player_id, player_name_api
    ) VALUES (
      gen_random_uuid(),
      (v_stat->>'fixture_id')::UUID,
      v_player_id,
      (v_stat->>'club_id')::UUID,
      COALESCE((v_stat->>'minutes_played')::INT, 0),
      COALESCE((v_stat->>'goals')::INT, 0),
      COALESCE((v_stat->>'assists')::INT, 0),
      COALESCE((v_stat->>'clean_sheet')::BOOLEAN, false),
      COALESCE((v_stat->>'goals_conceded')::INT, 0),
      COALESCE((v_stat->>'yellow_card')::BOOLEAN, false),
      COALESCE((v_stat->>'red_card')::BOOLEAN, false),
      COALESCE((v_stat->>'saves')::INT, 0),
      COALESCE((v_stat->>'bonus')::INT, 0),
      COALESCE((v_stat->>'fantasy_points')::INT, 0),
      CASE WHEN v_stat->>'rating' IS NOT NULL
           THEN (v_stat->>'rating')::NUMERIC
           ELSE NULL
      END,
      v_stat->>'match_position',
      COALESCE((v_stat->>'is_starter')::BOOLEAN, false),
      v_stat->>'grid_position',
      CASE WHEN v_stat->>'api_football_player_id' IS NOT NULL
           THEN (v_stat->>'api_football_player_id')::INT
           ELSE NULL
      END,
      v_stat->>'player_name_api'
    );
    v_stats_count := v_stats_count + 1;
  END LOOP;

  -- 4. Sync to player_gameweek_scores (fixture-bound, D113 — Slice 453; nur matched players)
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
  WHERE f.gameweek = p_gameweek
    AND f.status IN ('simulated', 'finished')
    AND fps.player_id IS NOT NULL
  ON CONFLICT (player_id, fixture_id)
  DO UPDATE SET score = EXCLUDED.score, league_id = EXCLUDED.league_id, gameweek = EXCLUDED.gameweek;

  GET DIAGNOSTICS v_synced_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'fixtures_imported', v_fixtures_count,
    'stats_imported', v_stats_count,
    'scores_synced', v_synced_count
  );
END;
$function$;

-- ============================================================================
-- AR-44 — explizite EXECUTE-Grants. CREATE OR REPLACE bewahrt die ACL; dieser Block
-- führt sie explizit (§3-Audit-Sicherheit). Matcht die Live-Baseline EXAKT (PATCH-AUDIT):
-- beide Fns sind service_role-only (anon=false, authenticated=false), Cron/Backfill-Pfad.
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.admin_resync_gw_scores(integer) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.admin_resync_gw_scores(integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.cron_process_gameweek(integer, jsonb, jsonb) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cron_process_gameweek(integer, jsonb, jsonb) TO service_role;
