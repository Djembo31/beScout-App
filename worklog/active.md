# Active Slice

```
status: idle
slice: 285 ✅ DONE (FM-06)
stage: LOG complete
spec: worklog/specs/285-rankings-league-header-scope.md
impact: skipped (rein lokales Layout — kein Consumer/Service/DB betroffen)
proof: worklog/proofs/285-rankings-header.md (+ desktop/mobile Screenshots)
review: worklog/reviews/285-review.md (self-review, PASS)
```

**🔴 NEU entdeckt (Slice 286 Kandidat — Anil-Entscheidung):** Cold-Load-Race im
`LeagueScopeHeader` — rendert app-weit LEER bei Hard-Navigation/Hard-Refresh/PWA-Cold-Start
(/rankings + /clubs reproduziert). Root: `ClubProvider:167` kein cachesReady-Gating +
`LeagueScopeHeader:52` `useMemo(getCountries, [locale])` recomputet nie nach async-Cache-Load
→ `CountryBar:22` `length<=1 return null`. Liga-Filter unsichtbar = potenzieller Beta-Blocker.
Cross-cutting (/rankings, /clubs, /fantasy, /market). Details: worklog/proofs/285-rankings-header.md.

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
