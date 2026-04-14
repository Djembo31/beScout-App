-- AR-29 (Operation Beta Ready, Journey #4) — score_event: pgs_count=0 Guard am RPC-Anfang.
-- Problem: 12 Events wurden mit pgs_count=0 gescored. Weil `IF v_gw_score IS NULL THEN v_gw_score := 40;`
-- fallback fuer jeden Spieler, verteilt der RPC "phantom default-40 scores" an alle Lineups.
-- User bekommen Rewards basierend auf fake Scores (40 pro Slot = 40 * 12 = 480 total).
--
-- CEO-Decision (Schnellbahn 2026-04-14): Guard einbauen im RPC-Anfang.
-- Reconciliation der 12 alten Events: NICHT in dieser Migration (CEO: "ignore old 12").
--
-- Strategie: Live-Body lesen, Guard nach "IF v_event.gameweek IS NULL THEN ... END IF;" einsetzen, EXECUTE.

DO $migrate$
DECLARE
  orig_body TEXT;
  new_body TEXT;
BEGIN
  SELECT pg_get_functiondef(oid) INTO orig_body
  FROM pg_proc
  WHERE proname = 'score_event'
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

  IF orig_body IS NULL THEN
    RAISE EXCEPTION 'score_event not found';
  END IF;

  -- Idempotenz: wenn Guard-Marker bereits drin, skip (erlaubt re-apply nach Rollback).
  IF orig_body ~ 'no_player_game_stats' THEN
    RAISE NOTICE 'AR-29: Guard bereits vorhanden in score_event — skip';
    RETURN;
  END IF;

  -- Regex: matched den bestehenden "Event hat keinen Gameweek" Block, haengt Guard danach an.
  -- Whitespace-tolerant via \s+ zwischen Tokens.
  new_body := regexp_replace(
    orig_body,
    E'(IF v_event\\.gameweek IS NULL THEN\\s+RETURN jsonb_build_object\\(\\s*''success''\\s*,\\s*false\\s*,\\s*''error''\\s*,\\s*''Event hat keinen Gameweek''\\s*\\)\\s*;\\s+END IF\\s*;)',
    E'\\1\n\n  -- AR-29 Guard: kein player_gameweek_scores fuer diese Gameweek -> verhindert phantom default-40 Scores\n  IF (SELECT COUNT(*) FROM player_gameweek_scores WHERE gameweek = v_event.gameweek) = 0 THEN\n    RETURN jsonb_build_object(''success'', false, ''error'', ''no_player_game_stats'', ''gameweek'', v_event.gameweek);\n  END IF;'
  );

  IF new_body IS DISTINCT FROM orig_body THEN
    EXECUTE new_body;
    RAISE NOTICE 'AR-29: score_event pgs_count=0 Guard eingebaut';
  ELSE
    RAISE EXCEPTION 'AR-29: Anchor-Pattern nicht gefunden. '
                    'Erwartet: "IF v_event.gameweek IS NULL THEN ... END IF;" '
                    'Live-Body manuell pruefen: SELECT pg_get_functiondef(''score_event''::regproc);';
  END IF;
END $migrate$;
