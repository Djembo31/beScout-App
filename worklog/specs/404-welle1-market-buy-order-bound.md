# Slice 404 — Welle 1.1: Markt-Tab Kauf order-gebunden („was du siehst = was du zahlst")

**Status:** SPEC · **Größe:** L · **Slice-Type:** UI (+ Hook/Service-Verkabelung) · **Scope:** CEO-approved (Welle-1-Mandat; Display-/Routing-Konsolidierung, KEINE RPC-/Money-Math-Änderung) · **Datum:** 2026-06-26

> Welle 1, Plan-Punkt **1.1 [CRITICAL]**. Audit Domäne 1: „von allem zwei" — 2 Kauf-UIs. Markt-Tab zeigt `floor`, bucht aber cheapest-foreign-order → Anzeige ≠ Abbuchung; qty hart 1.

---

## 1. Problem Statement

Der **Markt-Tab-Kauf** (`BuyConfirmModal` via `MarketContent`) zeigt den **Floor-Preis** (`resolveBuyPriceCents = prices.floor × 100`), bucht aber via `buy_player_sc` die **günstigste Fremd-Order** (`v_order.price`, `user_id != buyer`) zur Execution-Zeit. Diese divergieren, weil `floor_price` (a) **eigene** offene Orders einschließt und (b) auf `last_price`/`ipo` zurückfällt, wenn keine offene Order existiert — `buy_player_sc` aber NUR Fremd-Orders kauft (oder „Keine Angebote von anderen Usern verfügbar" wirft). Zusätzlich ist die Menge im Markt-Tab **hart auf 1** (`effectiveQty = isMarket ? 1`). Evidence: `mock2pro-audit.md` Domäne 1 CRITICAL ×2 + HIGH (`marketContent.priceCents.ts:39` + `BuyConfirmModal.tsx:69` + `MarketContent.tsx:278` + `TransferListSection.tsx:59-82`).

**Player-Detail (`BuyModal`) macht es richtig:** bindet Preis+Menge an `activeOrder = selectedOrder ?? cheapestForeignOrder` und kauft via `buy_from_order(orderId)` (order-gebunden) bzw. `buy_player_sc` (Fallback). Der Markt-Tab muss auf **denselben Pfad** konsolidieren.

**Betroffen:** jeder Markt-Tab-Schnellkauf. Money-Vertrauen (Anzeige lügt) = CRITICAL, auch wenn die RPC-Money-Math korrekt ist.

## 2. Lösungs-Design (Architektur)

**Eine order-gebundene Kauf-Pipeline, geteilte Order-Quelle.** Der Markt-Tab nutzt denselben per-Spieler-Order-Hook wie Player-Detail (`useSellOrders(playerId)` → `get_public_orderbook(playerId,'sell')`), resolved die günstigste **Fremd**-Order und kauft sie order-gebunden.

**Datenfluss neu (Markt-Kauf):**
```
Klick „Buy" (Liste) → pendingBuy{playerId,'market'}
  → MarketBuyConfirmContainer (NEU): useSellOrders(playerId)
      → cheapestForeign = orders.filter(!is_own && remaining>0).sort(price ASC)[0]
      → priceCents = cheapestForeign.price · orderId = cheapestForeign.id
      → maxQty = min(orderRemaining, floor(balance/price))
  → BuyConfirmModal (priceCents=Order-Preis, maxQty, orderId, qty-Selektor)
  → onConfirm(qty, orderId) → executeBuy(qty, orderId)
      → useBuyFromMarket{…, orderId}: orderId ? buyFromOrder : buyFromMarket
```
Kein Fremd-Order vorhanden → Modal-Empty-State (`priceCents<=0||maxQty<=0`, existiert bereits).

**Warum order-gebunden statt nur „Floor→cheapest-foreign anzeigen":** deterministisch (Plan 1.1). `buy_from_order` bucht exakt die angezeigte Order; verschwindet sie zwischen Render/Klick → klarer Reject („Order nicht mehr aktiv") statt stiller Preisabweichung.

**Shape-Normalisierung (Pflicht):** `buy_player_sc` → `{new_balance, price_per_dpc}`; `buy_from_order` → `{buyer_new_balance, price}`. Der gemeinsame `onSuccess` MUSS `result.new_balance ?? result.buyer_new_balance` lesen (sonst kein optimistisches Balance-Update beim order-bound-Pfad).

**Listen-Konsistenz:** `TransferListSection` aggregiert `agg.floor = MIN(order.price)` über **alle** Orders inkl. eigener → „Listed from"-Preis kann unter dem liegen, was der Kauf (nur Fremd) bucht. Fix: `is_own`-Orders aus der Aggregation ausschließen → Listenpreis = günstigste Fremd-Order = Kauf-Preis.

**Keine RPC-/Migration-/Money-Math-Änderung.** Nur UI-Display + Mutations-Routing.

## 3. Betroffene Files

| File | Aktion | Begründung |
|------|--------|------------|
| `src/features/market/components/shared/MarketBuyConfirmContainer.tsx` | NEU | Hooks-sicherer Wrapper: `useSellOrders` + Order-Auflösung, rendert BuyConfirmModal (ersetzt die IIFE in MarketContent) |
| `src/features/market/components/MarketContent.tsx` | EDIT | Buy-Block-IIFE → `<MarketBuyConfirmContainer>` (Hooks nicht in IIFE aufrufbar) |
| `src/features/market/components/shared/BuyConfirmModal.tsx` | EDIT | `orderId?`-Prop; Markt-qty-Selektor (kein `isMarket?1`-Lock); `onConfirm(qty, orderId?)` |
| `src/features/market/hooks/useTradeActions.ts` | EDIT | `executeBuy(qty, orderId?)` → `doBuy({…, orderId})` |
| `src/features/market/mutations/trading.ts` | EDIT | `useBuyFromMarket` Variablen `+orderId?`; mutationFn `orderId ? buyFromOrder : buyFromMarket`; `onSuccess` balance-Normalisierung |
| `src/features/market/components/marktplatz/TransferListSection.tsx` | EDIT | `is_own`-Orders aus `listings`-Aggregation ausschließen (Listenpreis = Kauf-Preis) |
| `src/features/market/mutations/__tests__/trading.test.ts` | EDIT | orderId-Routing → buyFromOrder; balance-Normalisierung |
| `src/features/market/**/__tests__` (BuyConfirmModal falls vorhanden) | EDIT | qty-Selektor + onConfirm-Signatur |

**Greppt:** `grep -rn "executeBuy\|onConfirm=\|BuyConfirmModal\|useBuyFromMarket" src/features/market/` · `grep -rn "is_own" src/features/market/components/marktplatz/`.

## 4. Code-Reading-Liste (Pflicht VOR Implementation) — ✅ erledigt

| File | Zweck | Befund |
|------|-------|--------|
| `components/player/detail/BuyModal.tsx` | Kanonisches order-bound Vorbild | `activeOrder = selectedOrder ?? cheapestForeign`; `activePriceCents`; `marketMaxQty = min(remaining, affordable)`; `onBuy(qty, selectedOrder?.id)` |
| `components/player/detail/hooks/usePlayerTrading.ts:222-262` | buyMut-Routing | `orderId ? buyFromOrder : buyFromMarket` (Vorbild für useBuyFromMarket) |
| `features/market/hooks/useTradeActions.ts` | Markt-Buy-State | `executeBuy(qty)` → `doBuy({playerId, quantity})` (kein orderId) |
| `features/market/components/MarketContent.tsx:273-302` | Buy-Modal-Mount | IIFE — kann keine Hooks; floorCents+maxQty=1 |
| `features/market/components/shared/BuyConfirmModal.tsx:69` | Markt-qty-Lock | `effectiveQty = isMarket ? 1` — zu entfernen |
| `lib/queries/misc.ts:263` + `lib/services/trading.ts:314-340` | Order-Quelle | `useSellOrders(playerId)` → `get_public_orderbook(playerId,'sell')` → `PublicOrder[]` (Sell ASC, mit `is_own`) |
| `lib/services/trading.ts:85-155 / 221-282` | Service-Shapes | `buyFromMarket`→`new_balance/price_per_dpc`; `buyFromOrder`→`buyer_new_balance/price` (Normalisierung nötig) |
| `features/market/components/marktplatz/TransferListSection.tsx:59-82` | Listen-Floor-Agg | `agg.floor = MIN(price)` inkl. eigener Orders (kein `is_own`-Filter) |
| `.claude/rules/trading.md` Floor-Block (S303/368c) | Floor-SSOT | Floor = `prices.floor` DB-Quelle; Client-Recompute verboten — aber Kauf-PREIS = konkrete Order (kein Floor-Recompute, sondern Order-Auswahl) |

## 5. Pattern-References

- `trading.md` „Display vs Charge bei eigener Order (S7-303 F-1)" — exakt dieser Bug; Lösung = Fremd-Order binden.
- `errors-frontend.md` „useSafeIdempotentMutation (S149-151)" — Money-Path-Mutation idempotent (bereits, bleibt).
- `errors-frontend.md` „Cross-Section-Coupling-Drift (S278)" — Listenpreis + Modalpreis dieselbe Quelle ziehen.
- Slice 403 (gerade) — `buy_from_order`/`buy_player_sc` sind jetzt beide idempotent; Routing wechselt nur den RPC, nicht das Idempotenz-Verhalten.
- `database.md` Floor-Block — Floor bleibt Anzeige im Listen-Kontext; Kaufpreis = Order-Preis (kein Widerspruch: Floor = „ab"-Preis, Kauf bindet die konkrete günstigste Fremd-Order).

## 6. Acceptance Criteria

```
AC-01: [HAPPY] Markt-Kauf zeigt den Preis der günstigsten Fremd-Order (nicht Floor).
  VERIFY: Playwright bescout.net /market Transferliste → „Buy" → Modal.
  EXPECTED: Modal „Preis pro SC" == günstigste Fremd-Order; „Gesamt" == Preis × qty.
  FAIL IF: Modal-Preis == prices.floor während cheapest-foreign abweicht.

AC-02: [WYSIWYP] Angezeigte Summe == abgebuchte Summe.
  VERIFY: echter Buy (qty 1) gegen bescout.net → Wallet-Delta == Modal-„Gesamt".
  EXPECTED: |Wallet-Delta| == totalCents des Modals.
  FAIL IF: Abbuchung != Anzeige.

AC-03: [QTY] Markt-qty-Selektor aktiv, an Order-Restmenge gebunden.
  VERIFY: Modal qty +/- bis maxQty; maxQty == min(orderRemaining, floor(balance/price)).
  EXPECTED: qty wählbar 1..maxQty; „Gesamt" skaliert; kein 3×Floor-Bug.
  FAIL IF: qty hart 1 ODER maxQty > Order-Restmenge.

AC-04: [ROUTING] Order-gebundener Kauf nutzt buy_from_order.
  VERIFY: vitest — useBuyFromMarket mit orderId → buyFromOrder aufgerufen; ohne → buyFromMarket.
  EXPECTED: korrektes RPC je orderId.
  FAIL IF: immer buy_player_sc.

AC-05: [EMPTY] Nur eigene Orders / keine Fremd-Order → Empty-State, kein Kauf.
  VERIFY: Spieler dessen einzige Orders dem User gehören → Modal.
  EXPECTED: „noTransferListings"-Empty (priceCents<=0||maxQty<=0), Buy-Button disabled.
  FAIL IF: Modal zeigt eigenen Order-Preis als kaufbar.

AC-06: [LIST-CONSISTENCY] Listenpreis == Modalpreis == Kaufpreis.
  VERIFY: Transferliste „Listed from" vs Modal „Preis pro SC" für denselben Spieler.
  EXPECTED: identisch (beide = günstigste Fremd-Order); eigene Orders zählen nicht.
  FAIL IF: Liste < Modal (Liste inkl. eigener Order).

AC-07: [REGRESSION] tsc 0 + vitest grün (market + player-detail Tests).
  VERIFY: npx tsc --noEmit · CI=true vitest run (market mutations + useTradeActions + BuyConfirmModal).
  EXPECTED: alle grün.
  FAIL IF: rot.

AC-08: [I18N] DE+TR Modal-Strings korrekt; kein Roh-Key.
  VERIFY: Playwright DE+TR, Console-Scan MISSING_MESSAGE.
  EXPECTED: 0 MISSING_MESSAGE.
  FAIL IF: Roh-Key sichtbar.
```

## 7. Edge Cases Table

| # | Flow | Case | Expected | Mitigation |
|---|------|------|----------|------------|
| 1 | Resolve | 0 Fremd-Orders (nur eigene) | Empty-State, kein Kauf | cheapestForeign=null → priceCents=0 → Modal-Empty |
| 2 | Resolve | useSellOrders lädt noch | Modal zeigt Loading/disabled | `isLoading` → Button disabled bis Order da |
| 3 | Qty | balance < 1 Order-Preis | maxQty=0 → Empty/disabled | `affordableQty=0` → maxQty=0 → Empty-Branch |
| 4 | Qty | qty > Order-Restmenge | gekappt auf maxQty | `Math.min(qty, maxQty)` |
| 5 | Race | Order zwischen Render+Klick gefüllt | buy_from_order Reject „Order nicht mehr aktiv" → Toast | RPC autoritativ; Error→mapErrorToKey |
| 6 | Stale | useSellOrders staleTime 1min | leicht veraltete Order; RPC-Guard fängt | wie Player-Detail (akzeptiert, RPC autoritativ) |
| 7 | IPO | source='ipo' | unverändert (ipo.price, kein orderId) | Container-Branch isIpo → alte Logik |
| 8 | List | Spieler nur mit eigenen Orders | fällt aus Transferliste (kein Fremd-Angebot) | `is_own`-skip in Aggregation → kein Listing-Eintrag |

## 8. Self-Verification Commands

```bash
npx tsc --noEmit
CI=true npx vitest run src/features/market/mutations/__tests__/trading.test.ts \
  src/features/market/hooks/__tests__ 2>/dev/null || true
grep -rn "executeBuy\|onConfirm" src/features/market/   # Signatur-Konsistenz
grep -n "is_own" src/features/market/components/marktplatz/TransferListSection.tsx
```
Post-Deploy (UI-Proof, Pflicht): Playwright gegen bescout.net (jarvis-qa) — Modalpreis==Listenpreis==Wallet-Delta (AC-01/02/06), qty-Selektor (AC-03), Empty (AC-05), DE+TR (AC-08).

## 9. Open-Questions

**Pflicht-Klärung:** keine — Richtung (order-gebunden) ist Plan 1.1; Vorbild (Player-Detail) etabliert; geteilte Order-Quelle (`useSellOrders`) existiert.

**Autonom-Zone (CTO):** Container-Struktur/Naming; ob `resolveBuyPriceCents` für Markt entfällt oder nur IPO behält; Test-Detailgrad.

**Nicht-Autonom (geklärt):** keine RPC-/Money-Math-Änderung; order-gebunden = Plan; kein neuer user-facing Geld-Begriff.

## 10. Proof-Plan

| Change-Typ | Proof |
|------------|-------|
| UI (Money-Display) | Playwright bescout.net post-Deploy: Modalpreis==Listenpreis==Wallet-Delta + qty-Selektor + Empty + DE/TR → `worklog/proofs/404-*.png` + Reconcile-Notiz `404-wysiwyp.txt` |
| Hook/Routing | `CI=true vitest run` (orderId→buyFromOrder, balance-Norm) → `worklog/proofs/404-vitest.txt` |
| Regression | `tsc --noEmit` 0 + `git diff --stat` |

## 11. Scope-Out

- **BuyConfirmation.tsx (Player-Detail Eigen-Order-Warn-Card) `estTotal = floorBsd×qty`** (Audit HIGH `:27,46`) → eigener Mini-Folge-Slice 405 (anderer Component, schmaler Trigger „User hat eigene Orders gelistet"; braucht activePriceCents-Threading). Hier NICHT, hält 404 fokussiert.
- **1.3 Club-Geld-Doppelschreibung** → eigener Slice (Money, erst verifizieren).
- **1.4 Orderbuch `orders` vs `offers`** → CEO-Architektur-Gabelung, separater Slice.
- **1.5 „BSD"→„Credits"-Fehlertexte / Rate-Limit-Vereinheitlichung** → Konsistenz-Cluster.
- **Vollständige Component-Verschmelzung BuyModal↔BuyConfirmModal** → bewusst NICHT: zwei Kontexte (Liste-Schnellkauf vs Detail-Panel) bleiben getrennte UIs, aber EINEN Daten-/Routing-Pfad. „Eine Pipeline", nicht „eine Komponente".

## 12. Stage-Chain (geplant)

```
SPEC → IMPACT (skipped: Consumer in §3 gegreppt; kein Cross-Domain, kein RPC) → BUILD → REVIEW (reviewer-Agent PFLICHT, Money-Trust-UI) → PROVE (vitest + post-Deploy Playwright) → LOG
```

## 13. Pre-Mortem

| # | Failure | Prob | Impact | Mitigation | Detection |
|---|---------|------|--------|------------|-----------|
| 1 | Hooks in IIFE → React-Crash | MED | hoch | Eigener Container-Component (Hooks at top) | tsc/Lint + Render-Test |
| 2 | order-bound onSuccess liest `new_balance` (undefined bei buyFromOrder) → Balance springt nicht optimistisch | MED | mittel | `new_balance ?? buyer_new_balance`-Norm | AC-02 Wallet-Delta + Test |
| 3 | Listenpreis-Exklusion bricht Spieler-mit-nur-eigenen-Orders aus Liste | LOW | niedrig (korrekt) | bewusst (Edge 8); EmptyState bleibt | AC-06 |
| 4 | Race: angezeigte Order weg → Reject statt Kauf | MED | niedrig | klarer Toast (besser als stille Preisabweichung); Plan-gewollt | AC + Edge 5 |
| 5 | qty-Selektor maxQty falsch (Orderbuch-Summe statt Order-Restmenge) → 3×Floor-Lüge zurück | MED | mittel | maxQty=Order-Restmenge (nicht Summe), exakt BuyModal-Muster | AC-03 |
| 6 | i18n: Markt-qty-Selektor neue Strings fehlen DE/TR | LOW | niedrig | bestehende `qtyLabel`/`increaseQty` wiederverwenden (kein neuer Key) | AC-08 |

---

## Compliance-Check
- Kein neuer user-facing Geld-Begriff; „Credits"/„CR" unverändert. Kein $SCOUT/Investment. TradingDisclaimer bleibt im Modal.
- Kein IPO-Wording berührt (IPO-Branch unverändert).

## Open Risiko
Größtes Risiko = Hooks-in-IIFE-Refactor (Container-Extraktion) + Balance-Shape-Normalisierung. Beide klar mitigiert (eigener Component, `??`-Coalesce). UI-Money-Trust → Reviewer + post-Deploy-Playwright Pflicht (statische Checks fangen Display-Wahrheit nie).
