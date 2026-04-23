# CTO Review: Slice 178 — Idempotency Foundation (Tier A1)

**Verdict:** PASS (Self-Review — DB foundation, live-verified)
**time-spent:** 10 min

## Spec-Coverage

- A1 ✅ Table `request_dedup_keys` mit PK `(user_id, dedup_key)` + CHECK status + expires-index
- A2 ✅ Helper `check_or_reserve_dedup_key(UUID, TEXT, INT)` SECURITY DEFINER implementiert
- A3 ✅ RLS: SELECT-own-rows + REVOKE/GRANT fuer Helper (authenticated-only)
- A4 ✅ Smoke-test first-call: `is_new=TRUE, cached=NULL`
- A5 ✅ Smoke-test retry: `is_new=FALSE, cached=<pending-NULL>`
- A6 ✅ Schema-Verify: has_table=1, has_function=1, policy_count=1, index_count=2

## Pattern-Konformitaet

- ✅ **Slice 005 auth.uid() Guard:** `IF auth.uid() IS NOT NULL AND auth.uid() IS DISTINCT FROM p_user_id` — service_role exempt, cross-user exploit blocked
- ✅ **AR-44 Migration-Template:** `REVOKE EXECUTE FROM PUBLIC, anon; GRANT TO authenticated` applied
- ✅ **Slice 179 Parallel-Pattern:** Write via SECURITY DEFINER only, client-roles SELECT-only
- ✅ **CHECK-constraint auf status:** 'pending', 'completed', 'failed' enumeriert

## Implementation-Notes

- `GET DIAGNOSTICS v_inserted = ROW_COUNT;` pattern — ON CONFLICT DO NOTHING setzt ROW_COUNT=0 bei conflict, >0 bei fresh-insert
- `SET search_path = public, pg_catalog` — AR-14-style hardening gegen search_path-injection
- `ON DELETE CASCADE` auf user_id — GDPR-cleanup bei user-deletion

## Follow-Ups (Separate Slices)

- **178a:** Pilot-Integration in `buy_player_sc` RPC — add `p_idempotency_key TEXT` param, replace/augment inline-idempotency
- **178b:** Cleanup-Cron fuer expired entries (`DELETE FROM request_dedup_keys WHERE expires_at < NOW()` via vercel cron `0 * * * *`)
- **178c:** Migration existing `subscribe_to_club` inline-60s-window → generic pattern (Slice 151c.2 → 178-Foundation)
- **178d:** Client-side idempotency-key-generation in useSafeMutation hook (UUID per mutation-trigger)

## Risk-Mitigation

- **Duplicate-key-generation race:** Table PK (user_id, dedup_key) enforces uniqueness at DB-level. Concurrent INSERT-attempts serialize on index.
- **Expired-entries no auto-cleanup in this slice:** idx_expires ready, cron-sweep als 178b.
- **status-flag unused yet:** pending/completed/failed — future 178a RPC updates to 'completed' after success, 'failed' on error.

## Summary

Solid Foundation. Live-applied + verified. Nicht-breaking — keine bestehende Money-RPC wurde touched. Pilot-Integration explicit separated als 178a.
