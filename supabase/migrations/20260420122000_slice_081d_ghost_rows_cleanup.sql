-- Slice 081d — Ghost-Rows Cleanup
-- Applied via mcp__supabase__apply_migration on 2026-04-20.
-- 11 Player-Rows bei Aston Villa die am 2026-04-16 neu angelegt wurden aber
-- Name+Contract-Duplikate von echten Spielern anderer Clubs sind (Werder Bremen,
-- Real Madrid, etc. — mit unterschiedlichen api_football_ids!).
-- Root-Cause: verunreinigter API-Football Squad-Response am 16.04.
-- 0 Appearances, 0 Holdings, 0 Orders → safe.
-- Fix: club_id=NULL macht sie aus Kader-Queries unsichtbar ohne Datenverlust.

UPDATE public.players p1
SET club_id = NULL
WHERE p1.club_id IS NOT NULL
  AND p1.last_appearance_gw = 0
  AND p1.created_at::date = '2026-04-16'
  AND EXISTS (
    SELECT 1 FROM public.players p2
    WHERE p2.first_name = p1.first_name
      AND p2.last_name = p1.last_name
      AND p2.contract_end = p1.contract_end
      AND p2.contract_end IS NOT NULL
      AND p2.club_id IS NOT NULL
      AND p2.club_id <> p1.club_id
      AND p2.last_appearance_gw > 0
      AND p2.id <> p1.id
  );
