-- Phase 1.3 Cleanup: DROP Aliases fuer DPC->SC Rename
-- Kontext: Operation Beta Ready Phase 1 Item 1.3.
--   2026-04-14: Alias-Pattern deployed (20260414151000_rpc_rename_dpc_to_sc_with_aliases.sql)
--   2026-04-14: Caller-Migration — Production Service + Cron + Tests auf _sc umgestellt
--   2026-04-15: Bot e2e/bots/ai/actions.ts:161 auf _sc umgestellt (letzter Caller)
--   2026-04-15: DROP der Aliase — 0 Consumer des alten Namens
-- Verify Pre-Apply: `grep -rn buy_player_dpc\|calculate_dpc_of_week src/ e2e/` = 0 Treffer.
-- Verify Post-Apply: SELECT proname FROM pg_proc WHERE proname IN ('buy_player_dpc','calculate_dpc_of_week') -> 0 rows.
DROP FUNCTION IF EXISTS public.buy_player_dpc(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.calculate_dpc_of_week(integer);
