-- =============================================================================
-- AR-52 (J8, 2026-04-15) — DROP buy_from_market ORPHAN
--
-- PROBLEM:
--   `buy_from_market(uuid, uuid, int)` ist ORPHAN:
--   - Kein Service-Caller (`trading.ts:96` nutzt `buy_player_sc`, Namens-
--     verwechslung mit der Service-Funktion `buyFromMarket()`)
--   - Grep auf src/ findet 0 Treffer
--   - Live GRANTED TO anon (AR-50 REVOKE haben wir schon gemacht)
--   - RPC-Body hat 0 Liquidation-Guard, 0 Club-Admin-Guard, 0 Circular-Guard,
--     0 Rate-Limit — Attack-Surface fuer "mint SCs zu floor_price"-Exploit
--
-- FIX:
--   DROP FUNCTION IF EXISTS. Falls Code-Regressionen, revert in separater
--   Migration (Remote-Body ist vorher via pg_get_functiondef dokumentiert).
-- =============================================================================

DROP FUNCTION IF EXISTS public.buy_from_market(uuid, uuid, integer);
