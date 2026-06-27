# Slice 416 — Welle 1.6 abschließen: Eigene-Order/Bid-Exclusion vereinheitlichen (SSOT-Helper)

**Slice-Type:** UI
**Größe:** S
**CEO-Scope:** Nein (reine Anzeige, kein Money-Flow; Architektur-Fork „1 Helper" von Anil approved 2026-06-27)

---

## 1. Problem-Statement (Evidence)

Welle 1.6 (eigene Orders aus Kauf-Anzeigen raus) ist erst zu 2/5 fertig (Slices 414/415, ask-Seite). Die **Best-Bid/Best-Ask-Ableitung ist über mehrere Komponenten dupliziert** (errors-frontend S414/S415: „von-allem-N") — jede rechnet den Wert selbst, mit unterschiedlichen Exclusion-Regeln. Das hat schon 2× zugeschlagen (414 fixte die falsche Surface, 415 fand's erst im Live-Walk, jarvis sah „BESTER ASK 200" = eigene Order).

**Offene Surfaces (gegen echten Code 2026-06-27 verifiziert):**

| # | Surface | Code | Status |
|---|---------|------|--------|
| 1 | Player-Detail „Marktplatz · sofort kaufbar"-Liste | `TradingTab.tsx:230-291` (rendert ALLE `allSellOrders` inkl. eigener, „you"-Badge) | ❌ ask-Seite offen |
| 2 | Player-Detail Orderbuch-Summary Best-Bid + Volumen-Balken | `OrderbookSummary.tsx:32-33,50` (`Math.max(...bids)` ohne own-Filter) | ❌ bid-Seite offen |
| 3 | Player-Detail QuickStats Best-Bid | `TradingTab.tsx:126` (`Math.max(...openBids.map(b=>b.price))`) | ❌ bid-Seite offen |
| 4 | **SellModal „Höchstes Gesuch" + Sofort-verkaufen-Liste** | `SellModal.tsx:105,123` (`Math.max(...openBids)` + Accept-Liste ohne own-Filter) | ❌ **vom Handoff übersehen** |

Surface 4 ist neu gefunden: wer eine Karte hält **und** ein eigenes Kaufgebot drauf hat, sieht sein eigenes Gebot als „höchste Nachfrage"; in der Accept-Liste würde Klick auf das eigene Gebot vom RPC abgelehnt (`accept_offer` guard: sender ≠ acceptor).

**Handoff-Korrektur (Fakt):** Handoff sagte „Bid-Seite braucht Type/Service-Change, weil `OfferWithDetails` kein `is_own` hat". **Falsch** — `OfferWithDetails extends DbOffer`, `DbOffer.sender_id` existiert (`types/index.ts:1778`), und `userId`/`uid` ist überall verfügbar. → client-seitiger Filter `sender_id !== userId`, **kein Type/Service/RPC-Change**. „PlayerHero bestBid" aus dem Handoff existiert nicht (grep leer) — gemeint war QuickStats (Surface 3).

## 2. Lösungs-Design

**Root-Cause (Anil-Entscheid): EIN SSOT-Helper für die Bid-Exclusion-Regel.** Die Regel die driftet ist `sender_id !== userId` (bid-Seite) — sie war nirgends umgesetzt und braucht userId-Kontext. Die ask-Seite-Regel (`!o.is_own`, server-projiziert) ist bereits in 5 Komponenten uniform inline und kann nicht abweichend „gerechnet" werden (boolean-Feld) → bleibt inline (surgical, kein Refactor von 5 funktionierenden Surfaces).

**Neuer Helper `src/lib/orderbook.ts` (pur, keine Server-Deps):**
```ts
export function excludeOwnBids<T extends { sender_id: string }>(bids: T[], userId?: string): T[] {
  return userId ? bids.filter(b => b.sender_id !== userId) : bids;
}
export function bestForeignBidCents(bids: { price: number; sender_id: string }[], userId?: string): number | null {
  const f = excludeOwnBids(bids, userId);
  return f.length > 0 ? Math.max(...f.map(b => b.price)) : null;
}
```
- Rückgabe **in cents** (callers machen `centsToBsd` fürs Display) → eine Einheit, kein Drift.
- `userId` undefined (logged-out) → keine eigenen Gebote → alle durchlassen (korrekt).

**Surface-Umstellung:**
- **3** `TradingTab:126`: `bestBid={bestForeignBidCents(openBids, userId)}` (QuickStats macht centsToBsd).
- **2** `OrderbookSummary`: neuer `userId?: string`-Prop; `const marketBids = excludeOwnBids(bids, userId)` → bestBid (`Math.max` cents → centsToBsd), bidVol, Volumen-Balken aus `marketBids`. Empty-State (`marketSells.length===0 && marketBids.length===0`).
- **4** `SellModal`: neuer `userId?: string`-Prop; „Höchstes Gesuch" via `bestForeignBidCents(openBids, userId)`, Accept-Liste + Count + Section-Guard aus `excludeOwnBids(openBids, userId)`.
- **1** `TradingTab` Sektion 7 (ask, inline-Standard wie 414/415): `const marketSellOrders = allSellOrders.filter(o => !o.is_own)` → Section-Guard, Count, slice/map; toten `isOwn`-Zweig (Z.256,261,267-272) entfernen.
- `PlayerContent.tsx`: `userId={uid}` an SellModal + OrderbookSummary erbt über TradingTab.

## 3. Betroffene Files

| File | Änderung |
|------|----------|
| `src/lib/orderbook.ts` | **NEU** — 2 pure Helper (SSOT Bid-Exclusion) |
| `src/components/player/detail/TradingTab.tsx` | Surface 3 (bestBid), 1 (sofort-kaufbar-Liste), OrderbookSummary userId-Pass |
| `src/components/player/detail/OrderbookSummary.tsx` | Surface 2 — userId-Prop + excludeOwnBids für bestBid/bidVol/Balken |
| `src/components/player/detail/SellModal.tsx` | Surface 4 — userId-Prop + Filter Höchstes-Gesuch/Accept-Liste |
| `src/app/(app)/player/[id]/PlayerContent.tsx` | `userId={uid}` an SellModal |
| `src/lib/__tests__/orderbook.test.ts` | **NEU** — Unit für Helper |
| `src/components/player/detail/__tests__/TradingTab.test.tsx` | own-sell-order nicht in „sofort kaufbar" + own-bid nicht in bestBid |

## 4. Code-Reading-Liste (erledigt VOR BUILD)
- ✅ `TradingTab.tsx` (Z.126 bestBid, Z.142 OrderbookSummary-Render, Z.230-291 Sektion 7) — alle 3 Surfaces lokalisiert.
- ✅ `OrderbookSummary.tsx` — `marketSells` (415) vorhanden, bid-Seite Z.32-33/50 ohne Filter; kein userId-Prop.
- ✅ `SellModal.tsx` Z.95-145 — `Math.max(...openBids)` Z.105 + Accept-Liste Z.123; **kein userId-Prop**.
- ✅ `PlayerContent.tsx` Z.234-333 — `uid` ist die Variable; TradingTab kriegt `userId={uid}`, SellModal NICHT.
- ✅ `types/index.ts:1778,1791` — `DbOffer.sender_id` + `OfferWithDetails extends DbOffer` → sender_id verfügbar, kein is_own nötig.
- ✅ `TradingQuickStats.tsx:20` — `bestBid` kommt in **cents** rein (`centsToBsd(bestBid)`) → Helper liefert cents.

## 5. Pattern-References
- **errors-frontend S414/S415** — Client-Derived-Value an N Stellen + Live-Render-Pflicht (DoD).
- **trading.md S7-303 F-1** — Eigene-Order-Exclusion ist Welle-1.6-Standard; `buy_*`/`accept_offer` matchen nur Fremd.
- **errors-frontend S405** — Floor/Anzeige schließt eigene Orders ein → unterschätzt Kosten.
- **CLAUDE.md §1** — Simplicity/Surgical: ask-Seite inline lassen (5 Surfaces nicht anfassen), nur driftende bid-Regel zentralisieren.

## 6. Acceptance Criteria
- **AC1** [HAPPY] `bestForeignBidCents([{price:200,sender_id:'u1'},{price:300,sender_id:'u2'}],'u1')===200` (eigenes 300 raus). VERIFY: orderbook.test.ts.
- **AC2** [EDGE] `bestForeignBidCents([], undefined)===null` und `excludeOwnBids(bids, undefined)===bids` (logged-out → alle). VERIFY: orderbook.test.ts.
- **AC3** [HAPPY] TradingTab „sofort kaufbar" rendert eigene Sell-Order (is_own) NICHT mehr; Count = Fremd-Orders. VERIFY: TradingTab.test.tsx.
- **AC4** [HAPPY] QuickStats bestBid ignoriert eigenes Gebot. VERIFY: TradingTab.test.tsx.
- **AC5** tsc 0 + `CI=true pnpm exec vitest run` betroffene Tests grün.
- **AC6** [LIVE] bescout.net (jarvis@Douglas): „sofort kaufbar"-Liste zeigt eigene @200-Order nicht; QuickStats/OrderbookSummary Best-Bid ohne eigenes Gebot. PROVE = Live nach Deploy.

## 7. Edge Cases
| Fall | Erwartet |
|------|----------|
| userId undefined (logged-out) | excludeOwnBids gibt alle zurück; kein Crash |
| Nur eigene Sell-Order, keine Fremd | Sektion 7 versteckt (`marketSellOrders.length===0`); Seite bleibt (allSellOrders>0) |
| Nur eigenes Gebot | bestBid null („–"), bidVol 0 |
| Eigenes + fremdes Gebot, eigenes höher | bestBid = fremdes |
| qty=1 fremd Order | normal kaufbar, gerendert |
| Helper auf leerem Array | null / [] |

## 8. Self-Verification Commands
- `grep -rn "Math.max(\.\.\.openBids\|Math.max(\.\.\.bids" src/` → 0 unzentralisierte Bid-Max (außer Helper).
- `grep -rn "bestForeignBidCents\|excludeOwnBids" src/` → 3 Consumer + Helper.
- `npx tsc --noEmit` · `CI=true pnpm exec vitest run src/lib/__tests__/orderbook.test.ts src/components/player/detail/__tests__/TradingTab.test.tsx`

## 9. Open-Questions
- ✅ CEO/Anil: Root-Cause-Helper vs inline → **Helper** (2026-06-27).
- Autonom-Zone (CTO): Helper-Datei-Ort (`src/lib/orderbook.ts`), ask-Seite inline lassen, toten isOwn-Zweig entfernen.

## 10. Proof-Plan
- vitest-Output `worklog/proofs/416-orderbook-tests.txt` (Helper + TradingTab).
- Live-Playwright nach Deploy `worklog/proofs/416-live-own-exclusion.txt/.png`.

## 11. Scope-Out
- KEIN Money-/RPC-/Schema-Change (reine Anzeige).
- ask-Seite-Surfaces (OrderDepthView/BuyModal/TransferListSection/MarketBuyConfirmContainer) NICHT refactoren — funktionieren, inline-`is_own` ist kein Drift-Risiko.
- Multi-Order-Sweep / Matching-Engine NICHT (S413 Scope-Out).
- OrderDepthView bid-Seite nutzt `orders`/CLOB (nicht offers, D112 Fork B) — separat, unberührt.

## 12. Stage-Chain (geplant)
SPEC → IMPACT (skipped: kein Service/RPC/Schema, nur UI-Props) → BUILD → REVIEW (reviewer-Agent, Trading-Display) → PROVE (vitest + Live) → LOG.

## 13. Pre-Mortem (optional S)
- „Helper in cents, Surface erwartet BSD" → QuickStats/SellModal verifiziert cents-in; OrderbookSummary macht centsToBsd nach Helper. ✓ in Code-Reading.
- „SellModal userId vergessen durchzureichen" → PlayerContent-Edit ist AC, grep self-verify.
- „toter isOwn-Zweig stehen lassen" → explizit entfernen, sonst dead code.
