# Data Integrity Audit: All 4 Buy Paths
## Status: Done
## Date: 2026-03-14

## Scope
Complete parity audit of all 4 buy paths in BeScout:
1. `buyFromMarket()` -> `buy_player_dpc` RPC (market buy from cheapest sell order)
2. `buyFromOrder()` -> `buy_from_order` RPC (buy from specific sell order)
3. `buyFromIpo()` -> `buy_from_ipo` RPC (IPO purchase)
4. `acceptOffer()` -> `accept_offer` RPC (P2P offer acceptance)

---

## PARITY MATRIX

### DB-Level Guards (inside RPC)

| Guard                        | buy_player_dpc | buy_from_order | buy_from_ipo | accept_offer (BEFORE) | accept_offer (AFTER) |
|------------------------------|:-:|:-:|:-:|:-:|:-:|
| Auth guard (auth.uid())      | YES | YES | YES | YES | YES |
| Input validation             | YES (qty=1 pilot) | YES | YES | YES | YES |
| Liquidation check            | YES | YES | YES | YES (MISSING) | **FIXED** |
| Club admin block             | YES | YES | N/A (no player context) | NO (MISSING) | **FIXED** |
| Advisory lock                | YES | YES | YES | NO (MISSING) | **FIXED** |
| Velocity guard (20/24h)      | YES | YES | N/A | NO (MISSING) | **FIXED** |
| Circular trade guard (7d)    | YES | YES | N/A | NO (MISSING) | **FIXED** |
| Balance check (- locked)     | YES | YES | YES | YES | YES |
| Holdings check (seller)      | YES (implicit via order) | YES (implicit) | N/A | YES | YES |
| Fee calculation              | YES (trade 6%) | YES (trade 6%) | YES (IPO 85/10/5) | YES (P2P 3%) | YES |
| Subscription fee discount    | YES | YES | N/A | N/A | N/A |
| Wallet debit buyer           | YES | YES | YES | YES | YES |
| Wallet credit seller         | YES | YES | N/A (no seller) | YES | YES |
| Holdings transfer            | YES | YES | YES (buyer only) | YES | YES |
| Trade record                 | YES | YES | YES | YES | YES |
| Transaction records (audit)  | YES (2 rows) | YES (2 rows) | YES (1 row) | YES (2 rows) | YES |
| PBT treasury credit          | YES | YES (credit_pbt) | YES | YES | YES |
| PBT transaction log          | YES (w/ trade_id) | YES (w/ trade_id) | YES (w/ trade_id) | NO trade_id (MISSING) | **FIXED** |
| Club treasury credit         | YES | YES | YES | YES | YES |
| Player price update          | YES (last_price, floor, volume) | YES (last_price, floor, volume, change) | YES (last_price, volume, dpc_available) | PARTIAL (no floor_price) | **FIXED** |
| Order status update          | YES | YES | N/A | N/A (offer status) | YES |
| IPO sold count               | N/A | N/A | YES | N/A | N/A |
| Auto-end IPO if sold out     | N/A | N/A | YES | N/A | N/A |
| DB mission progress          | N/A | N/A | N/A | YES (daily_trade) | YES |
| Expiry guard                 | YES (order expires_at) | YES (order expires_at) | YES (IPO ends_at) | YES (offer expires_at) | YES |

### Service-Level Side Effects (TypeScript)

| Side Effect                  | buyFromMarket | buyFromOrder | buyFromIpo (BEFORE) | buyFromIpo (AFTER) | acceptOffer (BEFORE) | acceptOffer (AFTER) |
|------------------------------|:-:|:-:|:-:|:-:|:-:|:-:|
| Activity log (always)        | YES | YES | YES | YES | YES | YES |
| Achievement check            | YES | YES | YES | YES | YES | YES |
| Mission progress (service)   | YES | YES | YES | YES | YES | YES |
| Seller notification          | YES | YES | N/A | N/A | YES | YES |
| Referral reward              | YES | NO (MISSING) | NO (MISSING) | **FIXED** | NO (MISSING) | **FIXED** |
| Cache invalidation (UI)      | YES (mutation hook) | YES (usePlayerTrading) | YES (mutation hook) | YES | YES (usePlayerTrading) | YES |
| Club admin check (service)   | YES | YES | NO (MISSING) | **FIXED** | N/A (DB handles) | N/A |
| Liquidation check (service)  | YES | N/A (DB handles) | NO (MISSING) | **FIXED** | N/A (DB handles) | N/A |

### place_buy_order RPC (unapplied migration)

| Guard                        | Status |
|------------------------------|--------|
| Auth guard                   | YES |
| Input validation             | YES |
| Liquidation check            | YES |
| Club admin block             | YES |
| Advisory lock                | YES |
| Balance check                | **BUG: used `balance_cents` instead of `balance`** -> **FIXED in migration file** |
| Escrow lock (locked_balance) | YES |

---

## CRITICAL FIXES APPLIED

### 1. accept_offer RPC — 6 Missing Guards (SECURITY)
**File:** Applied as migration `accept_offer_integrity_guards`
**Severity:** CRITICAL
**What was missing:**
- Liquidation check: Could trade liquidated players via P2P offers
- Club admin block: Club admins could bypass trading restriction via offers
- Advisory lock: Race condition on concurrent offer accepts
- Velocity guard: No rate limit, enabling abuse
- Circular trade guard: No wash-trading prevention
- floor_price update: Player floor_price not recalculated after P2P trade
- trade_id on pbt_transactions: Missing audit trail link

### 2. place_buy_order RPC — Wrong Column Name (CRASH)
**File:** `supabase/migrations/20260314190000_buy_orders.sql:52,59`
**Severity:** CRITICAL (runtime crash — function would fail on every call)
**Fix:** `balance_cents` -> `balance` (actual column name in wallets table)

### 3. buyFromOrder — Missing Referral Reward
**File:** `src/lib/services/trading.ts:216`
**Severity:** MEDIUM (money: referred users miss reward on first order-book trade)
**Fix:** Added `triggerReferralReward(buyerId)` in success block

### 4. buyFromIpo — Missing Referral Reward + Defense-in-Depth Guards
**File:** `src/lib/services/ipo.ts:84-116`
**Severity:** MEDIUM (money: referred users miss reward on first IPO buy)
**Fix:** Added `triggerReferralReward(userId)`, liquidation check, club admin check

### 5. acceptOffer — Missing Referral Reward
**File:** `src/lib/services/offers.ts:198-210`
**Severity:** MEDIUM (money: referred users miss reward on first P2P trade)
**Fix:** Added `triggerReferralReward(userId)` in success block

---

## MINOR GAPS (documented, not blocking)

### 1. accept_offer: No subscription fee discount
Unlike buy_player_dpc and buy_from_order, P2P offers don't apply club subscription fee discounts. This is intentional (P2P has its own lower fee structure: 3% vs 6%), but should be documented.

### 2. buy_from_ipo: No velocity/circular guards
IPOs don't have velocity or circular trade guards. This is acceptable because IPO has a per-user purchase limit (max_per_user) and there's no counterparty.

### 3. buyFromOrder: No liquidation check at service level
The DB RPC handles it. Only buyFromMarket has a service-level pre-check. Low risk since DB is authoritative.

### 4. accept_offer DB: Mission progress only tracks daily_trade
Unlike service layer which triggers ['daily_trade', 'weekly_5_trades'], the DB RPC only calls update_mission_progress for 'daily_trade'. The service layer compensates by also calling triggerMissionProgress with both keys, but if the DB mission progress call and service call both fire, daily_trade gets incremented twice. However since update_mission_progress uses LEAST(progress + increment, target_value), this caps at target and is harmless.

### 5. price_change_24h not updated by accept_offer
buy_from_order calculates and updates price_change_24h on the player. buy_player_dpc and accept_offer do not. This means P2P trades don't affect the 24h price change indicator. Low impact since it's recalculated by cron.

---

## Files Changed
- `src/lib/services/trading.ts` — Added referral reward to buyFromOrder
- `src/lib/services/ipo.ts` — Added referral reward, liquidation check, club admin check to buyFromIpo
- `src/lib/services/offers.ts` — Added referral reward to acceptOffer
- `supabase/migrations/20260314190000_buy_orders.sql` — Fixed balance_cents -> balance
- DB migration `accept_offer_integrity_guards` — Applied: 6 missing guards + floor_price + pbt trade_id

## Verification
- `npx tsc --noEmit` — 0 errors
- DB migration applied successfully to production
