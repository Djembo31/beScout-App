# Active Slice

```
status: active
slice: 075
stage: BUILD
spec: worklog/specs/075-cron-performance-refactor.md
impact: skipped (nur Refactor, keine Schema/Contract-Änderung)
proof: (pending)
started: 2026-04-18
```

## Titel
Cron Performance-Refactor (Batch-Ops statt Per-Row)

## Files (3)
1. src/app/api/cron/sync-players-daily/route.ts — Batch-refactor
2. src/app/api/cron/sync-injuries/route.ts — Batch-refactor
3. src/app/api/cron/transfermarkt-search-batch/route.ts — Scoring-Debug+Fix

## Target Perf
- sync-players-daily: <60s (IST: >300s)
- sync-injuries: <30s (IST: >60s)
- search-batch: >5/20 found (IST: 0/20)
