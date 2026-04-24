# Active Slice

```
status: in-progress
slice: 187
stage: PROVE
spec: inline (DB-Invariant-Cleanup, 5 pre-existing failures)
impact: skipped (DB-State-Cleanup, keine Code-Änderungen, Verify via RED→GREEN CI-Tests)
proof: worklog/proofs/187-db-invariant-cleanup.md
review: self-review (data-cleanup, verifiziert via 44/44 Tests grün)
```

## Ziel

5 pre-existing DB-Invariant/State-Machine Failures cleanen (keine Code-Änderung, nur DB-State via Supabase MCP).

## Violations gefixt

- INV-35 Club-Logo Single-Source (1 → 0)
- INV-38 Orphan-Stale-Contracts (37 → 0)
- INV-39 Cross-Club-Contamination Ghost-Rows (5 → 0)
- INV-40 Same-Club Player-Duplicates (9 → 0)
- SM-ORD-04 Expired-but-Open Orders (158 → 0)

## Zuletzt

- **Slice 181f+h** (2026-04-24) — EventDetailModal + Modal/ConfirmDialog Cleanup (L, PASS).
- **Slice 181e2** (2026-04-24) — Modal→Dialog Player-Detail Trading (4 Files, smoke PASS).
- **Slice 181e1** (2026-04-24) — Modal→Dialog Marktplatz/Orderbook (4 Files, smoke PASS).
