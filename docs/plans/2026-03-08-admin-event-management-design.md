# Admin Event Management — Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Full event management for Platform Admins (BeScout Admin) with configurable reward structures, plus integration into existing Club Admin.

**Architecture:** New `events.reward_structure` JSONB column + dynamic `score_event` RPC + shared `RewardStructureEditor` component + new BeScout Admin Events Tab with full CRUD, filters, bulk actions, and stats.

---

## 1. DB Changes

### 1.1 New Column: `events.reward_structure`

- Type: `JSONB`, nullable
- Default: `NULL` (interpreted as `[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]`)
- Format: Array of `{"rank": INT, "pct": NUMERIC}` sorted by rank
- Validation (CHECK constraint):
  - Ranks start at 1, sequential, no gaps
  - Each `pct` > 0
  - Sum of all `pct` = 100
- Examples:
  - Top 3: `[{"rank":1,"pct":50},{"rank":2,"pct":30},{"rank":3,"pct":20}]`
  - Winner takes all: `[{"rank":1,"pct":100}]`
  - Top 5: `[{"rank":1,"pct":40},{"rank":2,"pct":25},{"rank":3,"pct":15},{"rank":4,"pct":12},{"rank":5,"pct":8}]`

### 1.2 RLS Policies — Platform Admin Access

Current INSERT/UPDATE/DELETE only check `club_admins`. Add `platform_admins` to all three:

```sql
-- Pattern for all three (insert, update, delete):
... OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
```

This also enables creating global events (`club_id = NULL`) which currently fail RLS.

### 1.3 score_event RPC Update

- Read `reward_structure` from event (COALESCE to default)
- Build reward array dynamically (not hardcoded 3 slots)
- Loop `1..v_max_rank` instead of `1..3`
- Keep `v_next_slot` tracking (already deployed)
- Add safety RAISE if sum != 100 (defense in depth)

---

## 2. Business Rules

### 2.1 Field Editability per Status

| Field | upcoming/registering | late-reg/running | scoring/ended |
|---|---|---|---|
| name | Yes | Yes | No |
| prize_pool | Yes | Yes (increase only) | No |
| reward_structure | Yes | **No** | No |
| gameweek | Yes | No | No |
| format | Yes | No | No |
| starts_at, locks_at | Yes | No | No |
| ends_at | Yes | Yes | No |
| max_entries | Yes | Yes | No |
| entry_fee | Yes | No | No |
| sponsor_name/logo | Yes | Yes | No |
| event_tier | Yes | No | No |
| min_subscription_tier | Yes | No | No |
| salary_cap | Yes | No | No |

Enforced in `updateEvent()` service function + documented in UI (disabled fields).

### 2.2 Status Transitions (Allowed)

```
upcoming -> registering -> late-reg -> running -> scoring -> ended
                        \-> cancelled
         \-> cancelled
```

`bulkUpdateStatus` validates per-event: only applies transition if allowed, returns per-event success/error.

### 2.3 Reward Structure Timing Guard

`reward_structure` only editable while status is `upcoming` or `registering`. Once users can lock lineups (late-reg+), the reward promise is locked. Enforced both in service layer and UI (editor disabled).

### 2.4 Pool Source

Controlled minting (Pilot). `wallets.balance` incremented directly, no treasury deduction. Documented as acceptable per ADR-026.

---

## 3. UI Components

### 3.1 RewardStructureEditor (`src/components/admin/RewardStructureEditor.tsx`)

Shared component used by both BeScout Admin and Club Admin.

**Features:**
- Template quick-select buttons: Top 3, Top 5, Winner takes all, Top 10
- Custom mode: add/remove ranks, set percentages per rank
- Live validation: sum must equal 100%, visual indicator
- Disabled state when event is past `registering`

**UI Requirements:**
- All buttons (template, +add, x-remove): `hover:bg-white/[0.05]`, `active:scale-[0.97]`, `focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50`, disabled state with `opacity-40 cursor-not-allowed`
- All buttons min `44px` touch target (min-h-[44px] min-w-[44px])
- `aria-label` on: template buttons ("Vorlage: Top 3"), add button ("Rang hinzufuegen"), remove buttons ("Rang N entfernen"), percentage inputs ("Prozent fuer Rang N")
- Percentage values: `font-mono tabular-nums`
- German labels: "Belohnungsstruktur", "Vorlage", "Rang", "Rang hinzufuegen"
- English code vars: `rewardStructure`, `RewardStructureEditor`, `templatePresets`

### 3.2 AdminEventsTab — BeScout Admin (`src/components/admin/AdminEventsManagementTab.tsx`)

New tab #11 in BeScout Admin.

**Layout:**
- Top: Create button + Search input
- Filter bar: Status, Type, Club, Gameweek, Date range
- Stats row: Active count, total participants, total pool
- Event list: Sortable table/cards with checkbox selection
- Bottom: Bulk action bar

**States:**
- **Loading:** `Loader2` spinner centered (from lucide-react)
- **Empty:** Illustration + "Keine Events gefunden" + Create CTA
- **Error:** Error message + Retry button
- **Populated:** Event list with all interactive elements

**UI Requirements:**
- Filter dropdowns: `aria-label` per filter ("Filter: Status", "Filter: Typ", "Filter: Verein", "Filter: Spieltag")
- Search input: `aria-label="Events durchsuchen"`, `placeholder="Suche..."`
- Bulk action dropdown: `aria-label="Aktion fuer ausgewaehlte Events"`
- Bulk execute button: `aria-label="Aktion ausfuehren"`, disabled when no selection
- Checkboxes: min `44px` touch target, `aria-label="Event auswaehlen: {eventName}"`
- Edit buttons per row: min `44px`, `aria-label="Event bearbeiten: {eventName}"`
- Numeric values: `font-mono tabular-nums` on participant counts (48/100), pool amounts (45.000), GW numbers
- All interactive elements: hover, active, focus-visible, disabled states
- German labels: "Neues Event", "Filter", "Aktionen", "Keine Events gefunden"
- English code vars: `AdminEventsManagementTab`, `eventFilters`, `bulkActions`

### 3.3 Create/Edit Event Modal

Extends existing `CreateEventModal` pattern with:
- Club dropdown (optional, for club-scoped events)
- RewardStructureEditor integration
- Field disable logic per status (Section 2.1)
- All form inputs: `aria-label`, focus-visible, disabled states, 44px touch targets

### 3.4 User-Facing Reward Display

Update `EventDetailModal` to show actual reward structure from `event.reward_structure` instead of hardcoded placeholders. Display format:
- "Platz 1: 50% (5.000 $SCOUT)" when pool > 0
- "Platz 1: 50%" when pool = 0

---

## 4. Service Layer

### 4.1 New Functions (`lib/services/events.ts`)

```typescript
// Fetch all events with club name join, server-side filtering
getAllEventsAdmin(filters: {
  status?: string[];
  type?: string[];
  clubId?: string;
  gameweek?: number;
  search?: string;
}): Promise<{ events: DbEvent[]; total: number }>

// Update specific fields on an event (with editability guards)
updateEvent(eventId: string, fields: Partial<DbEvent>): Promise<{ success: boolean; error?: string }>

// Change status on multiple events (validates per-event)
bulkUpdateStatus(eventIds: string[], status: string): Promise<{
  success: boolean;
  results: Array<{ eventId: string; success: boolean; error?: string }>;
}>

// Aggregate stats for admin dashboard
getEventAdminStats(): Promise<{
  activeCount: number;
  totalParticipants: number;
  totalPool: number;
}>
```

### 4.2 Error Handling Pattern

All service functions return `{ success, error? }` shape:
- Network failure: catch, return `{ success: false, error: 'Netzwerkfehler' }`
- Validation error: pre-check, return `{ success: false, error: 'Feld X nicht editierbar im Status Y' }`
- RLS denial: catch Supabase error code 42501, return `{ success: false, error: 'Keine Berechtigung' }`
- Concurrent modification: optimistic — last write wins, no locking needed for admin tools

UI shows errors via Toast (existing pattern).

### 4.3 Cache Invalidation

After any write:
- `invalidateQueries(['admin-events'])` — refresh admin list
- `invalidateQueries(['events'])` — refresh user-facing Fantasy tab

---

## 5. Integration into Existing Club Admin

### 5.1 AdminEventsTab (Club) Changes

- Import and integrate `RewardStructureEditor` into existing create/edit flow
- Pass `reward_structure` to `createEvent()` / `updateEvent()`
- Display current reward structure on event cards
- Same disabled-state logic per event status

### 5.2 No Breaking Changes

- Existing Club Admin tab continues to work
- `reward_structure = NULL` events use default 50/30/20
- No changes to existing Club Admin permissions

---

## 6. i18n Keys Required

~25-30 new keys in `de.json` and `tr.json`:
- Admin Events Tab: labels, filters, states, bulk actions
- RewardStructureEditor: templates, labels, validation messages
- User-facing: reward display format strings

---

## 7. Out of Scope

- Treasury account as counter-balance (stays minting, Pilot)
- Entry fee auto-pooling (pool set manually)
- Event cancellation with automatic refund (manual via admin)
- Analytics dashboard with charts/trends
- Pagination (48 events currently, not needed for Pilot)
