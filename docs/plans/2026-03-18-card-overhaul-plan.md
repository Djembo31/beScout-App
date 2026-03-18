# Card Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign TradingCardFrame front (3 visual zones, SVG flags, appearance bars) and back (trading data + contract + performance percentiles).

**Architecture:** Modify TradingCardFrame.tsx front and back faces, extend Player type with l5Apps/l15Apps/season, add country-flag-icons for SVG flags, DB migration for appearance columns.

**Tech Stack:** Next.js 14, TypeScript, Tailwind, country-flag-icons (React SVG), Supabase (migration + RPC)

**Spec:** `memory/features/card-overhaul.md`

---

### Task 1: Install country-flag-icons + create Flag component

**Files:**
- Create: `src/components/ui/CountryFlag.tsx`
- Modify: `package.json` (npm install)

**Step 1: Install package**

Run: `npm install country-flag-icons`
Expected: Added to dependencies

**Step 2: Create CountryFlag wrapper component**

```tsx
// src/components/ui/CountryFlag.tsx
'use client';

import React, { useMemo } from 'react';
import { hasFlag } from 'country-flag-icons';
import { cn } from '@/lib/utils';

interface CountryFlagProps {
  code: string;       // 2-letter ISO code (e.g. "TR", "XK")
  size?: number;       // height in px (width auto via 3:2 aspect)
  className?: string;
}

export default function CountryFlag({ code, size = 16, className }: CountryFlagProps) {
  const upperCode = code?.toUpperCase() ?? '';

  const FlagComponent = useMemo(() => {
    if (!upperCode || !hasFlag(upperCode)) return null;
    // Dynamic import not possible in render — use require for sync
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(`country-flag-icons/react/3x2/${upperCode}`);
      return mod.default || mod;
    } catch {
      return null;
    }
  }, [upperCode]);

  if (!FlagComponent) {
    // Fallback: 2-letter code in a styled badge
    return (
      <span
        className={cn('inline-flex items-center justify-center rounded-sm bg-white/10 text-[8px] font-bold text-white/50', className)}
        style={{ width: size * 1.5, height: size }}
      >
        {upperCode}
      </span>
    );
  }

  return (
    <FlagComponent
      title={upperCode}
      className={cn('rounded-sm shrink-0', className)}
      style={{ height: size, width: size * 1.5 }}
    />
  );
}
```

**Step 3: Verify it works**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 4: Commit**

```
git add src/components/ui/CountryFlag.tsx package.json package-lock.json
git commit -m "feat: add CountryFlag component with country-flag-icons SVG"
```

---

### Task 2: DB Migration + Type extensions

**Files:**
- Modify: `src/types/index.ts:40` (Player.perf)
- Modify: `src/lib/services/players.ts:14-21` (PLAYER_SELECT_COLS + dbToPlayer)

**Step 1: Apply DB migration via Supabase MCP**

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS l5_appearances SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS l15_appearances SMALLINT NOT NULL DEFAULT 0;
```

**Step 2: Extend Player type**

In `src/types/index.ts:40`, change:
```typescript
// BEFORE:
perf: { l5: number; l15: number; trend: Trend };

// AFTER:
perf: { l5: number; l15: number; l5Apps: number; l15Apps: number; season: number; trend: Trend };
```

**Step 3: Update PLAYER_SELECT_COLS**

In `src/lib/services/players.ts`, add to the SELECT string:
```
'l5_appearances', 'l15_appearances'
```

**Step 4: Update DbPlayer type**

In `src/types/index.ts` (DbPlayer interface), add:
```typescript
l5_appearances: number;
l15_appearances: number;
```

**Step 5: Update dbToPlayer mapping**

In `src/lib/services/players.ts`, change perf mapping:
```typescript
// BEFORE:
perf: {
  l5: Number(db.perf_l5),
  l15: Number(db.perf_l15),
  trend: ...
},

// AFTER:
perf: {
  l5: Number(db.perf_l5),
  l15: Number(db.perf_l15),
  l5Apps: db.l5_appearances ?? 0,
  l15Apps: db.l15_appearances ?? 0,
  season: Number(db.perf_season),
  trend: ...
},
```

**Step 6: Run existing tests**

Run: `npx vitest run src/lib/services/__tests__/players.test.ts`
Expected: Some tests may fail if mock data doesn't include new fields — fix mock.

**Step 7: Fix test mock**

In `src/lib/services/__tests__/players.test.ts`, add to `createMockDbPlayer`:
```typescript
l5_appearances: 4,
l15_appearances: 12,
```

**Step 8: Verify**

Run: `npx tsc --noEmit && npx vitest run src/lib/services/__tests__/players.test.ts`
Expected: PASS

**Step 9: Commit**

```
git add src/types/index.ts src/lib/services/players.ts src/lib/services/__tests__/players.test.ts
git commit -m "feat: extend Player type with l5Apps, l15Apps, season perf fields"
```

---

### Task 3: TradingCardFrame — Front face redesign

**Files:**
- Modify: `src/components/player/detail/TradingCardFrame.tsx`

**Step 1: Update props interface**

Replace `CardBackData` with updated version from spec. Add `l5Apps`, `l15Apps` props.

```typescript
interface TradingCardFrameProps {
  first: string;
  last: string;
  pos: Pos;
  club: string;
  shirtNumber: number;
  imageUrl?: string | null;
  l5: number;
  l5Apps: number;       // NEW
  l15Apps: number;      // NEW
  edition?: string;
  className?: string;
  backData?: CardBackData;
  age?: number;
  country?: string;
  masteryLevel?: number;
}
```

Update `CardBackData`:
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
  percentiles: {
    l5: number;
    l15: number;
    season: number;
    minutes: number;
  };
}
```

**Step 2: Import CountryFlag**

Add at top: `import CountryFlag from '@/components/ui/CountryFlag';`

**Step 3: Replace flag emoji with CountryFlag SVG**

In Top Bar, replace:
```tsx
// BEFORE:
{flag && <span className="text-base leading-none" aria-label={country}>{flag}</span>}

// AFTER:
{country && <CountryFlag code={country} size={14} />}
```

Remove `countryToFlag` import and `flag` variable.

**Step 4: Add # prefix to shirt number**

In Position Pill:
```tsx
// BEFORE:
{pos} {shirtNumber > 0 && <span className="font-mono tabular-nums">{shirtNumber}</span>}

// AFTER:
{pos} {shirtNumber > 0 && <span className="font-mono tabular-nums">#{shirtNumber}</span>}
```

**Step 5: Replace 2x3 FIFA Grid with 3 visual zones**

Remove the `FifaStat` grid. Replace with:

```tsx
{/* ── Performance Zone ── */}
<div className="flex justify-center gap-6 px-4 mt-2 md:mt-3">
  {/* L5 */}
  <div className="flex-1">
    <div className="flex items-baseline gap-1 justify-center">
      <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${tint}90` }}>L5</span>
      <span className="text-[22px] md:text-[26px] font-black text-white/90 leading-none tabular-nums font-mono">{l5}</span>
    </div>
    <div className="mt-1 flex items-center gap-1">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(l5Apps / 5) * 100}%`, backgroundColor: tint }} />
      </div>
      <span className="text-[7px] font-mono text-white/30 tabular-nums w-[22px] text-right">{Math.round((l5Apps / 5) * 100)}%</span>
    </div>
  </div>
  {/* L15 */}
  <div className="flex-1">
    <div className="flex items-baseline gap-1 justify-center">
      <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${tint}90` }}>L15</span>
      <span className="text-[22px] md:text-[26px] font-black text-white/90 leading-none tabular-nums font-mono">{backData?.l15 ?? '\u2014'}</span>
    </div>
    <div className="mt-1 flex items-center gap-1">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(l15Apps / 15) * 100}%`, backgroundColor: tint }} />
      </div>
      <span className="text-[7px] font-mono text-white/30 tabular-nums w-[22px] text-right">{Math.round((l15Apps / 15) * 100)}%</span>
    </div>
  </div>
</div>

{/* Separator */}
<div className="mx-4 mt-2">
  <div className="h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${tint}30 20%, ${tint}50 50%, ${tint}30 80%, transparent 100%)` }} />
</div>

{/* ── Stats Zone (Goals | Assists | Matches) ── */}
<div className="flex justify-center gap-4 px-4 mt-1.5">
  <div className="flex flex-col items-center">
    <span className="text-[16px] md:text-[18px] font-black text-white/70 tabular-nums font-mono">{backData?.stats?.goals ?? '\u2014'}</span>
    <span className="text-[7px] font-bold uppercase tracking-wider text-white/30">{tp('statGoalsShort')}</span>
  </div>
  <div className="flex flex-col items-center">
    <span className="text-[16px] md:text-[18px] font-black text-white/70 tabular-nums font-mono">{backData?.stats?.assists ?? '\u2014'}</span>
    <span className="text-[7px] font-bold uppercase tracking-wider text-white/30">{tp('statAssistsShort')}</span>
  </div>
  <div className="flex flex-col items-center">
    <span className="text-[16px] md:text-[18px] font-black text-white/70 tabular-nums font-mono">{backData?.stats?.matches ?? '\u2014'}</span>
    <span className="text-[7px] font-bold uppercase tracking-wider text-white/30">{tp('statMatchesShort')}</span>
  </div>
</div>

{/* Separator */}
<div className="mx-4 mt-1.5">
  <div className="h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${tint}20 30%, ${tint}20 70%, transparent 100%)` }} />
</div>

{/* ── Price Zone ── */}
<div className="flex items-baseline justify-center gap-1.5 mt-1.5">
  <span className="text-[18px] md:text-[20px] font-mono font-black tabular-nums text-gold">
    {backData?.floorPrice != null ? fmtScout(backData.floorPrice) : '\u2014'}
  </span>
  <span className="text-[8px] font-bold text-gold/50 uppercase">Credits</span>
</div>
```

**Step 6: Verify**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 7: Commit**

```
git commit -m "feat: card front — 3 visual zones, SVG flags, #shirt, appearance bars"
```

---

### Task 4: TradingCardFrame — Back face redesign

**Files:**
- Modify: `src/components/player/detail/TradingCardFrame.tsx`

**Step 1: Replace back face content**

Keep the carbon + tint background layers. Replace inner content with:

**Trading Block:**
- Section label "SCOUT CARD DATA"
- 2x2 MetricCell grid (Marktwert, Floor, 24h, Fee Cap)
- Contract row: "Vertrag: 18M" (only if contractMonths > 0)
- Holdings row (only if holdingQty > 0)

**Label-Divider:** "LEISTUNG" with tint gradient lines

**Performance Bars:** 4 SLIM (h-1) percentile bars:
- L5 percentile (NOT the raw score — the percentile vs. position)
- L15 percentile
- Season Avg percentile (perf_season)
- Minutes percentile

Labels: L5 / L15 / AVG / MIN

**Step 2: Add i18n key for contract**

Key: `tp('cardBack.contract')` → "Vertrag" (DE) / "Sözleşme" (TR)

**Step 3: Remove old StatBar and unused FifaStat from back**

Clean up any remaining old back-face code.

**Step 4: Verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
git commit -m "feat: card back — trading grid, contract, slim percentile bars"
```

---

### Task 5: PlayerHero + PlayerContent — wire new props

**Files:**
- Modify: `src/components/player/detail/PlayerHero.tsx`
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx`

**Step 1: Update PlayerHero backData computation**

Change percentile calculation to use L5/L15/Season/Minutes instead of Goals/Assists:

```typescript
percentiles: {
  l5: pct(player.perf.l5, p => p.perf.l5),
  l15: pct(player.perf.l15, p => p.perf.l15),
  season: pct(player.perf.season, p => p.perf.season),
  minutes: pct(player.stats.minutes, p => p.stats.minutes),
},
```

Add `contractMonths` to backData:
```typescript
contractMonths: player.contractMonthsLeft,
```

Remove `stats` from CardBackData (front face reads from own props now).

**Step 2: Pass l5Apps and l15Apps to TradingCardFrame**

```tsx
<TradingCardFrame
  ...
  l5Apps={player.perf.l5Apps}
  l15Apps={player.perf.l15Apps}
  ...
/>
```

**Step 3: Add CountryFlag to PlayerHero info**

Replace country text with `<CountryFlag code={player.country} size={14} />` in the hero info line too.

**Step 4: Verify**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```
git commit -m "feat: wire new card props through PlayerHero + PlayerContent"
```

---

### Task 6: i18n keys + cleanup

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Add/update i18n keys**

```json
// player.cardBack namespace:
{
  "contract": "Vertrag",
  "contractMonths": "{count}M",
  "statL5": "L5",
  "statL15": "L15",
  "statAVG": "AVG",
  "statMIN": "MIN"
}
```

TR translations:
```json
{
  "contract": "Sözleşme",
  "contractMonths": "{count}A",
  "statL5": "L5",
  "statL15": "L15",
  "statAVG": "ORT",
  "statMIN": "DK"
}
```

**Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/de.json','utf8')); console.log('OK')"`

**Step 3: Commit**

```
git commit -m "feat(i18n): add card back contract + performance bar keys (DE+TR)"
```

---

### Task 7: Verification + Visual QA

**Files:** None (verification only)

**Step 1: TypeScript**

Run: `npx tsc --noEmit`
Expected: 0 errors

**Step 2: Tests**

Run: `npx vitest run src/lib/services/__tests__/players.test.ts`
Expected: All pass

**Step 3: Visual QA**

1. Query DB for player with complete data:
```sql
SELECT id, first_name, last_name FROM players
WHERE age IS NOT NULL AND image_url IS NOT NULL
AND shirt_number IS NOT NULL AND nationality IS NOT NULL
LIMIT 1;
```
2. Start dev server, navigate to that player
3. Screenshot front face — verify:
   - SVG flag visible (not text code)
   - #shirt number
   - L5/L15 with slim appearance bars
   - Goals/Assists/Matches grouped
   - Floor price in Gold
4. Click to flip — verify back face:
   - Trading grid (Marktwert, Floor, 24h, Fee Cap)
   - Contract row
   - 4 slim percentile bars (L5/L15/AVG/MIN)
   - No Goals/Assists on back

**Step 4: Dispatch reviewer agent**

Reviewer checks: spec compliance, no duplicated data, all requirements met.

**Step 5: Commit if all pass**

---

Plan complete and saved to `docs/plans/2026-03-18-card-overhaul-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
