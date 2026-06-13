# Active Slice

```
status: idle
slice: 284c ✅ DONE (Wave 3 von 4)
stage: LOG complete (2 P1 DB-bewiesen, Live-Walk clean)
spec: worklog/specs/284c-markt-rankings-fixes.md
impact: skipped (keine RPC/Migration)
proof: worklog/proofs/284c-markt-rankings.md
review: worklog/reviews/284c-review.md (Self-Review PASS)
```

## Slice 284 — Core-Domain-Stabilisierung · Waves 1+3 ✅ / Waves 2+4 offen

**🚨 BLOCKER für Wave 2 (Anil):** Production-API-Football-Key seit 06.05. suspendiert
(dashboard.api-football.com → Abo/Zahlung prüfen). Wave 2 (Geister-Triage) braucht
API-Verify.

| Wave | Inhalt | Status |
|------|--------|--------|
| 1 (284a) | Live-Lifecycle P0-Kette | ✅ LIVE |
| 3 (284c) | Markt/Rankings FM-01..05,07 (FM-06 defer) | ✅ LIVE |
| 4 (284d) | Fantasy-UI: FANT-05 Liga-Scope Ergebnisse + FANT-09/13/08 | offen (Key-unabhängig) |
| 2 (284b) | Daten-Heal: 154 Geister + Süper-Lig-Drift + max_gameweeks + parseGameweek-Cap + FANT-10 | offen (Key-abhängig) |

Punch-List: worklog/audits/2026-06-12/stab-284-punchlist.md

## Zuletzt

- **Slice 284c** (2026-06-13) — Markt/Rankings-Fixes (M, 2 P1 DB-bewiesen).
- **Slice 284a** (2026-06-12) — Live-Lifecycle (L, API-Key-Fund).
- **Slice 283** (2026-06-12) — Market-Decouple, /market Perf 52→87 (L).

Nächstes: 284d Fantasy-UI (Key-unabhängig) — empfohlen.
