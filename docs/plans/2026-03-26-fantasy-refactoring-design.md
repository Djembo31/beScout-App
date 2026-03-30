# Fantasy Module Refactoring — Design Document

> Date: 2026-03-26 | Owner: Jarvis (CTO) | Approved by: Anil (Founder)
> Scope: Full-stack radical refactoring — Components + Services + Queries + Types + State
> Constraint: ZERO functionality change. Same behavior, cleaner architecture.

---

## 1. PROBLEM STATEMENT

The Fantasy module (~11.840 LOC, 68 TSX + 10 TS files) has accumulated structural debt:

| File | LOC | Problem |
|------|-----|---------|
| FantasyContent.tsx | 866 | 15+ useState, 7+ useEffect, data mapping + handlers + JSX |
| EventDetailModal.tsx | 835 | 15+ useState, 5+ useEffect, manual fetching, prop passthrough |
| LineupPanel.tsx | 1011 | 30+ props, mixes PitchView + PlayerPicker + Formation + Synergy + Presets |
| events.ts (service) | 609 | Queries + Mutations + Admin + Helpers mixed |
| scoring.ts (service) | ~400 | User queries + Admin scoring mixed |

**Root causes:**
1. No state management layer — everything flows as props through 3-4 levels
2. Business logic lives in components — handlers in FantasyContent do data mapping, cache invalidation, error handling
3. Services are not split by responsibility — reads and writes mixed
4. Manual useEffect data fetching in EventDetailModal instead of React Query hooks
5. Same cache invalidation code copy-pasted in 3 handlers (join/leave/submit)

---

## 2. TARGET ARCHITECTURE

### 2.1 Directory Structure

```
src/features/fantasy/
├── store/                          # Zustand Stores (State)
│   ├── fantasyStore.ts             # Page-level: tab, gameweek, selectedEvent, modals
│   └── lineupStore.ts              # Lineup editing: players, formation, captain, wildcards, picker
│
├── hooks/                          # Business Logic (orchestration)
│   ├── useGameweek.ts              # GW navigation, sync, bfcache, gwStatus, fixtureInfo
│   ├── useFantasyEvents.ts         # Events query + dbEventToFantasyEvent mapping
│   ├── useFantasyHoldings.ts       # Holdings + locks + usage enrichment
│   ├── useEventActions.ts          # Join/leave/submit mutations + cache invalidation + toasts
│   ├── useFixtureDeadlines.ts      # Per-fixture locking map + polling + helpers
│   ├── useScoredEvents.ts          # Summary modal logic + lineupMap fetching
│   └── useLineupBuilder.ts         # Lineup editing: derived state, DB hydration, presets
│
├── services/                       # API Layer (Supabase calls)
│   ├── events.queries.ts           # getEvents, getUserJoinedEventIds, getEventsByClubId(s), getEventEntry, isClubEvent
│   ├── events.mutations.ts         # lockEventEntry, unlockEventEntry, cancelEventEntries
│   ├── lineups.queries.ts          # getLineup, getOwnedPlayerIds, getParticipants, getParticipantCount, getPlayerEventUsage
│   ├── lineups.mutations.ts        # submitLineup
│   ├── scoring.queries.ts          # getEventLeaderboard, getProgressiveScores, getPlayerGameweekScores
│   ├── scoring.admin.ts            # scoreEvent, resetEvent, importProgressiveStats, finalizeGameweek, simulateGameweekFlow
│   ├── fixtures.ts                 # getFixturesByGameweek, getFixtureDeadlinesByGameweek, getGameweekStatuses (all reads)
│   ├── chips.ts                    # activateChip, deactivateChip, getEventChips, getSeasonChipUsage
│   ├── wildcards.ts                # getWildcardBalance, earnWildcards, spendWildcards, getWildcardHistory
│   ├── predictions.queries.ts      # getPredictions, getResolvedPredictions, getFixturesForPrediction, getPlayersForFixture
│   ├── predictions.mutations.ts    # createPrediction, resolvePredictions
│   └── leagues.ts                  # getFantasyLeagues, createFantasyLeague, getLeagueMembers
│
├── queries/                        # React Query Hooks
│   ├── keys.ts                     # Re-exports from global qk.events.*, qk.predictions.*, qk.chips.*
│   ├── events.ts                   # useEvents, useJoinedEventIds, usePlayerEventUsage, useHoldingLocks, etc.
│   ├── lineups.ts                  # useLineup (NEW), useLineupScores (NEW — replaces manual useEffect)
│   ├── scoring.ts                  # useLeaderboard (NEW), useProgressiveScores (NEW — replaces manual useEffect)
│   ├── fixtures.ts                 # useFixtureDeadlines (NEW — replaces manual useEffect + setState)
│   └── invalidation.ts            # invalidateAfterJoin, invalidateAfterLeave, invalidateAfterLineupSave, invalidateAfterScoring
│
├── mappers/                        # Data Transformation (pure functions, no side effects)
│   ├── eventMapper.ts              # deriveEventStatus, dbEventToFantasyEvent
│   └── holdingMapper.ts            # dbHoldingToUserDpcHolding
│
├── components/                     # UI Components (pure rendering)
│   ├── FantasyContent.tsx          # Thin orchestrator (~120 LOC)
│   ├── FantasyHeader.tsx           # Title + active count + create button
│   ├── FantasyNav.tsx              # Sticky GW selector + tab bar
│   ├── FantasySkeleton.tsx         # Loading state
│   ├── FantasyError.tsx            # Error state
│   │
│   ├── tabs/                       # Main 4 tabs (mostly moved, not rewritten)
│   │   ├── SpieltagTab.tsx         # Fixtures tab (moved from components/fantasy/)
│   │   ├── EventsTab.tsx           # Events browser (moved)
│   │   ├── MitmachenTab.tsx        # Joined events (moved)
│   │   └── ErgebnisseTab.tsx       # Results (moved)
│   │
│   ├── event-detail/               # Event Detail Modal
│   │   ├── EventDetailModal.tsx    # Thin shell (~200 LOC, reads from store + hooks)
│   │   ├── EventDetailHeader.tsx   # Status badges + meta
│   │   ├── EventDetailTabs.tsx     # Tab navigation
│   │   ├── EventDetailFooter.tsx   # Join/Leave/Save/Status buttons
│   │   ├── JoinConfirmDialog.tsx   # Join confirmation overlay
│   │   ├── OverviewPanel.tsx       # Event overview (moved)
│   │   ├── LeaderboardPanel.tsx    # Ranking display (moved, uses useLeaderboard hook)
│   │   └── EventCommunityTab.tsx   # Community/discussion (moved)
│   │
│   ├── lineup/                     # Lineup Builder (split from 1011 LOC LineupPanel)
│   │   ├── LineupBuilder.tsx       # Orchestrator (~250 LOC) — PitchView + banners + score breakdown
│   │   ├── PitchView.tsx           # Visual pitch with SVG markings + slot circles (~250 LOC)
│   │   ├── PlayerPicker.tsx        # Full-screen picker modal with search/sort/filter (~250 LOC)
│   │   ├── FormationSelector.tsx   # Formation dropdown + preset management (~120 LOC)
│   │   ├── SynergyPreview.tsx      # Synergy bonus + ownership bonus banners (~80 LOC)
│   │   └── ScoreBreakdown.tsx      # Post-scoring/live player score list (~100 LOC)
│   │
│   ├── spieltag/                   # Fixture sub-components (moved as-is)
│   ├── events/                     # Event browsing sub-components (moved as-is)
│   ├── ergebnisse/                 # Results sub-components (moved as-is)
│   │
│   └── shared/                     # Shared sub-components
│       ├── FantasyPlayerRow.tsx     # Player row component (moved)
│       ├── PickerSortFilter.tsx    # Sort/filter controls (moved)
│       ├── FDRBadge.tsx            # Fixture difficulty rating (moved)
│       ├── FormBars.tsx            # Form score bars (moved)
│       ├── ScoringRules.tsx        # Collapsible scoring rules (moved)
│       ├── CreateEventModal.tsx    # Event creation (moved)
│       ├── EventSummaryModal.tsx   # Post-scoring summary (moved)
│       ├── CreatePredictionModal.tsx # Prediction form (moved)
│       ├── PredictionCard.tsx      # Prediction display (moved)
│       ├── PredictionsTab.tsx      # Predictions listing (moved)
│       ├── LeaguesSection.tsx      # Fantasy leagues (moved)
│       ├── GameweekTab.tsx         # Gameweek overview (moved)
│       ├── DashboardTab.tsx        # Dashboard (moved)
│       └── HistoryTab.tsx          # History (moved)
│
├── types.ts                        # Fantasy-specific types (moved from components/fantasy/types.ts)
├── constants.ts                    # Formations, slots, presets (moved from components/fantasy/constants.ts)
├── helpers.ts                      # Style helpers (moved from components/fantasy/helpers.ts)
└── index.ts                        # Public API barrel export
```

### 2.2 What stays in old locations (backward compat)

```
src/lib/services/events.ts          → Re-exports from features/fantasy/services/events.queries + events.mutations
src/lib/services/lineups.ts         → Re-exports from features/fantasy/services/lineups.*
src/lib/services/scoring.ts         → Re-exports from features/fantasy/services/scoring.*
src/lib/services/fixtures.ts        → Re-exports (NOT moved — also used by spieltag admin)
src/lib/services/chips.ts           → Re-export
src/lib/services/wildcards.ts       → Re-export
src/lib/services/predictions.ts     → Re-exports
src/lib/services/fantasyLeagues.ts  → Re-export
src/lib/queries/events.ts           → Re-exports from features/fantasy/queries/events
src/lib/queries/fantasyLeagues.ts   → Re-export
src/lib/queries/fantasyPicker.ts    → Re-export
src/lib/queries/invalidation.ts     → invalidateFantasyQueries becomes thin wrapper
src/lib/queries/keys.ts             → STAYS (global, cross-domain — NOT moved)
src/components/fantasy/             → Old barrel index.ts re-exports from features/fantasy
```

### 2.3 What does NOT change

- `src/app/(app)/fantasy/page.tsx` — Next.js page (just imports FantasyContent)
- `src/app/(app)/fantasy/loading.tsx`, `error.tsx`, `layout.tsx` — Next.js conventions
- `src/lib/queries/keys.ts` — Global query key factory stays global (cross-domain)
- All RPC names, DB column names, Supabase calls — zero backend change
- All i18n keys — zero translation change
- Visual output — pixel-identical UI

---

## 3. STORE DESIGN (DETAILED)

### 3.1 fantasyStore.ts

```typescript
import { create } from 'zustand';
import type { FantasyTab } from '../types';

interface FantasyState {
  // Navigation
  mainTab: FantasyTab;
  selectedGameweek: number | null;
  currentGw: number;  // computed: selectedGameweek ?? activeGw ?? 1

  // Event Detail Modal
  selectedEventId: string | null;
  showCreateModal: boolean;

  // Summary Modal
  summaryEventId: string | null;

  // Interested (local-only, not persisted)
  interestedIds: Set<string>;

  // Actions
  setMainTab: (tab: FantasyTab) => void;
  setSelectedGameweek: (gw: number | null) => void;
  setCurrentGw: (gw: number) => void;
  openEvent: (id: string) => void;
  closeEvent: () => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  setSummaryEventId: (id: string | null) => void;
  toggleInterested: (id: string) => void;
}
```

**CRITICAL: `currentGw` sync logic:**
- Initially `null` (no GW selected)
- When `useLeagueActiveGameweek` returns → `setCurrentGw(activeGw)` (one-time sync)
- User changes GW manually → `setSelectedGameweek(gw)` → `currentGw = gw`
- Safari bfcache → `setSelectedGameweek(null)` + invalidate leagueGw

### 3.2 lineupStore.ts

```typescript
import { create } from 'zustand';
import type { LineupPlayer } from '../types';
import type { PickerSortKey } from '../components/shared/PickerSortFilter';

interface LineupState {
  // Core lineup
  selectedPlayers: LineupPlayer[];
  selectedFormation: string;
  captainSlot: string | null;
  wildcardSlots: Set<string>;

  // Player Picker
  pickerOpen: { position: string; slot: number } | null;
  pickerSearch: string;
  pickerSort: PickerSortKey;
  clubFilter: string[];
  onlyAvailable: boolean;
  synergyOnly: boolean;

  // Actions
  selectPlayer: (playerId: string, position: string, slot: number) => void;
  removePlayer: (slot: number) => void;
  setFormation: (formationId: string) => void;
  setCaptain: (slot: string | null) => void;
  toggleWildcard: (slotKey: string) => void;
  resetLineup: (defaultFormation: string) => void;
  loadFromDb: (players: LineupPlayer[], formation: string, captain: string | null) => void;
  openPicker: (position: string, slot: number) => void;
  closePicker: () => void;
  setPickerSearch: (q: string) => void;
  setPickerSort: (sort: PickerSortKey) => void;
  setClubFilter: (clubs: string[]) => void;
  setOnlyAvailable: (v: boolean) => void;
  setSynergyOnly: (v: boolean) => void;
}
```

**CRITICAL: `selectPlayer` implementation:**
```typescript
selectPlayer: (playerId, position, slot) => set(state => ({
  selectedPlayers: [
    ...state.selectedPlayers.filter(p => p.slot !== slot),
    { playerId, position, slot, isLocked: false }
  ],
})),
```

**CRITICAL: `setFormation` clears lineup (existing behavior):**
```typescript
setFormation: (formationId) => set({ selectedFormation: formationId, selectedPlayers: [] }),
```

---

## 4. HOOKS DESIGN (DETAILED)

### 4.1 useGameweek.ts

**Replaces:** FantasyContent lines 180, 192-224, 318-342 (3 useState + 3 useEffect + 2 useMemo)

```typescript
export function useGameweek() {
  const { selectedGameweek, setSelectedGameweek, setCurrentGw, currentGw } = useFantasyStore();
  const { data: activeGw, isLoading: activeGwLoading } = useLeagueActiveGameweek();

  // Sync selectedGameweek with activeGw on first load
  useEffect(() => {
    if (activeGw && activeGw > 0 && selectedGameweek === null) {
      setSelectedGameweek(activeGw);
      setCurrentGw(activeGw);
    }
  }, [activeGw, selectedGameweek]);

  // Safari bfcache: reset on persisted pageshow
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setSelectedGameweek(null);
        queryClient.invalidateQueries({ queryKey: qk.events.leagueGw });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  // Compute effective currentGw
  const effectiveGw = selectedGameweek ?? activeGw ?? 1;

  // GW fixture completion
  const { data: gwFixtureInfo } = useQuery({
    queryKey: ['fantasy', 'gwStatus', effectiveGw],
    queryFn: () => getGameweekStatuses(effectiveGw, effectiveGw).then(statuses => {
      const s = statuses.find(st => st.gameweek === effectiveGw);
      return { complete: s?.is_complete ?? false, count: s?.total ?? 0 };
    }),
    staleTime: 60_000,
  });

  // GW status considers fixtures AND events
  // ... (gwStatus useMemo from FantasyContent lines 331-342)

  return {
    currentGw: effectiveGw,
    activeGw: activeGw ?? 1,
    gwStatus,
    fixtureCount: gwFixtureInfo?.count ?? 0,
    isLoading: activeGwLoading,
    setSelectedGameweek,
  };
}
```

### 4.2 useFantasyEvents.ts

**Replaces:** FantasyContent lines 176-177, 243-292 (2 queries + lineupMap useEffect + 2 useMemo)

```typescript
export function useFantasyEvents(currentGw: number) {
  const { selectedEventId, interestedIds } = useFantasyStore();
  const userId = useUserId(); // thin helper

  const { data: dbEvents = [], isLoading, isError, refetch } = useEvents();
  const { data: joinedIdsArr = [] } = useJoinedEventIds(userId);
  const joinedSet = useMemo(() => new Set(joinedIdsArr), [joinedIdsArr]);

  // Load user lineups for scored events (rank + points)
  const { data: lineupMap = new Map() } = useLineupScores(userId, dbEvents, joinedSet);
  // ^ NEW query hook — replaces manual useEffect + Promise.all

  // Map DB events to FantasyEvent shape
  const events = useMemo(() => dbEvents.map(e => {
    const fe = dbEventToFantasyEvent(e, joinedSet, lineupMap.get(e.id));
    if (interestedIds.has(e.id)) fe.isInterested = true;
    return fe;
  }), [dbEvents, joinedSet, lineupMap, interestedIds]);

  const gwEvents = useMemo(() => events.filter(e => e.gameweek === currentGw), [events, currentGw]);
  const activeEvents = useMemo(() => events.filter(e => e.isJoined && e.status === 'running'), [events]);
  const selectedEvent = useMemo(() => {
    if (!selectedEventId) return null;
    return events.find(e => e.id === selectedEventId) ?? null;
  }, [selectedEventId, events]);

  return { events, gwEvents, activeEvents, selectedEvent, isLoading, isError, refetch };
}
```

### 4.3 useFantasyHoldings.ts

**Replaces:** FantasyContent lines 182, 295-307 (holdings query + useMemo with lock/usage enrichment)

```typescript
export function useFantasyHoldings() {
  const userId = useUserId();
  const { data: dbHoldings = [] } = useHoldings(userId);
  const { data: usageMap } = usePlayerEventUsage(userId);
  const { data: lockedScMap } = useHoldingLocks(userId);

  const holdings = useMemo(() => dbHoldings.map(h => {
    const holding = dbHoldingToUserDpcHolding(h);
    const eventIds = usageMap?.get(holding.id) || [];
    holding.activeEventIds = eventIds;
    holding.eventsUsing = eventIds.length;
    const totalLocked = lockedScMap?.get(holding.id) ?? 0;
    holding.dpcAvailable = Math.max(0, holding.dpcOwned - totalLocked);
    holding.isLocked = holding.dpcAvailable <= 0;
    return holding;
  }), [dbHoldings, usageMap, lockedScMap]);

  return { holdings };
}
```

### 4.4 useEventActions.ts

**Replaces:** FantasyContent lines 390-534 (handleJoinEvent, handleSubmitLineup, handleLeaveEvent)
**CRITICAL: This is where all mutation logic + error handling + cache invalidation lives**

```typescript
export function useEventActions() {
  const userId = useUserId();
  const { addToast } = useToast();
  const { setBalanceCents } = useWallet();
  const { closeEvent } = useFantasyStore();
  const { resetLineup } = useLineupStore();
  const t = useTranslations('fantasy');
  const te = useTranslations('errors');
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [leavingEventId, setLeavingEventId] = useState<string | null>(null);

  const joinEvent = useCallback(async (event: FantasyEvent) => {
    // ... exact same logic as FantasyContent handleJoinEvent (lines 390-470)
    // calls: lockEventEntry → invalidateAfterJoin → mission tracking
  }, [userId, addToast, setBalanceCents]);

  const leaveEvent = useCallback(async (event: FantasyEvent) => {
    // ... exact same logic as FantasyContent handleLeaveEvent (lines 537-579)
    // calls: unlockEventEntry → invalidateAfterLeave
  }, [userId, addToast, setBalanceCents, closeEvent]);

  const submitLineup = useCallback(async (event: FantasyEvent, lineup: LineupPlayer[], formation: string, captainSlot: string | null, wildcardSlots: string[]) => {
    // ... exact same logic as FantasyContent handleSubmitLineup (lines 473-534)
    // calls: submitLineup service → invalidateAfterLineupSave
  }, [userId, addToast, closeEvent]);

  return { joinEvent, leaveEvent, submitLineup, joiningEventId, leavingEventId };
}
```

### 4.5 useFixtureDeadlines.ts

**Replaces:** FantasyContent lines 227-240 + EventDetailModal lines 286-319

```typescript
export function useFixtureDeadlines(currentGw: number, hasRunningEvents: boolean) {
  const { data: fixtureDeadlines = new Map() } = useQuery({
    queryKey: ['fantasy', 'fixtureDeadlines', currentGw],
    queryFn: () => getFixtureDeadlinesByGameweek(currentGw),
    staleTime: 30_000,
    refetchInterval: hasRunningEvents ? 60_000 : false,
    enabled: !!currentGw,
  });

  const isPlayerLocked = useCallback((playerId: string, holdings: UserDpcHolding[], eventStatus?: string): boolean => {
    if (!fixtureDeadlines.size || eventStatus !== 'running') return false;
    const holding = holdings.find(h => h.id === playerId);
    if (!holding?.clubId) return false;
    return fixtureDeadlines.get(holding.clubId)?.isLocked ?? false;
  }, [fixtureDeadlines]);

  const isPartiallyLocked = useMemo(() => {
    if (!fixtureDeadlines.size) return false;
    const values = Array.from(fixtureDeadlines.values());
    const locked = values.filter(d => d.isLocked).length;
    return locked > 0 && locked < values.length;
  }, [fixtureDeadlines]);

  const hasUnlockedFixtures = useMemo(() => {
    return Array.from(fixtureDeadlines.values()).some(d => !d.isLocked);
  }, [fixtureDeadlines]);

  const nextKickoff = useMemo(() => {
    // ... same logic as EventDetailModal lines 308-319
  }, [fixtureDeadlines]);

  return { fixtureDeadlines, isPlayerLocked, isPartiallyLocked, hasUnlockedFixtures, nextKickoff };
}
```

### 4.6 useScoredEvents.ts

**Replaces:** FantasyContent lines 262-277 (summaryShownRef + unseen scored detection)

```typescript
export function useScoredEvents(currentGw: number) {
  const { summaryEventId, setSummaryEventId } = useFantasyStore();
  // ... summary modal logic
  // Returns: summaryEvent, summaryLeaderboard, dismissSummary
}
```

### 4.7 useLineupBuilder.ts

**Replaces:** EventDetailModal lines 94-408 (formation derivation, effectiveHoldings, synergy, reqCheck, etc.)

```typescript
export function useLineupBuilder(event: FantasyEvent | null) {
  const store = useLineupStore();
  const { holdings } = useFantasyHoldings();
  const { isPlayerLocked } = useFixtureDeadlines(event?.gameweek ?? 1, event?.status === 'running');

  // Effective holdings: free up 1 DPC for players already in THIS event
  const effectiveHoldings = useMemo(() => {
    // ... same logic as EventDetailModal lines 251-261
  }, [holdings, event?.id]);

  // Formation data
  const availableFormations = useMemo(() => getFormationsForFormat(event?.format ?? '7er', event?.lineupSize), [event?.format, event?.lineupSize]);
  const currentFormation = useMemo(() => availableFormations.find(f => f.id === store.selectedFormation) || availableFormations[0], [availableFormations, store.selectedFormation]);
  const formationSlots = useMemo(() => { /* ... */ }, [currentFormation]);
  const slotDbKeys = useMemo(() => buildSlotDbKeys(currentFormation), [currentFormation]);

  // Derived state
  const isLineupComplete = store.selectedPlayers.length === formationSlots.length;
  const synergyPreview = useMemo(() => { /* calculateSynergyPreview */ }, [store.selectedPlayers, effectiveHoldings]);
  const ownedPlayerIds = useMemo(() => new Set(effectiveHoldings.filter(h => h.dpcOwned >= 1).map(h => h.id)), [effectiveHoldings]);
  const reqCheck = useMemo(() => { /* salary cap + club requirement checks */ }, [store.selectedPlayers, effectiveHoldings, event]);
  const totalSalary = useMemo(() => { /* perfL5 sum */ }, [store.selectedPlayers, effectiveHoldings]);

  // Player picker
  const getAvailablePlayersForPosition = useCallback((position: string, isWildcardSlot = false) => {
    // ... same logic as EventDetailModal lines 349-364
  }, [store.selectedPlayers, effectiveHoldings, isPlayerLocked, event?.scope, event?.clubId]);

  const getSelectedPlayer = useCallback((slot: number) => {
    // ... same O(1) lookup as EventDetailModal lines 322-332
  }, [store.selectedPlayers, effectiveHoldings]);

  // DB lineup hydration (on modal open)
  const hydrateFromDb = useCallback(async (eventId: string, userId: string) => {
    // ... same logic as EventDetailModal lines 183-228
    // Calls store.loadFromDb() with parsed data
  }, [availableFormations, store.loadFromDb]);

  return {
    effectiveHoldings,
    availableFormations, currentFormation, formationSlots, slotDbKeys,
    isLineupComplete, synergyPreview, ownedPlayerIds, reqCheck, totalSalary,
    getAvailablePlayersForPosition, getSelectedPlayer,
    hydrateFromDb,
    isPlayerLocked: (playerId: string) => isPlayerLocked(playerId, effectiveHoldings, event?.status),
  };
}
```

---

## 5. SERVICE SPLIT (DETAILED)

### 5.1 events.queries.ts

**Source:** `src/lib/services/events.ts` lines 1-57 + isClubEvent + getEventEntry + getUserEnteredEventIds + getScoutEventsEnabled

Functions to extract:
- `isClubEvent(event)` — pure function, no DB call
- `getEvents()` — fetch from `/api/events`
- `getEventsByClubId(clubId)` — Supabase query
- `getEventsByClubIds(clubIds)` — Supabase query
- `getUserJoinedEventIds(userId)` — Supabase query on event_entries
- `getUserEnteredEventIds(userId)` — similar
- `getEventEntry(eventId, userId)` — single entry lookup
- `getScoutEventsEnabled()` — platform settings check

### 5.2 events.mutations.ts

**Source:** `src/lib/services/events.ts` lines 60+ (all mutation functions)

Functions to extract:
- `lockEventEntry(eventId)` — RPC call, returns `{ ok, error?, balanceAfter?, have?, need?, alreadyEntered? }`
- `unlockEventEntry(eventId)` — RPC call, returns `{ ok, error?, balanceAfter? }`
- `cancelEventEntries(eventId)` — Admin RPC
- `createEvent(...)` — Admin mutation
- `createNextGameweekEvents(...)` — Admin mutation

### 5.3 lineups.queries.ts

**Source:** `src/lib/services/lineups.ts` lines 46-end (query functions)

- `getLineup(eventId, userId)` — returns DbLineup | null
- `getOwnedPlayerIds(userId)` — returns Set<string>
- `getEventParticipants(eventId, limit)` — top N participants
- `getEventParticipantCount(eventId)` — COUNT query
- `getPlayerEventUsage(userId)` — Map<playerId, eventId[]>

### 5.4 lineups.mutations.ts

**Source:** `src/lib/services/lineups.ts` (submitLineup function)

- `submitLineup({ eventId, userId, formation, slots, captainSlot, wildcardSlots })` — RPC: save_lineup

### 5.5 scoring.queries.ts

**Source:** `src/lib/services/scoring.ts` (read-only functions)

- `getEventLeaderboard(eventId)` — returns LeaderboardEntry[]
- `getProgressiveScores(gameweek, playerIds)` — returns Map<playerId, score>
- `getPlayerGameweekScores(playerId, gameweek?)` — returns score[]

### 5.6 scoring.admin.ts

**Source:** `src/lib/services/scoring.ts` (admin-only functions)

- `scoreEvent(eventId)` — RPC: score_event
- `resetEvent(eventId)` — RPC: reset_event
- `importProgressiveStats(gameweek)` — API-Football import
- `finalizeGameweek(gameweek, clubId)` — orchestrator
- `simulateGameweekFlow(gameweek, clubId)` — admin simulation tool

---

## 6. QUERY HOOKS (NEW)

### 6.1 useLineup (NEW)

**Replaces:** EventDetailModal lines 183-228 (manual getLineup in useEffect)

```typescript
export function useLineup(eventId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ['fantasy', 'lineup', eventId, userId],
    queryFn: () => getLineup(eventId!, userId!),
    enabled: !!eventId && !!userId,
    staleTime: 30_000,
  });
}
```

### 6.2 useLeaderboard (NEW)

**Replaces:** EventDetailModal lines 108-127 (manual fetch + 30s polling in useEffect)

```typescript
export function useLeaderboard(eventId: string | undefined, options?: { enabled?: boolean; isRunning?: boolean }) {
  return useQuery({
    queryKey: ['fantasy', 'leaderboard', eventId],
    queryFn: () => getEventLeaderboard(eventId!),
    enabled: options?.enabled !== false && !!eventId,
    staleTime: 15_000,
    refetchInterval: options?.isRunning ? 30_000 : false,
  });
}
```

### 6.3 useProgressiveScores (NEW)

**Replaces:** EventDetailModal lines 130-146 (manual fetch + 60s polling)

```typescript
export function useProgressiveScores(gameweek: number | undefined, playerIds: string[], options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['fantasy', 'progressiveScores', gameweek, playerIds],
    queryFn: () => getProgressiveScores(gameweek!, playerIds),
    enabled: options?.enabled !== false && !!gameweek && playerIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
```

### 6.4 useLineupScores (NEW)

**Replaces:** FantasyContent lines 245-260 (manual Promise.all for scored events)

```typescript
export function useLineupScores(userId: string | undefined, dbEvents: DbEvent[], joinedSet: Set<string>) {
  const scoredJoinedIds = useMemo(() =>
    dbEvents.filter(e => e.scored_at && joinedSet.has(e.id)).map(e => e.id),
    [dbEvents, joinedSet]
  );

  return useQuery({
    queryKey: ['fantasy', 'lineupScores', userId, scoredJoinedIds],
    queryFn: async () => {
      const lineups = await Promise.all(scoredJoinedIds.map(eid => getLineup(eid, userId!)));
      const map = new Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>();
      scoredJoinedIds.forEach((eid, i) => {
        if (lineups[i]) map.set(eid, { total_score: lineups[i]!.total_score, rank: lineups[i]!.rank, reward_amount: lineups[i]!.reward_amount });
      });
      return map;
    },
    enabled: !!userId && scoredJoinedIds.length > 0,
    staleTime: 5 * 60_000,
  });
}
```

---

## 7. CACHE INVALIDATION (CENTRALIZED)

### features/fantasy/queries/invalidation.ts

```typescript
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';

export async function invalidateAfterJoin(userId: string): Promise<void> {
  queryClient.invalidateQueries({ queryKey: qk.tickets.balance(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.usage(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(userId) });
  queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) });
  await queryClient.invalidateQueries({ queryKey: qk.events.all });
  fetch('/api/events?bust=1').catch(err => console.error('[Fantasy] Event cache bust failed:', err));
}

export async function invalidateAfterLeave(userId: string): Promise<void> {
  // Same keys as join + wildcard balance
  queryClient.invalidateQueries({ queryKey: qk.tickets.balance(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.usage(userId) });
  queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(userId) });
  queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) });
  await queryClient.invalidateQueries({ queryKey: qk.events.all });
  fetch('/api/events?bust=1').catch(err => console.error('[Fantasy] Event cache bust failed:', err));
}

export async function invalidateAfterLineupSave(userId: string, clubId?: string): Promise<void> {
  queryClient.invalidateQueries({ queryKey: qk.events.wildcardBalance(userId) });
  await invalidateFantasyQueriesCore(userId, clubId);
}

export async function invalidateAfterScoring(clubId?: string): Promise<void> {
  await invalidateFantasyQueriesCore(undefined, clubId);
}

// Internal core — replaces old invalidateFantasyQueries
async function invalidateFantasyQueriesCore(userId?: string, clubId?: string): Promise<void> {
  queryClient.invalidateQueries({ queryKey: qk.events.leagueGw });
  if (clubId) queryClient.invalidateQueries({ queryKey: qk.events.activeGw(clubId) });
  const critical: Promise<void>[] = [queryClient.invalidateQueries({ queryKey: qk.events.all })];
  if (userId) {
    critical.push(
      queryClient.invalidateQueries({ queryKey: qk.events.joinedIds(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.events.enteredIds(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.events.usage(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.events.holdingLocks(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.holdings.byUser(userId) }),
    );
  }
  await Promise.all(critical);
}
```

---

## 8. COMPONENT MAPPING (OLD → NEW)

| Old Location | LOC | New Location | LOC (est.) | Notes |
|-------------|-----|-------------|------------|-------|
| `app/(app)/fantasy/FantasyContent.tsx` | 866 | `features/fantasy/components/FantasyContent.tsx` | ~120 | Logic → hooks/stores |
| `components/fantasy/EventDetailModal.tsx` | 835 | `features/fantasy/components/event-detail/EventDetailModal.tsx` | ~200 | + Header/Tabs/Footer/JoinConfirm extracted |
| `components/fantasy/event-tabs/LineupPanel.tsx` | 1011 | `features/fantasy/components/lineup/LineupBuilder.tsx` | ~250 | + PitchView/PlayerPicker/etc. |
| — | — | `features/fantasy/components/lineup/PitchView.tsx` | ~250 | Extracted from LineupPanel |
| — | — | `features/fantasy/components/lineup/PlayerPicker.tsx` | ~250 | Extracted from LineupPanel |
| — | — | `features/fantasy/components/lineup/FormationSelector.tsx` | ~120 | Extracted from LineupPanel |
| — | — | `features/fantasy/components/lineup/SynergyPreview.tsx` | ~80 | Extracted from LineupPanel |
| — | — | `features/fantasy/components/lineup/ScoreBreakdown.tsx` | ~100 | Extracted from LineupPanel |
| `components/fantasy/SpieltagTab.tsx` | 381 | `features/fantasy/components/tabs/SpieltagTab.tsx` | 381 | Moved, minimal changes |
| `components/fantasy/EventsTab.tsx` | ~150 | `features/fantasy/components/tabs/EventsTab.tsx` | ~150 | Moved |
| `components/fantasy/MitmachenTab.tsx` | 153 | `features/fantasy/components/tabs/MitmachenTab.tsx` | 153 | Moved |
| `components/fantasy/ErgebnisseTab.tsx` | 236 | `features/fantasy/components/tabs/ErgebnisseTab.tsx` | 236 | Moved |
| `components/fantasy/event-tabs/OverviewPanel.tsx` | 230 | `features/fantasy/components/event-detail/OverviewPanel.tsx` | 230 | Moved |
| `components/fantasy/event-tabs/LeaderboardPanel.tsx` | 291 | `features/fantasy/components/event-detail/LeaderboardPanel.tsx` | ~200 | Uses useLeaderboard hook |
| `components/fantasy/EventCommunityTab.tsx` | 329 | `features/fantasy/components/event-detail/EventCommunityTab.tsx` | 329 | Moved |
| `components/fantasy/types.ts` | 140 | `features/fantasy/types.ts` | 140 | Moved |
| `components/fantasy/constants.ts` | 118 | `features/fantasy/constants.ts` | 118 | Moved |
| `components/fantasy/helpers.ts` | 92 | `features/fantasy/helpers.ts` | 92 | Moved |
| `components/fantasy/spieltag/*` | ~1600 | `features/fantasy/components/spieltag/*` | ~1600 | Moved as-is |
| `components/fantasy/events/*` | ~700 | `features/fantasy/components/events/*` | ~700 | Moved as-is |
| `components/fantasy/ergebnisse/*` | ~400 | `features/fantasy/components/ergebnisse/*` | ~400 | Moved as-is |
| All remaining shared components | ~2000 | `features/fantasy/components/shared/*` | ~2000 | Moved as-is |
| `lib/services/events.ts` | 609 | `features/fantasy/services/events.queries.ts` + `.mutations.ts` | 609 | Split |
| `lib/services/lineups.ts` | 284 | `features/fantasy/services/lineups.queries.ts` + `.mutations.ts` | 284 | Split |
| `lib/services/scoring.ts` | ~400 | `features/fantasy/services/scoring.queries.ts` + `.admin.ts` | ~400 | Split |
| `lib/services/fixtures.ts` | 537 | `features/fantasy/services/fixtures.ts` | 537 | Moved (all reads) |
| `lib/services/chips.ts` | 115 | `features/fantasy/services/chips.ts` | 115 | Moved |
| `lib/services/wildcards.ts` | 110 | `features/fantasy/services/wildcards.ts` | 110 | Moved |
| `lib/services/predictions.ts` | 352 | `features/fantasy/services/predictions.queries.ts` + `.mutations.ts` | 352 | Split |
| `lib/services/fantasyLeagues.ts` | 70 | `features/fantasy/services/leagues.ts` | 70 | Moved+renamed |
| `lib/queries/events.ts` | 127 | `features/fantasy/queries/events.ts` | ~150 | Moved + expanded |
| `lib/queries/fantasyLeagues.ts` | 21 | Re-export only | — | Thin wrapper |
| `lib/queries/fantasyPicker.ts` | 26 | Re-export only | — | Thin wrapper |
| — | — | `features/fantasy/mappers/eventMapper.ts` | ~80 | Extracted from FantasyContent |
| — | — | `features/fantasy/mappers/holdingMapper.ts` | ~40 | Extracted from FantasyContent |
| — | — | `features/fantasy/store/fantasyStore.ts` | ~60 | NEW |
| — | — | `features/fantasy/store/lineupStore.ts` | ~80 | NEW |
| — | — | `features/fantasy/hooks/*` (7 hooks) | ~600 | NEW (logic from components) |

---

## 9. CROSS-DOMAIN IMPACT CHECK

### Who imports from Fantasy services?

| Consumer | Imports | Must Not Break |
|----------|---------|----------------|
| ClubAdmin (AdminEventsTab) | events.ts, scoring.ts | createEvent, scoreEvent, finalizeGameweek |
| ClubAdmin (SpieltagTab) | fixtures.ts, scoring.ts | simulateGameweekFlow, importProgressiveStats |
| Trading (place_sell_order) | NO direct import — DB-level holding_locks | N/A |
| Profile (HistoryTab) | NO direct import — uses React Query | N/A |
| Gamification (ChipSelector) | chips.ts | activateChip, deactivateChip |
| Wallet Provider | NO direct import | N/A |
| Notifications | scoring.ts (fire-and-forget) | Inside scoring.admin.ts |

**Solution:** Re-export bridges in `lib/services/*.ts` ensure ALL external consumers work unchanged.

### Who imports from Fantasy components?

| Consumer | Import | Bridge |
|----------|--------|--------|
| `app/(app)/fantasy/page.tsx` | `FantasyContent` | Update import path |
| `components/fantasy/index.ts` | All barrel exports | Keep as re-export barrel |

---

## 10. TESTING STRATEGY

### Existing tests that must pass:
```
src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx
src/components/fantasy/__tests__/EventDetailModal.test.tsx
src/components/fantasy/__tests__/SpieltagTab.test.tsx
src/components/fantasy/__tests__/MitmachenTab.test.tsx
src/components/fantasy/__tests__/LeaguesSection.test.tsx
src/components/fantasy/__tests__/PredictionsTab.test.tsx
src/components/fantasy/__tests__/GameweekSelector.test.tsx
src/components/fantasy/__tests__/CreatePredictionModal.test.tsx
src/components/fantasy/__tests__/DashboardTab.test.tsx
src/components/fantasy/__tests__/GameweekTab.test.tsx
src/components/fantasy/__tests__/HistoryTab.test.tsx
src/components/fantasy/__tests__/EventCommunityTab.test.tsx
src/components/fantasy/__tests__/ScoringRules.test.tsx
src/components/fantasy/events/__tests__/FillBar.test.tsx
src/components/fantasy/events/__tests__/EventPulse.test.tsx
src/components/fantasy/spieltag/__tests__/SpieltagPulse.test.tsx
src/components/fantasy/spieltag/__tests__/FixtureDetailModal.test.tsx
src/components/fantasy/event-tabs/__tests__/LeaderboardPanel.test.tsx
```

### New tests to write:
- `features/fantasy/store/__tests__/fantasyStore.test.ts`
- `features/fantasy/store/__tests__/lineupStore.test.ts`
- `features/fantasy/hooks/__tests__/useEventActions.test.ts`
- `features/fantasy/hooks/__tests__/useLineupBuilder.test.ts`
- `features/fantasy/mappers/__tests__/eventMapper.test.ts`
- `features/fantasy/mappers/__tests__/holdingMapper.test.ts`

### Verification after each wave:
1. `tsc --noEmit` — zero type errors
2. `vitest run` — all existing tests pass (no new failures)
3. After Wave 3: Smoke test on Vercel (Join + Leave + Lineup Save)

---

## 11. MIGRATION WAVES

### Wave 1: Foundation (no UI change, no behavior change)
- Create `src/features/fantasy/` directory structure
- Move types.ts, constants.ts, helpers.ts
- Split services (events → events.queries + events.mutations, etc.)
- Create re-export bridges in old locations
- Move mappers (eventMapper, holdingMapper) from FantasyContent
- Verify: `tsc --noEmit` clean

### Wave 2: State + Hooks (no UI change)
- Create Zustand stores (fantasyStore, lineupStore)
- Implement 7 hooks (useGameweek, useFantasyEvents, etc.)
- Create new query hooks (useLeaderboard, useProgressiveScores, etc.)
- Create centralized invalidation module
- Tests for stores + hooks
- Verify: `tsc --noEmit` clean, `vitest` green

### Wave 3: Component Migration (UI change, same behavior)
- Rewrite FantasyContent to use hooks (866 → ~120 LOC)
- Rewrite EventDetailModal to use store + hooks (835 → ~200 LOC)
- Split LineupPanel into 6 components (1011 → 6 files)
- Move all sub-components to new locations
- Update all imports
- Verify: `tsc --noEmit` + `vitest` + Smoke test on Vercel

### Wave 4: Cleanup
- Remove old files that are now empty/re-export-only (where safe)
- Update barrel exports
- Run full test suite
- Update MEMORY.md architecture section

---

## 12. CRITICAL CONSTRAINTS

1. **NO functionality change** — same RPC calls, same error messages, same i18n keys
2. **NO new dependencies** — Zustand is already in the project
3. **Re-export bridges** MUST exist for ALL external consumers before deleting old files
4. **Query keys stay global** — `qk.*` in `lib/queries/keys.ts` is cross-domain
5. **`'use client'`** on all component files (Next.js App Router requirement)
6. **Feature branch** — all work on `refactor/fantasy-module`, not main
7. **Each wave must leave tsc clean** — no intermediate breakage
8. **LineupPanel pitch SVG** — must be pixel-identical (complex inline SVG, move carefully)
9. **localStorage presets** — `PRESET_KEY = 'bescout-lineup-presets'` must not change
10. **Fire-and-forget patterns** — mission tracking, notifications after scoring must be preserved exactly

---

## 13. AGENT KNOWLEDGE REQUIREMENTS

Any agent working on this refactoring MUST read:

### Before ANY work:
- This design document (full)
- `CLAUDE.md` (project conventions)
- `.claude/rules/common-errors.md` (DB column names, React patterns)
- `.claude/rules/fantasy.md` (if exists)

### Before Wave 1 (Foundation):
- ALL service files being split: `lib/services/events.ts`, `lineups.ts`, `scoring.ts`, `predictions.ts`
- `lib/queries/keys.ts` (global query key factory — understand cross-domain dependencies)
- `lib/queries/invalidation.ts` (understand what gets invalidated where)
- `components/fantasy/types.ts`, `constants.ts`, `helpers.ts` (verbatim move)
- `components/fantasy/index.ts` (barrel export — must update)

### Before Wave 2 (State + Hooks):
- Full `FantasyContent.tsx` (866 LOC — understand ALL useState, useEffect, useCallback)
- Full `EventDetailModal.tsx` (835 LOC — understand ALL state management)
- `lib/queries/events.ts` (existing query hooks being wrapped)
- Zustand docs via Context7 (current API, subscriptions, devtools)

### Before Wave 3 (Component Migration):
- Full `LineupPanel.tsx` (1011 LOC — understand pitch SVG, player picker, presets)
- All sub-components that need import path updates
- Test files that reference old paths

### Before Wave 4 (Cleanup):
- All re-export bridge files
- All test files (update import paths)
- `MEMORY.md` (update architecture section)

---

## 14. SUCCESS CRITERIA

- [ ] `tsc --noEmit` — 0 errors
- [ ] `vitest run` — all pre-existing tests pass (no new failures)
- [ ] No file in `features/fantasy/components/` exceeds 300 LOC
- [ ] No component has more than 12 props
- [ ] FantasyContent has 0 useState
- [ ] EventDetailModal has 0 manual useEffect for data fetching
- [ ] LineupPanel is split into minimum 5 focused components
- [ ] All cache invalidation lives in `features/fantasy/queries/invalidation.ts`
- [ ] All data mapping lives in `features/fantasy/mappers/`
- [ ] Smoke test on Vercel: Join + Leave + Lineup Save + Scoring — all work
- [ ] External consumers (ClubAdmin, ChipSelector) work without import changes
