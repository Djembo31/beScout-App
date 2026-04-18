# Active Slice

```
status: active
slice: 074
stage: BUILD
spec: worklog/specs/074-sync-standings.md
impact: skipped (additive migration, kein Consumer-Impact)
proof: (pending)
started: 2026-04-18
```

## Titel
sync-standings Cron (Manual-Only) + league_standings table

## Files
1. supabase/migrations/20260418140000_slice_074_league_standings.sql — NEW
2. src/app/api/cron/sync-standings/route.ts — NEW (7 API-Calls/Run)
3. src/app/api/admin/trigger-cron/[name]/route.ts — Whitelist +1
4. src/app/(app)/bescout-admin/AdminDataSyncTab.tsx — 7. Card
5. messages/de.json + tr.json — 3 keys
