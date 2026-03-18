# Card Back L5 Performance Timeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace percentile bars on the card back with horizontal L5 match performance bars showing per-gameweek score, opponent, starter/sub, goals, assists, cards.

**Architecture:** Pass `matchTimeline` (already fetched in PlayerContent.tsx) through PlayerHero → TradingCardFrame. Replace the `PercentileBar` rendering section with a new `MatchBar` component. Remove the `percentiles` field from `CardBackData`.

**Tech Stack:** React, TypeScript, Tailwind CSS, existing `getPlayerMatchTimeline()` service

---

### Task 1: Update CardBackData Interface

**Files:**
- Modify: `src/components/player/detail/TradingCardFrame.tsx:21-41`

**Step 1: Add MatchTimelineEntry import and update interface**

In `TradingCardFrame.tsx`, add to the imports at the top:

```typescript
import type { MatchTimelineEntry } from '@/lib/services/scoring';
```

Replace the `CardBackData` interface (lines 21-41):

```typescript
export interface CardBackData {
  marketValueEur?: number;
  floorPrice?: number;
  priceChange24h?: number;
  successFeeCap?: number;
  holdingQty?: number;
  supplyTotal: number;
  contractMonths: number;
  l15: number;
  stats: {
    goals: number;
    assists: number;
    matches: number;
  };
  matchTimeline?: MatchTimelineEntry[];
}
```

Key change: `percentiles` removed, `matchTimeline` added.

**Step 2: Verify tsc passes**

Run: `npx tsc --noEmit`
Expected: Errors in PlayerHero.tsx (percentiles no longer exists) — that's expected, fixed in Task 2.

---

### Task 2: Update PlayerHero to pass matchTimeline

**Files:**
- Modify: `src/components/player/detail/PlayerHero.tsx:23-99`
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx:254-270`

**Step 1: Add matchTimeline prop to PlayerHero**

In `PlayerHero.tsx`, add to `PlayerHeroProps` interface (line 38):

```typescript
  matchTimeline?: MatchTimelineEntry[];
```

Add import at top:

```typescript
import type { MatchTimelineEntry } from '@/lib/services/scoring';
```

Add to destructured props (line 46):

```typescript
  allPlayers = [], matchTimeline,
```

**Step 2: Update backData assembly**

Replace `backData` useMemo (lines 73-99):

```typescript
  const backData = useMemo((): CardBackData | undefined => {
    return {
      marketValueEur: player.marketValue,
      floorPrice: player.prices.floor,
      priceChange24h: player.prices.change24h,
      successFeeCap: player.successFeeCap,
      holdingQty,
      supplyTotal: supply,
      contractMonths: player.contractMonthsLeft,
      l15: player.perf.l15,
      stats: {
        goals: player.stats.goals,
        assists: player.stats.assists,
        matches: player.stats.matches,
      },
      matchTimeline,
    };
  }, [player, holdingQty, supply, matchTimeline]);
```

Remove unused imports: `calcPercentile` from `./StatsBreakdown` (line 21), and `allPlayers` from deps.

**Step 3: Pass matchTimeline from PlayerContent to PlayerHero**

In `PlayerContent.tsx`, add prop to PlayerHero (around line 269):

```typescript
        <PlayerHero
          ...existing props...
          matchTimeline={matchTimelineData ?? []}
        />
```

**Step 4: Verify tsc passes**

Run: `npx tsc --noEmit`
Expected: May have errors in TradingCardFrame.tsx (percentiles destructuring) — fixed in Task 3.

---

### Task 3: Replace Percentile Bars with Match Timeline Bars

**Files:**
- Modify: `src/components/player/detail/TradingCardFrame.tsx`

**Step 1: Remove PercentileBar component and add MatchBar**

Delete `PercentileBar` function (lines 75-93).

Add new `MatchBar` component in its place:

```typescript
/* Score → color mapping for match performance bars */
const scoreColor = (score: number): string => {
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 60) return '#84cc16'; // lime-500
  if (score >= 40) return '#f59e0b'; // amber-500
  return '#f43f5e';                  // rose-500
};

/* Single match performance bar for card back */
function MatchBar({ entry }: { entry: MatchTimelineEntry }) {
  const pct = Math.max(5, Math.min(100, entry.score));
  const color = scoreColor(entry.score);
  const starterLabel = entry.isStarter ? 'XI' : `${entry.minutesPlayed}'`;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[6px] font-mono text-white/25 w-[18px] shrink-0 text-right tabular-nums">
        {entry.gameweek}
      </span>
      {entry.opponentLogoUrl ? (
        <img src={entry.opponentLogoUrl} alt="" className="size-3 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="text-[5px] font-bold text-white/20 size-3 shrink-0 flex items-center justify-center">
          {entry.opponent.slice(0, 2)}
        </span>
      )}
      <span className="text-[6px] font-bold text-white/40 w-[10px] shrink-0 text-center">
        {starterLabel}
      </span>
      <div className="flex-1 h-[6px] bg-white/[0.06] rounded-sm overflow-hidden relative">
        <div
          className="h-full rounded-sm"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* Icons embedded in bar */}
        <div className="absolute inset-0 flex items-center justify-end pr-1 gap-0.5">
          {entry.goals > 0 && (
            <span className="text-[5px]" title="Tor">⚽</span>
          )}
          {entry.assists > 0 && (
            <span className="text-[5px]" title="Assist">🅰️</span>
          )}
          {entry.redCard && (
            <span className="text-[5px]" title="Rote Karte">🟥</span>
          )}
          {entry.yellowCard && !entry.redCard && (
            <span className="text-[5px]" title="Gelbe Karte">🟨</span>
          )}
        </div>
      </div>
      <span className="text-[7px] font-mono font-bold tabular-nums w-[14px] shrink-0 text-right"
        style={{ color }}
      >
        {entry.score}
      </span>
    </div>
  );
}
```

**Step 2: Update back face rendering**

In the back face IIFE (starts ~line 357), replace the percentiles destructuring and perfBars:

Remove these lines:
```typescript
const { percentiles: pct } = backData;
// ...
const perfBars = [
  { label: 'L5', percentile: pct.l5 },
  { label: 'L15', percentile: pct.l15 },
  { label: 'AVG', percentile: pct.season },
  { label: 'MIN', percentile: pct.minutes },
];
```

Keep `change`, `changeStr`, `holdPct` as they are.

Replace the Percentile Performance Bars section (lines 459-469):

```tsx
                {/* ── L5 Match Performance Bars ── */}
                <div className="relative z-10 px-3 mt-2 md:mt-2.5 space-y-1">
                  {backData.matchTimeline && backData.matchTimeline.length > 0 ? (
                    <>
                      {backData.matchTimeline.slice(0, 5).map((entry) => (
                        <MatchBar key={entry.gameweek} entry={entry} />
                      ))}
                      {/* Summary line */}
                      <div className="flex items-center justify-center gap-2 pt-0.5">
                        <span className="text-[7px] font-mono text-white/30 tabular-nums">
                          Ø {Math.round(backData.matchTimeline.slice(0, 5).reduce((s, e) => s + e.score, 0) / backData.matchTimeline.slice(0, 5).length)}
                        </span>
                        <span className="text-white/10">·</span>
                        <span className="text-[7px] font-mono text-white/30 tabular-nums">
                          {Math.round(backData.matchTimeline.slice(0, 5).reduce((s, e) => s + e.minutesPlayed, 0) / backData.matchTimeline.slice(0, 5).length)}&apos; avg
                        </span>
                        <span className="text-white/10">·</span>
                        <span className="text-[7px] font-mono text-white/30 tabular-nums">
                          {backData.matchTimeline.slice(0, 5).length}/5
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[7px] text-white/20 text-center py-2">
                      Keine Spieldaten
                    </div>
                  )}
                </div>
```

**Step 3: Verify tsc passes**

Run: `npx tsc --noEmit`
Expected: PASS — no errors

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(player): replace card back percentile bars with L5 match timeline"
```

---

### Task 4: Cleanup unused code

**Files:**
- Modify: `src/components/player/detail/TradingCardFrame.tsx`
- Modify: `src/components/player/detail/PlayerHero.tsx`

**Step 1: Remove unused imports/code**

In `PlayerHero.tsx`:
- Remove `calcPercentile` import (line 21) if no longer used
- Remove `allPlayers` from useMemo deps if no longer needed

In `TradingCardFrame.tsx`:
- Confirm `PercentileBar` is deleted
- Confirm no remaining references to `percentiles`

**Step 2: Verify tsc + visual check**

Run: `npx tsc --noEmit`
Run dev server and check card back visually on mobile viewport.

**Step 3: Commit + Push**

```bash
git add -A && git commit -m "chore: cleanup unused percentile code from card back"
git push
```
