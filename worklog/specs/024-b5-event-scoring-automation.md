# Slice 024 — B5 Event Scoring Automation (pg_cron, Option c)

**Groesse:** M · **CEO-Scope:** ja (Ops-Infrastruktur, Pilot-Blocker) · **Approval:** (c) pg_cron bestaetigt 2026-04-17

## Ziel

Event-Scoring automatisieren via pg_cron. Admin-manuelle Transition `open → scored` entfaellt — cron-job findet faellige events (`ends_at <= now()` + alle fixtures finished) und ruft bestehenden `score_event(event_id)` automatisch auf. Pilot-Robustheit: kein vergessenes Scoring mehr → User bekommen Rewards zuverlaessig.

## Betroffene Files (geschaetzt)

| File | Was |
|------|-----|
| **NEU** `supabase/migrations/YYYYMMDDHHMMSS_event_scoring_cron.sql` | Wrapper-RPC `cron_score_pending_events()` + `cron.schedule('score-pending-events', '*/5 * * * *', ...)`. AR-44 Block. |
| **ggf. Patch** `supabase/migrations/YYYYMMDDHHMMSS_score_event_idempotency.sql` | Nur falls `score_event` heute nicht idempotent ist (wird in IMPACT verifiziert). |
| `src/lib/__tests__/db-invariants.test.ts` | INV-28: pg_cron-Job existiert + wrapper-RPC enthaelt erwartete Branches (ends_at check, status filter, score_event call) |

Kein Client-Code-Change. Kein UI-Change. Kein Service-Change.

## Acceptance Criteria

1. **Cron-Job registriert:** `SELECT jobname FROM cron.job WHERE jobname='score-pending-events'` liefert 1 Row mit schedule `*/5 * * * *`.
2. **Wrapper-RPC selectiert korrekt:** `cron_score_pending_events()` findet events mit `status='open' AND ends_at <= now()` UND alle fixtures dieses events haben `status='finished'` (oder vergleichbares Kriterium — in IMPACT festgelegt).
3. **Idempotent:** Wiederholte Aufrufe auf gleichen event → keine doppelten Rewards, keine doppelten transactions, keine score-Neuberechnung wenn `status='scored'`.
4. **Batch-Resilient:** Error in einem event (z.B. score_event RAISE) blockiert nicht andere events im gleichen Batch — einzelne `BEGIN...EXCEPTION...END` Block pro event.
5. **Existing manuelle Admin-Trigger:** score_event bleibt direkt aufrufbar via Admin-UI (Rollback-Option + Re-Score Flexibilitaet).
6. **INV-28 Body-Scan:** Cron-Job-Presence + wrapper-RPC-Body enthalten erwartete Keys.
7. **tsc clean + db-invariants gruen inkl. INV-28.**

## Edge Cases

1. **Event `ends_at` in Vergangenheit, aber fixtures noch `status='running'` oder `'scheduled'`** → skip (nicht scorbar). Cron-Query muss das filtern.
2. **Event `status='scored'`** → skip (schon durch, idempotent).
3. **Event `status='scoring'`** → skip (andere Instanz verarbeitet gerade — concurrent guard).
4. **Event hat 0 lineups** → vermutlich bereits durch `20260407190000_score_event_no_lineups_handling.sql` behandelt. Verifizieren in IMPACT.
5. **Mehrere events gleichzeitig faellig** → batch, nicht N+1. Fail-Isolation via Per-Event Transaction.
6. **pg_cron extension nicht aktiv** → Migration muss `CREATE EXTENSION IF NOT EXISTS pg_cron` pruefen (falls nicht schon durch Supabase provisioniert).
7. **cron-user privileges** → pg_cron-Jobs laufen standardmaessig als `postgres`. Wrapper-RPC als SECURITY DEFINER — keine zusaetzlichen Grants noetig fuer cron-user, aber Body-Logic pruefen.
8. **Race: Admin manuell score_event bevor Cron laeuft** → idempotent, ok.
9. **Race: 2 parallele Cron-Aufrufe** → pg_cron serialisiert typically; + advisory-lock auf event_id als defense-in-depth empfohlen.
10. **Time-Zone:** `ends_at TIMESTAMPTZ` + `now()` TZ-aware → vergleichbar unabhaengig von cron-worker-TZ.

## Proof-Plan

| Artefakt | Inhalt |
|----------|--------|
| `worklog/proofs/024-cron-before.txt` | `SELECT * FROM cron.job` vor apply (um Job-Inventory zu dokumentieren) |
| `worklog/proofs/024-cron-after.txt` | `SELECT * FROM cron.job WHERE jobname='score-pending-events'` nach apply |
| `worklog/proofs/024-rpc-body.txt` | `get_rpc_source('cron_score_pending_events')` post-apply |
| `worklog/proofs/024-dry-run.txt` | Manueller Aufruf `SELECT public.cron_score_pending_events();` auf Live-DB — zeigt wie viele events verarbeitet wurden |
| `worklog/proofs/024-tsc.txt` | tsc clean |
| `worklog/proofs/024-tests.txt` | db-invariants 26/26 inkl. INV-28 |
| `worklog/proofs/024-score-event-body.txt` | Nur falls score_event geaendert wird — vorher/nachher diff |

## Scope-Out

- **score_event Logic-Aenderungen** — nur Idempotency-Hardening wenn noetig (verifizieren in IMPACT). Keine neuen Scoring-Rules.
- **Fixture-Status-Sync** — laeuft separat via football-api-sync. B5 vertraut darauf dass fixture_status korrekt ist wenn ends_at passt.
- **Admin-UI-Aenderungen** — Admin bleibt manueller Trigger-Pfad fuer Edge-Cases.
- **Error-Alerting** — Cron-Fehler bleiben in pg_cron-Logs (`cron.job_run_details`). Kein Sentry-Hook in diesem Slice.
- **Weitere Cron-Jobs** — z.B. gameweek-cron/liquidation-cron. Separate Slices.
- **cron_process_gameweek Wechselwirkung** — pruefen in IMPACT, aber nicht anpassen (separate Zustaendigkeit).

## Open Items (zu verifizieren in IMPACT)

- **pg_cron active?** `SELECT * FROM pg_extension WHERE extname='pg_cron'`
- **Existing jobs?** `SELECT jobname, schedule FROM cron.job`
- **score_event existiert + body?** → via `get_rpc_source('score_event')`
- **score_event idempotent?** Inspect status-check-branches im Body
- **cron_process_gameweek Rolle?** → via `get_rpc_source('cron_process_gameweek')`
- **Fixture-Status-Werte** (was heisst "alle fixtures done" in der Schema-Realitaet)
- **Event-Status-Werte** (CHECK constraint liste)
- **Cron-Owner-Permissions** (gewoehnlich `postgres`)

## Risiko + Rollback

- **Risiko: Mittel.** Neue Cron-Mechanik auf Live-DB. Kein Client-Blast-Radius, aber falsch gescordete events = Reward-Fehler (reversible via manuelles unscore + re-score).
- **Rollback:** `SELECT cron.unschedule('score-pending-events')` entfernt den job. Wrapper-RPC kann bleiben (keine Seiteneffekte wenn nicht mehr aufgerufen).
- **Deploy-Plan:**
  1. Migration apply → wrapper-RPC + cron.schedule live
  2. Dry-run: `SELECT cron_score_pending_events()` manuell, Output inspizieren
  3. Beobachtung: `SELECT * FROM cron.job_run_details WHERE jobname='score-pending-events' ORDER BY start_time DESC LIMIT 10` — ersten 3-5 Laufe Anil live ueberwachen
  4. Bei Fehler: `cron.unschedule(...)` → status quo

## CEO-Entscheidungen (approved)

- **(c) pg_cron innerhalb Supabase** — Infrastruktur bereits vorhanden (`cron_process_gameweek` Referenz-Muster), kein externer Moving-Part, Idempotenz im SQL-Layer.
- **Schedule:** `*/5 * * * *` (alle 5 Minuten) — CEO-Default aus briefing. Aenderbar wenn Pilot zeigt dass 1/10/15-min besser passt.

## Slice-Start: Ready fuer IMPACT nach CEO-Approval dieser Spec.
