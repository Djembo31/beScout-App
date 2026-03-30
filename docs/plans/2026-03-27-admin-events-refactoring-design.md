# Admin Events Refactoring — Design Document

> Date: 2026-03-27 | Owner: Jarvis (CTO) | Approved by: Anil (Founder)
> Scope: Hook extraction + component extraction for AdminEventsManagementTab (1040 LOC) + AdminEventsTab (625 LOC)
> Constraint: ZERO functionality change. Same behavior, cleaner architecture.

---

## 1. PROBLEM STATEMENT

Two God-Components manage Fantasy Events for different admin scopes:

| File | LOC | useState | Scope |
|------|-----|---------|-------|
| AdminEventsManagementTab (Platform) | 1040 | 36 | Global: all clubs, filters, bulk ops, stats |
| AdminEventsTab (Club) | 625 | 17 | Club-specific: events, GW simulation, status changes |

**Root causes:**
1. 21 form fields as individual useState (Platform) — should be useReducer
2. 228 LOC modal JSX duplicated in both components (~90% identical)
3. STATUS_CONFIG duplicated (Platform hardcodes DE strings, Club uses i18n)
4. Form business logic (cents conversion, field disabling, payload building) mixed into handlers
5. No component boundaries — filters, sort, bulk, event rows all inline JSX

**Business context:**
- BeScout is SuperAdmin with synthetic owner access to all club admin pages (`/club/[slug]/admin`)
- Platform Admin Events = global overview tool (all clubs, bulk operations)
- Club Admin Events = club-specific management (used by clubs OR BeScout via impersonation)
- These serve DIFFERENT purposes — they stay separate pages, but share form logic

---

## 2. TARGET ARCHITECTURE

### 2.1 File Structure

```
src/components/admin/
├── hooks/
│   ├── useEventForm.ts              — Shared: useReducer form state, reset, populate, clone, payload builders
│   ├── useAdminEventsData.ts        — Platform: events, clubs, stats, filters, sort, selection
│   ├── useAdminEventsActions.ts     — Platform: submit, bulk, toggleSelect, toggleSort, modal control
│   ├── useClubEventsData.ts         — Club: events, GW statuses, active/past split
│   ├── useClubEventsActions.ts      — Club: create, statusChange, simulate, clone, modal control
│   └── types.ts                     — EventFormState, EventFormAction, EventStatusConfig, shared constants
├── EventFormModal.tsx               — Shared: Create/Edit form modal (~230 LOC)
├── EventStatusBadge.tsx             — Shared: STATUS_CONFIG + Chip (~15 LOC)
├── EventRow.tsx                     — Platform-only: Checkbox + Content + Edit (~60 LOC)
├── EventFilterBar.tsx               — Platform-only: 4 filter selects (~50 LOC)
├── EventSortBar.tsx                 — Platform-only: Sort buttons (~30 LOC)
├── EventBulkBar.tsx                 — Platform-only: Bulk action bar (~40 LOC)
├── AdminEventsTab.tsx               — Club Admin page (625 → ~280 LOC)
├── RewardStructureEditor.tsx        — Unchanged (190 LOC)
└── __tests__/
    ├── AdminEventsTab.test.tsx       — Existing (409 LOC, stays)
    ├── useEventForm.test.ts          — NEW
    ├── useAdminEventsData.test.ts    — NEW
    └── useAdminEventsActions.test.ts — NEW

src/app/(app)/bescout-admin/
├── AdminEventsManagementTab.tsx      — Platform Admin page (1040 → ~200 LOC)
└── AdminEventFeesSection.tsx         — Unchanged
```

### 2.2 Data Flow

```
Platform Admin:
  AdminEventsManagementTab (orchestrator)
  ├── useAdminEventsData()         → events, clubs, stats, filters, sort, selection
  ├── useEventForm()               → form state, setField, reset, populate, payload builders
  ├── useAdminEventsActions(...)    → submit, bulk, toggleSelect, modal control
  └── Render: FeesSection, StatsBar, FilterBar, SortBar, BulkBar, EventRows, EventFormModal

Club Admin:
  AdminEventsTab (orchestrator)
  ├── useClubEventsData(clubId)    → events, active/past, gwStatuses, simGw
  ├── useEventForm()               → form state, setField, reset, clone, payload builders
  ├── useClubEventsActions(...)    → create, statusChange, simulate, clone, modal control
  └── Render: GWSimCard, EventList (active/past), EventFormModal
```

---

## 3. SHARED HOOK: useEventForm

### 3.1 State (useReducer)

```typescript
type EventFormState = {
  name: string;
  clubId: string;
  type: string;                          // 'bescout' | 'club' | 'sponsor' | 'special'
  format: string;                        // '7er' | '11er'
  eventTier: 'arena' | 'club' | 'user';
  minSubTier: string;
  salaryCap: string;
  minScPerSlot: string;
  wildcardsAllowed: boolean;
  maxWildcards: string;
  gameweek: string;
  maxEntries: string;
  entryFee: string;
  prizePool: string;
  rewardStructure: RewardTier[] | null;
  startsAt: string;
  locksAt: string;
  endsAt: string;
  sponsorName: string;
  sponsorLogo: string;
  currency: EventCurrency;
};
```

### 3.2 Actions

```typescript
type EventFormAction =
  | { type: 'SET_FIELD'; field: keyof EventFormState; value: unknown }
  | { type: 'RESET' }
  | { type: 'POPULATE'; event: DbEvent }     // Edit mode (Platform)
  | { type: 'CLONE'; event: DbEvent };        // Clone mode (Club)
```

### 3.3 Return Interface

```typescript
{
  form: EventFormState;
  dispatch: React.Dispatch<EventFormAction>;
  setField: (field: keyof EventFormState, value: unknown) => void;
  reset: () => void;
  populate: (event: DbEvent) => void;        // cents→BSD, ISO→datetime-local
  clone: (event: DbEvent) => void;           // like populate, clears dates, appends " (Kopie)"
  isFieldDisabled: (field: string, editingEvent: DbEvent | null) => boolean;
  isRewardEditorDisabled: (editingEvent: DbEvent | null) => boolean;
  buildCreatePayload: (overrides: { clubId?: string; createdBy: string }) => CreateEventParams;
  buildUpdatePayload: (editingEvent: DbEvent) => Record<string, unknown>;
}
```

### 3.4 Key Design Decisions

- `POPULATE` handles cents→BSD conversion and ISO→datetime-local (currently in openEditModal)
- `CLONE` copies everything except dates/sponsor, appends " (Kopie)" to name
- `buildCreatePayload` / `buildUpdatePayload` encapsulate BSD→cents conversion + isFieldDisabled guard
- INITIAL_STATE uses Platform defaults (eventTier: 'arena', type: 'bescout')
- Club overrides defaults after reset if needed (eventTier: 'club', type: 'club')
- `toDatetimeLocal()` helper moves into this hook (currently standalone at bottom of Platform file)

---

## 4. DATA HOOKS

### 4.1 useAdminEventsData (Platform)

**State:**
- events: AdminEvent[], clubs: DbClub[], stats: { activeCount, totalParticipants, totalPool }
- loading: boolean, error: boolean
- filters: { status: string[], type: string[], clubId: string, gameweek: number | null, search: string }
- sortField: SortField, sortAsc: boolean
- selected: Set<string>, bulkStatus: string

**Effects:**
- Initial load: Promise.all([getAllEventsAdmin(), getAllClubs(), getEventAdminStats()])
- Filter-driven refetch: filtersReady guard → fetchEvents()

**Derived (useMemo):**
- sortedEvents: sorted by sortField/sortAsc
- availableBulkTransitions: union of ALLOWED_TRANSITIONS for selected events

**Returns:** All state + setters + fetchEvents for refresh

### 4.2 useClubEventsData (Club)

**Params:** clubId: string

**State:**
- events: DbEvent[], loading: boolean
- simGw: number, gwStatuses: GameweekStatus[]

**Effects:**
- Initial load: Promise.all([getEventsByClubId(clubId), getGameweekStatuses(1, 38)])
- Auto-select next unsimulated GW

**Derived:**
- activeEvents: events.filter(not ended/cancelled)
- pastEvents: events.filter(ended/cancelled)

**Returns:** All state + setters + refreshEvents

---

## 5. ACTIONS HOOKS

### 5.1 useAdminEventsActions (Platform)

**Params:** adminId, form, editingEvent, buildCreatePayload, buildUpdatePayload, resetForm, fetchEvents, selected, bulkStatus

**Handlers:**
- `handleSubmit`: Create or Edit based on editingEvent, refresh events + stats, toast
- `handleBulk`: bulkUpdateStatus(selected, bulkStatus), clear selection, refresh, toast
- `toggleSelect`: Set add/delete
- `toggleSort`: field/direction toggle
- `openCreateModal`: reset form, open modal
- `openEditModal`: populate form from event, open modal

**Local state:** saving, bulkLoading, modalOpen, editingEvent

### 5.2 useClubEventsActions (Club)

**Params:** clubId, userId, form, buildCreatePayload, cloneEvent, resetForm, refreshEvents

**Handlers:**
- `handleCreate`: createEvent(buildCreatePayload()), refresh, close modal
- `handleStatusChange`: updateEventStatus(eventId, status), mutex via changingId
- `handleSimulate`: simulateGameweek(gw), refresh gwStatuses, auto-advance
- `handleClone`: call cloneEvent(event), open modal

**Local state:** saving, changingId, simulating, modalOpen, error, success (inline alerts)

---

## 6. SHARED COMPONENTS

### 6.1 EventFormModal (~230 LOC)

```typescript
type EventFormModalProps = {
  open: boolean;
  onClose: () => void;
  form: EventFormState;
  setField: (field: keyof EventFormState, value: unknown) => void;
  onSubmit: () => void;
  saving: boolean;
  isFieldDisabled: (field: string) => boolean;
  isRewardEditorDisabled: boolean;
  title: string;
  submitLabel: string;
  clubs?: DbClub[];              // Platform only (shows club selector)
  scoutEventsEnabled: boolean;
};
```

- Contains full form UI: all fields, sponsor section, preview, RewardStructureEditor
- Platform passes `clubs` → shows Club-Selector. Club passes nothing → no selector
- `isFieldDisabled` controls edit mode (Platform) — Club passes `() => false`
- INPUT_CLS, SELECT_CLS, INTERACTIVE stay as module-level constants

### 6.2 EventStatusBadge (~15 LOC)

- Shared STATUS_CONFIG constant (colors + borders per status)
- Labels via `t()` with German fallback
- Returns `<Chip>` with status styling

### 6.3 Platform-Only Components

| Component | ~LOC | Props |
|-----------|------|-------|
| EventFilterBar | 50 | filters, setFilters, clubs, statuses |
| EventSortBar | 30 | sortField, sortAsc, onToggle, eventCount |
| EventBulkBar | 40 | selected, bulkStatus, transitions, onExecute, onClear |
| EventRow | 60 | event, isSelected, onToggle, onEdit |

---

## 7. LOC IMPACT

| File | Before | After | Delta |
|------|--------|-------|-------|
| AdminEventsManagementTab | 1040 | ~200 | -840 |
| AdminEventsTab | 625 | ~280 | -345 |
| useEventForm (shared) | 0 | ~150 | +150 |
| useAdminEventsData | 0 | ~100 | +100 |
| useAdminEventsActions | 0 | ~120 | +120 |
| useClubEventsData | 0 | ~60 | +60 |
| useClubEventsActions | 0 | ~80 | +80 |
| types.ts | 0 | ~40 | +40 |
| EventFormModal (shared) | 0 | ~230 | +230 |
| EventStatusBadge | 0 | ~15 | +15 |
| Platform sub-components | 0 | ~180 | +180 |
| **Total production** | **1665** | **~1455** | **-210 LOC, 0 duplication** |
| New tests | 0 | ~300 | +300 |

---

## 8. TESTING STRATEGY

| Hook/Component | Test Focus | ~Tests |
|----------------|-----------|--------|
| useEventForm | Reducer actions (SET_FIELD, RESET, POPULATE, CLONE), payload builders, isFieldDisabled per status | ~25 |
| useAdminEventsData | Initial load, filter refetch, sort, selection, bulk transitions | ~15 |
| useAdminEventsActions | Submit (create/edit), bulk, toggleSelect, modal control | ~15 |
| AdminEventsTab.test | Existing 16 tests stay, verify no regressions | 16 (existing) |

**Test-Writer agent gets spec only — never sees implementation.**

---

## 9. MIGRATION PATH

1. Create hooks + types (no UI change)
2. Create EventFormModal + EventStatusBadge (shared components)
3. Create Platform sub-components (FilterBar, SortBar, BulkBar, EventRow)
4. Rewire AdminEventsManagementTab to use hooks + components
5. Rewire AdminEventsTab to use shared hooks + EventFormModal
6. Write tests for hooks
7. Verify: tsc + vitest + reviewer

**Each step is independently committable and testable.**

---

## 10. OUT OF SCOPE

- No new features (SuperAdmin access already works via /club/[slug]/admin)
- No React Hook Form migration (useReducer is sufficient)
- No Zustand store (admin pages don't need cross-component state)
- No feature module structure (overkill for admin pages)
- RewardStructureEditor stays unchanged (already well-extracted, 190 LOC)
- AdminEventFeesSection stays unchanged (independent component)
