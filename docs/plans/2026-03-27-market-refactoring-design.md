# Market Page Refactoring — Design Doc

**Datum:** 2026-03-27
**Ansatz:** Thin Orchestrator (identisch mit Fantasy-Refactoring)
**Scope:** `page.tsx` (606 LOC) + `components/market/` (16 Files) + `components/manager/` (7 Files)
**Ziel:** Feature-Module `features/market/`, testbar, konsistent mit Fantasy-Pattern

---

## 1. Ist-Zustand

### page.tsx (606 LOC) — God-Component
- 12 Dynamic Imports, 4 Modals inline
- 13 React Query Hooks direkt im Component
- 6 `useMemo` Derivations (playerMap, floorMap, watchlistMap, etc.)
- 7 `useCallback` Handlers (buy, sell, cancel, watchlist, etc.)
- 2 Main Tabs (Portfolio, Marktplatz), 7 Sub-Tabs total
- URL-Sync, localStorage Migration, Error Auto-Dismiss — alles inline
- 0 Tests

### Ecosystem (~6,800 LOC total)
| Bereich | Files | LOC | Status |
|---------|-------|-----|--------|
| `components/market/` | 16 | ~4,100 | Gut strukturiert, falscher Ort |
| `components/manager/` | 7 | ~2,700 | NUR von Market genutzt |
| `lib/stores/marketStore.ts` | 1 | 285 | 45+ State-Felder, aufgeblaht |
| `lib/mutations/trading.ts` | 1 | 81 | 4 Mutations, sauber |
| `lib/services/trading.ts` | 1 | 682 | Shared (Player Detail, Home) |
| Queries (5 Files) | 5 | ~300 | Verstreut in lib/queries/* |

### Groesste Sub-Components
| Component | LOC | Wird zu |
|-----------|-----|---------|
| ManagerKaderTab | 732 | portfolio/KaderTab |
| ManagerOffersTab | 632 | portfolio/OffersTab |
| OrderDepthView | 504 | shared/OrderDepthView |
| ManagerBestandTab | 418 | portfolio/BestandTab |
| WatchlistView | 350 | portfolio/WatchlistView |
| ClubVerkaufSection | 335 | marktplatz/ClubVerkaufSection |
| MarketFilters | 318 | shared/MarketFilters |
| PlayerIPOCard | 312 | marktplatz/PlayerIPOCard |
| TransferListSection | 284 | marktplatz/TransferListSection |

---

## 2. Entscheidungen

| # | Frage | Entscheidung | Begruendung |
|---|-------|-------------|-------------|
| 1 | manager/ Components | Move + Rename nach features/market/components/portfolio/ | Heissen "Manager" aber sind reine Portfolio-Views |
| 2 | marketStore | Behalten, aufraumen (unused Fields raus) | Store funktioniert, Split bringt keinen echten Gewinn |
| 3 | trading.ts Service | Bleibt in lib/services/ (shared) | Wird von Player Detail + Home genutzt |
| 4 | Gesamtansatz | Thin Orchestrator (wie Fantasy) | Konsistenz wichtiger als Aufwand-Reduktion |

---

## 3. Ziel-Architektur

### File-Struktur
```
src/features/market/
├── components/
│   ├── MarketContent.tsx          (~150 LOC, Thin Orchestrator)
│   ├── MarketHeader.tsx           (~30 LOC)
│   ├── MarketTabs.tsx             (~40 LOC)
│   ├── portfolio/
│   │   ├── PortfolioTab.tsx       (~80 LOC, Sub-Tab Router)
│   │   ├── KaderTab.tsx           (ex-ManagerKaderTab, 732 LOC)
│   │   ├── BestandTab.tsx         (ex-ManagerBestandTab, 418 LOC)
│   │   ├── OffersTab.tsx          (ex-ManagerOffersTab, 632 LOC)
│   │   └── WatchlistView.tsx      (ex-market/WatchlistView, 350 LOC)
│   ├── marktplatz/
│   │   ├── MarktplatzTab.tsx      (~100 LOC, Sub-Tab Router)
│   │   ├── ClubVerkaufSection.tsx  (335 LOC, move)
│   │   ├── TransferListSection.tsx (284 LOC, move)
│   │   ├── TrendingSection.tsx    (~40 LOC, extracted from inline)
│   │   ├── PlayerIPOCard.tsx      (312 LOC, move)
│   │   ├── ClubAccordion.tsx      (226 LOC, move)
│   │   ├── ClubCard.tsx           (176 LOC, move)
│   │   ├── BuyOrdersSection.tsx   (184 LOC, move)
│   │   ├── EndingSoonStrip.tsx    (move)
│   │   ├── CountdownBadge.tsx     (move)
│   │   └── LeagueBar.tsx          (move)
│   └── shared/
│       ├── BuyConfirmModal.tsx    (254 LOC, move)
│       ├── BuyOrderModal.tsx      (231 LOC, move)
│       ├── TradeSuccessCard.tsx   (186 LOC, move)
│       ├── MarketSearch.tsx       (move)
│       ├── MarketFilters.tsx      (318 LOC, move)
│       ├── OrderDepthView.tsx     (504 LOC, move)
│       └── DiscoveryCard.tsx      (206 LOC, move — also used by Home)
├── hooks/
│   ├── useMarketData.ts           (~120 LOC)
│   ├── useTradeActions.ts         (~100 LOC)
│   └── useWatchlistActions.ts     (~50 LOC)
├── queries/
│   ├── ipos.ts                    (ex-lib/queries/ipos.ts)
│   ├── trending.ts                (ex-lib/queries/trending.ts)
│   ├── priceHist.ts               (ex-lib/queries/priceHist.ts)
│   ├── watchlist.ts               (ex-lib/queries/watchlist.ts)
│   └── offers.ts                  (ex-lib/queries/offers.ts)
├── mutations/
│   └── trading.ts                 (ex-lib/mutations/trading.ts)
└── store/
    └── marketStore.ts             (ex-lib/stores/marketStore.ts, aufgeraeumt)
```

### page.tsx (~30 LOC) — Reiner Wrapper
```tsx
'use client';
import MarketContent from '@/features/market/components/MarketContent';
export default function MarketPage() {
  return <MarketContent />;
}
```

---

## 4. Hook Contracts

### useMarketData(userId: string | undefined)
```ts
// Input: userId from AuthProvider
// Tab from marketStore (for query gating)
// Returns:
{
  // Core data (always loaded)
  players: Player[]
  playersLoading: boolean
  playersError: boolean
  holdings: Holding[]
  ipoList: DbIpo[]
  watchlistEntries: WatchlistEntry[]
  recentOrders: DbOrder[]
  incomingOffers: Offer[]

  // Tab-gated (marktplatz only)
  announcedIpos: DbIpo[]
  endedIpos: DbIpo[]
  trending: TrendingPlayer[]
  buyOrders: DbOrder[]
  priceHistMap: Map<string, number[]> | undefined

  // Derived (useMemo)
  playerMap: Map<string, Player>
  floorMap: Map<string, number>
  watchlistMap: Record<string, boolean>
  mySquadPlayers: Player[]
}
```

### useTradeActions(userId: string | undefined)
```ts
// Input: userId, consumed internally with mutations
// Returns:
{
  // Buy flow state
  pendingBuy: { playerId: string; source: 'market' | 'ipo' } | null
  setPendingBuy: (v: ...) => void
  executeBuy: (qty: number) => void
  buyingId: string | null
  buySuccess: string | null
  buyError: string | null
  resetBuy: () => void
  resetIpoBuy: () => void
  balanceBeforeBuyRef: React.RefObject<number>

  // Sell + Cancel
  handleSell: (playerId: string, qty: number, priceCents: number) => Promise<Result>
  handleCancelOrder: (orderId: string) => Promise<Result>

  // Buy Order modal
  buyOrderPlayer: Player | null
  setBuyOrderPlayer: (p: Player | null) => void

  // Buy handler shortcuts (open modal)
  handleBuy: (playerId: string) => void
  handleIpoBuy: (playerId: string) => void
}
```

### useWatchlistActions(userId: string | undefined, watchlistMap: Record<string, boolean>)
```ts
// Input: userId + derived watchlistMap from useMarketData
// Returns:
{
  toggleWatch: (playerId: string) => void
}
// Side effect: localStorage migration on mount (one-time)
```

---

## 5. Data Flow

```
MarketPage (page.tsx)
  └── MarketContent (Orchestrator)
        ├── useMarketData(userId)     → alle Queries + Derivations
        ├── useTradeActions(userId)    → Buy/Sell/Cancel State + Handlers
        ├── useWatchlistActions(userId, watchlistMap)
        │
        ├── MarketHeader              → Balance, Title
        ├── MarketTabs                → Tab Switcher (Portfolio | Marktplatz)
        │
        ├── PortfolioTab              → Props: players, holdings, handlers
        │   ├── KaderTab              → players, mySquadPlayers
        │   ├── BestandTab            → players, holdings, ipoList, onSell, onCancel
        │   ├── OffersTab             → players
        │   └── WatchlistView         → players, watchlistEntries
        │
        ├── MarktplatzTab             → Props: players, ipoList, handlers
        │   ├── ClubVerkaufSection    → players, ipoList, announced, ended
        │   ├── TransferListSection   → players, sellOrders, onBuy
        │   └── TrendingSection       → trending, playerMap
        │
        ├── TradeSuccessCard          → buySuccess state
        ├── BuyConfirmModal           → pendingBuy state
        └── BuyOrderModal             → buyOrderPlayer state
```

---

## 6. Store Cleanup

### Felder die bleiben (aktiv genutzt)
```
tab, portfolioSubTab, kaufenSubTab          — Navigation
portfolioView, kaufenMode, view             — View modes
bestandLens, bestandGroupByClub             — Bestand-Tab state
bestandSellPlayerId                         — Bestand Sell Modal
filterPos, filterMinL5, filterMinGoals,     — Market Filters (shared)
filterMinAssists, filterMinMatches,
filterContractMax, filterOnlyFit,
filterPriceMin, filterPriceMax,
filterMinSellers, filterBestDeals,
marketSortBy                                — Sorting
clubVerkaufLeague, clubVerkaufExpandedClub  — Club Verkauf state
showAdvancedFilters, ipoViewState           — UI toggles
```

### Felder zum Pruefen (moeglicherweise unused)
Vor dem Loeschen MUSS per Grep geprueft werden ob Sub-Components diese konsumieren:
```
query, posFilter, clubFilter, leagueFilter  — alte Filter (ersetzt durch filterPos etc.?)
priceMin, priceMax (String-Version)          — ersetzt durch filterPriceMin/Max (number)?
onlyAvailable, onlyOwned, onlyWatched       — noch in MarketFilters?
showFilters, clubSearch, showClubDropdown   — noch in Sub-Components?
spielerQuery, spielerPosFilter              — noch in ClubVerkaufSection?
expandedClubs, spielerInitialized           — noch genutzt?
showCompare                                  — Compare Feature aktiv?
discoveryPos, expandedDiscoveryClubs        — Discovery Mode aktiv?
discoverySortBy, discoveryMinL5, discoveryOnlyFit — Discovery Filter aktiv?
```

---

## 7. Re-Export Bridges

Alte Pfade muessen weiter funktionieren (andere Pages importieren von dort):

```ts
// src/lib/queries/ipos.ts (Bridge)
export { useActiveIpos, useAnnouncedIpos, useRecentlyEndedIpos } from '@/features/market/queries/ipos';

// src/lib/queries/watchlist.ts (Bridge)
export { useWatchlist } from '@/features/market/queries/watchlist';

// src/lib/queries/trending.ts (Bridge)
export { useTrendingPlayers } from '@/features/market/queries/trending';

// src/lib/mutations/trading.ts (Bridge)
export { useBuyFromMarket, useBuyFromIpo, usePlaceBuyOrder, useCancelBuyOrder } from '@/features/market/mutations/trading';

// src/lib/stores/marketStore.ts (Bridge)
export { useMarketStore } from '@/features/market/store/marketStore';
export type { MarketTab, PortfolioSubTab, KaufenSubTab } from '@/features/market/store/marketStore';

// src/components/manager/ManagerKaderTab.tsx (Bridge)
export { default } from '@/features/market/components/portfolio/KaderTab';

// src/components/manager/ManagerBestandTab.tsx (Bridge)
export { default } from '@/features/market/components/portfolio/BestandTab';

// src/components/manager/ManagerOffersTab.tsx (Bridge)
export { default } from '@/features/market/components/portfolio/OffersTab';

// src/components/market/DiscoveryCard.tsx (Bridge — used by Home)
export { default } from '@/features/market/components/shared/DiscoveryCard';

// Weitere Bridges fuer alle market/* Components die extern importiert werden
```

---

## 8. Testing Strategy

### Neue Tests
| Test | Scope | Prioritaet |
|------|-------|-----------|
| `useMarketData.test.ts` | Query-Buendelung, tab-gating, derived data | P1 |
| `useTradeActions.test.ts` | Buy-Flow (market + IPO), sell, cancel, error dismiss | P1 |
| `useWatchlistActions.test.ts` | Optimistic toggle, migration, revert on error | P2 |
| `MarketContent.test.tsx` | Tab-Routing, Loading/Error States, Modal-Rendering | P2 |
| `PortfolioTab.test.tsx` | Sub-Tab Routing (4 Panels) | P3 |
| `MarktplatzTab.test.tsx` | Sub-Tab Routing (3 Panels), Search toggle | P3 |

### Bestehende Tests (Imports updaten)
- `OrderDepthView.test.tsx` — Import-Pfad aendern
- `MarketFilters.test.ts` — Import-Pfad aendern
- `PlayerIPOCard.test.tsx` — Import-Pfad aendern
- `WatchlistView.test.tsx` — Import-Pfad aendern
- `SquadSummaryStats.test.tsx` — Import-Pfad aendern
- `ManagerKaderTab.test.tsx` — Import-Pfad + Component-Name aendern
- `ManagerOffersTab.test.tsx` — Import-Pfad + Component-Name aendern

### Approach
- Hooks: `renderHook` + mocked queries (React Query wrapper)
- Components: Gerenderte Props, kein Provider-Setup
- Mutations: NICHT unit-testen (thin wrappers, DB-Logik in RPCs)
- Kein neues E2E — bestehende Playwright Coverage reicht

---

## 9. Risiken + Mitigations

| Risiko | Mitigation |
|--------|-----------|
| Store-Feld geloescht das noch genutzt wird | Grep JEDES Feld vor Delete, nur loeschen wenn 0 Treffer |
| Bridge vergessen, externer Import bricht | tsc nach jedem Wave, nicht erst am Ende |
| manager/bestand/ Sub-Components (5 Files) | Mitnehmen nach portfolio/bestand/ — internes Oekosystem |
| DiscoveryCard von Home importiert | Bridge in components/market/ |
| Trading Mutations von Player Detail genutzt | Bridge in lib/mutations/ |

---

## 10. Wissensuebergabe

### Warum Market anders ist als Fantasy
1. **Store existiert schon** — Fantasy hatte keinen, Market hat 285 LOC Zustand Store
2. **Mutations existieren schon** — 4 saubere Mutations in lib/mutations/trading.ts
3. **Services sind shared** — trading.ts wird von 3+ Pages genutzt, bleibt in lib/
4. **Mehr Sub-Components** — 23 Files vs Fantasy's ~14, aber weniger gekoppelt
5. **Manager = Portfolio** — 7 Components heissen "Manager" aber sind reine Portfolio-Views

### Was gleich ist wie Fantasy
1. Thin Orchestrator Pattern (page → Content → Hooks → Tabs)
2. Feature-Module Struktur (components/ hooks/ queries/ mutations/ store/)
3. Re-Export Bridges fuer Backward-Compat
4. Hook-basierte State-Extraktion (useMarketData ≈ useFantasyEvents)
5. Tab-Router Components (PortfolioTab ≈ Fantasy Tabs)

### Workflow-Regeln (aus Session 259)
- **Gekoppelte Tasks selbst machen** — Component-Rewrite mit Hook-Extraction ist gekoppelt
- **Agents nur fuer isolierte Tasks** — z.B. Tests schreiben, einzelne Component verschieben
- **tsc nach jedem Wave** — nicht am Ende, sonst Schneeball-Effekt
- **Store-Cleanup als letztes** — erst wenn alles verschoben ist, dann unused Fields pruefen
- **1 Review pro Wave** — nicht pro Task

### Kritische Dateien (VOR Aenderung lesen)
- `src/app/(app)/market/page.tsx` — Hauptquelle, wird Orchestrator
- `src/lib/stores/marketStore.ts` — Store, wird aufgeraeumt + verschoben
- `src/lib/mutations/trading.ts` — Mutations, wird verschoben
- `src/lib/queries/invalidation.ts` — hat `invalidateTradeQueries`, NICHT verschieben
- `src/components/manager/bestand/` — 5 interne Files, muessen zusammen mitwandern
- `src/app/(app)/page.tsx` — Home importiert DiscoveryCard, braucht Bridge
