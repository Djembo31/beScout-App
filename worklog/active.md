# Active Slice

```
status: idle
slice: —
stage: —
spec: —
impact: —
proof: —
started: —
```

## Letzte Slices (heute)
- **072 | 2026-04-18 | sync-transfers Manual-Only** ✅ (dacfe6f4, Deploy 10:50Z, 401/auth live)
- **071 | 2026-04-18 | gameweek-sync Phase-A-Skip** ✅ (Schedule-3x-Rollback wegen Hobby-Plan-Limit)
- **070 | 2026-04-18 | Sync-Injuries-Cron** ✅
- **069 | 2026-04-18 | Cron-Frequenz-Fix + Manual-Trigger-Button + Deploy-Healing** ✅

## Hobby-Plan-Status
- Hobby erlaubt max 2 Cron-Jobs → vermutlich laufen nur `close-expired-bounties` + `gameweek-sync` automatisch
- 4 data-sync-Crons (`sync-players-daily`, `sync-transfermarkt-batch`, `transfermarkt-search-batch`, `sync-injuries`) vermutlich schedule-ignored
- `sync-transfers` (neu) = **explicit manual-only**, kein vercel.json-Entry
- Pre-Launch-Architektur: Admin triggert via **Data Sync Tab** bei Bedarf
- Pro-Upgrade ($20/mo) = auto-schedule für alle 6 Crons + 3×/Tag gameweek-sync

## Pipeline Roadmap (Option B — inkrementell)
- ~~**070** Sync-Injuries~~ ✅
- ~~**071** gameweek-sync Phase-A-Skip~~ ✅ (Schedule 3× pending Pro-Upgrade)
- ~~**072** sync-transfers Manual-Only~~ ✅
- **073** sync-fixtures-future (wöchentliche Saison-Fixtures-Updates, 7 Calls/Run)
- **074** sync-standings (Liga-Tabelle authoritative, 7 Calls/Run)
- **075** Notification on injury-change
