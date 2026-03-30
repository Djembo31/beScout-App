# PBT Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close 3 remaining gaps in the PBT system: transaction history UI, RPC deduplication, migration sync.

**Architecture:** PBT is 85-90% done. Trading/IPO/Offer fees already credit `pbt_treasury` via `credit_pbt()` or inline SQL. Liquidation distributes PBT to holders. This plan adds a transaction log UI, unifies RPCs to use `credit_pbt()`, and syncs migration files.

**Tech Stack:** React + TanStack Query (UI), PostgreSQL plpgsql (RPCs), Supabase migrations

---

### Task 1: Query Key + Hook for PBT Transactions

**Files:**
- Modify: `src/lib/queries/keys.ts:172-174`
- Modify: `src/lib/queries/misc.ts:13,125-132`

**Step 1: Add query key**

In `src/lib/queries/keys.ts`, expand the `pbt` object:

```typescript
// ── PBT ──
pbt: {
  byPlayer: (pid: string) => ['pbt', pid] as const,
  transactions: (pid: string) => ['pbt', 'transactions', pid] as const,
},
```

**Step 2: Add import + hook**

In `src/lib/queries/misc.ts`, add import:

```typescript
import { getPbtForPlayer, getPbtTransactions } from '@/lib/services/pbt';
```

(Replace the existing single import of `getPbtForPlayer`.)

Add hook after `usePbtForPlayer`:

```typescript
export function usePbtTransactions(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.pbt.transactions(playerId!),
    queryFn: () => getPbtTransactions(playerId!, 10),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}
```

**Step 3: Run tsc**

Run: `npx tsc --noEmit`
Expected: PASS (no consumers yet, just adding exports)

**Step 4: Commit**

```
feat: add usePbtTransactions query hook
```

---

### Task 2: PBT Transaction History UI in PerformanceTab

**Files:**
- Modify: `src/components/player/detail/PerformanceTab.tsx`
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Add i18n keys**

In `messages/de.json` under `playerDetail`:

```json
"pbtTransactions": "Letzte Transaktionen",
"pbtNoTransactions": "Noch keine Transaktionen",
"pbtSourceTrading": "Trading",
"pbtSourceIpo": "IPO",
"pbtSourceVotes": "Votes",
"pbtSourceContent": "Content"
```

In `messages/tr.json` under `playerDetail`:

```json
"pbtTransactions": "Son İşlemler",
"pbtNoTransactions": "Henüz işlem yok",
"pbtSourceTrading": "Trading",
"pbtSourceIpo": "IPO",
"pbtSourceVotes": "Oylar",
"pbtSourceContent": "İçerik"
```

**Step 2: Add transaction list inside PBT Widget**

In `PerformanceTab.tsx`:

1. Add import at top:
```typescript
import { usePbtTransactions } from '@/lib/queries/misc';
```

2. The component receives `player.id` — but PerformanceTab receives `player: Player`. Need to pass `player.id` to the hook. Add inside the component function (after existing state declarations around line 85):

```typescript
const { data: pbtTxs } = usePbtTransactions(player.id, pbtOpen);
```

3. After the sources grid (after line 349, before the closing `</div>` and `</Card>`), add:

```tsx
{/* Transaction History */}
{pbtTxs && pbtTxs.length > 0 && (
  <div>
    <div className="text-xs text-white/40 mb-2">{t('pbtTransactions')}</div>
    <div className="space-y-1">
      {pbtTxs.map(tx => (
        <div key={tx.id} className="flex items-center justify-between py-1.5 px-3 bg-surface-base rounded-lg text-xs">
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-1.5 py-0.5 rounded font-bold uppercase tracking-wide text-[10px]',
              tx.source === 'ipo' ? 'bg-sky-500/20 text-sky-400' : 'bg-gold/20 text-gold',
            )}>
              {t(`pbtSource${tx.source.charAt(0).toUpperCase() + tx.source.slice(1)}` as 'pbtSourceTrading')}
            </span>
            {tx.description && (
              <span className="text-white/40 truncate max-w-[140px]">{tx.description}</span>
            )}
          </div>
          <span className="font-mono tabular-nums text-green-400">
            +{fmtScout(tx.amount / 100)}
          </span>
        </div>
      ))}
    </div>
  </div>
)}
```

**Step 3: Run tsc**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```
feat: PBT transaction history UI in player detail
```

---

### Task 3: RPC Consistency — Unify buy_player_dpc to use credit_pbt()

**Files:**
- Create: `supabase/migrations/20260331_pbt_rpc_consistency.sql`

**Step 1: Write migration**

Replace the inline PBT credit block in `buy_player_dpc` (current lines 336-348) with a `PERFORM credit_pbt(...)` call, matching the pattern already used in `buy_from_order` (line 570).

```sql
-- ============================================
-- PBT RPC Consistency: buy_player_dpc → use credit_pbt()
-- ============================================
-- buy_player_dpc previously inlined PBT credit logic (INSERT INTO pbt_treasury + pbt_transactions).
-- buy_from_order already calls credit_pbt(). This unifies both RPCs.
-- accept_offer also inlines — unified here too.

-- Recreate buy_player_dpc with credit_pbt() call instead of inline logic
CREATE OR REPLACE FUNCTION public.buy_player_dpc(
  p_user_id UUID, p_player_id UUID, p_quantity INT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_order RECORD;
  v_wallet RECORD;
  v_player RECORD;
  v_fee_cfg RECORD;
  v_total_cost BIGINT;
  v_new_balance BIGINT;
  v_holding RECORD;
  v_trade_id UUID;
  v_remaining INT;
  v_seller_balance BIGINT;
  v_total_fee BIGINT;
  v_platform_fee BIGINT;
  v_pbt_fee BIGINT;
  v_club_fee BIGINT;
  v_seller_proceeds BIGINT;
  v_buyer_sub RECORD;
  v_effective_fee_bps INT;
  v_discount_bps INT;
  v_locked BIGINT;
  v_recent_trades INT;
  v_circular_count INT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'auth_uid_mismatch: Nicht berechtigt';
  END IF;

  IF p_quantity != 1 THEN
    RETURN json_build_object('success', false, 'error', 'Im Pilot nur 1 DPC pro Kauf');
  END IF;

  SELECT id, club_id, first_name, last_name, ipo_price, is_liquidated
  INTO v_player FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Spieler nicht gefunden');
  END IF;

  IF v_player.is_liquidated THEN
    RETURN json_build_object('success', false, 'error', 'Spieler ist liquidiert. Kein Trading möglich.');
  END IF;

  IF is_club_admin_for_player(p_user_id, p_player_id) THEN
    RETURN json_build_object('success', false, 'error', 'Club-Admins dürfen keine DPCs ihres eigenen Clubs handeln.');
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_player_id::text));

  -- VELOCITY GUARD
  SELECT COUNT(*) INTO v_recent_trades
  FROM trades
  WHERE (buyer_id = p_user_id OR seller_id = p_user_id)
    AND player_id = p_player_id
    AND executed_at > now() - INTERVAL '24 hours';

  IF v_recent_trades >= 20 THEN
    RETURN json_build_object('success', false, 'error',
      'Tägliches Handelslimit erreicht. Max 20 Trades pro Spieler in 24 Stunden.');
  END IF;

  -- Fee config
  SELECT * INTO v_fee_cfg FROM fee_config
  WHERE club_id = v_player.club_id ORDER BY created_at DESC LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_fee_cfg FROM fee_config WHERE club_id IS NULL ORDER BY created_at DESC LIMIT 1;
  END IF;

  v_discount_bps := 0;
  SELECT tier INTO v_buyer_sub FROM club_subscriptions
  WHERE user_id = p_user_id AND club_id = v_player.club_id AND status = 'active' AND expires_at > now() LIMIT 1;
  IF FOUND THEN
    IF v_buyer_sub.tier = 'gold' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_gold_bps, 150);
    ELSIF v_buyer_sub.tier = 'silber' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_silber_bps, 100);
    ELSIF v_buyer_sub.tier = 'bronze' THEN v_discount_bps := COALESCE(v_fee_cfg.abo_discount_bronze_bps, 50);
    END IF;
  END IF;

  v_effective_fee_bps := GREATEST(0, COALESCE(v_fee_cfg.trade_fee_bps, 600) - v_discount_bps);

  -- CIRCULAR TRADE GUARD
  SELECT COUNT(*) INTO v_circular_count
  FROM trades
  WHERE player_id = p_player_id
    AND executed_at > now() - INTERVAL '7 days';
  -- (circular guard uses the sell order's user below)

  -- Find cheapest sell order
  SELECT o.* INTO v_order FROM orders o
  WHERE o.player_id = p_player_id AND o.side = 'sell' AND o.status IN ('open', 'partial')
    AND (o.expires_at IS NULL OR o.expires_at > NOW())
    AND o.user_id != p_user_id
  ORDER BY o.price ASC, o.created_at ASC
  LIMIT 1 FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Keine Verkaufsorder verfügbar.');
  END IF;

  -- Circular check against specific seller
  SELECT COUNT(*) INTO v_circular_count
  FROM trades
  WHERE seller_id = p_user_id AND buyer_id = v_order.user_id
    AND player_id = p_player_id
    AND executed_at > now() - INTERVAL '7 days';

  IF v_circular_count > 0 THEN
    RETURN json_build_object('success', false, 'error',
      'Verdächtiges Handelsmuster erkannt. Handel mit demselben Partner innerhalb von 7 Tagen nicht erlaubt.');
  END IF;

  v_remaining := v_order.quantity - v_order.filled_qty;
  IF p_quantity > v_remaining THEN p_quantity := v_remaining; END IF;

  v_total_cost := v_order.price * p_quantity;

  v_total_fee := (v_total_cost * v_effective_fee_bps) / 10000;
  IF v_total_fee < 1 AND v_total_cost > 0 THEN v_total_fee := 1; END IF;

  IF v_effective_fee_bps > 0 THEN
    v_pbt_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_pbt_bps, 150)) / 10000;
    v_club_fee := (v_total_cost * COALESCE(v_fee_cfg.trade_club_bps, 100)) / 10000;
    v_platform_fee := GREATEST(0, v_total_fee - v_pbt_fee - v_club_fee);
  ELSE
    v_platform_fee := 0; v_pbt_fee := 0; v_club_fee := 0; v_total_fee := 0;
  END IF;

  v_seller_proceeds := v_total_cost - v_total_fee;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  v_locked := COALESCE(v_wallet.locked_balance, 0);
  IF NOT FOUND OR (v_wallet.balance - v_locked) < v_total_cost THEN
    RETURN json_build_object('success', false, 'error', 'Nicht genug BSD.');
  END IF;

  v_new_balance := v_wallet.balance - v_total_cost;
  UPDATE wallets SET balance = v_new_balance, updated_at = now() WHERE user_id = p_user_id;

  UPDATE wallets SET balance = balance + v_seller_proceeds, updated_at = now()
  WHERE user_id = v_order.user_id RETURNING balance INTO v_seller_balance;

  UPDATE holdings SET quantity = quantity - p_quantity, updated_at = now()
  WHERE user_id = v_order.user_id AND player_id = p_player_id;

  UPDATE orders SET
    filled_qty = filled_qty + p_quantity,
    status = CASE WHEN filled_qty + p_quantity >= quantity THEN 'filled' ELSE 'partial' END
  WHERE id = v_order.id;

  SELECT * INTO v_holding FROM holdings WHERE user_id = p_user_id AND player_id = p_player_id FOR UPDATE;
  IF FOUND THEN
    UPDATE holdings SET
      quantity = v_holding.quantity + p_quantity,
      avg_buy_price = ((v_holding.avg_buy_price * v_holding.quantity) + v_total_cost) / (v_holding.quantity + p_quantity),
      updated_at = now()
    WHERE id = v_holding.id;
  ELSE
    INSERT INTO holdings (user_id, player_id, quantity, avg_buy_price) VALUES (p_user_id, p_player_id, p_quantity, v_order.price);
  END IF;

  INSERT INTO trades (player_id, buyer_id, seller_id, buy_order_id, sell_order_id, price, quantity, platform_fee, pbt_fee, club_fee)
  VALUES (p_player_id, p_user_id, v_order.user_id, NULL, v_order.id, v_order.price, p_quantity, v_platform_fee, v_pbt_fee, v_club_fee)
  RETURNING id INTO v_trade_id;

  -- PBT Treasury credit (unified — uses credit_pbt() instead of inline)
  PERFORM credit_pbt(p_player_id, v_pbt_fee, 'trading', v_trade_id,
    'Trade Fee: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);

  IF v_club_fee > 0 AND v_player.club_id IS NOT NULL THEN
    UPDATE clubs SET treasury_balance_cents = treasury_balance_cents + v_club_fee WHERE id = v_player.club_id;
  END IF;

  UPDATE players SET
    last_price = v_order.price,
    floor_price = COALESCE(
      (SELECT MIN(price) FROM orders WHERE player_id = p_player_id AND side = 'sell' AND status IN ('open', 'partial')
         AND (expires_at IS NULL OR expires_at > NOW())),
      ipo_price),
    volume_24h = volume_24h + v_total_cost,
    price_change_24h = CASE WHEN v_player.ipo_price > 0
      THEN ((v_order.price::NUMERIC - v_player.ipo_price::NUMERIC) / v_player.ipo_price::NUMERIC * 100) ELSE 0 END
  WHERE id = p_player_id;

  INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
  VALUES
    (p_user_id, 'trade_buy', -v_total_cost, v_new_balance, v_trade_id,
     'Kauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name),
    (v_order.user_id, 'trade_sell', v_seller_proceeds, v_seller_balance, v_trade_id,
     'Verkauf: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name || ' (Gebühr: ' || v_total_fee || ' Cents)');

  -- Gamification
  PERFORM update_mission_progress(p_user_id, 'daily_trade', 1);
  PERFORM update_mission_progress(v_order.user_id, 'daily_trade', 1);

  RETURN json_build_object(
    'success', true, 'trade_id', v_trade_id,
    'trade_price', v_order.price,
    'new_balance', v_new_balance,
    'seller_id', v_order.user_id,
    'seller_new_balance', v_seller_balance,
    'platform_fee', v_platform_fee, 'pbt_fee', v_pbt_fee,
    'club_fee', v_club_fee, 'total_fee', v_total_fee
  );
END;
$function$;
```

**CRITICAL:** This migration must include the FULL function body from the current live DB version (read above from migration file), with only the PBT section changed. The inline block (lines 336-348):

```sql
-- OLD (remove):
IF v_pbt_fee > 0 THEN
  INSERT INTO pbt_treasury ...
  ON CONFLICT ...
  SELECT balance INTO v_pbt_balance ...
  INSERT INTO pbt_transactions ...
END IF;

-- NEW (replace with):
PERFORM credit_pbt(p_player_id, v_pbt_fee, 'trading', v_trade_id,
  'Trade Fee: ' || p_quantity || 'x ' || v_player.first_name || ' ' || v_player.last_name);
```

Also remove `v_pbt_balance BIGINT;` from DECLARE (no longer needed).

**Step 2: Apply migration**

Run via Supabase MCP: `apply_migration` with name `pbt_rpc_consistency`

**Step 3: Verify**

```sql
SELECT prosrc FROM pg_proc WHERE proname = 'buy_player_dpc'
```
Confirm: contains `credit_pbt` call, NOT `INSERT INTO pbt_treasury`.

**Step 4: Commit**

```
refactor: unify buy_player_dpc to use credit_pbt()
```

---

### Task 4: Migration Sync — Document Existing PBT Tables

**Files:**
- Create: `supabase/migrations/20260331_pbt_tables_sync.sql`

**Step 1: Write idempotent migration**

```sql
-- ============================================
-- PBT Tables Sync (documentation migration)
-- These tables already exist in production.
-- This migration ensures they are tracked in the local migration history.
-- ============================================

-- 1. PBT Treasury (per-player balance)
CREATE TABLE IF NOT EXISTS public.pbt_treasury (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  trading_inflow BIGINT NOT NULL DEFAULT 0,
  ipo_inflow BIGINT NOT NULL DEFAULT 0,
  votes_inflow BIGINT NOT NULL DEFAULT 0,
  content_inflow BIGINT NOT NULL DEFAULT 0,
  last_inflow_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PBT Transactions (audit log)
CREATE TABLE IF NOT EXISTS public.pbt_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('trading', 'ipo', 'votes', 'content', 'liquidation')),
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  trade_id UUID REFERENCES trades(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pbt_transactions_player_created
  ON pbt_transactions (player_id, created_at DESC);

-- 3. Fee Config (global + per-club overrides)
CREATE TABLE IF NOT EXISTS public.fee_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_name TEXT,
  club_id UUID REFERENCES clubs(id),
  trade_fee_bps INT NOT NULL DEFAULT 600,
  trade_platform_bps INT NOT NULL DEFAULT 350,
  trade_pbt_bps INT NOT NULL DEFAULT 150,
  trade_club_bps INT NOT NULL DEFAULT 100,
  ipo_club_bps INT NOT NULL DEFAULT 8500,
  ipo_platform_bps INT NOT NULL DEFAULT 1000,
  ipo_pbt_bps INT NOT NULL DEFAULT 500,
  abo_discount_bronze_bps INT NOT NULL DEFAULT 50,
  abo_discount_silber_bps INT NOT NULL DEFAULT 100,
  abo_discount_gold_bps INT NOT NULL DEFAULT 150,
  offer_platform_bps INT NOT NULL DEFAULT 200,
  offer_pbt_bps INT NOT NULL DEFAULT 50,
  offer_club_bps INT NOT NULL DEFAULT 50,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. RLS (idempotent — policies may already exist)
ALTER TABLE pbt_treasury ENABLE ROW LEVEL SECURITY;
ALTER TABLE pbt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_config ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pbt_treasury' AND policyname = 'pbt_treasury_select') THEN
    CREATE POLICY pbt_treasury_select ON pbt_treasury FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pbt_transactions' AND policyname = 'pbt_transactions_select') THEN
    CREATE POLICY pbt_transactions_select ON pbt_transactions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fee_config' AND policyname = 'fee_config_select') THEN
    CREATE POLICY fee_config_select ON fee_config FOR SELECT USING (true);
  END IF;
END $$;

-- 5. credit_pbt() function (idempotent)
CREATE OR REPLACE FUNCTION public.credit_pbt(
  p_player_id UUID,
  p_amount BIGINT,
  p_source TEXT,
  p_trade_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_new_balance BIGINT;
BEGIN
  IF p_amount <= 0 THEN RETURN 0; END IF;

  INSERT INTO pbt_treasury (player_id, balance, trading_inflow, ipo_inflow, last_inflow_at)
  VALUES (
    p_player_id, p_amount,
    CASE WHEN p_source = 'trading' THEN p_amount ELSE 0 END,
    CASE WHEN p_source = 'ipo' THEN p_amount ELSE 0 END,
    now()
  )
  ON CONFLICT (player_id) DO UPDATE SET
    balance = pbt_treasury.balance + p_amount,
    trading_inflow = pbt_treasury.trading_inflow + CASE WHEN p_source = 'trading' THEN p_amount ELSE 0 END,
    ipo_inflow = pbt_treasury.ipo_inflow + CASE WHEN p_source = 'ipo' THEN p_amount ELSE 0 END,
    last_inflow_at = now(),
    updated_at = now()
  RETURNING balance INTO v_new_balance;

  INSERT INTO pbt_transactions (player_id, source, amount, balance_after, trade_id, description)
  VALUES (p_player_id, p_source, p_amount, v_new_balance, p_trade_id, p_description);

  RETURN v_new_balance;
END;
$$;

-- Seed default fee config if missing
INSERT INTO fee_config (club_name, trade_fee_bps, trade_platform_bps, trade_pbt_bps, trade_club_bps, ipo_club_bps, ipo_platform_bps, ipo_pbt_bps)
SELECT NULL, 600, 350, 150, 100, 8500, 1000, 500
WHERE NOT EXISTS (SELECT 1 FROM fee_config WHERE club_name IS NULL AND club_id IS NULL);
```

**Step 2: Commit**

```
chore: sync PBT tables + credit_pbt() to local migrations
```

---

## Execution Order

1. **Task 1** (Query Key + Hook) — no dependencies
2. **Task 2** (UI) — depends on Task 1
3. **Task 3** (RPC Consistency) — independent of Task 1-2
4. **Task 4** (Migration Sync) — independent, can run parallel with Task 3

Tasks 1+2 are frontend. Tasks 3+4 are DB. Can be parallelized as two streams.

## Verification

After all tasks:
1. `npx tsc --noEmit` — PASS
2. `npx vitest run src/lib/__tests__/money/trading-fees` — PASS (existing tests validate PBT math)
3. Visual: Open player detail → Performance tab → PBT widget → see transaction history
4. DB: `SELECT proname FROM pg_proc WHERE proname = 'buy_player_dpc'` → confirm `credit_pbt` call
