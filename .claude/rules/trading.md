---
paths:
  - "src/lib/services/trading*"
  - "src/lib/services/wallet*"
  - "src/lib/services/ipo*"
  - "src/lib/services/offers*"
  - "src/features/market/**"
  - "src/app/**/market/**"
---

## Geld-Einheit (D99 — SSOT, code-verifiziert)
- **Intern = BIGINT „cents"** (kleinste Einheit). **Anzeige = „Credits" = cents/100** (`centsToBsd`). → **1 Credit = 100 cents** · 1.000.000 cents = 10.000 Credits.
- **User-facing IMMER „Credits"** (nie „$SCOUT", nie „BSD", nie €). „$SCOUT" = Name des **ICO-Coins** (Phase 2, nach gültiger Lizenz) — heute nicht user-facing. „BSD" = Legacy, deprecatet.
- ICO-Peg (Phase 2, **nicht heute**, user-facing nie €): 1 Credit = 0,01 €. In Pilot/Beta sind Credits **wertloses Spielgeld** (D99).

## Geld-Regeln
- IMMER als BIGINT cents; alle Geld-Operationen als atomare DB Transactions (RPCs)
- Trades/Transactions append-only (kein UPDATE/DELETE auf Logs)
- `fmtScout()`/`centsToBsd` für Formatierung; Label = „Credits"
- NIEMALS leere `.catch(() => {})` — mindestens `console.error`

## Preise

### Pricing Asset Model (MONEY-KRITISCH · 2026-04-20 Anil-Korrektur · D99-reconciled 2026-06-24)
- **Preis-Referenz / Default-Vorschlag: 1 Card = MV_EUR / 1.000 Credits** (`ipo_price_cents = MV_EUR/10`, → /100 = MV/1.000 Credits). Das ist der **Orientierungswert** beim Erstverkauf — der **Verein darf abweichen**, danach ist `ipo_price` fix (MV-entkoppelt, D100).
- **KEIN 100×-Widerspruch:** die Fairness-Sicht „1 Card = MV/100.000 **€**" ist beim ICO-Peg (1 Credit = 0,01 €) **dieselbe Zahl** wie MV/1.000 Credits. €-Bezug = ICO-Zeit (Phase 2), user-facing nie €.
- **Card-Preis ist FIX**, unabhängig von der Anzahl ausgegebener Cards.
- **Community-Anteil:** Max 10.000 Cards = 10% des MV tokenisierbar. Verein entscheidet 1.000–10.000 Cards → entsprechend kleinerer Community-Anteil. 90% bleiben beim Verein (nicht-tokenisiert).
- **Verified gegen Live-DB:** Mbappé (MV 200 Mio €) → 200.000 Credits ✓ · Bekir (MV 1 Mio €) → 100.000 cents = 1.000 Credits ✓.
- **ipo_price = Vereins-Eintrittspreis, MV-ENTKOPPELT (D100):** `MV/10` ist nur der **Default-Vorschlag** bei Anlage (`createPlayer`); der Verein darf abweichen, und nach IPO ist `ipo_price` **eingefroren** (folgt NIE automatisch dem MV). „Drift" `ipo_price ≠ MV/10` ist **KEIN Bug** → kein Recompute/Backfill (Slice-114-Klasse verboten). Anzeige-Anker bestehender Spieler = `ipos.price` der Erst-IPO, sonst „—". Vier-Zahlen-Modell (Eintritt/Markt/MV-Referenz/CSF) + Floor-Orderbuch-Transparenz: `docs/knowledge/domain/treasury.md` §1b + **D100**.

### Liquidation-Payout / Community Success Fee (CSF) — MODELL 2026-06-16 (D83)
- **Reward pro Card = `min(Transfererlös, Cap) / 100.000 €`** (= `MV_liqui/100.000` ohne Cap). Die Anzahl verkaufter Cards **kürzt sich raus** → pro Card immer Liquidationswert/100.000.
- **Community-Pool gesamt** = `verkaufte_Cards / 10.000 × 10% × min(Transfer, Cap)`. Nur SC **im Umlauf** (Holdings) zählen.
- **Cap** = Vereins-Schutz, bei IPO gesetzt (`success_fee_cap`). Deckelt die Fee-Basis (`min(Transfer, Cap)`).
- **Verteilung: rein PROPORTIONAL nach Besitz** — KEIN `csf_multiplier`/Treue-Gewichtung (D83: csf_mult RAUS → Treue separat über Fan-Reward-Engine).
- **Einmalige Auszahlung** (KEINE Tranchen — D83), aus dem **Club-Treasury** (Verein zahlt aus zugesagter Marketinggebühr).
- Card-Value skaliert **1:1 mit MV_liqui** → Fan-Gewinn-Multiplikator = Spieler-Wertsteigerungs-Multiplikator.
- **Kanon-Beispiel (Osimhen)** (€-Werte = ICO-Peg-Sicht, nicht heute user-facing): IPO MV 75 Mio → 1 SC = 750 € = 75.000 Credits. Transfer 150 Mio (kein Cap) → Reward/Card = 150 Mio/100.000 = **1.500 € = 150.000 Credits**. 2 SC → **3.000 € = 300.000 Credits** (2×, weil 75→150 Mio = 2× Wertsteigerung). Mit Cap 100 Mio → 1.000 €/Card.
- **+ PBT-Anteil** (separater per-Player-Topf, 1,5% der Trades) wird bei Liquidation mit-ausgeschüttet (klein, volumenabhängig).
- **Vollständiges Modell (Kanon):** `docs/knowledge/domain/treasury.md` (+ `docs/knowledge/domain/reward-ranking.md`), Decision `memory/decisions.md` D83.

### Regeln
- `ipo_price` = Vereins-Eintrittspreis, fest nach Launch, aendert sich NIE — weder durch Marktaktivitaet NOCH durch MV-Aenderung (MV-entkoppelt, D100)
- `floor_price` (DB-Spalte `players.floor_price`, cents) = **die EINE Floor-Quelle** (Slice 303 S7).
  Kanon-Formel in RPC `recalc_floor_price`: `LEAST(MIN(non-expired open sell), aktive IPO aus ipos)
  → last_price>0 → keep`. Gepflegt bei JEDEM Trade (`buy_player_sc`/`buy_from_order`),
  jeder Sell-Order (`place_sell_order`), jedem Cancel (`cancel_order`) + Cron (`expire_pending_orders`).
- **Floor Client-seitig: NUR `player.prices.floor` lesen (= centsToBsd(floor_price))** — NIEMALS
  aus listings/orders neu berechnen. Der frühere `Math.min(...sellOrders)`-Client-Recompute war
  Divergenz-Quelle (5-6 abweichende Floor-Berechnungen, S7-Registry #1) und ist entfernt
  (Slice 303: `computePlayerFloor` → `prices.floor`; `enriched`/`resolveBuyPriceCents` entkoppelt).
- Pool/IPO verkauft immer zu `ipo_price`, nicht `floor_price`
- **Preis-Band Sell-Orders / Anti-Manipulation (S368c):** `place_sell_order` erzwingt ein symmetrisches Band:
  `max = get_price_cap = 3×Referenz` (Referenz = `GREATEST(ipo, median_last10)`, <10 Trades → 3×ipo) und
  `min = get_price_floor = get_price_cap/9 = Referenz/3` (`minPriceExceeded`). Verhindert Lowball-Order, die den
  angezeigten Floor künstlich crasht. Edge: cap=0 (kein Anker) → floor=0 → nur `≥1 Cent`. **Schon vorhandener
  Schutz (NICHT neu bauen):** Selbst-Handel-Block · Reziprok-Ping-Pong A↔B (7d, `v_circular_count`) · 20 Trades/24h ·
  10 Orders/h · Club-Admin-Handelsverbot. **Offene Lücke (eigener Slice):** Sybil-Ring A→B→C→A (3+ Accounts) —
  braucht Identitäts-/Geräte-Signale, Phase-2-relevant (Phase-1-Credits = wertloses Spielgeld).
- **Floor-Anzeige user-facing = „Marktpreis" / „Piyasa Fiyatı" (S368c, vereinheitlicht)** — NICHT „Floor"/„Markt Floor".
  Sublabel quellen-ehrlich: offene Order → „Günstigstes Angebot", keine Order → „Letzter Verkauf", laufende IPO →
  Festpreis (`PlayerHero.floorSource`-Prop, abgeleitet aus `allSellOrders`-Präsenz, KEIN Client-Floor-Recompute).
- **Display vs Charge bei eigener Order (S7-303 F-1, pre-existing):** `floor_price` schließt
  EIGENE offene Sell-Orders mit ein; `buy_player_sc`/`buy_from_order` buchen aber die günstigste
  Order ANDERER User (`user_id != p_user_id`). Wenn ein User selbst der günstigste Lister ist,
  kann die angezeigte Kaufsumme minimal unter dem tatsächlich gebuchten Preis liegen. Future-Fix
  optional: eigene Orders aus dem Display-Floor excludieren ODER Kauf blocken wenn eigene Order
  am günstigsten. Kein Live-Blocker (selten + RPC ist autoritativ).
- Details: `docs/knowledge/domain/treasury.md` (Kanon) + `docs/CONCEPT-DPC-ECONOMY.md` + `memory/decisions.md` D83 (Pfad `memory/decision_pricing_asset_model.md` existiert NICHT — Drift)

## Fee-Split
- **Trading (6% total):** `trade_fee_bps=600` → Platform 3.5% + PBT 1.5% + Club 1%
- **IPO:** 85% Club, 10% Platform, 5% PBT
- **Research Unlock:** 80% Author, 20% Platform
- **Bounty Approval:** 95% Creator, 5% Platform
- **Polls:** 80% Creator, 20% Platform (Slice 337)
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
- User-facing Einheit = „Credits" (Platform Credits). „$SCOUT" = ICO-Coin-Name (Phase 2). DPC = „Digital Player Contract" (code-intern; user-facing „Scout Card")
- **Token/Coin/Cash-Out erst nach gültiger Lizenz** (Phase 2) — konkrete Route (CASP vs MiCA Title II) = Anwalt vor ICO (D99)
- TradingDisclaimer Component: inline (Modals) oder card (Pages)

## Cross-Domain (bei Bedarf nachladen)
- **Gamification:** Trader Score nach Trade (DB-Trigger), Achievements (first_trade, smart_money) → `gamification.md`
- **Club-Admin:** IPO-Verwaltung, Abo-Discount Enforcement, Fee-Config → `club-admin.md`
- **Fantasy:** DPC Holdings als Lineup-Voraussetzung → `fantasy.md`

## Closed Economy (Phase 1)
- KEIN Cash-Out, KEIN P2P-Transfer, KEIN Exchange
- Kein Withdrawal-Feature bauen. Auch nicht versteckt.
