# Active Slice

```
status: active
slice: 072
stage: BUILD
spec: worklog/specs/072-sync-transfers.md
impact: skipped (additive migration + neuer endpoint, manual-only kein vercel.json)
proof: (pending)
started: 2026-04-18
```

## Titel
sync-transfers Cron (Manual-Only, Hobby-Plan-compatible)

## Files
1. supabase/migrations/YYYYMMDDHHMMSS_slice_072_player_transfers.sql — NEW table + RLS
2. src/app/api/cron/sync-transfers/route.ts — NEW (manual-only)
3. src/app/api/admin/trigger-cron/[name]/route.ts — Whitelist erweitert
4. src/app/(app)/bescout-admin/AdminDataSyncTab.tsx — 5. Card
5. messages/de.json + tr.json — 4 keys
