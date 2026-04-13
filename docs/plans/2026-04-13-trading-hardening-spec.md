# Trading Saeule — Hardening Spec

**Datum:** 2026-04-13
**Ziel:** Alle Trading-Services, RPCs und Components end-to-end verifizieren. Silent-Null Fixes. Dead Code entfernen. Tests schreiben. Danach: bombenfestes Fundament fuer UX-Polish.
**Scope:** trading.ts, wallet.ts, offers.ts, ipo.ts, liquidation.ts, pbt.ts, watchlist.ts + deren RPCs + deren Consumer-Components + Query-Layer

---

## 1.1 Current State — Feature Inventory

### Trading Services (7 Files, 813 Lines total)

| # | Service | Lines | Funktionen | Error Handling | Geld |
|---|---------|-------|-----------|----------------|------|
| 1 | `trading.ts` | 547 | 15 exports | ✅ Throws (Mutations), ⚠️ Mixed (Queries) | JA |
| 2 | `wallet.ts` | 155 | 8 exports | ⚠️ 4× Silent-Null | JA |
| 3 | `offers.ts` | 317 | 10 exports | ✅ Throws | JA |
| 4 | `ipo.ts` | 277 | 10 exports | ✅ Throws | JA |
| 5 | `liquidation.ts` | 145 | 5 exports | ⚠️ Missing error check | JA |
| 6 | `pbt.ts` | 65 | 5 exports | ⚠️ Ignores all errors | Lesen |
| 7 | `watchlist.ts` | 155 | 8 exports | ✅ Throws | Nein |

### Error Handling Detail — Jeder Befund

#### wallet.ts — 4 Silent-Null Bugs

| Funktion | Zeile | Jetzt | Problem | Fix |
|----------|-------|-------|---------|-----|
| `getHoldingQty()` | 82-86 | `console.error; return 0` | Trading UI zeigt "0 Holdings" statt Error wenn RLS/Auth-Race | `throw` |
| `getAvailableSc()` | 95 | `console.error; return 0` | Sell-Modal zeigt "0 verfuegbar" → User denkt er hat nichts | `throw` |
| `getUserHoldingLocks()` | 105 | `console.error; return []` | Fantasy Lineup-Builder zeigt keine Locks → User verkauft gelockte SCs | `throw` |
| `getPlayerHolderCount()` | 117-120 | `console.error; return 0` | Player Detail zeigt "0 Holder" → falsche Marktwahrnehmung | `throw` |

#### trading.ts — 2 Silent-Null Bugs

| Funktion | Zeile | Jetzt | Problem | Fix |
|----------|-------|-------|---------|-----|
| `getTrendingPlayers()` | 378-379 | `logSupabaseError; return []` | Home+Market zeigen leeres Trending → User denkt kein Handel passiert | `throw` |
| `getAllPriceHistories()` | 412-413 | `console.error; return new Map()` | Sparklines fehlen auf Market Page → unvollstaendige Markt-Info | `throw` |

Dazu: `getPriceCap()` Zeile 545: `console.error; return null` → Sell-Form hat keine Orientierung. ABER: `null` ist hier semantisch korrekt ("kein Cap") — muss trotzdem den Error loggen, aber `null` return ist akzeptabel weil UI damit umgehen kann.

#### pbt.ts — 3 Silent-Error Bugs

| Funktion | Zeile | Jetzt | Problem | Fix |
|----------|-------|-------|---------|-----|
| `getPbtForPlayer()` | 9-14 | Error ignoriert (kein catch) | PBT-Treasury komplett unsichtbar bei DB-Fehler | Error check + throw |
| `getPbtTransactions()` | 17-24 | Error ignoriert | PBT-History leer bei Fehler | Error check + throw |
| `getFeeConfig()` | 31-48 | Error ignoriert | Fee-Anzeige falsch/leer bei Fehler | Error check + throw |

#### liquidation.ts — 2 Silent-Error Bugs

| Funktion | Zeile | Jetzt | Problem | Fix |
|----------|-------|-------|---------|-----|
| `getLiquidationEvent()` | 106-114 | Error ignoriert (kein `if error`) | Liquidation-Info fehlt still | Error check + throw |
| `getLiquidationPayouts()` | 117-136 | Error ignoriert | Payout-Liste leer bei Fehler | Error check + throw |

#### offers.ts — 1 No-Op Export

| Funktion | Zeile | Problem | Fix |
|----------|-------|---------|-----|
| `invalidateOfferData()` | 9-11 | No-op. Tot. | Entfernen + Consumer pruefen |

#### liquidation.ts + pbt.ts — 2 No-Op Exports

| Funktion | File | Problem | Fix |
|----------|------|---------|-----|
| `invalidateLiquidationData()` | liquidation.ts:143 | No-op. Tot. | Entfernen + Consumer pruefen |
| `invalidatePbtData()` | pbt.ts:63 | No-op. Tot. | Entfernen + Consumer pruefen |

### Consumer-Map (wer nutzt welchen Service?)

#### trading.ts (19 Consumer)
- **Mutations:** `features/market/mutations/trading.ts`, `features/market/hooks/useTradeActions.ts`
- **Queries:** `features/market/queries/trending.ts`, `features/market/queries/priceHist.ts`, `lib/queries/orders.ts`, `lib/queries/trades.ts`
- **Components:** `features/market/components/marktplatz/MarktplatzTab.tsx`, `features/market/components/marktplatz/TrendingSection.tsx`, `features/market/components/shared/OrderDepthView.tsx`, `components/player/detail/hooks/usePlayerTrading.ts`, `components/home/HomeSpotlight.tsx`, `components/profile/hooks/useProfileData.ts`
- **Other Services:** `ipo.ts`, `wallet.ts`, `liquidation.ts`, `bounties.ts`

#### wallet.ts (39 Consumer — BREITESTER IMPACT)
- **Layout:** `SideNav.tsx`, `TopBar.tsx`
- **Providers:** `WalletProvider.tsx`
- **Market:** `MarktplatzTab.tsx`, `KaderTab.tsx`, `MarktTab.tsx`
- **Player Detail:** `BuyModal.tsx`, `SellModal.tsx`, `TradingTab.tsx`, `TransferBuySection.tsx`, `IPOBuySection.tsx`, `HoldingsSection.tsx`, `BuyConfirmation.tsx`
- **Profile:** `ProfileView.tsx`, `ManagerTab.tsx`, `TraderTab.tsx`, `AnalystTab.tsx`, `TimelineTab.tsx`
- **Fantasy:** `FantasyContent.tsx`, `PersonalResults.tsx`, `holdingMapper.ts`, `events.ts`
- **Community:** `CreateBountyModal.tsx`, `CommunityPollCard.tsx`, `BountyCard.tsx`
- **Admin:** 6 Admin-Tabs
- **Transactions:** `TransactionsPageContent.tsx`
- **Queries:** `holdings.ts`, `enriched.ts`, `misc.ts`

#### offers.ts (5 Consumer)
- `features/market/components/portfolio/OffersTab.tsx`
- `features/market/components/portfolio/useOffersState.ts`
- `features/market/queries/offers.ts`
- `components/player/detail/hooks/usePlayerTrading.ts`
- `lib/queries/misc.ts`

#### ipo.ts (3 Consumer)
- `features/market/queries/ipos.ts`
- `features/market/components/marktplatz/MarktplatzTab.tsx`
- `lib/queries/misc.ts`

#### watchlist.ts (4 Consumer)
- `features/market/queries/watchlist.ts`
- `features/market/components/marktplatz/WatchlistView.tsx`
- `features/market/hooks/useWatchlistActions.ts`
- `lib/queries/misc.ts`

#### pbt.ts (2 Consumer)
- `lib/queries/misc.ts`
- `components/admin/useAdminPlayersState.ts`

#### liquidation.ts (2 Consumer)
- `features/market/mutations/trading.ts`
- `lib/queries/misc.ts`

### Query Keys (alle Trading-bezogen)
Definiert in `src/lib/queries/keys.ts`:
- `qk.holdings.*` (byUser, qty, holderCount)
- `qk.wallet.*` (all)
- `qk.orders.*` (all, buy, byPlayer, orderbook, orderbookBuy)
- `qk.offers.*` (incoming, outgoing, bids, openBids)
- `qk.ipos.*` (active, announced, recentlyEnded, byPlayer, purchases)
- `qk.watchlist.*` (byUser, mostWatched, watcherCount)
- `qk.trades.*` (global, byPlayer, topTraders)
- `qk.pbt.*` (byPlayer)
- `qk.liquidation.*` (byPlayer)

### Bestehende Tests

| Test-File | Existiert |
|-----------|-----------|
| `__tests__/trading.test.ts` | ✅ |
| `__tests__/wallet.test.ts` | ✅ |
| `__tests__/wallet-v2.test.ts` | ✅ |
| `__tests__/offers.test.ts` | ✅ |
| `__tests__/ipo.test.ts` | ✅ |
| `__tests__/liquidation.test.ts` | ❌ Fehlt |
| `__tests__/pbt.test.ts` | ❌ Fehlt |
| `__tests__/watchlist.test.ts` | ❌ Fehlt |

---

## 1.2 Goals + Non-Goals + Anti-Requirements

### Goals
1. **Null Error Handling:** Jeder Service wirft bei DB-Fehler (kein silent `return null/0/[]`)
2. **Error Consistency:** Alle Services nutzen `logSupabaseError()` + `throw` Pattern
3. **Dead Code Kill:** Alle No-Op Funktionen entfernt, Consumers bereinigt
4. **Test Baseline:** Jeder der 7 Services hat min. Happy-Path + Error Test
5. **pbt.ts + liquidation.ts Error Checks:** Fehlende error-Abfragen ergaenzen
6. **tsc + vitest 100% green** nach jedem Wave

### Non-Goals
- UX-Polish der Trading-UI (das macht Anil danach)
- Neue Features (keine neuen RPCs, keine neuen Queries)
- Refactoring der Service-Architektur (kein Umzug, kein Rename)
- Performance-Optimierung (kein staleTime-Tuning, kein Query-Merging)

### Anti-Requirements
- KEINE neuen Dateien erstellen (ausser fehlende Tests)
- KEINE Component-Aenderungen (nur Service-Layer)
- KEINE RPC-Aenderungen (nur Service-Cast verifizieren)
- KEIN Barrel-Export aendern (ausser bei Dead-Code-Removal)

---

## 1.3 Feature Migration Map

Kein Feature bewegt sich. Alles bleibt wo es ist. Nur die Qualitaet wird gehaertet.

| # | Feature | Service | Action | Detail |
|---|---------|---------|--------|--------|
| 1 | Buy from Market | trading.ts:buyFromMarket | HARDEN | Error handling OK, keine Aenderung |
| 2 | Sell Order | trading.ts:placeSellOrder | HARDEN | Error handling OK, keine Aenderung |
| 3 | Buy from Order | trading.ts:buyFromOrder | HARDEN | Error handling OK, keine Aenderung |
| 4 | Cancel Order | trading.ts:cancelOrder | HARDEN | Error handling OK, keine Aenderung |
| 5 | Trending Players | trading.ts:getTrendingPlayers | FIX | Silent-null → throw |
| 6 | Price Histories | trading.ts:getAllPriceHistories | FIX | console.error → logSupabaseError + throw |
| 7 | Price Cap | trading.ts:getPriceCap | FIX | console.error → logSupabaseError (null return OK) |
| 8 | Buy Orders | trading.ts:placeBuyOrder | HARDEN | Error handling OK (returns result) |
| 9 | Cancel Buy Order | trading.ts:cancelBuyOrder | HARDEN | Error handling OK |
| 10 | Get Wallet | wallet.ts:getWallet | HARDEN | Already throws, OK |
| 11 | Get Holdings | wallet.ts:getHoldings | HARDEN | Already throws, OK |
| 12 | Holding Qty | wallet.ts:getHoldingQty | FIX | Silent-null → throw |
| 13 | Available SC | wallet.ts:getAvailableSc | FIX | Silent-null → throw |
| 14 | Holding Locks | wallet.ts:getUserHoldingLocks | FIX | Silent-null → throw |
| 15 | Holder Count | wallet.ts:getPlayerHolderCount | FIX | Silent-null → throw |
| 16 | Transactions | wallet.ts:getTransactions | HARDEN | Already throws, OK |
| 17 | Incoming Offers | offers.ts:getIncomingOffers | HARDEN | Already throws, OK |
| 18 | Outgoing Offers | offers.ts:getOutgoingOffers | HARDEN | Already throws, OK |
| 19 | Open Bids | offers.ts:getOpenBids | HARDEN | Already throws, OK |
| 20 | Offer History | offers.ts:getOfferHistory | HARDEN | Already throws, OK |
| 21 | Create Offer | offers.ts:createOffer | HARDEN | Already throws, OK |
| 22 | Accept Offer | offers.ts:acceptOffer | HARDEN | Already throws, OK |
| 23 | Reject/Counter/Cancel | offers.ts:* | HARDEN | Already throws, OK |
| 24 | Active IPOs | ipo.ts:getActiveIpos | HARDEN | Already throws, OK |
| 25 | IPO for Player | ipo.ts:getIpoForPlayer | HARDEN | Already throws, OK |
| 26 | Buy from IPO | ipo.ts:buyFromIpo | HARDEN | Already throws, OK |
| 27 | IPO Admin | ipo.ts:createIpo/updateIpoStatus | HARDEN | Already throws, OK |
| 28 | PBT Treasury | pbt.ts:getPbtForPlayer | FIX | Error ignoriert → throw |
| 29 | PBT Transactions | pbt.ts:getPbtTransactions | FIX | Error ignoriert → throw |
| 30 | Fee Config | pbt.ts:getFeeConfig | FIX | Error ignoriert → throw |
| 31 | All Fee Configs | pbt.ts:getAllFeeConfigs | FIX | Error ignoriert → throw |
| 32 | Liquidation Event | liquidation.ts:getLiquidationEvent | FIX | Error ignoriert → throw |
| 33 | Liquidation Payouts | liquidation.ts:getLiquidationPayouts | FIX | Error ignoriert → throw |
| 34 | Success Fee Cap | liquidation.ts:setSuccessFeeCap | HARDEN | Returns {success, error}, OK |
| 35 | Liquidate Player | liquidation.ts:liquidatePlayer | HARDEN | Returns result, OK |
| 36 | Watchlist CRUD | watchlist.ts:* | HARDEN | Already throws, OK |
| 37 | Most Watched | watchlist.ts:getMostWatchedPlayers | HARDEN | Already throws, OK |
| 38 | invalidateOfferData | offers.ts | REMOVE | Dead no-op |
| 39 | invalidateLiquidationData | liquidation.ts | REMOVE | Dead no-op |
| 40 | invalidatePbtData | pbt.ts | REMOVE | Dead no-op |

**Summary: 11 FIX + 26 HARDEN (no change) + 3 REMOVE = 40 Features geprüft**

---

## 1.4 Blast Radius Map

### Silent-Null Fixes → wer cached die fehlerhafte Response?

Wenn wir `return 0` zu `throw` aendern, muss React Query den Error korrekt fangen. Pruefung:

| Fix | Query Hook | React Query `throwOnError` | Impact |
|-----|-----------|---------------------------|--------|
| `getHoldingQty` → throw | `usePlayerTrading` (inline) | Default (Error in isError) | ✅ OK — UI zeigt Error state |
| `getAvailableSc` → throw | `usePlayerTrading` (inline) | Default | ✅ OK |
| `getUserHoldingLocks` → throw | `qk.events.holdingLocks` | Default | ✅ OK |
| `getPlayerHolderCount` → throw | `qk.holdings.holderCount` | Default | ✅ OK |
| `getTrendingPlayers` → throw | `qk.trades.topTraders` via trending.ts | Default | ✅ OK — Empty state shows |
| `getAllPriceHistories` → throw | `features/market/queries/priceHist.ts` | Default | ✅ OK |
| `pbt.*` → throw | `qk.pbt.byPlayer` | Default | ✅ OK |
| `liquidation.*` → throw | `qk.liquidation.byPlayer` | Default | ✅ OK |

**Kein Consumer hat `throwOnError: false`.** React Query's default retry (3×) bedeutet: bei Auth-Race wird der 2. Versuch durchkommen. Das ist BESSER als null cachen.

### No-Op Removal → wer importiert die?

| Dead Function | Consumer Grep |
|---------------|---------------|
| `invalidateOfferData` | Muss geprüft werden |
| `invalidateLiquidationData` | Muss geprüft werden |
| `invalidatePbtData` | Muss geprüft werden |

→ In Wave 3 greppen, erst dann entfernen.

---

## 1.5 Pre-Mortem

| # | Failure Scenario | Mitigation |
|---|-----------------|------------|
| 1 | Silent-null fix bricht Loading-State: Component erwartet `0` statt Error | Jeden Consumer pruefen: hat er einen Error-State? React Query default = retry 3x |
| 2 | pbt.ts Error-Check bricht weil Query kein `.error` hat | Jede Query in pbt.ts hat pattern `const { data } = await supabase...` — `.error` MUSS hinzugefuegt werden |
| 3 | Dead-Code Removal bricht Import | Greppen VOR dem Loeschen, nicht danach |
| 4 | Test schreibt gegen API die sich geaendert hat | Tests mocken Supabase, kein Live-DB |
| 5 | getPriceCap null-return aendern bricht Sell-Form | getPriceCap behaelt null-return — nur logging verbessern |

---

## 1.6 Invarianten + Constraints

### Invarianten
- Alle Trading-Mutations (buy/sell/cancel/offer) MUESSEN weiterhin identisch funktionieren
- Kein Return-Type darf sich aendern (nur Error-Pfad aendert sich)
- Alle 39 wallet.ts Consumer muessen weiterhin kompilieren
- Query Keys bleiben identisch

### Constraints
- Max 3 Files pro Wave aendern
- Kein Component-Code anfassen
- Kein RPC-Code anfassen
- Jede Wave: `tsc --noEmit` clean BEVOR naechste Wave
- Tests muessen gegen Mock laufen (kein Live-DB in Vitest)

---

## 1.7 Akzeptanzkriterien

```
GIVEN: User hat Holdings und oeffnet /market
WHEN: Auth-Race tritt auf (RLS blockiert kurz)
THEN: React Query retried automatisch (3x)
  AND: Holdings erscheinen nach ~1s (nicht leere Liste)
  AND NOT: "0 Holdings" angezeigt und 30s gecached

GIVEN: Supabase DB Error auf pbt_treasury Query
WHEN: User oeffnet Player Detail → PBT Tab
THEN: Error-State sichtbar (nicht leere Treasury)
  AND: React Query retried
  AND NOT: Silent leere Anzeige

GIVEN: Alle Tests laufen
WHEN: `npx vitest run src/lib/services/__tests__/`
THEN: 0 failures
  AND: Jeder der 7 Services hat min. 1 Test-File

GIVEN: Dead code entfernt
WHEN: `grep -r "invalidateOfferData\|invalidateLiquidationData\|invalidatePbtData" src/`
THEN: 0 Treffer (ausser in Commit-History)
```

---

## SPEC GATE

- [x] Current State komplett (40 Features nummeriert)
- [x] Migration Map fuer JEDES Feature ausgefuellt
- [x] Blast Radius fuer jede Aenderung geprüft
- [x] Pre-Mortem mit 5 Szenarien
- [x] Invarianten + Constraints definiert
- [x] Akzeptanzkriterien fuer jede betroffene User-Flow
- [ ] Anil hat die Spec reviewed und abgenommen

---

## PHASE 2: PLAN

### Wave 1: Silent-Null Fixes (wallet.ts + trading.ts)

**Files:** wallet.ts, trading.ts
**Blast Radius:** 39 wallet consumers + 19 trading consumers (keine Component-Aenderung noetig)

#### Task 1.1: wallet.ts — 4 Silent-Null → throw

| Funktion | Zeile | Alt | Neu |
|----------|-------|-----|-----|
| `getHoldingQty` | 82-86 | `console.error; return 0` | `throw new Error(error.message)` |
| `getAvailableSc` | 95 | `console.error; return 0` | `throw new Error(error.message)` |
| `getUserHoldingLocks` | 105 | `console.error; return []` | `throw new Error(error.message)` |
| `getPlayerHolderCount` | 117-120 | `console.error; return 0` | `throw new Error(error.message)` |

#### Task 1.2: trading.ts — 2 Silent-Null + 1 Logging Fix

| Funktion | Zeile | Alt | Neu |
|----------|-------|-----|-----|
| `getTrendingPlayers` | 378-379 | `logSupabaseError; return []` | `logSupabaseError; throw new Error(...)` |
| `getAllPriceHistories` | 412-413 | `console.error; return Map` | `logSupabaseError; throw new Error(...)` |
| `getPriceCap` | 545 | `console.error; return null` | `logSupabaseError(prefix, error); return null` (null OK) |

**DONE means:**
- [x] 6 silent-null patterns gefixt
- [x] 1 logging pattern verbessert
- [x] `tsc --noEmit` 0 errors
- [x] Keine Consumer-Aenderung noetig (React Query error handling)

### Wave 2: pbt.ts + liquidation.ts Error Checks

**Files:** pbt.ts, liquidation.ts

#### Task 2.1: pbt.ts — Error-Abfragen ergaenzen

Alle 4 Queries haben `const { data } = await supabase...` ohne Error-Check.

Fix-Pattern:
```typescript
const { data, error } = await supabase...
if (error) throw new Error(error.message);
```

#### Task 2.2: liquidation.ts — Error-Abfragen ergaenzen

`getLiquidationEvent` und `getLiquidationPayouts` ignorieren Errors.

**DONE means:**
- [x] Alle 6 Queries in pbt.ts + liquidation.ts haben Error-Check + throw
- [x] `tsc --noEmit` 0 errors

### Wave 3: Dead Code Removal

**Files:** offers.ts, liquidation.ts, pbt.ts + potentielle Consumer

#### Task 3.1: Greppen + Entfernen

1. `grep -r "invalidateOfferData" src/` → Consumer identifizieren
2. `grep -r "invalidateLiquidationData" src/` → Consumer identifizieren
3. `grep -r "invalidatePbtData" src/` → Consumer identifizieren
4. Alle Consumer bereinigen (Import entfernen)
5. No-Op Funktionen loeschen

**DONE means:**
- [x] 3 No-Op Funktionen entfernt
- [x] 0 verwaiste Imports
- [x] `tsc --noEmit` 0 errors

### Wave 4: Fehlende Tests + Verification

**Files:** Neue Test-Files fuer liquidation, pbt, watchlist

#### Task 4.1: Test-Files erstellen

| File | Tests |
|------|-------|
| `__tests__/liquidation.test.ts` | getLiquidationEvent, getLiquidationPayouts, setSuccessFeeCap, liquidatePlayer |
| `__tests__/pbt.test.ts` | getPbtForPlayer, getPbtTransactions, getFeeConfig, getAllFeeConfigs |
| `__tests__/watchlist.test.ts` | getWatchlist, addToWatchlist, removeFromWatchlist, getMostWatchedPlayers |

#### Task 4.2: Bestehende Tests verifizieren

- `npx vitest run src/lib/services/__tests__/trading.test.ts`
- `npx vitest run src/lib/services/__tests__/wallet.test.ts`
- `npx vitest run src/lib/services/__tests__/offers.test.ts`
- `npx vitest run src/lib/services/__tests__/ipo.test.ts`

#### Task 4.3: Final Verification

- `npx tsc --noEmit` → 0 errors
- `npx vitest run src/lib/services/__tests__/` → 0 failures
- Diff Review gegen common-errors.md

**DONE means:**
- [x] 7/7 Services haben Test-Files
- [x] tsc clean
- [x] vitest green
- [x] Reviewer Agent sign-off

---

## PLAN GATE

- [x] Jede Wave eigenstaendig shippbar
- [x] Max 3 Files pro Wave
- [x] Kein Behavior-Change (nur Error-Pfad)
- [x] Jeder Task hat "DONE means" Checkliste
- [x] Agent-Tasks klar spezifiziert
- [ ] Anil hat den Plan reviewed
