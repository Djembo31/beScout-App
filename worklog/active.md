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

## Pipeline (priorisiert nach Slice 032 Flow-5 Findings)

| # | Titel | Typ | Status |
|---|-------|-----|--------|
| 034 | buy_player_sc transactions.type 'buy'→'trade_buy' | P0 Migration + Audit | next |
| 035 | trg trade_refresh auth_uid_mismatch (Trigger-Body-Fix) | P0 Trigger-Analyse | nach 034 |
| 036 | sync_event_statuses permission denied | P1 Grant-Fix | nach 035 |
| 032b | Phase 7 Mutating-Flows (5/6/7/10) fortsetzen | E2E-Verify | nach 034+035 |

Starte mit: `/ship new "034 buy_player_sc transactions.type fix"`.

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.**
3. **Proof ist Pflicht.**
