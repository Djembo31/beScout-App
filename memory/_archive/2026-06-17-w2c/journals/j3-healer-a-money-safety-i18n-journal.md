# Frontend Journal: J3 Healer A — Money-Safety + i18n + Modal-Safety
## Gestartet: 2026-04-14

### Verstaendnis
- Was: 7 FIX-Items aus Journey #3 (Sekundaer-Trade). i18n-Key-Leaks in Sell/Cancel-Pfad schliessen, Service-DE-Strings → i18n-Keys, preventClose auf 3 Modals, BuyOrderModal Disclaimer + Fee-Breakdown, Anon-Seller Fallback.
- Betroffene Files:
  - `src/features/market/hooks/useTradeActions.ts` (FIX-01)
  - `src/lib/services/trading.ts` (FIX-02, FIX-24 Kommentare)
  - `src/components/player/detail/BuyModal.tsx` (FIX-03, FIX-07)
  - `src/components/player/detail/SellModal.tsx` (FIX-04)
  - `src/components/player/detail/LimitOrderModal.tsx` (FIX-05)
  - `src/features/market/components/shared/BuyOrderModal.tsx` (FIX-06 + Consumer-Update FIX-02)
  - `messages/de.json` + `messages/tr.json` (neue i18n-Keys)
- Risiken:
  - Service-Contract-Change (Error-Shape aendert sich): JEDER Caller der `placeSellOrder` / `cancelOrder` / `placeBuyOrder` nutzt, muss auf `mapErrorToKey`/`te()` umgestellt werden.
  - i18n-Key-Kollision mit existierenden Keys (`market.*`, `errors.*`)
  - preventClose auf LimitOrderModal: aktuell nur Mock — preventClose={false} ist semantisch korrekter als TODO-Kommentar allein.

### Entscheidungen
| # | Entscheidung | Warum |
|---|--------------|-------|
| 1 | `maxPriceExceeded` als Error-Key (FIX-02 Z.163) | Matcht Pattern `invalidQuantity`/`invalidPrice` — konsistent |
| 2 | `anonSeller` i18n-Key unter `market` Namespace | SellModal ist Player-Detail aber Key-Inhalt ist marktsemantisch. `market.anonSeller` passt auch zu BuyConfirmModal falls dort spaeter benoetigt |
| 3 | FIX-02: `placeBuyOrder` von `return { success: false, error }` → `throw new Error(key)` | Konsistenz mit `placeBuyFromMarket`-Pattern, ermoeglicht mapErrorToKey im Consumer |
| 4 | Fee-Breakdown in BuyOrderModal direkt unter "Gesamtkosten" einblenden (nicht kompakter) | Analog BuyConfirmModal:207-213 — Compliance-Pattern, User-Trust, Visual-Konsistenz |
| 5 | LimitOrderModal: `preventClose={false}` explizit + TODO-Kommentar | Explizite Annotation ist besser als nur Kommentar — signalisiert bewusste Entscheidung |

### Fortschritt
- [x] Task-Package verstanden
- [x] Alle Target-Files gelesen
- [x] FIX-01 useTradeActions handleSell + handleCancelOrder
- [x] FIX-02 trading.ts Service-Errors als i18n-Keys + FIX-24 Kommentare
- [x] FIX-03 BuyModal preventClose
- [x] FIX-04 SellModal preventClose
- [x] FIX-05 LimitOrderModal preventClose Kommentar
- [x] FIX-06 BuyOrderModal TradingDisclaimer + Fee-Breakdown + Consumer-Update
- [x] FIX-07 BuyModal Anon-Seller Fallback
- [x] i18n DE + TR
- [x] tsc --noEmit clean
- [x] vitest auf betroffene Tests gruen
- [x] 1 Commit mit klarer Message

### Runden-Log
- Runde 1: Code-Context laden + Files lesen → Plan fixed
- Runde 2: Alle 7 FIX-Items implementiert
  - FIX-01: useTradeActions handleSell + handleCancelOrder via resolveErrorMessage() (mapErrorToKey + te()) → keine raw-key leaks
  - FIX-02: trading.ts Z.163 `Price exceeds maximum (X $SCOUT)` → `'maxPriceExceeded'`; placeBuyOrder komplett von return→throw (invalidQuantity/maxQuantityExceeded/invalidPrice/playerNotFound/playerLiquidated/clubAdminRestricted/mapRpcError/place_buy_order returned null)
  - FIX-02 Mutation-Wrapper: `'Kauf fehlgeschlagen'`/`'IPO-Kauf fehlgeschlagen'`/`'Kaufgesuch fehlgeschlagen'`/`'Stornierung fehlgeschlagen'` → `'generic'` (noetig weil Raw-DE-Strings im Consumer geleakt haetten)
  - FIX-03: BuyModal preventClose={buying || ipoBuying}
  - FIX-04: SellModal preventClose={selling || cancellingId !== null || acceptingBidId != null}
  - FIX-05: LimitOrderModal preventClose={false} + expliziter TODO-Kommentar fuer Live-Feature
  - FIX-06: BuyOrderModal TradingDisclaimer variant="inline" + Fee-Breakdown (feeInfoMarket + feeBreakdownPlatform/Pbt/Club analog BuyConfirmModal) + onError Consumer via mapErrorToKey+te()
  - FIX-07: BuyModal anonSeller-Fallback statt user_id.slice(0,8) — neue Keys in DE+TR
  - FIX-24: Kommentare Z.149 + Z.197 DPCs → SCs
  - Tests angepasst: trading.test.ts (Price exceeds maximum → maxPriceExceeded, placeBuyOrder von .returns zu .rejects.toThrow mit i18n-keys); useTradeActions.test.ts (raw-strings → mapped keys: 'Insufficient holdings'→insufficientBalance, 'Order not found'→orderNotFound, 'Network failure'→networkError, 'DB timeout'→timeout, 'string-error'→generic)
- Runde 3: Verification
  - tsc --noEmit: **clean** (kein Output)
  - vitest: 292 passed / 1 pre-existing environment failure (MarketFilters.test.ts — fehlende Supabase env, auch ohne meine Changes broken, siehe `git stash` Test)
  - vitest auf direkt betroffene: 97 tests green (trading.test.ts + useTradeActions.test.ts)
  - 11 Files geaendert, +137 -88 LOC
  - JSON lint OK (de.json + tr.json parse ohne Fehler)

### Self-Review 8-Punkt Checkliste
- [x] Types propagiert (placeBuyOrder return unveraendert, throws via useMutation gehandhabt)
- [x] i18n komplett (DE+TR): anonSeller neu; maxPriceExceeded/invalidQuantity/invalidPrice/feeInfoMarket/feeBreakdown* bereits in errors/market Namespaces
- [x] Column-Names: keine DB-Aenderungen
- [x] Consumers aktualisiert: grep 'Invalid quantity|Invalid price|Price exceeds maximum' → 0 Treffer im Code; BuyOrderModal onError + usePlaceBuyOrder Fallback i18n-safe
- [x] UI-Text Kontext: BuyOrderModal = Sekundaer-Buy-Order → feeInfoMarket (6% vom Verkaeufer) + Fee-Split 3.5/1.5/1% korrekt
- [x] Keine Duplikate (anonSeller 1x in DE, 1x in TR)
- [x] Service Layer: mapErrorToKey/normalizeError sind pure utils; resolveErrorMessage im Hook via useCallback; Hooks vor returns; qk.* weiter genutzt
- [x] Edge Cases: null-guard auf profileMap[handle], preventClose deckt pending mutation ab, Fee-Breakdown nur bei priceNum>0

### Frontend-spezifisch
- [x] Components aus Registry (Modal preventClose, TradingDisclaimer, PlayerIdentity)
- [x] Design Tokens (ml-5.5 analog BuyConfirmModal, text-white/40, size-3.5, text-[10px])
- [x] Touch targets 44px (keine neuen Buttons)
- [x] aria-labels OK (Info-Icon aria-hidden)
- [x] Kein dynamic Tailwind

### Ergebnis
**PASS** — alle 7 FIX-Items implementiert, tsc clean, betroffene Tests gruen (97/97), keine Raw-Error-Leaks mehr in Sell/Buy-Order/CancelOrder-Pfaden.
