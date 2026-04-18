# Active Slice

```
status: active
slice: 069
stage: PROVE
spec: worklog/specs/069-cron-frequenz-fix-manual-trigger.md
impact: skipped (nur neue Files + vercel.json, keine Consumer betroffen)
proof: worklog/proofs/069-vercel-diff.txt (post-deploy: screenshot + curl pending)
started: 2026-04-18
```

## Titel
Cron-Frequenz-Fix + Manual-Trigger-Button fuer Data-Sync

## Frequenz-Matrix (CEO-Decision 2026-04-18)

| Cron | Schedule |
|------|----------|
| sync-players-daily | Montag 03:00 UTC (`0 3 * * 1`) |
| sync-transfermarkt-batch | 1. Jan/Mai/Sep 04:00 UTC (`0 4 1 1,5,9 *`) |
| transfermarkt-search-batch | Taeglich 02:30 UTC (`30 2 * * *`, manuell deaktivieren nach 2 Wochen) |

## Files
1. vercel.json — Cron-Entries
2. src/app/api/admin/trigger-cron/[name]/route.ts — NEU
3. src/app/(app)/bescout-admin/AdminDataSyncTab.tsx — NEU
4. src/app/(app)/bescout-admin/BescoutAdminContent.tsx — Tab-Registration
5. messages/de.json — i18n DE
6. messages/tr.json — i18n TR-Stub (Anil approval vor Commit)
