-- =============================================================================
-- AR-24 (Operation Beta Ready, Journey #3) — trades RLS Column-Level Whitelist
--
-- PROBLEM (J3B-08):
--   Anon sieht 747 trades vollstaendig, inkl. `buy_order_id`, `sell_order_id`.
--   User kann Order-History rekonstruieren (welche User an welche Orders gekoppelt).
--
-- FIX (CEO-Empfehlung Schnellbahn 2026-04-14):
--   Column-Level Privileges statt Policy-Gymnastik.
--   - REVOKE SELECT (buy_order_id, sell_order_id) FROM anon, PUBLIC, authenticated
--   - GRANT SELECT (whitelist cols) TO authenticated, anon
--   - trades_select_own Policy bleibt -> owner sieht alles (policies overrule nicht column grants
--     fuer SELECT in Postgres, aber column-level REVOKE bewirkt `column is hidden`).
--
-- IMPORTANT:
--   PostgreSQL Column-Level Grants: ein SELECT auf die Tabelle laedt NUR erlaubte columns.
--   SELECT * FROM trades WHERE buyer_id = auth.uid() -> buy_order_id sichtbar (policy match + ...)
--   -> NEIN. Column-Level REVOKE schliesst column auch fuer policy-berechtigte Reads aus.
--
-- WORKAROUND fuer Owner-Reads:
--   Client muss eigene Trades via service_role holen ODER explizit columns selecten.
--   In Praxis: `useTradesByUser` Service select nur die whitelist-Cols explizit.
--   Fuer Order-History: separater RPC `get_my_trade_orders` der buy_order_id/sell_order_id
--   zurueckgibt (future-work).
--
-- VERIFY nach Apply:
--   1. SELECT has_column_privilege('anon', 'public.trades', 'buy_order_id', 'SELECT') -> false
--   2. SELECT has_column_privilege('anon', 'public.trades', 'price', 'SELECT') -> true
--   3. Anon-Client: SELECT buy_order_id FROM trades -> permission denied (column)
-- =============================================================================

REVOKE SELECT (buy_order_id, sell_order_id) ON public.trades FROM anon;
REVOKE SELECT (buy_order_id, sell_order_id) ON public.trades FROM PUBLIC;
REVOKE SELECT (buy_order_id, sell_order_id) ON public.trades FROM authenticated;

GRANT SELECT (
  id, player_id, buyer_id, seller_id, price, quantity, executed_at,
  platform_fee, pbt_fee, club_fee, ipo_id
) ON public.trades TO authenticated;

GRANT SELECT (
  id, player_id, buyer_id, seller_id, price, quantity, executed_at,
  platform_fee, pbt_fee, club_fee, ipo_id
) ON public.trades TO anon;

COMMENT ON COLUMN public.trades.buy_order_id IS
  'AR-24 (2026-04-14): Column-level REVOKE SELECT fuer anon/PUBLIC/authenticated (Order-History Privacy).';
COMMENT ON COLUMN public.trades.sell_order_id IS
  'AR-24 (2026-04-14): Column-level REVOKE SELECT fuer anon/PUBLIC/authenticated (Order-History Privacy).';
