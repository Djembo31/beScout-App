# Manager + Market Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split the current `/market` page into two dedicated experiences — `/manager` (Command Center) and `/market` (Transfermarkt) — connected by deep-links.

**Architecture:** Existing `src/features/market/` stays as shared code (hooks, mutations, queries, trade modals). New `src/features/manager/` for manager-specific components. Both pages compose from shared. Zustand store splits into `managerStore` + `marketStore`. Old route removed after both new routes are complete.

**Tech Stack:** Next.js 14 App Router, React, TypeScript strict, Tailwind (Dark Mode), Zustand v5, TanStack React Query v5, lucide-react

**Estimated Scope:** ~15 Tasks across 5 Phases. Existing code: 8,124 lines / 47 files. Reusable: ~2,100 lines (shared modals, queries, mutations).

---

## Phase 0: Foundation (Routing, Stores, Shared Barrel)

### Task 1: Create shared barrel exports

**Files:**
- Create: `src/features/market/components/shared/index.ts`

**Step 1: Create barrel file**

```typescript
// src/features/market/components/shared/index.ts
export { default as BuyConfirmModal } from './BuyConfirmModal';
export { default as BuyOrderModal } from './BuyOrderModal';
export { default as TradeSuccessCard } from './TradeSuccessCard';
export { default as MarketFilters } from './MarketFilters';
export { default as MarketSearch } from './MarketSearch';
export { default as OrderDepthView } from './OrderDepthView';
```

**Step 2: Verify imports resolve**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 3: Commit**

```
feat(market): add barrel exports for shared trade components
```

---

### Task 2: Split Zustand store into managerStore + marketStore

**Files:**
- Create: `src/features/manager/store/managerStore.ts`
- Modify: `src/features/market/store/marketStore.ts`

**Step 1: Create managerStore**

New store for manager-specific state:

```typescript
// src/features/manager/store/managerStore.ts
import { create } from 'zustand';
import type { Pos } from '@/types';

type Formation = '4-3-3' | '4-4-2' | '3-5-2' | '3-4-3' | '4-2-3-1';

interface ManagerState {
  // Formation
  formation: Formation;
  setFormation: (f: Formation) => void;

  // Slot assignments: slot key -> playerId
  assignments: Map<string, string>;
  assignPlayer: (slot: string, playerId: string) => void;
  removePlayer: (slot: string) => void;
  clearAssignments: () => void;

  // Intel Panel
  selectedPlayerId: string | null;
  selectPlayer: (id: string | null) => void;
  intelTab: 'stats' | 'form' | 'markt';
  setIntelTab: (tab: 'stats' | 'form' | 'markt') => void;

  // Squad Strip
  stripSort: 'l5' | 'value' | 'fitness' | 'alpha';
  setStripSort: (s: 'l5' | 'value' | 'fitness' | 'alpha') => void;
  stripFilterPos: Pos | 'all';
  setStripFilterPos: (p: Pos | 'all') => void;

  // Event Prep Mode
  eventPrepMode: boolean;
  toggleEventPrepMode: () => void;
  eventPrepEventId: string | null;
  setEventPrepEventId: (id: string | null) => void;

  // Presets
  activePresetName: string | null;
  setActivePresetName: (name: string | null) => void;
}

export const useManagerStore = create<ManagerState>((set) => ({
  formation: '4-3-3',
  setFormation: (formation) => set({ formation }),

  assignments: new Map(),
  assignPlayer: (slot, playerId) => set((s) => {
    const next = new Map(s.assignments);
    next.set(slot, playerId);
    return { assignments: next };
  }),
  removePlayer: (slot) => set((s) => {
    const next = new Map(s.assignments);
    next.delete(slot);
    return { assignments: next };
  }),
  clearAssignments: () => set({ assignments: new Map() }),

  selectedPlayerId: null,
  selectPlayer: (selectedPlayerId) => set({ selectedPlayerId }),
  intelTab: 'stats',
  setIntelTab: (intelTab) => set({ intelTab }),

  stripSort: 'l5',
  setStripSort: (stripSort) => set({ stripSort }),
  stripFilterPos: 'all',
  setStripFilterPos: (stripFilterPos) => set({ stripFilterPos }),

  eventPrepMode: false,
  toggleEventPrepMode: () => set((s) => ({ eventPrepMode: !s.eventPrepMode })),
  eventPrepEventId: null,
  setEventPrepEventId: (eventPrepEventId) => set({ eventPrepEventId }),

  activePresetName: null,
  setActivePresetName: (activePresetName) => set({ activePresetName }),
}));
```

**Step 2: Slim down marketStore — remove portfolio/kader state that moved to managerStore**

The existing `marketStore.ts` keeps: tab navigation for market page, bestand state, filter/sort state, club verkauf state. Remove: anything that the new managerStore now owns (formation, assignments handled by useKaderState currently — will migrate in Phase 2).

For now: keep marketStore unchanged. It will be refactored when we build the new `/market` page in Phase 3. The managerStore is additive.

**Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors (managerStore is new, nothing imports it yet)

**Step 4: Commit**

```
feat(manager): add Zustand managerStore for dugout state
```

---

### Task 3: Create route scaffolding for /manager and /market (new)

**Files:**
- Create: `src/app/(app)/manager/page.tsx`
- Create: `src/app/(app)/manager/loading.tsx`
- Modify: `src/lib/nav.ts` — update navigation items

**Step 1: Create manager page scaffold**

```typescript
// src/app/(app)/manager/page.tsx
'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ManagerContent = dynamic(
  () => import('@/features/manager/components/ManagerContent'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 text-gold animate-spin motion-reduce:animate-none" />
      </div>
    ),
  }
);

export default function ManagerPage() {
  return <ManagerContent />;
}
```

```typescript
// src/app/(app)/manager/loading.tsx
export default function ManagerLoading() {
  return (
    <div className="space-y-6 animate-pulse motion-reduce:animate-none">
      <div className="h-12 bg-white/[0.04] rounded-xl" />
      <div className="h-[400px] bg-white/[0.04] rounded-2xl" />
      <div className="h-20 bg-white/[0.04] rounded-xl" />
    </div>
  );
}
```

**Step 2: Create minimal ManagerContent placeholder**

```typescript
// src/features/manager/components/ManagerContent.tsx
'use client';

import { useUser } from '@/components/providers/AuthProvider';

export default function ManagerContent() {
  const { user } = useUser();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">Manager</h1>
      <p className="text-white/50">Command Center — coming soon</p>
    </div>
  );
}
```

**Step 3: Update navigation**

In `src/lib/nav.ts`, replace the single market entry with manager + market:

```typescript
// Before:
{ label: 'market', href: '/market', icon: Briefcase },

// After:
{ label: 'manager', href: '/manager', icon: ClipboardList },
{ label: 'market', href: '/market', icon: TrendingUp },
```

Import `ClipboardList` and `TrendingUp` from `lucide-react`.

**Step 4: Add i18n keys**

In `messages/de.json` and `messages/tr.json`, add nav labels for manager and market (under the `nav` namespace — check existing pattern).

**Step 5: Verify**

Run: `npx tsc --noEmit`
Navigate to `/manager` — should show placeholder.
`/market` still shows old page (unchanged).

**Step 6: Commit**

```
feat(manager): scaffold /manager route + update nav (manager + market split)
```

---

## Phase 1: Manager — Tactical Board

### Task 4: Build StatusBar component

**Files:**
- Create: `src/features/manager/components/StatusBar.tsx`

**Purpose:** Single-row bar showing squad health, next event countdown, portfolio trend.

**Data needed:**
- Player holdings (for count + injury status from enriched players)
- Next events (from useActiveIpos or a new query)
- Portfolio value trend (computed from holdings + floor prices)

**Step 1: Build component**

Props:
```typescript
interface StatusBarProps {
  fitCount: number;
  doubtfulCount: number;
  injuredCount: number;
  nextEvent: { name: string; format: '6er' | '11er'; daysUntil: number; lockedCount: number } | null;
  portfolioTrendPct: number;
}
```

Renders: horizontal bar with 3 sections (squad health dots, event info, portfolio trend arrow).
On mobile: stack into 2 rows (health + event on row 1, portfolio on row 2).

**Step 2: Verify**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```
feat(manager): add StatusBar component (squad health + event + portfolio trend)
```

---

### Task 5: Build enhanced TacticalBoard (from existing SquadPitch)

**Files:**
- Create: `src/features/manager/components/TacticalBoard.tsx`
- Reuse: `src/features/market/components/portfolio/SquadPitch.tsx` (import, don't copy)

**Purpose:** Pitch visualization with formation picker, player circles with L5/fitness/lock badges.

**Step 1: Build TacticalBoard wrapper**

Wraps `SquadPitch` and adds:
- Formation picker dropdown above the pitch
- Enhanced player circles (L5 badge, fitness dot, lock icon, injury icon)
- Click handler: `onPlayerClick(playerId)` → tells parent to open Intel Panel
- Click on empty slot: `onEmptySlotClick(pos)` → tells parent to filter Squad Strip
- Preset save/load buttons below pitch

The existing `SquadPitch.tsx` handles the SVG pitch layout + slot positioning.
TacticalBoard handles the business logic layer on top.

**Step 2: Formation data structure**

```typescript
// src/features/manager/lib/formations.ts
export const FORMATIONS: Record<Formation, { label: string; slots: SlotDef[] }> = {
  '4-3-3': {
    label: '4-3-3',
    slots: [
      { key: 'gk', pos: 'GK', row: 0, col: 1 },
      { key: 'def1', pos: 'DEF', row: 1, col: 0 },
      { key: 'def2', pos: 'DEF', row: 1, col: 0.66 },
      { key: 'def3', pos: 'DEF', row: 1, col: 1.33 },
      { key: 'def4', pos: 'DEF', row: 1, col: 2 },
      { key: 'mid1', pos: 'MID', row: 2, col: 0.33 },
      { key: 'mid2', pos: 'MID', row: 2, col: 1 },
      { key: 'mid3', pos: 'MID', row: 2, col: 1.66 },
      { key: 'att1', pos: 'ATT', row: 3, col: 0.33 },
      { key: 'att2', pos: 'ATT', row: 3, col: 1 },
      { key: 'att3', pos: 'ATT', row: 3, col: 1.66 },
    ],
  },
  '4-4-2': { /* ... */ },
  '3-5-2': { /* ... */ },
  '3-4-3': { /* ... */ },
  '4-2-3-1': { /* ... */ },
};
```

**Step 3: Verify tsc + visual test**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```
feat(manager): add TacticalBoard with formation picker and enhanced player circles
```

---

### Task 6: Build IntelPanel component

**Files:**
- Create: `src/features/manager/components/IntelPanel.tsx`
- Create: `src/features/manager/components/intel/StatsTab.tsx`
- Create: `src/features/manager/components/intel/FormTab.tsx`
- Create: `src/features/manager/components/intel/MarktTab.tsx`

**Purpose:** Context panel showing player details. 3 tabs: Stats, Form, Markt.

**Data per tab:**

StatsTab: L5, last 5 scores (mini bars), season stats, fitness, next fixture, age/contract/pos.
All data from `enrichedPlayer` + `useRecentMinutes` + `useNextFixtures`.

FormTab: Score sparkline (last 10 GWs), last 3 event results, last 3 club match results.
Needs: `usePlayerScoreHistory(playerId)` — NEW query (or derive from existing data).
Check if `player_gameweek_scores` table has this data. If not, fall back to what's available.

MarktTab: Holdings qty, avg buy, floor, P&L, 7d sparkline, sell orders, quick actions.
Data from `enrichedPlayer.dpc` + `enrichedPlayer.prices` + existing hooks.

**Desktop:** Fixed panel 320px on the right, always visible.
**Mobile:** Bottom Sheet (use existing Modal component with BottomSheet behavior).

**When no player selected:** Show squad summary (total value, avg L5, weakest position).

**Step 1: Build IntelPanel shell with 3 tab buttons**

**Step 2: Build StatsTab (most data already available)**

**Step 3: Build FormTab (may need new query — check data availability first)**

**Step 4: Build MarktTab (reuse enriched player data)**

**Step 5: Verify tsc**

**Step 6: Commit**

```
feat(manager): add IntelPanel with Stats/Form/Markt tabs
```

---

### Task 7: Build SquadStrip component

**Files:**
- Create: `src/features/manager/components/SquadStrip.tsx`

**Purpose:** Horizontal scrollable bar with all owned players as mini-cards.

**Features:**
- Grouped by position (GK | DEF | MID | ATT) with color dividers
- Per card: photo (PlayerPhoto), name (truncated), L5 badge, fitness dot
- Checkmark if on pitch, lock if in event, red overlay if injured
- Sort buttons: Form | Wert | Fitness | Alpha
- Position filter buttons: All | GK | DEF | MID | ATT
- Tap card → select player (opens Intel Panel)

**Data:** From `mySquadPlayers` (already computed in useMarketData).

**Step 1: Build component**

**Step 2: Verify tsc + visual check**

**Step 3: Commit**

```
feat(manager): add SquadStrip with position groups, sort, filter
```

---

### Task 8: Wire up ManagerContent — compose all zones

**Files:**
- Modify: `src/features/manager/components/ManagerContent.tsx`

**Purpose:** Orchestrate StatusBar + TacticalBoard + IntelPanel + SquadStrip into the Command Center layout.

**Step 1: Build the layout**

Desktop (lg+):
```
StatusBar (full width)
TacticalBoard (left ~60%) + IntelPanel (right ~40%)
SquadStrip (full width)
```

Mobile:
```
StatusBar
TacticalBoard (full width)
SquadStrip (full width)
Tap player → Modal/BottomSheet with IntelPanel
```

**Step 2: Connect data flow**

- `useMarketData(userId)` for all player/holdings data
- `useManagerStore()` for UI state (formation, assignments, selected player)
- Pass player selection from TacticalBoard/SquadStrip → IntelPanel
- Pass assignment actions from IntelPanel → TacticalBoard

**Step 3: Handle URL params for deep-links**

Parse `?player={id}`, `?assign={id}`, `?evaluate={id}` from search params.
Set corresponding state on mount.

**Step 4: Verify tsc + navigate + interact**

Run: `npx tsc --noEmit`
Navigate to `/manager` — full layout should render.
Click player on pitch → Intel Panel shows.
Click empty slot → Squad Strip filters.

**Step 5: Commit**

```
feat(manager): wire up ManagerContent — compose all 4 zones into Command Center
```

---

## Phase 2: Manager — Event Prep Mode

### Task 9: Build EventPrepOverlay

**Files:**
- Create: `src/features/manager/components/EventPrepOverlay.tsx`
- Create: `src/features/manager/hooks/useUpcomingEvents.ts`

**Purpose:** When toggled, overlays event requirements on the pitch. Shows which players are eligible, locked, or missing.

**Step 1: Create useUpcomingEvents hook**

Query upcoming events the user can join. Check if existing `useActiveIpos` or fantasy event queries cover this. If not, build from `events` table.

**Step 2: Build overlay component**

Shows on the pitch:
- Green highlight on slots that satisfy event requirements
- Red highlight on slots with locked/ineligible players
- "X Spieler fehlen" counter
- Event selector dropdown (if multiple upcoming events)

**Step 3: Wire into TacticalBoard as toggleable overlay**

StatusBar event section tap → enables event prep mode.

**Step 4: Verify + Commit**

```
feat(manager): add Event Prep overlay with requirement matching
```

---

## Phase 3: Market Page — Portfolio + Marktplatz

### Task 10: Build PortfolioCard component

**Files:**
- Create: `src/features/market/components/portfolio/PortfolioCard.tsx`

**Purpose:** Compact card for each holding with sparkline, P&L, quick actions.

Shows: Player photo, name, position badge, quantity, P&L (color-coded), floor price, 7d sparkline (60px inline SVG), [Sell] button, [→ Manager] link.

**Step 1: Build component**

**Step 2: Verify + Commit**

```
feat(market): add PortfolioCard with sparkline and P&L display
```

---

### Task 11: Build PortfolioSummary component

**Files:**
- Create: `src/features/market/components/portfolio/PortfolioSummary.tsx`

**Purpose:** P&L overview card. Total portfolio value, total P&L, top winner, top loser. Below: links to open orders + incoming offers (counts as badges).

**Step 1: Build component**

**Step 2: Verify + Commit**

```
feat(market): add PortfolioSummary with P&L overview
```

---

### Task 12: Build new MarketContent — compose Portfolio + Marktplatz

**Files:**
- Create: `src/features/market/components/MarketContentV2.tsx`
- Modify: `src/app/(app)/market/page.tsx` — switch to V2

**Purpose:** New market page layout. Desktop: Portfolio left + Marktplatz right. Mobile: 2 tabs.

**Step 1: Build MarketContentV2**

Desktop layout:
```
HeaderBar (balance + portfolio value + search + filters)
Portfolio (left 45%) | Marktplatz (right 55%)
```

Mobile layout:
```
HeaderBar
[Portfolio] [Marktplatz] tabs
Full-screen content for active tab
```

**Portfolio section:** PortfolioCard list (sorted) + PortfolioSummary + Open Orders + Incoming Offers.

**Marktplatz section:** Reuse existing ClubVerkaufSection + TransferListSection + TrendingSection (import from `src/features/market/components/marktplatz/`).

**Step 2: Connect data**

Same `useMarketData` + `useTradeActions` hooks.
Portfolio section uses holdings data.
Marktplatz section uses IPO + orders + trending data.

**Step 3: Add deep-link handling**

Parse `?player={id}`, `?sell={id}`, `?pos={pos}` from search params.
- `?player=X` → scroll to player in Marktplatz, expand detail
- `?sell=X` → open sell modal for player
- `?pos=DEF` → activate Marktplatz with position filter

**Step 4: Switch page.tsx to V2**

**Step 5: Verify tsc + full navigation test**

**Step 6: Commit**

```
feat(market): new Market page layout — Portfolio left, Marktplatz right
```

---

## Phase 4: Deep-Link Bridges

### Task 13: Wire Manager ↔ Market deep-links

**Files:**
- Modify: `src/features/manager/components/intel/MarktTab.tsx` — add "Auf Transfermarkt →" link
- Modify: `src/features/market/components/portfolio/PortfolioCard.tsx` — add "→ Im Manager" link
- Modify: Trade modals — add "Jetzt aufstellen?" after purchase

**Step 1: Manager → Market links**

In MarktTab: `<Link href={`/market?player=${playerId}`}>Auf Transfermarkt →</Link>`
In IntelPanel empty slot: `<Link href={`/market?pos=${pos}`}>Spieler suchen →</Link>`

**Step 2: Market → Manager links**

In PortfolioCard: `<Link href={`/manager?player=${playerId}`}>Im Manager →</Link>`
In TradeSuccessCard: `<Link href={`/manager?assign=${playerId}`}>Jetzt aufstellen?</Link>`

**Step 3: Verify round-trip navigation**

Buy player in Market → "Jetzt aufstellen?" → Manager opens with player highlighted.
Manager Intel Panel → "Auf Transfermarkt" → Market opens with player focused.

**Step 4: Commit**

```
feat: wire Manager ↔ Market deep-link bridges with context passing
```

---

## Phase 5: Cleanup + Polish

### Task 14: Remove old MarketContent, update imports

**Files:**
- Delete or archive: `src/features/market/components/MarketContent.tsx` (old)
- Rename: `MarketContentV2.tsx` → `MarketContent.tsx`
- Verify: no imports reference old component

**Step 1: Rename V2 to final**

**Step 2: Grep for old imports, fix any remaining references**

**Step 3: Verify tsc + all tests**

Run: `npx tsc --noEmit && npx vitest run src/features/market/`

**Step 4: Commit**

```
chore: remove old MarketContent, finalize Market page
```

---

### Task 15: Visual QA + Mobile Testing

**Files:** None (testing only)

**Step 1: Desktop QA**

Use Playwright MCP to screenshot:
- `/manager` — full layout, player selected, event prep mode
- `/market` — portfolio + marktplatz, buy flow, sell flow

**Step 2: Mobile QA (360px)**

- `/manager` — pitch, squad strip scroll, bottom sheet intel panel
- `/market` — tab switching, portfolio cards, marktplatz

**Step 3: Cross-link QA**

Test all 4 deep-link bridges end-to-end.

**Step 4: Fix issues found**

**Step 5: Final commit**

```
fix: visual QA polish for Manager + Market pages
```

---

## Task Dependencies

```
Phase 0: Task 1 → Task 2 → Task 3 (sequential, foundation)
Phase 1: Task 4, 5, 6, 7 (parallel — independent components)
         → Task 8 (depends on 4-7, wires everything together)
Phase 2: Task 9 (depends on Task 8)
Phase 3: Task 10, 11 (parallel) → Task 12 (depends on 10, 11)
Phase 4: Task 13 (depends on Task 8 + Task 12)
Phase 5: Task 14 → Task 15 (sequential, cleanup)
```

## Parallel Execution Strategy

```
Session A (Manager):  Task 1 → 2 → 3 → [4,5,6,7 parallel] → 8 → 9
Session B (Market):   (wait for Task 3) → [10,11 parallel] → 12
Session C (Polish):   (wait for A+B) → 13 → 14 → 15
```

Tasks 4-7 are ideal for sub-agent dispatch (independent components, clear interfaces).
Task 12 is ideal for sub-agent (composes existing components into new layout).
Tasks 8, 13, 14 should be done by Jarvis directly (integration, cross-cutting).
