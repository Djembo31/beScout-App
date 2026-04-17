# Active Slice

```
status: build
slice: 038-credit-tickets-uuid-fix
stage: BUILD
spec: worklog/specs/038-credit-tickets-uuid-fix.md
impact: inline (1 caller-site fix + JSDoc-hardening + 1 test)
proof: worklog/proofs/038-* (in Arbeit)
started: 2026-04-17
```

## Aktuelle Aufgabe

P1 Fix: Achievement-Hook ruft credit_tickets mit Achievement-Key (string) als
p_reference_id (UUID-Spalte) → 22P02 invalid input syntax → Tickets nie gutgeschrieben.

## Pipeline (NICHT VERGESSEN)

| # | Titel | Status |
|---|-------|--------|
| 038 | credit_tickets reference_id UUID-Bug | active |
| 032b | Phase 7 Mutating-Flows (5 done, 6/7/10 offen) | nach 038 |
| 035 | trg trade_refresh auth_uid_mismatch (downgraded P1) | nach 032b |
| 036 | sync_event_statuses permission denied | nach 035 |
| 037 | 7 weitere transactions.type Drifts (INV-30 Allowlist) | Cleanup, P2 |

## Regeln

1. **Nur EIN aktiver Slice gleichzeitig.**
2. **Keine Stage-Skips.**
3. **Proof ist Pflicht.**
