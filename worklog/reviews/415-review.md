# Slice 415 Review — OrderbookSummary Own-Sell-Exclusion (Welle 1.6 Teil 2)

**Typ:** self-review (Frontend, kein Money). · **Datum:** 2026-06-27

## Verdict: PASS (Live-Verify nach Deploy ausstehend)

## Geprüft
- **Korrektheit:** `marketSells = sellOrders.filter(o => !o.is_own)` durchgängig für bestAsk, askVol, Empty-State, Expand-Bedingung, OrderbookDepth-Pass. Konsistent mit buy_player_sc/buy_from_order + trading.md S7-303 F-1 + Slice 414 (OrderDepthView). ✓
- **Kein Service/Type-Change:** PublicOrder.is_own vorhanden, tsc 0. ✓
- **Surgical:** nur Sell-Seite (der beobachtete Bug); Bid-Seite bewusst out-of-scope (OfferWithDetails ohne is_own → eigener Folge-Slice mit Type-Change), im Proof + Code-Kommentar dokumentiert. ✓
- **Edge:** viewer nur eigene Sells + keine Bids → marketSells leer + bids leer → `return null` (Widget versteckt). Akzeptabel (kein Markt zu zeigen). ✓

## Honest-Befund (warum 2 Slices)
Der Live-Walk deckte auf, dass 414 (OrderDepthView) zwar korrekt, aber eine andere Surface (Markt-Tab) war — Player-Detail nutzt OrderbookSummary. **Genau dafür ist der Live-Walk Pflicht** (statische Verifikation hätte „bestAsk excludiert own" für OrderDepthView grün gemeldet, während die sichtbare Seite weiter den Bug zeigte). Best-Ask an 4 Stellen = „von-allem-vier"-Mock→Pro-Smell.

## Findings
Keine im Scope. Follow-up: Bid-Seite own-exclusion (OfferWithDetails+is_own) + PlayerHero bestBid-Surface (TradingTab:126) prüfen.
