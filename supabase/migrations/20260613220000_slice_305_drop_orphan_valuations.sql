-- Slice 305 — Orphan Community-Valuation Removal (S7 Phase-2 #3)
--
-- Das Community-Valuation-Feature war vollständig gebaut aber orphan: CommunityValuation.tsx
-- (@experimental, 0 JSX/Import-Konsumenten, nur Barrel-exportiert) → valuations.ts → diese
-- 2 Tabellen (je 5 Pre-Orphan-Testzeilen) + submit_player_valuation RPC.
--
-- RED/GREEN-Removal-Proof (§11.3, kein Blind-Delete): verifiziert 0 eingehende FKs, 0 Views,
-- 0 Trigger, 0 Wrapper-Caller der RPC; einziger Code-Pfad (CommunityValuation + valuations.ts)
-- in diesem Slice gelöscht. Reihenfolge: RPC zuerst (schreibt in player_valuations), dann Tabellen.

DROP FUNCTION IF EXISTS public.submit_player_valuation(p_user_id uuid, p_player_id uuid, p_estimated_cents bigint, p_gameweek integer);

DROP TABLE IF EXISTS public.player_valuations;
DROP TABLE IF EXISTS public.player_fair_values;
