-- Slice 454 — D-17: Ranking-SSOT (user_stats-Scores = kept-fresh Projektion von scout_scores)
--
-- Problem (Live-D87, DB skzjfhvgccaeplydsunz): scout_scores (trader/manager/analyst, kanonisch,
--   geld-gekoppelt via close_monthly_liga + airdrop) und user_stats (trading/manager/scout) berechnen
--   dieselben Dimensionen mit verschiedenen Formeln → 70/70 Overlap-User divergent (manager 778 vs 418).
--   user_stats nutzte eigene gedeckelte Formel (LEAST(1000, ...)) + wird auf Community/Club/Mentor gezeigt.
--
-- Fix (CEO Anil „A — scout_scores = eine Quelle"; CTO-WIE: kept-fresh Projektion):
--   scout_scores UNANGETASTET (Geld-Anker). user_stats-Scores werden Projektion davon:
--   (1) Score-Spalten smallint→integer (matcht scout_scores, killt Overflow-Edge; scout uncapped, smallint=32767).
--   (2) fn_compute_user_tier-Helper (extrahiert die tier-CASE, vermeidet Formel-Dup refresh+Trigger).
--   (3) refresh_user_stats: 3 Score-Vars aus scout_scores lesen statt eigener Formel; Rest byte-treu.
--   (4) Trigger trg_scout_scores_project_user_stats → projiziert jede scout_scores-Score-Änderung sofort
--       (legitimer Denorm-mit-Trigger; Register §4 „krank ist nur trigger-lose Drift").
--   (5) Backfill der 70 Rows + rank-Neuberechnung.
-- Proof: force-rollback divergence_before=70 → after=0. scout_scores 0 Edits (PATCH-AUDIT).

-- ============================================================================
-- 1) Score-Spalten widen smallint -> integer (Overflow-Edge entfernen)
--    trg_sync_level (AFTER UPD OF total_score) blockt ALTER TYPE → DROP davor, identisch danach wiederher.
-- ============================================================================
DROP TRIGGER IF EXISTS trg_sync_level ON public.user_stats;

ALTER TABLE public.user_stats
  ALTER COLUMN trading_score TYPE integer,
  ALTER COLUMN manager_score TYPE integer,
  ALTER COLUMN scout_score   TYPE integer,
  ALTER COLUMN total_score   TYPE integer;

-- trg_sync_level byte-identisch zur Live-Baseline wiederherstellen
CREATE TRIGGER trg_sync_level
AFTER INSERT OR UPDATE OF total_score ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION sync_level_on_stats_update();

-- ============================================================================
-- 2) tier-Helper (eine kanonische tier-Formel)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fn_compute_user_tier(p_total integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN p_total >= 5000 THEN 'Ikone'
    WHEN p_total >= 3000 THEN 'Legende'
    WHEN p_total >= 1500 THEN 'Elite'
    WHEN p_total >= 500  THEN 'Profi'
    WHEN p_total >= 100  THEN 'Amateur'
    ELSE 'Rookie'
  END;
$function$;

-- ============================================================================
-- 3) refresh_user_stats — Scores = Projektion aus scout_scores (Rest byte-treu zur Live-Baseline)
-- ============================================================================
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
  SELECT COUNT(*) INTO v_votes_cast FROM vote_entries WHERE user_id = p_user_id;
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

-- ============================================================================
-- 4) Projektions-Trigger: jede scout_scores-Score-Änderung → user_stats sofort (Drift unmöglich)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.trg_fn_project_scout_to_user_stats()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total INT;
BEGIN
  v_total := COALESCE(NEW.trader_score, 0) + COALESCE(NEW.manager_score, 0) + COALESCE(NEW.analyst_score, 0);
  UPDATE user_stats
  SET trading_score = COALESCE(NEW.trader_score, 0),
      manager_score = COALESCE(NEW.manager_score, 0),
      scout_score   = COALESCE(NEW.analyst_score, 0),
      total_score   = v_total,
      tier          = fn_compute_user_tier(v_total),
      updated_at    = now()
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_scout_scores_project_user_stats ON public.scout_scores;
CREATE TRIGGER trg_scout_scores_project_user_stats
AFTER INSERT OR UPDATE OF trader_score, manager_score, analyst_score ON public.scout_scores
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_project_scout_to_user_stats();

-- ============================================================================
-- 5) Backfill (one-time) — GEGUARDET gegen die Level-Notification-Kaskade (Reviewer S454-Finding#1)
--    `trg_sync_level` (AFTER UPDATE OF total_score auf user_stats → calculate_level_from_score →
--    profiles.level + "Aufstieg!"-Notification) würde beim Backfill 70× feuern → Level-Neuskalierung
--    + irreversibler Notification-Spam (70/70 wechseln Level: old_max 1019→Lvl45, new 2791→Lvl74).
--    Lösung: Trigger um den Backfill deaktivieren, profiles.level direkt + STILL neu-skalieren
--    (konsistent mit kanonischem total, ohne Notification), Trigger re-aktivieren.
--    Transaktional: bei Migrations-Fehler rollt das DISABLE mit zurück (kein dauerhaft-toter Trigger).
-- ============================================================================
ALTER TABLE public.user_stats DISABLE TRIGGER trg_sync_level;

UPDATE public.user_stats us
SET trading_score = COALESCE(ss.trader_score, 0),
    manager_score = COALESCE(ss.manager_score, 0),
    scout_score   = COALESCE(ss.analyst_score, 0),
    total_score   = COALESCE(ss.trader_score, 0) + COALESCE(ss.manager_score, 0) + COALESCE(ss.analyst_score, 0),
    tier          = fn_compute_user_tier(COALESCE(ss.trader_score, 0) + COALESCE(ss.manager_score, 0) + COALESCE(ss.analyst_score, 0)),
    updated_at    = now()
FROM public.scout_scores ss
WHERE ss.user_id = us.user_id;

WITH ranked AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY total_score DESC) AS rn FROM public.user_stats
)
UPDATE public.user_stats us SET rank = ranked.rn FROM ranked WHERE us.user_id = ranked.user_id;

-- profiles.level still + konsistent neu-skalieren (= was trg_sync_level täte, aber OHNE Notification-Spam)
UPDATE public.profiles p
SET level = calculate_level_from_score(us.total_score)
FROM public.user_stats us
WHERE us.user_id = p.id
  AND p.level IS DISTINCT FROM calculate_level_from_score(us.total_score);

ALTER TABLE public.user_stats ENABLE TRIGGER trg_sync_level;

-- ============================================================================
-- 6) AR-44 — explizite EXECUTE-Grants (Baseline: refresh_user_stats = service_role-only;
--    Trigger-/Helper-Fns kein Client-Caller)
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.refresh_user_stats(uuid) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.refresh_user_stats(uuid) TO service_role;
REVOKE EXECUTE ON FUNCTION public.trg_fn_project_scout_to_user_stats() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_compute_user_tier(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_compute_user_tier(integer) TO authenticated, service_role;
