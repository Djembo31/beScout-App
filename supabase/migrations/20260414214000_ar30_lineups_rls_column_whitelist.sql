-- =============================================================================
-- AR-30 (Operation Beta Ready, Journey #4) — lineups RLS Column-Level Whitelist
--
-- PROBLEM (J4B-08):
--   Anon kann lineups lesen: `reward_amount` (Privacy), `captain_slot`, `slot_scores`,
--   `equipment_map`, `slot_*` (Competitive-Info leak).
--
-- FIX (CEO-Empfehlung Schnellbahn 2026-04-14):
--   Column-Level Privileges statt View/Policy-Gymnastik.
--   - REVOKE SELECT (private cols) FROM anon, PUBLIC, authenticated
--   - GRANT SELECT (whitelist cols) TO authenticated, anon
--
-- Whitelist (public read fuer Leaderboard):
--   id, user_id, event_id, total_score, rank, submitted_at, locked, formation
--
-- Private (column-level REVOKE):
--   reward_amount (Privacy)
--   slot_gk, slot_def1..4, slot_mid1..4, slot_att, slot_att2, slot_att3 (Lineup-Auswahl)
--   slot_scores, captain_slot, wildcard_slots, equipment_map (Competitive-Info)
--   synergy_bonus_pct, synergy_details, streak_bonus_pct (Scoring-Details)
--
-- NOTE: PostgreSQL Column-Level REVOKE greift auch fuer own-policy-Reads.
-- Owner muss explizit diese columns selecten im Service (kein SELECT *).
-- Fuer vollstaendige Lineup-Details: RPC `get_my_lineup(event_id)` zurueckliefern (future).
-- =============================================================================

REVOKE SELECT (
  reward_amount, slot_gk, slot_def1, slot_def2, slot_def3, slot_def4,
  slot_mid1, slot_mid2, slot_mid3, slot_mid4, slot_att, slot_att2, slot_att3,
  slot_scores, captain_slot, wildcard_slots, equipment_map,
  synergy_bonus_pct, synergy_details, streak_bonus_pct
) ON public.lineups FROM anon, PUBLIC, authenticated;

GRANT SELECT (
  id, user_id, event_id, total_score, rank, submitted_at, locked, formation
) ON public.lineups TO authenticated, anon;

COMMENT ON COLUMN public.lineups.reward_amount IS
  'AR-30 (2026-04-14): Owner-only via column-level REVOKE. Privacy.';
COMMENT ON COLUMN public.lineups.captain_slot IS
  'AR-30 (2026-04-14): Owner-only via column-level REVOKE. Competitive-Info.';
COMMENT ON COLUMN public.lineups.slot_scores IS
  'AR-30 (2026-04-14): Owner-only via column-level REVOKE. Competitive-Info.';
COMMENT ON COLUMN public.lineups.equipment_map IS
  'AR-30 (2026-04-14): Owner-only via column-level REVOKE. Competitive-Info.';
