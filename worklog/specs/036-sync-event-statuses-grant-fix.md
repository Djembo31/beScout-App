# Slice 036 — sync_event_statuses Permission-denied Fix

**Groesse:** S · **CEO-Scope:** nein (infra/grants) · **Typ:** P1 Bug-Fix

## Ziel

Postgres-Logs zeigen wiederholt `permission denied for function sync_event_statuses`
(42501). Caller: `src/app/api/events/route.ts:20` "Best-effort status sync" via
`supabaseServer.rpc('sync_event_statuses')` mit anon-key client.

RPC body fordert `auth.uid() IS NOT NULL` UND `EXISTS(club_admins WHERE user_id = auth.uid())`.
Anon-client hat kein JWT → no auth.uid() → no grant → 42501 BEFORE body even runs.

Folge: Event-Status (registering→running→ended) wird NIE durch API-Route aktualisiert,
nur durch manuelle Admin-Klicks oder Cron-Jobs.

## Audit-Findings

- 1 caller: `src/app/api/events/route.ts:20`
- 0 cron jobs fuer sync_event_statuses (nur cron_score_pending_events existiert)
- RPC-Grants: service_role, authenticated, postgres → **kein anon**

## Hypothese ueber Original-Intent

API-Route wollte beim GET /api/events ein lazy-sync triggern (events die ihre starts_at
ueberschritten haben → status='running'). Das ist convenience, kein critical-path.
Korrekt waere ein cron-job der das alle 1-5min macht.

## Fix-Plan

1. **Migration:** `_sync_event_statuses_internal()` ohne auth/admin-guards
   - Body identical zur public version, aber ohne guards
   - REVOKE all from PUBLIC/anon/authenticated
   - GRANT service_role only

2. **Migration:** pg_cron schedule `sync-event-statuses` alle 1 min
   - Calls `_sync_event_statuses_internal()`
   - Wrapper-Pattern analog `cron_score_pending_events` (Slice 024)

3. **Public RPC `sync_event_statuses()` bleibt** mit admin-guards fuer manuelle
   admin-driven sync (Admin-Panel Button). Internal call delegate.

4. **API-Route `/api/events`:** sync-call entfernen — cron handhabt das.

## Acceptance Criteria

1. Logs nach Deploy: keine `permission denied for function sync_event_statuses` mehr
2. Event mit starts_at < now() AND status='registering' → cron flippt es auf 'running' innerhalb 1-2 min
3. tsc clean
4. API-Route `/api/events` antwortet weiterhin korrekt
5. Cron-Run zeigt success in `cron.job_run_details`

## Proof-Plan

- `worklog/proofs/036-pre-state.txt` — RPC body + caller + grants
- `worklog/proofs/036-cron-run.txt` — erste cron-execution log
- `worklog/proofs/036-logs-clean.txt` — postgres-logs nach 5min ohne permission-denied
- `worklog/proofs/036-tsc.txt` — tsc clean

## Scope-Out

- Andere "permission denied" RPCs (Slice 037+ separate)
- Sync-Frequenz-Tuning (start mit 1 min, optimieren spaeter)
- Admin-Panel Button-Test (out of scope)
