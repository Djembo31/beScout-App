# Active Slice

```
status: build
slice: 033-money-unit-drift-audit
stage: BUILD
spec: worklog/specs/033-money-unit-drift-audit.md
impact: inline (Audit + Fix kombiniert)
proof: worklog/proofs/033-* (in Arbeit)
started: 2026-04-17
paused: 032-phase7-verify-remaining-flows (Mutating Flows blockiert durch P0 Bugs aus Flow 5)
```

## Aktuelle Aufgabe

P0 Money-Display-Drift in BuyConfirmModal fixen + alle weiteren Stellen mit Listing.price-vs-cents-Drift aufdecken.

Reihenfolge: BUG → AUDIT → FIX (alle Sites) → TEST → DEPLOY → VERIFY.

## Pausiert

Slice 032 Phase 7 Part 2 (Read-only 4/4 GREEN, Mutating 0/4 — geblockt durch P0 in Flow 5). Wieder aufnehmen nach 033 + 034 (RPC-type) + 035 (trigger).

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.**
3. **Proof ist Pflicht.**
