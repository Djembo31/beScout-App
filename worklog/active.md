# Active Slice

```
status: active
slice: 286
stage: PROVE
spec: worklog/specs/286-league-cache-ready-race.md
impact: inline (3 race-Konsumenten + 1 lib + 1 neuer Hook — alle gelistet in Spec)
proof: worklog/proofs/286-cache-race.md (Cold-Load-Verify post-Deploy)
review: worklog/reviews/286-review.md (PASS, 0 CRITICAL)
```

**Slice 286 — Cold-Load-Race im LeagueScopeHeader fixen.** Liga-Filter (CountryBar +
LeagueBar) rendert app-weit LEER bei Hard-Nav/PWA-Cold-Start. Fix: reaktives
Cache-Ready-Signal in `leagues.ts` (Subscription + `useSyncExternalStore`-Hook),
in die 3 race-prone useMemos (LeagueScopeHeader:52, FantasyContent:108,
LeagueBarShared:30) als dep. Anil-Decision: jetzt fixen (potenzieller Beta-Blocker).

## Slice 284 — Core-Domain-Stabilisierung · Waves 1+3+4 ✅ / Wave 2 blockiert

**🚨 BLOCKER für Wave 2 (Anil):** Production-API-Football-Key seit 06.05. suspendiert
(dashboard.api-football.com → Abo/Zahlung). Wave 2 (154 Geister-Triage + Süper-Lig-
Drift-Cleanup) braucht API-Verify gegen echte Spielergebnisse vor dem Löschen.

| Wave | Inhalt | Status |
|------|--------|--------|
| 1 (284a) | Live-Lifecycle P0-Kette | ✅ LIVE |
| 3 (284c) | Markt/Rankings FM-01..05,07 | ✅ LIVE |
| 4 (284d) | Fantasy-UI FANT-05/08/09/13 | ✅ LIVE |
| 2 (284b) | Daten-Heal: 154 Geister + Süper-Lig-Drift + max_gameweeks + parseGameweek-Cap + FANT-10 | ⏸ Key-abhängig |

Punch-List: worklog/audits/2026-06-12/stab-284-punchlist.md
Backlog (Slice 284+): FM-08..11 · FANT-11/12/16 (CEO Vice-Captain) · FM-06 Leaderboard-Scoping · LW-01.

## Zuletzt

- **Slice 284d** (2026-06-13) — Fantasy-UI (M, 2 P1 DB-bewiesen).
- **Slice 284c** (2026-06-13) — Markt/Rankings (M, 2 P1 DB-bewiesen).
- **Slice 284a** (2026-06-12) — Live-Lifecycle (L, API-Key-Fund).

Nächstes: Wave 2 (284b) sobald API-Key live · sonst Sommer-Roadmap.

## TR-Review offen (Anil)
- `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (= „Canlı")
