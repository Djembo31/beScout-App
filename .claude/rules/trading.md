---
paths:
  - "src/lib/services/trading*"
  - "src/lib/services/wallet*"
  - "src/lib/services/ipo*"
  - "src/lib/services/offers*"
  - "src/features/market/**"
  - "src/app/**/market/**"
---

## Geld-Regeln
- IMMER als BIGINT cents (1,000,000 cents = 10,000 $SCOUT)
- Alle Geld-Operationen als atomare DB Transactions (RPCs)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- `fmtScout()` fuer Formatierung, `$SCOUT` user-sichtbar
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`

## Preise

### Pricing Asset Model (MONEY-KRITISCH, 2026-04-20 Anil-Korrektur)
- **Einheit:** `1 $SCOUT = 1 cent = 0,01 €`
- **Card-Preis Formel (FIX):**
  - `ipo_price (cents) = MV_EUR / 10`
  - `ipo_price ($SCOUT) = MV_EUR / 1.000`
  - `ipo_price (€) = MV_EUR / 100.000`
- **Community-Anteil:** Max 10.000 Cards = 10% des MV tokenisierbar
- **Card-Preis ist FIX, unabhängig von der Anzahl ausgegebener Cards**
- Verein entscheidet, wie viele Cards (1.000 bis 10.000) er ausgibt → entsprechend kleinerer Community-Anteil
- 90% des Spielers bleiben beim Verein (nicht-tokenisiert)
- **Verified gegen Sivasspor-Live-DB (2026-04-20):**
  - Bekir (MV 1M€) → ipo_price 100.000 cents = 1.000 $SCOUT ✓
  - Manaj (MV 2,2M€) → ipo_price 250.000 cents ≈ Formel 220.000

### Liquidation-Payout
- Bei Transfer/Liquidation für `MV_liqui`:
  - Payout pro Card = `MV_liqui / 100.000 €`
  - Community-Pool-Share = `verkaufte_Cards / 10.000 × 10% × MV_liqui`
  - Verein bekommt: Transfer-Erlös − Community-Payout + unverkaufte Cards-Reserve
- Card-Value skaliert **1:1 mit MV_liqui** (5× MV-Growth = 5× Card-Value)

### Regeln
- `ipo_price` = fest pro Tranche nach Launch, aendert sich NIE durch Marktaktivitaet
- `floor_price` (DB-Spalte `players.floor_price`, cents) = **die EINE Floor-Quelle** (Slice 303 S7).
  Kanon-Formel in RPC `recalc_floor_price`: `LEAST(MIN(non-expired open sell), aktive IPO aus ipos)
  → last_price>0 → keep`. Gepflegt bei JEDEM Trade (`buy_player_sc`/`buy_from_order`),
  jeder Sell-Order (`place_sell_order`), jedem Cancel (`cancel_order`) + Cron (`expire_pending_orders`).
- **Floor Client-seitig: NUR `player.prices.floor` lesen (= centsToBsd(floor_price))** — NIEMALS
  aus listings/orders neu berechnen. Der frühere `Math.min(...sellOrders)`-Client-Recompute war
  Divergenz-Quelle (5-6 abweichende Floor-Berechnungen, S7-Registry #1) und ist entfernt
  (Slice 303: `computePlayerFloor` → `prices.floor`; `enriched`/`resolveBuyPriceCents` entkoppelt).
- Pool/IPO verkauft immer zu `ipo_price`, nicht `floor_price`
- **Display vs Charge bei eigener Order (S7-303 F-1, pre-existing):** `floor_price` schließt
  EIGENE offene Sell-Orders mit ein; `buy_player_sc`/`buy_from_order` buchen aber die günstigste
  Order ANDERER User (`user_id != p_user_id`). Wenn ein User selbst der günstigste Lister ist,
  kann die angezeigte Kaufsumme minimal unter dem tatsächlich gebuchten Preis liegen. Future-Fix
  optional: eigene Orders aus dem Display-Floor excludieren ODER Kauf blocken wenn eigene Order
  am günstigsten. Kein Live-Blocker (selten + RPC ist autoritativ).
- Details: `memory/decision_pricing_asset_model.md`

## Fee-Split
- **Trading (6% total):** `trade_fee_bps=600` → Platform 3.5% + PBT 1.5% + Club 1%
- **IPO:** 85% Club, 10% Platform, 5% PBT
- **Research Unlock:** 80% Author, 20% Platform
- **Bounty Approval:** 95% Creator, 5% Platform
- **Polls:** 70% Creator, 30% Platform
- **P2P Offers (3% total):** Platform 2% + PBT 0.5% + Club 0.5% (ADR-025 updated, `offer_*_bps` in fee_config)
- **Club Abos:** 100% Club (ADR-027)
- Fee-Discount: Platform absorbs Rabatt, PBT+Club immer voller Anteil
- Abo-Discount: `buy_player_sc` prueft `club_subscriptions` (active + expires_at > now). Alter Name `buy_player_dpc` existiert als thin-alias (seit 2026-04-14, Migration 20260414151000).

## Escrow Pattern (Offers + Bounties)
1. Check wallet balance (available = balance - locked)
2. Lock amount in `locked_balance` (FOR UPDATE)
3. Insert record
4. On insert failure: unlock amount (Rollback)
- Gleicher Pattern fuer `create_offer` und `create_user_bounty`

## IPO System
- Status: none → announced → early_access → open → ended → cancelled
- Early Access: Silber+ Abo (server-seitig in RPC, NICHT UI-Gate — ADR-018)
- Max 10.000 DPCs pro Spieler, max 4 Tranchen
- Min 500 DPCs pro Tranche, 30 Tage Cooldown zwischen IPOs
- Neue IPO MUSS angekuendigt werden (drueckt Sekundaermarkt-Preis, Fairness)
- Success Fee Cap einmalig VOR First IPO — danach unveraenderbar

## Liquidation Guards
- ALLE 4 Trading-RPCs pruefen `is_liquidated`
- `liquidate_player` RPC: Success Fee Payout proportional zum Marktwert-Wachstum
- 3 Geldquellen: Community Success Fee + PBT Treasury + Trading-Gewinn

## Post-Trade Refresh (Lightweight)
```typescript
// NIE alle Spieler neu laden. Nur Holdings + Orders refetchen:
const [hlds, orders, offers] = await Promise.all([
  getHoldings(uid), getAllOpenSellOrders(), getIncomingOffers(uid),
]);
// Slice 303: Floor NICHT client-seitig neu berechnen — players.floor_price ist die
// eine Quelle (von buy/sell/cancel-RPCs via recalc_floor_price gepflegt). Nach Trade
// players invalidieren/refetchen (frischer floor_price), nicht aus orders rekonstruieren.
queryClient.invalidateQueries({ queryKey: qk.players.all });
```

## MiCA/CASP Compliance
- NIEMALS: Investment, ROI, Profit, Rendite, Dividende, Gewinn, Ownership
- IMMER: Utility Token, Platform Credits, Scout Assessment
- $SCOUT = "Platform Credits", DPC = "Digital Player Contract"
- TradingDisclaimer Component: inline (Modals) oder card (Pages)

## Cross-Domain (bei Bedarf nachladen)
- **Gamification:** Trader Score nach Trade (DB-Trigger), Achievements (first_trade, smart_money) → `gamification.md`
- **Club-Admin:** IPO-Verwaltung, Abo-Discount Enforcement, Fee-Config → `club-admin.md`
- **Fantasy:** DPC Holdings als Lineup-Voraussetzung → `fantasy.md`

## Closed Economy (Phase 1)
- KEIN Cash-Out, KEIN P2P-Transfer, KEIN Exchange
- Kein Withdrawal-Feature bauen. Auch nicht versteckt.
