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

## Session 2026-04-19 — Slice 077 DONE

- **077** TM Local Scraper (Cloudflare-Workaround) — TFF +127 mappings, +56 contracts

## Session 2026-04-18 — 8 Slices abgeschlossen

- **069** Cron-Frequenz-Fix + Manual-Trigger-Button + Deploy-Healing ✅
- **070** Sync-Injuries (players.status CHECK) ✅
- **071** gameweek-sync Phase-A-Skip (3×-Schedule-Rollback) ✅
- **072** sync-transfers Manual-Only + player_transfers table ✅
- **073** sync-fixtures-future Manual-Only ✅
- **074** sync-standings Manual-Only + league_standings table ✅
- **075** Cron Performance-Refactor (60s→28s + 300s→52s) ✅
- **076** Manual CSV-Import (Transfermarkt-Block-Workaround) ✅

## Admin Data-Sync Panel: 8 Tabs total
- Data Sync: 7 Cron-Cards (injuries, players, market, search, transfers, fixtures, standings)
- **CSV Import** (neu) — Export/Import Market-Value + Contract-End

## Offene Entscheidungen
- Pro-Upgrade Vercel ($20/mo) für Auto-Schedule aller Crons
- **CSV-Import-Workflow testen** mit echten Daten (Export → Excel-Fill → Import)
- TFF 1. Lig Gold-Progression nach erstem CSV-Import messen

## Pipeline Roadmap
- ~~076 Manual CSV-Import~~ ✅
- **077** (optional) Transfermarkt Proxy-Integration via Bright Data/Smartproxy
- **078** (optional) Notification on injury-change (Slice 070 follow-up)
- **079** (optional) UI "Letzte Transfers" Player-Detail-Page
- **080** (optional) UI "Liga-Tabelle" Club-Page

## Common-Errors dokumentiert heute
- Next.js Route-Handler Named-Exports brechen Build (Slice 069)
- ESLint disable-comment mit undefined rule (Slice 069)
- Postgres ON CONFLICT CHECK validiert INSERT-Tuple-Defaults (Slice 075)
- Vercel Hobby Cron-Limit (Slice 071 + 075)
- Transfermarkt Cloudflare-Block auf Vercel-IPs (Slice 075)
