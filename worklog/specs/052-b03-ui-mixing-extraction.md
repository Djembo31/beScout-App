# Slice 052 — B-03 UI-Mixing-Extraktion (playerMath)

**Groesse:** S
**CEO-Scope:** NEIN
**Variante-2-Position:** #9/10

## Ziel

Eliminiere 4 Duplikationen der Floor-Price-Berechnung in UI-Components. Extract nach `src/lib/playerMath.ts` mit Unit-Tests.

## Hintergrund

B-03 aus Walkthrough-Plan: "UI Mixing (Components mit lokaler Logic)".
Business-Logic wie `floor = listings.length > 0 ? Math.min(...) : prices.floor ?? referencePrice ?? 0`
ist 4x dupliziert in Components, dadurch Drift-Risk + schwer testbar.

## Findings

4 identische Floor-Price-Berechnungen gefunden:

| File | Line | Usage |
|------|------|-------|
| `src/components/player/index.tsx` | 492-494 | PlayerKPIs inline |
| `src/components/player/PlayerRow.tsx` | 36-37 | `getFloor` helper |
| `src/features/market/components/marktplatz/WatchlistView.tsx` | 40-41 | `getFloor` helper |
| `src/features/market/hooks/useMarketData.ts` | 57 | Inline `m.set(p.id, ...)` |

Zusätzlich: PnL-Calculation in PlayerKPIs portfolio context (lines 506-508) — nicht-dupliziert aber mathematisch-complex genug fuer Extraction.

## Fixes

**NEU:** `src/lib/playerMath.ts`
- `computePlayerFloor(player)` — Shared floor-calc mit Fallback-Chain
- `computeHoldingPnL(floor, holding)` — PnL + PnL% + up-flag

**NEU:** `src/lib/__tests__/playerMath.test.ts` (9 Tests)
- 5 Tests fuer computePlayerFloor (listings, floor-fallback, referencePrice-fallback, 0-fallback, empty-both)
- 4 Tests fuer computeHoldingPnL (positive, negative, zero, division-guard)

**MODIFIZIERT:**
- `src/components/player/index.tsx` — PlayerKPIs: inline-floor → `computePlayerFloor`, PnL-inline → `computeHoldingPnL`
- `src/components/player/PlayerRow.tsx` — `getFloor = computePlayerFloor` aliased
- `src/features/market/components/marktplatz/WatchlistView.tsx` — `getFloor = computePlayerFloor` aliased
- `src/features/market/hooks/useMarketData.ts` — inline floor-calc ersetzt

## Acceptance Criteria

1. 4 Floor-Price-Duplikationen eliminiert. ✅
2. `computePlayerFloor` + `computeHoldingPnL` in `src/lib/playerMath.ts`. ✅
3. 9 Unit-Tests gruen. ✅
4. tsc clean. ✅
5. Kein visueller/funktionaler Regression (gleiche Math-Semantik). ✅

## Scope-Out

- **TradingCardFrame:** Hat KEINE floor-calc-Duplikation (grep = 0 Matches fuer Math.min-patterns). Pure Presentation, out-of-scope.
- **Weitere Business-Logic-Mixing in PlayerKPIs:** Die switch-Statement-Rendering-Logic ist intentional visuelle Darstellung, kein Business-Logic zum Extrahieren.

---

**Ready fuer LOG:** JA
