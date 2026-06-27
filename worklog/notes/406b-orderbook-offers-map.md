# 1.4 Orderbuch — Faktenkartierung `orders` vs `offers` (2026-06-27)

Vor-Bau-Investigation (kein Code). Quelle: Live-DB + Code-Grep. Für CEO-Architektur-Entscheidung.

## Was die zwei Tabellen WIRKLICH sind (≠ Duplikat)

| | `orders` (Orderbuch / CLOB) | `offers` (P2P-Verhandlung) |
|---|---|---|
| Modell | Anonymes Limit-Orderbuch — jeder kann füllen | Gerichtetes Angebot sender→receiver |
| Felder | user_id, side, price, qty, **filled_qty**, status, expires_at | sender_id, **receiver_id**, side, price, qty, status, **counter_offer_id, message** |
| Teilfüllung | ja (`filled_qty`, open/partial/filled) | nein (all-or-nothing) |
| Verhandlung | nein | ja (counter_offer, message, reject) |
| Fee | trade_*: **6 %** (3,5+1,5+1) | offer_*: **3 %** (2+0,5+0,5) |
| RPCs | place_sell_order, place_buy_order, buy_from_order, buy_player_sc, cancel_order, expire_pending_orders, get_public_orderbook | create_offer, accept_offer, counter_offer, reject_offer, cancel_offer_rpc, expire_pending_offers |
| UI | MarketContent, TradingTab, BuyModal | OfferModal, OffersTab, useOffersState |

→ Strukturell **zwei verschiedene Produkte** (Börse vs. „mach mir ein Angebot"). Tabellen-Merge wäre falsch.

## Live-Nutzung (der eigentliche Befund)

**Drei Wege „ich will kaufen" — nur einer lebt:**
1. **`buy_player_sc`/`buy_from_order`** (Instant-Kauf gegen Orderbuch) — **DIE lebende Mechanik** (4 aktive Sell-Orders, 77 filled).
2. **`place_buy_order`** (Buy-Limit-Order in `orders`) — **bereits per Flag aus** (`FEATURE_BUY_ORDERS=false`, AR-11: kein Matching-Engine, escrowed Geld ohne je zu füllen). 0 aktiv, letzte Aktivität **2026-03-19**. Tot.
3. **`create_offer` side=buy** (P2P) — live in UI, aber **0 pending jetzt**, ~16 Zeilen lifetime (meist cancelled/expired/QA), letzte 2026-06-24.

**Sell:** `place_sell_order` (Orderbuch, gelebt) vs. `create_offer` side=sell (P2P, ~3 Zeilen, tot).

**Zahlen:** orders aktiv = 4 sell / 0 buy. offers pending = **0**. P2P + Buy-Limit sind faktisch ungenutzte Parallel-Mechaniken neben dem einen echten Orderbuch.

## Schon gated (featureFlags.ts)
- `FEATURE_BUY_ORDERS=false` (Buy-Limit tot, AR-11) · `FEATURE_LIMIT_ORDERS=false` (Placeholder-UI).
- `offers` (P2P) ist **NICHT** geflaggt → läuft live, trotz ~0 Nutzung + eigener 3%-Fee + eigenem Escrow/Cron/5 RPCs/2 UI-Flächen.

## Die Gabelung (CEO)
- **A — Orderbuch-only:** P2P `offers` per Flag aus (wie Buy-Orders schon), OfferModal/OffersTab verstecken. Kleinste Fläche, kohärent, Sorare-nah, reversibel. **Empfohlen.**
- **B — Beide als getrennte Produkte behalten:** Orderbuch = Markt, offers = „Angebot machen/verhandeln". Beide voll härten + Labels trennen + 3%-vs-6%-Fee rechtfertigen. Mehr Fläche.
- **C — Echte zweiseitige Börse:** Buy-Matching-Engine bauen (`place_buy_order` füllt real) + P2P retiren. Größter Bau (Matching), wohl post-Launch.
