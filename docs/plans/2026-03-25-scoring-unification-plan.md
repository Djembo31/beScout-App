# Scoring Unification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify all player score displays to 0-100 scale with one 6-tier color system, remove fake fallback scores, and clearly separate Match Rating from Fantasy Points.

**Architecture:** Single `getScoreStyle()` function replaces 4 color functions + 2 local redefinitions. Spieltag components switch from raw API-Football rating (5.5-10.0) to converted score (rating × 10). Null ratings show "N/A" instead of fake formula scores.

**Tech Stack:** TypeScript, React, Tailwind CSS, Supabase RPCs

---

## Task 1: Create unified `getScoreStyle()` function

**Files:**
- Rewrite: `src/components/player/scoreColor.ts`
- Test: `src/components/player/__tests__/scoreColor.test.ts` (new)

**Step 1: Write the test**

```typescript
import { getScoreStyle, getScoreHex, getScoreBg, getScoreTextClass } from '../scoreColor';

describe('getScoreStyle', () => {
  it('returns elite for 90-100', () => {
    expect(getScoreStyle(95).label).toBe('Elite');
    expect(getScoreStyle(95).hex).toBe('#374DF5');
  });
  it('returns sehr gut for 80-89', () => {
    expect(getScoreStyle(85).label).toBe('Sehr gut');
    expect(getScoreStyle(85).hex).toBe('#00ADC4');
  });
  it('returns gut for 70-79', () => {
    expect(getScoreStyle(72).hex).toBe('#00C424');
  });
  it('returns durchschnitt for 60-69', () => {
    expect(getScoreStyle(65).hex).toBe('#D9AF00');
  });
  it('returns unterdurchschnitt for 45-59', () => {
    expect(getScoreStyle(50).hex).toBe('#ED7E07');
  });
  it('returns schwach for <45', () => {
    expect(getScoreStyle(30).hex).toBe('#DC0C00');
  });
  it('returns neutral for 0/null', () => {
    expect(getScoreStyle(0).hex).toBe('#555555');
    expect(getScoreStyle(0).label).toBe('N/A');
  });
  it('returns gold bonus for >100', () => {
    expect(getScoreStyle(113).hex).toBe('#FFD700');
    expect(getScoreStyle(113).label).toBe('Bonus');
  });
  // Convenience wrappers
  it('getScoreHex returns hex string', () => {
    expect(getScoreHex(85)).toBe('#00ADC4');
  });
  it('getScoreBg returns tailwind bg class', () => {
    expect(getScoreBg(85)).toContain('bg-');
  });
  it('getScoreTextClass returns tailwind text class', () => {
    expect(getScoreTextClass(85)).toContain('text-');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/player/__tests__/scoreColor.test.ts`
Expected: FAIL — functions don't exist yet

**Step 3: Write the implementation**

Rewrite `src/components/player/scoreColor.ts`:

```typescript
/** Unified 6-tier score color system — SINGLE SOURCE OF TRUTH.
 *  Used for ALL score displays: L5, L15, GW scores, match ratings, fantasy.
 *  Scale: 0-100 (with >100 bonus tier for fantasy captain multipliers). */

export interface ScoreStyle {
  hex: string;
  bg: string;       // Tailwind bg class
  text: string;      // Tailwind text class
  label: string;
  glow?: string;     // Optional CSS text-shadow
}

const TIERS: { min: number; hex: string; bg: string; text: string; label: string; glow?: string }[] = [
  { min: 100, hex: '#FFD700', bg: 'bg-gold',            text: 'text-gold',         label: 'Bonus',             glow: '0 0 10px rgba(255,215,0,0.5)' },
  { min: 90,  hex: '#374DF5', bg: 'bg-[#374DF5]',       text: 'text-[#374DF5]',    label: 'Elite',             glow: '0 0 10px rgba(55,77,245,0.5)' },
  { min: 80,  hex: '#00ADC4', bg: 'bg-[#00ADC4]',       text: 'text-[#00ADC4]',    label: 'Sehr gut' },
  { min: 70,  hex: '#00C424', bg: 'bg-[#00C424]',       text: 'text-[#00C424]',    label: 'Gut' },
  { min: 60,  hex: '#D9AF00', bg: 'bg-[#D9AF00]',       text: 'text-[#D9AF00]',    label: 'Durchschnitt' },
  { min: 45,  hex: '#ED7E07', bg: 'bg-[#ED7E07]',       text: 'text-[#ED7E07]',    label: 'Unterdurchschnitt' },
  { min: 1,   hex: '#DC0C00', bg: 'bg-[#DC0C00]',       text: 'text-[#DC0C00]',    label: 'Schwach' },
];

const NEUTRAL: ScoreStyle = { hex: '#555555', bg: 'bg-white/5', text: 'text-white/50', label: 'N/A' };

export function getScoreStyle(score: number | null | undefined): ScoreStyle {
  if (score == null || score <= 0) return NEUTRAL;
  for (const tier of TIERS) {
    if (score >= tier.min) return tier;
  }
  return NEUTRAL;
}

/** Convenience: hex color for inline styles */
export const getScoreHex = (score: number | null | undefined): string => getScoreStyle(score).hex;

/** Convenience: Tailwind bg class */
export const getScoreBg = (score: number | null | undefined): string => getScoreStyle(score).bg;

/** Convenience: Tailwind text class */
export const getScoreTextClass = (score: number | null | undefined): string => getScoreStyle(score).text;

/** Convenience: React.CSSProperties for badge backgrounds (replaces ratingHeatStyle) */
export const getScoreBadgeStyle = (score: number | null | undefined): React.CSSProperties => {
  const s = getScoreStyle(score);
  return {
    background: s.hex,
    color: '#fff',
    ...(s.glow ? { textShadow: s.glow } : {}),
  };
};

/** @deprecated Use getScoreHex — kept for migration only */
export const scoreColor = (score: number): string => getScoreHex(score);
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/player/__tests__/scoreColor.test.ts`
Expected: PASS

**Step 5: Commit**

```
feat: add unified getScoreStyle() — 6-tier 0-100 scoring system
```

---

## Task 2: Create `toScore()` converter and update `getRating()` → `getMatchScore()`

**Files:**
- Modify: `src/components/fantasy/spieltag/helpers.ts:62-64`
- Modify: `src/components/fantasy/spieltag/index.ts:10`

**Step 1: Replace `getRating` with `getMatchScore` in helpers.ts**

Replace lines 62-64 in `spieltag/helpers.ts`:

```typescript
// OLD:
export const getRating = (stat: { rating?: number | null; fantasy_points: number }): number =>
  stat.rating ?? stat.fantasy_points / 10;

// NEW:
/** Convert fixture stat to 0-100 BeScout score. Returns null if no API rating available. */
export const getMatchScore = (stat: { rating?: number | null }): number | null =>
  stat.rating != null ? Math.round(stat.rating * 10) : null;
```

**Step 2: Update barrel export in `spieltag/index.ts`**

```typescript
// OLD:
export { posColor, scoreBadgeColor, posOrder, getPosAccent, getRating } from './helpers';
// NEW:
export { posColor, scoreBadgeColor, posOrder, getPosAccent, getMatchScore } from './helpers';
```

**Step 3: Commit**

```
refactor: replace getRating (0-10) with getMatchScore (0-100)
```

---

## Task 3: Migrate Spieltag components to 0-100

**Files:**
- Modify: `src/components/fantasy/spieltag/TopScorerShowcase.tsx`
- Modify: `src/components/fantasy/spieltag/BestElevenShowcase.tsx`
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx`
- Modify: `src/components/fantasy/spieltag/fixture-tabs/FormationTab.tsx`
- Modify: `src/components/fantasy/spieltag/fixture-tabs/RankingTab.tsx`
- Modify: `src/components/fantasy/ergebnisse/PersonalResults.tsx`

In ALL these files, apply this pattern:

**Search-replace pattern for each component:**

```typescript
// OLD (everywhere):
import { ..., ratingHeatStyle, ... } from './helpers';
const rating = stat.rating ?? stat.fantasy_points / 10;
style={ratingHeatStyle(rating)}
{rating.toFixed(1)}

// NEW:
import { ..., getMatchScore, ... } from './helpers';
import { getScoreBadgeStyle } from '@/components/player/scoreColor';
const score = getMatchScore(stat);
style={getScoreBadgeStyle(score)}
{score ?? '–'}
```

**Specific changes per file:**

### TopScorerShowcase.tsx
- Line 10: Add import `getScoreBadgeStyle` from scoreColor, replace `ratingHeatStyle` import with `getMatchScore`
- Lines 27, 98, 127: `const rating = ...` → `const score = getMatchScore(stat);`
- Lines 49, 108, 142: `style={ratingHeatStyle(rating)}` → `style={getScoreBadgeStyle(score)}`
- Lines 51, 110, 144: `{rating.toFixed(1)}` → `{score ?? '–'}`

### BestElevenShowcase.tsx
- Line 10: Same import change
- Line 141: `const rating = ...` → `const score = getMatchScore(stat);`
- Line 149: `style={ratingHeatStyle(rating)}` → `style={getScoreBadgeStyle(score)}`
- Line 151: `{rating.toFixed(1)}` → `{score ?? '–'}`
- Lines 72, 97, 107, 130: Sorting by `(b.rating ?? 0)` → `(getMatchScore(b) ?? 0)`
- Line 220: avg calculation: `(p.rating ?? p.fantasy_points / 10)` → `(getMatchScore(p) ?? 0)`

### FixtureDetailModal.tsx
- Line 14: Same import change
- Lines 207, 351, 467-468: Same `getRating` → `getMatchScore` pattern
- All `ratingHeatStyle(rating)` → `getScoreBadgeStyle(score)`
- All `{rating.toFixed(1)}` → `{score ?? '–'}`

### FormationTab.tsx
- Line 9: Same import change
- Lines 237, 425, 686-687: Same pattern
- Line 686: `scoreBadgeColor(getRating(s))` → use inline `getScoreBadgeStyle(getMatchScore(s))` with `style=` instead of `className=`

### RankingTab.tsx
- Line 9: Same import change
- Line 23: `const rating = getRating(stat);` → `const score = getMatchScore(stat);`

### PersonalResults.tsx
- Line 9: Same import change
- Lines 41-44: `dpcAvgRating` → `dpcAvgScore`, use `getMatchScore` in reduce
- Line 61, 87-89: Same pattern

**Step: Run tsc after all changes**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

**Step: Commit**

```
refactor: migrate 6 Spieltag components from 0-10 to 0-100 scale
```

---

## Task 4: Migrate player detail components

**Files:**
- Modify: `src/components/player/detail/GameweekScoreBar.tsx:17-33`
- Modify: `src/components/player/detail/MatchTimeline.tsx:26-41`
- Modify: `src/components/player/detail/TradingCardFrame.tsx` (scoreColor import)
- Modify: `src/components/fantasy/FormBars.tsx` (scoreColor import)

### GameweekScoreBar.tsx
Delete local `getBarColor()` (lines 17-24) and `getScoreTextClass()` (lines 26-33). Replace with imports:

```typescript
import { getScoreHex, getScoreTextClass } from '@/components/player/scoreColor';
```

Replace usages:
- `getBarColor(score)` → `getScoreHex(score)`
- `getScoreTextClass(score)` → (already imported, same name)

Update legend (lines 136-148) to match new 6-tier thresholds:
```typescript
{[
  { min: 100, label: '100+', color: 'bg-gold' },
  { min: 90, label: '90\u201399', color: 'bg-[#374DF5]' },
  { min: 80, label: '80\u201389', color: 'bg-[#00ADC4]' },
  { min: 70, label: '70\u201379', color: 'bg-[#00C424]' },
  { min: 60, label: '60\u201369', color: 'bg-[#D9AF00]' },
  { min: 45, label: '45\u201359', color: 'bg-[#ED7E07]' },
  { min: 0, label: '<45', color: 'bg-[#DC0C00]' },
]}
```

### MatchTimeline.tsx
Delete local `scoreColor()` (lines 26-33) and `scoreTextClass()` (lines 35-41). Replace with imports:

```typescript
import { getScoreHex, getScoreTextClass } from '@/components/player/scoreColor';
```

Replace usages:
- `scoreColor(score)` → `getScoreHex(score)`
- `scoreTextClass(score)` → `getScoreTextClass(score)`

### TradingCardFrame.tsx
- Line 8: `import { scoreColor } from '@/components/player/scoreColor';` → `import { getScoreHex } from '@/components/player/scoreColor';`
- All `scoreColor(entry.score)` → `getScoreHex(entry.score)`

### FormBars.tsx
- Line 4: `import { scoreColor } from '@/components/player/scoreColor';` → `import { getScoreHex } from '@/components/player/scoreColor';`
- All `scoreColor(entry.score)` → `getScoreHex(entry.score)`

**Step: Commit**

```
refactor: migrate player detail + FormBars to unified getScoreStyle
```

---

## Task 5: Migrate L5 functions and LineupPanel

**Files:**
- Modify: `src/components/player/index.tsx:18-44`
- Modify: `src/components/fantasy/helpers.ts:53-57`
- Modify: `src/components/fantasy/event-tabs/LineupPanel.tsx`

### player/index.tsx — L5 functions

Update `L5_THRESHOLDS` and delegate to unified system:

```typescript
// OLD:
export const L5_THRESHOLDS = { good: 65, mid: 45 } as const;

export function getL5Color(l5: number): string {
  if (l5 >= L5_THRESHOLDS.good) return 'text-emerald-300';
  if (l5 >= L5_THRESHOLDS.mid) return 'text-amber-300';
  if (l5 > 0) return 'text-red-300';
  return 'text-white/50';
}

export function getL5Hex(l5: number): string {
  if (l5 >= L5_THRESHOLDS.good) return '#6ee7b7';
  if (l5 >= L5_THRESHOLDS.mid) return '#fcd34d';
  if (l5 > 0) return '#fca5a5';
  return '#555';
}

export function getL5Bg(l5: number): string {
  if (l5 >= L5_THRESHOLDS.good) return 'bg-emerald-500/15';
  if (l5 >= L5_THRESHOLDS.mid) return 'bg-amber-500/15';
  if (l5 > 0) return 'bg-red-500/15';
  return 'bg-white/5';
}

// NEW:
import { getScoreStyle } from './scoreColor';

export const L5_THRESHOLDS = { good: 70, mid: 60 } as const;

/** Tailwind text class for L5/L15 score */
export function getL5Color(l5: number): string { return getScoreStyle(l5).text; }

/** Hex color for L5/L15 (inline styles, SVG) */
export function getL5Hex(l5: number): string { return getScoreStyle(l5).hex; }

/** Tailwind bg class for L5/L15 pill backgrounds */
export function getL5Bg(l5: number): string {
  const s = getScoreStyle(l5);
  return l5 > 0 ? `${s.bg}/15` : 'bg-white/5';
}
```

Also update `ScoreCircle` tone mapping (line 108):
```typescript
// OLD:
const tone = value >= L5_THRESHOLDS.good ? 'good' : value >= L5_THRESHOLDS.mid ? 'mid' : value > 0 ? 'bad' : 'neutral';

// NEW:
const tone = value >= 70 ? 'good' : value >= 60 ? 'mid' : value > 0 ? 'bad' : 'neutral';
```

### fantasy/helpers.ts — getScoreColor

Replace lines 53-57:
```typescript
// OLD:
export const getScoreColor = (score: number): string => {
  if (score >= 100) return '#FFD700';
  if (score >= 70) return '#ffffff';
  return '#ff6b6b';
};

// NEW:
import { getScoreHex } from '@/components/player/scoreColor';
export const getScoreColor = (score: number): string => getScoreHex(score);
```

### LineupPanel — follows automatically via `getScoreColor` delegation

No direct changes needed — `getScoreColor` now delegates to unified function.

**Step: Commit**

```
refactor: L5 functions + LineupPanel delegate to unified getScoreStyle
```

---

## Task 6: Remove old functions and clean up exports

**Files:**
- Modify: `src/components/fantasy/spieltag/helpers.ts` — remove `scoreBadgeColor`, `ratingHeatStyle`, `getRating`
- Modify: `src/components/fantasy/spieltag/index.ts` — update exports
- Modify: `src/components/player/index.tsx` — update re-export
- Modify: `src/components/player/scoreColor.ts` — remove deprecated `scoreColor` alias

**Step 1: Remove from spieltag/helpers.ts**

Delete `scoreBadgeColor()` (lines 15-22), `ratingHeatStyle()` (lines 67-74), `getRating()` (lines 63-64).

Keep: `posColor`, `posOrder`, `getPosAccent`, `getStatusAccent`, `getRingFrameClass`, `getMatchScore`.

**Step 2: Update spieltag/index.ts**

```typescript
export { posColor, posOrder, getPosAccent, getMatchScore } from './helpers';
```

Remove `scoreBadgeColor` and `getRating` from exports.

**Step 3: Remove deprecated alias from scoreColor.ts**

Delete the last line:
```typescript
export const scoreColor = (score: number): string => getScoreHex(score);
```

Update `player/index.tsx` export:
```typescript
// OLD:
export { scoreColor } from './scoreColor';
// NEW:
export { getScoreStyle, getScoreHex, getScoreBg, getScoreTextClass, getScoreBadgeStyle } from './scoreColor';
```

**Step 4: Run tsc**

Run: `npx tsc --noEmit`
Fix any remaining import errors.

**Step 5: Commit**

```
refactor: remove 4 old color functions + deprecated aliases
```

---

## Task 7: Remove fake score fallback from data pipeline

**Files:**
- Modify: `src/lib/services/footballData.ts:505-513`
- Modify: `src/lib/footballApi.ts:165-225` (keep `calcFantasyPoints` but remove `scaleFormulaToRating`)

### footballData.ts — sync pipeline

```typescript
// OLD (line 505-513):
const rating = stat.games.rating ? parseFloat(stat.games.rating) : null;
const fantasyPoints = rating
  ? Math.round(rating * 10)
  : scaleFormulaToRating(calcFantasyPoints(
      ourPlayer.position, minutes, goals, assists,
      isCleanSheet && minutes >= 60, goalsConceded,
      yellowCard, redCard, saves, 0
    ));

// NEW:
const apiRating = stat.games.rating ? parseFloat(stat.games.rating) : null;
const fantasyPoints = apiRating != null ? Math.round(apiRating * 10) : null;
```

Also update the object being pushed — `fantasy_points` type must accept `null`.
Where `fantasyPoints` is inserted into `player_gameweek_scores.score`, it should skip the insert if null (player has no score for this gameweek).

### footballApi.ts — remove scaleFormulaToRating

Delete `scaleFormulaToRating()` function (lines 221-225).
Keep `calcFantasyPoints()` — it's still used by the Fantasy Event scoring RPC, just no longer as a score fallback.

Remove `scaleFormulaToRating` from imports in `footballData.ts`.

**Step: Run tests**

Run: `npx vitest run src/lib/services/__tests__/footballData.test.ts`
Fix any test expectations that relied on the fallback.

**Step: Commit**

```
fix: remove fake score fallback — null rating = no score, not formula guess
```

---

## Task 8: Update test mocks and run full verification

**Files:**
- Modify: `src/components/fantasy/spieltag/__tests__/FixtureDetailModal.test.tsx:61-65`
- Modify: All test files that mock old color functions
- Run: Full test suite

### FixtureDetailModal.test.tsx mock

```typescript
// OLD:
ratingHeatStyle: () => ({ background: '#00C424', color: '#fff' }),
getRating: (stat: { rating?: number | null; fantasy_points: number }) =>
  stat.rating ?? stat.fantasy_points / 10,

// NEW:
getMatchScore: (stat: { rating?: number | null }) =>
  stat.rating != null ? Math.round(stat.rating * 10) : null,
```

Add mock for scoreColor:
```typescript
vi.mock('@/components/player/scoreColor', () => ({
  getScoreBadgeStyle: () => ({ background: '#00C424', color: '#fff' }),
  getScoreHex: () => '#00C424',
  getScoreTextClass: () => 'text-[#00C424]',
}));
```

### Full verification

Run in parallel:
```bash
npx tsc --noEmit
npx vitest run
```

Expected: ALL PASS

**Step: Commit**

```
test: update mocks for unified scoring system
```

---

## Task 9: Clean up stale DB data (fake scores)

**Files:**
- Migration: `supabase/migrations/YYYYMMDD_cleanup_fake_scores.sql`

SQL to remove gameweek scores that were generated by the formula fallback for players with no API rating:

```sql
-- Remove gameweek scores for players who had no API rating in that fixture
-- These were generated by the now-removed scaleFormulaToRating fallback
DELETE FROM player_gameweek_scores pgs
WHERE NOT EXISTS (
  SELECT 1 FROM fixture_player_stats fps
  JOIN fixtures f ON f.id = fps.fixture_id
  WHERE fps.player_id = pgs.player_id
    AND f.gameweek = pgs.gameweek
    AND fps.rating IS NOT NULL
);

-- Recalculate L5/L15/Season after cleanup
SELECT cron_recalc_perf();
```

**CAUTION:** Run this in a transaction, verify count before committing.
Test on a single player first.

**Step: Commit**

```
fix: remove formula-generated fake scores from player_gameweek_scores
```

---

## Summary

| Task | Scope | Files |
|------|-------|-------|
| 1. Create `getScoreStyle()` | New function + tests | 2 |
| 2. `getRating` → `getMatchScore` | Spieltag helpers | 2 |
| 3. Migrate Spieltag components | 5.5-10 → 0-100 display | 6 |
| 4. Migrate player detail | Unified colors | 4 |
| 5. Migrate L5 + LineupPanel | Delegate to unified | 3 |
| 6. Remove old functions | Clean up exports | 4 |
| 7. Remove fallback scoring | Data pipeline fix | 2 |
| 8. Update tests | Mocks + verification | ~7 |
| 9. Clean DB data | Migration | 1 |
| **Total** | | **~31 files** |
