# Review — Slice 416 (Welle 1.6 Eigene-Order/Bid-Exclusion SSOT)

**Reviewer:** reviewer-Agent (cold-context, read-only) · **Datum:** 2026-06-27 · **time-spent:** ~9 min

## Verdict: PASS

## Findings
| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | OrderbookSummary.tsx:40,74 | `if (bestBid)`-Truthy behandelt legit `0` BSD wie „kein Gebot". Unerreichbar (place_sell_order-Band min ≥1 Cent). Pre-existing (S415), nicht durch 416 eingeführt. | Optional `!= null`. Kein Blocker. |
| 2 | NIT | OrderbookSummary.tsx:54 vs Sell-Seite | `bidVol` summiert `b.quantity` (Offers haben kein Partial-Fill = ganz/gar nicht), Sell-Seite `quantity-filled_qty`. Korrekte bewusste Asymmetrie. | Keine Änderung. |

## One-Line
Ja — ein Senior merged das: chirurgischer SSOT-Helper, reine Anzeige, alle 4 Surfaces konsistent, Einheiten stimmen (cents-Helper → Consumer centsToBsd), logged-out sauber, Drift vollständig (S414/S415-Klasse geschlossen), Tests treffen die echten Bug-Klassen.

## Geprüft (1-6)
1. Exclusion-Logik korrekt: bid via `sender_id !== userId` (kein is_own/Type-Change nötig — Handoff-Korrektur faktisch richtig), ask via `!is_own` inline (414/415-Standard, Spiegel buy-RPC `user_id != p_user_id`). Match accept_offer-Guard.
2. Einheiten: Helper liefert cents → QuickStats/OrderbookSummary/SellModal konvertieren korrekt, keine doppelte/fehlende centsToBsd.
3. Empty/Guards auf gefilterte Listen (marketSellOrders/marketBids); kombinierte Page-Empty + Sektion-Wrapper bewusst auf allSellOrders (Seite bleibt bei nur-eigenen Orders); toter isOwn-Zweig entfernt.
4. userId-Threading vollständig: PlayerContent→TradingTab/SellModal, TradingTab→OrderbookSummary.
5. logged-out: excludeOwnBids gibt alle zurück, kein Crash (Unit-getestet).
6. Drift vollständig: grep zeigt nur die 4 Ziel-Surfaces + OrderDepthView (CLOB orders, Fork B, out-of-scope) + QuickStats (Consumer). „PlayerHero bestBid" existiert nicht (Spec-Korrektur bestätigt).

## Knowledge-Coupling (D88, beim LOG erledigen)
trading.md S7-303 F-1 „Noch offen"-Liste sagt noch „Bid-Seite (OfferWithDetails hat kein is_own → Type/Service-Change)" — durch den sender_id-Helper widerlegt. → beim LOG auf **geschlossen (S416)** aktualisieren, sonst Doku-Drift.

## Compliance
Reine Anzeige, keine neuen user-facing Strings, kein Securities-Vokabular, kein RPC/Schema/Money-Flow (CEO-Scope korrekt verneint).
