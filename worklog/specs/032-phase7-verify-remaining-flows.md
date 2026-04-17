# Slice 032 — Phase 7 Verify Part 2: Restliche 8 Flows

**Groesse:** L · **CEO-Scope:** nein (Test/Audit) · **Typ:** E2E Verify-Slice

## Ziel

Restliche 8 Flows aus `next-session-briefing-2026-04-18.md` verifizieren (Flows 3, 5, 6, 7, 9, 10, 12, 13). Slice 030 hat 7 Flows bereits gruen. Ziel: vollstaendiges Bild Pilot-Bereitschaft auf bescout.net.

## Test-Matrix (Playwright MCP gegen bescout.net, jarvis-qa)

### Read-only (geringe Risiko, zuerst)
1. **Flow 3 Wallet Load** — Wallet-Context laedt, kein Stale, Retry-Logik bei kurzem Offline
2. **Flow 9 Event Browse** — `/fantasy` rendert Events, Filter (Status/Liga) funktionieren
3. **Flow 12 Event Result/Reward UI** — `/fantasy/results` oder Notif zeigt erzielte Punkte/Rewards nach Cron-Score
4. **Flow 13 Notifications** — Dropdown laedt, Deeplinks funktionieren, markAsRead schreibt zurueck

### Mutating (Smoke-Tests, kleinste Amounts)
5. **Flow 5 Buy from Market** — BuyModal mit kleinstem verfuegbaren Listing kaufen → Holdings-Increment, Wallet-Decrement, Toast
6. **Flow 6 Place Sell Order** — eines der gerade gekauften Cards listen → Order-Insert, Holding-Lock, anschliessend Cancel
7. **Flow 7 Buy Order / Cancel Order** — limit Buy-Order platzieren (1 SC unter Floor) → Cancel sofort, Wallet-Refund
8. **Flow 10 Event Join** — falls Event mit niedrigem Entry verfuegbar: lock_event_entry → Entry-Row, Ticket-/CR-Lock, Optimistic Update

## Acceptance Criteria

1. Jeder Flow: Screenshot + Console-Errors-Log
2. Mutationen: vorher/nachher-Wallet/Holdings dokumentiert
3. Browser-Console: keine roten Errors (Warnings ok)
4. Bei Bug → eintragen in `worklog/proofs/032-findings.md` + Folge-Slice empfehlen
5. Verdict-File: GREEN/YELLOW/RED pro Flow

## Proof-Plan

- `worklog/proofs/032-flow-NN-*.png` — Screenshots pro Flow
- `worklog/proofs/032-console.txt` — Aggregierter Console-Log
- `worklog/proofs/032-mutations.txt` — Vorher/Nachher Wallet+Holdings
- `worklog/proofs/032-verdict.md` — Final Tabelle GREEN/YELLOW/RED + Notes

## Scope-Out

- Mobile-Viewport (393px) — Desktop reicht fuer Logic-Verify
- Load-Tests / Performance — out of scope
- Restliche CTO-Residuen (B-02 broader audit, Club-Admin scoping, footballData dead-code) — separate Slices
- Event Join falls kein passender Event live → SKIPPED dokumentieren, kein Bug

## Risiken / Notfall-Plan

- Buy/Sell verbraucht reale CR. Plan: 1 SC kaufen + sofort sell-listen + cancel → minimaler Schaden falls cancel scheitert.
- Buy-Order: limit 1 SC unter aktuellem Floor → wird nicht sofort gefilled → safe to cancel.
- Bei Mutations-Flow Fehler: `worklog/proofs/032-rollback.txt` mit DB-State.
