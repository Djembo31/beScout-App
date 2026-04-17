# Slice 033 — Money-Unit-Drift Audit + Fix (P0 Hot-Fix)

**Groesse:** M · **CEO-Scope:** JA (Money/Display-Drift) · **Typ:** P0 Bug-Fix + Audit

## Ziel

Sicherstellen dass alle Geldbetraege in der UI und alle UI→RPC-Conversions die korrekte Einheit (BSD/CR vs cents) verwenden. Den von Slice 032 Flow 5 entdeckten BuyConfirmModal-Display-Drift fixen UND alle aehnlichen Stellen sweepen, damit kein User durch falsche Anzeige getaeuscht wird.

## Bug-Beweis (Slice 032 Flow 5)

| Quelle | Wert |
|--------|------|
| `orders.price` (DB) | 1060 cents |
| Marktplatz-Liste | "10,6" (= 10,60 CR — korrekt) |
| BuyConfirmModal "Preis/SC" | "0,11 CR" ❌ (Faktor 100 zu klein) |
| RPC `buy_player_sc` | wuerde 1060 cents = 10,60 CR abziehen |

**Mismatch:** UI versprach 0,11 CR, RPC haette 10,60 CR abgebucht. Aktuell nur durch separaten RPC-Crash (Bug #2 = `transactions_type_check`) maskiert. Sobald Bug #2 gefixt ist, wird Display-Drift live-schaedlich.

## Root Cause

`src/features/market/components/MarketContent.tsx:223`:
```ts
const floorCents = isIpo && ipo
  ? ipo.price                                                 // ✓ cents (DB)
  : (player.listings.length > 0
      ? Math.min(...player.listings.map(l => l.price))        // ❌ BSD/CR, behandelt als cents
      : Math.round((player.prices.floor ?? 0) * 100));        // ✓ cents
```

`Listing.price` wird in `src/lib/queries/enriched.ts:65` mit `centsToBsd(o.price)` gefuellt → ist **BSD/CR**, nicht cents. Das `Math.min(...)`-Result wird als `priceCents` an `BuyConfirmModal` gegeben.

## Audit-Scope

1. **Alle Konsumenten von `listing.price`** (grep `listings.map(l => l.price)`) — auf cents-vs-BSD-Drift pruefen
2. **Alle Konsumenten von `player.prices.floor` / `lastTrade` / `ipoPrice`** — Type ist BSD (per `dbToPlayer`), aber wird manchmal als cents weitergegeben?
3. **Alle Stellen die `* 100` oder `/ 100` machen ausserhalb von `centsToBsd`** — manuelle Konversionen pruefen
4. **Alle RPC-Aufrufe `buy_*`, `place_*_order`, `create_offer`** — werden cents (DB-Format) gepasst?
5. **Type-Hardening:** Listing.price-Field in `src/types/index.ts` umbenennen oder mit JSDoc klar markieren als BSD

## Acceptance Criteria

1. Marktplatz-Listing-Preis === BuyConfirmModal-Preis (gleiche Anzeige)
2. BuyConfirmModal "Danach"-Wert === DB-Wallet-Balance nach Buy-Try
3. Zero weitere Stellen mit `Math.min(...listings.price)` als cents-Argument
4. Unit-Test in `__tests__` verriegelt floorCents-Kontrakt
5. Live-QA auf bescout.net mit min-1-SC-Buy: Modal-Preis vs Wallet-Decrement matchen

## Proof-Plan

- `worklog/proofs/033-bug-trace.txt` — DB-Order vs UI-Display vs RPC-Read (vorher/nachher)
- `worklog/proofs/033-grep-audit.txt` — alle Treffer der Audit-Greps
- `worklog/proofs/033-buymodal-fixed.png` — BuyConfirmModal nach Fix mit korrektem Preis
- `worklog/proofs/033-mutations.txt` — Live-Buy auf bescout.net: Wallet vorher/nachher matched Modal
- `worklog/proofs/033-tsc-vitest.txt` — tsc + Tests gruen

## Scope-Out

- `transactions_type_check` Fix (`'buy'` → `'trade_buy'`) — separater Slice 034
- `trade_refresh` Trigger-Auth-Bug — separater Slice 035
- `sync_event_statuses` permission denied — separater Slice 036
- Restliche Slice-032-Mutating-Flows — nach 034/035 weitergefuehrt

## Risiken

- Audit findet mehr Drift-Stellen als erwartet → Slice waechst zu L. Bei mehr als 5 Sites: aufteilen.
- Type-Refactor (Listing.price umbenennen) ist breaking change in 17+ Files → defer als Scope-Out, nur JSDoc-Annotation hinzufuegen.
