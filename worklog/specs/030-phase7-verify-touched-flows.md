# Slice 030 — Phase 7 Verify: Touched Flows + DB Invariants

**Groesse:** L · **CEO-Scope:** nein (Test/Audit) · **Typ:** E2E Verify-Slice

## Ziel

Volle Verifikation der 5 von Session 3+4 touchierten Flows + Post-Deploy-Verify-Checklist (7 Punkte aus briefing). Fehlerfreier Softwarestand bescout.net. Playwright gegen bescout.net + DB-Checks via Supabase MCP.

## Test-Matrix

### Part A — DB-Level-Checks (schnell, read-only)
1. `cron.job_run_details` fuer `score-pending-events` → succeeded-Runs vorhanden?
2. `SELECT COUNT(*) FROM holdings WHERE quantity <= 0` → 0 (Trigger works)
3. `rpc_save_lineup` body enthaelt alle 9 neuen Reject-Keys
4. `cron_score_pending_events` body + cron.job active
5. `holdings_auto_delete_zero` trigger registriert
6. Handles `k_demirtas`/`kemal` frei (Slice 028)

### Part B — UI-E2E via Playwright (Deploy bescout.net)
1. **Flow 1** Login — jarvis-qa@bescout.net, home-Redirect
2. **Flow 8** /player/[id] — Below-fold-Queries deferred (B3 Slice 017)
3. **Flow 14** /transactions — zeigt neue i18n-Labels (B2 + Slice 027)
4. **Flow 15** Logout — React Query Cache cleared (B1 Slice 015)
5. **Flow 4 (Market)** — Portfolio-Tab zeigt kein `quantity=0` (Slice 025 Trigger)
6. **Flow 11** Lineup-Save via direkten RPC-Call in browser.evaluate mit ungueltiger Formation → `invalid_formation` error (B4 Slice 023)

## Acceptance Criteria

1. Alle 6 DB-Checks PASS
2. Alle 6 UI-E2E-Flows PASS
3. Keine unerwarteten Errors in Browser-Console
4. Mindestens 1 Screenshot pro UI-Flow als Proof
5. Gefundene Bugs → separater Follow-Up-Slice (dokumentiert in 030-findings.md)

## Proof-Plan

- `worklog/proofs/030-db-checks.txt` — Part A Results (5 Queries)
- `worklog/proofs/030-ui-*.png` — Screenshots pro Flow
- `worklog/proofs/030-console-errors.txt` — Browser-Console-Dump pro Flow
- `worklog/proofs/030-verdict.md` — Final GREEN/YELLOW/RED pro Flow

## Scope-Out

- Restliche 10 Flows (nicht von Session 3+4 touchiert) — fuer naechste Session
- Load-Tests / Performance-Benchmarks — out of scope
- Mobile-Viewport-Tests (393px) — Session 4 fokus war Desktop/Logic
