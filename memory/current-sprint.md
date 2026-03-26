# Current Sprint — Fantasy Spec Abarbeitung

## Stand (2026-03-26, Session 258)
- **Tests:** 2007 (161 Files, 10 pre-existing failures), tsc 0 Errors
- **Migrations:** 309 (4 neue: scoring, save_lineup, lock_event_entry, tier_rank)
- **Commits:** 4 (b31339a, 990613e, 7cbc727, 411ad05)
- **Smoke-Tested:** Join + Leave auf Vercel mit echtem User (test1)

## Erledigt (Session 258)
- 12/12 Fantasy Flows verifiziert (Code-Review + DB Queries)
- 10/10 Original-Bugs geschlossen (5 waren keine, 5 gefixt)
- 3 Live-Bugs durch Smoke Tests gefunden + 2 gefixt
- Chip Service aligned mit DB RPCs (getSeasonChipUsage, deactivateChip)
- Triple Captain 3.0x Scoring live
- Wildcard Spend + Salary Cap + Min Tier server-side enforced

## Offen — Naechste Prioritaet

### Muss (Server-Integrität)
1. ~~**Synergy Surge Chip**~~ — ERLEDIGT: score_event verdoppelt synergy_pct bei Chip (cap 30%)
2. **Second Chance Chip** — score_event: worst→best swap (braucht Bench-Konzept, komplexer)
3. ~~**Wildcard Refund bei Leave**~~ — WAR BEREITS IMPLEMENTIERT: Step 5.5 in rpc_unlock_event_entry

### Soll (UX)
4. **Alte GW-Ergebnis Modals** — scored Events aus frueheren Gameweeks poppen bei Navigation auf
5. **Fixture Deadline Polling** — kein 60s Interval, nur bei GW-Wechsel refresh

### Kann (Feature-Completeness)
6. **Save nach Partial Lock** — RPC akzeptiert alle Slots, muesste locked ignorieren
7. **Season-Filter fuer Leagues** — Leaderboard aggregiert aktuell ALLE Events
8. **Club-Scoped Event Server-Check** — Player Picker filtert client-side, RPC prueft nicht

## Blocker
- Keine — Fantasy ist funktional fuer Pilot
