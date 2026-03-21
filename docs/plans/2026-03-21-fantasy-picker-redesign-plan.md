# Fantasy Player Picker Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat player list in the Fantasy Picker with a Sorare-inspired Intelligence Strip showing Form Bars, FDR badge, club logos, stats, and enhanced sort/filter.

**Architecture:** 4 new components (FormBars, FDRBadge, PickerSortFilter, FantasyPlayerRow) + 2 data hooks (batch form scores, next fixtures) + integration into LineupPanel.tsx. Reuses existing `scoreColor` pattern from TradingCardFrame. FDR derived client-side from average squad L5. All data already in DB — no migrations needed.

**Tech Stack:** React, TypeScript strict, Tailwind (dark mode only), TanStack React Query v5, next-intl, lucide-react

**Design Spec:** `docs/plans/2026-03-21-fantasy-picker-redesign.md`

---

## Task 1: Extract `scoreColor` to shared util

**Files:**
- Create: `src/components/player/scoreColor.ts`
- Modify: `src/components/player/detail/TradingCardFrame.tsx:72-77`
- Modify: `src/components/player/index.tsx` (barrel export)

**Step 1: Create shared scoreColor function**

```typescript
// src/components/player/scoreColor.ts
/** Score-to-color mapping — shared by TradingCardFrame, FormBars, L5Circle */
export const scoreColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 60) return '#84cc16'; // lime-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#f43f5e';                  // rose-500
};
```

**Step 2: Update TradingCardFrame to import from shared**

In `TradingCardFrame.tsx`, remove lines 72-77 (local `scoreColor`), add:
```typescript
import { scoreColor } from '@/components/player/scoreColor';
```

**Step 3: Add to barrel export**

In `src/components/player/index.tsx`, add:
```typescript
export { scoreColor } from './scoreColor';
```

**Step 4: Run tsc + verify**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/player/scoreColor.ts src/components/player/detail/TradingCardFrame.tsx src/components/player/index.tsx
git commit -m "refactor: extract scoreColor to shared util"
```

---

## Task 2: Create `FormBars` component

**Files:**
- Create: `src/components/fantasy/FormBars.tsx`

**Step 1: Build the component**

Vertical bar chart showing last 5 match scores. Each bar's height is proportional to score, color from `scoreColor`. Unplayed matches show a dashed stub.

```typescript
// src/components/fantasy/FormBars.tsx
'use client';

import { cn } from '@/lib/utils';
import { scoreColor } from '@/components/player/scoreColor';

type FormEntry = {
  score: number;      // 0-100, or -1 for "not played"
  status: 'played' | 'bench' | 'not_in_squad';
};

interface FormBarsProps {
  entries: FormEntry[];   // up to 5, oldest first (newest = rightmost)
  className?: string;
}

const MAX_H = 28;  // px (mobile)
const MIN_H = 6;   // px
const BAR_W = 6;   // px
const GAP = 2;     // px

export default function FormBars({ entries, className }: FormBarsProps) {
  // Pad to 5 entries (fill left with empty)
  const padded = Array.from({ length: 5 }, (_, i) => {
    const idx = i - (5 - entries.length);
    return idx >= 0 ? entries[idx] : null;
  });

  return (
    <div
      className={cn('flex items-end', className)}
      style={{ gap: GAP, height: MAX_H }}
      aria-label="Form last 5"
    >
      {padded.map((entry, i) => {
        if (!entry || entry.status !== 'played') {
          // Not played / no data — dashed stub
          return (
            <div
              key={i}
              className="border border-dashed border-white/10 rounded-t-sm"
              style={{ width: BAR_W, height: 4 }}
            />
          );
        }
        const h = Math.max(MIN_H, (entry.score / 100) * MAX_H);
        return (
          <div
            key={i}
            className="rounded-t-sm"
            style={{
              width: BAR_W,
              height: h,
              backgroundColor: scoreColor(entry.score),
            }}
          />
        );
      })}
    </div>
  );
}
```

**Step 2: Run tsc**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/fantasy/FormBars.tsx
git commit -m "feat: FormBars component — L5 performance visualization"
```

---

## Task 3: Create `FDRBadge` component

**Files:**
- Create: `src/components/fantasy/FDRBadge.tsx`

FDR (Fixture Difficulty Rating) derived client-side: average L5 of all opponent players. No DB changes needed.

**Step 1: Build the component**

```typescript
// src/components/fantasy/FDRBadge.tsx
'use client';

import { cn } from '@/lib/utils';

type FDR = 'easy' | 'medium' | 'hard';

interface FDRBadgeProps {
  /** Average L5 of opponent squad — higher = harder */
  opponentAvgL5: number;
  className?: string;
}

function getFDR(avgL5: number): FDR {
  if (avgL5 >= 55) return 'hard';
  if (avgL5 >= 40) return 'medium';
  return 'easy';
}

const fdrStyles: Record<FDR, string> = {
  easy: 'bg-emerald-500',
  medium: 'bg-amber-500',
  hard: 'bg-rose-500',
};

export default function FDRBadge({ opponentAvgL5, className }: FDRBadgeProps) {
  const fdr = getFDR(opponentAvgL5);
  return (
    <span
      className={cn('inline-block size-2 rounded-full shrink-0', fdrStyles[fdr], className)}
      title={`FDR: ${fdr}`}
    />
  );
}

/** Compute average L5 for a club's players */
export function getClubAvgL5(clubShort: string, allPlayers: { club: string; perf: { l5: number } }[]): number {
  const clubPlayers = allPlayers.filter(p => p.club === clubShort);
  if (clubPlayers.length === 0) return 0;
  return Math.round(clubPlayers.reduce((s, p) => s + p.perf.l5, 0) / clubPlayers.length);
}
```

**Step 2: Commit**

```bash
git add src/components/fantasy/FDRBadge.tsx
git commit -m "feat: FDRBadge component — fixture difficulty indicator"
```

---

## Task 4: Create `PickerSortFilter` component

**Files:**
- Create: `src/components/fantasy/PickerSortFilter.tsx`

**Step 1: Build the component**

Sort pills (L5, Form, Preis, A-Z) + Filter chips (Club dropdown, Nur verfuegbare, Synergy).

```typescript
// src/components/fantasy/PickerSortFilter.tsx
'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ClubLookup } from '@/lib/clubs';

export type PickerSortKey = 'l5' | 'form' | 'price' | 'az';

interface PickerSortFilterProps {
  sort: PickerSortKey;
  onSortChange: (key: PickerSortKey) => void;
  clubFilter: string[];           // selected club shorts
  onClubFilterChange: (clubs: string[]) => void;
  onlyAvailable: boolean;
  onOnlyAvailableChange: (v: boolean) => void;
  synergyOnly: boolean;
  onSynergyOnlyChange: (v: boolean) => void;
  availableClubs: ClubLookup[];   // clubs that have players in the list
  synergyClubs: string[];         // clubs already in lineup (for synergy highlight)
}

const SORT_OPTIONS: { key: PickerSortKey; labelKey: string }[] = [
  { key: 'l5', labelKey: 'sortL5' },
  { key: 'form', labelKey: 'sortForm' },
  { key: 'price', labelKey: 'sortPrice' },
  { key: 'az', labelKey: 'sortAZ' },
];

export default function PickerSortFilter({
  sort, onSortChange,
  clubFilter, onClubFilterChange,
  onlyAvailable, onOnlyAvailableChange,
  synergyOnly, onSynergyOnlyChange,
  availableClubs, synergyClubs,
}: PickerSortFilterProps) {
  const t = useTranslations('fantasy');

  const toggleClub = (short: string) => {
    onClubFilterChange(
      clubFilter.includes(short)
        ? clubFilter.filter(c => c !== short)
        : [...clubFilter, short]
    );
  };

  return (
    <div className="space-y-2 px-4">
      {/* Sort pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {SORT_OPTIONS.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => onSortChange(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-colors',
              sort === key
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/60'
            )}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {/* Club filter chips */}
        {availableClubs.map(club => {
          const active = clubFilter.includes(club.short);
          const hasSynergy = synergyClubs.includes(club.short);
          return (
            <button
              key={club.short}
              onClick={() => toggleClub(club.short)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium shrink-0 border transition-colors',
                active
                  ? 'bg-gold/10 border-gold/20 text-gold'
                  : 'bg-white/[0.04] border-white/10 text-white/40',
                hasSynergy && !active && 'border-gold/10',
              )}
            >
              {club.logo && (
                <Image src={club.logo} alt="" width={14} height={14} className="size-3.5 rounded-full object-cover" />
              )}
              {club.short}
            </button>
          );
        })}

        {/* Toggle: nur verfuegbare */}
        <button
          onClick={() => onOnlyAvailableChange(!onlyAvailable)}
          className={cn(
            'px-2 py-1 rounded-lg text-[11px] font-medium shrink-0 border transition-colors',
            onlyAvailable
              ? 'bg-gold/10 border-gold/20 text-gold'
              : 'bg-white/[0.04] border-white/10 text-white/40',
          )}
        >
          {t('filterAvailable')}
        </button>

        {/* Toggle: synergy only */}
        {synergyClubs.length > 0 && (
          <button
            onClick={() => onSynergyOnlyChange(!synergyOnly)}
            className={cn(
              'px-2 py-1 rounded-lg text-[11px] font-medium shrink-0 border transition-colors',
              synergyOnly
                ? 'bg-gold/10 border-gold/20 text-gold'
                : 'bg-white/[0.04] border-white/10 text-white/40',
            )}
          >
            {t('filterSynergy')}
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/fantasy/PickerSortFilter.tsx
git commit -m "feat: PickerSortFilter — enhanced sort/filter for player picker"
```

---

## Task 5: Create data hooks — batch form scores + next fixtures

**Files:**
- Create: `src/lib/services/scoring.ts` — add `getBatchFormScores()`
- Create: `src/lib/queries/fantasyPicker.ts` — new hooks

**Step 1: Add batch form scores service function**

Append to `src/lib/services/scoring.ts`:

```typescript
/** Batch-fetch last 5 GW scores for multiple players (for Fantasy Picker FormBars) */
export async function getBatchFormScores(
  playerIds: string[],
  limit = 5
): Promise<Map<string, { score: number; status: 'played' | 'bench' | 'not_in_squad' }[]>> {
  if (playerIds.length === 0) return new Map();

  // Get last N gameweek scores for all requested players in one query
  const { data, error } = await supabase
    .from('player_gameweek_scores')
    .select('player_id, gameweek, score')
    .in('player_id', playerIds)
    .order('gameweek', { ascending: false })
    .limit(playerIds.length * limit);

  if (error || !data) return new Map();

  // Group by player, keep last `limit` scores
  const result = new Map<string, { score: number; status: 'played' | 'bench' | 'not_in_squad' }[]>();
  for (const row of data) {
    const pid = row.player_id as string;
    const arr = result.get(pid) ?? [];
    if (arr.length < limit) {
      arr.push({ score: row.score as number, status: 'played' });
    }
    result.set(pid, arr);
  }

  // Reverse each array so oldest is first (newest rightmost in UI)
  for (const [pid, arr] of result) {
    result.set(pid, arr.reverse());
  }

  return result;
}
```

**Step 2: Create React Query hooks file**

```typescript
// src/lib/queries/fantasyPicker.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { qk } from './keys';
import { getBatchFormScores } from '@/lib/services/scoring';
import { getNextFixturesByClub } from '@/lib/services/fixtures';

const FIVE_MIN = 5 * 60 * 1000;

/** Batch form scores for all players in the picker */
export function useBatchFormScores(playerIds: string[], enabled = true) {
  return useQuery({
    queryKey: [...qk.scoring.batchForm, ...playerIds.slice(0, 3)],
    queryFn: () => getBatchFormScores(playerIds, 5),
    enabled: enabled && playerIds.length > 0,
    staleTime: FIVE_MIN,
  });
}

/** Next fixture per club — single query, shared across all players */
export function useNextFixtures(enabled = true) {
  return useQuery({
    queryKey: qk.fixtures.next,
    queryFn: getNextFixturesByClub,
    enabled,
    staleTime: FIVE_MIN,
  });
}
```

**Step 3: Add query keys**

In `src/lib/queries/keys.ts`, add inside the `scoring` namespace:
```typescript
batchForm: ['scoring', 'batchForm'] as const,
```

And inside `fixtures` namespace:
```typescript
next: ['fixtures', 'next'] as const,
```

**Step 4: Run tsc + commit**

```bash
npx tsc --noEmit
git add src/lib/services/scoring.ts src/lib/queries/fantasyPicker.ts src/lib/queries/keys.ts
git commit -m "feat: batch form scores + next fixtures hooks for picker"
```

---

## Task 6: Create `FantasyPlayerRow` component

**Files:**
- Create: `src/components/fantasy/FantasyPlayerRow.tsx`

This is the core Intelligence Strip — the 4-line player row. Uses FormBars, FDRBadge, scoreColor, club logos.

**Step 1: Build the component**

Full component code per design spec. Key props:
- Player data (name, pos, club, stats, l5, shirt number, image, floor price, status)
- Form entries (from batch hook)
- Next fixture info
- FDR opponent avg L5
- Synergy info (is club already in lineup?)
- SC availability (dpcOwned, dpcAvailable, eventsUsing)
- Row state (selected, locked, deployed, injured, suspended)

Reference the design spec for exact Tailwind classes. Use:
- `PlayerPhoto` from `@/components/player/index` for the photo with position ring
- `posTintColors` from `@/components/player/PlayerRow` for position tints
- `getClub()` from `@/lib/clubs` for club logos
- `fmtScout` + `centsToBsd` for price formatting

**Step 2: Commit**

```bash
git add src/components/fantasy/FantasyPlayerRow.tsx
git commit -m "feat: FantasyPlayerRow — Intelligence Strip component"
```

---

## Task 7: Add i18n keys

**Files:**
- Modify: `messages/de.json` — add keys under `fantasy` namespace
- Modify: `messages/tr.json` — add same keys with Turkish translations

**Step 1: Add German keys**

Under `"fantasy"` namespace in `de.json`:
```json
{
  "sortL5": "L5",
  "sortForm": "Form \u2191",
  "sortPrice": "Preis",
  "sortAZ": "A-Z",
  "filterAvailable": "Verfuegbar",
  "filterSynergy": "Synergy",
  "vsLabel": "vs",
  "matchesShort": "S",
  "goalsShort": "T",
  "assistsShort": "A",
  "scLabel": "SC",
  "crLabel": "CR",
  "synergyLabel": "Syn",
  "deployed": "Vergeben",
  "live": "LIVE",
  "pickerAvailable": "Verfuegbar: {count}"
}
```

**Step 2: Add Turkish keys**

Same structure in `tr.json`:
```json
{
  "sortL5": "L5",
  "sortForm": "Form \u2191",
  "sortPrice": "Fiyat",
  "sortAZ": "A-Z",
  "filterAvailable": "Mevcut",
  "filterSynergy": "Sinerji",
  "vsLabel": "vs",
  "matchesShort": "M",
  "goalsShort": "G",
  "assistsShort": "A",
  "scLabel": "SC",
  "crLabel": "CR",
  "synergyLabel": "Sin",
  "deployed": "Kullanildi",
  "live": "CANLI",
  "pickerAvailable": "Mevcut: {count}"
}
```

**Step 3: Verify with node**

```bash
node -e "const de = require('./messages/de.json'); console.log(de.fantasy.sortL5)"
```

**Step 4: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "i18n: add fantasy picker sort/filter/row labels (DE+TR)"
```

---

## Task 8: Integrate into LineupPanel — Picker Modal

**Files:**
- Modify: `src/components/fantasy/event-tabs/LineupPanel.tsx:806-948`

This is the main integration. Replace the picker modal's player list and sort/filter UI.

**Step 1: Add imports + hooks**

At top of LineupPanel.tsx, add:
```typescript
import FantasyPlayerRow from '@/components/fantasy/FantasyPlayerRow';
import PickerSortFilter from '@/components/fantasy/PickerSortFilter';
import type { PickerSortKey } from '@/components/fantasy/PickerSortFilter';
import { getClubAvgL5 } from '@/components/fantasy/FDRBadge';
import { useBatchFormScores, useNextFixtures } from '@/lib/queries/fantasyPicker';
import { getClub } from '@/lib/clubs';
```

**Step 2: Add state + data hooks**

Near existing `pickerSort`/`pickerSearch` state (~line 126), add:
```typescript
const [pickerSortKey, setPickerSortKey] = useState<PickerSortKey>('l5');
const [clubFilter, setClubFilter] = useState<string[]>([]);
const [onlyAvailable, setOnlyAvailable] = useState(true);
const [synergyOnly, setSynergyOnly] = useState(false);
```

Add data hooks (before early returns):
```typescript
const playerIds = effectiveHoldings.map(h => h.id);
const { data: formScoresMap } = useBatchFormScores(playerIds, !!showPlayerPicker);
const { data: nextFixturesMap } = useNextFixtures(!!showPlayerPicker);
```

**Step 3: Enhance sort/filter logic**

Replace the existing sort logic (lines 815-819) with enhanced version supporting 4 sorts + 3 filters. Apply club filter, availability filter, synergy filter. Compute synergy clubs from currently selected lineup players.

**Step 4: Replace picker player rows (lines 893-943)**

Replace inline JSX with `<FantasyPlayerRow>` component, passing all required props including form entries from `formScoresMap`, next fixture from `nextFixturesMap`, FDR from `getClubAvgL5()`, synergy from lineup state.

**Step 5: Replace sort UI (lines 848-858)**

Replace the 2-pill sort bar with `<PickerSortFilter>` component.

**Step 6: Run tsc + manual test**

```bash
npx tsc --noEmit
```

Open Fantasy page, join an event, click a slot — verify new picker renders.

**Step 7: Commit**

```bash
git add src/components/fantasy/event-tabs/LineupPanel.tsx
git commit -m "feat: integrate Intelligence Strip into Fantasy Picker"
```

---

## Task 9: Integrate into LineupPanel — Available Players List

**Files:**
- Modify: `src/components/fantasy/event-tabs/LineupPanel.tsx:747-803`

**Step 1: Replace available player list rows**

Same `<FantasyPlayerRow>` component used in the main player list (below the pitch). This list shows all available players with their lineup status.

**Step 2: Commit**

```bash
git add src/components/fantasy/event-tabs/LineupPanel.tsx
git commit -m "feat: Intelligence Strip in available players list"
```

---

## Task 10: Responsive polish + final verification

**Files:**
- Possibly adjust: `FormBars.tsx`, `FantasyPlayerRow.tsx`, `PickerSortFilter.tsx`

**Step 1: Test on 360px viewport**

Use browser DevTools mobile view (360px width). Verify:
- Player rows fit without horizontal scroll
- Club names use `.short` (SAK, FEN)
- Form bars are visible and readable
- L5 circle doesn't overlap with name
- Sort/filter pills are scrollable
- 4 player rows visible without scrolling

**Step 2: Test on 768px+ viewport**

- Club names can use full name if space allows
- Form bars slightly larger (8px width)
- More breathing room in rows

**Step 3: Run full test suite**

```bash
npx tsc --noEmit && npx vitest run
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "polish: responsive adjustments for Fantasy Picker"
```

---

## Task Order + Dependencies

```
Task 1 (scoreColor) ──┐
Task 2 (FormBars) ─────┤
Task 3 (FDRBadge) ─────┤
Task 4 (SortFilter) ───┼──► Task 6 (FantasyPlayerRow) ──► Task 8 (Picker Integration)
Task 5 (Data hooks) ───┤                                      │
Task 7 (i18n) ─────────┘                                      ▼
                                                          Task 9 (List Integration)
                                                               │
                                                               ▼
                                                          Task 10 (Polish)
```

**Parallelisierbar:** Tasks 1-5 + 7 sind unabhaengig voneinander.
**Sequentiell:** Task 6 braucht 1-3, Task 8 braucht 4-7, Task 9 nach 8, Task 10 am Ende.
