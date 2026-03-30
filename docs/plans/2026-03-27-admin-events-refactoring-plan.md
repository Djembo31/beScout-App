# Admin Events Refactoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor AdminEventsManagementTab (1040 LOC) and AdminEventsTab (625 LOC) into slim orchestrators with shared hooks and components. Zero functionality change.

**Architecture:** Shared `useEventForm` hook (useReducer) replaces 21+17 individual useState across both components. Shared `EventFormModal` eliminates ~228 LOC duplicated form JSX. Platform-only components (FilterBar, SortBar, BulkBar, EventRow) extract inline JSX. Separate data/actions hooks per domain (Platform vs Club).

**Tech Stack:** Next.js 14 App Router, TypeScript strict, React useReducer, next-intl, Supabase services

**Design Doc:** `docs/plans/2026-03-27-admin-events-refactoring-design.md` — READ THIS FIRST

---

## Pre-Flight Checklist (BEFORE ANY TASK)

Every agent MUST read these files before starting work:

```
REQUIRED READING:
1. docs/plans/2026-03-27-admin-events-refactoring-design.md (full design)
2. CLAUDE.md (project conventions)
3. .claude/rules/common-errors.md (DB columns, React patterns)
4. src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx (Platform source — 1040 LOC)
5. src/components/admin/AdminEventsTab.tsx (Club source — 625 LOC)
```

**Import paths to know:**
- Event services: `@/lib/services/events` (re-exports from `@/features/fantasy/services/events.queries.ts` + `events.mutations.ts`)
- Fixture services: `@/lib/services/fixtures`
- Club services: `@/lib/services/club`
- Player utils: `@/lib/services/players` (centsToBsd, bsdToCents)
- UI: `@/components/ui` (Card, Button, Chip, Modal), `@/lib/utils` (cn, fmtScout)
- Query hook: `@/lib/queries/events` (useScoutEventsEnabled)
- Toast: `@/components/providers/ToastProvider` (useToast)
- Auth: `@/components/providers/AuthProvider` (useUser)
- Types: `@/types` (DbEvent, DbClub, ClubWithAdmin, EventCurrency, GameweekStatus, RewardTier)

---

## WAVE 1: Foundation (no UI change, no behavior change)

### Task 1.1: Create types.ts — Shared Types and Constants

**Files:**
- Create: `src/components/admin/hooks/types.ts`

**Step 1: Create the types file**

Extract and consolidate types/constants currently duplicated or inline in both God-Components:

```typescript
import type { DbEvent, EventCurrency, RewardTier } from '@/types';

// -- Form State (replaces 21 individual useState in Platform, 17 in Club) ------

export type EventFormState = {
  name: string;
  clubId: string;
  type: string;
  format: string;
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

export type EventFormAction =
  | { type: 'SET_FIELD'; field: keyof EventFormState; value: EventFormState[keyof EventFormState] }
  | { type: 'RESET' }
  | { type: 'RESET_WITH_DEFAULTS'; defaults: Partial<EventFormState> }
  | { type: 'POPULATE'; event: DbEvent }
  | { type: 'CLONE'; event: DbEvent; suffix: string };

export const INITIAL_FORM_STATE: EventFormState = {
  name: '',
  clubId: '',
  type: 'bescout',
  format: '7er',
  eventTier: 'arena',
  minSubTier: '',
  salaryCap: '',
  minScPerSlot: '1',
  wildcardsAllowed: false,
  maxWildcards: '0',
  gameweek: '',
  maxEntries: '20',
  entryFee: '0',
  prizePool: '0',
  rewardStructure: null,
  startsAt: '',
  locksAt: '',
  endsAt: '',
  sponsorName: '',
  sponsorLogo: '',
  currency: 'tickets',
};

// -- Admin Event type (Platform extends DbEvent with club join) ----------------

export type AdminEvent = DbEvent & { clubs?: { name: string; slug: string } | null };

// -- Status Config (shared between Platform + Club) ----------------------------

export type EventStatusConfig = {
  bg: string;
  border: string;
  text: string;
};

export const STATUS_STYLES: Record<string, EventStatusConfig> = {
  upcoming:    { bg: 'bg-white/5',        border: 'border-white/10',      text: 'text-white/50' },
  registering: { bg: 'bg-blue-500/15',    border: 'border-blue-400/25',   text: 'text-blue-300' },
  'late-reg':  { bg: 'bg-purple-500/15',  border: 'border-purple-400/25', text: 'text-purple-300' },
  running:     { bg: 'bg-green-500/15',   border: 'border-green-500/25',  text: 'text-green-500' },
  scoring:     { bg: 'bg-gold/15',        border: 'border-gold/25',       text: 'text-gold' },
  ended:       { bg: 'bg-white/5',        border: 'border-white/10',      text: 'text-white/40' },
  cancelled:   { bg: 'bg-red-500/10',     border: 'border-red-500/20',    text: 'text-red-400' },
};

// -- Sort (Platform only, but type shared) ------------------------------------

export type SortField = 'created_at' | 'current_entries' | 'prize_pool';

export const SORT_LABELS: Record<SortField, string> = {
  created_at: 'Datum',
  current_entries: 'Teilnehmer',
  prize_pool: 'Preisgeld',
};

// -- CSS constants (shared) ---------------------------------------------------

export const INPUT_CLS = 'w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/25';
export const SELECT_CLS = 'w-full px-3 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-gold/40 min-h-[44px]';
export const INTERACTIVE = 'hover:bg-white/[0.05] active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/50 disabled:opacity-40 disabled:cursor-not-allowed';
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/hooks/types.ts
git commit -m "refactor(admin-events): add shared types and constants"
```

---

### Task 1.2: Create useEventForm Hook — Shared Form State

**Files:**
- Create: `src/components/admin/hooks/useEventForm.ts`
- Reference: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx:91-241` (form state + resetForm + openEditModal + isFieldDisabled)
- Reference: `src/components/admin/AdminEventsTab.tsx:45-149` (form state + resetForm + handleClone)

**Step 1: Create the hook**

Extract form logic from both God-Components into a single useReducer-based hook:

```typescript
import { useReducer, useCallback } from 'react';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { EDITABLE_FIELDS } from '@/lib/services/events';
import type { DbEvent } from '@/types';
import type { EventFormState, EventFormAction } from './types';
import { INITIAL_FORM_STATE } from './types';

// -- Helpers ------------------------------------------------------------------

function toDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

function populateFromEvent(event: DbEvent): EventFormState {
  return {
    name: event.name,
    clubId: event.club_id ?? '',
    type: event.type,
    format: event.format,
    eventTier: (event.event_tier as 'arena' | 'club' | 'user') ?? 'club',
    minSubTier: event.min_subscription_tier ?? '',
    salaryCap: event.salary_cap != null ? String(centsToBsd(event.salary_cap)) : '',
    minScPerSlot: String(event.min_sc_per_slot ?? 1),
    wildcardsAllowed: event.wildcards_allowed ?? false,
    maxWildcards: String(event.max_wildcards_per_lineup ?? 0),
    gameweek: event.gameweek != null ? String(event.gameweek) : '',
    maxEntries: event.max_entries != null ? String(event.max_entries) : '0',
    entryFee: String(centsToBsd(event.entry_fee)),
    prizePool: String(centsToBsd(event.prize_pool)),
    rewardStructure: event.reward_structure ?? null,
    startsAt: event.starts_at ? toDatetimeLocal(event.starts_at) : '',
    locksAt: event.locks_at ? toDatetimeLocal(event.locks_at) : '',
    endsAt: event.ends_at ? toDatetimeLocal(event.ends_at) : '',
    sponsorName: event.sponsor_name ?? '',
    sponsorLogo: event.sponsor_logo ?? '',
    currency: event.currency ?? 'tickets',
  };
}

// -- Reducer ------------------------------------------------------------------

function formReducer(state: EventFormState, action: EventFormAction): EventFormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET':
      return { ...INITIAL_FORM_STATE };
    case 'RESET_WITH_DEFAULTS':
      return { ...INITIAL_FORM_STATE, ...action.defaults };
    case 'POPULATE':
      return populateFromEvent(action.event);
    case 'CLONE': {
      const populated = populateFromEvent(action.event);
      return {
        ...populated,
        name: `${populated.name} (${action.suffix})`,
        startsAt: '',
        locksAt: '',
        endsAt: '',
        sponsorName: '',
        sponsorLogo: '',
      };
    }
    default:
      return state;
  }
}

// -- Hook ---------------------------------------------------------------------

export function useEventForm() {
  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM_STATE);

  const setField = useCallback(<K extends keyof EventFormState>(field: K, value: EventFormState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value: value as EventFormState[keyof EventFormState] });
  }, []);

  const reset = useCallback((defaults?: Partial<EventFormState>) => {
    if (defaults) {
      dispatch({ type: 'RESET_WITH_DEFAULTS', defaults });
    } else {
      dispatch({ type: 'RESET' });
    }
  }, []);

  const populate = useCallback((event: DbEvent) => {
    dispatch({ type: 'POPULATE', event });
  }, []);

  const clone = useCallback((event: DbEvent, suffix = 'Kopie') => {
    dispatch({ type: 'CLONE', event, suffix });
  }, []);

  const isFieldDisabled = useCallback((field: string, editingEvent: DbEvent | null): boolean => {
    if (!editingEvent) return false;
    const allowed = EDITABLE_FIELDS[editingEvent.status] ?? [];
    return !allowed.includes(field);
  }, []);

  const isRewardEditorDisabled = useCallback((editingEvent: DbEvent | null): boolean => {
    if (!editingEvent) return false;
    return !['upcoming', 'registering'].includes(editingEvent.status);
  }, []);

  const buildCreatePayload = useCallback((overrides: { clubId?: string; createdBy: string }) => {
    return {
      name: form.name,
      type: form.type,
      format: form.format,
      gameweek: parseInt(form.gameweek) || 1,
      entryFeeCents: bsdToCents(parseFloat(form.entryFee) || 0),
      prizePoolCents: bsdToCents(parseFloat(form.prizePool) || 0),
      maxEntries: parseInt(form.maxEntries) || 0,
      startsAt: new Date(form.startsAt).toISOString(),
      locksAt: new Date(form.locksAt).toISOString(),
      endsAt: new Date(form.endsAt).toISOString(),
      clubId: overrides.clubId ?? form.clubId ?? '',
      createdBy: overrides.createdBy,
      sponsorName: form.type === 'sponsor' ? form.sponsorName : undefined,
      sponsorLogo: form.type === 'sponsor' ? form.sponsorLogo : undefined,
      eventTier: form.eventTier,
      minSubscriptionTier: form.minSubTier || null,
      salaryCap: form.salaryCap ? bsdToCents(parseFloat(form.salaryCap) || 0) : null,
      minScPerSlot: parseInt(form.minScPerSlot) || 1,
      wildcardsAllowed: form.wildcardsAllowed,
      maxWildcardsPerLineup: form.wildcardsAllowed ? (parseInt(form.maxWildcards) || 0) : 0,
      rewardStructure: form.rewardStructure,
      currency: form.currency,
    };
  }, [form]);

  const buildUpdatePayload = useCallback((editingEvent: DbEvent) => {
    const payload: Record<string, unknown> = {};
    const maybePut = (key: string, value: unknown) => {
      if (!isFieldDisabled(key, editingEvent)) payload[key] = value;
    };
    maybePut('name', form.name);
    maybePut('type', form.type);
    maybePut('format', form.format);
    maybePut('gameweek', parseInt(form.gameweek) || 1);
    maybePut('entry_fee', bsdToCents(parseFloat(form.entryFee) || 0));
    maybePut('prize_pool', bsdToCents(parseFloat(form.prizePool) || 0));
    maybePut('max_entries', parseInt(form.maxEntries) || null);
    maybePut('starts_at', new Date(form.startsAt).toISOString());
    maybePut('locks_at', new Date(form.locksAt).toISOString());
    maybePut('ends_at', new Date(form.endsAt).toISOString());
    maybePut('sponsor_name', form.type === 'sponsor' ? form.sponsorName : null);
    maybePut('sponsor_logo', form.type === 'sponsor' ? form.sponsorLogo : null);
    maybePut('event_tier', form.eventTier);
    maybePut('min_subscription_tier', form.minSubTier || null);
    maybePut('salary_cap', form.salaryCap ? bsdToCents(parseFloat(form.salaryCap) || 0) : null);
    maybePut('min_sc_per_slot', parseInt(form.minScPerSlot) || 1);
    maybePut('wildcards_allowed', form.wildcardsAllowed);
    maybePut('max_wildcards_per_lineup', form.wildcardsAllowed ? (parseInt(form.maxWildcards) || 0) : 0);
    maybePut('reward_structure', form.rewardStructure);
    maybePut('currency', form.currency);
    return payload;
  }, [form, isFieldDisabled]);

  return {
    form,
    dispatch,
    setField,
    reset,
    populate,
    clone,
    isFieldDisabled,
    isRewardEditorDisabled,
    buildCreatePayload,
    buildUpdatePayload,
  };
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/hooks/useEventForm.ts
git commit -m "refactor(admin-events): extract useEventForm hook (useReducer replaces 21 useState)"
```

---

## WAVE 2: Data Hooks

### Task 2.1: Create useAdminEventsData Hook — Platform Data

**Files:**
- Create: `src/components/admin/hooks/useAdminEventsData.ts`
- Reference: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx:62-178` (state + effects + derived)

**Step 1: Create the hook**

Extract data loading, filters, sort, selection from AdminEventsManagementTab:

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllEventsAdmin, getEventAdminStats, ALLOWED_TRANSITIONS } from '@/lib/services/events';
import { getAllClubs } from '@/lib/services/club';
import type { DbClub } from '@/types';
import type { AdminEvent, SortField } from './types';

export function useAdminEventsData() {
  // ─── Data State ───────────────────────────────────────────────────────
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [clubs, setClubs] = useState<DbClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [stats, setStats] = useState<{ activeCount: number; totalParticipants: number; totalPool: number } | null>(null);

  // ─── Filter State ─────────────────────────────────────────────────────
  const [filters, setFilters] = useState<{
    status: string[];
    type: string[];
    clubId: string;
    gameweek: number | null;
    search: string;
  }>({ status: [], type: [], clubId: '', gameweek: null, search: '' });

  // ─── Sort State ───────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // ─── Selection State ──────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  // ─── Data Loading ─────────────────────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    try {
      const data = await getAllEventsAdmin({
        status: filters.status.length > 0 ? filters.status : undefined,
        type: filters.type.length > 0 ? filters.type : undefined,
        clubId: filters.clubId || undefined,
        gameweek: filters.gameweek ?? undefined,
        search: filters.search || undefined,
      });
      setEvents(data as AdminEvent[]);
      setError(false);
    } catch {
      setError(true);
    }
  }, [filters]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [eventsData, clubsData, statsData] = await Promise.all([
          getAllEventsAdmin(),
          getAllClubs(),
          getEventAdminStats(),
        ]);
        if (!cancelled) {
          setEvents(eventsData as AdminEvent[]);
          setClubs(clubsData);
          setStats(statsData);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Filter-driven refetch (skip initial load)
  const [filtersReady, setFiltersReady] = useState(false);
  useEffect(() => {
    if (!filtersReady) { setFiltersReady(true); return; }
    fetchEvents();
  }, [filters, fetchEvents, filtersReady]);

  // ─── Derived ──────────────────────────────────────────────────────────
  const sortedEvents = useMemo(() => {
    const sorted = [...events].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'created_at') {
        cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortField === 'current_entries') {
        cmp = (a.current_entries ?? 0) - (b.current_entries ?? 0);
      } else if (sortField === 'prize_pool') {
        cmp = (a.prize_pool ?? 0) - (b.prize_pool ?? 0);
      }
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [events, sortField, sortAsc]);

  const availableBulkTransitions = useMemo(() => {
    if (selected.size === 0) return [];
    const transitions = new Set<string>();
    const selectedArr = Array.from(selected);
    for (let i = 0; i < selectedArr.length; i++) {
      const ev = events.find(e => e.id === selectedArr[i]);
      if (ev) {
        const allowed = ALLOWED_TRANSITIONS[ev.status] ?? [];
        for (let j = 0; j < allowed.length; j++) transitions.add(allowed[j]);
      }
    }
    return Array.from(transitions);
  }, [selected, events]);

  // ─── Refresh helpers ──────────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    const [refreshed, newStats] = await Promise.all([
      getAllEventsAdmin(),
      getEventAdminStats(),
    ]);
    setEvents(refreshed as AdminEvent[]);
    setStats(newStats);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setBulkStatus('');
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortAsc(a => !a);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  }, [sortField]);

  return {
    // Data
    events, sortedEvents, clubs, stats, loading, error,
    // Filters
    filters, setFilters,
    // Sort
    sortField, sortAsc, toggleSort,
    // Selection
    selected, bulkStatus, setBulkStatus, toggleSelect, clearSelection,
    availableBulkTransitions,
    // Refresh
    fetchEvents, refreshAll,
  };
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/hooks/useAdminEventsData.ts
git commit -m "refactor(admin-events): extract useAdminEventsData hook (Platform data + filters + sort)"
```

---

### Task 2.2: Create useClubEventsData Hook — Club Data

**Files:**
- Create: `src/components/admin/hooks/useClubEventsData.ts`
- Reference: `src/components/admin/AdminEventsTab.tsx:32-84` (state + effect)

**Step 1: Create the hook**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { getEventsByClubId } from '@/lib/services/events';
import { getGameweekStatuses } from '@/lib/services/fixtures';
import type { DbEvent, GameweekStatus } from '@/types';

export function useClubEventsData(clubId: string) {
  // ─── Data State ───────────────────────────────────────────────────────
  const [events, setEvents] = useState<DbEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // ─── GW Simulation State ──────────────────────────────────────────────
  const [simGw, setSimGw] = useState(1);
  const [gwStatuses, setGwStatuses] = useState<GameweekStatus[]>([]);

  // ─── Initial Load ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [data, statuses] = await Promise.all([
          getEventsByClubId(clubId),
          getGameweekStatuses(1, 38),
        ]);
        if (!cancelled) {
          setEvents(data);
          setGwStatuses(statuses);
          const nextUnsim = statuses.find(s => !s.is_complete);
          if (nextUnsim) setSimGw(nextUnsim.gameweek);
        }
      } catch (err) {
        console.error('[useClubEventsData] Failed to load:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [clubId]);

  // ─── Derived ──────────────────────────────────────────────────────────
  const activeEvents = events.filter(e => !['ended', 'cancelled'].includes(e.status));
  const pastEvents = events.filter(e => ['ended', 'cancelled'].includes(e.status));

  // ─── Refresh ──────────────────────────────────────────────────────────
  const refreshEvents = useCallback(async () => {
    const data = await getEventsByClubId(clubId);
    setEvents(data);
  }, [clubId]);

  const refreshGwStatuses = useCallback(async () => {
    const statuses = await getGameweekStatuses(1, 38);
    setGwStatuses(statuses);
    const nextUnsim = statuses.find(s => !s.is_complete);
    if (nextUnsim) setSimGw(nextUnsim.gameweek);
  }, []);

  return {
    events, activeEvents, pastEvents, loading,
    simGw, setSimGw, gwStatuses,
    refreshEvents, refreshGwStatuses,
  };
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/hooks/useClubEventsData.ts
git commit -m "refactor(admin-events): extract useClubEventsData hook (Club data + GW statuses)"
```

---

## WAVE 3: Actions Hooks

### Task 3.1: Create useAdminEventsActions Hook — Platform Actions

**Files:**
- Create: `src/components/admin/hooks/useAdminEventsActions.ts`
- Reference: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx:249-366` (handleSubmit + handleBulk)

**Step 1: Create the hook**

```typescript
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createEvent, updateEvent, bulkUpdateStatus } from '@/lib/services/events';
import { useToast } from '@/components/providers/ToastProvider';
import type { DbEvent } from '@/types';
import type { AdminEvent } from './types';
import type { useEventForm } from './useEventForm';

type EventFormReturn = ReturnType<typeof useEventForm>;

interface UseAdminEventsActionsParams {
  adminId: string;
  form: EventFormReturn;
  selected: Set<string>;
  bulkStatus: string;
  clearSelection: () => void;
  refreshAll: () => Promise<void>;
}

export function useAdminEventsActions({
  adminId,
  form,
  selected,
  bulkStatus,
  clearSelection,
  refreshAll,
}: UseAdminEventsActionsParams) {
  const t = useTranslations('bescoutAdmin');
  const { addToast } = useToast();

  // ─── Modal State ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // ─── Modal Control ────────────────────────────────────────────────────
  const openCreateModal = useCallback(() => {
    form.reset();
    setEditingEvent(null);
    setModalOpen(true);
  }, [form]);

  const openEditModal = useCallback((ev: AdminEvent) => {
    setEditingEvent(ev);
    form.populate(ev);
    setModalOpen(true);
  }, [form]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingEvent(null);
    form.reset();
  }, [form]);

  // ─── Submit (Create or Edit) ──────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!form.form.name || !form.form.startsAt || !form.form.locksAt || !form.form.endsAt) return;
    setSaving(true);
    try {
      if (editingEvent) {
        const payload = form.buildUpdatePayload(editingEvent);
        const result = await updateEvent(editingEvent.id, payload);
        if (!result.success) {
          addToast(result.error ?? t('eventsSaveError'), 'error');
          return;
        }
        addToast(t('eventsUpdated'), 'success');
      } else {
        const payload = form.buildCreatePayload({ createdBy: adminId });
        const result = await createEvent(payload);
        if (!result.success) {
          addToast(result.error ?? t('eventsCreateError'), 'error');
          return;
        }
        addToast(t('eventsCreated'), 'success');
      }
      await refreshAll();
      closeModal();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('error'), 'error');
    } finally {
      setSaving(false);
    }
  }, [form, editingEvent, adminId, refreshAll, closeModal, addToast, t]);

  // ─── Bulk Actions ─────────────────────────────────────────────────────
  const handleBulk = useCallback(async () => {
    if (selected.size === 0 || !bulkStatus) return;
    setBulkLoading(true);
    try {
      const result = await bulkUpdateStatus(Array.from(selected), bulkStatus);
      const ok = result.results.filter((r: { ok: boolean }) => r.ok).length;
      const fail = result.results.filter((r: { ok: boolean }) => !r.ok).length;
      if (fail > 0) {
        addToast(t('eventsBulkOk', { ok, fail }), 'error');
      } else {
        addToast(t('eventsBulkSuccess', { ok }), 'success');
      }
      clearSelection();
      await refreshAll();
    } catch (err) {
      addToast(err instanceof Error ? err.message : t('error'), 'error');
    } finally {
      setBulkLoading(false);
    }
  }, [selected, bulkStatus, clearSelection, refreshAll, addToast, t]);

  return {
    // Modal
    modalOpen, setModalOpen, editingEvent,
    openCreateModal, openEditModal, closeModal,
    // Submit
    handleSubmit, saving,
    // Bulk
    handleBulk, bulkLoading,
  };
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/hooks/useAdminEventsActions.ts
git commit -m "refactor(admin-events): extract useAdminEventsActions hook (submit + bulk ops)"
```

---

### Task 3.2: Create useClubEventsActions Hook — Club Actions

**Files:**
- Create: `src/components/admin/hooks/useClubEventsActions.ts`
- Reference: `src/components/admin/AdminEventsTab.tsx:86-213` (simulate + create + statusChange + clone)

**Step 1: Create the hook**

```typescript
import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { createEvent, updateEventStatus } from '@/lib/services/events';
import { simulateGameweek } from '@/lib/services/fixtures';
import type { DbEvent } from '@/types';
import type { useEventForm } from './useEventForm';

type EventFormReturn = ReturnType<typeof useEventForm>;

interface UseClubEventsActionsParams {
  clubId: string;
  userId: string | undefined;
  form: EventFormReturn;
  refreshEvents: () => Promise<void>;
  refreshGwStatuses: () => Promise<void>;
}

export function useClubEventsActions({
  clubId,
  userId,
  form,
  refreshEvents,
  refreshGwStatuses,
}: UseClubEventsActionsParams) {
  const t = useTranslations('admin');

  // ─── Local State ──────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─── Create ───────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    if (!userId || !form.form.name || !form.form.startsAt || !form.form.locksAt || !form.form.endsAt) return;
    setSaving(true);
    setError(null);
    try {
      const payload = form.buildCreatePayload({ clubId, createdBy: userId });
      const result = await createEvent(payload);
      if (!result.success) {
        setError(result.error || t('eventCreateError'));
      } else {
        setSuccess(t('eventCreateSuccess'));
        await refreshEvents();
        form.reset({ type: 'club', eventTier: 'club' });
        setModalOpen(false);
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setSaving(false);
    }
  }, [userId, form, clubId, refreshEvents, t]);

  // ─── Status Change ────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (eventId: string, newStatus: string) => {
    if (changingId) return;
    setChangingId(eventId);
    setError(null);
    try {
      const result = await updateEventStatus(eventId, newStatus);
      if (!result.success) {
        setError(result.error || t('statusChangeError'));
      } else {
        await refreshEvents();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setChangingId(null);
    }
  }, [changingId, refreshEvents, t]);

  // ─── Simulate ─────────────────────────────────────────────────────────
  const handleSimulate = useCallback(async (gw: number) => {
    setSimulating(true);
    setError(null);
    try {
      const result = await simulateGameweek(gw);
      if (!result.success) {
        setError(result.error || t('simulationFailed'));
      } else {
        setSuccess(t('simulationResult', {
          gw,
          fixtures: result.fixtures_simulated ?? 0,
          stats: result.player_stats_created ?? 0,
        }));
        setTimeout(() => setSuccess(null), 5000);
        await refreshGwStatuses();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setSimulating(false);
    }
  }, [refreshGwStatuses, t]);

  // ─── Clone ────────────────────────────────────────────────────────────
  const handleClone = useCallback((event: DbEvent) => {
    form.clone(event, t('clone'));
    setModalOpen(true);
  }, [form, t]);

  return {
    // Modal
    modalOpen, setModalOpen,
    // Create
    handleCreate, saving,
    // Status
    handleStatusChange, changingId,
    // Simulate
    handleSimulate, simulating,
    // Clone
    handleClone,
    // Feedback
    error, setError, success,
  };
}
```

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/hooks/useClubEventsActions.ts
git commit -m "refactor(admin-events): extract useClubEventsActions hook (create + status + simulate + clone)"
```

---

## WAVE 4: Shared Components

### Task 4.1: Create EventStatusBadge Component

**Files:**
- Create: `src/components/admin/EventStatusBadge.tsx`

**Step 1: Create the component**

```typescript
'use client';

import { Chip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { STATUS_STYLES } from './hooks/types';

interface EventStatusBadgeProps {
  status: string;
  label: string;
  className?: string;
}

export function EventStatusBadge({ status, label, className }: EventStatusBadgeProps) {
  const sc = STATUS_STYLES[status] ?? STATUS_STYLES.ended;
  return (
    <Chip className={cn(sc.bg, sc.text, sc.border, 'border flex-shrink-0', className)}>
      {label}
    </Chip>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/admin/EventStatusBadge.tsx
git commit -m "refactor(admin-events): extract EventStatusBadge component"
```

---

### Task 4.2: Create EventFormModal Component — Shared Form UI

**Files:**
- Create: `src/components/admin/EventFormModal.tsx`
- Reference: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx:672-1026` (Platform modal)
- Reference: `src/components/admin/AdminEventsTab.tsx:394-622` (Club modal)

**Step 1: Create the component**

Extract the form modal UI. This is the largest new file (~230 LOC). Key differences from the two sources:

- Platform has: Club selector, min SC per slot, wildcards toggle, edit-mode field disabling
- Club has: No club selector, no SC/wildcards fields, no edit-mode

The shared component supports all fields, conditionally rendered:

```typescript
'use client';

import { Plus, Loader2 } from 'lucide-react';
import { Button, Modal } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { bsdToCents } from '@/lib/services/players';
import RewardStructureEditor from './RewardStructureEditor';
import type { DbClub, EventCurrency } from '@/types';
import type { EventFormState } from './hooks/types';
import { INPUT_CLS, SELECT_CLS } from './hooks/types';

interface EventFormModalProps {
  open: boolean;
  onClose: () => void;
  form: EventFormState;
  setField: <K extends keyof EventFormState>(field: K, value: EventFormState[K]) => void;
  onSubmit: () => void;
  saving: boolean;
  isFieldDisabled: (field: string) => boolean;
  isRewardEditorDisabled: boolean;
  title: string;
  submitLabel: string;
  // Optional — Platform only
  clubs?: DbClub[];
  // Feature flag
  scoutEventsEnabled: boolean;
  // i18n labels (passed from consumer, not hardcoded)
  labels: EventFormLabels;
}

export interface EventFormLabels {
  name: string;
  namePlaceholder: string;
  club?: string;
  clubGlobal?: string;
  type: string;
  format: string;
  format7: string;
  format11: string;
  eventTier: string;
  tierArena: string;
  tierClub: string;
  tierUser?: string;
  arenaWarning?: string;
  minSub: string;
  minSubNone: string;
  minSubBronze: string;
  minSubSilber: string;
  minSubGold: string;
  salaryCap: string;
  salaryCapPlaceholder: string;
  salaryCapHint?: string;
  minScPerSlot?: string;
  wildcardsAllowed?: string;
  maxWildcards?: string;
  gameweek: string;
  gameweekPlaceholder: string;
  maxEntries: string;
  entryFee: string;
  prizePool: string;
  currency: string;
  currencyTickets: string;
  startTime: string;
  lockTime: string;
  endTime: string;
  sponsorSection: string;
  sponsorName: string;
  sponsorNamePlaceholder: string;
  sponsorLogo: string;
  feePreview: string;
  prizePreview: string;
  free: string;
}
```

**IMPORTANT:** The full JSX of the modal body is extracted from the existing Platform modal (lines 679-1025 of AdminEventsManagementTab.tsx). Every form field maps to `form.[field]` via `setField`, and `isFieldDisabled` controls the `disabled` prop per field.

The implementation follows the EXACT same field layout as the existing Platform modal. Club Admin only sees a subset because:
- `clubs` prop is not passed → Club selector hidden
- `labels.minScPerSlot` is optional → section hidden if not provided
- `labels.wildcardsAllowed` is optional → section hidden if not provided
- `labels.tierUser` is optional → User option hidden from Club Admin

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/EventFormModal.tsx
git commit -m "refactor(admin-events): extract shared EventFormModal component"
```

---

## WAVE 5: Platform-Only Components

### Task 5.1: Create EventFilterBar, EventSortBar, EventBulkBar, EventRow

**Files:**
- Create: `src/components/admin/EventFilterBar.tsx` (~50 LOC)
- Create: `src/components/admin/EventSortBar.tsx` (~30 LOC)
- Create: `src/components/admin/EventBulkBar.tsx` (~40 LOC)
- Create: `src/components/admin/EventRow.tsx` (~60 LOC)

**Step 1: Create all four components**

Each component extracts inline JSX from AdminEventsManagementTab:

- **EventFilterBar** — lines 482-531: Status, Type, Club, Gameweek selects
- **EventSortBar** — lines 533-553: Sort buttons with active state + event count
- **EventBulkBar** — lines 555-591: Selection count + status transition select + execute button + clear
- **EventRow** — lines 609-669: Checkbox + name/meta + StatusBadge + edit button

Props are minimal — each component receives only what it renders. No business logic, just presentational.

**Step 2: Verify**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/admin/Event{FilterBar,SortBar,BulkBar,Row}.tsx
git commit -m "refactor(admin-events): extract Platform-only sub-components (FilterBar, SortBar, BulkBar, EventRow)"
```

---

## WAVE 6: Rewire Pages (the actual refactoring)

### Task 6.1: Rewire AdminEventsManagementTab — Platform Admin (1040 → ~200 LOC)

**Files:**
- Modify: `src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx`

**Step 1: Rewrite as slim orchestrator**

Replace the entire component with hook + component composition:

```typescript
'use client';

import { Loader2, Plus, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd, bsdToCents } from '@/lib/services/players';
import { useScoutEventsEnabled } from '@/lib/queries/events';
import { AdminEventFeesSection } from './AdminEventFeesSection';
// Hooks
import { useAdminEventsData } from '@/components/admin/hooks/useAdminEventsData';
import { useAdminEventsActions } from '@/components/admin/hooks/useAdminEventsActions';
import { useEventForm } from '@/components/admin/hooks/useEventForm';
import type { SortField } from '@/components/admin/hooks/types';
// Components
import { EventFormModal } from '@/components/admin/EventFormModal';
import { EventFilterBar } from '@/components/admin/EventFilterBar';
import { EventSortBar } from '@/components/admin/EventSortBar';
import { EventBulkBar } from '@/components/admin/EventBulkBar';
import { EventRow } from '@/components/admin/EventRow';

export function AdminEventsManagementTab({ adminId }: { adminId: string }) {
  const t = useTranslations('bescoutAdmin');
  const scoutEventsEnabled = useScoutEventsEnabled();

  // ─── Hooks ────────────────────────────────────────────────────────────
  const data = useAdminEventsData();
  const form = useEventForm();
  const actions = useAdminEventsActions({
    adminId,
    form,
    selected: data.selected,
    bulkStatus: data.bulkStatus,
    clearSelection: data.clearSelection,
    refreshAll: data.refreshAll,
  });

  // ─── Guards ───────────────────────────────────────────────────────────
  if (data.loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
      </div>
    );
  }

  if (data.error && data.events.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-white/40 mb-3">{t('eventsError')}</div>
        <Button variant="outline" onClick={() => data.fetchEvents()} aria-label={t('eventsRetry')}>
          {t('eventsRetry')}
        </Button>
      </Card>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <AdminEventFeesSection adminId={adminId} />
      {/* Stats + Toolbar + Filters + Sort + Bulk + List + Modal */}
      {/* Each section delegates to extracted components */}
      {/* ... */}
    </div>
  );
}
```

**CRITICAL:** The render section wires each extracted component to the correct hook returns. Every prop that previously came from inline state now comes from `data.*`, `form.*`, or `actions.*`.

**Step 2: Verify no behavior change**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/app/(app)/bescout-admin/AdminEventsManagementTab.tsx
git commit -m "refactor(admin-events): rewire AdminEventsManagementTab as slim orchestrator (1040→~200 LOC)"
```

---

### Task 6.2: Rewire AdminEventsTab — Club Admin (625 → ~280 LOC)

**Files:**
- Modify: `src/components/admin/AdminEventsTab.tsx`

**Step 1: Rewrite as slim orchestrator**

Replace useState + handlers with hooks. Keep GW Simulation section and event card rendering inline (Club-specific, not worth extracting).

```typescript
'use client';

import React from 'react';
import { Plus, Calendar, Play, Square, XCircle, Loader2, Zap, CheckCircle2, Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useUser } from '@/components/providers/AuthProvider';
import { useScoutEventsEnabled } from '@/lib/queries/events';
import type { ClubWithAdmin } from '@/types';
// Hooks
import { useClubEventsData } from './hooks/useClubEventsData';
import { useClubEventsActions } from './hooks/useClubEventsActions';
import { useEventForm } from './hooks/useEventForm';
// Components
import { EventFormModal } from './EventFormModal';
import { EventStatusBadge } from './EventStatusBadge';

export default function AdminEventsTab({ club }: { club: ClubWithAdmin }) {
  const t = useTranslations('admin');
  const { user } = useUser();
  const scoutEventsEnabled = useScoutEventsEnabled();

  // ─── Hooks ────────────────────────────────────────────────────────────
  const data = useClubEventsData(club.id);
  const form = useEventForm();
  const actions = useClubEventsActions({
    clubId: club.id,
    userId: user?.id,
    form,
    refreshEvents: data.refreshEvents,
    refreshGwStatuses: data.refreshGwStatuses,
  });

  // ─── Guards ───────────────────────────────────────────────────────────
  if (data.loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <Card key={i} className="h-20 animate-pulse" />)}</div>;

  // ─── Render ───────────────────────────────────────────────────────────
  // GW Simulation Card + Event lists + EventFormModal
  // Event cards stay inline (Club-specific layout with status-change buttons)
  return (
    <div className="space-y-6">
      {/* Alerts, GW Sim, Header, Active Events, Past Events, Modal */}
    </div>
  );
}
```

**Step 2: Run existing tests**

```bash
npx vitest run src/components/admin/__tests__/AdminEventsTab.test.tsx
```

All 16 existing tests MUST pass — this is a behavior-preserving refactoring.

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/components/admin/AdminEventsTab.tsx
git commit -m "refactor(admin-events): rewire AdminEventsTab as slim orchestrator (625→~280 LOC)"
```

---

## WAVE 7: Tests

### Task 7.1: Write useEventForm Tests

**Files:**
- Create: `src/components/admin/__tests__/useEventForm.test.ts`

**Test cases (~25 tests):**

1. **Initial state:** form matches INITIAL_FORM_STATE
2. **SET_FIELD:** each field type updates correctly
3. **RESET:** returns to initial state
4. **RESET_WITH_DEFAULTS:** merges defaults over initial state
5. **POPULATE:** converts DbEvent to form state (cents→BSD, ISO→datetime-local)
6. **POPULATE edge cases:** null fields default correctly
7. **CLONE:** copies event, clears dates, appends suffix to name
8. **isFieldDisabled:** returns false when no editingEvent
9. **isFieldDisabled:** returns false for 'name' when status='upcoming'
10. **isFieldDisabled:** returns true for 'currency' when status='registering'
11. **isFieldDisabled:** returns true for all fields when status='ended'
12. **isRewardEditorDisabled:** false for 'upcoming', true for 'running'
13. **buildCreatePayload:** converts BSD to cents, builds correct shape
14. **buildCreatePayload:** omits sponsor fields when type !== 'sponsor'
15. **buildUpdatePayload:** only includes editable fields for given status
16. **buildUpdatePayload:** wildcards_allowed=false sets max to 0

**Step 1: Write tests (spec-driven, test-writer agent gets NO implementation)**

```bash
npx vitest run src/components/admin/__tests__/useEventForm.test.ts
```

**Step 2: Commit**

```bash
git add src/components/admin/__tests__/useEventForm.test.ts
git commit -m "test(admin-events): add useEventForm hook tests (~25 tests)"
```

---

### Task 7.2: Write useAdminEventsData Tests

**Files:**
- Create: `src/components/admin/__tests__/useAdminEventsData.test.ts`

**Test cases (~15 tests):**

1. **Initial load:** calls getAllEventsAdmin + getAllClubs + getEventAdminStats in parallel
2. **Loading state:** loading=true during fetch, false after
3. **Error state:** error=true when fetch fails, events empty
4. **Filter refetch:** changing filters triggers fetchEvents
5. **Filter skip initial:** first render does NOT trigger filter refetch
6. **Sort default:** created_at descending
7. **toggleSort same field:** toggles direction
8. **toggleSort different field:** switches field, resets to desc
9. **sortedEvents:** correctly sorted by each field
10. **toggleSelect:** adds/removes from Set
11. **clearSelection:** empties selected + bulkStatus
12. **availableBulkTransitions:** empty when no selection
13. **availableBulkTransitions:** union of allowed transitions for selected events
14. **refreshAll:** calls getAllEventsAdmin + getEventAdminStats
15. **Cancellation:** cancelled=true prevents state updates

**Step 1: Write tests, Step 2: Run, Step 3: Commit**

```bash
git commit -m "test(admin-events): add useAdminEventsData hook tests (~15 tests)"
```

---

### Task 7.3: Write useAdminEventsActions Tests

**Files:**
- Create: `src/components/admin/__tests__/useAdminEventsActions.test.ts`

**Test cases (~15 tests):**

1. **openCreateModal:** resets form, sets modalOpen=true, editingEvent=null
2. **openEditModal:** populates form, sets editingEvent, opens modal
3. **closeModal:** sets modalOpen=false, resets form
4. **handleSubmit create:** calls createEvent, shows success toast, refreshes, closes modal
5. **handleSubmit create error:** shows error toast, does not close modal
6. **handleSubmit edit:** calls updateEvent with editable payload, shows success toast
7. **handleSubmit edit error:** shows error toast
8. **handleSubmit validation:** returns early if name/dates missing
9. **saving state:** true during submit, false after
10. **handleBulk:** calls bulkUpdateStatus, shows toast, clears selection, refreshes
11. **handleBulk error:** shows error toast
12. **handleBulk skip:** returns early if no selection or no status
13. **bulkLoading state:** true during bulk, false after
14. **handleBulk mixed results:** shows error toast with ok/fail counts
15. **handleSubmit exception:** catches thrown error, shows message in toast

**Step 1: Write tests, Step 2: Run, Step 3: Commit**

```bash
git commit -m "test(admin-events): add useAdminEventsActions hook tests (~15 tests)"
```

---

## WAVE 8: Verification

### Task 8.1: Full Verification

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: 0 errors

**Step 2: Run ALL tests**

```bash
npx vitest run
```

Expected: All new tests pass, all existing AdminEventsTab tests pass

**Step 3: Dispatch Reviewer Agent**

Reviewer reads all changed files, verifies:
- No behavior change
- No missing imports
- No prop type mismatches
- STATUS_CONFIG labels match existing behavior
- cents/BSD conversion preserved exactly
- i18n keys unchanged

**Step 4: Final commit and cleanup**

```bash
git add -A
git status
```

Verify no unintended files. Final cleanup commit if needed.

---

## Summary

| Wave | Tasks | Key Output |
|------|-------|-----------|
| 1 | 1.1, 1.2 | types.ts + useEventForm (foundation) |
| 2 | 2.1, 2.2 | useAdminEventsData + useClubEventsData |
| 3 | 3.1, 3.2 | useAdminEventsActions + useClubEventsActions |
| 4 | 4.1, 4.2 | EventStatusBadge + EventFormModal (shared) |
| 5 | 5.1 | FilterBar + SortBar + BulkBar + EventRow (Platform) |
| 6 | 6.1, 6.2 | Rewire both pages as slim orchestrators |
| 7 | 7.1-7.3 | ~55 hook tests |
| 8 | 8.1 | tsc + vitest + reviewer verification |

**Total: 12 tasks across 8 waves. Each wave is independently committable.**
