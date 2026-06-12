# Impact 283 — Market Tab-Decoupling

**Datum:** 2026-06-12 · Quellen: Explore-Agent-Feld-Map + direkte Reads (MarketContent voll, useMarketData voll, marketStore voll, players.ts league-Mapping, trading.ts orders)

## Konsumenten-Kette

`useMarketData` → 1 Konsument `MarketContent.tsx:65`. Props-Verteilung:
- **PortfolioTab** (Z.227-240): players, mySquadPlayers, holdings, floorMap, recentOrders, buyOrders, offers/bids → braucht nur HOLDINGS+OFFER-Spieler
- **MarktplatzTab** (Z.245-255): players, playerMap, floorMap, watchlist, ipos, trending → braucht volle Liste
- MarketContent selbst: playerMap (TradeSuccessCard nach BUY — Buys passieren im marktplatz-Kontext → full-list geladen ✓; handleCreateBuyOrder ist FEATURE_BUY_ORDERS=false no-op), Error-Guard Z.103, Loading-Gate Z.217, Deep-Link `?tab=` Z.73-81 (Store-Tab VOR erstem useMarketData-Render? Nein — useEffect nach Mount → enabled reagiert auf Tab-Change, 1 Render-Frame portfolio-gated = ok)

## Cleared Risks (aus Spec-Pre-Mortem)

- **league*-Felder in byIds-Rows:** ✅ dbToPlayer mappt league/leagueShort/leagueLogoUrl/leagueCountry aus clubCache via club_id (players.ts:178-181) — identisch für byIds-Pipeline.
- **orders ungated:** `getAllOpenSellOrders` via RPC `get_public_orderbook`, cap 1000 — bleibt ungated (Portfolio-Floor braucht Orders der eigenen Spieler).
- **WatchlistView:** liegt im marktplatz-Tab (kaufenSubTab) → full-list-Pfad, 0 Änderung.
- **Persist:** marketStore ohne persist-Middleware → kein Stale-Tab-State.

## Side-Effects

- **Cache:** Kein neuer qk-Key (usePlayersByIds-Keys existieren, ids-abhängig). `qk.players.all` wird auf /market erst bei marktplatz-Tab gefüllt. Trade-Invalidations mit `['players']`-Root-Prefix decken byIds mit ab; enge `qk.players.all`-Invalidations refetchen nur wenn full-list aktiv (TanStack refetcht inactive queries nicht aktiv → ok, stale-marker reicht).
- **Realtime:** keine players-Realtime-Subscription im Market-Tree.
- **Error-Semantik:** Page-Level-Guard (Z.103) wird per-Tab-scoped — 282-F-02-Lehre (kein Full-Page-Error für Daten des inaktiven Tabs).
- Kein Schema/RPC-Change.

## Dispatch

Serial (interdependente Kette useMarketData→MarketContent→Tabs); L wegen Reichweite, aber Single-Domain. Cold-Context-Review Pflicht.
