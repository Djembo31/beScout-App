# Active Slice

```
status: idle
slice: 284a ✅ DONE (Wave 1 von 4)
stage: LOG complete (stuck-live=0 extern verifiziert; API-Key-Suspension als kritischer Fund)
spec: worklog/specs/284a-live-lifecycle.md
impact: inline (Spec §4) + Migration applied
proof: worklog/proofs/284a-live-lifecycle.md
review: worklog/reviews/284a-review.md (REWORK → 3 MAJOR + 5 MINOR geheilt)
```

## Slice 284 — Core-Domain-Stabilisierung · Wave 1 ✅ / Waves 2-4 offen

**🚨 BLOCKER für Wave 2 (Anil):** Production-API-Football-Key seit 06.05. suspendiert
(dashboard.api-football.com → Abo/Zahlung prüfen). Ohne Key: Geister-Triage nur
teilweise (kein API-Verify), Live-Features blind, Saisonstart-Pipeline steht.

| Wave | Inhalt | Status |
|------|--------|--------|
| 1 (284a) | Live-Lifecycle P0-Kette | ✅ LIVE |
| 2 (284b) | Daten-Heal: 154 Geister + Süper-Lig-GW35-37-Drift + max_gameweeks + parseGameweek-Cap + FANT-10 | offen (teilw. Key-abhängig) |
| 3 (284c) | Markt/Rankings: FM-01 Floor-Parity + FM-02/03 Rankings + FM-04 Bulk-Sell + FM-05/06/07 | offen (Key-unabhängig) |
| 4 (284d) | Fantasy-UI: FANT-05 Liga-Scope Ergebnisse + FANT-09/13/08 | offen (Key-unabhängig) |

Punch-List: worklog/audits/2026-06-12/stab-284-punchlist.md

## Zuletzt

- **Slice 284a** (2026-06-12) — Live-Lifecycle (L, REWORK→geheilt, API-Key-Fund).
- **Slice 283** (2026-06-12) — Market+Manager-Decouple, /market Perf 52→87 (L).
- **Slice 282b** (2026-06-12) — LHCI-Auth-Fix, erste valide Baseline (M).

Nächstes: 284c (Key-unabhängig) parallel zu Anils Key-Reaktivierung; danach 284b.
