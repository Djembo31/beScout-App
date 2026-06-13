# Active Slice

```
status: idle
slice: 286 ✅ DONE
stage: LOG complete
spec: worklog/specs/286-league-cache-ready-race.md
impact: inline
proof: worklog/proofs/286-cache-race.md (Cold-Load 0→9 auf 3 Pages, live verifiziert)
review: worklog/reviews/286-review.md (PASS, 0 CRITICAL)
```

## Zuletzt

- **Slice 286** (2026-06-13) — Cold-Load-Race Liga-Filter (M, root-cause via useSyncExternalStore, live 0→9 buttons).
- **Slice 285** (2026-06-13) — FM-06 Liga-Header über PlayerRankings (XS).
- **Slice 284d** (2026-06-13) — Fantasy-UI (M, 2 P1 DB-bewiesen).

**Backlog-Notiz (Slice 286 Reviewer):** `clubs.ts` hat dasselbe non-reaktive Cache-Pattern
wie leagues.ts (pre-Fix). Falls je ein render-time `useMemo(() => getClub(...))` entsteht →
gleiche Cold-Load-Race, gleiches useSyncExternalStore-Fix-Pattern anwendbar.

**🚨 Slice 284 Wave 2 (284b) weiter blockiert:** API-Football-Key seit 06.05. suspendiert.
154 Geister-Triage + Süper-Lig-Drift brauchen API-Verify. Anil-Action: dashboard.api-football.com.

**TR-Review offen (Anil):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").

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
