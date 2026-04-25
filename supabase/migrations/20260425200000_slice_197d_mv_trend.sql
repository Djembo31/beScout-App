-- Slice 197d (2026-04-25): MV-Trend 7d Backend
--
-- Closes Phase-A FM-Audit-Findings 1.2 (Kader-Tab) + 4.1 (MarketFilters):
-- MV-Trend rising/stable/falling fehlt systemisch — Comunio-Standard seit 2003,
-- Trade-Reflex-Action #1.
--
-- Architektur (Option A):
--   1. ALTER TABLE players ADD COLUMN mv_trend_7d TEXT (CHECK rising|stable|falling|NULL)
--   2. NEW TABLE players_mv_history (player_id, date, mv_eur) — daily snapshot
--   3. RPC cron_snapshot_and_calc_mv_trends() — daily-cron-Logik:
--        a. Snapshot today's MV in history-table (ON CONFLICT update)
--        b. Compare vs 7d-old → write trend (>5% threshold)
--        c. Cleanup history >30d
--   4. RLS enabled, KEINE Policy → service_role only (cron + admin SQL).
--
-- Triggered daily 0 3 * * * via vercel.json → /api/cron/calculate-mv-trends.

-- =====================================================================
-- 1. Schema: players.mv_trend_7d
-- =====================================================================

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS mv_trend_7d TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public'
      AND table_name = 'players'
      AND constraint_name = 'players_mv_trend_7d_check'
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_mv_trend_7d_check
      CHECK (mv_trend_7d IS NULL OR mv_trend_7d IN ('rising','stable','falling'));
  END IF;
END $$;

COMMENT ON COLUMN public.players.mv_trend_7d IS
  'Slice 197d: 7d MV-Trend (rising|stable|falling|NULL). Calculated daily by cron_snapshot_and_calc_mv_trends() from players_mv_history. NULL = no 7d-old data yet (new player or first week post-launch). >5% threshold.';

-- =====================================================================
-- 2. History-Tabelle
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.players_mv_history (
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  mv_eur BIGINT NOT NULL,
  PRIMARY KEY (player_id, date)
);

CREATE INDEX IF NOT EXISTS idx_players_mv_history_date
  ON public.players_mv_history(date);

COMMENT ON TABLE public.players_mv_history IS
  'Slice 197d: Daily MV-snapshot per player. Used by cron_snapshot_and_calc_mv_trends() for 7d-trend calculation. Auto-cleanup >30d via same cron.';

-- =====================================================================
-- 3. RLS — service_role only (no policies → authenticated/anon get 0 rows)
-- =====================================================================

ALTER TABLE public.players_mv_history ENABLE ROW LEVEL SECURITY;
-- KEINE Policy: cron-only data, service_role bypassed RLS automatisch.
-- Authenticated/anon SELECT liefert leeres Set (kein 403, kein Error).
-- Falls Frontend jemals Trend-History braucht: Policy hier hinzufuegen.

-- =====================================================================
-- 4. Cron-RPC: Snapshot + Trend-Calc + Cleanup
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cron_snapshot_and_calc_mv_trends()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_snapshot_count INT := 0;
  v_trend_updated_count INT := 0;
  v_history_pruned INT := 0;
BEGIN
  -- Step 1: Snapshot today's MV (idempotent — same-day reruns just update value)
  INSERT INTO public.players_mv_history (player_id, date, mv_eur)
  SELECT id, CURRENT_DATE, COALESCE(market_value_eur, 0)
  FROM public.players
  WHERE market_value_eur IS NOT NULL
  ON CONFLICT (player_id, date) DO UPDATE SET mv_eur = EXCLUDED.mv_eur;
  GET DIAGNOSTICS v_snapshot_count = ROW_COUNT;

  -- Step 2: Calc trend from 7d-old vs today's MV (5% threshold)
  WITH trend_calc AS (
    SELECT
      today.player_id,
      CASE
        WHEN past.mv_eur IS NULL THEN NULL                            -- no 7d-old data
        WHEN past.mv_eur = 0 AND today.mv_eur > 0 THEN 'rising'        -- new MV after zero
        WHEN past.mv_eur = 0 THEN 'stable'                             -- both zero
        WHEN today.mv_eur::NUMERIC > past.mv_eur::NUMERIC * 1.05 THEN 'rising'
        WHEN today.mv_eur::NUMERIC < past.mv_eur::NUMERIC * 0.95 THEN 'falling'
        ELSE 'stable'
      END AS new_trend
    FROM public.players_mv_history today
    LEFT JOIN public.players_mv_history past
      ON past.player_id = today.player_id
      AND past.date = CURRENT_DATE - INTERVAL '7 days'
    WHERE today.date = CURRENT_DATE
  )
  UPDATE public.players p
  SET mv_trend_7d = tc.new_trend
  FROM trend_calc tc
  WHERE p.id = tc.player_id
    AND (p.mv_trend_7d IS DISTINCT FROM tc.new_trend);
  GET DIAGNOSTICS v_trend_updated_count = ROW_COUNT;

  -- Step 3: Cleanup old history (>30d)
  DELETE FROM public.players_mv_history
  WHERE date < CURRENT_DATE - INTERVAL '30 days';
  GET DIAGNOSTICS v_history_pruned = ROW_COUNT;

  -- Discriminated-Union return shape (Slice 168)
  RETURN jsonb_build_object(
    'success', true,
    'snapshot_count', v_snapshot_count,
    'trend_updated_count', v_trend_updated_count,
    'history_pruned', v_history_pruned,
    'date', CURRENT_DATE::text
  );
END;
$function$;

COMMENT ON FUNCTION public.cron_snapshot_and_calc_mv_trends() IS
  'Slice 197d (2026-04-25): Daily cron — snapshots MV + calc 7d trend (rising/stable/falling) + cleanup history >30d. Threshold ±5%. Returns {success, snapshot_count, trend_updated_count, history_pruned, date}.';

-- =====================================================================
-- 5. AR-44: REVOKE/GRANT — cron-only (service_role default access)
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.cron_snapshot_and_calc_mv_trends() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_snapshot_and_calc_mv_trends() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_snapshot_and_calc_mv_trends() FROM authenticated;
-- service_role hat default access (kein expliciter GRANT noetig — Postgres-Default fuer service_role).

-- =====================================================================
-- 6. Initial Backfill — manuell durch CTO via mcp__supabase__execute_sql nach Migration:
--
--   SELECT public.cron_snapshot_and_calc_mv_trends();
--
-- Erste Run: snapshot_count = #players mit MV != NULL, trend_updated_count = 0
-- (kein 7d-old-data). Trends werden ab Tag 8 verfuegbar.
-- =====================================================================
