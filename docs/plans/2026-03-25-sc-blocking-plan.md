# SC Blocking Phase 1 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enforce Scout Card ownership when submitting Fantasy lineups. Lock SCs per event, prevent trading of locked SCs, auto-unlock on event end/leave.

**Architecture:** New `holding_locks` table tracks per-player per-event locks. `submitLineup` service checks available SCs before upsert, creates locks atomically. `place_sell_order` RPC subtracts locked qty. Event lifecycle RPCs clean up locks on end/leave/cancel.

**Tech Stack:** TypeScript, Supabase PostgreSQL (RPCs + migrations), React, Tailwind

**Design Doc:** `docs/plans/2026-03-25-sc-blocking-design.md`

---

## Task 1: Migration — holding_locks table + event columns

**Files:**
- Create: `supabase/migrations/20260325_holding_locks.sql`

**Step 1: Write migration**

```sql
-- ============================================================================
-- Migration: SC Blocking for Fantasy Events
-- Date: 2026-03-25
-- Design: docs/plans/2026-03-25-sc-blocking-design.md
-- ============================================================================

-- 1. holding_locks table
CREATE TABLE IF NOT EXISTS public.holding_locks (
  user_id    UUID NOT NULL REFERENCES public.profiles(id),
  player_id  UUID NOT NULL REFERENCES public.players(id),
  event_id   UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  quantity_locked SMALLINT NOT NULL CHECK (quantity_locked > 0),
  locked_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, player_id, event_id)
);

ALTER TABLE public.holding_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own locks"
  ON public.holding_locks FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Index for fast available_qty calculation
CREATE INDEX IF NOT EXISTS idx_holding_locks_user_player
  ON public.holding_locks(user_id, player_id);

-- Index for fast cleanup on event end
CREATE INDEX IF NOT EXISTS idx_holding_locks_event
  ON public.holding_locks(event_id);

-- 2. Event columns for SC requirements
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS min_sc_per_slot SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS wildcards_allowed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_wildcards_per_lineup SMALLINT NOT NULL DEFAULT 0;

-- 3. Helper: get available SC quantity for a user+player
CREATE OR REPLACE FUNCTION public.get_available_sc(p_user_id UUID, p_player_id UUID)
RETURNS INT LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    (SELECT h.quantity FROM public.holdings h
     WHERE h.user_id = p_user_id AND h.player_id = p_player_id),
    0
  ) - COALESCE(
    (SELECT SUM(hl.quantity_locked)::INT FROM public.holding_locks hl
     WHERE hl.user_id = p_user_id AND hl.player_id = p_player_id),
    0
  );
$$;
```

**Step 2: Apply migration via Supabase MCP**

**Step 3: Verify**

```sql
SELECT * FROM public.holding_locks LIMIT 1;
SELECT get_available_sc('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000');
SELECT min_sc_per_slot, wildcards_allowed, max_wildcards_per_lineup FROM events LIMIT 1;
```

**Step 4: Commit**

```bash
git add supabase/migrations/20260325_holding_locks.sql
git commit -m "feat(events): holding_locks table + event SC requirement columns"
```

---

## Task 2: TypeScript types + service helpers

**Files:**
- Modify: `src/types/index.ts` — add `DbHoldingLock` type, update `DbEvent`
- Modify: `src/lib/services/wallet.ts` — add `getAvailableSc()`, `getLockedScs()`

**Step 1: Add DbHoldingLock type**

In `src/types/index.ts`, after `DbHolding` type (~line 542):

```typescript
export type DbHoldingLock = {
  user_id: string;
  player_id: string;
  event_id: string;
  quantity_locked: number;
  locked_at: string;
};
```

Add to `DbEvent` type (~line 592): `min_sc_per_slot`, `wildcards_allowed`, `max_wildcards_per_lineup` fields.

**Step 2: Add service functions**

In `src/lib/services/wallet.ts`, add:

```typescript
/** Get available (unlocked) SC quantity for a user+player */
export async function getAvailableSc(userId: string, playerId: string): Promise<number> {
  const { data, error } = await supabase.rpc('get_available_sc', {
    p_user_id: userId,
    p_player_id: playerId,
  });
  if (error) { console.error('[Wallet] getAvailableSc error:', error); return 0; }
  return (data as number) ?? 0;
}

/** Get all holding locks for a user (across all active events) */
export async function getUserHoldingLocks(userId: string): Promise<DbHoldingLock[]> {
  const { data, error } = await supabase
    .from('holding_locks')
    .select('*')
    .eq('user_id', userId);
  if (error) { console.error('[Wallet] getUserHoldingLocks error:', error); return []; }
  return (data ?? []) as DbHoldingLock[];
}
```

**Step 3: tsc check**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/types/index.ts src/lib/services/wallet.ts
git commit -m "feat(events): DbHoldingLock type + getAvailableSc service"
```

---

## Task 3: SC check + lock creation in submitLineup

**Files:**
- Modify: `src/lib/services/lineups.ts:71-276` — add SC ownership check + holding_locks insert

**Step 1: Update event query to include min_sc_per_slot**

In `submitLineup()` line 81, add `min_sc_per_slot` to the select:

```typescript
.select('status, max_entries, current_entries, locks_at, lineup_size, scope, type, club_id, min_sc_per_slot')
```

**Step 2: Add SC check block after duplicate player guard (~line 206)**

After the `duplicatePlayer` check and before the lineup size check, add:

```typescript
// Guard: SC ownership — user must own min_sc_per_slot SCs per player
const minScPerSlot = ev.min_sc_per_slot ?? 1;
if (minScPerSlot > 0) {
  // Load existing locks for this user+event (for idempotent re-submits)
  const { data: existingLocks } = await supabase
    .from('holding_locks')
    .select('player_id, quantity_locked')
    .eq('user_id', params.userId)
    .eq('event_id', params.eventId);

  const existingLockMap = new Map<string, number>();
  for (const lock of existingLocks ?? []) {
    existingLockMap.set(lock.player_id, lock.quantity_locked);
  }

  // Load all holding locks for this user (to calc available_qty)
  const { data: allLocks } = await supabase
    .from('holding_locks')
    .select('player_id, quantity_locked')
    .eq('user_id', params.userId);

  const totalLockedMap = new Map<string, number>();
  for (const lock of allLocks ?? []) {
    totalLockedMap.set(lock.player_id, (totalLockedMap.get(lock.player_id) ?? 0) + lock.quantity_locked);
  }

  // Load holdings for all players in lineup
  const { data: holdings } = await supabase
    .from('holdings')
    .select('player_id, quantity')
    .eq('user_id', params.userId)
    .in('player_id', slotPlayerIds);

  const holdingMap = new Map<string, number>();
  for (const h of holdings ?? []) {
    holdingMap.set(h.player_id, h.quantity);
  }

  // Check each player
  for (const playerId of slotPlayerIds) {
    const alreadyLockedThisEvent = existingLockMap.get(playerId) ?? 0;
    if (alreadyLockedThisEvent >= minScPerSlot) continue; // already locked for this event

    const held = holdingMap.get(playerId) ?? 0;
    const totalLocked = totalLockedMap.get(playerId) ?? 0;
    // Subtract locks for THIS event (since we'll replace them)
    const lockedElsewhere = totalLocked - alreadyLockedThisEvent;
    const available = held - lockedElsewhere;

    if (available < minScPerSlot) {
      throw new Error('insufficient_sc');
    }
  }
}
```

**Step 3: Add lock management after successful upsert (~line 249)**

After the upsert succeeds (after `if (error) throw`), add:

```typescript
// Manage holding locks: delete old locks for this event, create new ones
if ((ev.min_sc_per_slot ?? 1) > 0) {
  // Delete all existing locks for this user+event
  await supabase
    .from('holding_locks')
    .delete()
    .eq('user_id', params.userId)
    .eq('event_id', params.eventId);

  // Create locks for each player in the new lineup
  const lockRows = slotPlayerIds.map(playerId => ({
    user_id: params.userId,
    player_id: playerId,
    event_id: params.eventId,
    quantity_locked: ev.min_sc_per_slot ?? 1,
  }));

  if (lockRows.length > 0) {
    const { error: lockError } = await supabase
      .from('holding_locks')
      .insert(lockRows);

    if (lockError) {
      console.error('[Lineup] Failed to create holding locks:', lockError);
      // Don't throw — lineup is already saved, locks are secondary
    }
  }
}
```

**Step 4: tsc check**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/services/lineups.ts
git commit -m "feat(events): SC ownership check + holding locks in submitLineup"
```

---

## Task 4: Unlock on event leave

**Files:**
- Modify: `src/lib/services/lineups.ts:278-291` — add lock cleanup to `removeLineup()`
- Modify: `supabase/migrations/20260321_unified_event_payment.sql` — NOT modified, instead create new migration

**Step 1: Update removeLineup()**

In `src/lib/services/lineups.ts`, modify `removeLineup()` (~line 278):

```typescript
export async function removeLineup(eventId: string, userId: string): Promise<void> {
  // Delete holding locks first (before lineup deletion)
  await supabase
    .from('holding_locks')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId);

  const { error, count } = await supabase
    .from('lineups')
    .delete({ count: 'exact' })
    .eq('event_id', eventId)
    .eq('user_id', userId);

  if (error) throw new Error(`removeLineup failed: ${error.message}`);

  if (count === 0) {
    throw new Error('lineupDeleteFailed');
  }
}
```

**Step 2: Create migration to add lock cleanup to rpc_unlock_event_entry**

Create `supabase/migrations/20260325_unlock_cleans_locks.sql`:

```sql
-- Add holding_locks cleanup to rpc_unlock_event_entry
CREATE OR REPLACE FUNCTION public.rpc_unlock_event_entry(
  p_event_id UUID,
  p_user_id  UUID
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_event        RECORD;
  v_entry        RECORD;
  v_balance_after BIGINT;
BEGIN
  -- [COPY EXISTING BODY from 20260321_unified_event_payment.sql lines 272-350]
  -- Add this BEFORE "Delete entry" (step 6):

  -- 5.5 Delete holding locks for this user+event
  DELETE FROM public.holding_locks
    WHERE event_id = p_event_id AND user_id = p_user_id;

  -- [REST OF EXISTING BODY]
END;
$$;

-- Add lock cleanup to rpc_cancel_event_entries
-- After refund loop, before DELETE FROM event_entries:
-- DELETE FROM holding_locks WHERE event_id = p_event_id;
```

NOTE: The actual migration must copy the full RPC body from the existing migration and add the DELETE line. Use CREATE OR REPLACE FUNCTION.

**Step 3: Apply migration**

**Step 4: Commit**

```bash
git add src/lib/services/lineups.ts supabase/migrations/20260325_unlock_cleans_locks.sql
git commit -m "feat(events): clean up holding locks on event leave/cancel"
```

---

## Task 5: Trading guard — block selling locked SCs

**Files:**
- Create: `supabase/migrations/20260325_sell_order_lock_guard.sql`

**Step 1: Write migration patching place_sell_order**

The existing `place_sell_order` RPC (in `20260319_pricing_architecture.sql:239-337`) calculates `v_available_qty` at line 316:

```sql
v_available_qty := v_holding.quantity - v_open_sell_qty;
```

Patch it to also subtract locked SCs:

```sql
CREATE OR REPLACE FUNCTION public.place_sell_order(
  p_user_id UUID, p_player_id UUID, p_quantity INT, p_price BIGINT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
AS $function$
DECLARE
  v_holding RECORD;
  v_open_sell_qty INT;
  v_locked_qty INT;
  v_available_qty INT;
  v_order_id UUID;
  v_is_liquidated BOOLEAN;
  v_recent_orders INT;
  v_price_cap BIGINT;
BEGIN
  -- [COPY FULL EXISTING BODY]

  -- After v_open_sell_qty calculation (~original line 310-314), add:

  -- EVENT LOCK CHECK
  SELECT COALESCE(SUM(quantity_locked), 0)::INT INTO v_locked_qty
  FROM public.holding_locks
  WHERE user_id = p_user_id AND player_id = p_player_id;

  v_available_qty := v_holding.quantity - v_open_sell_qty - v_locked_qty;
  IF v_available_qty < p_quantity THEN
    RETURN json_build_object('success', false, 'error',
      'Nur ' || v_available_qty || ' SC verfuegbar (' || v_locked_qty || ' in Events gesperrt)');
  END IF;

  -- [REST OF EXISTING BODY: CREATE ORDER, RECALC, RETURN]
END;
$function$;
```

**Step 2: Apply migration**

**Step 3: Commit**

```bash
git add supabase/migrations/20260325_sell_order_lock_guard.sql
git commit -m "feat(trading): block selling event-locked Scout Cards"
```

---

## Task 6: Event lifecycle — auto-unlock on end/score

**Files:**
- Create: `supabase/migrations/20260325_event_end_unlocks.sql`

**Step 1: Write migration — DB trigger for automatic cleanup**

```sql
-- Trigger: when event status changes to ended/scored/cancelled, delete all locks
CREATE OR REPLACE FUNCTION public.trg_fn_event_status_unlock_holdings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status IN ('ended', 'scoring', 'cancelled')
     AND OLD.status NOT IN ('ended', 'scoring', 'cancelled') THEN
    DELETE FROM public.holding_locks WHERE event_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_event_status_unlock_holdings ON public.events;
CREATE TRIGGER trg_event_status_unlock_holdings
  AFTER UPDATE OF status ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_event_status_unlock_holdings();
```

**Step 2: Apply migration**

**Step 3: Commit**

```bash
git add supabase/migrations/20260325_event_end_unlocks.sql
git commit -m "feat(events): auto-unlock SCs when event ends/scores/cancels"
```

---

## Task 7: Admin UI — min_sc_per_slot field in event creation

**Files:**
- Modify: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx` — add form field + state

**Step 1: Add state variable (~line 98)**

After `formSalaryCap` state:

```typescript
const [formMinScPerSlot, setFormMinScPerSlot] = useState('1');
```

**Step 2: Add to edit population (~line 213)**

After `setFormSalaryCap`:

```typescript
setFormMinScPerSlot(String(ev.min_sc_per_slot ?? 1));
```

**Step 3: Add to create/update payloads (~lines 264, 292)**

Add field mapping:

```typescript
maybePut('min_sc_per_slot', parseInt(formMinScPerSlot) || 1);
```

And in create payload:

```typescript
minScPerSlot: parseInt(formMinScPerSlot) || 1,
```

**Step 4: Add form field after Salary Cap (~line 774)**

```tsx
{/* Min SC per Slot */}
<div>
  <label className="block text-sm font-bold text-white/70 mb-1">Min SC pro Slot</label>
  <input
    type="number"
    inputMode="numeric"
    min="0"
    max="10"
    value={formMinScPerSlot}
    onChange={(e) => setFormMinScPerSlot(e.target.value)}
    placeholder="1"
    disabled={isFieldDisabled('min_sc_per_slot')}
    aria-label="Minimum Scout Cards pro Slot"
    className={cn(INPUT_CLS, 'min-h-[44px] disabled:opacity-40 disabled:cursor-not-allowed')}
  />
</div>
```

**Step 5: tsc check**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/app/\(app\)/bescout-admin/AdminEventsManagementTab.tsx
git commit -m "feat(admin): min SC per slot config in event creation"
```

---

## Task 8: Lineup UI — filter player picker by available SCs

**Files:**
- Modify: `src/components/fantasy/event-tabs/LineupPanel.tsx` — filter players
- Modify: `src/app/(app)/fantasy/FantasyContent.tsx` — pass available SC data

**Step 1: Add available SC loading in FantasyContent**

Load user holding locks alongside holdings. Pass `availableScMap` to LineupPanel.

```typescript
// After loading holdings, also load locks
const locks = await getUserHoldingLocks(user.id);
const lockedMap = new Map<string, number>();
for (const lock of locks) {
  lockedMap.set(lock.player_id, (lockedMap.get(lock.player_id) ?? 0) + lock.quantity_locked);
}
```

**Step 2: Filter player picker**

In LineupPanel, when showing available players, only show those where:

```typescript
const available = (holding.quantity ?? 0) - (lockedMap.get(playerId) ?? 0);
const canUse = available >= (event.minScPerSlot ?? 1);
```

Disable/grey out players with insufficient available SCs.

**Step 3: Show locked indicator on slots**

When a player is in the lineup and locked, show small badge:

```tsx
{isLocked && <span className="text-[10px] text-amber-400/60">{minSc} SC</span>}
```

**Step 4: tsc check + visual verify**

**Step 5: Commit**

```bash
git add src/components/fantasy/event-tabs/LineupPanel.tsx src/app/\(app\)/fantasy/FantasyContent.tsx
git commit -m "feat(events): filter player picker by available SCs + lock indicator"
```

---

## Task 9: i18n + error handling

**Files:**
- Modify: `messages/de.json` — add `insufficient_sc` error message
- Modify: `messages/tr.json` — add Turkish translation
- Modify: `src/app/(app)/fantasy/FantasyContent.tsx` — handle `insufficient_sc` error in submit flow

**Step 1: Add i18n keys**

DE: `"insufficientSc": "Nicht genug Scout Cards. Du brauchst {min} SC pro Slot."`
TR: `"insufficientSc": "{min} SC gerekli. Yeterli Scout Card yok."`

DE: `"scLockedInEvents": "{locked} SC in Events gesperrt"`
TR: `"scLockedInEvents": "{locked} SC etkinliklerde kilitli"`

**Step 2: Handle error in submit flow**

In FantasyContent error handling, catch `insufficient_sc`:

```typescript
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : '';
  if (msg === 'insufficient_sc') {
    addToast(t('insufficientSc', { min: event.minScPerSlot ?? 1 }), 'error');
  } else {
    // existing error handling
  }
}
```

**Step 3: Commit**

```bash
git add messages/de.json messages/tr.json src/app/\(app\)/fantasy/FantasyContent.tsx
git commit -m "feat(events): insufficient_sc error handling + i18n"
```

---

## Task 10: Verification

**Step 1: tsc + vitest**

```bash
npx tsc --noEmit && npx vitest run --reporter verbose
```

**Step 2: DB verification**

```sql
-- Verify holding_locks table exists and is empty
SELECT COUNT(*) FROM holding_locks;

-- Verify get_available_sc works
SELECT get_available_sc(
  (SELECT id FROM profiles LIMIT 1),
  (SELECT id FROM players LIMIT 1)
);

-- Verify event columns exist
SELECT min_sc_per_slot, wildcards_allowed, max_wildcards_per_lineup
FROM events LIMIT 3;
```

**Step 3: Visual QA**

1. Open `/fantasy`, click an event, try adding a player you DON'T own → should be filtered/disabled
2. Add a player you own → should work, lock created in DB
3. Swap player → old lock deleted, new lock created
4. Leave event → locks cleaned up
5. Try selling locked SC on `/market` → should get error

**Step 4: Final commit**

```bash
git commit --allow-empty -m "chore: SC blocking phase 1 verified"
```
