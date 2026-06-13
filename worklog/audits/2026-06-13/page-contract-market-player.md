# Page Contract Audit — /market + /player/[id]

Date: 2026-06-13
Slice: 288 / S1 Stabilization
Status: READ-ONLY AUDIT / NO CODE CHANGES
Worker: Claude Code analysis + Hermes independent verification

---

## Executive Summary

Both pages have real architecture behind them. They are not mock pages:

- no direct Supabase client imports in `src/features/market` or `src/components/player`, verified by grep;
- money paths go through services/RPC/mutation hooks;
- tests are meaningful in this scope: no `expect(true).toBe(true)`, no `it.skip`, no `test.skip` found under market/player scope;
- `/market` has a full GeoGate for `dpc_trading`.

Status:

| Page | Status | Reason |
|---|---|---|
| `/market` | GREEN with YELLOW caveat | Strong container/query/service layering, GeoGate present, behavior tests present. Caveat: holdings data has multiple representations across Market/Player/Manager paths and must be documented before S2. |
| `/player/[id]` | YELLOW | Good feature depth and mutation architecture, but no GeoGate around trading CTAs while `/market` is gated. `usePlayerDetailData` is complex relative to its current focused test count. |

---

## Contract: /market

Route:
- `/market`
- File: `src/app/(app)/market/page.tsx`
- Main container: `src/features/market/components/MarketContent.tsx`

Primary user job:
- Find Scout Cards.
- Understand price, floor, status, holdings, offers and bids.
- Buy/sell/manage own portfolio.

Demo relevance:
- P0. It is the first substantial product page in the demo path after Home.

Auth / Geo / Compliance gates:
- `MarketContent.tsx` wraps content with `GeoGate feature="dpc_trading"`.
- Anonymous user can browse parts of the market; mutations require user context.
- Trading disclaimers exist in money/action surfaces.

Primary data sources:
- market dashboard query/RPC for per-user aggregation;
- player list / player-by-ids query paths;
- IPO, orders, offers, watchlist and trending/player history queries;
- holding locks/fantasy context where needed.

Primary mutations:
- buy from market;
- buy from IPO;
- place sell order;
- cancel order;
- watchlist toggle;
- offer/bid actions via market mutation layer.

Query/cache ownership:
- Market dashboard query owns user-market aggregation.
- Player list/byIds queries own player shape and enrichment.
- Trading mutations invalidate relevant player/holding/order caches.

Main components:
- `MarketContent`
- market header / tabs
- portfolio tab / Bestand view / offers tab
- Marktplatz tab / IPO / transfer list / trending / watchlist
- buy confirmation and success UI

Loading states:
- Per-tab loading instead of full-page loading.
- Portfolio and Marktplatz can load independently.

Empty states:
- Present in portfolio/market sections, but data-confidence should later be tested with deterministic seed data.

Error states:
- Per-tab error handling exists.
- Slice 283 already fixed the derived-loading / endless-skeleton class around dashboard errors.

Mobile state:
- responsive grid and horizontal tab behavior exist; detailed visual confidence belongs to later visual pass.

Source-of-truth owner:
- Services/RPC/query layer, not UI components.

Bridge/debt:
- Holdings representation is split across flows: market dashboard aggregation, player detail scalar quantity, and manager/fantasy holding lists.
- This is partly intentional from earlier shape-safety fixes, but it is a consistency risk before S2 Home/Manager.

Tests/e2e:
- `useMarketData.test.ts`: 29 tests
- `useTradeActions.test.ts`: 28 tests
- `features/market/mutations/__tests__/trading.test.ts`: 22 tests
- e2e market specs exist, but are more render-confidence than strict data-confidence.

Status:
- GREEN with YELLOW caveat.

Decision:
- Keep architecture.
- Do not refactor immediately.
- Before Manager audit, document holdings/cache invalidation boundaries.

---

## Contract: /player/[id]

Route:
- `/player/[id]`
- Entry file: `src/app/(app)/player/[id]/page.tsx`
- Main container: `src/app/(app)/player/[id]/PlayerContent.tsx`

Primary user job:
- Understand a player/card in detail.
- See performance, market, ownership, community and trading context.
- Act: buy, sell, offer, watchlist, price alert.

Demo relevance:
- P0. It is the second substantial page in the Market -> Player demo path.

Auth / Geo / Compliance gates:
- Server component uses `supabaseAdmin` for metadata/OG fields only; this is legitimate server-side usage.
- No `GeoGate` found under player route/components.
- This is asymmetric with `/market`, which gates `dpc_trading`.
- Trading disclaimers exist in modals/tabs, but CTAs can still be visible where `/market` would be gated.

Primary data sources:
- player-by-id data;
- holding quantity;
- watchlist;
- sell orders / bids / IPO data;
- trades, scoring/performance, holder/watcher counts;
- tab-gated community/performance/trading datasets.

Primary mutations:
- buy from market/order;
- buy from IPO;
- sell/place order;
- cancel order;
- create/accept offers/bids;
- watchlist and price-alert mutations.

Query/cache ownership:
- player detail hooks coordinate many queries;
- trading hooks handle mutation invalidation;
- cache ownership is broad and more complex than `/market`.

Main components:
- `PlayerContent`
- player hero
- sticky dashboard strip
- trading/performance/community tabs
- mobile trading bar
- buy/sell/offer modals
- liquidation/trading/orderbook related components

Loading states:
- page skeleton for primary load;
- deferred/below-fold query loading exists;
- tab-specific queries load by tab/context.

Empty states:
- not-found state exists for missing players;
- section-level empties exist in tabs/modals.

Error states:
- page-level error state with retry;
- modal error boundaries and mutation errors exist.

Mobile state:
- mobile bottom action bar exists;
- sticky/scroll behavior should later be visually verified on the demo path.

Source-of-truth owner:
- player data service/query layer;
- trading services/RPC layer for money actions;
- UI should remain orchestration/display only.

Bridge/debt:
- no GeoGate around player trading CTAs;
- `usePlayerDetailData` is a dense orchestration hook with many queries;
- holdings are represented differently than market/manager flows.

Tests/e2e:
- `usePlayerDetailData.test.ts`: 8 tests
- `usePlayerTrading.test.ts`: 39 tests
- component/modal/trading tests exist;
- e2e player detail specs exist but can be data-availability tolerant/skipping, so they prove rendering more than deterministic data correctness.

Status:
- YELLOW.

Decision:
- Keep architecture.
- First fix candidate should be a small GeoGate/region-guard decision for trading CTAs, not broad refactor.

---

## Verified command evidence

GeoGate in market:

```text
src/features/market/components/MarketContent.tsx:111: <GeoGate feature="dpc_trading">
```

GeoGate in player scope:

```text
<no matches>
```

Direct Supabase client imports in market/player components:

```text
<no matches>
```

Test counts:

```text
useMarketData.test.ts: 29
useTradeActions.test.ts: 28
features/market/mutations/trading.test.ts: 22
usePlayerDetailData.test.ts: 8
usePlayerTrading.test.ts: 39
```

Placeholder/skip in market/player scope:

```text
<no matches>
```

---

## Findings

### F-1 — GeoGate asymmetry on /player/[id]

Severity:
- P1

Finding:
- `/market` is gated by `GeoGate feature="dpc_trading"`.
- `/player/[id]` has no equivalent GeoGate in the inspected player route/components.

Risk:
- A user restricted from trading may see player-detail trading CTAs even though `/market` blocks trading.
- Server-side defenses may still reject the action, but the UI becomes inconsistent and compliance-unfriendly.

Recommended next slice:
- Small docs/spec/implementation slice after Anil/CEO decision: decide whether to gate the full player page, only trading tab, or only trading CTAs/mobile action bar.

---

### F-2 — usePlayerDetailData confidence gap

Severity:
- P2

Finding:
- `usePlayerDetailData` coordinates many queries, deferred loading and tab-gating.
- It has 8 focused tests, while `usePlayerTrading` has 39.

Risk:
- enabled-flag, deferred-query or derived-data regressions can slip through.

Recommended next slice:
- Add hook contract tests for tab x below-fold-ready x player state matrix during S5 Test Confidence Audit.

---

### F-3 — Holdings Source-of-Truth split

Severity:
- P2

Finding:
- Market, Player and Manager/Fantasy use different holdings representations.
- This was partly intentional to avoid earlier shape mismatches, but it creates a reasoning burden.

Risk:
- Market, Player and Manager can appear inconsistent after trades unless invalidation and mapping boundaries are explicit.

Recommended next slice:
- Before S2 Home/Manager audit, write a holdings/cache invalidation boundary note and verify trade invalidation paths.

---

### F-4 — E2E confidence is render-oriented, not deterministic-data-oriented

Severity:
- P3

Finding:
- e2e specs exist, but tolerate live data availability and often assert rendering/navigation rather than deterministic business data.

Risk:
- tests can pass while product data is semantically wrong.

Recommended next slice:
- Later S5: deterministic seed-player or stable smoke target for Market -> Player data assertions.

---

### F-5 — Click-stability risk in live lists

Severity:
- P3

Finding:
- Some e2e navigation patterns depend on live/re-rendering lists.

Risk:
- Previous project bug class: clicking first visible item on re-rendering lists can be flaky.

Recommended next slice:
- Later S5: prefer href extraction + `page.goto()` pattern for list-to-player e2e navigation.

---

## Proposed follow-up sequence

1. Decision/Fix Slice: F-1 GeoGate for `/player/[id]` trading surfaces.
2. Boundary Slice: F-3 holdings/cache invalidation boundary before S2 Manager audit.
3. S2 Audit: Home + Manager page contracts.
4. S5 later: test confidence improvements for F-2/F-4/F-5.
