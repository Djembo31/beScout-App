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

## AC-01/02/03 — Live-Network + Visual (post-Deploy) ✅

```
$ npx tsx e2e/qa-283-network.ts   (eingeloggt jarvis-qa, 393px, Production ec0ae74b)
/market (Default portfolio): /api/players(full)=0 ✅ | byIds=1
/market nach Marktplatz-Klick: /api/players(full)=1 ✅ lazy nachgeladen (4.0 MB decoded)
/manager: /api/players(full)=0 ✅ | byIds=1
```

Screenshots: qa-screenshots/283-market-portfolio.png (Bestand vollständig: 22 Scout
Cards, Kader-Wert 5.690,93 CR, Pos/Club-Filter, 12 Spieler-Rows aus Subset),
283-market-marktplatz.png, 283-manager.png.

## AC-05 — GHA-Lighthouse-Delta ✅ (Run 27409327891, SUCCESS 2m56s)

| Page | Baseline (282b) | **Post-283** | Delta |
|---|---|---|---|
| **/market** | Perf 52 · LCP 4423 · TBT 1189 | **Perf 87 · LCP 2532 · TBT 327** | **+35 Perf · −43% LCP · −72% TBT** |
| / | Perf 75* · LCP 3221 · TBT 664 | Perf 75 · LCP 2705 · TBT 394 | −0,5s LCP · −41% TBT |
| /community | Perf 82 · LCP 2067 · TBT 578 | Perf 86 · LCP 1953 · TBT 420 | +4 Perf |

AC-05-Ziel (LCP < 3,5s UND TBT < 900ms): **massiv übertroffen** (2532/327).
/market ist von der schlechtesten zur besten Perf-Page geworden.
CLS / = 0.225 bleibt → bestätigt Slice 284 (Home-CLS) als nächsten Hebel.
