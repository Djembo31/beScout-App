# Tickets x Events — Unified Payment Gateway Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify tickets and $SCOUT as event entry payment with atomic escrow, replacing the broken two-step flow.

**Architecture:** One `currency` field per event ('tickets' | 'scout'). One `rpc_lock_event_entry` RPC handles both currencies atomically with escrow pattern. New `event_entries` table tracks payment state separately from lineups. Entry (payment) and lineup submission are decoupled.

**Tech Stack:** Supabase PostgreSQL (RPC + Migration), TypeScript strict, React Query v5, next-intl

**Design Doc:** `docs/plans/2026-03-21-tickets-events-unified-payment-design.md`

---

## Task 1: Migration — Schema Changes

**Files:**
- Create: `supabase/migrations/20260321_unified_event_payment.sql`

**Step 1: Write the migration**

```sql
-- =============================================================
-- 1. events: add currency column
-- =============================================================
ALTER TABLE events ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'tickets'
  CHECK (currency IN ('tickets', 'scout'));

-- Consolidate entry_fee into ticket_cost
UPDATE events SET ticket_cost = COALESCE(NULLIF(ticket_cost, 0), entry_fee, 0)
  WHERE ticket_cost IS NULL OR ticket_cost = 0;

COMMENT ON COLUMN events.entry_fee IS 'DEPRECATED — use ticket_cost + currency';

-- =============================================================
-- 2. event_entries table (payment tracking, decoupled from lineups)
-- =============================================================
CREATE TABLE IF NOT EXISTS event_entries (
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id),
  currency    TEXT NOT NULL CHECK (currency IN ('tickets', 'scout')),
  amount_locked BIGINT NOT NULL DEFAULT 0,
  fee_split   JSONB,
  locked_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

ALTER TABLE event_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own entries"
  ON event_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System manages entries"
  ON event_entries FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_event_entries_user ON event_entries(user_id);

-- =============================================================
-- 3. platform_settings table (feature flags)
-- =============================================================
CREATE TABLE IF NOT EXISTS platform_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT 'false'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO platform_settings (key, value)
  VALUES ('scout_events_enabled', 'false'::jsonb)
  ON CONFLICT DO NOTHING;

-- =============================================================
-- 4. Backfill event_entries from existing lineups
-- =============================================================
INSERT INTO event_entries (event_id, user_id, currency, amount_locked, locked_at)
  SELECT DISTINCT event_id, user_id, 'tickets', 0, submitted_at
  FROM lineups
  WHERE event_id IS NOT NULL
  ON CONFLICT DO NOTHING;

-- =============================================================
-- 5. Helper: check if scout events are enabled
-- =============================================================
CREATE OR REPLACE FUNCTION scout_events_enabled()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT value::text::boolean FROM platform_settings WHERE key = 'scout_events_enabled'), false);
$$;

-- =============================================================
-- 6. RPC: rpc_lock_event_entry
-- =============================================================
CREATE OR REPLACE FUNCTION rpc_lock_event_entry(
  p_event_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event     RECORD;
  v_existing  RECORD;
  v_wallet    RECORD;
  v_tickets   RECORD;
  v_available BIGINT;
  v_fee_platform BIGINT;
  v_fee_pbt      BIGINT;
  v_fee_club     BIGINT;
  v_balance_after BIGINT;
BEGIN
  -- 1. Load event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  -- 2. Status guard
  IF v_event.status NOT IN ('registering', 'late-reg') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_open');
  END IF;

  -- 3. Capacity guard
  IF v_event.max_entries IS NOT NULL AND v_event.current_entries >= v_event.max_entries THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_full');
  END IF;

  -- 4. Duplicate guard
  SELECT * INTO v_existing FROM event_entries WHERE event_id = p_event_id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('ok', true, 'already_entered', true, 'currency', v_existing.currency);
  END IF;

  -- 5. Advisory lock (prevent race condition)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_event_id::text));

  -- 6. Currency branch
  IF v_event.currency = 'tickets' THEN
    -- TICKET PATH
    IF v_event.ticket_cost > 0 THEN
      SELECT * INTO v_tickets FROM user_tickets WHERE user_id = p_user_id FOR UPDATE;
      IF NOT FOUND OR v_tickets.balance < v_event.ticket_cost THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_tickets',
          'have', COALESCE(v_tickets.balance, 0), 'need', v_event.ticket_cost);
      END IF;

      UPDATE user_tickets
        SET balance = balance - v_event.ticket_cost,
            spent_total = spent_total + v_event.ticket_cost,
            updated_at = now()
        WHERE user_id = p_user_id;

      v_balance_after := v_tickets.balance - v_event.ticket_cost;

      INSERT INTO ticket_transactions (user_id, amount, balance_after, source, reference_id, description)
        VALUES (p_user_id, -v_event.ticket_cost, v_balance_after, 'event_entry', p_event_id,
                'Event: ' || v_event.name);
    ELSE
      v_balance_after := 0;
    END IF;

    INSERT INTO event_entries (event_id, user_id, currency, amount_locked, locked_at)
      VALUES (p_event_id, p_user_id, 'tickets', v_event.ticket_cost, now());

  ELSIF v_event.currency = 'scout' THEN
    -- SCOUT PATH
    IF NOT scout_events_enabled() THEN
      RETURN jsonb_build_object('ok', false, 'error', 'scout_events_disabled');
    END IF;

    IF v_event.ticket_cost > 0 THEN
      SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
      IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'wallet_not_found');
      END IF;

      v_available := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0);
      IF v_available < v_event.ticket_cost THEN
        RETURN jsonb_build_object('ok', false, 'error', 'insufficient_balance',
          'have', v_available, 'need', v_event.ticket_cost);
      END IF;

      -- Fee split: Platform 3.5% + PBT 1.5% + Club 1%
      v_fee_platform := (v_event.ticket_cost * 350) / 10000;
      v_fee_pbt      := (v_event.ticket_cost * 150) / 10000;
      v_fee_club     := (v_event.ticket_cost * 100) / 10000;

      UPDATE wallets
        SET locked_balance = COALESCE(locked_balance, 0) + v_event.ticket_cost,
            updated_at = now()
        WHERE user_id = p_user_id;

      v_balance_after := v_wallet.balance - COALESCE(v_wallet.locked_balance, 0) - v_event.ticket_cost;

      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
        VALUES (p_user_id, 'event_entry_lock', v_event.ticket_cost, v_balance_after, p_event_id,
                'Event: ' || v_event.name);
    ELSE
      v_fee_platform := 0; v_fee_pbt := 0; v_fee_club := 0;
      v_balance_after := 0;
    END IF;

    INSERT INTO event_entries (event_id, user_id, currency, amount_locked, fee_split, locked_at)
      VALUES (p_event_id, p_user_id, 'scout', v_event.ticket_cost,
              jsonb_build_object('platform', v_fee_platform, 'pbt', v_fee_pbt, 'club', v_fee_club),
              now());
  END IF;

  -- 7. Increment entry count
  UPDATE events SET current_entries = current_entries + 1 WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'currency', v_event.currency, 'balance_after', v_balance_after);
END;
$$;

-- =============================================================
-- 7. RPC: rpc_unlock_event_entry (refund/leave)
-- =============================================================
CREATE OR REPLACE FUNCTION rpc_unlock_event_entry(
  p_event_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event   RECORD;
  v_entry   RECORD;
  v_balance_after BIGINT;
BEGIN
  -- 1. Load event
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  -- 2. Refund guard: only before locks_at
  IF v_event.locks_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_locked');
  END IF;

  -- 3. Load entry
  SELECT * INTO v_entry FROM event_entries WHERE event_id = p_event_id AND user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_entered');
  END IF;

  -- 4. Advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || p_event_id::text));

  -- 5. Currency branch: refund
  IF v_entry.currency = 'tickets' AND v_entry.amount_locked > 0 THEN
    UPDATE user_tickets
      SET balance = balance + v_entry.amount_locked,
          spent_total = GREATEST(0, spent_total - v_entry.amount_locked),
          updated_at = now()
      WHERE user_id = p_user_id;

    SELECT balance INTO v_balance_after FROM user_tickets WHERE user_id = p_user_id;

    INSERT INTO ticket_transactions (user_id, amount, balance_after, source, reference_id, description)
      VALUES (p_user_id, v_entry.amount_locked, v_balance_after, 'event_entry_refund', p_event_id,
              'Refund: ' || v_event.name);

  ELSIF v_entry.currency = 'scout' AND v_entry.amount_locked > 0 THEN
    UPDATE wallets
      SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_entry.amount_locked),
          updated_at = now()
      WHERE user_id = p_user_id;

    SELECT (balance - COALESCE(locked_balance, 0)) INTO v_balance_after
      FROM wallets WHERE user_id = p_user_id;

    INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
      VALUES (p_user_id, 'event_entry_unlock', v_entry.amount_locked, v_balance_after, p_event_id,
              'Refund: ' || v_event.name);
  END IF;

  -- 6. Delete entry
  DELETE FROM event_entries WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 7. Also delete lineup if exists
  DELETE FROM lineups WHERE event_id = p_event_id AND user_id = p_user_id;

  -- 8. Decrement entry count
  UPDATE events SET current_entries = GREATEST(0, current_entries - 1) WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'currency', v_entry.currency, 'balance_after', COALESCE(v_balance_after, 0));
END;
$$;

-- =============================================================
-- 8. RPC: rpc_cancel_event_entries (admin cancels event)
-- =============================================================
CREATE OR REPLACE FUNCTION rpc_cancel_event_entries(p_event_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event   RECORD;
  v_entry   RECORD;
  v_refunded INT := 0;
BEGIN
  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'event_not_found');
  END IF;

  FOR v_entry IN SELECT * FROM event_entries WHERE event_id = p_event_id LOOP
    IF v_entry.currency = 'tickets' AND v_entry.amount_locked > 0 THEN
      UPDATE user_tickets SET balance = balance + v_entry.amount_locked, updated_at = now()
        WHERE user_id = v_entry.user_id;
      INSERT INTO ticket_transactions (user_id, amount, balance_after, source, reference_id, description)
        VALUES (v_entry.user_id, v_entry.amount_locked,
                (SELECT balance FROM user_tickets WHERE user_id = v_entry.user_id),
                'event_entry_refund', p_event_id, 'Event cancelled: ' || v_event.name);
    ELSIF v_entry.currency = 'scout' AND v_entry.amount_locked > 0 THEN
      UPDATE wallets SET locked_balance = GREATEST(0, COALESCE(locked_balance, 0) - v_entry.amount_locked),
        updated_at = now() WHERE user_id = v_entry.user_id;
      INSERT INTO transactions (user_id, type, amount, balance_after, reference_id, description)
        VALUES (v_entry.user_id, 'event_entry_unlock', v_entry.amount_locked,
                (SELECT balance - COALESCE(locked_balance, 0) FROM wallets WHERE user_id = v_entry.user_id),
                p_event_id, 'Event cancelled: ' || v_event.name);
    END IF;
    v_refunded := v_refunded + 1;
  END LOOP;

  DELETE FROM event_entries WHERE event_id = p_event_id;
  UPDATE events SET current_entries = 0 WHERE id = p_event_id;

  RETURN jsonb_build_object('ok', true, 'refunded_count', v_refunded);
END;
$$;

-- =============================================================
-- 9. REVOKE + Wrappers (security)
-- =============================================================
REVOKE EXECUTE ON FUNCTION rpc_lock_event_entry FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION rpc_unlock_event_entry FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION rpc_cancel_event_entries FROM PUBLIC, authenticated, anon;

-- Authenticated wrappers with auth.uid()
CREATE OR REPLACE FUNCTION lock_event_entry(p_event_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN rpc_lock_event_entry(p_event_id, auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION unlock_event_entry(p_event_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN rpc_unlock_event_entry(p_event_id, auth.uid());
END;
$$;

-- cancel_event_entries: admin-only (check profile role)
CREATE OR REPLACE FUNCTION cancel_event_entries(p_event_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND top_role = 'Admin') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;
  RETURN rpc_cancel_event_entries(p_event_id);
END;
$$;
```

**Step 2: Apply the migration**

Run: `supabase migration up` or apply via Supabase Dashboard

**Step 3: Verify migration**

Run SQL in Supabase:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'events' AND column_name = 'currency';

SELECT count(*) FROM event_entries;
SELECT * FROM platform_settings;
```
Expected: `currency` column exists, `event_entries` backfilled, `scout_events_enabled = false`

**Step 4: Commit**

```bash
git add supabase/migrations/20260321_unified_event_payment.sql
git commit -m "feat: unified event payment — migration (currency, event_entries, RPCs)"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Update DbEvent type (line ~591)**

Add `currency` field, keep `ticket_cost`, mark `entry_fee` deprecated:

```typescript
export type EventCurrency = 'tickets' | 'scout';

export type DbEvent = {
  id: string;
  name: string;
  type: 'bescout' | 'club' | 'sponsor' | 'special';
  status: 'upcoming' | 'registering' | 'late-reg' | 'running' | 'scoring' | 'ended';
  format: string;
  gameweek: number | null;
  /** @deprecated Use ticket_cost + currency */
  entry_fee: number;
  prize_pool: number;
  max_entries: number | null;
  current_entries: number;
  starts_at: string;
  locks_at: string;
  ends_at: string | null;
  scored_at: string | null;
  created_by: string | null;
  club_id: string | null;
  sponsor_name: string | null;
  sponsor_logo: string | null;
  event_tier?: 'arena' | 'club' | 'user';
  tier_bonuses?: Record<string, number> | null;
  min_tier?: string | null;
  min_subscription_tier?: string | null;
  salary_cap?: number | null;
  reward_structure?: RewardTier[] | null;
  scope: EventScope;
  lineup_size: 7 | 11;
  currency: EventCurrency;          // NEW
  ticket_cost: number;
  created_at: string;
};
```

**Step 2: Add DbEventEntry type**

After `DbLineup` type (~line 650):

```typescript
export type DbEventEntry = {
  event_id: string;
  user_id: string;
  currency: EventCurrency;
  amount_locked: number;
  fee_split: { platform: number; pbt: number; club: number } | null;
  locked_at: string;
};
```

**Step 3: Add DbPlatformSetting type**

```typescript
export type DbPlatformSetting = {
  key: string;
  value: unknown;
  updated_at: string;
};
```

**Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit`
Expected: No new errors (entry_fee still exists, just deprecated)

**Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add EventCurrency, DbEventEntry, DbPlatformSetting types"
```

---

## Task 3: Service Layer — Event Entry Functions

**Files:**
- Modify: `src/lib/services/events.ts`

**Step 1: Add lockEventEntry function**

At bottom of events.ts, add:

```typescript
import { supabase } from '@/lib/supabaseClient';

/** Atomically lock event entry — deducts tickets or locks $SCOUT via RPC */
export async function lockEventEntry(
  eventId: string,
  userId: string,
): Promise<{ ok: boolean; currency?: string; balanceAfter?: number; alreadyEntered?: boolean; error?: string; have?: number; need?: number }> {
  const { data, error } = await supabase.rpc('lock_event_entry', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('lockEventEntry RPC error:', error);
    return { ok: false, error: error.message };
  }

  return data as { ok: boolean; currency?: string; balanceAfter?: number; alreadyEntered?: boolean; error?: string };
}
```

**Step 2: Add unlockEventEntry function**

```typescript
/** Atomically unlock event entry — refunds tickets or unlocks $SCOUT */
export async function unlockEventEntry(
  eventId: string,
  userId: string,
): Promise<{ ok: boolean; currency?: string; balanceAfter?: number; error?: string }> {
  const { data, error } = await supabase.rpc('unlock_event_entry', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('unlockEventEntry RPC error:', error);
    return { ok: false, error: error.message };
  }

  return data as { ok: boolean; currency?: string; balanceAfter?: number; error?: string };
}
```

**Step 3: Add cancelEventEntries function**

```typescript
/** Admin: cancel all entries and refund everyone */
export async function cancelEventEntries(
  eventId: string,
): Promise<{ ok: boolean; refundedCount?: number; error?: string }> {
  const { data, error } = await supabase.rpc('cancel_event_entries', {
    p_event_id: eventId,
  });

  if (error) {
    console.error('cancelEventEntries RPC error:', error);
    return { ok: false, error: error.message };
  }

  return data as { ok: boolean; refundedCount?: number; error?: string };
}
```

**Step 4: Add getEventEntry query function**

```typescript
/** Check if user has entered an event */
export async function getEventEntry(
  eventId: string,
  userId: string,
): Promise<DbEventEntry | null> {
  const { data } = await supabase
    .from('event_entries')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  return data as DbEventEntry | null;
}
```

**Step 5: Update createEvent to include currency**

In `createEvent()` params, add `currency?: EventCurrency`. In the insert object add:
```typescript
currency: params.currency ?? 'tickets',
```

**Step 6: Update EDITABLE_FIELDS**

Add `currency` to the `upcoming` status list only:
```typescript
const EDITABLE_FIELDS: Record<string, string[]> = {
  upcoming: [...existingFields, 'currency'],
  // other statuses unchanged
};
```

**Step 7: Verify**

Run: `npx tsc --noEmit`

**Step 8: Commit**

```bash
git add src/lib/services/events.ts
git commit -m "feat: add lockEventEntry, unlockEventEntry, cancelEventEntries services"
```

---

## Task 4: Service Layer — submitLineup Guard

**Files:**
- Modify: `src/lib/services/lineups.ts`

**Step 1: Add event_entries guard to submitLineup**

After the event status check (~line 85), add:

```typescript
// Guard: user must have entered (paid) before submitting lineup
const { data: entryData } = await supabase
  .from('event_entries')
  .select('event_id')
  .eq('event_id', params.eventId)
  .eq('user_id', params.userId)
  .maybeSingle();

if (!entryData) {
  throw new Error('must_enter_first');
}
```

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/lib/services/lineups.ts
git commit -m "feat: add event_entries guard to submitLineup"
```

---

## Task 5: Query Hooks

**Files:**
- Modify: `src/lib/queries/keys.ts`
- Modify: `src/lib/queries/events.ts`

**Step 1: Add query keys**

In `src/lib/queries/keys.ts`, add to the `events` section:

```typescript
entry: (eventId: string, uid: string) => ['events', 'entry', eventId, uid] as const,
```

**Step 2: Add useEventEntry hook**

In `src/lib/queries/events.ts`, add:

```typescript
import { getEventEntry } from '@/lib/services/events';
import type { DbEventEntry } from '@/types';

export function useEventEntry(eventId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: qk.events.entry(eventId!, userId!),
    queryFn: () => getEventEntry(eventId!, userId!),
    enabled: !!eventId && !!userId,
    staleTime: THIRTY_SEC,
  });
}
```

**Step 3: Verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/lib/queries/keys.ts src/lib/queries/events.ts
git commit -m "feat: add useEventEntry query hook + query key"
```

---

## Task 6: FantasyContent — Replace Payment Flow

**Files:**
- Modify: `src/app/(app)/fantasy/FantasyContent.tsx`

This is the most critical task. The current flow calls `spendTickets()` then `submitLineup()`. The new flow decouples entry (payment) from lineup submission.

**Step 1: Add imports**

Replace old imports:
```typescript
// REMOVE these imports:
// import { spendTickets, creditTickets } from '@/lib/services/tickets';
// import { deductEntryFee, refundEntryFee } from '@/lib/services/wallet';

// ADD:
import { lockEventEntry, unlockEventEntry } from '@/lib/services/events';
```

**Step 2: Add new handleJoinEvent function**

Create a new function that handles ONLY the entry (payment), separate from lineup:

```typescript
const handleJoinEvent = async (event: FantasyEvent) => {
  if (!user) return;
  setJoining(event.id);
  try {
    const result = await lockEventEntry(event.id, user.id);
    if (!result.ok) {
      if (result.error === 'insufficient_tickets') {
        addToast(t('notEnoughTickets', { have: result.have ?? 0, need: result.need ?? 0 }), 'error');
      } else if (result.error === 'insufficient_balance') {
        addToast(t('notEnoughScout', { have: result.have ?? 0, need: result.need ?? 0 }), 'error');
      } else if (result.error === 'event_full') {
        addToast(t('eventFull'), 'error');
      } else if (result.error === 'event_not_open') {
        addToast(t('eventNotOpen'), 'error');
      } else {
        addToast(result.error ?? t('joinFailed'), 'error');
      }
      return;
    }

    // Invalidate relevant queries
    queryClient.invalidateQueries({ queryKey: qk.events.joinedIds(user.id) });
    queryClient.invalidateQueries({ queryKey: qk.events.all });
    queryClient.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
    queryClient.invalidateQueries({ queryKey: qk.wallet(user.id) });

    addToast(t('joinedEvent'), 'success');
  } catch (err) {
    console.error('handleJoinEvent error:', err);
    addToast(t('joinFailed'), 'error');
  } finally {
    setJoining(null);
  }
};
```

**Step 3: Simplify handleSubmitLineup**

Remove ALL payment logic from the existing lineup submit handler. It should ONLY call `submitLineup()`:

```typescript
const handleSubmitLineup = async (
  event: FantasyEvent,
  lineup: LineupPlayer[],
  formation: string,
  captainSlot: string | null,
) => {
  if (!user) return;
  try {
    const slots = buildSlotMap(lineup, formation);
    await submitLineup({
      eventId: event.id,
      userId: user.id,
      formation,
      slots,
      captainSlot,
    });

    queryClient.invalidateQueries({ queryKey: qk.events.usage(user.id) });
    addToast(t('lineupSaved'), 'success');
  } catch (err) {
    console.error('handleSubmitLineup error:', err);
    addToast(t('lineupFailed'), 'error');
  }
};
```

**Step 4: Rewrite handleLeaveEvent**

Replace the old leave handler that manually calls `creditTickets`/`refundEntryFee`:

```typescript
const handleLeaveEvent = async (event: FantasyEvent) => {
  if (!user) return;
  setLeaving(event.id);
  try {
    const result = await unlockEventEntry(event.id, user.id);
    if (!result.ok) {
      if (result.error === 'event_locked') {
        addToast(t('eventAlreadyLocked'), 'error');
      } else {
        addToast(result.error ?? t('leaveFailed'), 'error');
      }
      return;
    }

    queryClient.invalidateQueries({ queryKey: qk.events.joinedIds(user.id) });
    queryClient.invalidateQueries({ queryKey: qk.events.usage(user.id) });
    queryClient.invalidateQueries({ queryKey: qk.events.all });
    queryClient.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
    queryClient.invalidateQueries({ queryKey: qk.wallet(user.id) });

    addToast(t('leftEvent'), 'success');
  } catch (err) {
    console.error('handleLeaveEvent error:', err);
    addToast(t('leaveFailed'), 'error');
  } finally {
    setLeaving(null);
  }
};
```

**Step 5: Update EventDetailModal props**

Pass separate `onJoin` (for entry/payment) and `onSubmitLineup` (for lineup only) instead of a single `onJoin` that did both:

```typescript
<EventDetailModal
  onJoin={handleJoinEvent}           // NEW: entry only
  onSubmitLineup={handleSubmitLineup} // NEW: lineup only
  onLeave={handleLeaveEvent}          // UPDATED: uses unlockEventEntry
  // ... other props
/>
```

**Step 6: Verify**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```bash
git add src/app/(app)/fantasy/FantasyContent.tsx
git commit -m "feat: replace broken 2-step payment with atomic lockEventEntry/unlockEventEntry"
```

---

## Task 7: EventDetailModal — Decouple Join from Lineup

**Files:**
- Modify: `src/components/fantasy/EventDetailModal.tsx`

**Step 1: Update prop types**

Change the modal to accept separate `onJoin` and `onSubmitLineup`:

```typescript
type Props = {
  // ... existing props ...
  onJoin: (event: FantasyEvent) => Promise<void>;           // entry/payment
  onSubmitLineup: (                                          // lineup only
    event: FantasyEvent,
    lineup: LineupPlayer[],
    formation: string,
    captainSlot: string | null,
  ) => Promise<void>;
  onLeave: (event: FantasyEvent) => Promise<void>;
};
```

**Step 2: Update Overview tab**

Add "Teilnehmen" button that calls `onJoin` (without requiring lineup):

```typescript
// In Overview tab, show join button if not entered
{!isEntered && (
  <Button onClick={() => onJoin(event)} loading={joining}>
    {event.currency === 'tickets'
      ? t('joinWithTickets', { cost: event.ticketCost })
      : t('joinWithScout', { cost: fmtScout(event.ticketCost) })}
  </Button>
)}
```

**Step 3: Update Lineup tab**

Only show if entered. Submit calls `onSubmitLineup` (no payment):

```typescript
// Lineup tab: only render if entered
{isEntered && (
  <LineupBuilder
    onSubmit={(lineup, formation, captain) =>
      onSubmitLineup(event, lineup, formation, captain)
    }
  />
)}
```

**Step 4: Show currency-aware cost display**

```typescript
// Cost display with currency icon
<span className="font-mono tabular-nums">
  {event.ticketCost > 0
    ? event.currency === 'tickets'
      ? `${event.ticketCost} ${t('tickets')}`
      : `${fmtScout(event.ticketCost)} $SCOUT`
    : t('free')}
</span>
```

**Step 5: Verify**

Run: `npx tsc --noEmit`

**Step 6: Commit**

```bash
git add src/components/fantasy/EventDetailModal.tsx
git commit -m "feat: decouple join (payment) from lineup submission in EventDetailModal"
```

---

## Task 8: Admin UI — Currency Dropdown

**Files:**
- Modify: `src/components/admin/AdminEventsTab.tsx`
- Modify: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx`

**Step 1: Add currency state to AdminEventsTab**

```typescript
const [currency, setCurrency] = useState<'tickets' | 'scout'>('tickets');
```

**Step 2: Add currency dropdown to form**

```typescript
<label className="text-sm text-white/50">{t('currency')}</label>
<select
  value={currency}
  onChange={(e) => setCurrency(e.target.value as 'tickets' | 'scout')}
  className="bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-white"
>
  <option value="tickets">{t('tickets')}</option>
  {scoutEventsEnabled && (
    <option value="scout">$SCOUT</option>
  )}
</select>
```

**Step 3: Pass currency to createEvent**

```typescript
await createEvent({
  // ... existing fields ...
  currency,
});
```

**Step 4: Repeat for AdminEventsManagementTab**

Same changes: add state, dropdown, pass to createEvent.

**Step 5: Add platform settings query hook**

In `src/lib/queries/events.ts` or a new `src/lib/queries/settings.ts`:

```typescript
export function useScoutEventsEnabled() {
  return useQuery({
    queryKey: ['platform_settings', 'scout_events_enabled'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'scout_events_enabled')
        .maybeSingle();
      return data?.value === true;
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
```

**Step 6: Verify**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```bash
git add src/components/admin/AdminEventsTab.tsx src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx
git commit -m "feat: add currency dropdown to admin event creation"
```

---

## Task 9: BeScout Admin — Feature Flag Toggle

**Files:**
- Modify: `src/app/(app)/bescout-admin/` (find the settings tab or create section)

**Step 1: Add toggle to BeScout Admin**

In the appropriate admin tab, add a toggle for `scout_events_enabled`:

```typescript
const handleToggleScoutEvents = async (enabled: boolean) => {
  const { error } = await supabase
    .from('platform_settings')
    .upsert({ key: 'scout_events_enabled', value: enabled, updated_at: new Date().toISOString() });

  if (error) {
    addToast(t('settingsFailed'), 'error');
    return;
  }

  queryClient.invalidateQueries({ queryKey: ['platform_settings'] });
  addToast(enabled ? t('scoutEventsEnabled') : t('scoutEventsDisabled'), 'success');
};
```

**Step 2: Render toggle UI**

```typescript
<div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
  <div>
    <p className="font-black text-white">{t('scoutEventsTitle')}</p>
    <p className="text-sm text-white/50">{t('scoutEventsDescription')}</p>
  </div>
  <button
    onClick={() => handleToggleScoutEvents(!scoutEventsEnabled)}
    className={cn(
      'w-12 h-6 rounded-full transition-colors',
      scoutEventsEnabled ? 'bg-gold' : 'bg-white/10',
    )}
  >
    <span className={cn(
      'block w-5 h-5 rounded-full bg-white transition-transform',
      scoutEventsEnabled ? 'translate-x-6' : 'translate-x-0.5',
    )} />
  </button>
</div>
```

**Step 3: Verify**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/(app)/bescout-admin/
git commit -m "feat: add scout_events_enabled feature flag toggle in BeScout Admin"
```

---

## Task 10: i18n — Add Translation Keys

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Add German keys**

```json
{
  "joinWithTickets": "Teilnehmen ({cost} Tickets)",
  "joinWithScout": "Teilnehmen ({cost} $SCOUT)",
  "notEnoughTickets": "Nicht genug Tickets. Du hast {have}, brauchst {need}.",
  "notEnoughScout": "Nicht genug $SCOUT. Du hast {have}, brauchst {need}.",
  "eventFull": "Event ist voll.",
  "eventNotOpen": "Anmeldung nicht moeglich.",
  "eventAlreadyLocked": "Event bereits gesperrt — kein Austritt mehr moeglich.",
  "joinedEvent": "Erfolgreich angemeldet!",
  "leftEvent": "Erfolgreich abgemeldet.",
  "joinFailed": "Anmeldung fehlgeschlagen.",
  "leaveFailed": "Abmeldung fehlgeschlagen.",
  "lineupSaved": "Lineup gespeichert!",
  "lineupFailed": "Lineup konnte nicht gespeichert werden.",
  "mustEnterFirst": "Du musst dich zuerst anmelden.",
  "currency": "Waehrung",
  "tickets": "Tickets",
  "free": "Kostenlos",
  "scoutEventsTitle": "$SCOUT Events erlauben",
  "scoutEventsDescription": "Wenn aktiviert, koennen Admins Events mit $SCOUT-Eintritt erstellen.",
  "scoutEventsEnabled": "$SCOUT Events aktiviert",
  "scoutEventsDisabled": "$SCOUT Events deaktiviert",
  "settingsFailed": "Einstellung konnte nicht gespeichert werden."
}
```

**Step 2: Add Turkish keys**

```json
{
  "joinWithTickets": "Katil ({cost} Bilet)",
  "joinWithScout": "Katil ({cost} $SCOUT)",
  "notEnoughTickets": "Yeterli bilet yok. {have} var, {need} gerekli.",
  "notEnoughScout": "Yeterli $SCOUT yok. {have} var, {need} gerekli.",
  "eventFull": "Etkinlik dolu.",
  "eventNotOpen": "Kayit yapilamiyor.",
  "eventAlreadyLocked": "Etkinlik kilitlendi — cikis yapilamiyor.",
  "joinedEvent": "Basariyla kaydoldunuz!",
  "leftEvent": "Basariyla ayrildiniz.",
  "joinFailed": "Kayit basarisiz.",
  "leaveFailed": "Ayrilma basarisiz.",
  "lineupSaved": "Kadro kaydedildi!",
  "lineupFailed": "Kadro kaydedilemedi.",
  "mustEnterFirst": "Oncelikle kayit olmalisiniz.",
  "currency": "Para birimi",
  "tickets": "Biletler",
  "free": "Ucretsiz",
  "scoutEventsTitle": "$SCOUT etkinliklere izin ver",
  "scoutEventsDescription": "Etkinlestirildiginde adminler $SCOUT girisli etkinlik olusturabilir.",
  "scoutEventsEnabled": "$SCOUT etkinlikler aktif",
  "scoutEventsDisabled": "$SCOUT etkinlikler devre disi",
  "settingsFailed": "Ayar kaydedilemedi."
}
```

**Step 3: Verify i18n namespace**

Run: `node -e "const d=require('./messages/de.json'); console.log(Object.keys(d).length)"`

**Step 4: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "feat: add i18n keys for unified event payment (DE + TR)"
```

---

## Task 11: Cleanup — Remove Old Payment Code

**Files:**
- Modify: `src/app/(app)/fantasy/FantasyContent.tsx`
- Modify: `src/lib/services/wallet.ts` (keep functions but stop calling from events)

**Step 1: Remove unused imports from FantasyContent**

Verify and remove:
- `spendTickets`, `creditTickets` from tickets service (if no longer used elsewhere)
- `deductEntryFee`, `refundEntryFee` from wallet service (if no longer used elsewhere)

**Step 2: Check if wallet entry fee functions are used elsewhere**

Run: `grep -r "deductEntryFee\|refundEntryFee" src/`

If only used in FantasyContent, mark as deprecated or remove.

**Step 3: Verify full build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/app/(app)/fantasy/FantasyContent.tsx
git commit -m "chore: remove old broken 2-step payment code from FantasyContent"
```

---

## Task 12: Tests

**Files:**
- Create: `src/lib/services/__tests__/event-entries.test.ts`

**Step 1: Write service tests**

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('Event Entry Service', () => {
  describe('lockEventEntry', () => {
    it('should call lock_event_entry RPC with event ID', async () => {
      // Mock supabase.rpc to return { ok: true, currency: 'tickets', balance_after: 5 }
      // Call lockEventEntry(eventId, userId)
      // Assert RPC called with correct params
      // Assert return value matches
    });

    it('should return error on insufficient tickets', async () => {
      // Mock supabase.rpc to return { ok: false, error: 'insufficient_tickets', have: 2, need: 5 }
      // Assert { ok: false, error: 'insufficient_tickets' } returned
    });

    it('should return already_entered for duplicate entry', async () => {
      // Mock supabase.rpc to return { ok: true, already_entered: true }
      // Assert idempotent behavior
    });
  });

  describe('unlockEventEntry', () => {
    it('should call unlock_event_entry RPC', async () => {
      // Mock + assert
    });

    it('should return error when event is locked', async () => {
      // Mock { ok: false, error: 'event_locked' }
    });
  });

  describe('cancelEventEntries', () => {
    it('should call cancel_event_entries RPC (admin only)', async () => {
      // Mock + assert refundedCount
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest run src/lib/services/__tests__/event-entries.test.ts`

**Step 3: Commit**

```bash
git add src/lib/services/__tests__/event-entries.test.ts
git commit -m "test: add event entry service tests"
```

---

## Dependency Graph

```
Task 1 (Migration)
  ↓
Task 2 (Types) ← depends on Task 1 (needs DB columns to exist)
  ↓
Task 3 (Service: lock/unlock) ← depends on Task 2
Task 4 (Service: submitLineup guard) ← depends on Task 2
Task 5 (Query Hooks) ← depends on Task 3
  ↓
Task 6 (FantasyContent) ← depends on Tasks 3, 4, 5
Task 7 (EventDetailModal) ← depends on Task 6
  ↓
Task 8 (Admin currency dropdown) ← depends on Task 3
Task 9 (Feature flag toggle) ← depends on Task 1 (platform_settings table)
Task 10 (i18n) ← can run parallel to Tasks 6-9
  ↓
Task 11 (Cleanup) ← depends on Tasks 6, 7
Task 12 (Tests) ← depends on Task 3

Parallel Groups:
- Wave 1: Task 1
- Wave 2: Tasks 2
- Wave 3: Tasks 3, 4, 5 (parallel)
- Wave 4: Tasks 6, 7, 8, 9, 10 (6→7 sequential, rest parallel)
- Wave 5: Tasks 11, 12 (parallel)
```
