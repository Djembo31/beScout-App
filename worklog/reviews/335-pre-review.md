# Slice 335 — Pre-Review-Memo (Self-Audit)

## ACs Self-Audit (DB live in BEGIN;…ROLLBACK; bewiesen)
- AC-01 CHECK +'cancelled': ✅ pg_get_constraintdef enthält 'cancelled'.
- AC-02 cancel_event SECURITY DEFINER, anon=false/auth=true: ✅.
- AC-03 happy: ✅ Money-Smoke — cancel_result {success,refunded_count:1}, status='cancelled', escrowed=false, entries=0, **treasury_refund_delta=50000 (=prize)**, **ticket_refund_delta=100 (=Einsatz)**.
- AC-04 not_cancellable (running): ✅ {success:false,error:'not_cancellable'}.
- AC-05 not_authorized (Fremder): ✅ {success:false,error:'not_authorized'}, Status unverändert.
- AC-06 voller Prize-Refund bei cancelled: ✅ (treasury_refund_delta=full prize).
- AC-07 free Event: deckt Money-Smoke implizit (refund=0 wenn ticket=0); nicht separat gefahren.
- AC-08 UI Confirm: tsc clean; Live gated (QA-Konto kein Club-Admin) → Service-Test deckt ab.
- AC-09 i18n: ✅ node-Check 5 Keys de+tr OK.
- AC-10 Type +'cancelled': ✅ tsc clean.

## Latenter Bug GEFUNDEN + gefixt (Money)
`rpc_cancel_event_entries` schreibt `ticket_transactions.source='event_entry_refund'`, aber `ticket_transactions_source_check` kannte den Wert nicht → 23514. JEDE Ticket-Entry-Erstattung wäre gescheitert (latent: RPC nie verdrahtet). Fix: CHECK additiv +'event_entry_refund' (Migration §1b). `transactions_type_check` kennt 'event_entry_unlock' bereits ($SCOUT-Pfad) → ok. Money-Smoke erst NACH Fix grün. → Lehre gehört in errors-db.md (CHECK-Drift-Familie Slice 330/332).

## Self-Verification gelaufen
- tsc exit 0 · vitest 111 (events) + 4 (cancelEvent) green.
- DB: CHECK/RPC/Grants live verifiziert + 2 Money-Smokes (happy + 2 negativ) in Rollback.

## Reviewer-Fokus / Risiken
1. **Trigger-Body-Erhalt (Slice 156):** trg_events_prize_settle 'ended'-Logik byte-identisch zu 331-Live übernommen + cancelled-Zweig additiv. Bitte gegenprüfen, dass 'ended' nicht degradiert.
2. **Atomarität/Race:** cancel_event SELECT … FOR UPDATE vor refund+status; rpc_cancel_event_entries intern (kein eigener Auth-Check) — cancel_event ist der Auth-Gate. Reuse korrekt (NICHT der platform-admin-Wrapper cancel_event_entries).
3. **Reihenfolge:** refund (rpc_cancel_event_entries setzt current_entries=0, separate UPDATE) feuert NICHT den status-Trigger; danach status='cancelled' feuert Settle → Prize-Refund. Korrekt.
4. **Auth-Pattern:** club_admins OR platform_admins (wie get_club_balance). Club-Admin kann jetzt absagen (vorher cancel_event_entries war platform-only).
5. **AR-44:** REVOKE/GRANT auf cancel_event(uuid).
6. **Compliance:** Confirm-Wording admin-facing ("Preis-Pool", neutral); kein Fan-facing Gambling-Term.

## Scope-Drift
- Keine. ticket_transactions-CHECK-Fix ist Pflicht-Teil des geld-sicheren Cancel (sonst Ticket-Refund broken), nicht Scope-Creep.
