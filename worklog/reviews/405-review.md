# Slice 405 Review — Welle 1.1: Player-Detail Order-Kauf Shape-Norm + BuyConfirmation est-total

**Reviewer:** Cold-Context reviewer-Agent · **Datum:** 2026-06-27 · **Scope:** Money-Trust-UI (Money byte-identisch)

## Verdict: PASS

Chirurgischer, contract-treuer Zwei-Bug-Fix im kanonischen Kaufpfad. Beide Bugs (Order-Shape-Normalisierung + est-total aus gebundenem Order-Preis) korrekt gelöst, `??`-Priorität wasserdicht (Markt-zuerst), Money byte-identisch (kein RPC/Migration/Service-Body), IPO-Auslassung sachlich richtig (single-RPC), Tests sind echte Regression-Guards die mit dem alten Code failen. **Mergebar.**

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | NIT | `usePlayerTrading.ts:255-260` | `optimisticallyAddHolding(…, priceCents ?? 0)` — nur der (per RPC-Contract unmögliche) Doppel-undefined-Fall (`price_per_dpc` UND `price` fehlen) fällt auf avg_buy_price 0. Status quo, kein Regress. | Keine — RPC garantiert `price` bei success; `?? 0` ist safe last-resort, im Edge-Case-Table dokumentiert. |
| 2 | INFO | Spec §3/§4 Pfad-Notiz | Spec nannte einmal `trading/BuyModal.tsx`; tatsächlicher Pfad `detail/BuyModal.tsx`. Diff landete im richtigen File. | Keine — kosmetisch. |

## Streng geprüft (alle PASS)
1. **`??`-Priorität BEIDE Pfade**: Markt zuerst (`new_balance`/`price_per_dpc`), Order fällt durch (`buyer_new_balance`/`price`). `??` (nicht `||`) schützt legitimen `new_balance===0` (Wallet leergekauft). tsc-sicher via TradeResult (alle 4 Felder `?:number`). = S404-Pattern auf kanonischen Pfad angewandt.
2. **Money byte-identisch**: kein `supabase.rpc`/Service-Body/Migration; `mutationFn` unverändert; RPCs bleiben autoritativ.
3. **Bug-B Resolve**: `userFilteredOrders` ist `!is_own` + preis-sortiert → `cheapestOrder[0]` = was `buy_player_sc` bucht. Kein Floor-SSOT-Recompute (liest nur `order.price`). Rundungs-Beweis: `estTotalCents = round(priceBsd*100)*qty = price*qty` byte-exakt zur RPC-Per-Unit-Charge.
4. **IPO-Buy onSuccess unverändert KORREKT**: `ipoBuyMut` ruft nur `buyFromIpo` (single-RPC, `new_balance`/`price_per_dpc` BuyFromIpoResult ipo.ts:31/33) → kein Dual-Routing, S404-Regel triggert nicht. Auslassung richtig.
5. **Tests echte Guards**: Bug-A-Test mockt echte Order-Shape `{buyer_new_balance:333, price:77}` → asserted `setWalletBalance(…,333)` + Toast `not.toContain('?')` (failt mit altem Code). Bug-B Recompute-Test `priceBsd=250→750 CR` beweist kein Floor-Hardcode.
6. **Edge/Callsites**: grep nur 4 Files berühren BuyConfirmation (BuyModal einziger Renderer); Race → cheapest-Fallback, RPC autoritativ; RPC-Drift → `!= null` false, kein Crash.

## Positive
- S404-Pattern wiederverwendet statt neu erfunden; `??` statt `||` (0-Balance-Schutz); semantik-ehrlicher Prop-Rename mit S7-303-F-1-JSDoc; Recompute-Test testet Verhalten nicht festen Wert.

## Knowledge Capture
errors-frontend.md S404 deckt die Klasse ab + nennt 405 als Folge-Slice → im LOG ergänzen „405: Player-Detail-Pfad geschlossen, kanonische letzte Stelle behoben" (Flywheel-Abschluss).

**time-spent:** 9 min
