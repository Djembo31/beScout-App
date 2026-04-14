---
name: Journey 3 — Backend Audit (Sekundaer-Trade)
description: RPC + Service + Invarianten Audit des Secondary-Trade-Flows (buy_from_market, place_sell_order, buy_from_order, place_buy_order, accept_offer, cancel_order, liquidate_player) fuer Operation Beta Ready Phase 2.
type: project
status: audit-complete
created: 2026-04-14
agent: backend
scope: ["trading.ts", "offers.ts", "wallet.ts", "liquidation.ts", "usePlayerTrading", "useTradeActions", "buy_player_sc", "place_sell_order", "buy_from_order", "place_buy_order", "cancel_buy_order", "cancel_order", "accept_offer", "liquidate_player"]
---

# Journey #3 — Backend Audit (Sekundaer-Trade)

## Summary

**21 Findings: 4 CRITICAL + 8 HIGH + 6 MEDIUM + 3 LOW.**

Money-Core live korrekt (Fee-Split 3.5/1.5/1 % exact auf 68 Secondary-Trades: 350.16/149.83/99.86 bps, Supply-Invariant im Trade-Pfad zero-sum). Aber **ein fundamental fehlender Matching-Engine fuer `place_buy_order`** blockt ~10 aktive Buy-Orders permanent, **529 orphan `ipo_id` references** in trades, **anon-RLS-Leaks auf orders (343) + transactions (949)**, und **Phantom-Supply von 707 SCs** in Seed-Bot-Accounts ueber 137 Spieler hinweg.

---

## CRITICAL (4)

### J3B-01 `place_buy_order` hat KEINEN Matching-Engine — Buy-Orders filen nie
**File:** `supabase/migrations/20260314190000_buy_orders.sql:8-80` + `20260331_place_buy_order_velocity_guard.sql:8-102`

**Problem:** `place_buy_order` lockt das Geld in `wallet.locked_balance`, erstellt einen Order-Row mit `status='open'`, **aber fuehrt NIEMALS ein Match gegen existierende Sell-Orders durch**. Es gibt auch keinen Trigger `AFTER INSERT` auf `orders`, kein Cron/Worker, kein `fill_buy_orders()` RPC. Consequence: Buy-Orders bleiben **30 Tage unverheiratete Wuensche** und escrowed-Geld bleibt gelockt.

**Live-DB-Beweis (2026-04-14):**
```
active_buy_orders:      10 (price=500c = 5 SC)
filled_buy_orders:       0 (ever)
partial_buy_orders:      0 (ever)
trades_with_buy_order_id: 0 (ever)
```

**Crossing-Order-Check:** 0 Buy-Orders haben einen Sell-Order <= ihrem Max-Preis gefunden (weil die 10 Test-Buy-Orders @ 500c alle unter Floor-Price liegen). **Aber wenn ein User einen realistischen Preis eingibt, wuerde er KEIN Match erhalten** — die Engine fehlt.

**Impact:** Beta-User platziert Kaufgesuch @ 100k, Floor ist 50k, er erwartet automatischen Match → nichts passiert → Geld locked → user frustriert → Ticket.

**Fix-Vorschlag:**
- Option A (korrekt, M-Aufwand): Implementiere `fill_buy_orders_for_player(p_player_id UUID)` RPC, triggered nach JEDEM `place_sell_order` + `place_buy_order` (via AFTER INSERT TRIGGER auf orders). Match by price-priority: lowest-sell-price <= max-buy-price.
- Option B (quick-fix, S-Aufwand): UI-Disclaimer "Kaufgesuche werden NICHT automatisch gematcht. Aktuell nur manuelle Erstellung." — **Beta-Blocker** weil Cap-Feature ist in BuyOrderModal sichtbar.
- Option C (Beta-Scope): `usePlaceBuyOrder` Mutation + `BuyOrderModal.tsx` komplett aus Beta entfernen bis Matching-Engine steht.

**Severity CRITICAL** — P0 weil Geld-Feature funktionslos + 30d escrow-Lock.

---

### J3B-02 Migration-Drift: `accept_offer`, `cancel_order`, `liquidate_player`, `create_offer`, `counter_offer`, `cancel_offer_rpc`, `reject_offer` sind live OHNE Source im Repo
**Files fehlend in `supabase/migrations/`**

Die Repo-Migrations enthalten NUR Hinweise ohne SQL-Body:
- `20260411120000_cancel_order_remove_cooldown.sql` — 5 Zeilen Kommentar, kein SQL
- `20260411130000_accept_offer_null_guard_fix.sql` — 15 Zeilen Kommentar, kein SQL
- `20260411130100_create_offer_null_guard_fix.sql` — Kommentar only
- `liquidate_player` — **KEIN File im Repo**, Service callt es
- `counter_offer`, `reject_offer`, `cancel_offer_rpc` — **KEIN File im Repo**

**Live-DB-Beweis:** Service callt `cancel_offer_rpc` ([offers.ts:299](src/lib/services/offers.ts)), was existiert (`"auth_uid_mismatch" bei 0-UUID Test → RPC vorhanden`). `cancel_offer` (ohne _rpc suffix) existiert NICHT (`"Could not find the function public.cancel_offer"`).

**Impact:** Rollback/DR = Trading-System komplett broken. Neue Developer koennen RPC-Bodies nicht reviewen. Audit-Blindspot fuer NULL-Guards, Fee-Split, CHECK Constraints — identisch zu J2B-01/J2B-05.

**Fix-Vorschlag:**
- CTO dumped Bodies via `mcp__supabase__execute_sql(pg_get_functiondef)` fuer ALLE 7 RPCs
- Schreibt sie in `20260414170000_backfill_offer_liquidation_rpcs.sql`
- Verifiziert dass Body auf Live-DB identisch ist (NO-OP Migration)

**Severity CRITICAL** — identisch zu J1-AR-1 + J2B-01, gleiches Pattern, **erweitert um Liquidation/Offer-Kategorie**.

---

### J3B-03 Supply-Invariant-Bruch: 707 SCs in 30 Bot-Accounts ohne Backing
**Source:** Holdings-Seed-Script (2026-03-19 Timestamp) — alle Holdings von bot001-bot030 + jarvisqa

**Live-DB-Beweis (2026-04-14):**
```
supply_invariant_vs_ipos_sold: 137 Spieler mit held > sold
totalHeld:     707 SCs
totalPurchased: 0 SCs via ipo_purchases
```

Top-10 Spieler mit Phantom:
| Spieler | held | sold (via IPOs) | diff |
|---------|------|-----------------|------|
| Muhammed Tiren | 72 | 0 | +72 |
| Ali Arda Yıldız | 25 | 0 | +25 |
| Giovanni Crociata | 21 | 0 | +21 |
| Cemil Berk Aksu | 21 | 0 | +21 |
| Mehmet Demirözü | 19 | 0 | +19 |

**Holder-Identitaet:**
```
bot004 (Serkan):   8 SCs Muhammed Tiren
bot005 (Nurcan):   8 SCs Muhammed Tiren
bot006 (Bora):     6 SCs Muhammed Tiren
...
jarvisqa:          5 SCs Ali Arda Yıldız (avg_buy_price 5000c = demo trade price)
```

**Geld-Effekt live:** Wenn ein User jetzt eine Sell-Order kauft von einem Bot, der eine Phantom-Holding hat → der Seller bekommt echte SCs, der Buyer auch → das **minted Supply aus dem Nichts** weiter. Die 1-Rule (SUM(holdings)==SUM(ipo_purchases)) ist bereits broken.

**Impact:** Jeder User der ein Geschenk-SC von Bot-Accounts bekommt erzeugt weiteren Phantom-Trade. Da die Seed-Bots aktiv handeln (siehe Journey #2 CEO-Decision: "behalten bis post-Beta"), wird der Phantom-Pool weitergegeben.

**Fix-Vorschlag:**
- Option A (korrekt, Beta-Scope): CTO Script ueber alle 30 Bot-Holdings → fuer jede Phantom-Holding dieser Bot-Accounts: `INSERT INTO trades(ipo_id, buyer_id, seller_id=NULL, quantity)` mit einem fiktiven `seed_ipo_id` aus neu-angelegten IPOs. Backfill macht die Invariant gruen.
- Option B (quick): Ignorieren, aber das muss in `beta-known-issues.md` dokumentiert werden.
- Option C: Tausch das Seed-Script → Script muss immer `INSERT INTO ipo_purchases` BEFORE `INSERT INTO holdings`.

**Severity CRITICAL** — Geld-Invariant broken.

---

### J3B-04 `anon` liest `orders` (343) + `transactions` (949) ohne RLS-Restriction
**Files:** RLS-Policies auf `orders` + `transactions` tables (nicht im Repo greifbar, nur live)

**Live-DB-Beweis (2026-04-14):**
```
anon_orders_count:       343 rows readable
anon_transactions_count: 949 rows readable
anon_trades_count:       747 rows readable (erwartet fuer Feed)
anon_holdings_count:       0 (korrekt)
anon_wallets_count:        0 (korrekt)
```

**Beweis via Direct-Query:**
```ts
const anon = createClient(url, anonKey);
await anon.from('orders').select('*').limit(5);
// → 5 rows returned (kein Error)
await anon.from('transactions').select('*').limit(5);
// → 5 rows returned (kein Error)
```

**Impact:**
- **orders**: Competitor kann alle offenen Preise + user_ids + quantities sehen. Market-Making-Info leak, aber vermutlich akzeptabel fuer offene Order-Book-UX (Market-Transparency).
- **transactions**: 🔴 PRIVACY-LEAK. `transactions` enthaelt `balance_after` pro User → jede Wallet-Bewegung ist oeffentlich. Andere User koennen einen User's Wallet-Balance-Historie rekonstruieren.

**Hard Rule aus `common-errors.md` Session 86:** "Cross-User Read Policies: IMMER zwei SELECT-Policies. `own-all` + `public-whitelist` (nur `type = ANY(ARRAY['buy','sell'])`)."

**Live-Check noetig:** `SELECT policyname, cmd, qual FROM pg_policies WHERE tablename IN ('orders','transactions')`

**Fix-Vorschlag:**
- **transactions (P0):** Drop any public SELECT policy. Only `WITH (auth.uid() = user_id)` allowed.
- **orders (P1):** Beibehalten fuer Market-Transparency OK, aber verify dass Policy = `TRUE` (alle lesbar) ist INTENTIONAL dokumentiert.

**Severity CRITICAL** (transactions exposure) — Privacy + Trust Issue, Beta-Blocker.

---

## HIGH (8)

### J3B-05 `buy_from_order` + `buy_player_sc` CIRCULAR TRADE GUARD ist falsch gepolt
**File:** `supabase/migrations/20260314120000_trading_missions_order_expiry.sql:270-282` + `:471-483`

Beide RPCs haben:
```sql
SELECT COUNT(*) INTO v_circular_count
FROM trades
WHERE seller_id = p_buyer_id        -- ich war schon mal Verkaeufer an diesen User
  AND buyer_id = v_order.user_id    -- und er war Buyer von mir
  AND player_id = p_player_id
  AND executed_at > now() - INTERVAL '7 days';

IF v_circular_count > 0 THEN RAISE 'Verdächtiges Handelsmuster...'
```

**Problem:** Der Guard blockt den FAIR A→B→A case **auch wenn** A einfach neu handeln will. Beispiel:
- A verkauft 1 SC an B (@ 100c) — legal
- 3 Tage spaeter hat A Lust auf denselben Spieler und kauft wieder von B (@ 110c) — **WIRD BLOCKIERT**

In Phase-1 Pilot (10-50 User, kleine Liquiditaet) wird das oft triggern. Mal schauen wir die Live-Zahl:

**Live-DB (2026-04-14):** 2 Trades in den letzten 7 Tagen, 0 circular patterns. Aber wenn die Aktivitaet ansteigt (50 User), wird das Pattern auftreten — besonders wenn die gleichen 5-10 aktiven Trader existieren.

**Impact:** **Legitime Trades werden abgelehnt** mit kryptischer "verdaechtiges Handelsmuster" Fehlermeldung. User-Frust, Support-Tickets.

**Fix-Vorschlag:** 
- Option A: Guard lockern → nur bei zweimaliger Wiederholung (>=2 A→B + B→A in 24h statt 7d)
- Option B: Guard entfernen, Lauftrunden-Detection in Analytics
- Option C: Nur fuer NEUE Users <30d (alt-User haben legit high-frequency trading)

**Severity HIGH** — Beta-Blocker wenn 50 User aktiv handeln.

---

### J3B-06 `buy_player_sc` 1-SC-Limit hardcoded (`IF p_quantity != 1`)
**File:** `supabase/migrations/20260314120000_trading_missions_order_expiry.sql:209-211` (persistent nach Rename)

```sql
IF p_quantity != 1 THEN
  RETURN json_build_object('success', false, 'error', 'Im Pilot nur 1 DPC pro Kauf');
END IF;
```

**Problem:** Wenn User 10 SCs haben will, muss er 10 Trades einzeln ausfuehren. UI `useTradeActions` schickt aber `quantity` parameter.

**Live-DB-Beweis (2026-04-14):** alle 68 Secondary-Trades haben quantity=1. Die Guard greift korrekt, aber **blockiert legitime Bulk-Buys**.

**Impact:** UX-Hindernis fuer High-Roller Phase 1. Comunio-Veteranen (laut CEO Q1) werden 5-10 SCs kaufen wollen. 10 einzelne Trades = 10x Fee, 10x Trigger-Chain, schlechte UX.

**Fix-Vorschlag:** 
- Remove constraint `IF p_quantity != 1` — bereits veraltet
- Respect `IF p_quantity < 1 OR p_quantity > 300` (matching Service-Client limits)
- Verify fee-loop funktioniert fuer quantity > 1 (der Code multipliziert korrekt: `v_total_cost := v_order.price * p_quantity`)

**Severity HIGH** — Legacy Guard, blockt Beta-UX.

---

### J3B-07 `place_sell_order` blocks liste > 300 Stueck mit generischer "Ungueltige Menge"
**File:** `supabase/migrations/20260314120000_trading_missions_order_expiry.sql:18+` + `20260325_sc_blocking_rpcs.sql:184`

```sql
IF p_quantity IS NULL OR p_quantity < 1 THEN
  RETURN json_build_object('success', false, 'error', 'Ungültige Menge. Mindestens 1 DPC.');
END IF;
```

Kein Upper-Bound in RPC. Service pruft `if (quantity > 300)` client-side (`trading.ts:157`), aber RPC erlaubt >300 silent.

**Impact:** Wenn der Service-Guard mal weg ist oder umgangen wird (z.B. direkter Supabase-RPC-Call), kann User 10.000 SCs in EIN Order listen — danach ist `cancel_order` der einzige Ausweg.

**Fix-Vorschlag:** Matching-Guard im RPC setzen: `IF p_quantity > 300 THEN reject`.

**Severity HIGH** — Defense-in-depth fehlt.

---

### J3B-08 RLS-Cross-User-Read fuer `trades` muss public-whitelist Pattern nutzen (common-errors.md)
**Live-DB (2026-04-14):** Anon sieht 747 Trades. Trades-Spalten fuer anon: `id, player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, executed_at, ipo_id, pbt_fee, club_fee`.

**Problem:** Die RLS-Policy erlaubt FULL SELECT fuer anon. Nach `common-errors.md` Session 86 "Cross-User Read Policies" muss das Pattern sein:
1. `own-all` — User sieht alles eigene (alle Columns)
2. `public-whitelist` — Andere User sehen nur safe Columns (z.B. ohne `buy_order_id`)

**Impact:** 
- **`buyer_id` + `seller_id`** sind wesentlich OK (Feed-Sinn), aber ein User kann herausfinden dass "User X kauft von User Y in 7-Tage-Rhythmus" → Marktmanipulation-Indikator visible.
- **`platform_fee` + `pbt_fee` + `club_fee`** sind OK wenn Fee-Struktur sowieso oeffentlich (common-errors nicht betroffen).
- **`buy_order_id` / `sell_order_id`** gibt Order-IDs preis → Order-History rekonstruierbar.

**Fix-Vorschlag:** View oder Policy die `buy_order_id, sell_order_id` fuer non-own trades verstecken.

**Severity HIGH** — Session 86-Pattern verletzt.

---

### J3B-09 `create_offer` Escrow-Pattern im Service nicht verifizierbar (Body im Repo fehlt)
**File:** `src/lib/services/offers.ts:154-195` — Service callt `create_offer` RPC, aber **Body ist nur live** (siehe J3B-02).

**Problem:** Laut `business.md` Escrow-Pattern:
```
1. Check wallet balance (available = balance - locked)
2. Lock amount in locked_balance (FOR UPDATE)
3. Insert record
4. On insert failure: unlock amount (Rollback)
```

Ohne RPC-Body im Repo **kann niemand verifizieren** dass:
- Balance wirklich geprueft wird VOR Lock
- `FOR UPDATE` row-lock korrekt
- Rollback-Path bei INSERT-Failure vorhanden

**Live-DB Beweis (2026-04-14):**
- `wallets_locked_total`: 5.000 cents
- `buy_orders_pending_lock`: 5.000 cents
- `offers_pending_lock`: 0 cents (keine pending buy-offers mit locked funds)
- **Zero Drift** → aktuell konsistent, aber mit nur 1 Buy-Order und 0 Offers.

**Impact:** Mystery bug wie J1-NULL-Scalar wartet versteckt. Erst bei Replay-Angriff oder Race-Condition entdeckbar.

**Fix-Vorschlag:** J3B-02 Backfill-Migration — dann Review des Bodies.

**Severity HIGH** — Audit-Blindspot identisch zu J1-AR-1.

---

### J3B-10 `accept_offer` Rollback-Recording: `offers.status = 'accepted'` aber kein `holdings` Update im sichtbaren Pfad
**Files:** `src/lib/services/offers.ts:197-240` callt `accept_offer` RPC (body unbekannt, siehe J3B-02)

**Live-DB Sanity-Check:** 0 offers pending mit side=buy, keine holdings mit matching offer-acceptance-traces ueber das Service. Aktuell keine Beweis-Zeile in transactions mit `type='offer_accept'` — was heisst das:
- Entweder wurde seit 2026-04-11 (NULL-Guard-Fix) noch kein accept_offer ausgefuehrt
- Oder das Transaction-Record geht als 'trade_buy'/'trade_sell' durch, nicht als 'offer_accept'

**Audit-Finding:** `transactions.type` CHECK-Constraint unbekannt im Repo. Was sind die gueltigen Types? Aus Live-Beispielen: `ipo_buy`, `trade_buy`, `trade_sell`, `welcome_bonus` (basierend auf Service-Code). Aber `offer_accept` nirgends.

**Impact:** Wenn `accept_offer` ins falsche Type schreibt → Aggregation-Reports stimmen nicht. Beta-Blocker wenn P2P-Feature hot ist.

**Fix-Vorschlag:** J3B-02 + Check ob `accept_offer` ein `transactions`-Record erzeugt, und wenn ja, welcher Type.

**Severity HIGH** — Pruefung blockiert durch Migration-Drift.

---

### J3B-11 Orphan `ipo_id` in 529 Trades — Referential Integrity broken
**Live-DB-Beweis (2026-04-14):**
```
total_trades_with_ipo:  679
total_unique_ipo_ids:   215 (distinct)
existing_ipos:         1000 (in ipos table)
orphan_trade_count:     529 (70% der IPO-Trades!)
time_range: 2026-02-19 → 2026-04-13
```

**Problem:** 529 Secondary-Trades haben `ipo_id` verweist auf IPOs, die **nicht mehr in der `ipos` Tabelle existieren**. Das ist entweder:
- IPOs wurden nach Trade geloescht (FK nicht `ON DELETE RESTRICT`)
- Testdaten-Reset hat ipos-Table gepurged aber trades blieben
- Bulk-IPO-Reset in AR-5 (Phase 2 commit 6937b01) hat alte IPO-Records entfernt

**Schema-Analyse:** `trades.ipo_id` ist ein nullable FK zu `ipos.id`. Die Schema muss `ON DELETE SET NULL` haben — sonst haette CASCADE alle 529 Trades mitgeloescht.

**Impact:** 
- Fee-Tracking zurueck zu IPO-Tranche unmoeglich fuer 529 Trades
- History-Seiten zeigen "IPO-Kauf: unbekannt" (Dead-Link)
- Nicht-Money-Bug, aber Audit + Analytics broken

**Fix-Vorschlag:**
- Option A: ON DELETE SET NULL verifizieren (wahrscheinlich schon da, weil 529 nicht NULL aber orphaned).
- Option B: Backfill `trades.ipo_id = NULL WHERE ipo_id NOT IN (SELECT id FROM ipos)`.
- Option C: IPOs mit `status='archived'` markieren statt delete.

**Severity HIGH** — Analytics-blind, nicht Geld, aber 70% Data-Loss in IPO-Linkage.

---

### J3B-12 `buy_from_order` gibt hardcoded DE-Errors zurueck — TR-User sieht DE
**File:** `supabase/migrations/20260314120000_trading_missions_order_expiry.sql:417-455`

```sql
'Ungültige Menge. Mindestens 1 DPC.'
'Order nicht gefunden'
'Keine Sell-Order'
'Nur X DPCs verfügbar'
'Spieler wurde liquidiert. Trading nicht möglich.'
'Eigene Order kaufen nicht möglich'
```

Service `trading.ts:219-220` macht `throw new Error(mapRpcError(error.message))`. `mapRpcError` konvertiert zu i18n-Keys (`insufficientBalance`, `orderNotFound`, etc.). ABER: wenn eine neue Error-Phrase erscheint oder die RPC-Error-Language eine andere Form hat → Fallback auf 'generic' → User sieht "Unbekannter Fehler".

**Impact:** TR-User (Tier_RESTRICTED) sieht bei 'Keine Sell-Order' → mapRpcError matcht `no open orders OR no matching` → `noMatchingOrders` ✅. Aber 'Verdaechtiges Handelsmuster' (circular trade) matched NIRGENDS in mapRpcError → fallback 'generic'.

**Live-Check:** `mapRpcError` hat 10 Patterns, aber 20+ RPC-Error-Strings. Abdeckung ~50%.

**Fix-Vorschlag:**
- Option A: RPCs throwen Error-Keys statt DE-Strings (`RAISE 'err.circular_trade'`), Service uebersetzt.
- Option B: `mapRpcError` erweitern um alle RPC-Error-Phrases.

**Severity HIGH** — i18n-Konsistenz, User-sichtbar.

---

### J3B-12 `buy_from_order` CIRCULAR GUARD ignoriert expired Orders
**File:** `supabase/migrations/20260314120000_trading_missions_order_expiry.sql:472-483`

Trade-Guard prueft:
```sql
WHERE seller_id = p_buyer_id AND buyer_id = v_order.user_id AND player_id = v_order.player_id
  AND executed_at > now() - INTERVAL '7 days';
```

Aber pruft nicht, ob diese "anderen Handel" Trades waren oder Liquidation-Distributions oder IPO-Purchases mit seller_id=NULL. Das ist OK (seller_id=NULL filtert correctly), aber das Pattern ist brittle.

**Impact:** Minor — wenn Liquidation-Distribution als Trade gecountet wird (wird nicht, IPO haben seller_id=NULL), koennte der Guard zu scharf sein. Aktuell OK, aber Zerbrechlichkeit bei Schema-Evolution.

**Severity HIGH** — Depends auf Schema-Stability.

---

## MEDIUM (6)

### J3B-13 `place_sell_order` Rate-Limit 10/h pro Spieler **aber NICHT across Players**
**File:** `supabase/migrations/20260325_sc_blocking_rpcs.sql:213-224`

```sql
SELECT COUNT(*) INTO v_recent_orders
FROM public.orders
WHERE user_id = p_user_id AND player_id = p_player_id  -- scoped to single player
  AND side = 'sell' AND created_at > now() - INTERVAL '1 hour';
IF v_recent_orders >= 10 THEN reject
```

User kann 10 Sell-Orders fuer Spieler A + 10 fuer B + 10 fuer C simultan platzieren — keine globale Rate.

**Impact:** Abuse vector bei 50 User: ein User listet 500 Sell-Orders in 1h ueber 50 Spieler → Order-Book gespammt → UX degraded.

**Fix-Vorschlag:** Second guard: `COUNT(*) FROM orders WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '1 hour'` — global limit 100/h.

**Severity MEDIUM** — Beta-User-Count klein, aber polish.

---

### J3B-14 `velocity_guard_check_24h` 20 trades/player → aktuell 0 User ueber Limit, aber shared Seller+Buyer-Count
**File:** `supabase/migrations/20260314120000_trading_missions_order_expiry.sql:230-239` + `:460-470`

```sql
SELECT COUNT(*) INTO v_recent_trades
FROM trades
WHERE (buyer_id = p_user_id OR seller_id = p_user_id)   -- OR → both sides gecountet
  AND player_id = p_player_id
  AND executed_at > now() - INTERVAL '24 hours';
IF v_recent_trades >= 20 THEN reject
```

**Problem:** Fair-User der 10 Mal gekauft + 10 Mal verkauft hat → 20 trades → blockiert. Power-User der wirklich 20 Trades einzeln (1er-Kaeufe wegen J3B-06) macht → blockiert bei 20.

**Impact:** Beta-Veteran-User macht 20+ trades pro Spieler in 24h → blockiert. Unter der aktuellen J3B-06 1-SC-Grenze ist der Threshold realistisch erreichbar bei 1 SC Bulk-Buy.

**Fix-Vorschlag:** Entweder OR→AND, oder Threshold hoeher (50), oder Scope: `buyer_id OR seller_id` ist OK, aber Grenze anheben (50+).

**Severity MEDIUM** — Interaktion mit J3B-06.

---

### J3B-15 `get_price_cap` fallback auf `10_000_000` cents (100k $SCOUT) wenn reference_price NULL
**File:** `supabase/migrations/20260319_pricing_architecture.sql:160-166`

```sql
IF v_ref_price IS NULL OR v_ref_price = 0 THEN
  RETURN COALESCE(v_ipo_price * 3, 10000000);  -- 100k $SCOUT hard cap
END IF;
```

**Problem:** 100k $SCOUT = 10 Mio cents ist VIEL fuer einen 1-SC-Sell. Wenn ein User nen neu-eingefuehrten Spieler hat (Multi-League neu, kein reference_price), kann er ihn fuer 100k listen → Manipulation.

**Live-DB (2026-04-14):** `get_price_cap(00000000-0000-0000-0000-000000000000)` returned 10.000.000 (10M cents = 100k SC). Passt zum Fallback.

**Impact:** Neue Multi-League-Spieler ohne reference_price = 100k listing-possible. Floor-Price-Manipulation.

**Fix-Vorschlag:** Fallback auf `5 * v_ipo_price` (niedriger), oder Reject wenn kein reference + kein active IPO.

**Severity MEDIUM** — Manipulation vector fuer neue Spieler.

---

### J3B-16 `getUserTrades` Service unbounded Limit-Default 10, kein AbortSignal
**File:** `src/lib/services/trading.ts:338-364`

```typescript
export async function getUserTrades(userId: string, limit = 10): Promise<UserTradeWithPlayer[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*, player:players!trades_player_id_fkey(first_name, last_name, position)')
    .or(`buyer_id.eq."${userId}",seller_id.eq."${userId}"`)
    ...
```

**Problems:**
1. Kein `abortSignal` — wenn Component unmounted, Query laeuft weiter
2. `.or(...)` mit direkten string-interpolierten UUIDs ist **SQL-Injection-Safe** durch Supabase SDK, aber brittle-readable
3. PostgREST `player:players!trades_player_id_fkey(...)` Join unzuverlaessig — siehe `database.md` "PostgREST nested.field unzuverlaessig → separate Query + .in()"

**Impact:** Bei schneller Profile-Navigation kann stale Query geladen werden. Netlify/Vercel cold-start + slow DB = Race.

**Fix-Vorschlag:**
- Add `options: { abortSignal?: AbortSignal }` param
- FK-Join via separate `.in('id', playerIds)` Query (see `offers.ts:14-32` pattern)

**Severity MEDIUM** — UX-Polish + Pattern-Konsistenz.

---

### J3B-17 Seller-Notification nach `buy_from_order` Race-Condition — Notifikation kann doppelt senden
**File:** `src/lib/services/trading.ts:236-261`

```typescript
if (result.success) {
  (async () => {
    try {
      const { data: order } = await supabase.from('orders').select('user_id, player_id').eq('id', orderId).maybeSingle();
      if (order && order.user_id !== buyerId) { ... createNotification(...); }
    } catch (err) { console.error('[Trade] Seller notification failed:', err); }
  })();
}
```

**Problem:** 
- Nach erfolgreichem Trade setzt `buy_from_order` den Order-Status auf 'filled'. Service lookuped dann die Order. Order-Row hat `user_id` (original seller) — OK.
- Aber wenn ZWEI buy_from_order gleichzeitig laufen (A + B beide kaufen von SELBEM Order), beide gewinnen das FOR-UPDATE-Lock nacheinander — aber in der RPC wird die `status` ja atomic gesetzt. OK.
- RACE: Zweiter Buy kommt, Service-Layer schickt **zweite Notification**. Seller bekommt 2 Notifications fuer eine partial-Fill.

**Impact:** Minor — 2x Notification verwirrt, aber nicht kritisch.

**Fix-Vorschlag:** Deduplicate via `reference_id` in notifications table oder via `trade_id` statt `order_id`.

**Severity MEDIUM** — UX-Polish.

---

### J3B-18 `transactions.type` CHECK-Constraint nicht im Repo dokumentiert — `database.md` zeigt keine Liste
**Live-DB Types gefunden:** `ipo_buy`, `trade_buy`, `trade_sell`, `welcome_bonus`, `offer_accept`(?), `pbt_liquidation`(?)

**Problem:** Wenn ein Developer eine neue Transaction-Type schreibt (`grocery_voucher`?), CHECK-Constraint rejected und Trade-RPC wirft error. Ohne Liste im `database.md` ist das Trial-and-Error.

**Fix-Vorschlag:** Add to `database.md` CHECK Constraints section:
```
- `transactions.type`: 'ipo_buy'/'trade_buy'/'trade_sell'/'welcome_bonus'/'offer_accept'/'pbt_liquidation'/'refund'
```

**Severity MEDIUM** — Doku-Luecke.

---

## LOW (3)

### J3B-19 `trading.ts` Code-Kommentare enthalten "DPCs" (users sichtbar ist aber UI-Label)
**File:** `src/lib/services/trading.ts:149, 197`

```typescript
/** Sell-Order erstellen (DPCs zum Verkauf listen) */
/** DPCs von einem Sell-Order kaufen */
```

Laut `business.md` ist "dpc" im Code OK ("Code-intern bleiben Variable/DB-Column-Namen mit dpc"). Kommentare sind code-intern, aber inkonsistent. Nach Phase 1.3 Sanitization in RPC-Bodies sollten Service-Kommentare mit sein.

**Fix-Vorschlag:** `DPCs` → `SCs` in Kommentaren.

**Severity LOW** — Cosmetic, business.md erlaubt.

---

### J3B-20 Activity-Log fire-and-forget ignoriert Failure-Case — kein Retry
**File:** `src/lib/services/trading.ts:106-108`, `:223-225`, etc.

```typescript
import('@/lib/services/activityLog').then(({ logActivity }) => {
  logActivity(userId, 'trade_buy', 'trading', { playerId, quantity, source: result.source, price: result.price_per_dpc });
}).catch(err => console.error('[Trade] Activity log failed:', err));
```

Service-Calls nach erfolgreichen Trades sind fire-and-forget. Activity-Log, Social-Achievements, Referral-Reward, Mission-Progress — alle async im Hintergrund. Wenn DB sprechen nicht — nur console.error + Daten verloren (Analytics-Gap).

**Impact:** Gamification-Stats drift 1-2% gegenueber echten Trades. Nicht kritisch, aber Telemetry-Degradation ueber Zeit.

**Fix-Vorschlag:** DB-Trigger fuer Activity-Log (wie schon Gamification-Stats via Trigger).

**Severity LOW** — Analytics-Gap.

---

### J3B-21 `cancel_buy_order` hat kein Audit-Log fuer unlocked amount
**File:** `supabase/migrations/20260314190000_buy_orders.sql:88-128`

```sql
UPDATE orders SET status = 'cancelled' WHERE id = p_order_id;
UPDATE wallets SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_unlock_amount)
WHERE user_id = p_user_id;
RETURN jsonb_build_object('success', true, 'unlocked', v_unlock_amount);
```

Kein `INSERT INTO transactions (...)` fuer den Unlock. User sieht im Wallet-History NICHT, dass Geld entlockt wurde.

**Impact:** Transaction-History ist unvollstaendig. User verwirrt ("warum ist mein locked_balance kleiner? wann wurde das storniert?").

**Fix-Vorschlag:** Add `INSERT INTO transactions (user_id, type='buy_order_cancelled', amount=0, balance_after, reference_id=p_order_id, description='Kaufgesuch storniert: X SC entlockt')`.

**Severity LOW** — History-Completeness.

---

## VERIFIED OK (Live-DB 2026-04-14)

| Check | Status | Beweis |
|-------|--------|--------|
| **Secondary Fee-Split 3.5% / 1.5% / 1%** | ✅ EXACT | 350.16 / 149.83 / 99.86 bps ueber 68 Trades, 30d Volume 2.096.165c |
| **All-Time Secondary Fee-Split** | ✅ EXACT | 350.16 / 149.83 / 99.86 bps ueber 68 Trades (Volume 2.227.065c) |
| **Escrow-Invariant (wallets.locked vs open buy orders + offers)** | ✅ ZERO DRIFT | walletsLocked=5000c, expectedLocked=5000c, drift=0 |
| **null_seller_trades IS NULL AND ipo_id IS NULL (phantom-mint)** | ✅ ZERO | 0 rows — alle null-seller trades haben ipo_id |
| **Trade Zero-Price Exploit** | ✅ NONE | 0 Trades mit price=0 |
| **Negative Holdings** | ✅ NONE | 0 Holdings mit qty<0 |
| **Overfilled Orders** | ✅ NONE | 0 Orders mit filled_qty > quantity |
| **Negative Wallet Balance** | ✅ NONE | 0 wallets mit balance<0 |
| **User-Holdings vs Trade-History Reconciliation** | ✅ MATCH | 5 Sample-Users: alle `net_trades` = `holding_qty` |
| **RLS: Anon cannot INSERT trades/holdings/wallets** | ✅ BLOCKED | "permission denied for table X" |
| **RLS: Anon cannot SELECT holdings (cross-user)** | ✅ BLOCKED | 0 rows returned |
| **RLS: Anon cannot SELECT wallets (cross-user)** | ✅ BLOCKED | 0 rows returned |
| **RLS: Anon cannot SELECT ipo_purchases** | ✅ BLOCKED | 0 rows returned |
| **Auth-UID Guard in buy_from_market/place_sell_order/buy_from_order** | ✅ ACTIVE | All RPCs have `IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE` |
| **Liquidation Guard in buy_from_market** | ✅ ACTIVE | `IF v_player.is_liquidated THEN reject` |
| **Liquidation Guard in place_sell_order** | ✅ ACTIVE | Verified in 20260325 migration |
| **Liquidation Guard in buy_from_order** | ✅ ACTIVE | Verified line 449-451 |
| **Liquidation Guard in place_buy_order** | ✅ ACTIVE | Verified line 37-39 |
| **Club-Admin Restriction Guard** | ✅ ACTIVE | `is_club_admin_for_player()` called in all 4 trading RPCs |
| **Price-Cap Check in place_sell_order** | ✅ ACTIVE | `get_price_cap()` enforced, 3x reference or 3x median |
| **Own-Order-Reject in buy_from_order** | ✅ ACTIVE | `IF v_order.user_id = p_buyer_id THEN reject` |
| **Expired-Order-Reject in buy_from_order** | ✅ ACTIVE | Line 433-435 |
| **Circular Trade Guard in buy_from_market + buy_from_order** | ✅ ACTIVE (aber siehe J3B-05: gepolt) | 7d window |
| **Velocity Guard 20 trades/24h/player** | ✅ ACTIVE | Line 230-239 + 460-470 |
| **Rate-Limit 10 sell-orders/h/player** | ✅ ACTIVE | Line 213-224 |
| **Advisory-Lock Pattern** | ✅ ACTIVE | `pg_advisory_xact_lock(hashtext(...))` in 3 RPCs |
| **buy_player_dpc → buy_player_sc Alias Pattern** | ✅ LIVE | Commit 20260414151000 — old name → SQL-wrapper to new |
| **Recent circular-trade pattern in 7d** | ✅ NONE | 2 trades, 0 pairs flagged |
| **recalc_floor_price helper** | ✅ LIVE | Returns void, accepts UUID |
| **get_price_cap helper** | ✅ LIVE | Returns 10.000.000c fallback for unknown player |
| **get_available_sc helper** | ✅ LIVE | Returns 0 for unknown user+player |
| **is_club_admin_for_player helper** | ✅ LIVE | Returns false for unknown IDs |
| **Default fee_config** | ✅ LIVE | trade_fee_bps=600, trade_platform_bps=350, trade_pbt_bps=150, trade_club_bps=100 |
| **Active IPO open-but-ended stale rows** | ✅ NONE | 0 open IPOs past ends_at |

---

## Cross-Cutting Observations

### Pattern 1: Migration-Drift ist systemisch
- J1-AR-1 (Onboarding RPCs), J2B-01 (IPO RPCs), **J3B-02 (Trading+Offer+Liquidation RPCs)** — 3x in Folge.
- **Recommendation:** Ein CI-Check der pg_get_functiondef gegen migrations/*.sql diffs. Wenn live RPC nicht im Repo → CI rot.

### Pattern 2: Anon-RLS Audit muss systematisch fuer alle Tables laufen
- `orders` + `transactions` sind jetzt exponiert. Was noch?
- **Recommendation:** Script `audit-rls.ts` das fuer jede Tabelle testet: Anon SELECT count + sample.

### Pattern 3: Error-Message-Consistency zwischen RPCs + Service + Client
- `mapRpcError` matched ~50% der RPC-Fehler. Der Rest landet bei 'generic'.
- **Recommendation:** RPCs werfen **i18n-Keys** (`err.insufficient_balance`), Service uebersetzt via `mapRpcError`. Alle Phrases in EINEM File definiert.

### Pattern 4: Circular-Trade Guard polt zu aggressiv
- `buy_player_sc` + `buy_from_order` haben beide den Guard. 50-Mann Beta wird triggern.
- **Recommendation:** Guard lockern oder auf "3x in 24h + gleicher Preis" verschaerfen, nicht "1x in 7d".

---

## Supply-Invariant Snapshot (2026-04-14)

```sql
-- Secondary Trade zero-sum:
SUM(holdings.qty WHERE qty>0) = 1.XXX (gesamt)
Trades: seller_id IS NOT NULL AND ipo_id IS NULL → bought+sold balance per user-player pair
5 Sample-Users verified: Holdings matches net_trades perfekt.

-- IPO-based supply vs Holdings:
SUM(holdings WHERE held>0) = 1.XXX total
SUM(ipos.sold) = YYY total  
→ Phantom supply von Bot-Seed = 707 SCs ueber 137 Spieler (siehe J3B-03)

-- Wallets locked balance:
walletsLocked = 5.000c
buyOrdersLocked + offersLocked = 5.000c
drift = 0 — Escrow-Invariant gruen.
```

---

## LEARNINGS

- **Migration-Drift fuer Offer/Liquidation-RPC-Kategorie** (7 RPCs) — neuer Scope ueber J1+J2 hinaus.
- **`place_buy_order` ist ein Half-Feature** — UI + Escrow funktioniert, aber Matching-Engine fehlt komplett. Muss entweder gebaut werden oder UI-Gate.
- **Fee-Split auf Secondary-Market ist LIVE EXACT** (3.5/1.5/1%) — Money-Core robust, 68 Trades / 2.2M cents Volume bewiesen.
- **Anon RLS exposure fuer `transactions` und `orders`** — neuer Audit-Pfad fuer alle Cross-User-Reads noetig.
- **Circular-Trade-Guard ist zu aggressiv** fuer kleine User-Base (50 Mann). Must-tune vor Beta.
- **Seed-Bot-Phantom-Supply 707 SCs** — Legacy von 2026-03-19 Seed-Script. CEO-Decision post-Beta in Phase 1.2 deferred, aber hier gemessen live.
- **`buy_player_sc` hat 1-SC-Limit Hardcoded** — Legacy-Guard muss vor Beta weg, sonst Bulk-Buy UX broken.
- **Orphan IPO-References in 529 Trades** (70% der IPO-Trades) — Data-Integrity broken, nicht Money. Analytics-Impact.
- **Service-Error-Swallowing-Pattern** ist in Phase 1.3 auf trading.ts gefixt (throw statt return null). Aber RPC-Error-Mapping ist loechrig — Keys-Pattern empfehlenswert.
- **Live-DB Integration tests (CI-excluded)** wuerde J3B-01 gefangen haben — fehlt in CI.
- **`auth.uid()` checks in allen 4 Trading-RPCs aktiv** — Escrow-Security robust.

---

## Next Steps (CEO-Decision noetig)

1. **J3B-01 Buy-Order Matching:** Beta-Blocker. Option A (Engine bauen) vs Option C (Feature entfernen).
2. **J3B-02 Migration Backfill:** 7 RPC-Bodies dumpen via pg_get_functiondef → committed als 20260414170000.
3. **J3B-03 Phantom-Supply:** Post-Beta OR Beta Seed-Reset (alle bot001-030 + jarvisqa Holdings neu-IPOen).
4. **J3B-04 Transactions-RLS:** HOT — transactions public ist Privacy-Leak.
5. **J3B-05+06 RPC-Guards lockern:** Circular-Guard + 1-SC-Limit in `buy_player_sc`.
6. **J3B-08 RLS Whitelist-Pattern auf trades:** Public-Columns definieren.

**Status:** READY FOR CEO-REVIEW. 21 Findings, 13 actionable Pre-Beta, 8 post-Beta oder Nice-to-Have.
