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

## Session 2026-04-19 Spät — Slice 078 DONE

- **078** TM Parser Fix (Markup-Change seit 2026-04) + Loader Pagination-Fix
  - `parseMarketValue` matcht neues TM-Markup `data-header__market-value-wrapper`
  - Loader full-scan path nutzt `.range()`-Pagination statt single `.limit(1000)`
  - Regression-Tests: 10/10 passed, 5/5 offline-Verify mit echten HTMLs
  - Rerun: 267 MV-Updates in 24 min, 0 errored
  - **STAMM+ROTATION MV-Lücken: 433 → 234 (-46%)**
  - Serie A +17pp (69→86%), La Liga +12pp (72→84%), Premier +7pp

## Verbleibende Gold-Lücken (nur Stamm+Rotation)
| Liga | MV fehlt | Contract fehlt |
|---|---|---|
| 2. BuLi | 13 | 11 |
| Bundesliga | 13 | 13 |
| La Liga | 41 | 38 |
| Premier | 37 | 41 |
| Serie A | 53 | 54 |
| Süper Lig | 24 | 10 |
| TFF 1. Lig | 53 | 51 |
| **TOTAL** | **234** | **218** |

Rest via CSV-Import (Slice 076) — Admin-UI export→fill→import. Oder akzeptieren als "TM-real-0" Youngsters.

## Session 2026-04-19 Früh — Slice 077 + 077b DONE

- **077** TM Local Scraper (Cloudflare-Workaround) — TFF +127 mappings, +56 contracts
- **077b** All-Leagues Sweep — ~2873 mappings + 359 contracts total (6 weitere Ligen)

## Session 2026-04-18 — 8 Slices abgeschlossen

- 069 Cron-Frequenz-Fix + Manual-Trigger-Button + Deploy-Healing ✅
- 070 Sync-Injuries (players.status CHECK) ✅
- 071 gameweek-sync Phase-A-Skip (3×-Schedule-Rollback) ✅
- 072 sync-transfers Manual-Only + player_transfers table ✅
- 073 sync-fixtures-future Manual-Only ✅
- 074 sync-standings Manual-Only + league_standings table ✅
- 075 Cron Performance-Refactor (60s→28s + 300s→52s) ✅
- 076 Manual CSV-Import (Transfermarkt-Block-Workaround) ✅

## Common-Errors dokumentiert
- **NEU 078:** TM HTML-Markup kann sich aendern — Scraper-Regex gegen echte HTML-Fixtures testen (Regression-Guard)
- **NEU 078:** PostgREST `.limit(1000)` ohne `.range()` cappt silent auf Full-Scans — Pagination Pflicht
- Next.js Route-Handler Named-Exports brechen Build (Slice 069)
- ESLint disable-comment mit undefined rule (Slice 069)
- Postgres ON CONFLICT CHECK validiert INSERT-Tuple-Defaults (Slice 075)
- Vercel Hobby Cron-Limit (Slice 071 + 075)
- Transfermarkt Cloudflare-Block auf Vercel-IPs (Slice 075)
