-- Slice 461 — D-12 Dead-RPC GC: DROP get_club_dashboard_stats(text) v1
-- ---------------------------------------------------------------------------
-- CEO-approved (Anil 2026-06-29 "mach D-12", §3).
--
-- get_club_dashboard_stats(p_club_name text) = v1 (by name) = TOT:
--   * 0 Caller (pg_proc.prosrc-Scan leer, kein pg_cron, Grep src/+supabase/+scripts/
--     = nur _v2; Audit 2026-06-14/string-to-uuid-map.md:45 bestaetigt "Dead-RPC, Drop-Kandidat").
--   * SECURITY DEFINER + an `anon` granted + gibt RLS-umgehend pro Fan user_id +
--     holdings_count (Finanz-Signal) + total_score zurueck, per club_name von jedem
--     ausgeloggten Besucher enumerierbar.
--   * Body liest players WHERE club=p_club_name (toter Freitext-Pfad, D-26-Klasse).
--   * pg_depend (refobjid=v1) = 0 dependents → DROP ohne CASCADE.
--
-- Live-Pfad = get_club_dashboard_stats_v2(p_club_id uuid) (club.ts:503) — UNBERUEHRT.
-- DROP schliesst Exposure (anon-PII) + v1/v2-Duplikat in EINEM Schnitt (Disease-Register D-12).
-- Reine Subtraktion (§0). Pre-drop force-rollback-Smoke: v1 1→0, v2-Survivor=1.
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_club_dashboard_stats(text);
