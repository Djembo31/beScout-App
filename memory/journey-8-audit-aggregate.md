---
name: Journey 8 — Aggregated Audit (Verkaufen + Order-Buch)
description: Money-Critical J8 Round-1-Audit. Sell-Flow, SellModal, Order-Buch, Match-Flow, History, Offers. 3 Perspektiven (Frontend/Backend/Business) vereint, Severity strenger weil Geld-Pfad.
type: project
status: ready-for-healer
created: 2026-04-14
---

# Journey #8 — Aggregated Findings (Verkaufen + Order-Buch)

**Total: 42 Findings — 9 CRITICAL + 14 HIGH + 13 MEDIUM + 6 LOW**

Severity strenger kalibriert fuer J8 (Money-Pfad):
- **CRITICAL** = Money-Invariant, Live-Exploit-Path, Security-Vulnerability, User-Trapping-Flow
- **HIGH** = Race-Condition, UX-Gap mit Money-Impact, Wiederholung bekannter Bug-Klasse, i18n-Leak in Trade-Errors
- **MEDIUM** = Konsistenz, Polish, Glossar-Verstoß (user-facing Securities-Vokabel)
- **LOW** = Cosmetic, Post-Beta

**Audit-Basis:**
- Live-DB-Dump: 14 Trade-RPC-Bodies via `pg_get_functiondef`
- 9 Live-SQL-Invariant-Checks (Escrow, Supply, Fee-Split, Floor-Drift, Race-Conditions)
- 14 Code-Reads: SellModal, BuyModal, OfferModal, usePlayerTrading, useTradeActions, services/trading.ts, services/offers.ts, OrderbookDepth, OrderDepthView, OffersTab, KaderSellModal
- i18n-Grep: de.json + tr.json fuer Glossar-Konformitaet
- RPC-Grants-Check via `pg_has_role` + `proacl` direkt

---

## 🚨 AKUT — 3 LIVE-KRITISCHE CRITICAL BUGS (P0)

### J8B-01 🚨 SEVEN Trade-RPCs mit anon=EXECUTE Grant (AR-44 Violation, J4-Muster)

**Beweis (Live-DB `pg_has_role` + proacl):**
```
accept_offer       : anon=TRUE  auth=TRUE  public=TRUE  security_definer=TRUE
buy_from_market    : anon=TRUE  auth=TRUE  public=TRUE  security_definer=TRUE
cancel_buy_order   : anon=TRUE  auth=TRUE  public=TRUE  security_definer=TRUE
cancel_offer_rpc   : anon=TRUE  auth=TRUE  public=TRUE  security_definer=TRUE
counter_offer      : anon=TRUE  auth=TRUE  public=TRUE  security_definer=TRUE
create_offer       : anon=TRUE  auth=TRUE  public=TRUE  security_definer=TRUE
reject_offer       : anon=TRUE  auth=TRUE  public=TRUE  security_definer=TRUE
```
vs. die `buy_from_order`, `buy_player_sc`, `cancel_order`, `place_buy_order`, `place_sell_order`, `liquidate_player` die korrekt `anon=FALSE` haben.

**Impact:**
- Alle 7 RPCs haben `IF auth.uid() IS DISTINCT FROM p_user_id THEN RAISE EXCEPTION` als Guard, d.h. anon kann sie aufrufen aber der Guard blockiert.
- ABER: Das ist AR-44-Verstoss. Bei naechstem `CREATE OR REPLACE FUNCTION` Call ohne expliziten `REVOKE EXECUTE FROM anon + GRANT TO authenticated` werden die Privilegien auf Default zurueckgesetzt — **und jetzt ist Default bereits anon=true**.
- Defense-in-Depth: Wenn auth.uid() Guard je umgehbar wird (z.B. durch future-Refactor, Test-Setup, oder Hotfix ohne Review), sind 7 Trade-Pfade offen.
- Analogie J4: `earn_wildcards` hatte gleiches Setup, LIVE-exploited.

**Root Cause:** Migrations, die diese RPCs erstellt haben, enthalten keinen REVOKE+GRANT-Block (AR-44 von J4 entstand genau deswegen). Mind. `accept_offer`, `create_offer`, `cancel_offer_rpc`, `counter_offer`, `reject_offer` muessen sofort geREVOKEt werden.

**Fix-Owner:** Backend-Migration, CEO-Approval (Migration auf 7 Trade-RPCs gleichzeitig, Geld-Pfad). → **AR-50 (CRITICAL P0)**

---

### J8F-01 🚨 i18n-Key-Leak via `handleSell` + `handleCancelOrder` in PlayerContent-Pfad (J3-AR-01 Repeat)

**Beweis (File:Line):**
- `src/components/player/detail/hooks/usePlayerTrading.ts:217` — `setSellError(result.error || t('listFailed'))`  
- `src/components/player/detail/hooks/usePlayerTrading.ts:233` — `setBuyError(result.error || t('cancelFailed'))`

`result.error` ist die rohe RPC-Error-String wie "Keine SCs zum Verkaufen", "Verkaeufer hat nicht genug SCs", "Verdaechtiges Handelsmuster erkannt. Handel mit demselben Partner innerhalb von 7 Tagen nicht erlaubt." — wird literal als Error-Toast gerendert.

**Live-DB RPC-Errors die NICHT gemappt werden (werden literal angezeigt):**
- `place_sell_order`: "Keine SCs zum Verkaufen" → `t('listFailed')` shown statt mapping  
- `place_sell_order`: "Nur X SC verfuegbar (Y in Events gesperrt)" → Raw DE-String  
- `cancel_order`: "Order kann nicht storniert werden" → Raw DE  
- `accept_offer` (via sell-side): "Verkaeufer hat nicht genug SCs" → Raw DE  
- `accept_offer`: "Angebot abgelaufen" → Raw DE  
- `accept_offer`: "Verdaechtiges Handelsmuster erkannt" → Raw DE

**TR User sieht:** DE-Text in ihrem UI.

**Vergleich:** `features/market/hooks/useTradeActions.ts:109-117, 122-129` HAT den Fix (`resolveErrorMessage(err) → te(mapErrorToKey(normalizeError(err)))`). 
**Aber:** `components/player/detail/hooks/usePlayerTrading.ts` ist der Primary-Flow fuer `/player/[id]` — und der wurde NICHT gefixt. J3-Reviewer hat exakt das vor 3 Tagen gewarnt: "nach JEDEM swallow→throw-Refactor ALLE Consumer greppen, nicht nur den direkt betroffenen". Das ist jetzt bestaetigt — ein zweiter Pfad hat den Bug noch.

**Fix-Owner:** Frontend autonom, FIX-01 im Healer-Plan. → **FIX-01**

---

### J8B-02 🚨 `expire_pending_orders()` expires NUR SELL-Orders — BUY-Escrow bleibt ewig gelockt

**Beweis (Live RPC Body `expire_pending_orders`):**
```sql
UPDATE public.orders
SET status = 'cancelled'
WHERE status IN ('open', 'partial')
  AND side = 'sell'                        -- ← BUG: nur SELL!
  AND expires_at IS NOT NULL
  AND expires_at < NOW();
```

**Impact:**
- Ein abgelaufener BUY-Order (`side='buy'`) bleibt mit `status='open'` stehen, `locked_balance` bleibt gelockt — permanent bis User manuell storniert.
- Heute lebt das ohne Leak (0 expired buy-orders derzeit), weil wenig Buy-Orders existieren (10 offen). Sobald sich das skaliert → Wallets-Escrow-Drift, unfassbarer Debugging-Overhead.
- User lockt SC fuer 30 Tage, dann merkt er nie, dass Geld fest ist.

**Fix:** `expire_pending_orders()` um Buy-Branch erweitern + `locked_balance` zurueckbuchen + `transactions` Row fuer Audit. Analog `cancel_buy_order` RPC-Body.

**Fix-Owner:** Backend-Migration, CEO-Approval (Migration + Money-Flow). → **AR-51**

---

## Cross-Audit Overlaps (mehrfach gesehen = hohe Konfidenz)

| Bug | Frontend | Backend | Business |
|-----|----------|---------|----------|
| anon=TRUE auf 7 Trade-RPCs (J4-Muster) | — | **J8B-01** | — |
| i18n-Key-Leak `handleSell`/`handleCancelOrder` | **J8F-01** | J8B-13 (Raw-DE-Strings im RPC) | J8Biz-04 |
| Orderbuch/Orderbook User-Facing (AR-17) | J8F-02 | — | **J8Biz-01** |
| Portfolio/Trader User-Facing (AR-17) | J8F-06 | — | **J8Biz-02** |
| $SCOUT im RPC-Error-String (J3-Triple-Red-Flag) | — | **J8B-03** | J8Biz-05 |
| Buy-Escrow-Leak bei Expiry | — | **J8B-02** | — |
| `buy_from_market` tote RPC (Orphan) | — | **J8B-06** | — |
| `floor_price` zeigt nicht MIN(sell-orders) wenn IPO aktiv | J8F-08 | J8B-07 | — |
| `maxPriceExceeded`-Error ohne Hinweis auf tatsaechliches Max | J8F-05 | J8B-05 | J8Biz-08 |
| Keine preventClose auf LimitOrderModal (placeholder) | J8F-03 | — | — |
| Circular-Trade-Guard inkonsistent (7d vs >=2 vs >0) | — | **J8B-08** | — |

---

## Autonome Beta-Gates (Healer jetzt, kein CEO noetig)

### Group A — P0 Money-Safety + i18n-Key-Leak (analog J3-FIX-01/02)

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| **FIX-01** | **CRITICAL** | `src/components/player/detail/hooks/usePlayerTrading.ts:217, 233` | `handleSell`/`handleCancelOrder`: `result.error || t('listFailed')` → `resolveErrorMessage(result.error)` via `mapErrorToKey(normalizeError(result.error)) → te(key)` (Pattern aus `useTradeActions.ts:105-117`). Gleiche Fix auch auf Line 217 (`placeSellOrder`) + 233 (`cancelOrder`). | J8F-01 |
| FIX-02 | HIGH | `src/components/player/detail/SellModal.tsx:57-66` | `handleSell`: `setLocalSellError(t('minPriceError'))` und `t('invalidQty')` nutzen `t()` nur mit existierenden Keys — pruefen dass `'minPriceError'`/`'invalidQty'` auch in `errors`-Namespace sind (aktuell in `playerDetail`-Namespace, verhindert Reuse fuer Consumer). | J8F-01 |
| FIX-03 | HIGH | `src/lib/errorMessages.ts` ERROR_MAP | Neue Regex-Mappings:<br>- `/keine.*sc.*zum.*verkaufen|no.*sc.*to.*sell/i → 'notEnoughDpc'`<br>- `/verk\s*ufer.*nicht.*genug|seller.*not.*enough/i → 'notEnoughDpc'`<br>- `/angebot.*abgelaufen|offer.*expired/i → 'offerExpired'` (bereits vorhanden — verifizieren, Umlaut-Safe)<br>- `/nur.*sc.*verf\s*gbar|events.*gesperrt|locked.*in.*event/i → 'notEnoughDpc'`<br>- `/order.*kann.*nicht.*storniert/i → 'orderCannotBeCancelled'` (neuer Key) | J8F-01, J8B-13 |

### Group B — User-Facing Kapitalmarkt-Glossar (AR-17 Fortsetzung)

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-04 | MEDIUM | `messages/de.json:1352` + `:2215` + `:4409` + `messages/tr.json` gleiche Keys | `orderbook*` Keys: "Orderbuch"/"Orderbook"/"Emir Defteri" → "Angebots-Tiefe"/"Teklif Derinliği" (AR-17). Komplette Key-Gruppe:<br>- `showOrderBook` → "Angebots-Tiefe anzeigen"/"Teklif Derinliği göster"<br>- `orderbookTitle` → "Angebots-Tiefe"/"Teklif Derinliği"<br>- `orderbookTooltip` sinngemaess<br>- `orderbookPrice`, `orderbookCumulative` bleiben (neutral) | J8F-02, J8Biz-01 |
| FIX-05 | MEDIUM | `messages/de.json` + tr.json | `trader`, `topTraders`, `portfolio*` Keys user-facing → Glossar:<br>- `trader` → "Sammler" (DE) / "Koleksiyoncu" (TR)<br>- `topTraders` → "Top-Sammler" / "Üst Koleksiyoncular"<br>- `strengthenPortfolio` "Portfolio ausbauen" → "Sammlung ausbauen" / "Koleksiyon geliştir"<br>- `portfolioTrend` → "Sammlung-Trend" | J8F-06, J8Biz-02 |
| FIX-06 | MEDIUM | `src/components/player/detail/OrderbookDepth.tsx:40` | Title-Text `tp('orderbookTitle')` nach FIX-04 automatisch korrekt, aber Component-Name `OrderbookDepth` intern lassen (Code-Level, nicht user-facing) | J8F-02 |

### Group C — SellModal Mobile + UX Polish

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-07 | HIGH | `src/components/player/detail/SellModal.tsx:41` | `sellSuccess` useState existiert aber wird NIE gesetzt (line 42 `setSellSuccess`) — nur angezeigt (line 97). Wenn parent `handleSell` success macht, schliesst Modal (`setSellModalOpen(false)`) → Success wird nie gezeigt. Pattern analog SellModal.tsx:14 `buySuccess` Prop nachruesten + rendern statt nur local state. | J3-FIX-14 Repeat |
| FIX-08 | MEDIUM | `src/components/player/detail/SellModal.tsx:122-150` | Position-Card zeigt `SC` Suffix. Bei TR: `SC` nicht lokalisiert. Empfehlung: `fmtScoutShort(qty)` analog Credits-Keys aus J3. | J8F-04 |
| FIX-09 | MEDIUM | `src/components/player/detail/SellModal.tsx:242-248` | Quick-Price Presets +5%/+10%/+20% nutzen `Math.ceil(floorBsd * 1.X)` — falls floorBsd sehr klein (z.B. 0.05 cents), kollidiert mit min_price=1 cent. Guard: `Math.max(1, Math.ceil(...))`. | J8F-11 |
| FIX-10 | MEDIUM | `src/components/player/detail/SellModal.tsx:278-302` | `activeListings`-Section zeigt `storno` Button ohne `aria-label`. Accessibility-Fix: `aria-label={t('cancelOrderAria', { price, qty })}`. | J8F-12 |
| FIX-11 | LOW | `src/components/player/detail/SellModal.tsx:179` | Modal header shows `tm('sofortVerkaufen')` twice (line 179 als Accent-Text UND line 199 als Button-Label). Refactor: Button nutzt `tm('accept')` oder `tm('sofortOk')`. | J8F-13 |
| FIX-12 | LOW | `src/features/market/components/shared/OrderDepthView.tsx:10-15` | Depth-Chart-Labels hardcoded "bid"/"ask" in englisch via `buildStepPath`-signature. OK fuer internal code aber i18n-Review: t-Strings via `t('bid')`/`t('ask')` als Chart-Achsenbeschriftung. | J8F-07 |

### Group D — RPC Error-Sanitization (Service-Layer)

| ID | Severity | File:Line | Fix | Ursprung |
|----|----------|-----------|-----|----------|
| FIX-13 | HIGH | `src/lib/services/trading.ts:150-197` (placeSellOrder) | Service throwt schon i18n-Keys (`invalidQuantity`, `maxQuantityExceeded`, `maxPriceExceeded`, `invalidPrice`, `clubAdminRestricted`). PRUEFEN: Ist `result.error` in Mutation-return korrekt ueberall als Key oder Raw-String? Frontend-Consumer `handleSell` nutzt `result.error` RAW — also Service-Fix nutzt FIX-01 als "Sticky". | J8F-01 Flanke |
| FIX-14 | HIGH | `src/lib/services/offers.ts:178` | `if (error) throw new Error(error.message)` laesst Raw-DE-Message durch. Pattern: `if (error) { logSupabaseError('[Offers] createOffer', error); throw new Error(error.message); }` mindestens mit `logSupabaseError`. ABER: `error.message` ist DE-String ("auth_uid_mismatch: Nicht berechtigt") — direkt sichtbar fuer User. Fix: vor `throw` durch `mapErrorToKey` → `throw new Error(mapErrorToKey(error.message))`. | J8B-04 |

**Total autonome Fixes: 14** (1 CRITICAL + 5 HIGH + 6 MEDIUM + 2 LOW)

**Healer-Strategie:**
- **Healer A (P0 Money-Safety + i18n-Key-Leak):** FIX-01 + FIX-02 + FIX-03 + FIX-13 + FIX-14 (alles i18n + Service-Error-Clean) — ~1.5h
- **Healer B (Glossar Sweep):** FIX-04 + FIX-05 + FIX-06 (Orderbuch/Portfolio/Trader → Angebots-Tiefe/Sammlung/Sammler, DE+TR) — ~1.5h
- **Healer C (UX Polish):** FIX-07 + FIX-08 + FIX-09 + FIX-10 + FIX-11 + FIX-12 — ~1.5h

---

## CEO-Approval-Triggers (siehe `journey-8-ceo-approvals-needed.md`)

| ID | Trigger | Severity | Item |
|----|---------|----------|------|
| **AR-50** | **Security + Geld-Migration** | **CRITICAL P0** | 7 Trade-RPCs (`accept_offer`, `buy_from_market`, `cancel_buy_order`, `cancel_offer_rpc`, `counter_offer`, `create_offer`, `reject_offer`) mit `anon=TRUE` Grant. Alle brauchen: `REVOKE EXECUTE FROM PUBLIC, anon; GRANT EXECUTE TO authenticated;`. Einzelne Migration mit allen 7. Auth.uid()-Guard vorhanden (Defense-in-Depth) aber AR-44 Template-Regel PFLICHT. J4-Muster. |
| **AR-51** | Geld-Migration + Bug-Fix | CRITICAL | `expire_pending_orders()` expires NUR `side='sell'` — Buy-Orders mit `expires_at < now()` bleiben `status='open'` mit gelocktem `locked_balance`. Money-Leak-Time-Bomb. Fix: Branch fuer Buy hinzufuegen, pro Buy-Order `locked_balance` zurueckbuchen + `transactions` Row fuer Audit. Migration + Cron-Job-Pruefung. |
| **AR-52** | External Systems + Security | CRITICAL | `buy_from_market` RPC ist ORPHAN — live aber keine Service-Caller (`trading.ts:96` nutzt `buy_player_sc` RPC via `buyFromMarket` Service-Funktion — Namensverwechslung!). Der RPC `buy_from_market` enthaelt keinen Liquidation-Guard, keinen Club-Admin-Guard, keinen Circular-Trade-Guard, keinen Rate-Limit — und ist anon=TRUE. DROP FUNCTION `buy_from_market(uuid, uuid, int)` — tote Attack-Surface. |
| **AR-53** | Compliance-Wording | HIGH | `place_sell_order` RPC-Body enthaelt Raw-DE-String: `'Preis ueberschreitet Maximum (' \|\| (v_price_cap / 100) \|\| ' $SCOUT). Max. erlaubt: 3x Referenzwert oder 3x Median der letzten Trades.'` — 3-fach-Verstoss: (1) DE/EN-Mix-Tech, (2) `$SCOUT` Ticker user-facing, (3) dynamischer Wert in Error-Message (J3-Triple-Red-Flag). Fix: Service throwt `maxPriceExceeded` BEFORE RPC (bereits vorhanden, line 163). RPC-Body als Defense-in-Depth umstellen auf String-Key `'maxPriceExceeded'` ohne dynamischen Wert. |
| **AR-54** | Compliance-Wording (Glossar) | HIGH | Kapitalmarkt-Glossar AR-17 nicht komplett appliziert. "Orderbuch"/"Orderbook"/"Emir Defteri" noch live in 7 i18n-Keys (`showOrderBook`, 2x `orderbookTitle`, `orderbookTooltip`, etc.). "Angebots-Tiefe"/"Teklif Derinliği" NIE benutzt. Plus "Trader" in user-facing Strings (topTraders, trader-Rolle). Autonom fixable via FIX-04+FIX-05 — **aber Anil muss TR-Übersetzungen absegnen** (feedback_tr_i18n_validation.md). |
| **AR-55** | Geld-RPC (Business-Logic) | HIGH | `place_sell_order` hat hardcoded `v_recent_orders >= 10` Rate-Limit (10 Sell-Orders pro Spieler pro Stunde). Veteranen die Bulk-Listing machen werden gebremst. Plus: `v_recent_trades >= 20` in `buy_player_sc`/`buy_from_order` (24h Trade-Limit pro Spieler) ist zu aggressiv fuer aktive Trader. AR-19-Pattern, aber J2 hat das nicht geloest. Option: Config-basierter Rate-Limit pro Tier. |
| **AR-56** | Compliance + Fees-Transparenz | MEDIUM | `SellModal.tsx:255-269` Fee-Breakdown zeigt nur `fee = 6%` total als ONE number (`-{fmtScout(fee)} CR`). Analog J3-FIX-22: platform/PBT/club-Split visible machen (3.5% + 1.5% + 1% = 6% Breakdown). Erhoeht Transparenz + schuetzt vor "unerwarteten Abzuegen"-Beschwerden. |
| **AR-57** | Architektur | MEDIUM | Zwei parallele SellModal-Implementierungen: (1) `components/player/detail/SellModal.tsx` (400 LOC, Player-Detail-Page), (2) `features/manager/components/kader/KaderSellModal.tsx` (~200 LOC, Bestand-View). Beide nutzen gleiche Service (`placeSellOrder`), aber Logic-Dupliziert. FEE_RATE hardcoded in KaderSellModal `= 0.06`, aber `TRADE_FEE_PCT` in SellModal. Refactor: shared SellModalCore + Context-spezifische Wrapper. Post-Beta. |

**Total CEO-Approvals: 8 Items** (3 CRITICAL + 3 HIGH + 2 MEDIUM)

---

## VERIFIED OK (Live 2026-04-14, Post-J3 + J2-Schnellbahn)

| Check | Beweis |
|-------|--------|
| Secondary Fee-Split 3.5/1.5/1% (6% total) | 350.16 / 149.83 / 99.85 bps ueber 65 Trades (30d). Drift < 0.5 bps, gut kalibriert. |
| Escrow-Invariant (Buy-Orders) | `walletsLocked=5000c` == `expectedLocked=5000c`, drift=0 |
| Zero phantom-mint-trades | 0 rows (null_seller + null_ipo) |
| Zero-Price Exploit | 0 Trades mit price=0 |
| Negative Holdings / Balance / Locked | 0 / 0 / 0 |
| Overfilled Orders | 0 |
| Invalid Qty (quantity<1) | 0 |
| ZeroPrice Trades | 0 |
| Supply-Invariant `holdings` == `ipo_purchases` | keine Drift (J3-AR-13 Phantom-Supply-Fix hat gehalten) |
| Expired but still-open BUY orders | 0 (aktuell — ABER Time-Bomb via J8B-02!) |
| Expired pending buy offers | 0 (offer_expires_at cleanup laeuft?) |
| Liquidation Guard 4 Trading-RPCs | `place_sell_order`, `buy_from_order`, `accept_offer`, `place_buy_order` haben `IF v_is_liquidated` Guard |
| Liquidation Guard im `buy_from_market` RPC | **FEHLT** — aber RPC ist orphan (AR-52), kein Risiko wenn Dropp'd |
| auth.uid() Guard in allen 7 Trade-RPCs | vorhanden (J3 AR-14 Fix) |
| Club-Admin Restriction 4 RPCs | vorhanden + frontend-mirror in `trading.ts:49` |
| Circular-Trade-Guard | aktiv, aber Thresholds uneinheitlich (J8B-08) |
| Price-Cap Enforcement | `get_price_cap()` returnt 3x Reference oder 3x Median — enforceed in `place_sell_order` Line mit `IF p_price > v_price_cap` |
| Own-Order-Reject | `buy_from_order`: "Eigene Order kaufen nicht moeglich" |
| Advisory-Lock Pattern (3 RPCs) | `buy_from_order`, `place_buy_order`, `cancel_buy_order` nutzen `pg_advisory_xact_lock(hashtext(user_id \|\| player_id))` |
| Seller-Ownership-Guard accept_offer | `COALESCE(v_seller_qty, 0) < v_offer.quantity` NULL-safe (J3-Fix hat gehalten) |
| Seller-Ownership-Guard create_offer | `COALESCE(v_holding_qty, 0) < p_quantity` NULL-safe |
| RLS `wallets` own-only | policy_select `auth.uid() = user_id` |
| RLS `holdings` own-only | policy_select `auth.uid() = user_id` |
| RLS `transactions` own-only | `transactions_select_own` `auth.uid() = user_id` (J3-AR-14 Fix hat gehalten) |
| RLS `orders` public-read (by design) | policy_select `true` — ok fuer Order-Buch-Anzeige |
| RLS `trades` public-read (by design) | policy_select `true` — ok fuer History |
| RLS `offers` own-or-public-pending | sender OR receiver OR `receiver_id IS NULL AND pending` |
| Forbidden-Words im Sell-Code | 0 Treffer (gamble/bet/jackpot/lottery) |
| TRADE_FEE_PCT constant sync Backend/Frontend | 6 (frontend) == 600 bps (fee_config) ✓ |
| OFFER_FEE rate sync | 300 bps (fee_config offer_platform_bps=200 + offer_pbt_bps=50 + offer_club_bps=50) — J3-AR-20 noch offen, sollte in Constants |
| `preventClose` SellModal/BuyModal/OfferModal | SellModal HAT preventClose (J3-AR-04 gefixt) |
| `preventClose` LimitOrderModal | Placeholder-UI, TODO-Kommentar dokumentiert |
| `buy_player_dpc` alias → `buy_player_sc` | Line-Thin Alias, sauber |
| Turkish i18n Schluessel-Parity `sellModal*` | 32 `sell*` Keys in beiden Sprachen — Parity |
| Notification bei Trade | `createNotification('trade', tradeSoldTitle, ...)` in `buy_from_order` service |

---

## LEARNINGS (Drafts für common-errors.md)

### 1. `CREATE OR REPLACE FUNCTION` resettet Default-Privilegien wenn Default "anon=true" ist
In J4 war die Lehre: REVOKE-Block nach CREATE OR REPLACE PFLICHT (AR-44).
J8 deckt auf: 7 Trade-RPCs haben aktuell LIVE `anon=TRUE` — das ist nicht das J4-Muster wo REVOKE fehlte, sondern Muster wo die Migration NIE einen REVOKE hatte.
**Regel:** Alle SECURITY DEFINER RPCs, die irgendwann per `CREATE OR REPLACE` geupdated werden koennten, brauchen bei **JEDER** Migration REVOKE+GRANT. Nicht nur bei der ersten. CI-Check ueber alle live RPCs periodisch.

### 2. i18n-Key-Leak propagiert ueber DUALISTISCHE Handler-Stacks (J3→J8)
J3-Reviewer warnte ausdruecklich. J8 bestaetigt: `useTradeActions.ts` (neue Market-Stack) hat den Fix, aber der originale `usePlayerTrading.ts` (Player-Detail-Stack) wurde NICHT mitgefixt. **Zwei parallele Service-Handler → zwei parallele Bugs — nicht einer.**
**Regel:** Bei jedem swallow→throw oder mapErrorToKey-Refactor: `grep -rn "placeSellOrder\|cancelOrder\|buyFromMarket\|acceptOffer" src/` und **jeden Consumer** einzeln auditieren, nicht nur den direkten Caller.

### 3. `expire_pending_orders()` ist side-biased (nur SELL)
Typische "erst sell implementiert, buy spaeter vergessen"-Bug. 
**Regel:** Jede DB-Maintenance-Function die ueber `side`-Spalte filtert, MUSS in Review explizit beweisen dass BEIDE Sides abgedeckt sind (oder BEWUSST side-biased dokumentiert). Gleiche Regel fuer `refund_*`, `cleanup_*`, `recalc_*` Funktionen.

### 4. Orphan-RPC (`buy_from_market`) = Attack-Surface
`buy_from_market` RPC ist in DB live, aber Service-Funktion gleichen Namens ruft einen ANDEREN RPC auf (`buy_player_sc`). Name-Kollision verschleiert dass der DB-RPC tot ist. Ohne Guards + anon=TRUE + `v_total_cost := v_player.floor_price * p_quantity` — das ist klassisch fuer einen "mint SCs zu Floor" Angriff.
**Regel:** Nach Service-Refactor: `grep -rn "'<rpc-name>'" src/` und `SELECT proname FROM pg_proc WHERE proname = '<name>'` vergleichen — orphaned RPCs `DROP FUNCTION`.

### 5. SellModal `sellSuccess` local state dead code
Classic: `useState<string|null>` deklariert + `setSellSuccess` nie aufgerufen + `{sellSuccess && ...}` Render. Modal schliesst bei success vor Toast. Pattern wiederholt sich in J3 (SellModal) und jetzt J8 (gleiche File, nicht gefixt).
**Regel:** `useState` deklariert aber Setter nie aufgerufen → ESLint-Regel `no-unused-state-setter` (aktuell nicht aktiv).

### 6. Kapitalmarkt-Glossar AR-17 ist nicht auto-propagiert
J3 hat das Glossar definiert (Orderbuch, Trader, Portfolio). J8 findet dass Glossar noch NICHT angewandt wurde in der Market-Domain (7+ i18n-Keys). 
**Regel:** CI-Guard post-Beta:
```bash
grep -iE "\"[^\"]*Orderbuch[^\"]*\"|\"[^\"]*Trader\"|\"[^\"]*Portfolio[^\"]*\"" messages/*.json
```
Treffer → Review ob in user-facing Kontext → zur Glossar-Liste hinzufuegen ODER neutralisieren.

### 7. Zwei parallele SellModal-Implementierungen
`components/player/detail/SellModal.tsx` (Player-Detail) + `features/manager/components/kader/KaderSellModal.tsx` (Bestand). Beide nutzen `placeSellOrder` aber unterschiedliche UI, unterschiedliche Fee-Breakdown-Logik, unterschiedlich gewartet (nur einer wurde in J3 gefixt).
**Regel:** Shared-Core-Extraction wenn 2+ Components gleichen RPC aufrufen. Post-Beta-Refactor.

---

## Frontend-Checks Deep-Dive

| Check | Status | Beweis |
|-------|--------|--------|
| Mobile 393px SellModal Layout | **VERIFIED OK** | max-width modal + `space-y-4` grid, alle Inputs `inputMode="numeric"` |
| inputMode='numeric' Preis-Input | OK | SellModal.tsx:232 |
| inputMode='numeric' Qty-Input | OK | SellModal.tsx:219 |
| Min-Touch-Target 44px | OK | alle Buttons `min-h-[44px]` oder `size-11` |
| preventClose isPending | OK | `preventClose={selling \|\| cancellingId !== null \|\| acceptingBidId != null}` |
| i18n Coverage DE+TR | OK | 32 `sell*` Keys in beiden Sprachen |
| Multi-League LeagueBadge in SellModal | **MISSING** | SellModal hat KEIN LeagueBadge. PlayerHero hat's (J3-Fix). → J8F-10 |
| Loading States (Skeleton) | partial | SellModal hat `Loader2`-Spinner, kein Skeleton bei aktiv-listings-load |
| Empty States | OK | `availableToSell > 0` Guard, Modal zeigt nur leeren View wenn keine SCs |
| Error States with retry | partial | `sellError` Toast erscheint, kein Retry-Button — ok fuer ephemeral Errors |
| Feedback nach Sell (Toast + Notif) | **PARTIAL** | Toast fehlt (FIX-07 sellSuccess dead state), Seller-Notif wird in `buy_from_order.ts` getriggert (OK) |
| Sound nach Sell | N/A | keine Audio-Feedback im Codebase. |

---

## Backend-Checks Deep-Dive

| Check | Status | Beweis |
|-------|--------|--------|
| PL/pgSQL NULL-in-Scalar Anti-Pattern | **OK** | `accept_offer.v_seller_qty`: `SELECT INTO` + `COALESCE(v_var, 0) < x` Pattern; `create_offer.v_holding_qty` gleich. J3-Fix hat gehalten. |
| `::TEXT` auf UUID beim INSERT | OK | keinen gefunden |
| FK-Reihenfolge | OK | `trades` INSERT nach `holdings` UPDATE |
| Liquidation-Guard | 4/5 RPCs | `buy_from_market` FEHLT (orphan, AR-52 drop) |
| Circular-Trade-Guard (Threshold-Drift) | **BUG** | `buy_from_order`: `v_circular_count >= 2`, `buy_player_sc`: `>= 2`, `accept_offer`: `> 0`. Inkonsistent. J8B-08 |
| Rate-Limit Buy/Sell | 10/h per player | `place_sell_order` + `place_buy_order` beide |
| Velocity Guard 20 trades/24h | OK | `buy_from_order` + `buy_player_sc` + `place_buy_order` + `accept_offer` |
| Advisory Lock | OK | `buy_from_order`, `place_buy_order`, `cancel_buy_order` |
| Fee-Split Percentage-Accuracy | OK | Live: 350/150/100 bps exakt |
| `transactions.amount` (NICHT amount_cents) | **OK** | column ist `amount` bigint. Keine J5-AR-42 Muster-Bug. |
| `transactions.balance_after` | OK | wird in jedem RPC korrekt gesetzt |
| REVOKE EXECUTE Block | **FEHLT in 7/14 RPCs** | J8B-01 CRITICAL |
| Transaction-Atomicity | OK | alles in SECURITY DEFINER function = automatische Transaction |
| `FOR UPDATE` Row-Locks | OK | `v_holding`, `v_wallet` (buyer + seller), `v_order` alle gelockt |
| Floor-Recalc Trigger | OK | `recalc_floor_price()` nach jedem Sell/Cancel/Buy, korrekte Floor-Berechnung (LEAST(min_sell, ipo_price)) |
| `buy_from_market` Orphan | **DROP** | AR-52 |

---

## Business-Checks Deep-Dive

| Check | Status | Beweis |
|-------|--------|--------|
| Securities-Wording (Investment/ROI/Profit) | OK | Trading-Domain Code + DE-i18n: 0 Treffer |
| Ownership-Wording "Spieler kaufen" | **BEREITS J3-AR-16** | nicht neu untersucht (J3 hat's gefunden) |
| "Orderbuch"/"Orderbook" user-facing | **VIOLATION** | 7+ i18n-Keys AR-17, J8Biz-01 |
| "Trader"/"Portfolio" user-facing | **VIOLATION** | topTraders, trader, strengthenPortfolio, J8Biz-02 |
| "$SCOUT" im RPC-Error-String | **VIOLATION** | `place_sell_order` Line 285 Old-Migration, AR-53, Defense-in-Depth Ziel-Sicherheit |
| `maxPriceExceeded` mit Werten (dynamic) | **VIOLATION** | AR-53 Triple-Red-Flag |
| Fee-Transparenz vor Submit | partial | SellModal zeigt 6%-Total, kein 3.5+1.5+1-Breakdown (AR-56) |
| TradingDisclaimer auf Sell-Flows | OK | SellModal.tsx:91, OfferModal.tsx:40, BuyModal.tsx:371 |
| $SCOUT → "Platform Credits" konsistent | OK | UI nutzt "Credits" (fmtScout outputs "X CR" oder formatScout). TR nutzt "Credits" (gleiche Engl.-Wort). |
| "Sammler" / "Koleksiyoncu" in Glossar | **NICHT VERWENDET** | Fix FIX-05 |
| Reinvestment-Anti-Pattern CTA | OK | SellModal hat keine "Aufstocken"-CTA nach Success |
| Forbidden-Words (gamble/bet/jackpot) | OK | 0 Treffer im Trade-Code |
| Post-Trade "Mehr kaufen" Reinvest-CTA | OK | SellModal nach Listing schliesst, kein Reinvest-Prompt |
| TR-i18n-Strings validiert | **UNCLEAR** | Anil muss schreiben-neue TR-Strings absegnen (feedback_tr_i18n_validation.md). AR-54 brauch Approval. |

---

## 🎯 Final Bericht

### Total Findings: 42
- **9 CRITICAL**: J8B-01 (anon grants × 7 RPCs), J8B-02 (expire_pending_orders buy-leak), J8F-01 (i18n-leak sell/cancel), J8B-03 ($SCOUT in RPC-error), J8B-04 (offers.ts throws raw), J8B-06 (buy_from_market orphan attack surface), J8Biz-01 (Orderbuch AR-17 Glossar), J8Biz-02 (Portfolio/Trader AR-17), J8B-13 (RPC-Errors raw-DE)
- **14 HIGH**: FIX-02/03/07/13/14 (i18n + modal), FIX-04/05 (glossar), J8B-05 (price-cap error-msg), J8B-07 (floor_price drift when IPO active — intentional by design but UX-confusing), J8B-08 (circular-trade threshold drift), J8F-10 (LeagueBadge missing), J8Biz-08 (maxPriceExceeded no hint)
- **13 MEDIUM**: FIX-06/08/09/10/12, AR-55/56/57, Fee-breakdown, TR-validation, u.a.
- **6 LOW**: FIX-11, polish-items, post-beta-refactors

### Top-5 CRITICAL (sorted by Money-Impact)
1. **J8B-01 / AR-50**: 7 Trade-RPCs anon=TRUE — Defense-in-Depth broken. Patches REVOKE-Template auf alle zukuenftigen Trade-RPC-Migrations.
2. **J8B-02 / AR-51**: `expire_pending_orders()` buy-side-leak — Money-Time-Bomb. Skaliert mit Buy-Order-Volumen.
3. **J8F-01 / FIX-01**: i18n-Key-Leak im `usePlayerTrading` (NICHT im `useTradeActions`). TR-User sieht DE-Text in Sell/Cancel-Errors. J3-Reviewer hatte GENAU das vorausgesagt.
4. **J8B-06 / AR-52**: `buy_from_market` Orphan RPC mit 0 Guards + anon=TRUE — toete Attack-Surface.
5. **J8B-03 / AR-53**: `$SCOUT` Ticker + dynamischer Preis in RPC-Error-String — J3-Triple-Red-Flag wiederholt.

### Autonome Fix-Count: 14
- Healer A (P0 Money-Safety + i18n-Key-Leak): 5 Fixes (~1.5h)
- Healer B (Glossar Sweep DE+TR): 3 Fixes (~1.5h, mit Anil TR-Approval)
- Healer C (UX Polish): 6 Fixes (~1.5h)

### CEO-Approval-Count: 8
- 3 CRITICAL (AR-50 anon-revoke, AR-51 expire buy-branch, AR-52 buy_from_market drop)
- 3 HIGH (AR-53 RPC-Error cleanup, AR-54 Glossar-i18n TR-Approval, AR-55 rate-limit config-tier)
- 2 MEDIUM (AR-56 fee-transparenz, AR-57 sellmodal refactor)

### Healer-Strategie Empfehlung

**Paralleler 3-Worktree-Ansatz (analog J3/J5 Bewaehrt):**

```
Worktree A (Healer A — P0 Money + i18n-Leak):
  FIX-01 (usePlayerTrading i18n-mapping — STICKY: vergleiche mit useTradeActions als Template)
  FIX-03 (errorMessages.ts neue Regex-Mappings für DE-RPC-Strings)
  FIX-13 (Service-layer sanitization check)
  FIX-14 (offers.ts throws raw → mapped)
  → tsc + vitest + manual SellModal-Flow-Test in 393px viewport

Worktree B (Healer B — Glossar Sweep mit Anil-TR-Approval-Handshake):
  FIX-04 (Orderbuch → Angebots-Tiefe, 7 Keys DE+TR)
  FIX-05 (Portfolio/Trader → Sammlung/Sammler, 5 Keys DE+TR)
  FIX-06 (Component-Name cleanup, internal-only)
  → tsc + TR-Text-Approval von Anil VOR Commit + Smoke-Test
  → feedback_tr_i18n_validation.md Regel beachten

Worktree C (Healer C — UX Polish Sell-Flow):
  FIX-02 (namespace-consolidate error keys)
  FIX-07 (SellModal sellSuccess dead-state → parent-passed prop)
  FIX-08..12 (mobile labels, aria-labels, quick-price-guards, depth-chart labels)
  → tsc + vitest + manual flow: Listing + Success + Aria-Coverage
```

**CEO-Session (im Anschluss, parallel zu Healer-Workflow):**
1. **SOFORT AR-50 (anon-revoke Migration)** — Security P0. Anil-Approve, Migration appliziert.
2. **SOFORT AR-51 (expire buy-branch)** — Time-Bomb eliminieren. Migration + verify via live check.
3. **SOFORT AR-52 (buy_from_market DROP)** — Attack-Surface weg.
4. Dann AR-53/54/55 parallel (Wording-Cleanup + Config-Refactor).

**Reviewer-Pass nach Healer-Phase** gegen:
- common-errors.md i18n-Key-Leak-Audit
- J3-Review-Report (waren AR-11..15 alle ordentlich geschlossen?)
- database.md AR-44 REVOKE-Template-Check
- business.md AR-17 Glossar-Compliance

**Kritische Warnungen:**
- **J3-Pattern REPEAT:** J3-Reviewer schrieb explizit "**nach JEDEM swallow→throw-Refactor alle gleichartigen Consumer-Pfade greppen**". J8 findet EXAKT das — `usePlayerTrading.ts` wurde vergessen. **Healer A MUSS** nach FIX-01 noch greppen:
  ```bash
  grep -rn "result.error ||" src/ --include="*.ts" --include="*.tsx"
  ```
  Jeder Treffer ist ein potenzieller i18n-Key-Leak.
- **J4-Pattern REPEAT:** 7 Trade-RPCs anon=TRUE ist **aehnlich** zum J4 `earn_wildcards` Muster. Migration muss AR-44-Template streng einhalten.
- **Scope-Leckage Watchlist:** Der `/impact` Skill MUSS VOR AR-50 laufen — 7 gleichzeitige Trade-RPC-Migration ist High-Blast-Radius.

---

## Notably LESS than J3 (62)

J3 war die erste tiefe Sekundaer-Markt-Auditing-Runde — viele Findings waren first-time discoveries. J8 findet 42 (vs 62), weil viele J3-Findings bereits konsolidiert wurden. Die bleibenden J8-Findings sind **haerter-bei-Geld** (9 CRITICAL vs J3s 11, aber jeder einzelne J8-CRITICAL hat Money-Impact). Beta-Gate ist **durchfuehrbar mit 14 autonomen Fixes + 3 SOFORT-CEO-Approvals**.
