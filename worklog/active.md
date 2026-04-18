# Active Slice

```
status: active
slice: 070
stage: BUILD
spec: worklog/specs/070-sync-injuries-cron.md
impact: skipped (additive migration + neuer endpoint, keine consumer)
proof: (pending)
started: 2026-04-18
```

## Titel
Sync-Injuries-Cron (kritischste Lücke für Fantasy-UX)

## Files
1. supabase/migrations/YYYY_slice_070_player_injuries.sql — NEW
2. src/app/api/cron/sync-injuries/route.ts — NEW
3. vercel.json — Cron-Entry
4. src/app/(app)/bescout-admin/AdminDataSyncTab.tsx — 4. Card
5. messages/de.json + tr.json — 3 keys
