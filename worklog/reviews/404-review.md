# Slice 404 Review — Welle 1.1: Markt-Tab order-gebundener Kauf

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-26 · **Scope:** Money-Trust-UI

## Verdict: PASS

Saubere, scope-treue UI/Routing-Konsolidierung. „Was du siehst = was du zahlst" real hergestellt; Balance-Shape-Normalisierung gegen Live-RPC (Migration 358) verifiziert. Keine RPC/Money-Math berührt, kein Floor-SSOT-Widerspruch, Hooks-sicher, IPO unverändert. **Mergebar.**

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NITPICK | `MarketBuyConfirmContainer.tsx` (affordable) | balance < Order-Preis → maxQty=0 → Empty-State „noTransferListings" statt „nicht genug Credits". **Identisch zu Player-Detail `BuyModal.marketMaxQty`** (= min(remaining, affordable)) → bewusst konsistent gelassen (Welle-1-Ziel), kein Money-Risiko. | Belassen (Konsistenz mit kanonischem Pfad). Falls später geheilt: in BEIDEN Pfaden zugleich. |
| 2 | INFO (pre-existing, out-of-scope) | `usePlayerTrading.ts:250,252,253` | Der **kanonische** Player-Detail-Order-Kauf liest `result.new_balance`/`result.price_per_dpc` — bei `buy_from_order` BEIDE `undefined` (RPC gibt `buyer_new_balance`/`price`) → kein optimistisches Balance-Update + Success-Toast „?". 404 erbt das NICHT (eigener `??`-Norm). | **Folge-Slice 405** (zusammen mit BuyConfirmation.tsx est-total): `usePlayerTrading.onSuccess` → `new_balance ?? buyer_new_balance`, `price_per_dpc ?? price`. |

## Streng geprüft (alle PASS)
1. **Cheapest-foreign**: `filter(!is_own && remaining>0).sort(price ASC)[0]`; maxQty an Order-`remaining` (nicht Orderbuch-Summe) → Pre-Mortem #5 mitigiert. Löst nebenbei S7-303-F-1 (eigene Order unterbietet Markt-Anzeige nicht mehr).
2. **Balance-Shape-Norm**: gegen Live-DB (D87) — `buy_player_sc`→`new_balance/price_per_dpc` (358:131), `buy_from_order`→`buyer_new_balance/price` (358:269); `new_balance ?? buyer_new_balance` korrekt. Success-Toast nutzt nur `count` → kein undefined-Leak im Markt-Pfad.
3. **Hooks-Sicherheit**: `useSellOrders`+`useMemo` at top des Containers; keine Hooks in IIFE (Pre-Mortem #1 gelöst). enabled-gated auf player.id.
4. **Loading/Empty**: `loading={!isIpo && isLoading}` → Spinner-Branch VOR Empty → kein Empty-Flash bei kaltem Orderbuch.
5. **Listen-Konsistenz**: `is_own`-Skip in Aggregation; nur-eigene-Orders-Spieler fällt aus Liste (Edge 8, korrekt). `agg.floor` ist Listen-intern, kein `prices.floor`-SSOT-Recompute (trading.md S303 unberührt).
6. **Race**: Order weg → `buy_from_order` „Order nicht mehr aktiv" → Toast (kein stiller Preis-Swap = Vorteil order-gebunden).
7. **IPO-Branch**: byte-gleich (kein useSellOrders-Fetch, kein orderId, IPO via useBuyFromIpo unberührt).

## AC-Coverage
AC-01..07 ✅ (tsc 0, vitest 298). AC-08 i18n = post-Deploy Playwright (offen, Proof-Plan-konform; keine neuen Keys → niedriges Risiko).

## Knowledge Capture (codifiziert)
errors-frontend.md S404: Multi-RPC-Routing in EINEM Mutation-Hook → `onSuccess` MUSS beide Return-Shapes normalisieren (`a ?? b`); Shape gegen Live-`pg_get_functiondef` verifizieren, nicht Service-JSDoc. + Folge-Slice 405 (usePlayerTrading-Shape-Bug, Finding #2).

**time-spent:** 18 min
