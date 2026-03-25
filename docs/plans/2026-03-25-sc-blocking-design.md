# SC Blocking & Wild Cards — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan.

**Goal:** Enforce Scout Card ownership for Fantasy Event lineups. Users must own the required SCs per slot. Locked SCs cannot be traded or used in other events. Wild Cards allow slotting players without SC ownership.

**Architecture:** 3-phase approach. Phase 1 is SC Blocking Core (MVP). Phase 2 adds Wild Cards. Phase 3 is UX polish. Each phase is independently deployable.

**Tech Stack:** TypeScript, React, Supabase PostgreSQL (RPCs + migrations), Tailwind

---

## Context

### The Problem
- Users can add ANY player to their Fantasy lineup without owning Scout Cards
- The same SC can be used across unlimited events simultaneously
- No enforcement that SCs are "consumed" or "locked" when used in events
- Trading is not restricted by event participation

### Business Rules (validated with Founder)
- Event defines `min_sc_per_slot` (e.g., 1 or 3 SCs required per player slot)
- When a player is added to a lineup, the required SCs are **blocked**
- Blocked SCs: no trading, no use in other events
- SCs unblocked when: event ends OR user leaves event
- Wild Cards: inventory item earned via Mystery Box, Missions, Milestones, Daily Quests, Events
- Event creator configures: Wild Cards allowed (yes/no) + max per lineup
- Wild Card = slot a player without owning their SC

---

## Design

### 1. Database

**New Table: `holding_locks`**
```sql
CREATE TABLE holding_locks (
  user_id UUID NOT NULL REFERENCES profiles(id),
  player_id UUID NOT NULL REFERENCES players(id),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  quantity_locked SMALLINT NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, player_id, event_id)
);
```
- Tracks exactly which SCs are locked for which event
- Composite PK prevents duplicate locks
- CASCADE on event delete auto-cleans

**New Table: `user_wildcards`**
```sql
CREATE TABLE user_wildcards (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  balance INT NOT NULL DEFAULT 0,
  earned_total INT NOT NULL DEFAULT 0,
  spent_total INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**New Table: `wildcard_transactions`**
```sql
CREATE TABLE wildcard_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  source TEXT NOT NULL,  -- 'mystery_box','mission','event_reward','daily_quest','milestone','event_refund'
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Events Table — new columns:**
```sql
ALTER TABLE events ADD COLUMN
  min_sc_per_slot SMALLINT NOT NULL DEFAULT 1,
  wildcards_allowed BOOLEAN NOT NULL DEFAULT false,
  max_wildcards_per_lineup SMALLINT NOT NULL DEFAULT 0;
```

### 2. Lineup Submission — Blocking Logic

**Submit/Update Lineup (RPC):**

For each player in lineup:
1. Already locked for this event? → Skip (idempotent)
2. Wild Card slot?
   - Check: `wildcards_allowed` on event
   - Check: wild card count in lineup <= `max_wildcards_per_lineup`
   - Debit 1 Wild Card from `user_wildcards`
   - No SC lock needed
3. Normal slot:
   - `available_qty = holdings.quantity - SUM(holding_locks.quantity_locked)`
   - `available_qty < min_sc_per_slot` → Error `insufficient_sc`
   - INSERT into `holding_locks`

**Lineup Update (swap player):**
- Old player: DELETE lock → SCs freed
- New player: CREATE lock (or Wild Card)
- Wild Card swap: refund old, debit new

**Available Quantity Formula:**
```sql
available_qty = holdings.quantity
  - COALESCE((SELECT SUM(quantity_locked) FROM holding_locks
    WHERE user_id = X AND player_id = Y), 0)
```

### 3. Trading Guard

Before every sell order:
```sql
available_qty = holdings.quantity - SUM(holding_locks.quantity_locked)
IF available_qty < sell_quantity → Error 'sc_locked_in_events'
```

Existing sell RPCs must check this before allowing order placement.

### 4. Unlock Triggers

**Event ends/scores/cancels:**
```sql
DELETE FROM holding_locks WHERE event_id = X;
-- Existing event lifecycle RPCs already handle status transitions
-- Add lock cleanup to those transitions
```

**User leaves event (unlock_event_entry):**
```sql
DELETE FROM holding_locks WHERE user_id = X AND event_id = Y;
-- Already in rpc_unlock_event_entry flow
```

**Wild Card refund on leave:**
```sql
-- Count wild card slots in lineup, credit back to user_wildcards
```

### 5. Event Admin Config

Event creation/edit UI adds:
- `Min SC pro Slot` — number input (default: 1, range: 1-10)
- `Wild Cards erlaubt` — toggle (default: off)
- `Max Wild Cards pro Lineup` — number input (shown when toggle on, range: 1-11)

### 6. Lineup UI Changes

**Player Picker:**
- Only show players where `available_qty >= min_sc_per_slot`
- Or: show all, but disable/grey out players without sufficient SCs
- Wild Card toggle per slot (when event allows)

**Slot Display:**
- Badge: "2 SC gesperrt" on locked slots
- Wild Card indicator: golden border or chip icon

**Wild Card Counter:**
- Shown in lineup builder header when event allows Wild Cards
- "X Wild Cards verfuegbar"

### 7. Portfolio/Trading UI

- Holdings show: `Qty: 5 (3 verfuegbar, 2 gesperrt)`
- Sell button disabled when available_qty < 1
- Tooltip: "X SC in Events gesperrt"

---

## Phases

### Phase 1: SC Blocking Core (MVP)
- Migration: `holding_locks` table + event columns (`min_sc_per_slot`)
- Lineup RPC: SC ownership check + lock creation
- Lineup update: lock swap (old player freed, new player locked)
- Unlock on event end + leave
- Trading guard: available_qty check in sell RPCs
- UI: player picker filters by available SCs
- **No Wild Cards yet** — `min_sc_per_slot` defaults to 1

### Phase 2: Wild Cards
- Migration: `user_wildcards` + `wildcard_transactions` tables
- Event columns: `wildcards_allowed`, `max_wildcards_per_lineup`
- Wild Card slot logic in lineup RPC
- Admin UI: Wild Card config in event creation
- Fan UI: Wild Card button in lineup builder
- Earn hooks: Mystery Box, Missions, Milestones, Daily Quests

### Phase 3: UX Polish
- Portfolio: "X gesperrt" display
- Sell button disabled + tooltip
- Wild Card inventory in profile
- Wild Card transaction history

---

## Impact Analysis

**HIGH risk (money/trading):**
- All sell/trade RPCs must check `holding_locks`
- `submitLineup` must become transactional (lock SCs atomically)
- Event lifecycle RPCs must clean up locks

**MEDIUM risk (UI):**
- Player picker needs available_qty awareness
- Portfolio needs locked/available split display
- Event creation needs new fields

**LOW risk:**
- Wild Card earn sources (extend existing reward systems)
- Wild Card transaction log (follow ticket_transactions pattern)

---

## Out of Scope
- Wild Card marketplace (buy/sell between users)
- Partial SC locking (lock 2 of 5, but 3 still tradeable) — this IS in scope via available_qty formula
- SC lending between users
