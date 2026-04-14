-- =============================================================================
-- AR-43 (Operation Beta Ready, Journey #5) — Migration-Drift Full-Sweep
--
-- KONTEXT (5. Journey in Folge mit Drift — J1 AR-1, J2B-01, J3B-02, J4B-04, J5B-04):
--   4 Stub-Migrations in Mystery-Box-Bereich (20260410170000, 20260411114500,
--   20260411114600, 20260411114700) dokumentieren NUR dass `apply_migration`
--   aufgerufen wurde — der echte SQL-Body liegt nur auf Remote.
--   → Greenfield `db reset` wuerde `get_player_price_changes_7d` NICHT erzeugen.
--
-- SCOPE AR-43:
--   Consolidated-Snapshot der kritischen RPCs, die durch Stubs verloren gingen:
--   - `get_player_price_changes_7d(uuid[], integer)` (ursprünglich aus Stub 20260410170000)
--
--   `open_mystery_box_v2(boolean)` wurde durch AR-42 (20260414230000) + AR-42b
--   (20260414233000) bereits als Full-CREATE-OR-REPLACE idempotent gemacht.
--
-- ANSATZ: Snapshot statt Stub-Rekonstruktion. Stubs bleiben als historische
-- Marker (mit Hinweis "superseded by 20260415000000"). Dieser Snapshot hat den
-- Live-Body-Stand 2026-04-15 und ist idempotent via CREATE OR REPLACE.
--
-- REGEL (ab jetzt aktiv, siehe database.md):
--   Stub-Migrations sind verboten. Jede `apply_migration` MUSS vollstaendige SQL
--   enthalten. Drift-Detection wird mit Audit-Script in common-errors.md
--   dokumentiert.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_player_price_changes_7d(
  p_player_ids uuid[] DEFAULT NULL::uuid[],
  p_limit integer DEFAULT 20
)
 RETURNS TABLE(player_id uuid, price_7d_ago bigint, price_now bigint, change_abs bigint, change_pct numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH latest_prices AS (
    SELECT p.id AS player_id, p.floor_price AS price_now
    FROM players p
    WHERE p.is_liquidated = false
      AND p.floor_price > 0
      AND (p_player_ids IS NULL OR p.id = ANY(p_player_ids))
  ),
  prices_7d_ago AS (
    SELECT DISTINCT ON (t.player_id)
      t.player_id,
      t.price AS price_7d_ago
    FROM trades t
    WHERE t.executed_at <= (now() - INTERVAL '7 days')
      AND (p_player_ids IS NULL OR t.player_id = ANY(p_player_ids))
    ORDER BY t.player_id, t.executed_at DESC
  )
  SELECT
    lp.player_id,
    COALESCE(p7.price_7d_ago, lp.price_now) AS price_7d_ago,
    lp.price_now,
    lp.price_now - COALESCE(p7.price_7d_ago, lp.price_now) AS change_abs,
    CASE
      WHEN COALESCE(p7.price_7d_ago, 0) > 0
      THEN ROUND(((lp.price_now - p7.price_7d_ago)::NUMERIC / p7.price_7d_ago) * 100, 2)
      ELSE 0
    END AS change_pct
  FROM latest_prices lp
  LEFT JOIN prices_7d_ago p7 ON p7.player_id = lp.player_id
  WHERE lp.price_now - COALESCE(p7.price_7d_ago, lp.price_now) <> 0
  ORDER BY ABS(lp.price_now - COALESCE(p7.price_7d_ago, lp.price_now)) DESC
  LIMIT p_limit;
$function$;

-- Market-data RPC: public + authenticated readable (price changes are public info).
REVOKE EXECUTE ON FUNCTION public.get_player_price_changes_7d(uuid[], integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_price_changes_7d(uuid[], integer) TO anon, authenticated;

COMMENT ON FUNCTION public.get_player_price_changes_7d(uuid[], integer) IS
  'AR-43 (2026-04-15): Consolidated snapshot of 4 mystery-box-era stub migrations.';
