# Slice 335 — Proof (Event-Absage geld-sicher)

## DB / Schema (live, skzjfhvgccaeplydsunz)

### AC-01/02 — CHECK + RPC
```
events_status_check = CHECK (status = ANY ('upcoming','registering','late-reg','running','scoring','ended','cancelled'))
cancel_event(p_event_id uuid): SECURITY DEFINER, anon=false, authenticated=true
ticket_transactions_source_check += 'event_entry_refund'  (latenter Bug-Fix, s.u.)
```

### AC-03/06 — Happy Money-Smoke (BEGIN;…ROLLBACK;, nach Reviewer-#1-Heal)
```
Setup: club-Event prize_pool=50000 (escrow debit), 1 Ticket-Entry amount_locked=100, cancel_event als Club-Admin.
Ergebnis:
  cancel_result        = {success:true, refunded_count:1}
  status_after         = cancelled
  escrowed_after       = false
  entries_after        = 0
  treasury_refund_delta = 50000   (= voller prize_pool zurück in Treasury)
  ticket_refund_delta   = 100     (= voller Einsatz zurück an Teilnehmer)
ROLLBACK → keine Spur.
```
Round-Trip: escrow-Debit bei Create == Refund-Credit bei Cancel → Treasury netto 0. ✓

### AC-04/05 — Negativ-Smokes (Rollback)
```
running-Event cancel  → {success:false, error:'not_cancellable'}   (kein Geld bewegt)
Fremder (non-admin)   → {success:false, error:'not_authorized'}, Status unverändert 'registering'
```

## Latenter Money-Bug GEFUNDEN + gefixt (Knowledge-Flywheel)
`rpc_cancel_event_entries` schreibt `ticket_transactions.source='event_entry_refund'`, aber `ticket_transactions_source_check` kannte den Wert nie → Ticket-Refund wäre mit 23514 gescheitert (latent: RPC nie verdrahtet). Erster Money-Smoke failte daran → CHECK additiv ergänzt → Smoke grün. Lehre → errors-db.md (CHECK-Drift-Familie Slice 330/332/335).

## Service / Unit
```
vitest events-cancel.test.ts → 5 passed (happy + not_cancellable + not_authorized + transport + !data-Guard)
vitest events (useAdminEventsData + events-v2 + event-entries) → 111 passed
tsc --noEmit → exit 0
```

## Reviewer
worklog/reviews/335-review.md → CONCERNS → geheilt (#1 fail-closed-Guard, #3 !data-Guard; #2 benigner No-Op dokumentiert).

## Benigner No-Op (Reviewer #2, dokumentiert)
`rpc_cancel_event_entries` DELETE holding_locks + danach AFTER-UPDATE-Trigger `trg_fn_event_status_unlock_holdings` (status-Change) löscht erneut → 2. DELETE trifft 0 Rows, kein Money/Escrow-Impact.

## OFFEN (post-Deploy)
Live-Playwright UI-Pfad (ConfirmDialog + Absage) — QA-Konto „Jarvis" ist kein Club-Admin → UI-Modal gated; abgedeckt durch DB-Money-Smoke + Service-Test + tsc. Optional via Platform-Admin-Konto später.

### Re-Versuch 2026-06-18 (Live-Verifikations-Pass) — weiterhin GATED
DB-verifiziert: `jarvisqa` ist platform_admin=0, club_admin_count=0, active_subs=0. Navigation zu `/club/1-fc-koln/admin` → Redirect auf `/club/1-fc-koln` (kein Admin-Zugang). `cancel_event`-RPC erlaubt nur Club-Admin/Platform-Admin → mit jarvis-qa **nicht** live durchführbar. Money-Path bleibt voll DB-bewiesen (Round-Trip-Smoke oben). **Blocker:** braucht Club-Admin- oder Platform-Admin-Test-Konto. Nächste Session nicht erneut mit jarvis-qa versuchen.
