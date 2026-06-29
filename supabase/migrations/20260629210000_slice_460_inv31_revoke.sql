-- Slice 460 — INV-31 Security-Fix: REVOKE no_guard SECURITY-DEFINER-RPCs
-- ---------------------------------------------------------------------------
-- CEO-approved (Anil 2026-06-29, §3 "INV-31 jetzt, REVOKE-only").
--
-- INV-31 (db-invariants.test.ts) flaggt 2 SECURITY-DEFINER-RPCs mit p_user_id-Param,
-- granted an `authenticated`, OHNE auth.uid()-Guard (guard_type='no_guard') →
-- ein eingeloggter User kann eine FREMDE p_user_id uebergeben (A-02 identity-spoof).
--
-- Live-Triage (DB skzjfhvgccaeplydsunz, 2026-06-29):
--   * refund_wildcards_on_leave  = toter Orphan (0 Caller in src/, supabase/, scripts/,
--     0 DB-Caller per pg_proc.prosrc). Ruft earn_wildcards (Wert-Item, KEINE Idempotenz)
--     → authenticated Self-Repeat-Wildcard-Farming via PostgREST. Cross-User durch
--     earn_wildcards' inneren auth.uid()-Guard bereits blockiert.
--   * calculate_fan_rank          = live, aber NUR via service_role (Cron gameweek-sync)
--     + SECDEF-Owner-Kontext (trg_recalc_fan_rank_on_follow, batch_recalculate_fan_ranks).
--     Client-Service recalculateFanRank ist TOT (0 Production-Caller). Direkter
--     authenticated-Call mit fremder p_user_id = Info-Leak (Holdings-Count/Abo-Tier
--     in den Rueckgabe-Komponenten).
--
-- Fix: REVOKE-only (kein Body-Rewrite → null PATCH-AUDIT-Risiko S156 am 5k-Zeichen-Body).
-- Beide haben KEINEN legitimen direkten authenticated-Caller → Grant-Entzug schliesst
-- beide Lecks. service_role behaelt EXECUTE (Cron) — NICHT angetastet. SECDEF-Owner-Caller
-- (Trigger/Batch) laufen grant-unabhaengig weiter.
--
-- Kanon: database.md "SECURITY DEFINER + auth.uid()-Guard" (S005, INV-21) +
--        "Migration-Template-Pflichten" (AR-44).
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.calculate_fan_rank(uuid, uuid)        FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_wildcards_on_leave(uuid, uuid) FROM authenticated, anon, PUBLIC;
