# Slice 032b — Phase 7 Mutating-Flows Resume (Sell + P2P + Event-Join)

**Groesse:** M · **CEO-Scope:** nein (Test/Audit) · **Typ:** E2E Verify-Slice

## Ziel

Restliche Mutating-Flows aus Slice 032 verifizieren, jetzt da Buy (5) durch
Slice 033 (Display) + 034 (RPC-Type) + 038 (Tickets) live durchgeht. Confirms
dass ALLE Money-Pfade auf bescout.net clean sind, kein User-Vertrauensbruch.

## Flow-Liste

| # | Flow | Aktion | RPC |
|---|------|--------|-----|
| 5 | Buy from Market | DONE in Slice 034 | buy_player_sc |
| 6 | Place Sell Order | Listing eines Holdings + Cancel | place_sell_order, cancel_order |
| 7 | Buy Order/Cancel | Limit-Buy 1 SC unter Floor + Cancel | place_buy_order, cancel_order |
| 10 | Event Join | Falls offenes Event: join + leave | rpc_lock_event_entry, rpc_unlock_event_entry |

## Test-Strategie

- **Pre-State Snapshot** vor jedem Flow (Wallet, Holdings, Locked, Tickets)
- **Mutating Action** mit minimaler Geld-Bewegung (1 SC Quantity)
- **Post-State Verify** matched UI-Versprechen exakt
- **Cancel/Refund** wo moeglich, damit kein bleibender DB-Drift
- **Console-Errors monitor** durchgaengig

## Acceptance Criteria

1. Flow 6: Sell-Order erscheint in `orders` mit `status='open'`, Cancel restored holdings
2. Flow 7: Buy-Order locked Wallet-Amount, Cancel released exact gleich
3. Flow 10: Event-Entry created, Unlock refunded ticket/cr exakt — ODER documented SKIPPED falls kein offenes Event
4. Keine 22P02 / 400 / unexpected console-errors
5. Verdict-Tabelle: GREEN/YELLOW/RED + Notes pro Flow

## Proof-Plan

- `worklog/proofs/032b-flow-06-sell-{modal,db}.{png,txt}`
- `worklog/proofs/032b-flow-07-buyorder-{modal,db}.{png,txt}`
- `worklog/proofs/032b-flow-10-event-{modal,db}.{png,txt}` (or SKIPPED)
- `worklog/proofs/032b-verdict.md` — Final tabelle + Slice 032 Phase-7-Closure

## Scope-Out

- 035-039 Folge-Slices
- Flow 5 (Buy) — bereits verifiziert in Slice 034
- Mobile-Viewport — Desktop reicht fuer Logic
- 16. Notification deeplinks — separater Flow

## Risiken

- Flow 10 evtl. SKIPPED weil keine offenen Events — dokumentieren als YELLOW, nicht RED
- Sell-Cancel + Buy-Order-Cancel sollten clean Refund machen — falls nicht: ROLLBACK-Doku
