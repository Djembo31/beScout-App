# Active Slice

```
status: build
slice: 036-sync-event-statuses-grant-fix
stage: BUILD
spec: worklog/specs/036-sync-event-statuses-grant-fix.md
impact: inline (1 RPC + 1 cron + 1 API-route + 1 internal helper)
proof: worklog/proofs/036-* (in Arbeit)
started: 2026-04-17
```

## Aktuelle Aufgabe

P1 Fix: API-Route ruft sync_event_statuses mit anon-key → 42501. Internal-Helper +
pg_cron statt API-route-call.

## Pipeline (nach 036)

| # | Titel | Status |
|---|-------|--------|
| 037 | 7 transactions.type Drifts | next |
| 039 | user_achievements 409 | parallel |
| 041-043 | 3 P2 UI/Doku-Findings | nach 037 |
| 040 | ClubProvider flake | low |

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.**
3. **Proof ist Pflicht.**
