---
name: Journey 2 — Business/Compliance Audit
description: Wording + Compliance + Geofencing Audit des IPO-Kauf-Flows fuer Operation Beta Ready Phase 2.
type: project
status: audit-complete
created: 2026-04-14
agent: business
---

# Journey #2 — Business/Compliance Audit (IPO-Kauf)

## Verdict: CONCERNS

14 Findings: **1 CRITICAL + 3 HIGH + 7 MEDIUM + 3 LOW.**

Keine forbidden-words in Live-UI. Aber i18n-Key-Leak (Journey #1 Pattern nicht gefixt), TradingDisclaimer-Luecke in Kauf-Bestaetigungs-Modalen, $SCOUT-Ticker in Error-Strings, "IPO"-Vokabel unklar in business.md.

---

## Findings

| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| **C1** | CRITICAL | `src/features/market/hooks/useTradeActions.ts:38` + `src/features/market/components/MarketContent.tsx:137` | **i18n-Key-Leak (J1-Pattern).** `buyError = buyMutError?.message` rendert Raw-Key (`invalidQuantity`, `playerLiquidated`, `clubAdminRestricted`, `insufficientBalance`, `maxQuantityExceeded`, `noMatchingOrders`, `cannotBuyOwn`, `permissionDenied`, `generic`). Keys existieren in `errors.*` Namespace, werden aber nicht via `t()` resolved. User sieht bei gescheitertem IPO-Kauf woertlich "invalidQuantity". | `const tErr = useTranslations('errors'); const buyError = isErr ? tErr(rawMsg, {}, { fallback: tc('unknownError') }) : null;` |
| **H1** | HIGH | `src/features/market/components/shared/BuyConfirmModal.tsx` | TradingDisclaimer fehlt im IPO-Kauf-Bestaetigungs-Modal. Letzter Klick vor Geld-Transaktion. business.md: "Jede Seite mit $SCOUT/DPC MUSS TradingDisclaimer enthalten." | `<TradingDisclaimer variant="inline" />` zwischen Total-Card und Actions-Row. |
| **H2** | HIGH | `src/components/player/detail/trading/BuyConfirmation.tsx` | Gleiche Luecke, Player-Detail Kauf-Flow. | Gleicher Fix. |
| **H3** | HIGH | `messages/de.json:820` + `messages/tr.json:820` (`notEnoughScout`) | `"Nicht genug $SCOUT"` / `"Yeterli $SCOUT yok"`. $SCOUT als Ticker — widerspricht business.md "Platform Credits". | DE: "Nicht genug Credits. Du hast {have}, brauchst {need}." / TR: "Yeterli Credits yok." |
| M1 | MEDIUM | `messages/tr.json:1108` | TR `"ipoPrice": "IPO Fiyatı"` vs DE `"Club-Preis"` — inkonsistent. Pilot ist TR. | TR: `"Kulüp Fiyatı"` |
| M2 | MEDIUM | `messages/tr.json` (20+ Keys: 382, 1163, 1182, 1429, 2141, 2509, 2585, 2588, 2595, 2596, 2646, 2660, 3771, 3884, 3929, 4414, 4447, 4537, 4732) | Kuerzel "IPO" roh in TR-Strings. SPK/MASAK-Signal (Securities-Terminologie). | Auf "Kulüp Satışı" / "Ön Satış" / "İlk Satış". Legal-Review noetig. |
| M3 | MEDIUM | `messages/de.json` (2141, 2569, 2585, 2595, 2596, 2646, 2660, 2509, 4447 etc.) | DE: "IPO-Kauf", "IPO Verwaltung", "IPO-Preis (Credits)". User-facing Strings sollten "Erstverkauf" (bereits in 1163, 2202 etabliert). Admin-Strings duerfen bleiben. | User-facing auf "Erstverkauf". |
| M4 | MEDIUM | `BuyConfirmModal.tsx:204` | `source='ipo'`: nur einzeilig `t('feeInfoIpo')` — keine Fee-Aufschluesselung (10% Platform + 5% PBT + 85% Club). User sieht "Kein Aufschlag". | Optional: IPO-Fee-Breakdown mit Hinweis "vom Verein getragen — du zahlst {total}". CEO-Entscheidung. |
| M5 | MEDIUM | `messages/de.json:3967-3974` | Fee-Admin-Labels unuebersetzt ("Trade Fee", "Platform", "PBT", "bps"). | Admin-only, LOW-Todo post-Beta. |
| M6 | MEDIUM | `BuyConfirmModal.tsx:146, 219, 224, 232`; `BuyConfirmation.tsx:46, 52` | Display-Suffix "CR" fuer Credits — nirgends definiert. | Auf "Credits" (ausgeschrieben) oder konsequent via Label erklaert. |
| M7 | MEDIUM | `PlayerIPOCard.tsx:179` + IPO Toast de.json:2142 | Mischung "Credits" / "CR" / "$SCOUT". | Einheitlich "Credits", kein Ticker/Kuerzel. |
| L1 | LOW | `src/lib/scoutReport.ts:114` + `messages/de.json:1989` | i18n-Key `strengthTaktischerInvestor` enthaelt "Investor" (Display compliant, Key-Audit-Signal). | Umbenennen zu `strengthTaktischerTrader`. |
| L2 | LOW | `src/lib/services/trading.ts:155` | `throw new Error('Price exceeds maximum ({} $SCOUT)')` — englisch + $SCOUT-Ticker. Landet via C1 direkt im UI. | i18n-Key. Loest sich mit C1-Fix. |
| L3 | LOW | `messages/de.json:1145` `"clubSale": "Club Verkauf"` | Mischung DE+EN. TR:1145 korrekt "Kulüp Satışı". | "Vereinsverkauf" oder belassen. |
| L4 | LOW | `messages/de.json:2228` "Marktwert" | Grenzwertig finanziell, aber im Fussball etabliert. | Keine Aenderung. |

---

## Wording-Check

- 0 forbidden-words (Investment/ROI/Profit/Rendite/Dividende/Gewinn/Ownership/Anlage/Kryptowaehrung/Spieleranteil/Eigentumsanteil) in `src/features/market/**` + `src/components/player/detail/trading/**`.
- Disclaimer-Fundstellen (`legal.creditsContent`, `legal.dpcContent`) nutzen verbotene Woerter NUR in Verneinungsform ("keine Rendite", "keine Dividende") — korrekt.

## Fee-Split Check

| UI-Label | Soll (business.md) | Status |
|----------|--------------------|--------|
| Trading total 6% | ✅ | `market.feeInfoMarket` |
| Platform 3.5% | ✅ | `market.feeBreakdownPlatform` |
| PBT 1.5% | ✅ | `market.feeBreakdownPbt` |
| Club 1% | ✅ | `market.feeBreakdownClub` |
| IPO 10/5/85 | ⚠️ M4 (nicht dem User angezeigt) | `market.feeInfoIpo` |

## Geofencing

- `/market` via `<GeoGate feature="dpc_trading">` (MarketContent.tsx:113) ✅
- AR-4 Entry-Pages-Luecke bleibt (Journey #1 pending).

## Disclaimer-Coverage

| Entry-Point | Status |
|-------------|--------|
| MarktplatzTab | ✅ `MarktplatzTab.tsx:205` |
| PortfolioTab | ✅ `PortfolioTab.tsx:85` |
| IPOBuySection | ✅ `IPOBuySection.tsx:131` |
| **BuyConfirmModal** | ❌ H1 |
| **BuyConfirmation** | ❌ H2 |

---

## LEARNINGS (Drafts)

1. `buyError = buyMutError?.message` rendert Raw-Key → i18n-Key-Leak. common-errors.md sollte konkretes Beispiel mit `buyMutError?.message` als Anti-Pattern bekommen.
2. Modal mit Geld-Transaktion braucht eigenen TradingDisclaimer, auch wenn Parent einen hat (visuelle Ueberdeckung).
3. business.md sollte IPO-Begriff explizit regeln (erlaubt vs verboten — aktuell ambiguos).
4. `grep '\$SCOUT' messages/*.json` regelmaessig — jeder Treffer gegen Kontext pruefen.
