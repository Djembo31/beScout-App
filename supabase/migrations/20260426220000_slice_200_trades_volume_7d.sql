-- Slice 200 (2026-04-26): Trades-Volume-7d Backend
--
-- Closes Phase-A FM-Audit-Finding 4.4:
-- Sortier nach Trade-Volume-7d auf /market — Comunio-Standard (Trade-Reflex-Action).
--
-- Architektur (analog Slice 197d MV-Trend-Blueprint):
--   1. ALTER TABLE players ADD COLUMN trades_volume_7d BIGINT NULL
--   2. RPC cron_calculate_trade_volume_7d() — daily-cron-Logik:
--        a. COUNT(*) FROM trades GROUP BY player_id WHERE executed_at > NOW() - 7d
--        b. UPDATE players SET trades_volume_7d = computed_count
--        c. Players ohne Trades in 7d → 0 (NICHT NULL — explicit zero)
--   3. AR-44 REVOKE/GRANT (cron-only, service_role default access)
--
-- Triggered daily 0 4 * * * via vercel.json → /api/cron/calculate-trade-volume-7d.

-- =====================================================================
-- 1. Schema: players.trades_volume_7d
-- =====================================================================

ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS trades_volume_7d BIGINT NULL;

COMMENT ON COLUMN public.players.trades_volume_7d IS
  'Slice 200: Anzahl Trades in den letzten 7 Tagen pro Player. Berechnet daily by cron_calculate_trade_volume_7d() aus public.trades GROUP BY player_id WHERE executed_at > NOW() - 7d. NULL = noch nicht berechnet (vor Initial-Cron). 0 = keine Trades in 7d (explicit zero).';

-- =====================================================================
-- 2. Cron-RPC: Trade-Volume Aggregation
-- =====================================================================

CREATE OR REPLACE FUNCTION public.cron_calculate_trade_volume_7d()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  v_updated_count INT := 0;
  v_zero_count INT := 0;
BEGIN
  -- Step 1: Update all players with trade-count from last 7 days
  -- Players without trades in 7d get 0 (explicit zero, not NULL — more info).
  WITH volume_calc AS (
    SELECT
      p.id AS player_id,
      COALESCE(t.cnt, 0) AS volume_7d
    FROM public.players p
    LEFT JOIN (
      SELECT player_id, COUNT(*) AS cnt
      FROM public.trades
      WHERE executed_at > NOW() - INTERVAL '7 days'
      GROUP BY player_id
    ) t ON t.player_id = p.id
  )
  UPDATE public.players p
  SET trades_volume_7d = vc.volume_7d
  FROM volume_calc vc
  WHERE p.id = vc.player_id
    AND (p.trades_volume_7d IS DISTINCT FROM vc.volume_7d);
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- Diagnostic: how many players have zero volume (post-update)
  SELECT COUNT(*) INTO v_zero_count
  FROM public.players
  WHERE trades_volume_7d = 0;

  -- Discriminated-Union return shape (Slice 168)
  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count,
    'zero_count', v_zero_count,
    'window_days', 7,
    'date', CURRENT_DATE::text
  );
END;
$function$;

COMMENT ON FUNCTION public.cron_calculate_trade_volume_7d() IS
  'Slice 200 (2026-04-26): Daily cron — calc 7d trade-count per player from public.trades. Idempotent (UPDATE only when value changed). Returns {success, updated_count, zero_count, window_days, date}.';

-- =====================================================================
-- 3. AR-44: REVOKE/GRANT — cron-only (service_role default access)
-- =====================================================================

REVOKE EXECUTE ON FUNCTION public.cron_calculate_trade_volume_7d() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_calculate_trade_volume_7d() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_calculate_trade_volume_7d() FROM authenticated;
-- service_role hat default access (kein expliciter GRANT noetig — Postgres-Default fuer service_role).

-- =====================================================================
-- 4. Initial Backfill — manuell durch CTO via mcp__supabase__execute_sql nach Migration:
--
--   SELECT public.cron_calculate_trade_volume_7d();
--
-- Erste Run: updated_count = #players (alle initial NULL → 0/value), zero_count = #players ohne 7d-Trades.
-- =====================================================================
