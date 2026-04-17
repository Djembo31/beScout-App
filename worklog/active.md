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

## Pipeline (priorisiert, NICHT VERGESSEN)

| # | Titel | Typ | Status |
|---|-------|-----|--------|
| 032b | Phase 7 Mutating-Flows resume (6 Sell, 7 P2P-Cancel, 10 Event-Join) | E2E-Verify | next — Buy schon GREEN durch 034 |
| 035 | trg trade_refresh auth_uid_mismatch | P1 (downgraded — Slice 034/038 zeigten Buys gehen durch) | nach 032b |
| 036 | sync_event_statuses permission denied | P1 Grant-Fix (wiederholt in postgres-Logs) | nach 035 |
| 037 | 7 weitere transactions.type Drifts (INV-30 Allowlist) | P2 Cleanup | nach 036 |
| 039 | user_achievements 409-UNIQUE Violations (Achievement-Hook Upsert) | P2 (entdeckt in Slice 038 Live-Verify) | nach 037 |
| 040 | ClubProvider.test.tsx flaky waitFor | P3 (CI-Stability) | low-prio |

## Verfuegbar fuer Resume

Nahtloser Uebergang zu Slice 032b — Mutating Flows fortsetzen, nachdem
Slice 033/034/038 alle Money-UI/RPC-Pfade geheilt haben.

Starte mit: `/ship new "032b Phase 7 Mutating Flows resume"`.

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.**
3. **Proof ist Pflicht.**
