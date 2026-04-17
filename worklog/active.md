# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
started: —
```

## Aktuelle Aufgabe

Keine aktive Arbeit.

## Pipeline (priorisiert)

| # | Titel | Typ | Status |
|---|-------|-----|--------|
| 035 | trg trade_refresh auth_uid_mismatch | P1 (downgraded — Slice 034 zeigte trigger laesst Buy durch) | next |
| 036 | sync_event_statuses permission denied | P1 Grant-Fix | nach 035 |
| 037 | 7 weitere transactions.type Drifts (INV-30 Allowlist) | P2 Cleanup | nach 036 |
| 038 | credit_tickets reference_id UUID-Bug (Achievement-Tickets) | P1 (neu entdeckt durch Slice 034) | parallel zu 037 |
| 032b | Phase 7 Mutating-Flows (5/6/7/10) fortsetzen | E2E-Verify | nach 035 |

## Verfuegbar fuer Resume

Slice 032 Phase 7 Part 2 — Mutating Flows koennen jetzt durchgefuehrt werden:
- Flow 5 Buy ✓ (gerade in Slice 034 verifiziert)
- Flow 6 Sell Order — `place_sell_order`-Path
- Flow 7 Buy Order/Cancel — P2P Escrow
- Flow 10 Event Join — `lock_event_entry`

Starte mit: `/ship new "035 trg trade_refresh trigger fix"` ODER `/ship new "032b Phase 7 Mutating Flows resume"`.

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.**
3. **Proof ist Pflicht.**
