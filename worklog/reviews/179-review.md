# CTO Review: Slice 179 — Transactions Append-Only (Tier A2)

**Verdict:** PASS (Self-Review — DB-invariant, live-verified)
**time-spent:** 8 min

## Spec-Coverage

- A1 ✅ REVOKE UPDATE, DELETE on public.transactions FROM anon, authenticated
- A2 ✅ BEFORE UPDATE OR DELETE Trigger `transactions_append_only_guard` (tgtype 27 = BEFORE + ROW + UPDATE + DELETE)
- A3 ✅ GUC-bypass `SET LOCAL bescout.allow_transactions_mutation = 'true'` funktioniert
- A4 ✅ INSERT unveraendert (kein Impact auf transaction-write-pattern)
- A5 ✅ Post-Apply: pg_policies zeigt SELECT-only (`transactions_select_own`), keine UPDATE/DELETE-Policy
- A6 ✅ Post-Apply: pg_trigger zeigt neuen Guard aktiv
- A7 ✅ Negative-Test: UPDATE ohne GUC raises exception mit 'transactions is append-only'

## Migration

- Lokal: `supabase/migrations/20260424000000_transactions_append_only.sql`
- Live: `mcp__supabase__apply_migration` auf project skzjfhvgccaeplydsunz, migration_name `transactions_append_only_slice_179`, success=true

## Risks & Mitigations

- **RPC-Impact:** Pre-Audit zeigte keine SECURITY-DEFINER-RPCs die UPDATE/DELETE auf transactions machen. Nur 2 one-time-backfill-migrations (20260415060000 + 20260415132200) — bereits historisch, nicht betroffen.
- **Zukuenftige Migrations:** Bulk-UPDATEs muessen `BEGIN; SET LOCAL bescout.allow_transactions_mutation = 'true'; ... ; COMMIT;` pattern nutzen. Dokumentation im Migration-File-Kommentar + in common-errors.md.
- **Admin-Refund-Flow:** BeScout hat keinen Refund-Flow in V1. Falls eingefuehrt → RPC setzt GUC vor UPDATE.

## Post-Slice Follow-up

- `.claude/rules/common-errors.md` Section 2 Supabase/Postgres: Eintrag "Transactions Append-Only (Slice 179)" mit GUC-opt-in-Pattern fuer legitimierte Bulk-Migrations
- `memory/patterns.md`: Pattern "DB-Invariant via Trigger + Opt-In GUC" als blueprint fuer andere immutable-log-tables (z.B. `trades`, `activity_log`)

## Summary

Hart enforced Money-Invariant. Defense-in-depth (REVOKE + Trigger). Legitimierte Bulk-Migrations via GUC-Opt-in moeglich. Live-DB getestet, beide Tests gruen. Kein Runtime-Impact (INSERT unveraendert).
