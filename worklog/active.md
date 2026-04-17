# Active Slice

```
status: build
slice: 034-buy-player-sc-transactions-type-fix
stage: BUILD
spec: worklog/specs/034-buy-player-sc-transactions-type-fix.md
impact: inline (DB-Audit done, 1 RPC + INV-30 Test scope)
proof: worklog/proofs/034-* (in Arbeit)
started: 2026-04-17
```

## Aktuelle Aufgabe

P0 Migration: `buy_player_sc` schreibt `transactions.type='buy'/'sell'` statt
`'trade_buy'/'trade_sell'` → CHECK violation → Buy live tot.

Plus: INV-30 Audit-Helper-RPC + Drift-Test der ALLE 7 weiteren Drift-RPCs
(Slice 037 Followup) automatisch findet.

## Pipeline

| # | Titel | Status |
|---|-------|--------|
| 034 | buy_player_sc transactions.type fix | active |
| 035 | trg trade_refresh auth_uid_mismatch | next |
| 036 | sync_event_statuses permission denied | nach 035 |
| 037 | 7 weitere transactions-type-Drifts | nach 036 (INV-30 zeigt sie auf) |
| 032b | Phase 7 Mutating-Flows fortsetzen | nach 035 |

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.**
3. **Proof ist Pflicht.**
