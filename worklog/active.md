# Active Slice

```
status: active
slice: 293
stage: PROVE complete
spec: worklog/specs/293-fantasy-lifecycle-e2e.md
impact: skipped (E2E-Test only — kein Service/RPC/Schema/Query-Key-Touch)
proof: worklog/proofs/293-fantasy-lifecycle-e2e.txt (Prod-Run grün 7.4s, 8 ACs, tsc clean)
review: worklog/reviews/293-review.md (PASS — 2 MINOR inline-fixed)
```

## Slice 293 — Deterministic Fantasy Lifecycle E2E

Ziel: konditionalen Render-Smoke (`fantasy.spec.ts`) durch deterministisches Contract-E2E ersetzen
(Auth+Geo erreichbar, FantasyDisclaimer, 4-Tab-Walk, Daten-Pfad verkabelt, keine Page-Exceptions,
kein i18n-Leak, Mobile). Own-Login (jarvis-qa) gegen bescout.net. Schließt den 5×-wiederholten
demo-green E2E-Caveat aus Hermes' Page-Contract-Audits S1–S3. M-Slice, Größe M, Slice-Type Tool.

## Zuletzt

- **Slice 292** (2026-06-13) — S3 Page Contract Audit `/fantasy` + `/clubs` + `/club/[slug]` (Docs-only): all three demo-yellow; F-1 public Club metadata “Trading” copy; F-2 `/clubs` page-test gap.
- **Slice 291** (2026-06-13) — Unified Trading GeoGate (TDD): `/player/[id]` and `/manager` trading actions now use `useRegionGuard('dpc_trading')`; content remains visible, trading execution blocked when restricted.
- **Slice 290** (2026-06-13) — Home Portfolio-Floor-Parity Fix (TDD): Home nutzt für Holdings jetzt canonical `computePlayerFloor` via byIds Player, fallback `floor_price`; useHomeData 40/40 grün.
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
- **Slice 292 ✅ DONE:** S3 Page Contract Audit `/fantasy` + `/clubs` + `/club/[slug]` abgeschlossen.
- Höchster kleiner Fix-Kandidat: S3 F-1 — öffentliche `/club/[slug]` Metadata-Copy “Trading” ersetzen durch compliance-sichere Scout-Cards/Fantasy/Fan-Wissen Sprache.
- Danach: S3 F-2 — `/clubs` Page-Test für loading/error/empty/follow/activate Basics.
- Nächster Audit-Schritt nach diesen kleinen Fixes: S4 Source-of-Truth Boundaries.
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
