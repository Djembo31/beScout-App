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

## Heute abgeschlossen (2026-04-18)
- **074 | sync-standings** ✅ (eb0e6521, Deploy 11:XX Z)
- **073 | sync-fixtures-future** ✅ (9d0b0a58)
- **072 | sync-transfers** ✅ (dacfe6f4)
- **071 | gameweek-sync Phase-A-Skip** ✅ (7a097ea2 + dca2c359 rollback)
- **070 | Sync-Injuries** ✅ (dbf98f4e)
- **069 | Cron-Frequenz + Manual-Trigger + Deploy-Healing** ✅ (3 commits)

**= 6 Slices, 7 Cron-Endpoints, 3 neue Tabellen, Deploy-Pipeline geheilt**

## Hobby-Plan-Status
- 2 Auto-Cron-Slots genutzt: `close-expired-bounties` + `gameweek-sync`
- 5 Manual-Only Crons: sync-players-daily, sync-transfermarkt-batch, transfermarkt-search-batch, sync-injuries, sync-transfers, sync-fixtures-future, sync-standings
- 7 Crons in vercel.json deployed — aber Hobby plant vermutlich nur 2 aktiv
- Pre-Launch-Architektur: Admin triggert manuell via AdminDataSyncTab (7 Cards jetzt)

## Pipeline Roadmap — erledigt Option B Kern
- ~~**070** Sync-Injuries~~ ✅
- ~~**071** gameweek-sync Phase-A-Skip~~ ✅
- ~~**072** sync-transfers~~ ✅
- ~~**073** sync-fixtures-future~~ ✅
- ~~**074** sync-standings~~ ✅
- **075** Notification on injury-change (opt, later)
- **Open:** UI-Slices für neue Tabellen (player_transfers, league_standings) — separate Frontend-Sessions
