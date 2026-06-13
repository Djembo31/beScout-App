# Active Slice

```
status: idle
slice: 289 ✅ DONE
stage: LOG complete
spec: worklog/specs/289-home-manager-page-contract.md
impact: skipped — docs/page-contract audit only, no runtime code
proof: worklog/proofs/289-home-manager-page-contract.md (docs-only, no src changes)
review: worklog/reviews/289-review.md (PASS)
```

## Zuletzt

- **Slice 289** (2026-06-13) — S2 Page Contract Audit Home + Manager (Docs-only): Home GREEN mit YELLOW-Vorbehalt; Manager YELLOW; F-1 Portfolio-Floor-Divergenz als höchster Demo-Coherence-Fix.
- **Slice 288** (2026-06-13) — S1 Page Contract Audit /market + /player/[id] (Docs-only): /market GREEN mit YELLOW-Vorbehalt; /player/[id] YELLOW; F-1 GeoGate-Asymmetrie als P1-Folgeentscheidung.
- **Slice 287** (2026-06-13) — Product Truth Freeze / S0 Stabilization (Docs-only): current product truth file, README replacement, historical vision warnings, READY wording clarified.
- **Slice 286** (2026-06-13) — Cold-Load-Race Liga-Filter (M, root-cause via useSyncExternalStore, live 0→9 buttons).
- **Slice 285** (2026-06-13) — FM-06 Liga-Header über PlayerRankings (XS).
- **Slice 284d** (2026-06-13) — Fantasy-UI (M, 2 P1 DB-bewiesen).

**Backlog-Notiz (Slice 286 Reviewer):** `clubs.ts` hat dasselbe non-reaktive Cache-Pattern
wie leagues.ts (pre-Fix). Falls je ein render-time `useMemo(() => getClub(...))` entsteht →
gleiche Cold-Load-Race, gleiches useSyncExternalStore-Fix-Pattern anwendbar.

**🚨 Slice 284 Wave 2 (284b) weiter blockiert:** API-Football-Key seit 06.05. suspendiert.
154 Geister-Triage + Süper-Lig-Drift brauchen API-Verify. Anil-Action: dashboard.api-football.com.

**TR-Review offen (Anil):** `market.bulkSellResult`, `rankings.noMarketMovement`, `fantasy.matchLive` (=„Canlı").

## Stabilization Mode — Product Truth Freeze ✅

Canonical current-product-truth pointer:
- `memory/current-product-truth.md`

Steering audit:
- `worklog/audits/2026-06-12/stabilization-master-audit.md`

Nächstes empfohlen:
- **S2 / Slice 289 ✅ DONE:** Page Contract Audit `/` + `/manager` ist abgeschlossen.
- Höchster Fix-Kandidat: F-1 Portfolio-Floor-Parity Home vs Manager/Market (Home scalar `floor_price`, Manager live-listings `computePlayerFloor`).
- Offene CEO/Anil-Entscheidung: einheitlicher GeoGate-Plan für `/player/[id]` + `/manager` Trading-CTAs.
- Nächster Audit-Schritt nach Fix/Decision: S3 Page Contract Audit `/fantasy` + `/clubs` + `/club/[slug]`.
- Kein breiter Feature-Ausbau vor Demo-Path-Stabilisierung.

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
