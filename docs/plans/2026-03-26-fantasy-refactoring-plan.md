# Fantasy Module Refactoring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the Fantasy module (~11.840 LOC) into a self-contained feature module with clear layered architecture (Store/Hooks/Services/Queries/Mappers/Components).

**Architecture:** 2 Zustand stores replace 30+ useState across 3 God-Components. 7 custom hooks extract business logic. Services split by read/write. Manual useEffect data fetching replaced by React Query hooks. Re-export bridges preserve backward compatibility.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Zustand v5, TanStack React Query v5, Tailwind CSS, Supabase

**Design Doc:** `docs/plans/2026-03-26-fantasy-refactoring-design.md` — READ THIS FIRST (14 sections, full architecture)

**Branch:** `refactor/fantasy-module`

---

## Pre-Flight Checklist (BEFORE ANY TASK)

Every agent MUST read these files before starting work:

```
REQUIRED READING:
1. docs/plans/2026-03-26-fantasy-refactoring-design.md (full design)
2. CLAUDE.md (project conventions)
3. .claude/rules/common-errors.md (DB columns, React patterns)
4. .claude/rules/workflow.md (quality gates)
5. memory/features/fantasy.md (feature spec, 12 flows)
```

---

## WAVE 1: Foundation (no UI change, no behavior change)

### Task 1.1: Create Directory Structure + Feature Branch

**Files:**
- Create: `src/features/fantasy/` (directory tree)

**Step 1: Create feature branch**

```bash
git checkout -b refactor/fantasy-module
```

**Step 2: Create directory structure**

```bash
mkdir -p src/features/fantasy/{store,hooks,services,queries,mappers,components/{tabs,event-detail,lineup,spieltag,events,ergebnisse,shared}}
```

**Step 3: Verify structure exists**

```bash
ls -R src/features/fantasy/
```

**Step 4: Commit**

```bash
git add src/features/fantasy/
git commit -m "chore(fantasy): create feature module directory structure"
```

---

### Task 1.2: Move Types, Constants, Helpers

**Files:**
- Copy: `src/components/fantasy/types.ts` → `src/features/fantasy/types.ts`
- Copy: `src/components/fantasy/constants.ts` → `src/features/fantasy/constants.ts`
- Copy: `src/components/fantasy/helpers.ts` → `src/features/fantasy/helpers.ts`
- Modify: old files become re-exports

**Step 1: Read source files**

Read these 3 files completely before copying:
- `src/components/fantasy/types.ts` (140 LOC)
- `src/components/fantasy/constants.ts` (118 LOC)
- `src/components/fantasy/helpers.ts` (92 LOC)

**Step 2: Copy files to new location**

Copy each file verbatim. NO changes to content — only the file path changes.

**Step 3: Update old files to re-export**

```typescript
// src/components/fantasy/types.ts
export * from '@/features/fantasy/types';
```

```typescript
// src/components/fantasy/constants.ts
export * from '@/features/fantasy/constants';
```

```typescript
// src/components/fantasy/helpers.ts
export * from '@/features/fantasy/helpers';
```

**Step 4: Verify**

```bash
npx tsc --noEmit
```
Expected: 0 errors (all imports still resolve via re-exports)

**Step 5: Commit**

```bash
git add src/features/fantasy/types.ts src/features/fantasy/constants.ts src/features/fantasy/helpers.ts src/components/fantasy/types.ts src/components/fantasy/constants.ts src/components/fantasy/helpers.ts
git commit -m "refactor(fantasy): move types, constants, helpers to feature module"
```

---

### Task 1.3: Extract Mappers from FantasyContent

**Files:**
- Create: `src/features/fantasy/mappers/eventMapper.ts`
- Create: `src/features/fantasy/mappers/holdingMapper.ts`
- Modify: `src/app/(app)/fantasy/FantasyContent.tsx` — import from new location

**Step 1: Read FantasyContent.tsx lines 69-160**

These contain:
- `deriveEventStatus(db: DbEvent): EventStatus` (lines 71-78)
- `dbEventToFantasyEvent(db, joinedIds, userLineup?)` (lines 81-132)
- `dbHoldingToUserDpcHolding(h: HoldingWithPlayer)` (lines 135-160)

**Step 2: Create eventMapper.ts**

```typescript
// src/features/fantasy/mappers/eventMapper.ts
import type { DbEvent } from '@/types';
import type { EventStatus, FantasyEvent, LineupFormat } from '../types';
import { centsToBsd } from '@/lib/services/players';

/** Derive actual event status from DB status */
export function deriveEventStatus(db: DbEvent): EventStatus {
  if (db.scored_at) return 'ended';
  const s = db.status;
  if (s === 'ended' || s === 'scoring') return 'ended';
  if (s === 'running') return 'running';
  if (s === 'registering' || s === 'late-reg') return s as EventStatus;
  return 'upcoming';
}

/** Map DB event to local FantasyEvent shape */
export function dbEventToFantasyEvent(
  db: DbEvent,
  joinedIds: Set<string>,
  userLineup?: { total_score: number | null; rank: number | null; reward_amount: number } | null
): FantasyEvent {
  // PASTE EXACT BODY from FantasyContent.tsx lines 82-132
  // Do NOT modify any logic — verbatim copy
}
```

**Step 3: Create holdingMapper.ts**

```typescript
// src/features/fantasy/mappers/holdingMapper.ts
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import type { UserDpcHolding } from '../types';

/** Map DB holding row to local UserDpcHolding shape */
export function dbHoldingToUserDpcHolding(h: HoldingWithPlayer): UserDpcHolding {
  // PASTE EXACT BODY from FantasyContent.tsx lines 136-160
  // Do NOT modify any logic — verbatim copy
}
```

**Step 4: Update FantasyContent.tsx**

Replace the function definitions (lines 69-160) with imports:

```typescript
import { deriveEventStatus, dbEventToFantasyEvent } from '@/features/fantasy/mappers/eventMapper';
import { dbHoldingToUserDpcHolding } from '@/features/fantasy/mappers/holdingMapper';
```

Remove the local function bodies (lines 69-160).

**Step 5: Verify**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 6: Run tests**

```bash
npx vitest run src/app/\(app\)/fantasy/ --reporter=verbose
```
Expected: existing FantasyContent tests pass

**Step 7: Commit**

```bash
git add src/features/fantasy/mappers/ src/app/\(app\)/fantasy/FantasyContent.tsx
git commit -m "refactor(fantasy): extract data mappers from FantasyContent"
```

---

### Task 1.4: Split events.ts Service

**Files:**
- Create: `src/features/fantasy/services/events.queries.ts`
- Create: `src/features/fantasy/services/events.mutations.ts`
- Modify: `src/lib/services/events.ts` → re-export bridge

**Step 1: Read `src/lib/services/events.ts` completely (609 LOC)**

Identify:
- QUERIES (read-only): `isClubEvent`, `getEvents`, `getEventsByClubId`, `getEventsByClubIds`, `getUserJoinedEventIds`, `getUserEnteredEventIds`, `getEventEntry`, `getScoutEventsEnabled`
- MUTATIONS (writes): `lockEventEntry`, `unlockEventEntry`, `cancelEventEntries`, `createEvent`, `createNextGameweekEvents`, any admin functions

**Step 2: Create events.queries.ts**

Copy ALL query functions to new file. Keep identical imports. No logic changes.

```typescript
// src/features/fantasy/services/events.queries.ts
import { supabase } from '@/lib/supabaseClient';
import type { DbEvent, DbEventEntry } from '@/types';

export function isClubEvent(...) { /* verbatim */ }
export async function getEvents(): Promise<DbEvent[]> { /* verbatim */ }
export async function getEventsByClubId(...) { /* verbatim */ }
export async function getEventsByClubIds(...) { /* verbatim */ }
export async function getUserJoinedEventIds(...) { /* verbatim */ }
export async function getUserEnteredEventIds(...) { /* verbatim */ }
export async function getEventEntry(...) { /* verbatim */ }
export async function getScoutEventsEnabled(): Promise<boolean> { /* verbatim */ }
```

**Step 3: Create events.mutations.ts**

Copy ALL mutation functions to new file.

```typescript
// src/features/fantasy/services/events.mutations.ts
import { supabase } from '@/lib/supabaseClient';
import { getFixturesByGameweek } from '@/features/fantasy/services/fixtures';
import { notifText } from '@/lib/notifText';
import type { DbEvent, EventCurrency } from '@/types';

export async function lockEventEntry(...) { /* verbatim */ }
export async function unlockEventEntry(...) { /* verbatim */ }
export async function cancelEventEntries(...) { /* verbatim */ }
// + any other mutation functions
```

**Step 4: Make old events.ts a re-export bridge**

```typescript
// src/lib/services/events.ts
export { isClubEvent, getEvents, getEventsByClubId, getEventsByClubIds, getUserJoinedEventIds, getUserEnteredEventIds, getEventEntry, getScoutEventsEnabled } from '@/features/fantasy/services/events.queries';
export { lockEventEntry, unlockEventEntry, cancelEventEntries } from '@/features/fantasy/services/events.mutations';
// Re-export any remaining functions
```

**Step 5: Verify**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git add src/features/fantasy/services/events.queries.ts src/features/fantasy/services/events.mutations.ts src/lib/services/events.ts
git commit -m "refactor(fantasy): split events service into queries + mutations"
```

---

### Task 1.5: Split lineups.ts Service

**Files:**
- Create: `src/features/fantasy/services/lineups.queries.ts`
- Create: `src/features/fantasy/services/lineups.mutations.ts`
- Modify: `src/lib/services/lineups.ts` → re-export bridge

**Step 1: Read `src/lib/services/lineups.ts` completely (284 LOC)**

Identify:
- QUERIES: `getLineup`, `getOwnedPlayerIds`, `getEventParticipants`, `getEventParticipantCount`, `getPlayerEventUsage`
- MUTATIONS: `submitLineup`
- TYPES: `LineupSlotPlayer`, `LineupWithPlayers`, `ALL_SLOT_COLUMNS`, `ALL_SLOT_KEYS`

**Step 2-4: Same pattern as Task 1.4**

Split, re-export bridge, verify tsc.

Types and constants (`ALL_SLOT_COLUMNS`, `ALL_SLOT_KEYS`, `LineupSlotPlayer`, `LineupWithPlayers`) go in `lineups.queries.ts` since they're used by query functions.

**Step 5: Commit**

```bash
git commit -m "refactor(fantasy): split lineups service into queries + mutations"
```

---

### Task 1.6: Split scoring.ts Service

**Files:**
- Create: `src/features/fantasy/services/scoring.queries.ts`
- Create: `src/features/fantasy/services/scoring.admin.ts`
- Modify: `src/lib/services/scoring.ts` → re-export bridge

**Step 1: Read `src/lib/services/scoring.ts` completely**

Identify:
- QUERIES: `getEventLeaderboard`, `getProgressiveScores`, `getPlayerGameweekScores`
- ADMIN (writes): `scoreEvent`, `resetEvent`, `importProgressiveStats`, `finalizeGameweek`, `simulateGameweekFlow`
- TYPES: `ScoreResult`, `LeaderboardEntry`, `PlayerGameweekScore`, `MatchTimelineEntry`

**Step 2-4: Same pattern as Task 1.4**

Types go in `scoring.queries.ts`.

**CRITICAL:** `scoreEvent` has fire-and-forget notification logic (batch notifications + fan ranks + achievements). This MUST be preserved verbatim in `scoring.admin.ts`.

**Step 5: Commit**

```bash
git commit -m "refactor(fantasy): split scoring service into queries + admin"
```

---

### Task 1.7: Split predictions.ts + Move remaining services

**Files:**
- Create: `src/features/fantasy/services/predictions.queries.ts`
- Create: `src/features/fantasy/services/predictions.mutations.ts`
- Copy: `src/lib/services/fixtures.ts` → `src/features/fantasy/services/fixtures.ts`
- Copy: `src/lib/services/chips.ts` → `src/features/fantasy/services/chips.ts`
- Copy: `src/lib/services/wildcards.ts` → `src/features/fantasy/services/wildcards.ts`
- Copy: `src/lib/services/fantasyLeagues.ts` → `src/features/fantasy/services/leagues.ts`
- All old files become re-export bridges

**Step 1: Read each file, split predictions (352 LOC)**

QUERIES: `getPredictions`, `getResolvedPredictions`, `getFixturesForPrediction`, `getPlayersForFixture`, `getPredictionStats`
MUTATIONS: `createPrediction`, `resolvePredictions`

**Step 2-4: Same pattern — copy verbatim, re-export bridge**

**CRITICAL for fixtures.ts:** This file is also imported by spieltag admin components. The re-export bridge is essential.

**Step 5: Verify ALL services**

```bash
npx tsc --noEmit
```

**Step 6: Commit**

```bash
git commit -m "refactor(fantasy): move all fantasy services to feature module"
```

---

### Task 1.8: Move Query Hooks

**Files:**
- Create: `src/features/fantasy/queries/keys.ts`
- Create: `src/features/fantasy/queries/events.ts`
- Modify: `src/lib/queries/events.ts` → re-export bridge
- Modify: `src/lib/queries/fantasyLeagues.ts` → re-export bridge
- Modify: `src/lib/queries/fantasyPicker.ts` → re-export bridge

**Step 1: Read these files:**
- `src/lib/queries/events.ts` (127 LOC)
- `src/lib/queries/fantasyLeagues.ts` (21 LOC)
- `src/lib/queries/fantasyPicker.ts` (26 LOC)

**Step 2: Create keys.ts**

```typescript
// src/features/fantasy/queries/keys.ts
// Re-export relevant keys from global factory for convenience
export { qk } from '@/lib/queries/keys';
```

**Step 3: Move events.ts query hooks**

Copy `src/lib/queries/events.ts` verbatim to `src/features/fantasy/queries/events.ts`.
Update service imports to use new feature module paths.

**Step 4: Make old files re-export bridges**

```typescript
// src/lib/queries/events.ts
export * from '@/features/fantasy/queries/events';
```

**Step 5: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "refactor(fantasy): move query hooks to feature module"
```

---

### Task 1.9: Create Centralized Invalidation

**Files:**
- Create: `src/features/fantasy/queries/invalidation.ts`
- Modify: `src/lib/queries/invalidation.ts` — thin wrapper

**Step 1: Read `src/lib/queries/invalidation.ts` (117 LOC)**

Focus on `invalidateFantasyQueries` function (lines 78-99).

**Step 2: Create new invalidation module**

```typescript
// src/features/fantasy/queries/invalidation.ts
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

**Step 3: Update old invalidation.ts**

Replace `invalidateFantasyQueries` with a thin wrapper that calls `invalidateFantasyQueriesCore`:

```typescript
// In src/lib/queries/invalidation.ts — replace invalidateFantasyQueries:
import { invalidateAfterLineupSave } from '@/features/fantasy/queries/invalidation';

export async function invalidateFantasyQueries(userId?: string, clubId?: string): Promise<void> {
  await invalidateAfterLineupSave(userId ?? '', clubId);
}
```

**Step 4: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "refactor(fantasy): centralize cache invalidation in feature module"
```

---

### Task 1.10: Create Feature Barrel Export

**Files:**
- Create: `src/features/fantasy/index.ts`

**Step 1: Create barrel**

```typescript
// src/features/fantasy/index.ts

// Types
export * from './types';
export * from './constants';
export * from './helpers';

// Mappers
export { deriveEventStatus, dbEventToFantasyEvent } from './mappers/eventMapper';
export { dbHoldingToUserDpcHolding } from './mappers/holdingMapper';

// Services — Public API
export { getEvents, getEventsByClubId, getEventsByClubIds, getUserJoinedEventIds, isClubEvent } from './services/events.queries';
export { lockEventEntry, unlockEventEntry, cancelEventEntries } from './services/events.mutations';
export { getLineup, getOwnedPlayerIds, getEventParticipants, getEventParticipantCount } from './services/lineups.queries';
export { submitLineup } from './services/lineups.mutations';
export { getEventLeaderboard, getProgressiveScores } from './services/scoring.queries';
export type { ScoreResult, LeaderboardEntry } from './services/scoring.queries';

// Query Hooks
export { useEvents, useJoinedEventIds, usePlayerEventUsage, useHoldingLocks } from './queries/events';

// Invalidation
export { invalidateAfterJoin, invalidateAfterLeave, invalidateAfterLineupSave, invalidateAfterScoring } from './queries/invalidation';
```

**Step 2: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "refactor(fantasy): add feature barrel export"
```

---

### Task 1.11: Wave 1 Verification Gate

**Step 1: Full type check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 2: Full test run**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -20
```
Expected: All pre-existing tests pass (same failures as before, no new ones)

**Step 3: Verify re-export bridges work**

```bash
# Check that old import paths still resolve
grep -r "from '@/lib/services/events'" src/ --include='*.tsx' --include='*.ts' | head -5
grep -r "from '@/lib/queries/events'" src/ --include='*.tsx' --include='*.ts' | head -5
```
Expected: Files still import from old paths, which re-export from new

**Step 4: Commit wave checkpoint**

```bash
git commit --allow-empty -m "checkpoint: wave 1 complete — foundation in place, all tests passing"
```

---

## WAVE 2: State + Hooks (no UI change)

### Task 2.1: Create Fantasy Store (Zustand)

**Files:**
- Create: `src/features/fantasy/store/fantasyStore.ts`

**Step 1: Read Zustand docs via Context7**

Verify current Zustand v5 API for `create()` with TypeScript.

**Step 2: Implement fantasyStore**

```typescript
// src/features/fantasy/store/fantasyStore.ts
import { create } from 'zustand';
import type { FantasyTab } from '../types';

interface FantasyState {
  mainTab: FantasyTab;
  selectedGameweek: number | null;
  currentGw: number;
  selectedEventId: string | null;
  showCreateModal: boolean;
  summaryEventId: string | null;
  interestedIds: Set<string>;

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

export const useFantasyStore = create<FantasyState>((set) => ({
  mainTab: 'paarungen',
  selectedGameweek: null,
  currentGw: 1,
  selectedEventId: null,
  showCreateModal: false,
  summaryEventId: null,
  interestedIds: new Set(),

  setMainTab: (tab) => set({ mainTab: tab }),
  setSelectedGameweek: (gw) => set({ selectedGameweek: gw }),
  setCurrentGw: (gw) => set({ currentGw: gw }),
  openEvent: (id) => set({ selectedEventId: id }),
  closeEvent: () => set({ selectedEventId: null }),
  openCreateModal: () => set({ showCreateModal: true }),
  closeCreateModal: () => set({ showCreateModal: false }),
  setSummaryEventId: (id) => set({ summaryEventId: id }),
  toggleInterested: (id) => set((state) => {
    const next = new Set(state.interestedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { interestedIds: next };
  }),
}));
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/features/fantasy/store/fantasyStore.ts
git commit -m "feat(fantasy): create Zustand fantasy store"
```

---

### Task 2.2: Create Lineup Store (Zustand)

**Files:**
- Create: `src/features/fantasy/store/lineupStore.ts`

**Step 1: Read EventDetailModal.tsx lines 74-92 + LineupPanel.tsx lines 139-147**

These contain all lineup-related useState that will move to the store.

**Step 2: Implement lineupStore**

See Design Doc Section 3.2 for full interface. Create the store with all actions.

**CRITICAL implementations:**
- `selectPlayer`: filter existing slot, add new player
- `setFormation`: MUST clear selectedPlayers (existing behavior line 377)
- `resetLineup`: clears everything, sets default formation
- `loadFromDb`: hydrates from DB lineup response

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): create Zustand lineup store"
```

---

### Task 2.3: Implement useGameweek Hook

**Files:**
- Create: `src/features/fantasy/hooks/useGameweek.ts`

**Step 1: Read FantasyContent.tsx lines 180, 192-224, 318-342**

These contain the GW navigation logic being extracted.

**Step 2: Implement hook**

See Design Doc Section 4.1. The hook wraps:
- `useLeagueActiveGameweek()` query
- GW sync effect
- Safari bfcache handler
- GW fixture status query (converted from manual useEffect to React Query)
- `gwStatus` derived state

**CRITICAL:** Import `useFantasyStore` for reading/writing `selectedGameweek` and `currentGw`.

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): implement useGameweek hook"
```

---

### Task 2.4: Implement useFantasyEvents Hook

**Files:**
- Create: `src/features/fantasy/hooks/useFantasyEvents.ts`

**Step 1: Read FantasyContent.tsx lines 176-177, 243-292**

**Step 2: Implement hook**

See Design Doc Section 4.2. Key: uses `dbEventToFantasyEvent` mapper and derives all event lists.

**Step 3: Also create useLineupScores query hook**

```typescript
// src/features/fantasy/queries/lineups.ts
export function useLineupScores(userId, dbEvents, joinedSet) { ... }
```

See Design Doc Section 6.4.

**Step 4: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): implement useFantasyEvents + useLineupScores hooks"
```

---

### Task 2.5: Implement useFantasyHoldings Hook

**Files:**
- Create: `src/features/fantasy/hooks/useFantasyHoldings.ts`

**Step 1: Read FantasyContent.tsx lines 182, 295-307**

**Step 2: Implement hook**

See Design Doc Section 4.3. Wraps `useHoldings`, `usePlayerEventUsage`, `useHoldingLocks` and enriches with lock/usage data.

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): implement useFantasyHoldings hook"
```

---

### Task 2.6: Implement useEventActions Hook

**Files:**
- Create: `src/features/fantasy/hooks/useEventActions.ts`

**Step 1: Read FantasyContent.tsx lines 390-579 carefully**

These are the 3 handlers (joinEvent, leaveEvent, submitLineup) with ALL error handling, cache invalidation, and toast logic.

**Step 2: Implement hook**

See Design Doc Section 4.4.

**CRITICAL details to preserve verbatim:**
- Error switch cases in joinEvent (lines 409-434): insufficient_tickets, insufficient_balance, event_full, event_not_open, scout_events_disabled, subscription_required, tier_required
- Instant cache update via `setQueryData` for joinedIds (lines 447-449, 560-562)
- `invalidateAfterJoin`/`invalidateAfterLeave` replaces inline invalidation
- Mission tracking fire-and-forget (lines 460-462)
- Error switch cases in submitLineup (lines 503-521): insufficient_sc, duplicate_player, insufficient_wildcards, wildcards_not_allowed, too_many_wildcards, salary_cap_exceeded, holding_lock_failed, lineup_save_failed
- Wallet balance update: `setBalanceCents(result.balanceAfter)` only when > 0 (line 442)
- Formation slot building logic in submitLineup (lines 481-486)

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): implement useEventActions hook"
```

---

### Task 2.7: Implement useFixtureDeadlines Hook

**Files:**
- Create: `src/features/fantasy/hooks/useFixtureDeadlines.ts`

**Step 1: Read FantasyContent lines 227-240 + EventDetailModal lines 286-319**

**Step 2: Implement hook**

See Design Doc Section 4.5. Converts manual useEffect + setState to React Query with refetchInterval.

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): implement useFixtureDeadlines hook"
```

---

### Task 2.8: Implement useScoredEvents Hook

**Files:**
- Create: `src/features/fantasy/hooks/useScoredEvents.ts`

**Step 1: Read FantasyContent lines 262-277**

**Step 2: Implement hook**

See Design Doc Section 4.6. Handles summary modal logic + unseen scored event detection.

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): implement useScoredEvents hook"
```

---

### Task 2.9: Implement useLineupBuilder Hook

**Files:**
- Create: `src/features/fantasy/hooks/useLineupBuilder.ts`

**Step 1: Read EventDetailModal.tsx lines 94-408 completely**

This is the largest extraction — all lineup editing logic.

**Step 2: Implement hook**

See Design Doc Section 4.7. This hook:
- Reads from `lineupStore` (selectedPlayers, formation, captain, wildcards)
- Computes: effectiveHoldings, formationSlots, slotDbKeys, synergyPreview, ownedPlayerIds, reqCheck, totalSalary
- Provides: getAvailablePlayersForPosition, getSelectedPlayer, hydrateFromDb

**CRITICAL:** The `getAvailablePlayersForPosition` function (EventDetailModal lines 349-364) has position mapping logic (GK→GK, DEF→DEF/CB/LB/RB, MID→MID/CM/CDM/CAM/LM/RM, ATT→ATT/FW/ST/CF/LW/RW) that MUST be preserved exactly.

**CRITICAL:** The `effectiveHoldings` calculation (lines 251-261) frees up 1 DPC for players already in THIS event. This prevents double-counting when editing an existing lineup.

**Step 3: Also create scoring query hooks**

```typescript
// src/features/fantasy/queries/scoring.ts
export function useLeaderboard(eventId, options?) { ... }
export function useProgressiveScores(gameweek, playerIds, options?) { ... }
```

See Design Doc Sections 6.2 and 6.3.

**Step 4: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "feat(fantasy): implement useLineupBuilder + scoring query hooks"
```

---

### Task 2.10: Wave 2 Verification Gate

**Step 1: Full type check**

```bash
npx tsc --noEmit
```

**Step 2: Full test run**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -20
```

**Step 3: Verify hooks compile and export**

```bash
# Quick smoke — imports resolve
node -e "console.log('OK')" # just verify node works
npx tsc --noEmit # already done but double-check
```

**Step 4: Commit checkpoint**

```bash
git commit --allow-empty -m "checkpoint: wave 2 complete — stores + hooks implemented, all tests passing"
```

---

## WAVE 3: Component Migration (UI change, same behavior)

### Task 3.1: Rewrite FantasyContent

**Files:**
- Modify: `src/app/(app)/fantasy/FantasyContent.tsx` (866 → ~120 LOC)
- Create: `src/features/fantasy/components/FantasyContent.tsx`
- Create: `src/features/fantasy/components/FantasyHeader.tsx`
- Create: `src/features/fantasy/components/FantasyNav.tsx`
- Create: `src/features/fantasy/components/FantasySkeleton.tsx`
- Create: `src/features/fantasy/components/FantasyError.tsx`

**Step 1: Read the FULL current FantasyContent.tsx (866 LOC)**

Understand every piece that's being replaced by hooks.

**Step 2: Create new FantasyContent**

The new component uses hooks for ALL state and logic:

```typescript
// src/features/fantasy/components/FantasyContent.tsx
'use client';

import React from 'react';
import { ErrorBoundary } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useFantasyStore } from '../store/fantasyStore';
import { useGameweek } from '../hooks/useGameweek';
import { useFantasyEvents } from '../hooks/useFantasyEvents';
import { useFantasyHoldings } from '../hooks/useFantasyHoldings';
import { useEventActions } from '../hooks/useEventActions';
import { useFixtureDeadlines } from '../hooks/useFixtureDeadlines';
import { useScoredEvents } from '../hooks/useScoredEvents';
import { FantasyHeader } from './FantasyHeader';
import { FantasyNav } from './FantasyNav';
import { FantasySkeleton } from './FantasySkeleton';
import { FantasyError } from './FantasyError';
// ... dynamic imports for tabs, modals

export default function FantasyContent() {
  const { user } = useUser();
  const { mainTab } = useFantasyStore();
  const { currentGw, activeGw, gwStatus, fixtureCount, isLoading: gwLoading } = useGameweek();
  const { gwEvents, activeEvents, isLoading: eventsLoading, isError, refetch } = useFantasyEvents(currentGw);
  const { holdings } = useFantasyHoldings();
  const { fixtureDeadlines } = useFixtureDeadlines(currentGw, activeEvents.length > 0);
  const { summaryEvent, summaryLeaderboard, dismissSummary } = useScoredEvents(currentGw);

  if (eventsLoading || gwLoading) return <FantasySkeleton />;
  if (isError && gwEvents.length === 0) return <FantasyError onRetry={refetch} />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-5">
      <FantasyHeader activeCount={activeEvents.length} />
      {/* NewUserTip, MissionHintList, ScoringRules */}
      <FantasyNav currentGw={currentGw} activeGw={activeGw} gwStatus={gwStatus} fixtureCount={fixtureCount} eventCount={gwEvents.length} />
      {/* Tab content — conditional render */}
      {/* EventDetailModal, CreateEventModal, EventSummaryModal */}
    </div>
  );
}
```

**Step 3: Extract FantasyHeader, FantasyNav, FantasySkeleton, FantasyError**

Each is a small presentational component extracted from FantasyContent JSX.

**Step 4: Update page.tsx import**

```typescript
// src/app/(app)/fantasy/page.tsx
const FantasyContent = dynamic(
  () => import('@/features/fantasy/components/FantasyContent'),
  // ...
);
```

**Step 5: Verify**

```bash
npx tsc --noEmit
```

**Step 6: Run tests**

```bash
npx vitest run src/app/\(app\)/fantasy/ --reporter=verbose
```

**Step 7: Commit**

```bash
git commit -m "refactor(fantasy): rewrite FantasyContent as thin orchestrator (~120 LOC)"
```

---

### Task 3.2: Rewrite EventDetailModal

**Files:**
- Modify: `src/components/fantasy/EventDetailModal.tsx` (835 → re-export)
- Create: `src/features/fantasy/components/event-detail/EventDetailModal.tsx` (~200 LOC)
- Create: `src/features/fantasy/components/event-detail/EventDetailHeader.tsx`
- Create: `src/features/fantasy/components/event-detail/EventDetailTabs.tsx`
- Create: `src/features/fantasy/components/event-detail/EventDetailFooter.tsx`
- Create: `src/features/fantasy/components/event-detail/JoinConfirmDialog.tsx`
- Move: OverviewPanel, LeaderboardPanel, EventCommunityTab

**Step 1: Read the FULL current EventDetailModal.tsx (835 LOC)**

**Step 2: Create thin EventDetailModal**

Reads `selectedEventId` from fantasyStore, uses `useLineupBuilder` and `useEventActions` hooks. All state management delegated to stores/hooks.

**Step 3: Extract Header (status badges + meta, lines 468-509)**

**Step 4: Extract Tabs (tab navigation, lines 512-524)**

**Step 5: Extract Footer (join/leave/save/status buttons, lines 668-832)**

This is the largest extraction — ~160 LOC of conditional button rendering.

**Step 6: Extract JoinConfirmDialog (lines 617-666)**

**Step 7: Move OverviewPanel, LeaderboardPanel, EventCommunityTab**

These are already separate files — just move and update imports.
LeaderboardPanel switches from prop-based data to `useLeaderboard` hook.

**Step 8: Make old EventDetailModal.tsx a re-export**

```typescript
// src/components/fantasy/EventDetailModal.tsx
export { EventDetailModal } from '@/features/fantasy/components/event-detail/EventDetailModal';
```

**Step 9: Verify + Commit**

```bash
npx tsc --noEmit && npx vitest run src/components/fantasy/__tests__/EventDetailModal.test.tsx
git commit -m "refactor(fantasy): rewrite EventDetailModal as thin shell (~200 LOC)"
```

---

### Task 3.3: Split LineupPanel into 6 Components

**Files:**
- Create: `src/features/fantasy/components/lineup/LineupBuilder.tsx` (~250 LOC)
- Create: `src/features/fantasy/components/lineup/PitchView.tsx` (~250 LOC)
- Create: `src/features/fantasy/components/lineup/PlayerPicker.tsx` (~250 LOC)
- Create: `src/features/fantasy/components/lineup/FormationSelector.tsx` (~120 LOC)
- Create: `src/features/fantasy/components/lineup/SynergyPreview.tsx` (~80 LOC)
- Create: `src/features/fantasy/components/lineup/ScoreBreakdown.tsx` (~100 LOC)

**Step 1: Read LineupPanel.tsx COMPLETELY (1011 LOC)**

Identify the 6 visual zones:
1. **Status banners** (lines 273-343): locked/wildcard/running/scored banners
2. **Formation + Presets** (lines 344-400): dropdown + preset management
3. **Pitch View** (lines 402-631): SVG pitch with slot circles, sponsor zones
4. **Score Breakdown** (lines 633-751): scored/progressive player list
5. **Synergy + Ownership + Status banners** (lines 753-863): bonus displays
6. **Player Picker** (lines 880-1008): full-screen picker with search/sort/filter

**Step 2: Create LineupBuilder (orchestrator)**

Uses `useLineupBuilder` hook + `lineupStore`. Renders the 5 sub-components.
Props: `event: FantasyEvent`, `onClose: () => void`

**Step 3: Create PitchView**

Extract lines 402-631 (SVG pitch + slot circles).
Props: event, formationSlots, slotDbKeys, getSelectedPlayer, isPlayerLocked, captainSlot, slotScores, progressiveScores, wildcardSlots, ownedPlayerIds, ownershipBonusIds, isScored, isReadOnly
Actions come from lineupStore (selectPlayer via openPicker, removePlayer, setCaptain, toggleWildcard)

**CRITICAL:** The pitch SVG (lines 426-444) and sponsor zones (lines 405-421, 607-631) must be pixel-identical. Copy verbatim.

**Step 4: Create PlayerPicker**

Extract lines 880-1008 (full-screen picker modal).
Reads picker state from lineupStore (pickerOpen, pickerSearch, pickerSort, etc.).
Uses `getAvailablePlayersForPosition` from `useLineupBuilder`.

**Step 5: Create FormationSelector**

Extract lines 344-400 (formation dropdown + preset management).
Reads/writes formation from lineupStore.

**Step 6: Create SynergyPreview**

Extract lines 753-863 (synergy + ownership + captain + lineup status banners).

**Step 7: Create ScoreBreakdown**

Extract lines 633-751 (scored/progressive score list + team score banner).

**Step 8: Update EventDetailModal to use LineupBuilder**

Replace the `<LineupPanel ... 30+ props />` with `<LineupBuilder event={event} onClose={onClose} />`

**Step 9: Verify**

```bash
npx tsc --noEmit
```

**Step 10: Commit**

```bash
git commit -m "refactor(fantasy): split LineupPanel into 6 focused components"
```

---

### Task 3.4: Move Sub-Components (spieltag, events, ergebnisse, shared)

**Files:**
- Move: All files from `src/components/fantasy/spieltag/*` → `src/features/fantasy/components/spieltag/*`
- Move: All files from `src/components/fantasy/events/*` → `src/features/fantasy/components/events/*`
- Move: All files from `src/components/fantasy/ergebnisse/*` → `src/features/fantasy/components/ergebnisse/*`
- Move: Shared components to `src/features/fantasy/components/shared/*`
- Update: All internal imports
- Create: Re-export barrels in old locations

**Step 1: Move each directory**

Copy all files verbatim. Update only import paths (change relative paths like `../types` to `../../types`).

**Step 2: Create re-export barrels in old locations**

```typescript
// src/components/fantasy/spieltag/index.ts
export * from '@/features/fantasy/components/spieltag';
```

**Step 3: Move shared components**

These are standalone files in `src/components/fantasy/`:
- FantasyPlayerRow.tsx, PickerSortFilter.tsx, FDRBadge.tsx, FormBars.tsx
- ScoringRules.tsx, CreateEventModal.tsx, EventSummaryModal.tsx
- CreatePredictionModal.tsx, PredictionCard.tsx, PredictionsTab.tsx
- LeaguesSection.tsx, GameweekTab.tsx, DashboardTab.tsx, HistoryTab.tsx
- SpieltagSelector.tsx, GameweekSelector.tsx

**Step 4: Update barrel export**

```typescript
// src/components/fantasy/index.ts — update to re-export from feature module
export * from '@/features/fantasy';
export { SpieltagTab } from '@/features/fantasy/components/tabs/SpieltagTab';
// ... etc
```

**Step 5: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "refactor(fantasy): move all sub-components to feature module"
```

---

### Task 3.5: Move Tab Components

**Files:**
- Move: SpieltagTab, EventsTab, MitmachenTab, ErgebnisseTab → `features/fantasy/components/tabs/`
- Update: FantasyContent to import from new location

**Step 1: Move and update imports**

These components are self-contained. Only import paths change.

**Step 2: Update FantasyContent imports**

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "refactor(fantasy): move tab components to feature module"
```

---

### Task 3.6: Wave 3 Verification Gate

**Step 1: Full type check**

```bash
npx tsc --noEmit
```
Expected: 0 errors

**Step 2: Full test run**

```bash
npx vitest run --reporter=verbose 2>&1 | tail -30
```
Expected: All pre-existing tests pass

**Step 3: Smoke test on Vercel**

Deploy to preview URL and test:
1. Navigate to /fantasy
2. Change gameweek
3. Click an event → EventDetailModal opens
4. Switch tabs (overview/lineup/leaderboard/community)
5. Join an event (if test user has tickets)
6. Leave an event
7. Build a lineup + save
8. Check scoring results for a scored event

**Step 4: Commit checkpoint**

```bash
git commit --allow-empty -m "checkpoint: wave 3 complete — all components migrated, smoke tested"
```

---

## WAVE 4: Cleanup

### Task 4.1: Clean Old Files

**Files:**
- Audit: All files in `src/components/fantasy/` — which are now empty re-exports?
- Audit: All files in `src/lib/services/` — which are now re-export bridges?
- Decision: Keep re-export bridges for now (external consumers), remove only truly dead code

**Step 1: List re-export bridges**

```bash
grep -rl "export .* from '@/features/fantasy" src/components/fantasy/ src/lib/services/ src/lib/queries/
```

**Step 2: Remove any orphaned files** (files with 0 consumers)

**Step 3: Verify + Commit**

```bash
npx tsc --noEmit && git commit -m "chore(fantasy): clean orphaned files"
```

---

### Task 4.2: Update Tests

**Files:**
- Move/update: Test files to follow new structure
- Add: Tests for stores (fantasyStore, lineupStore)
- Add: Tests for mappers (eventMapper, holdingMapper)

**Step 1: Move test files that reference moved components**

Update import paths in test files.

**Step 2: Write store tests**

```typescript
// src/features/fantasy/store/__tests__/fantasyStore.test.ts
import { useFantasyStore } from '../fantasyStore';

describe('fantasyStore', () => {
  it('should set main tab', () => { ... });
  it('should open/close event', () => { ... });
  it('should toggle interested', () => { ... });
});
```

**Step 3: Write mapper tests**

```typescript
// src/features/fantasy/mappers/__tests__/eventMapper.test.ts
import { deriveEventStatus, dbEventToFantasyEvent } from '../eventMapper';

describe('deriveEventStatus', () => {
  it('returns ended when scored_at is set', () => { ... });
  it('returns running for running status', () => { ... });
  // ... all status transitions
});
```

**Step 4: Verify + Commit**

```bash
npx vitest run --reporter=verbose && git commit -m "test(fantasy): add store and mapper tests, update test imports"
```

---

### Task 4.3: Update Memory + Docs

**Files:**
- Update: `memory/MEMORY.md` — Architecture section
- Update: `memory/session-handoff.md` — Record this session's work
- Update: `memory/current-sprint.md`

**Step 1: Update architecture in MEMORY.md**

Add Fantasy feature module structure.

**Step 2: Update session-handoff.md**

**Step 3: Commit**

```bash
git commit -m "docs(fantasy): update architecture docs for feature module"
```

---

### Task 4.4: Final Verification Gate

**Step 1: Full type check**

```bash
npx tsc --noEmit
```

**Step 2: Full test suite**

```bash
npx vitest run
```

**Step 3: Verify file size targets**

```bash
wc -l src/features/fantasy/components/FantasyContent.tsx
# Expected: < 150

wc -l src/features/fantasy/components/event-detail/EventDetailModal.tsx
# Expected: < 250

wc -l src/features/fantasy/components/lineup/LineupBuilder.tsx
# Expected: < 300

wc -l src/features/fantasy/components/lineup/PitchView.tsx
# Expected: < 300

wc -l src/features/fantasy/components/lineup/PlayerPicker.tsx
# Expected: < 300
```

**Step 4: Verify no component exceeds 12 props**

```bash
grep -c "Props" src/features/fantasy/components/lineup/*.tsx
# Manually check prop interfaces
```

**Step 5: Verify external consumers unchanged**

```bash
# ClubAdmin should still import from old paths
grep -r "from '@/lib/services/events'" src/app/\(app\)/club/ --include='*.tsx' | head -3
grep -r "from '@/lib/services/scoring'" src/app/\(app\)/club/ --include='*.tsx' | head -3
```

**Step 6: Final commit**

```bash
git commit --allow-empty -m "checkpoint: wave 4 complete — fantasy refactoring done"
```

---

## Task Summary

| Wave | Tasks | Description | Risk |
|------|-------|-------------|------|
| 1 | 1.1-1.11 | Foundation: dirs, types, services, queries, invalidation, barrel | Low |
| 2 | 2.1-2.10 | State + Hooks: 2 stores, 7 hooks, query hooks | Medium |
| 3 | 3.1-3.6 | Components: rewrite 3 god-components, move all sub-components | High |
| 4 | 4.1-4.4 | Cleanup: dead code, tests, docs | Low |

**Total tasks:** 25
**Estimated effort:** 4-6 hours (with agents)
**Branch:** `refactor/fantasy-module`
**Merge strategy:** Single PR after Wave 4 passes all gates
