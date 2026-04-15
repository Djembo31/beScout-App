# Frontend Journal: Journey #8 Healer — 14 Autonome Fixes

## Gestartet: 2026-04-14

### Verstaendnis
- Was: 14 autonome Beta-Gates aus Journey #8 Audit (Verkaufen + Order-Buch). Money-Critical Pfad. AKUT-P0 (J8B-01..03) bereits durch CTO erledigt (REVOKE auf 7 RPCs, expire-buy-branch, DROP buy_from_market).
- Betroffene Files (Plan):
  - `src/components/player/detail/hooks/usePlayerTrading.ts` (FIX-01 — i18n-key-leak)
  - `src/components/player/detail/SellModal.tsx` (FIX-02, 07, 08, 09, 10, 11)
  - `src/lib/errorMessages.ts` (FIX-03 — neue Regex-Mappings)
  - `src/lib/services/offers.ts` (FIX-14 — error.message i18n-resolve)
  - `messages/de.json` + `messages/tr.json` (FIX-04, 05, 06, 12 — Glossar-Sweep)
  - `src/features/market/components/shared/OrderDepthView.tsx` (FIX-12 — bid/ask labels)
- Risiken (aus Skill+Common-Errors):
  - i18n-Key-Leak Pattern (J3-Wiederholung)
  - Service-Error-Swallow (NIE leerer catch)
  - Triple-Red-Flag Service-Error (DE/EN-Mix, $SCOUT-Ticker, dynamic Werte)
  - Glossar-Verstoesse (Orderbuch -> Angebots-Tiefe AR-17)

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | FIX-01: Identisches Pattern wie useTradeActions.ts:107-117 nutzen | Konsistenz, geprueft |
| 2 | FIX-03: Neue Keys 'orderCannotBeCancelled' nur wenn nicht abgedeckt | Minimal-Surface |
| 3 | FIX-04: orderbookTitle 4409 ist user-facing (Kader/Bestand) - umbenennen; 2215 ist player-detail UI | beide user-facing |
| 4 | FIX-05: portfolioTrend NUR umbenennen wenn user-facing — pruefen | Consumer-Check noetig |
| 5 | FIX-07: sellSuccess Prop von Parent — analog buySuccess Pattern | Konsistenz, kein Schaden |
| 6 | FIX-13: Service-Pruefung — alle place_sell_order paths bereits korrekt | confirmed |

### Fortschritt
- [ ] FIX-01: usePlayerTrading.ts i18n-key-leak (CRITICAL)
- [ ] FIX-02: SellModal.tsx minPriceError/invalidQty Namespace check
- [ ] FIX-03: errorMessages.ts neue Regex-Mappings
- [ ] FIX-04: orderbook* Glossar DE+TR
- [ ] FIX-05: trader/portfolio Glossar DE+TR
- [ ] FIX-06: OrderbookDepth.tsx — automatisch durch FIX-04
- [ ] FIX-07: SellModal sellSuccess Prop
- [ ] FIX-08: SellModal SC suffix lokalisieren
- [ ] FIX-09: SellModal Quick-Price floor*1.X mit Math.max(1, ...)
- [ ] FIX-10: SellModal storno aria-label
- [ ] FIX-11: SellModal "sofortVerkaufen" Doppel-Label
- [ ] FIX-12: OrderDepthView bid/ask Labels (bereits via depthBid/depthAsk?)
- [ ] FIX-13: trading.ts placeSellOrder error-paths verifizieren
- [ ] FIX-14: offers.ts error.message → mapErrorToKey

### Runden-Log
