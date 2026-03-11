---
paths:
  - "src/lib/services/trading*"
  - "src/lib/services/wallet*"
  - "src/lib/services/ipo*"
  - "src/lib/services/offers*"
  - "src/components/market/**"
  - "src/app/**/market/**"
---

## Geld-Regeln
- IMMER als BIGINT cents (1,000,000 cents = 10,000 $SCOUT)
- Alle Geld-Operationen als atomare DB Transactions (RPCs)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- `fmtScout()` fuer Formatierung, `$SCOUT` user-sichtbar
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`

## Preise
- `ipo_price` = fest pro Tranche, aendert sich NIE durch Marktaktivitaet
- `floor_price` = MIN(offene User-Sell-Orders) oder `ipo_price` als Fallback
- Floor Price Client-seitig berechnen: `Math.min(...sellOrders.map(o => o.price))` — NICHT per-Player DB Query
- Pool/IPO verkauft immer zu `ipo_price`, nicht `floor_price`

## Fee-Split
- **Trading (6% total):** `trade_fee_bps=600` → Platform 3.5% + PBT 1.5% + Club 1%
- **IPO:** 85% Club, 10% Platform, 5% PBT
- **Research Unlock:** 80% Author, 20% Platform
- **Bounty Approval:** 95% Creator, 5% Platform
- **Polls:** 70% Creator, 30% Platform
- **P2P Offers (3% total):** Platform 2% + PBT 0.5% + Club 0.5% (ADR-025 updated, `offer_*_bps` in fee_config)
- **Club Abos:** 100% Club (ADR-027)
- Fee-Discount: Platform absorbs Rabatt, PBT+Club immer voller Anteil
- Abo-Discount: `buy_player_dpc` prueft `club_subscriptions` (active + expires_at > now)

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
// Floor-Price client-seitig neu berechnen
setPlayers(prev => enrichPlayers(prev, orders, hlds));
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
