# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
```

## Zuletzt: Slice 138 (2026-04-22) — ClubProvider Follow-Race-Mutex (XS)

Flaky Follow-UI gefixt: Mutex per clubId + stable callback (Refs statt State-Deps) + conditional Reconcile (nur wenn letzter In-flight-Toggle).

Proof: `worklog/proofs/138-race-mutex.txt` (9 Tests grün, 2 neu: silent-discard + parallel-no-overwrite).
