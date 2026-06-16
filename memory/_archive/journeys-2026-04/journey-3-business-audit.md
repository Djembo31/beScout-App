---
name: Journey 3 — Business/Compliance Audit
description: Wording + Compliance + Geofencing Audit des Sekundaer-Trade-Flows (Market -> Player -> BuyOrder/Buy -> Holding-Update) fuer Operation Beta Ready Phase 2.
type: project
status: audit-complete
created: 2026-04-14
agent: business
---

# Journey #3 — Business/Compliance Audit (Sekundaer-Trade)

## Verdict: CONCERNS

**14 Findings:** 2 CRITICAL + 5 HIGH + 5 MEDIUM + 2 LOW.

Sekundaer-Trade-Flow ist im harten Kern **compliance-solide**: `buy_player_sc`/`buyFromOrder` RPCs verwenden SC-Naming, `mapErrorToKey` raeumt J1-i18n-Key-Leak auf, `GeoGate feature="dpc_trading"` greift auf `/market` mit TR=false. 6%-Fee-Breakdown ist im BuyConfirmModal sichtbar (J2-Fix).

**Aber:** mehrere Investment-Signale in User-facing Strings (AR-7 IPO-Rule analog erweitert werden muss auf "Marktwert steigt → Reward", "Handle clever"), `"Spieler kaufen"`-Wording suggeriert Ownership ueber Menschen (SPK/MASAK-red-flag), Disclaimer-Luecken in Sell/Offer/BuyOrder-Modals und MobileTradingBar, Fee-Transparenz fehlt im BuyOrderModal (Sekundaer-Limit-Order) und Placeholder-LimitOrderModal, Error-Leak via placeBuyOrder "Invalid quantity"/"Invalid price" (String statt i18n-Key).

---

## Findings

| # | Severity | File:Line | Issue | Fix | Business-Begruendung |
|---|----------|-----------|-------|-----|----------------------|
| **B1** | CRITICAL | `messages/de.json:4248` + `tr.json:4248` (`rewardsIntro`) | **Investment-Signal in User-facing String.** DE: *"Je hoeher der Marktwert von {player} steigt, desto hoeher die moegliche Belohnung als Scout Card Holder. Der Verein kann dich am Erfolg beteiligen."* TR analog mit *"...başarıya ortak edebilir."* Das Wording "am Erfolg beteiligen" / "başarıya ortak etmek" ist **wortwoertlich Gewinnbeteiligung** — genau das Element, das SPK (TR) und BaFin/MiCA (EU) als qualifiziertes Finanzinstrument einstufen. Rendered in `RewardsTab.tsx:182` MIT TradingDisclaimer darunter — aber der Disclaimer kann Investment-Versprechen nicht heilen. | DE: *"Die Hoehe moeglicher Community Success Fees haengt von der Markt-Bewertung ab. Auszahlung nach alleinigem Ermessen des Vereins, kein Anspruch, keine Garantie."* TR: *"Topluluk Başarı Ücretlerinin miktarı piyasa değerine bağlıdır. Ödeme kulübün takdirindedir, hak talebi veya garanti yoktur."* Phrase *"am Erfolg beteiligen"* / *"başarıya ortak etmek"* ELIMINIEREN. | business.md: *NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership, "guaranteed returns".* "Am Erfolg beteiligen" = Gewinn + Ownership in einem Satz. |
| **B2** | CRITICAL | `messages/de.json:4528` + `tr.json:4528` (`introPortfolioDesc`) | **Investment-Signal in Onboarding-Intro.** DE: *"Kaufe Scout Cards am Marktplatz. Wenn der Marktwert steigt, steigt deine Community Success Fee. Handle clever und baue dein Portfolio aus."* Kombination aus `Marktwert steigt`, `Community Success Fee steigt`, `Handle clever`, `Portfolio aus` = klassischer Trading-Pitch. TR identisch: *"Piyasa değeri yükselirse Community Success Fee'n artar. Akıllıca işlem yap ve portföyünü büyüt."* User sieht diesen String im Onboarding VOR der ersten Trade-Aktion. | DE: *"Sammle Scout Cards deiner Lieblingsspieler. Der Verein kann Scout Card Holder an Meilensteinen des Spielers mit einer optionalen Community Success Fee belohnen — nach alleinigem Ermessen, kein Anspruch."* TR analog. "Handle clever" + "Portfolio aus" streichen. | business.md: *NIEMALS: "Portfolio" als Investment-Signal, "Handle clever" suggeriert Spekulationstrategie.* Pilot-Content wird bei SPK/MASAK-Audit der erste Touchpoint sein. |
| **B3** | HIGH | `messages/de.json:289, 303, 735, 1268, 3157` (`welcomeBuyPlayers`, `buyFirstPlayer`, `buyPlayer`, `kaderBuyPlayers`, `buyDpc`) DE: *"Spieler kaufen"* / *"Ersten Spieler kaufen"* | **"Spieler kaufen" = Ownership ueber Menschen.** DE: `"Spieler kaufen"` rendert in Welcome-Screen, Onboarding-Checklist, Kader-Header, Empty-States. Impliziert Kauf einer **Person** — SPK/MASAK + europaeische DSGVO rot, weil Personenhandel (auch gamified) Signal fuer illegale Markt-Simulation. TR: `"Oyuncu satın al"` identisches Problem. | DE: *"Scout Card kaufen"* (wie bereits in `buyDpc:4129`) oder *"Erste Scout Card holen"*. TR: *"Scout Card al"* statt `"Oyuncu satın al"`. Alle 5 Keys (DE+TR) kohaerent umstellen. | business.md: *Scout Card = Digitale Spielerkarte, NICHT Eigentum, kein Spieleranteil.* Wording-Compliance: *Scout Card erwerben = sammeln* (LEARNINGS.md `tabelle: "Scout Card kaufen = investieren"`). |
| **B4** | HIGH | `src/components/player/detail/MobileTradingBar.tsx` (komplett, v.a. Zeilen 56-83) | **TradingDisclaimer FEHLT auf Mobile-Sticky-Bar.** Diese Bar ist der persistent sichtbare Trade-CTA-Bar auf der Player-Detail-Seite (Mobile). Enthaelt `{fmtScout(floor)} Credits`, `+/-%-Preisaenderung`, `{t('buy')}`/`{t('sellLabel')}`-Buttons. User triggert den Buy-Flow VIA diesen CTA — aber kein Disclaimer am sichtbaren Touchpoint. | Kein Disclaimer direkt auf Mobile-Bar noetig (UI-Space), aber `BuyModal` (via `onBuyClick`) MUSS Disclaimer RENDERN und das tut er bereits (Zeile 365). **ABER:** wenn User die `price-Change-Prozent-Anzeige` (`+{change24h}%`) sieht und direkt klickt, sieht er nur im Modal den Disclaimer. Add **Kurz-Disclaimer-Hint** (`variant="inline"` mit `tradingDisclaimerShort`) oberhalb der Preis-Zeile ODER verifiziere, dass `%-Anzeige` NICHT historische Rendite impliziert. | business.md: *"Disclaimers auf JEDER Seite mit $SCOUT/DPC".* Mobile-Bar = UI-Element das Preis + Prozent zeigt = Financial-Produkt-Signal. Minimum: ARIA-Label auf Prozent-Badge `"Bewertungsaenderung 24h, keine Anlagesignal"` + Disclaimer verifiziert im Modal. |
| **B5** | HIGH | `src/features/market/components/shared/BuyOrderModal.tsx` (komplett, `<Modal>...</Modal>` kein TradingDisclaimer in footer oder body) | **TradingDisclaimer FEHLT im BuyOrderModal (Kaufgesuch-Placement).** Modal schreibt `{ userId, playerId, quantity, maxPriceCents }` via `placeBuyOrder` → **Geld wird geescrowt** (lockedBalance). Das ist eine Geld-Transaktion ohne zweite Bestaetigungs-Stufe — Disclaimer MUSS vor Commit sichtbar sein (analog J2-H1-Fix fuer BuyConfirmModal). Zusaetzlich: **Fee-Transparenz fehlt komplett** — der User sieht nur `totalBsd`, `availableBsd`, `balanceAfter`. Die 3.5/1.5/1 Fee-Aufschluesselung (die das BuyConfirmModal zeigt) fehlt. | `<TradingDisclaimer variant="inline" />` zwischen `Cost summary` und `Info text`. Zusaetzlich: Fee-Breakdown analog zu `BuyConfirmModal.tsx:207-213` (`feeBreakdownPlatform`, `feeBreakdownPbt`, `feeBreakdownClub`) einblenden — auch wenn beim Kauf via Order der Verkaeufer die Fees zahlt, sollte der User es VOR dem Commit wissen. | business.md: *"Jede Seite mit $SCOUT/DPC MUSS TradingDisclaimer enthalten".* MiCA Art. 66: **Transparenz-Pflicht VOR Transaction-Commitment**. Kaufgesuch-Escrow = Transaction-Commitment. |
| **B6** | HIGH | `src/components/player/detail/LimitOrderModal.tsx:1-131` | **LimitOrderModal ist Placeholder-UI ohne TradingDisclaimer.** `handleSubmit = () => setSubmitted(true)` — nur UI-Mock, kein echtes Placement. Zeigt `limitOrderComingSoon`. **Compliance-Problem:** UI suggeriert ein Securities-Feature (Limit Buy/Sell mit Side-Toggle, Price/Qty-Inputs + "current floor"-Referenz) **ohne Disclaimer**. TR-User koennte glauben, dass Limit-Orders live sind (TR ist TIER_RESTRICTED = KEIN Trading; aber UI ist zugaenglich durch `MobileTradingBar onLimitClick`). | `<TradingDisclaimer variant="inline" />` oberhalb Submit-Button. **Zusaetzlich:** Pruefen ob Limit-Order-UI unter `<GeoGate feature="dpc_trading">` haengt oder entfernen bis Feature live ist. Evtl. Beta-Zeit auskommentieren/feature-flaggen. | business.md: *Phase 1 Feature-Set: Trading, Free Fantasy, Votes, Events, Scout Reports.* Limit-Orders sind Phase 1 Trading-Sub-Feature — wenn UI nicht finalisiert, NICHT user-facing zeigen. Risk: Review-Audit sieht Securities-Funktionalitaet, die nicht reguliert + nicht live = Doppel-Red-Flag. |
| **B7** | HIGH | `src/lib/services/trading.ts:457-461` + `placeBuyOrder` return | **Error-String-Leak `"Invalid quantity"` / `"Invalid price"`.** `placeBuyOrder` returned `{ success: false, error: 'Invalid quantity' }` — ROH-ENGLISCH-String, nicht i18n-Key. Consumer `usePlaceBuyOrder.onError` → `BuyOrderModal.tsx:73` → `setError(err instanceof Error ? err.message : tc('unknownError'))`. User sieht woertlich "Invalid quantity" auf Deutsch-Seite. (Konsistenz-Bruch mit `buyFromMarket` in gleichem File, das throw `new Error('invalidQuantity')` + `mapErrorToKey` nutzt.) | `throw new Error('invalidQuantity')` / `throw new Error('invalidPrice')` (Keys wie bei `buyFromMarket`). Consumer: `BuyOrderModal.tsx:73` muss von `setError(err.message)` auf `useTradeActions.ts`-Pattern (`mapErrorToKey` + `te(key)`) umstellen. | common-errors.md: *"i18n-Key-Leak via Service-Errors (2026-04-14, J1-Reviewer)".* Service wirft `Raw-String` → Caller zeigt unmittelbar ohne `t()` → Leak in User-Face. |
| **B8** | MEDIUM | `src/lib/services/trading.ts:163` | **Error-Literal mit `$SCOUT`-Ticker.** `throw new Error(\`Price exceeds maximum (${Math.floor(cap / 100)} $SCOUT)\`)` — Englisch + `$SCOUT`-Ticker + Interpolation. Landet in `SellModal` via `useTradeActions.handleSell.catch.err.message`. User sieht woertlich `"Price exceeds maximum (1000 $SCOUT)"`. | `throw new Error('maxPriceExceeded')` + Param-Forwarding ueber separaten Feld. Oder: Service resolvet Cap nicht, Caller zeigt via i18n-Key `maxPriceExceeded` (ist schon in Errors-Namespace). Ticker `$SCOUT` muss raus. | business.md: *`$SCOUT = "Platform Credits" (nicht Kryptowaehrung)`.* `$SCOUT` als Ticker signalisiert Kryptowaehrung. J2-M7 (gleiches Pattern in `$SCOUT vs CR vs Credits`) bestaetigt die Linie. |
| **B9** | MEDIUM | `src/components/player/detail/SellModal.tsx:258, 262, 266, 284` + `SellModal:88` (`listForPrice`) | **Display-Suffix `CR` ueberall in Sell-Flow.** Fee-Breakdown rendert `{fmtScout(gross)} CR`, `-{fmtScout(fee)} CR`, `{fmtScout(net)} CR`, Active Listings `{formatScout(order.price)} CR`. Nirgends im User-Face erklaert. J2-M6 identisch im BuyConfirmModal — J3 bestaetigt dass `CR` ueberall im Sekundaer-Flow ist. | Einheitlich `Credits` ausschreiben (nicht `CR`) oder einmal im Header der Summary-Box erklaeren *"Preise in Credits"*. | business.md: *$SCOUT = "Platform Credits" — konsistent.* J2-LEARNING: *"jeder Treffer gegen Kontext pruefen".* `CR` als Kuerzel ist mehrdeutig (Credits? Credit? Creature?), Richtung Trading-Pit-Slang. |
| **B10** | MEDIUM | `src/components/player/detail/OrderbookDepth.tsx` + `messages/de.json:4383` (`orderbookTitle: "Orderbuch"`) | **"Orderbuch" (DE) / "Emir defteri" (?) als User-facing Begriff.** `OrderbookDepth.tsx:40` rendert `{tp('orderbookTitle')}` auf Player-Detail. "Orderbuch" ist Securities-Terminologie (Boerse). Analog AR-7-Regel: **IPO-Vokabel** ist bereits fuer user-facing verboten. Orderbuch ist gleiche Kategorie (Kapitalmarkt-Begriff). | DE: *"Angebots-Tiefe"* oder *"Verkaufsangebote gestaffelt"* oder *"Preis-Uebersicht"*. TR pruefen. Feature `orderbookTitle`/`orderbookTooltip`/`orderbookPrice`/`orderbookCumulative` umbenennen in user-facing Keys (Code-intern `orderbook` darf bleiben). | business.md IPO-Regel (AR-7, Journey #2): *"Kuerzel 'IPO' ist Securities-Terminologie und triggert potenziell SPK/MASAK-Signale. User-facing: IMMER 'Erstverkauf'"*. "Orderbuch" faellt in identische Kategorie (Boersenterminologie). **Empfehlung: business.md um Orderbuch-Regel erweitern.** |
| **B11** | MEDIUM | `messages/de.json:4248-4269` + `tr.json:4248-4269` (RewardsTab-Strings) | **"Marktwert steigt" in 3 verschiedenen Strings (rewardsIntro, rewardLadder*, rewardLadderTooltip, rewardLadderDesc, introPortfolioDesc).** Wiederholtes `Marktwert steigt → Reward steigt` = klare Rendite-Erzaehlung. Auch wenn jedes mit `rewardDisclaimer` ("optionale Belohnung, kein Anspruch") abgeschlossen wird, summiert sich die Wiederholung zu implizit-garantiertem Upside. | `"Bewertung aendert sich"` statt `"Marktwert steigt"` (J1-LEARNINGS: `Kurs steigt → Bewertung aendert sich`). Oder: 1 zentraler Block mit Disclaimer-Claim, Rest der Strings reduziert/neutral. "Je hoeher... desto hoeher" Struktur eliminieren (= Rendite-Kausalitaet). | LEARNINGS.md: *`| Kurs steigt | Bewertung aendert sich |`.* Wiederholte Rendite-Aussage > 3x ist Investment-Pitch, nicht neutrale Info. |
| **B12** | MEDIUM | `messages/de.json:4524` (`fantasyDesc`: *"...und gewinne Credits-Preise!"*) + `messages/de.json:190` (`featureFantasyText`: *"...Die besten gewinnen Credits."*) | **"Credits-Preise gewinnen"** in Fantasy-Intro (user-onboarding, gesehen bevor Sekundaer-Trade). Compliance-grenzwertig: **Credits sind Platform Credits**, koennen aber via Sekundaer-Trade in andere Scout Cards konvertiert werden = impliziter Geldfluss. "Gewinnen" + "Preise" = Gluecksspiel-Signal. Phase-1 ist Free Fantasy — Paid Fantasy ist Phase-4 (NICHT BAUEN). Wording darf das nicht vorwegnehmen. | DE: *"Sammle Credits durch Platzierungen in den Events"* oder *"Erhalte Credits-Belohnungen nach Event-Ende"*. TR: `"ödüllerini kazan"` → `"Credits ödüllerini topla"`. | business.md: *Phase 4 (nach MGA): Paid Fantasy Entry, Turniere mit Preisen — NICHT BAUEN.* "Preise" + "gewinnen" darf in Phase 1 nicht suggeriert werden. Free Fantasy = Rewards, nicht Prizes. |
| **B13** | LOW | `messages/de.json:4530` (`introDimensionsDesc`: *"Trader: Handle am Markt..."*) | **"Trader" als User-Typ in Onboarding-Intro.** Rendering im Onboarding-Screen (siehe `introDimensions*`-Keys in Dimensions-Intro). "Trader" = Securities-Identitaet. TR identisch. Zwar nicht als Call-to-Action, aber als Rollen-Label. | DE: *"Sammler"* oder *"Scout"* statt `"Trader"`. Rollen-Bezeichnung umstellen. | LEARNINGS.md: *`"Trader-Identitaet" = Securities-Selbstbild`.* Milde Rolle-Klassifizierung, aber Systematik. Zusammen mit B11 = Stack von Investment-Framing. |
| **B14** | LOW | `src/components/player/detail/trading/BuyConfirmation.tsx:27, 44-47` | **Fee-Breakdown FEHLT im `BuyConfirmation`-Card (Duplikat-Modal von `BuyConfirmModal`).** `BuyConfirmation.tsx` rendert Preis + Balance + TradingDisclaimer — aber keine 3.5/1.5/1-Aufschluesselung. Der User klickt aus `BuyModal.tsx:227` in die "Own Orders Warning"-Variante und sieht dort nur `estCost` + `balanceAfter`. Inkonsistent mit `BuyConfirmModal.tsx:207-213`, wo der Breakdown bereits sichtbar ist. | Analog `BuyConfirmModal.tsx:201-212`: `feeInfoMarket` + `feeBreakdownPlatform`/`Pbt`/`Club` rendern. | Compliance-Konsistenz: User sieht in einem Buy-Flow-Modal den Breakdown, im anderen (Own-Orders-Skipped-Branch) nicht. AR-9-Pattern (J2-Fix) muss hier konsistent angewandt werden. |

---

## Wording-Check Summary

| Kategorie | Sekundaer-Trade-Flow (J3) | Status |
|-----------|---------------------------|--------|
| forbidden-words (hard) | Investment/ROI/Profit/Rendite/Dividende/Anlage in `src/features/market/**` + `src/components/player/detail/**` | OK 0 Treffer (hard-enforcement) |
| "Ownership"-Trigger | `"Spieler kaufen"` (5x), `dpcOwnership` (Code-intern erlaubt, aber als User-facing Display rendered) | FAIL B3 |
| Investment-Signal (soft) | `"am Erfolg beteiligen"`, `"Handle clever"`, `"Portfolio aus"`, `"Marktwert steigt...Fee steigt"` | FAIL B1, B2, B11 |
| Securities-Terminologie | `"Orderbuch"` (user-facing), `"Trader"` (Rollen-Label) | FAIL B10, B13 |
| Disclaimer-Coverage | BuyConfirmModal OK, BuyModal OK, SellModal OK, OfferModal OK, IPOBuySection OK, BuyConfirmation OK, MarktplatzTab OK, PortfolioTab OK, TradingTab OK | FAIL BuyOrderModal (B5), LimitOrderModal (B6), MobileTradingBar (B4) |
| Fee-Transparenz | BuyConfirmModal 3.5/1.5/1 OK, IPOBuySection 10/5/85 (AR-9) OK, SellModal 6%-Gesamt OK | FAIL BuyOrderModal (B5), BuyConfirmation (B14) |
| $SCOUT-Ticker in User-Face | `trading.ts:163` in Sell-Error-Path | FAIL B8 |
| i18n-Key-Leak | `useTradeActions` fix (J2-C1) OK, BuyOrderModal rohes `err.message` | FAIL B7 |

---

## Fee-Split Check

| Kontext | Soll (business.md) | Status |
|---------|--------------------|--------|
| Sekundaer-Buy 3.5/1.5/1 (via BuyConfirmModal) | 6% | `market.feeInfoMarket` + 3 breakdown-keys OK |
| Sekundaer-Sell 6% total (via SellModal) | 6% | `playerDetail.feePercent` + `gross`/`net` OK |
| Kaufgesuch (BuyOrderModal) | user-facing keine Fee-Info | **B5 FEHLT** |
| Own-Orders-Confirmation (BuyConfirmation) | unvollstaendig | **B14 FEHLT** |

---

## Geofencing Check

| Tier | Land | Feature `dpc_trading` | Sekundaer-Trade |
|------|------|----------------------|-----------------|
| FULL | Rest EU (NL/BE/IT/ES) | TRUE | OK |
| CASP | EU streng | TRUE | OK |
| FREE | DE/FR/AT/UK | FALSE | OK korrekt geblockt |
| RESTRICTED | **TR** | FALSE | OK korrekt geblockt via `<GeoGate feature="dpc_trading">` in `MarketContent.tsx:113` |
| BLOCKED | USA/CN/OFAC | FALSE | OK korrekt geblockt |

**Code-Verifikation:**
- `src/lib/geofencing.ts:66-73`: `dpc_trading: { full: true, casp: true, free: false, restricted: false, blocked: false }` — korrekt
- `GeoGate` umhuellt gesamten Market-Content — OK Sekundaer-Trade-Flow wird fuer TR blockiert
- **ABER:** Player-Detail-Seite (`/player/[id]`) scheint KEINEN GeoGate zu haben — MobileTradingBar + BuyModal + SellModal + OfferModal + LimitOrderModal sind dort sichtbar. TR-User kann Player-Detail OEFFNEN, Buttons klicken (Modal oeffnet), dann greift Defense-in-Depth (RPC-Fehler). User-Experience = defaced, aber nicht Compliance-Bruch, da RPC + `isRestrictedFromTrading` defense greifen.

**Empfehlung (Out-of-Scope J3, als Follow-up flaggen):**
- Player-Detail-Page `/player/[id]` sollte `<GeoGate feature="dpc_trading">` um alle Trade-Affordances (MobileTradingBar, TradingTab, Modals) bekommen, ODER die Buttons `disabled={tier === 'restricted' || tier === 'free' || tier === 'blocked'}` setzen.
- Nicht als Finding in J3, weil Sekundaer-Trade-Flow formal correct geblockt wird. Als J-Journey-uebergreifendes Item.

---

## Disclaimer-Coverage Matrix (Sekundaer-Trade-Entries)

| Modal / Page | Status | Fix |
|--------------|--------|-----|
| `MarktplatzTab.tsx:205` | OK `variant="card"` | — |
| `PortfolioTab.tsx:85` | OK `variant="card"` | — |
| `BuyConfirmModal.tsx:245` | OK `variant="inline"` (J2-H1-Fix) | — |
| `BuyModal.tsx:365` | OK `variant="inline"` default | — |
| `SellModal.tsx:90` | OK `variant="inline"` in footer | — |
| `OfferModal.tsx:40` | OK `variant="inline"` in footer | — |
| `IPOBuySection.tsx:131` | OK `variant="inline"` | — |
| `BuyConfirmation.tsx:59` | OK `variant="inline"` | — |
| `TradingTab.tsx:103, 477` | OK `variant="card"` doppelt | — |
| `RewardsTab.tsx:182` | OK `className="mt-3"` | — |
| **`BuyOrderModal.tsx`** | FAIL **B5 — FEHLT** | Add `<TradingDisclaimer variant="inline" />` |
| **`LimitOrderModal.tsx`** | FAIL **B6 — FEHLT** | Add `<TradingDisclaimer variant="inline" />` oder Feature-flag ausblenden |
| **`MobileTradingBar.tsx`** | FAIL **B4 — FEHLT** (impliziert via BuyModal, aber Preis+Prozent direkt sichtbar) | Optional short Hint |

---

## LEARNINGS (Drafts fuer Anil-Review)

1. **Orderbuch-Regel erweitern** (analog AR-7 IPO-Regel): User-facing `"Orderbuch"`/`"Orderbook"` ist Securities-Terminologie. DE `"Angebots-Tiefe"` / `"Verkaufsangebote gestaffelt"`. TR pruefen. business.md erweitern: *Kapitalmarkt-Terminologie-Regel (Orderbuch, Trader, Position, Portfolio als Trade-Aktivitaet).*
2. **"Spieler kaufen"-Systemfehler:** 5 verschiedene Message-Keys haben `"Spieler kaufen"` / `"Oyuncu satın al"`. Das ist nicht einfach "noch ein String", sondern ein Grundfehler in der Produkt-Sprache. Empfehlung: Glossary-Entry `"NIE: Spieler kaufen / Oyuncu satın al — IMMER: Scout Card kaufen / Scout Card al"`.
3. **Investment-Signal-Sweep:** B1+B2+B11 sind alle "Marktwert steigt → Reward steigt"-Varianten. Empfehlung: Regex-Audit `grep -i "Marktwert steigt\|piyasa değeri artınca\|başarıya ortak\|am Erfolg beteilig"` in CI/Pre-Commit Hook einbauen.
4. **`"Preise gewinnen"`-Trigger (Fantasy):** Phase 1 Free Fantasy darf nicht "Preise gewinnen" framen. common-errors.md-Entry: *"'gewinnen' + 'Preise' Kombi = Gluecksspiel-Signal, Phase 1 nicht user-facing verwenden. `t('event.rewards')` statt `t('event.prizes')`."*
5. **Service-Error-Normalization:** `placeBuyOrder` ist noch auf `{ success: false, error: 'Invalid quantity' }`-Pattern (J1-pre-refactor). `buyFromMarket` im gleichen File ist bereits migriert zu `throw new Error('invalidQuantity')`. Empfehlung: Audit `grep -n "return.*error:.*'" src/lib/services/trading.ts` → alle identifizieren, in throw-Pattern migrieren + Consumer-Fix (`BuyOrderModal` → `mapErrorToKey`).
6. **Kapitalmarkt-Glossar-Erweiterung business.md:**
   - "IPO" → "Erstverkauf" (AR-7 schon da)
   - "Orderbuch" → "Angebots-Tiefe" (B10, NEU)
   - "Trader" (als User-Rolle) → "Sammler" / "Scout" (B13, NEU)
   - "Portfolio" (als Invest-Objekt) → "Sammlung" / "Kader" (B2, NEU)
   - "Handle clever" → "Sammle clever" / streichen (B2, NEU)
   - "am Erfolg beteiligen" → streichen, "optionale Community Success Fee" (B1, NEU)
7. **LimitOrder-Feature-Flag:** Mock-UI ohne Disclaimer + Securities-Optik ist Compliance-Risiko. Entweder finalisieren + unter `<GeoGate>` + mit Disclaimer, oder feature-flaggen und nicht rendern bis live.

---

## Severity-Summary

- **2 CRITICAL** (B1, B2): Investment-Signale in Beta-sichtbaren Strings. Beta-Blocker, muss Pre-Launch gefixt werden.
- **5 HIGH** (B3, B4, B5, B6, B7): Ownership-Wording + Disclaimer-Luecken + Service-Error-Leak. Hot-Fix vor 50-Mann-Onboarding.
- **5 MEDIUM** (B8, B9, B10, B11, B12): $SCOUT-Ticker-Leak, CR-Kuerzel, Orderbuch-Wording, wiederholte Investment-Signale, Fantasy-"Preise". Bis Welle 2 fix.
- **2 LOW** (B13, B14): "Trader"-Rolle, Fee-Breakdown-Inconsistency. Post-Beta.
