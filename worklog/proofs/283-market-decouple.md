# Proof Slice 283 — Market Tab-Decoupling (2026-06-12)

## Baseline (Vorher — lighthouse-baseline-authed.md, GHA authed)

```
/market: Perf 52 | FCP 816 | LCP 4423 | TBT 1189 | CLS 0.189   ← schlechteste Page
/manager: (nicht im LHCI-Set, lud aber dieselben 4,2 MB via useManagerData→useMarketData)
```

Root-Cause: Default-Tab `portfolio` (nur Holdings) wurde vom 4,2-MB-Fetch des
Marktplatz-Tabs gegated; Enrichment lief 3-5× über alle 4.500 Spieler pro Mount.

## AC-07 — tsc + Tests ✅

```
npx tsc --noEmit → 0 Fehler
CI=true vitest run src/features/market src/features/manager src/lib/queries:
 Test Files  14 passed (14)
      Tests  197 passed (197)
```

Neue Tests: Tab-Gating (enabled-Propagation false auf portfolio / true auf marktplatz),
mySquadPlayers aus byIds-Subset.

## Architektur-Nachweis (BUILD)

- `useMarketData`: full-list `enabled: tab==='marktplatz'`; Portfolio via
  `usePlayersByIds(holdings ∪ offers ∪ bids)` + Subset-Enrichment; getrennte
  States `marketList*` / `portfolio*`; playerMap/floorMap als Union.
- `MarketContent`: per-Tab Loading/Error (282-F-02), Page-Level-Guard entfernt.
- **Bonus /manager:** useManagerData auf Portfolio-Quelle (externe API stabil) —
  Manager-Hub lud bisher dieselben 4,2 MB. HistoryEventCard (Historie kann
  VERKAUFTE Spieler enthalten) → eigener byIds (282-Pattern).
- OffersTab-Picker: server-side `searchPlayersByName` (ilike, limit 8) — war der
  einzige full-list-Grund auf portfolio.
- Wave 3: 5 tote SortOption-Type-Werte entfernt (kein UI-Angebot, keine cases).

## REVIEW

→ worklog/reviews/283-review.md (Cold-Context, L-Slice-Pflicht)

## AC-01/02/03 — Live-Network + Visual (post-Deploy)

→ Abschnitt unten nach Deploy.

## AC-05 — GHA-Lighthouse-Delta (post-Deploy)

→ Abschnitt unten nach nächstem authed Run.
