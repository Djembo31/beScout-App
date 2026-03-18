# Pricing & Market Architecture — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the pricing system to show real market-based prices with a unified Marktplatz (orderbook), manipulationsschutz, and Marktplatz-Sprache (legal compliance).

**Architecture:** New DB fields (`reference_price`, `initial_listing_price`) with triggers, updated price hierarchy in `dbToPlayer()`, unified Marktplatz UI on player detail page, new badges on PlayerRow, updated Buy/Sell flows with user choice.

**Tech Stack:** Supabase (PostgreSQL RPCs + Triggers), TypeScript, React, TanStack Query, Tailwind, next-intl

**Design Doc:** `docs/plans/2026-03-19-pricing-architecture-design.md`

---

## Phase 1: Database Foundation

### Task 1: Migration — New Columns + Reference Price Trigger

**Files:**
- Create: `supabase/migrations/20260319_pricing_architecture.sql`

**Step 1: Write migration SQL**

```sql
-- =============================================
-- Pricing Architecture: reference_price + initial_listing_price
-- =============================================

-- 1. Add new columns
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS reference_price BIGINT,
  ADD COLUMN IF NOT EXISTS initial_listing_price BIGINT;

-- 2. Backfill reference_price from market_value_eur
-- Formula: market_value_eur / 10 (EUR to $SCOUT cents, 1 EUR = 10,000 $SCOUT = 1,000,000 cents)
-- Wait — market_value_eur is in EUR. 1 $SCOUT = 100 cents. MV/10 means the reference price in $SCOUT.
-- So reference_price (in cents) = (market_value_eur / 10) * 100 = market_value_eur * 10
-- Example: 500,000 EUR MV → 50,000 $SCOUT → 5,000,000 cents
UPDATE public.players
SET reference_price = CASE
  WHEN market_value_eur IS NOT NULL AND market_value_eur > 0
    THEN market_value_eur * 10
  ELSE NULL
END;

-- 3. Backfill initial_listing_price from first IPO
-- Find the earliest IPO per player and set its price
UPDATE public.players p
SET initial_listing_price = sub.first_price
FROM (
  SELECT DISTINCT ON (player_id) player_id, price AS first_price
  FROM public.ipos
  WHERE status IN ('open', 'ended', 'early_access')
  ORDER BY player_id, created_at ASC
) sub
WHERE p.id = sub.player_id
  AND p.initial_listing_price IS NULL;

-- 4. Trigger: auto-update reference_price when market_value_eur changes
CREATE OR REPLACE FUNCTION public.trg_update_reference_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.market_value_eur IS DISTINCT FROM OLD.market_value_eur THEN
    NEW.reference_price := CASE
      WHEN NEW.market_value_eur IS NOT NULL AND NEW.market_value_eur > 0
        THEN NEW.market_value_eur * 10
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_player_reference_price ON public.players;
CREATE TRIGGER trg_player_reference_price
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_update_reference_price();

-- 5. Update floor_price recalculation to use reference_price as fallback (instead of ipo_price)
-- This function is called after order placement and expiry
CREATE OR REPLACE FUNCTION public.recalc_floor_price(p_player_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_min_order BIGINT;
  v_ipo_price BIGINT;
  v_ref_price BIGINT;
BEGIN
  -- MIN of active sell orders
  SELECT MIN(price) INTO v_min_order
  FROM public.orders
  WHERE player_id = p_player_id
    AND side = 'sell'
    AND status IN ('open', 'partial')
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Current IPO price (if active)
  SELECT price INTO v_ipo_price
  FROM public.ipos
  WHERE player_id = p_player_id
    AND status IN ('open', 'early_access')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Reference price
  SELECT reference_price INTO v_ref_price
  FROM public.players
  WHERE id = p_player_id;

  -- Floor = MIN(orders, ipo) → last_price → reference_price
  UPDATE public.players
  SET floor_price = COALESCE(
    LEAST(v_min_order, v_ipo_price),  -- MIN of available offers
    v_min_order,                       -- only orders
    v_ipo_price,                       -- only IPO
    last_price,                        -- last trade
    v_ref_price                        -- reference price fallback
  )
  WHERE id = p_player_id;
END;
$$;
```

**Step 2: Apply migration**

```bash
npx supabase db push
```

**Step 3: Verify backfill**

Run in Supabase SQL editor:
```sql
SELECT count(*) FROM players WHERE reference_price IS NOT NULL;
SELECT count(*) FROM players WHERE initial_listing_price IS NOT NULL;
SELECT id, first_name, last_name, market_value_eur, reference_price, initial_listing_price, floor_price
FROM players ORDER BY market_value_eur DESC NULLS LAST LIMIT 10;
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260319_pricing_architecture.sql
git commit -m "feat(db): add reference_price, initial_listing_price columns + trigger"
```

---

### Task 2: Migration — Sell Order Price Cap + Set initial_listing_price on IPO

**Files:**
- Create: `supabase/migrations/20260319_pricing_cap_and_ipo_guard.sql`

**Step 1: Write migration SQL**

```sql
-- =============================================
-- Manipulationsschutz: Sell Order Price Cap
-- =============================================

-- Helper: Calculate price cap for a player
CREATE OR REPLACE FUNCTION public.get_price_cap(p_player_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_ref_price BIGINT;
  v_median_price BIGINT;
  v_trade_count INT;
  v_cap_from_ref BIGINT;
  v_cap_from_median BIGINT;
BEGIN
  -- Get reference price
  SELECT reference_price INTO v_ref_price
  FROM public.players
  WHERE id = p_player_id;

  -- If no reference price, allow anything (shouldn't happen)
  IF v_ref_price IS NULL THEN
    RETURN 2147483647; -- max int
  END IF;

  v_cap_from_ref := v_ref_price * 3;

  -- Count recent trades
  SELECT count(*) INTO v_trade_count
  FROM public.trades
  WHERE player_id = p_player_id;

  -- If < 10 trades, cap is 3x reference only
  IF v_trade_count < 10 THEN
    RETURN v_cap_from_ref;
  END IF;

  -- Calculate median of last 10 trades
  SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY price)::BIGINT
  INTO v_median_price
  FROM (
    SELECT price FROM public.trades
    WHERE player_id = p_player_id
    ORDER BY executed_at DESC
    LIMIT 10
  ) recent;

  v_cap_from_median := v_median_price * 3;

  -- Return MAX(3x ref, 3x median)
  RETURN GREATEST(v_cap_from_ref, v_cap_from_median);
END;
$$;

-- Update place_sell_order to enforce cap
-- We add a cap check at the beginning of the existing RPC
CREATE OR REPLACE FUNCTION public.place_sell_order(
  p_user_id UUID,
  p_player_id UUID,
  p_quantity INT,
  p_price BIGINT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_order_id UUID;
  v_available INT;
  v_listed INT;
  v_price_cap BIGINT;
BEGIN
  -- Auth guard
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Liquidation guard
  IF EXISTS (SELECT 1 FROM public.players WHERE id = p_player_id AND is_liquidated = true) THEN
    RETURN json_build_object('success', false, 'error', 'Player is already liquidated');
  END IF;

  -- Club admin guard
  IF EXISTS (
    SELECT 1 FROM public.club_admins ca
    JOIN public.players pl ON pl.club_id = ca.club_id
    WHERE ca.user_id = p_user_id AND pl.id = p_player_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Club-admin cannot trade own club players');
  END IF;

  -- *** NEW: Price cap check ***
  v_price_cap := public.get_price_cap(p_player_id);
  IF p_price > v_price_cap THEN
    RETURN json_build_object('success', false, 'error',
      'Price exceeds maximum allowed (' || (v_price_cap / 100) || ' $SCOUT)');
  END IF;

  -- Quantity check: user must have enough unheld DPCs
  SELECT COALESCE(quantity, 0) INTO v_available
  FROM public.holdings
  WHERE user_id = p_user_id AND player_id = p_player_id;

  IF v_available IS NULL OR v_available < 1 THEN
    RETURN json_build_object('success', false, 'error', 'No holdings for this player');
  END IF;

  -- Check how many already listed
  SELECT COALESCE(SUM(quantity - filled_qty), 0) INTO v_listed
  FROM public.orders
  WHERE user_id = p_user_id AND player_id = p_player_id
    AND side = 'sell' AND status IN ('open', 'partial');

  IF (v_listed + p_quantity) > v_available THEN
    RETURN json_build_object('success', false, 'error',
      'Exceeds available quantity (owned: ' || v_available || ', listed: ' || v_listed || ')');
  END IF;

  -- Create order
  INSERT INTO public.orders (user_id, player_id, side, price, quantity, status, expires_at)
  VALUES (p_user_id, p_player_id, 'sell', p_price, p_quantity, 'open', NOW() + INTERVAL '30 days')
  RETURNING id INTO v_order_id;

  -- Recalculate floor price
  PERFORM public.recalc_floor_price(p_player_id);

  RETURN json_build_object('success', true, 'orderId', v_order_id);
END;
$function$;

-- REVOKE + re-grant (standard pattern)
REVOKE ALL ON FUNCTION public.place_sell_order(UUID, UUID, INT, BIGINT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.place_sell_order(UUID, UUID, INT, BIGINT) TO authenticated;

-- =============================================
-- Set initial_listing_price on FIRST IPO creation
-- =============================================

-- Trigger on ipos table: when first IPO for a player is created, set initial_listing_price
CREATE OR REPLACE FUNCTION public.trg_set_initial_listing_price()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only set if not already set (immutable)
  UPDATE public.players
  SET initial_listing_price = NEW.price
  WHERE id = NEW.player_id
    AND initial_listing_price IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ipo_set_initial_listing ON public.ipos;
CREATE TRIGGER trg_ipo_set_initial_listing
  AFTER INSERT ON public.ipos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_set_initial_listing_price();
```

**Step 2: Apply migration**

```bash
npx supabase db push
```

**Step 3: Verify cap function**

```sql
SELECT id, first_name, last_name, reference_price, get_price_cap(id) as cap
FROM players WHERE reference_price IS NOT NULL LIMIT 10;
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260319_pricing_cap_and_ipo_guard.sql
git commit -m "feat(db): sell order price cap (3x ref/median) + initial_listing_price trigger"
```

---

## Phase 2: Service Layer + Types

### Task 3: Update Types — Add new fields to DbPlayer and Player

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add DB columns to conceptual type**

The `DbPlayer` type is inferred from Supabase, but we need to make sure the new columns are in `PLAYER_SELECT_COLS` and the `Player` type has the new frontend fields.

Update `Player.prices` (line 42 of `src/types/index.ts`):

```typescript
// OLD:
prices: { lastTrade: number; change24h: number; floor?: number; ipoPrice?: number; history7d?: number[] };

// NEW:
prices: {
  lastTrade: number;
  change24h: number;
  floor?: number;
  ipoPrice?: number;
  referencePrice?: number;
  initialListingPrice?: number;
  history7d?: number[];
};
```

Add to `Player` type (after line 39 `marketValue`):
```typescript
  offerCount?: number;  // aggregated count of sell orders + active IPO
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add referencePrice, initialListingPrice, offerCount to Player"
```

---

### Task 4: Update PLAYER_SELECT_COLS + dbToPlayer Mapper

**Files:**
- Modify: `src/lib/services/players.ts` (lines 11-21, 102-158)

**Step 1: Add new columns to SELECT**

In `PLAYER_SELECT_COLS` (line 18), add after `volume_24h`:

```typescript
// OLD line 18:
'floor_price', 'last_price', 'ipo_price', 'price_change_24h', 'volume_24h',

// NEW:
'floor_price', 'last_price', 'ipo_price', 'price_change_24h', 'volume_24h',
'reference_price', 'initial_listing_price',
```

**Step 2: Update dbToPlayer mapper**

In `dbToPlayer()` (lines 135-140), update the `prices` object:

```typescript
// OLD:
prices: {
  lastTrade: lastBsd,
  change24h: Number(db.price_change_24h),
  floor: floorBsd,
  ipoPrice: centsToBsd(db.ipo_price ?? db.floor_price),
},

// NEW:
prices: {
  lastTrade: lastBsd,
  change24h: Number(db.price_change_24h),
  floor: floorBsd,
  ipoPrice: centsToBsd(db.ipo_price ?? db.floor_price),
  referencePrice: db.reference_price ? centsToBsd(db.reference_price) : undefined,
  initialListingPrice: db.initial_listing_price ? centsToBsd(db.initial_listing_price) : undefined,
},
```

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/lib/services/players.ts
git commit -m "feat(players): add reference_price, initial_listing_price to SELECT + mapper"
```

---

### Task 5: Add Query Keys + Service Function for Offer Counts

**Files:**
- Modify: `src/lib/queries/keys.ts` (line 23-27, orders section)
- Modify or create: `src/lib/services/trading.ts`

**Step 1: Add query key for offer counts**

In `src/lib/queries/keys.ts`, update orders section:

```typescript
// OLD:
orders: {
  all: ['orders'] as const,
  buy: ['orders', 'buy'] as const,
  byPlayer: (pid: string) => ['orders', pid] as const,
},

// NEW:
orders: {
  all: ['orders'] as const,
  buy: ['orders', 'buy'] as const,
  byPlayer: (pid: string) => ['orders', pid] as const,
  offerCounts: ['orders', 'offerCounts'] as const,
},
```

**Step 2: Add service function to get aggregated offer counts per player**

In `src/lib/services/trading.ts`, add after the existing functions:

```typescript
/** Get aggregated sell offer counts per player (for badges) */
export async function getOfferCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('orders')
    .select('player_id')
    .eq('side', 'sell')
    .in('status', ['open', 'partial'])
    .or('expires_at.is.null,expires_at.gt.now()');

  if (error) { console.error('[Trading] getOfferCounts failed:', error); return new Map(); }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1);
  }
  return counts;
}

/** Get price cap for a player (for sell form orientation) */
export async function getPriceCap(playerId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_price_cap', { p_player_id: playerId });
  if (error) { console.error('[Trading] getPriceCap failed:', error); return null; }
  return data as number;
}

/** Get buy order counts per player (for Kaufgesuche badge) */
export async function getBuyOrderCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('orders')
    .select('player_id')
    .eq('side', 'buy')
    .in('status', ['open', 'partial'])
    .or('expires_at.is.null,expires_at.gt.now()');

  if (error) { console.error('[Trading] getBuyOrderCounts failed:', error); return new Map(); }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1);
  }
  return counts;
}
```

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/lib/queries/keys.ts src/lib/services/trading.ts
git commit -m "feat(trading): add offer count queries + price cap service"
```

---

### Task 6: Update place_sell_order Price Cap in Frontend

**Files:**
- Modify: `src/lib/services/trading.ts` (lines 141-181)

**Step 1: Add price cap validation before RPC call**

In `placeSellOrder()` function (line 149), after the existing `priceCents > 100_000_000` check:

```typescript
// OLD line 150:
if (priceCents > 100_000_000) throw new Error('maxPriceExceeded');

// NEW — add after:
if (priceCents > 100_000_000) throw new Error('maxPriceExceeded');

// Price cap check (defense-in-depth — DB RPC also checks)
const cap = await getPriceCap(playerId);
if (cap !== null && priceCents > cap) {
  throw new Error(`Price exceeds maximum allowed (${Math.floor(cap / 100)} $SCOUT)`);
}
```

Note: `getPriceCap` is already defined in the same file from Task 5.

**Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/lib/services/trading.ts
git commit -m "feat(trading): frontend price cap validation in placeSellOrder"
```

---

## Phase 3: Component Updates

### Task 7: Update PlayerRow — Add Marktplatz Badge

**Files:**
- Modify: `src/components/player/PlayerRow.tsx`

**Step 1: Read current PlayerRow to find exact badge location**

Read the file and find where price/KPIs are rendered.

**Step 2: Add badge logic**

After the price display, add a badge showing offer count:

```tsx
// Badge logic (inside PlayerRow component):
const offerCount = (player.offerCount ?? 0) + (player.ipo.status === 'open' || player.ipo.status === 'early_access' ? 1 : 0);

// Badge JSX (next to price):
{offerCount > 0 ? (
  <span className="text-[10px] text-green-500/80 bg-green-500/10 px-1.5 py-0.5 rounded-full">
    {offerCount} {t('market.angebote', { count: offerCount })}
  </span>
) : (
  <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
    {t('market.nichtGelistet')}
  </span>
)}
```

**Step 3: Verify types compile + visual check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/player/PlayerRow.tsx
git commit -m "feat(PlayerRow): add Marktplatz badge (X Angebote / Nicht gelistet)"
```

---

### Task 8: Update Market Page — Rename Tab + Filter

**Files:**
- Modify: `src/app/(app)/market/page.tsx` (lines 78-89)
- Modify: `src/lib/stores/marketStore.ts` (if tab type defined there)

**Step 1: Rename 'kaufen' tab to 'marktplatz'**

In `src/app/(app)/market/page.tsx`:

```typescript
// OLD line 78:
const TAB_IDS: MarketTab[] = ['portfolio', 'kaufen'];

// NEW:
const TAB_IDS: MarketTab[] = ['portfolio', 'marktplatz'];
```

Update TAB_ALIAS (lines 80-89) to map old 'kaufen' to 'marktplatz':

```typescript
const TAB_ALIAS: Record<string, MarketTab> = {
  kader: 'portfolio',
  bestand: 'portfolio',
  compare: 'marktplatz',
  spieler: 'marktplatz',
  transferlist: 'marktplatz',
  scouting: 'marktplatz',
  kaufen: 'marktplatz',  // backwards compat
  offers: 'portfolio',
  watchlist: 'portfolio',
};
```

Update tab labels in the i18n file and the JSX that renders tab names.

**Step 2: Update MarketStore type**

In `src/lib/stores/marketStore.ts`, update the `MarketTab` type to use 'marktplatz' instead of 'kaufen'. Check all references.

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/app/(app)/market/page.tsx src/lib/stores/marketStore.ts
git commit -m "feat(market): rename Kaufen tab to Marktplatz"
```

---

### Task 9: Player Detail — Marktplatz Section

**Files:**
- Create: `src/components/player/detail/MarktplatzSection.tsx`
- Modify: Player detail page to include new section

**Step 1: Create MarktplatzSection component**

This shows Verkaufsangebote + Kaufgesuche + Letzter Preis + Wertentwicklung.

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import type { Player, Listing } from '@/types';

type Props = {
  player: Player;
  buyOrders: { id: string; userId: string; userName: string; price: number; qty: number }[];
  onBuyFromListing: (listing: Listing) => void;
  onSellToOrder: (orderId: string, price: number) => void;
};

export default function MarktplatzSection({ player, buyOrders, onBuyFromListing, onSellToOrder }: Props) {
  const t = useTranslations('market');
  const { prices, listings } = player;

  // Wertentwicklung
  const initialPrice = prices.initialListingPrice;
  const currentPrice = prices.floor ?? prices.lastTrade ?? prices.referencePrice ?? 0;
  const priceChange = initialPrice && initialPrice > 0
    ? ((currentPrice - initialPrice) / initialPrice * 100)
    : null;

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-sm font-bold text-white/70">{t('marktplatz')}</h3>

      {/* Verkaufsangebote */}
      <div>
        <h4 className="text-xs font-semibold text-white/50 mb-2">
          {t('verkaufsangebote')} ({listings.length})
        </h4>
        {listings.length === 0 ? (
          <p className="text-xs text-white/30">{t('keineAngebote')}</p>
        ) : (
          <div className="space-y-1.5">
            {listings
              .sort((a, b) => a.price - b.price)
              .map(listing => (
                <button
                  key={listing.id}
                  onClick={() => onBuyFromListing(listing)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-gold">
                      {fmtScout(listing.price)}
                    </span>
                    <span className="text-xs text-white/40">
                      {listing.qty ?? 1}x
                    </span>
                  </div>
                  <span className="text-xs text-white/50">
                    {listing.sellerName === 'Club' ? t('clubverkauf') : `@${listing.sellerName}`}
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Kaufgesuche */}
      <div>
        <h4 className="text-xs font-semibold text-white/50 mb-2">
          {t('kaufgesuche')} ({buyOrders.length})
        </h4>
        {buyOrders.length === 0 ? (
          <p className="text-xs text-white/30">{t('keineGesuche')}</p>
        ) : (
          <div className="space-y-1.5">
            {buyOrders
              .sort((a, b) => b.price - a.price)
              .map(order => (
                <button
                  key={order.id}
                  onClick={() => onSellToOrder(order.id, order.price)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/20 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-white/80">
                      {fmtScout(order.price)}
                    </span>
                    <span className="text-xs text-white/40">
                      {order.qty}x
                    </span>
                  </div>
                  <span className="text-xs text-white/50">@{order.userName}</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Letzter Preis + Wertentwicklung */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
        <div className="text-xs text-white/40">
          {t('letzterPreis')}: <span className="font-mono text-white/60">{fmtScout(prices.lastTrade)}</span>
        </div>
        {priceChange !== null && initialPrice && (
          <div className="text-xs text-white/40">
            {t('markteintritt')}: {fmtScout(initialPrice)}
            <span className={cn('ml-1 font-mono', priceChange >= 0 ? 'text-green-500' : 'text-red-400')}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
```

**Step 2: Integrate into Player Detail page**

Find where trading info is shown on the player detail page and add `<MarktplatzSection>` component.

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/player/detail/MarktplatzSection.tsx
git commit -m "feat(player): add MarktplatzSection (Verkaufsangebote + Kaufgesuche)"
```

---

### Task 10: Update BuyOrderModal — Show All Offers + User Choice

**Files:**
- Modify: `src/components/market/BuyOrderModal.tsx`

**Step 1: Read current modal implementation**

Read the full BuyOrderModal to understand current flow.

**Step 2: Add offer list view**

When opened without a specific listing, show ALL available offers for the player (sell orders + IPO) sorted by price. User clicks one to select it, then sees confirmation.

The modal should have two states:
1. **Select offer** — list of all offers, sortiert nach Preis
2. **Confirm purchase** — selected offer details + quantity + total + Kaufen button

**Step 3: Verify types compile**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/market/BuyOrderModal.tsx
git commit -m "feat(BuyOrderModal): show all offers for user selection"
```

---

### Task 11: Update Sell Flow — Orientation + Accept Buy Order

**Files:**
- Modify: Sell order creation modal/component

**Step 1: Read current sell flow**

Find where sell orders are created (the modal/form that calls `placeSellOrder`).

**Step 2: Add orientation info**

Show before price input:
- Referenzwert: `player.prices.referencePrice`
- Hoechstes Kaufgesuch: MAX(buy orders for this player)
- Price cap info: "Max: X $SCOUT"

**Step 3: Add "Sofort verkaufen" option**

Below the free listing form, show open Kaufgesuche with a "Sofort verkaufen" button for each.

**Step 4: Verify types compile + commit**

```bash
npx tsc --noEmit
git commit -m "feat(sell): add orientation info + sofort verkaufen option"
```

---

### Task 12: Update TopMoversStrip + DiscoveryCard — New Price Hierarchy

**Files:**
- Modify: `src/components/home/TopMoversStrip.tsx` (line 43)
- Modify: `src/components/market/DiscoveryCard.tsx` (lines 63-65)

**Step 1: TopMoversStrip**

```typescript
// OLD (line 43):
{fmtScout(p.prices.floor ?? p.prices.lastTrade)}

// NEW — price hierarchy:
{fmtScout(p.prices.floor ?? p.prices.lastTrade ?? p.prices.referencePrice ?? 0)}
```

**Step 2: DiscoveryCard**

```typescript
// OLD (lines 63-65):
const price = variant === 'ipo' ? (ipoPrice ?? 0)
  : variant === 'new' || variant === 'listing' ? (listingPrice ?? p.prices.floor ?? 0)
  : p.prices.floor ?? 0;

// NEW:
const price = variant === 'ipo' ? (ipoPrice ?? 0)
  : variant === 'new' || variant === 'listing' ? (listingPrice ?? p.prices.floor ?? p.prices.referencePrice ?? 0)
  : p.prices.floor ?? p.prices.referencePrice ?? 0;
```

**Step 3: Verify compile + commit**

```bash
npx tsc --noEmit
git add src/components/home/TopMoversStrip.tsx src/components/market/DiscoveryCard.tsx
git commit -m "feat(price): apply new hierarchy (floor > lastTrade > referencePrice)"
```

---

### Task 13: Update Portfolio — Wertentwicklung

**Files:**
- Modify: `src/components/manager/SquadSummaryStats.tsx` (lines 17-29)
- Modify: `src/components/manager/ManagerKaderTab.tsx`

**Step 1: Add Wertentwicklung to SquadSummaryStats**

After total value display, add aggregate Wertentwicklung based on `initialListingPrice` of held players.

**Step 2: Add per-player Wertentwicklung in ManagerKaderTab**

Show initial listing price → current price → % change per player row.

**Step 3: Verify compile + commit**

```bash
npx tsc --noEmit
git commit -m "feat(portfolio): add Wertentwicklung display"
```

---

## Phase 4: i18n

### Task 14: Add i18n Keys

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Add new translation keys**

```json
{
  "market": {
    "marktplatz": "Marktplatz",
    "verkaufsangebote": "Verkaufsangebote",
    "kaufgesuche": "Kaufgesuche",
    "angebote": "{count} Angebote",
    "nichtGelistet": "Nicht gelistet",
    "keineAngebote": "Keine Angebote vorhanden",
    "keineGesuche": "Keine Kaufgesuche vorhanden",
    "clubverkauf": "Clubverkauf",
    "letzterPreis": "Zuletzt",
    "markteintritt": "Markteintritt",
    "sofortVerkaufen": "Sofort verkaufen",
    "referenzwert": "Referenzwert",
    "hoechstesGesuch": "Hoechstes Gesuch",
    "maxPreis": "Max. Preis",
    "preisUeberschritten": "Preis ueberschreitet Maximum"
  }
}
```

**Step 2: Add Turkish translations**

**Step 3: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "feat(i18n): add Marktplatz translation keys (DE + TR)"
```

---

## Phase 5: Verification

### Task 15: TypeScript + Lint Check

```bash
npx tsc --noEmit
npx next lint
```

### Task 16: Reviewer Agent

Dispatch reviewer agent to check all changes against design doc.

### Task 17: Accessibility Check

Run `/fixing-accessibility` on new UI components.

### Task 18: Update floor_price for existing players

Run SQL to recalculate floor_price for all players using new `recalc_floor_price()`:

```sql
SELECT public.recalc_floor_price(id) FROM public.players;
```

---

## Task Dependency Map

```
Task 1 (DB: columns + trigger)
  └→ Task 2 (DB: cap + IPO guard)
       └→ Task 3 (Types)
            └→ Task 4 (SELECT + mapper)
                 ├→ Task 5 (Query keys + offer counts)
                 │    └→ Task 6 (Frontend cap validation)
                 ├→ Task 7 (PlayerRow badge)
                 ├→ Task 8 (Market tab rename)
                 ├→ Task 9 (MarktplatzSection)
                 ├→ Task 10 (BuyOrderModal)
                 ├→ Task 11 (Sell flow)
                 ├→ Task 12 (TopMovers + DiscoveryCard)
                 └→ Task 13 (Portfolio Wertentwicklung)
Task 14 (i18n) — parallel to Phase 3
Tasks 15-18 (Verification) — after all code
```

## Execution Recommendation

**Batch 1 (DB):** Tasks 1-2 (sequential, DB migrations)
**Batch 2 (Service):** Tasks 3-6 (sequential, type dependencies)
**Batch 3 (Components):** Tasks 7-13 + Task 14 (parallel, independent components)
**Batch 4 (Verification):** Tasks 15-18 (sequential)

Total estimated steps: ~18 tasks, ~60 individual steps.
