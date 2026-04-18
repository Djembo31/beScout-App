# Active Slice

```
status: active
slice: 071
stage: BUILD
spec: worklog/specs/071-gameweek-sync-optimierung.md
impact: skipped (Schedule + Logik-Verfeinerung, keine Schema/Service-Änderung)
proof: (pending)
started: 2026-04-18
```

## Titel
gameweek-sync Optimierung — 3× täglich + Phase-A-Skip wenn DB-fixtures done

## Files
1. vercel.json — `0 6 * * *` → `0 6,14,22 * * *`
2. src/app/api/cron/gameweek-sync/route.ts — Skip Phase A wenn nur events-scoring offen
