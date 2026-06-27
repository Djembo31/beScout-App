# Active Slice

```
status: idle
slice: 421
title: Welle 2.4 — Per-Liga GW-Max in SpieltagSelector durchrouten + toten GameweekSelector löschen — DONE
size: S
stage: LOG (DONE)
spec: worklog/specs/421-gw-max-routing-orphan-delete.md
impact: skipped (reines UI-Prop-Routing entlang existierender useLeagueMaxGameweeks-Quelle; kein DB/Service-Change)
review: worklog/reviews/421-review.md (PASS, 1 NIT akzeptiert, 1 INFO=Scope-Out-Smells)
proof: worklog/proofs/421-gw-max.txt (+ 421-bundesliga-gw34-next-disabled.png)
proof-summary: Live bescout.net — Bundesliga GW34 → Next [disabled] (Per-Liga-34-Cap, vor Fix wäre 35-38 klickbar) + TFF1 GW38 Next [disabled] (38-Liga unverändert); tsc 0 + 87 Tests; grep GameweekSelector=0. Reviewer PASS. Commit 95e7edc6.
```

## Ergebnis (DONE)
- **Fix A:** FantasyContent mountet `useLeagueMaxGameweeks(leagueScopeId)` → `maxGameweek={data ?? 38}` über FantasyNav (neue required Prop) an SpieltagSelector. Fallback 38 fail-safe (null/loading/DB-NULL/Error).
- **Fix B:** GameweekSelector-Orphan + Barrel-Zeile + Test gelöscht (0 Refs).
- **FAKTEN-KORREKTUR (D87):** betroffen = Bundesliga + 2. Bundesliga (max=34, je 4 Geister-GWs), NICHT TFF 1. Lig (=38). Handoff/Test-Fixtures waren stale.

## Gemeldete Design-Smells (Scope-Out → Folge-Slices)
- **(Admin-38-Hardcodes)** `getFullGameweekStatus` (scoring.queries.ts:415) loopt `1..38` global über ALLE Ligen + `useClubEventsData` `getGameweekStatuses(1,38)` → eigener Admin-Slice (cross-league-Aggregation, braucht leagueId-Param).
- **(Display)** `FantasyPlayerRow:72` Gegner-Logo via `opponentShort` = S276-Display-Variante (BAY-Kollision) → eigener Slice, `opponentClubId` liegt seit 420 bereit.

Nächstes (CTO-Empf.): Admin-38-Hardcodes ODER FantasyPlayerRow-Logo ODER Ranking-Konsolidierung scout_scores↔user_stats ODER Welle 3 (Events/Aufstellung).
