# Club Verkauf Tab Redesign — Von Prototyp zu Verkaufsinstrument

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Club Verkauf tab from a functional prototype into a compelling sales interface where clubs sell DPCs like shops on Amazon — with urgency, scarcity, club identity, and intuitive navigation for new and returning users.

**Architecture:** Replace the current flat tile grid with a layered layout: urgency strip (ending soon) at top, visual league bar for navigation, enlarged club cards with embedded player previews + sold counters + prominent countdowns. Progressive filter disclosure keeps it simple for new users. Followed clubs are prioritized. Reuse existing components (`PlayerIdentity`, `CountdownBadge`, `PlayerPhoto`, `getL5Color`, `countryToFlag`) extensively.

**Tech Stack:** React 18, Tailwind CSS (dark mode), Zustand v5 (marketStore), next-intl, lucide-react, existing player/ui components.

---

## Existing Code Map

| File | Role | Action |
|------|------|--------|
| `src/components/market/ClubVerkaufSection.tsx` | Orchestrator | **Rewrite** — new layout hierarchy |
| `src/components/market/ClubTile.tsx` | Club card (small) | **Rewrite** → `ClubCard.tsx` (large, with player preview) |
| `src/components/market/ClubAccordion.tsx` | Expanded player list | **Modify** — a11y, mobile progress |
| `src/components/market/PlayerIPORow.tsx` | Player row in accordion | **Modify** — mobile progress, a11y |
| `src/components/market/CountdownBadge.tsx` | Countdown timer | **Modify** — add prominent (non-compact) mode |
| `src/components/market/HotSalesCarousel.tsx` | Dead placeholder | **Replace** → `EndingSoonStrip.tsx` |
| `src/components/market/MarketFilters.tsx` | Filter logic + UI | **Reuse** — `applyFilters`/`applySorting` logic |
| `src/lib/stores/marketStore.ts` | UI state | **Modify** — add `showAdvancedFilters` |
| `src/lib/clubs.ts` | Club cache with `country` field | **Reuse** — `countryToFlag(club.country)` |
| `src/components/player/index.tsx` | PlayerIdentity, PlayerPhoto, getL5Color | **Reuse** as-is |
| `src/lib/utils.ts` | `countryToFlag()`, `fmtScout()`, `cn()` | **Reuse** as-is |
| `src/components/onboarding/NewUserTip.tsx` | Dismissable tip | **Reuse** for DPC explainer |
| `src/components/providers/ClubProvider.tsx` | `useClub().followedClubs` | **Reuse** for personalization |

## Shared Types (already exist, no changes)

```ts
// src/types/index.ts
DbIpo: { sold, total_offered, ends_at, price, status, player_id }
Player: { id, first, last, pos, club, perf.l5, stats, imageUrl, ... }
ClubLookup: { name, short, logo, colors.primary, league, country }
```

---

## Task 1: EndingSoonStrip — Replace dead HotSalesCarousel

Replaces the placeholder `HotSalesCarousel.tsx` with a real urgency section showing the 3–5 IPOs ending soonest.

**Files:**
- Rewrite: `src/components/market/HotSalesCarousel.tsx` → rename to `EndingSoonStrip.tsx`
- Delete: `src/components/market/HotSalesCarousel.tsx`

**Step 1: Create `EndingSoonStrip.tsx`**

```tsx
// src/components/market/EndingSoonStrip.tsx
'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { PlayerPhoto, getL5Color } from '@/components/player';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo } from '@/types';

interface EndingSoonStripProps {
  activeIpos: DbIpo[];
  playerMap: Map<string, Player>;
  onBuy: (playerId: string) => void;
  buyingId: string | null;
  max?: number;
}

export default function EndingSoonStrip({ activeIpos, playerMap, onBuy, buyingId, max = 5 }: EndingSoonStripProps) {
  const t = useTranslations('market');

  const endingSoon = useMemo(() => {
    const now = Date.now();
    return activeIpos
      .filter(ipo => new Date(ipo.ends_at).getTime() > now)
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
      .slice(0, max)
      .map(ipo => ({ ipo, player: playerMap.get(ipo.player_id) }))
      .filter((x): x is { ipo: DbIpo; player: Player } => !!x.player);
  }, [activeIpos, playerMap, max]);

  if (endingSoon.length === 0) return null;

  return (
    <section aria-label={t('endingSoonLabel', { defaultMessage: 'Endet bald' })}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="size-4 text-vivid-red" aria-hidden="true" />
        <h3 className="text-xs font-black text-vivid-red uppercase tracking-wide">
          {t('endingSoon', { defaultMessage: 'Endet bald' })}
        </h3>
      </div>
      <div
        className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {endingSoon.map(({ ipo, player: p }) => {
          const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
          const remaining = ipo.total_offered - ipo.sold;
          return (
            <Link
              key={ipo.id}
              href={`/player/${p.id}`}
              className="flex-shrink-0 w-[200px] bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 hover:border-white/[0.15] transition-colors group"
            >
              <div className="flex items-center gap-2 mb-2">
                <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-white truncate">{p.first} {p.last}</div>
                  <div className="text-[9px] text-white/30 truncate">{p.club}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-1.5">
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-vivid-green transition-all"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-white/40 tabular-nums font-mono">
                    {ipo.sold}/{ipo.total_offered}
                  </span>
                  <span className="text-[9px] text-white/40 tabular-nums font-mono">
                    {t('remainingCount', { count: remaining, defaultMessage: '{count} übrig' })}
                  </span>
                </div>
              </div>

              {/* Price + Countdown */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-sm text-gold tabular-nums">
                  {fmtScout(centsToBsd(ipo.price))}
                </span>
                <CountdownBadge targetDate={ipo.ends_at} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
```

**Step 2: Update `ClubVerkaufSection.tsx` import**

Replace:
```tsx
import HotSalesCarousel from './HotSalesCarousel';
```
With:
```tsx
import EndingSoonStrip from './EndingSoonStrip';
```

And replace `<HotSalesCarousel />` with:
```tsx
<EndingSoonStrip
  activeIpos={activeIpos}
  playerMap={playerMap}
  onBuy={onIpoBuy}
  buyingId={buyingId}
/>
```

**Step 3: Delete `HotSalesCarousel.tsx`**

**Step 4: Build + verify**

Run: `npx next build`
Expected: 0 errors

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(market): replace HotSalesCarousel with EndingSoonStrip showing real urgency data"
```

---

## Task 2: LeagueBar — Visual league navigation with flags

Replace the boring `<select>` dropdown with a horizontal scrollable league bar showing country flags.

**Files:**
- Create: `src/components/market/LeagueBar.tsx`
- Modify: `src/components/market/ClubVerkaufSection.tsx` (replace select)

**Step 1: Create `LeagueBar.tsx`**

```tsx
// src/components/market/LeagueBar.tsx
'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getAllClubsCached } from '@/lib/clubs';
import { countryToFlag, cn } from '@/lib/utils';

interface LeagueBarProps {
  selected: string;
  onSelect: (league: string) => void;
}

type LeagueInfo = {
  name: string;
  country: string;
  clubCount: number;
};

export default function LeagueBar({ selected, onSelect }: LeagueBarProps) {
  const t = useTranslations('market');

  const leagues = useMemo(() => {
    const allClubs = getAllClubsCached();
    const map = new Map<string, LeagueInfo>();
    for (const c of allClubs) {
      if (!c.league) continue;
      const existing = map.get(c.league);
      if (existing) {
        existing.clubCount++;
      } else {
        map.set(c.league, { name: c.league, country: c.country, clubCount: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.clubCount - a.clubCount);
  }, []);

  if (leagues.length <= 1) return null;

  return (
    <nav
      aria-label={t('leagueNavLabel', { defaultMessage: 'Liga-Navigation' })}
      className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <button
        onClick={() => onSelect('')}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 min-h-[44px] border',
          selected === ''
            ? 'bg-white/[0.10] text-white border-white/[0.15]'
            : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.04]'
        )}
        aria-pressed={selected === ''}
      >
        {t('allLeagues', { defaultMessage: 'Alle' })}
      </button>
      {leagues.map(l => (
        <button
          key={l.name}
          onClick={() => onSelect(l.name === selected ? '' : l.name)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0 min-h-[44px] border',
            selected === l.name
              ? 'bg-white/[0.10] text-white border-white/[0.15]'
              : 'text-white/40 border-transparent hover:text-white/60 hover:bg-white/[0.04]'
          )}
          aria-pressed={selected === l.name}
        >
          <span className="text-sm" aria-hidden="true">{countryToFlag(l.country)}</span>
          <span className="truncate max-w-[120px]">{l.name}</span>
        </button>
      ))}
    </nav>
  );
}
```

**Step 2: Replace select in `ClubVerkaufSection.tsx`**

Replace the `<select>` block (lines 158-168) with:
```tsx
<LeagueBar selected={clubVerkaufLeague} onSelect={setClubVerkaufLeague} />
```

Add import:
```tsx
import LeagueBar from './LeagueBar';
```

Remove unused `leagues` useMemo (lines 83-90).

**Step 3: Build + verify**

Run: `npx next build`

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(market): replace league dropdown with visual LeagueBar with country flags"
```

---

## Task 3: ClubCard — Bigger cards with player preview + scarcity

Replace the small `ClubTile` with a larger `ClubCard` that shows top 2-3 players, sold/total progress, and a prominent countdown.

**Files:**
- Rewrite: `src/components/market/ClubTile.tsx` → `ClubCard.tsx`
- Modify: `src/components/market/ClubVerkaufSection.tsx` (wire new component + pass data)

**Step 1: Create `ClubCard.tsx`**

```tsx
// src/components/market/ClubCard.tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Flame } from 'lucide-react';
import { PlayerPhoto, getL5Color } from '@/components/player';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import type { ClubLookup } from '@/lib/clubs';
import type { Player, DbIpo } from '@/types';
import { centsToBsd } from '@/lib/services/players';

interface ClubCardProps {
  club: ClubLookup;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  totalSold: number;
  totalOffered: number;
  earliestEnd: string | null;
  isHot: boolean;
  isExpanded: boolean;
  isFollowed: boolean;
  onToggle: () => void;
}

export default function ClubCard({
  club, players, ipoMap, totalSold, totalOffered,
  earliestEnd, isHot, isExpanded, isFollowed, onToggle,
}: ClubCardProps) {
  const t = useTranslations('market');
  const pc = club.colors.primary;
  const progress = totalOffered > 0 ? (totalSold / totalOffered) * 100 : 0;
  // Top 3 players by L5
  const topPlayers = players.slice(0, 3);

  return (
    <button
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-label={t('clubCardLabel', {
        club: club.name,
        count: players.length,
        defaultMessage: '{club} — {count} DPCs verfügbar',
      })}
      className={cn(
        'relative w-full text-left rounded-2xl border p-3.5 transition-colors group',
        isExpanded
          ? 'bg-white/[0.06] border-white/[0.15]'
          : 'bg-surface-base border-white/[0.08] hover:border-white/[0.12]'
      )}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: pc,
        backgroundImage: `linear-gradient(135deg, ${pc}18, transparent 50%)`,
      }}
    >
      {/* Top-right badges */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        {isFollowed && (
          <span className="px-1.5 py-0.5 bg-gold/15 rounded text-[9px] font-black text-gold">
            {t('followedBadge', { defaultMessage: 'Mein Club' })}
          </span>
        )}
        {isHot && (
          <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-vivid-red/15 rounded text-[9px] font-black text-vivid-red">
            <Flame className="size-2.5" aria-hidden="true" />
            HOT
          </span>
        )}
      </div>

      {/* Club identity — larger */}
      <div className="flex items-center gap-3 mb-3">
        {club.logo ? (
          <img src={club.logo} alt="" className="size-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white/10" />
        ) : (
          <div className="size-10 rounded-full flex-shrink-0 border-2 border-white/10" style={{ backgroundColor: pc }} />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-black text-sm text-white truncate">{club.name}</div>
          <div className="text-[10px] text-white/40 truncate">{club.league}</div>
        </div>
      </div>

      {/* Top players preview */}
      <div className="space-y-1 mb-3">
        {topPlayers.map(p => {
          const ipo = ipoMap.get(p.id);
          return (
            <div key={p.id} className="flex items-center gap-2 text-[11px]">
              <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={20} />
              <span className="text-white/70 truncate flex-1">{p.last}</span>
              <span className={cn('font-mono font-bold tabular-nums', getL5Color(p.perf.l5))}>{p.perf.l5}</span>
              {ipo && (
                <span className="font-mono font-bold text-gold tabular-nums">
                  {fmtScout(centsToBsd(ipo.price))}
                </span>
              )}
            </div>
          );
        })}
        {players.length > 3 && (
          <div className="text-[10px] text-white/30 pl-7">
            +{players.length - 3} {t('morePlayers', { defaultMessage: 'weitere' })}
          </div>
        )}
      </div>

      {/* Scarcity bar */}
      <div className="mb-2">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-vivid-green transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-0.5 text-[10px] tabular-nums font-mono">
          <span className="text-white/40">{totalSold}/{totalOffered} {t('sold', { defaultMessage: 'verkauft' })}</span>
          <span className="text-white/50">{totalOffered - totalSold} {t('available', { defaultMessage: 'verfügbar' })}</span>
        </div>
      </div>

      {/* Countdown + expand hint */}
      <div className="flex items-center justify-between">
        {earliestEnd ? (
          <CountdownBadge targetDate={earliestEnd} />
        ) : (
          <span />
        )}
        <ChevronDown
          className={cn(
            'size-4 text-white/30 transition-transform',
            isExpanded && 'rotate-180'
          )}
          aria-hidden="true"
        />
      </div>
    </button>
  );
}
```

**Step 2: Update `ClubAggregate` type in `ClubVerkaufSection.tsx`**

Add `totalSold` and `totalOffered` fields to aggregate, pass `players` and `ipoMap` to `ClubCard`:

```ts
type ClubAggregate = {
  clubName: string;
  club: ClubLookup;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  dpcCount: number;
  totalSold: number;       // NEW
  totalOffered: number;    // NEW
  avgPrice: number;
  earliestEnd: string | null;
  isHot: boolean;
};
```

In the `clubAggregates` useMemo, accumulate `totalSold`/`totalOffered`:

```ts
let totalSold = 0;
let totalOffered = 0;
for (const p of clubPlayers) {
  const ipo = allIposByPlayer.get(p.id);
  if (ipo) {
    ipoMap.set(p.id, ipo);
    endDates.push(ipo.ends_at);
    totalPrice += centsToBsd(ipo.price);
    priceCount++;
    totalSold += ipo.sold;
    totalOffered += ipo.total_offered;
  }
}
```

**Step 3: Replace `<ClubTile>` with `<ClubCard>` in the grid**

Also change grid from `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` to give cards more room on mobile, and pass `isFollowed` from `useClub().followedClubs`.

```tsx
<ClubCard
  club={agg.club}
  players={agg.players}
  ipoMap={agg.ipoMap}
  totalSold={agg.totalSold}
  totalOffered={agg.totalOffered}
  earliestEnd={agg.earliestEnd}
  isHot={agg.isHot}
  isExpanded={clubVerkaufExpandedClub === agg.clubName}
  isFollowed={followedClubIds.has(agg.club.id)}
  onToggle={() => setClubVerkaufExpandedClub(agg.clubName)}
/>
```

Import `useClub` from `@/components/providers/ClubProvider` and derive `followedClubIds`:

```tsx
const { followedClubs } = useClub();
const followedClubIds = useMemo(() => new Set(followedClubs.map(c => c.id)), [followedClubs]);
```

**Step 4: Delete old `ClubTile.tsx`**

**Step 5: Sort followed clubs first in `clubAggregates`**

```ts
return result.sort((a, b) => {
  const aFollowed = followedClubIds.has(a.club.id) ? 1 : 0;
  const bFollowed = followedClubIds.has(b.club.id) ? 1 : 0;
  if (aFollowed !== bFollowed) return bFollowed - aFollowed;
  return b.dpcCount - a.dpcCount;
});
```

Note: `followedClubIds` must be added to the useMemo dependency array.

**Step 6: Build + verify**

Run: `npx next build`

**Step 7: Commit**

```bash
git add -A && git commit -m "feat(market): replace ClubTile with ClubCard — player preview, scarcity bar, followed-first sort"
```

---

## Task 4: Progressive Filters — Simple by default, advanced on demand

Replace the always-visible filter chip row with sort + "Filter" expand button. Move position/L5/fit into expandable panel.

**Files:**
- Modify: `src/components/market/ClubVerkaufSection.tsx` (filter section)
- Modify: `src/lib/stores/marketStore.ts` (add `showAdvancedFilters`)

**Step 1: Add `showAdvancedFilters` to store**

In `marketStore.ts`, add to interface:

```ts
showAdvancedFilters: boolean;
setShowAdvancedFilters: (v: boolean) => void;
```

Add to defaults:

```ts
showAdvancedFilters: false,
setShowAdvancedFilters: (v) => set({ showAdvancedFilters: v }),
```

**Step 2: Rewrite filter section in `ClubVerkaufSection.tsx`**

Replace the current `{/* Filter chips row */}` div (lines 170-231) with:

```tsx
{/* Sort + Filter toggle */}
<div className="flex items-center gap-2">
  <select
    value={marketSortBy}
    onChange={(e) => setMarketSortBy(e.target.value as SortOption)}
    className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2.5 text-xs font-bold text-white/70 outline-none focus:border-white/20 min-h-[44px]"
    aria-label={t('sortBy', { defaultMessage: 'Sortieren' })}
  >
    {SORT_OPTIONS.map(o => (
      <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
    ))}
  </select>

  <button
    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
    className={cn(
      'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors min-h-[44px] border',
      showAdvancedFilters || activeFilterCount > 0
        ? 'bg-white/10 text-white border-white/15'
        : 'text-white/40 border-white/[0.08] hover:text-white/60'
    )}
    aria-expanded={showAdvancedFilters}
    aria-label={t('filterLabel', { defaultMessage: 'Filter' })}
  >
    <SlidersHorizontal className="size-3.5" aria-hidden="true" />
    {t('filterLabel', { defaultMessage: 'Filter' })}
    {activeFilterCount > 0 && (
      <span className="size-4 rounded-full bg-gold text-black text-[9px] font-black flex items-center justify-center">
        {activeFilterCount}
      </span>
    )}
  </button>
</div>

{/* Expandable advanced filters */}
{showAdvancedFilters && (
  <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 space-y-3 anim-fade">
    {/* Position pills */}
    <div>
      <div className="text-[10px] text-white/40 font-semibold mb-1.5">{t('position', { defaultMessage: 'Position' })}</div>
      <div className="flex gap-1.5">
        {POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => toggleFilterPos(pos)}
            aria-pressed={filterPos.has(pos)}
            aria-label={t('posFilterLabel', { pos: POS_LABELS[pos], defaultMessage: 'Position {pos} filtern' })}
            className={cn(
              'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] min-w-[44px]',
              filterPos.has(pos)
                ? 'bg-white/15 text-white border-white/20'
                : 'bg-white/[0.03] border-white/[0.06] text-white/40'
            )}
          >
            {POS_LABELS[pos]}
          </button>
        ))}
      </div>
    </div>

    {/* L5 + Fit */}
    <div className="flex items-center gap-2 flex-wrap">
      <div className="text-[10px] text-white/40 font-semibold mr-1">{t('minPerformance', { defaultMessage: 'Min. L5' })}</div>
      {L5_PRESETS.map(threshold => (
        <button
          key={threshold}
          onClick={() => setFilterMinL5(filterMinL5 === threshold ? 0 : threshold)}
          aria-pressed={filterMinL5 === threshold}
          aria-label={t('l5FilterLabel', { value: threshold, defaultMessage: 'Minimum L5 Score {value}' })}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] min-w-[44px]',
            filterMinL5 === threshold
              ? 'bg-gold/10 border-gold/20 text-gold'
              : 'bg-white/[0.03] border-white/[0.06] text-white/40'
          )}
        >
          {threshold}+
        </button>
      ))}
      <button
        onClick={() => setFilterOnlyFit(!filterOnlyFit)}
        aria-pressed={filterOnlyFit}
        aria-label={t('fitFilterLabel', { defaultMessage: 'Nur fitte Spieler anzeigen' })}
        className={cn(
          'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] flex items-center gap-1',
          filterOnlyFit
            ? 'bg-green-500/15 border-green-500/30 text-green-500'
            : 'bg-white/[0.03] border-white/[0.06] text-white/40'
        )}
      >
        {t('discoveryOnlyFit', { defaultMessage: 'Fit' })}
      </button>
    </div>

    {/* Reset if active */}
    {activeFilterCount > 0 && (
      <button
        onClick={resetMarketFilters}
        className="flex items-center gap-1.5 text-[10px] text-red-400/70 hover:text-red-400 transition-colors min-h-[44px]"
      >
        <X className="size-3" aria-hidden="true" />
        {t('resetFiltersLabel', { defaultMessage: 'Filter zurücksetzen' })}
      </button>
    )}
  </div>
)}
```

Import `SlidersHorizontal` from lucide-react and `getActiveFilterCount` from `MarketFilters`.

Derive `activeFilterCount`:
```tsx
const activeFilterCount = getActiveFilterCount(store);
```

**Step 3: Build + verify**

Run: `npx next build`

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(market): progressive filter disclosure — sort visible, advanced filters expandable"
```

---

## Task 5: CountdownBadge — Prominent mode + urgency fix

Make the non-compact CountdownBadge bigger and always show the icon. Fix urgency colors (<24h was same as <1h).

**Files:**
- Modify: `src/components/market/CountdownBadge.tsx`

**Step 1: Fix urgency color bands**

Replace `getUrgencyColor`:

```ts
function getUrgencyColor(ms: number): string {
  if (ms <= 0) return 'text-white/30';
  if (ms < 3600000) return 'text-vivid-red';          // < 1h: red
  if (ms < 86400000) return 'text-orange-400';         // < 1d: orange (was vivid-red — duplicate fixed)
  if (ms < 259200000) return 'text-amber-400';         // < 3d: amber
  if (ms < 604800000) return 'text-vivid-green';       // < 7d: green
  return 'text-white/50';                               // > 7d: neutral
}
```

**Step 2: Always show icon, size based on compact**

Replace the return JSX:

```tsx
return (
  <span className={cn(
    'inline-flex items-center gap-1 tabular-nums font-mono font-bold',
    compact ? 'text-[11px]' : 'text-xs',
    color,
    pulse && 'animate-pulse motion-reduce:animate-none',
    className,
  )}>
    <Clock
      className={cn(compact ? 'size-3' : 'size-3.5')}
      aria-hidden="true"
    />
    {formatRemaining(remaining)}
  </span>
);
```

Note: Icon now always renders (removed `!compact &&` gate). Compact font bumped from 10px to 11px.

**Step 3: Build + verify**

Run: `npx next build`

**Step 4: Commit**

```bash
git add -A && git commit -m "fix(market): CountdownBadge — always show icon, fix duplicate urgency colors, bump compact size"
```

---

## Task 6: PlayerIPORow — Mobile progress + accessibility

Fix progress bar hidden on mobile, add aria-labels, improve touch targets.

**Files:**
- Modify: `src/components/market/PlayerIPORow.tsx`

**Step 1: Show progress on mobile, add aria-labels**

Replace the entire component return:

```tsx
return (
  <Link
    href={`/player/${p.id}`}
    className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors rounded-lg group min-h-[44px]"
  >
    <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />

    <span className={cn('font-mono font-bold text-[11px] tabular-nums flex-shrink-0', getL5Color(p.perf.l5))}>
      {p.perf.l5}
    </span>

    {/* Progress — always visible */}
    <div className="w-10 flex-shrink-0">
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-vivid-green"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <span className="text-[8px] text-white/30 tabular-nums font-mono">{ipo.sold}/{ipo.total_offered}</span>
    </div>

    <CountdownBadge targetDate={ipo.ends_at} compact className="flex-shrink-0" />

    <span className="font-mono font-black text-xs text-gold tabular-nums flex-shrink-0 w-14 text-right">
      {fmtScout(priceBsd)}
    </span>

    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
      disabled={buying}
      aria-label={t('buyPlayerLabel', {
        player: `${p.first} ${p.last}`,
        price: fmtScout(priceBsd),
        defaultMessage: '{player} für {price} $SCOUT kaufen',
      })}
      className="px-3 py-1.5 min-h-[44px] min-w-[44px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-[11px] font-black hover:bg-gold/20 transition-colors active:scale-[0.95] disabled:opacity-50 flex-shrink-0 flex items-center justify-center gap-1"
    >
      {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
    </button>
  </Link>
);
```

Key changes:
- Removed `hidden sm:block` from progress div
- Changed progress text from percentage to `sold/total` (more meaningful)
- Added `aria-label` on buy button
- Bumped touch targets to `min-h-[44px] min-w-[44px]`
- Added `min-h-[44px]` on outer Link

**Step 2: Build + verify**

Run: `npx next build`

**Step 3: Commit**

```bash
git add -A && git commit -m "fix(market): PlayerIPORow — mobile progress visible, aria-labels, 44px touch targets"
```

---

## Task 7: ClubAccordion — Semantic structure + accessibility

Add `role="group"` to position sections, improve header structure.

**Files:**
- Modify: `src/components/market/ClubAccordion.tsx`

**Step 1: Add semantic structure**

Replace the position groups render (lines 64-89):

```tsx
<div className="divide-y divide-white/[0.04]">
  {groups.map(({ pos, label, players: posPlayers }) => (
    <div key={pos} role="group" aria-label={`${label} — ${posPlayers.length} ${t('players', { defaultMessage: 'Spieler' })}`}>
      <div className="px-4 py-2 bg-white/[0.02]">
        <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
          {label} <span className="tabular-nums">({posPlayers.length})</span>
        </h4>
      </div>
      <div>
        {posPlayers.map(p => {
          const ipo = ipoMap.get(p.id);
          if (!ipo) return null;
          return (
            <PlayerIPORow
              key={p.id}
              player={p}
              ipo={ipo}
              onBuy={onBuy}
              buying={buyingId === p.id}
            />
          );
        })}
      </div>
    </div>
  ))}
</div>
```

Also change `col-span-2` to `col-span-full` for better grid compatibility.

**Step 2: Build + verify**

Run: `npx next build`

**Step 3: Commit**

```bash
git add -A && git commit -m "fix(market): ClubAccordion — semantic group roles, heading hierarchy, col-span-full"
```

---

## Task 8: DPC Onboarding Tip — Explain for new users

Add a dismissable NewUserTip explaining what DPCs are and why to buy them. Shows only for users with 0 holdings.

**Files:**
- Modify: `src/components/market/ClubVerkaufSection.tsx` (add tip)
- Modify: `messages/de.json` + `messages/tr.json` (add i18n keys)

**Step 1: Add NewUserTip to ClubVerkaufSection**

After the EndingSoonStrip, before LeagueBar, add:

```tsx
import NewUserTip from '@/components/onboarding/NewUserTip';
import { HelpCircle } from 'lucide-react';

// In the render, after <EndingSoonStrip>:
<NewUserTip
  tipKey="club-verkauf-dpc-intro"
  icon={<HelpCircle className="size-4" />}
  title={t('dpcIntroTitle', { defaultMessage: 'Was sind DPCs?' })}
  description={t('dpcIntroDesc', { defaultMessage: 'Kaufe digitale Spieler-Verträge (DPCs) deines Lieblingsvereins. Steigt der Marktwert des Spielers, profitierst du durch die Community Success Fee.' })}
  show={!hasHoldings}
/>
```

The `hasHoldings` prop needs to be passed into `ClubVerkaufSection` from the parent (`market/page.tsx`), derived from `holdings.length > 0`.

**Step 2: Add i18n keys**

Add to `messages/de.json` under `"market"`:
```json
"dpcIntroTitle": "Was sind DPCs?",
"dpcIntroDesc": "Kaufe digitale Spieler-Verträge (DPCs) deines Lieblingsvereins. Steigt der Marktwert des Spielers, profitierst du durch die Community Success Fee."
```

Add to `messages/tr.json` under `"market"`:
```json
"dpcIntroTitle": "DPC nedir?",
"dpcIntroDesc": "Favori kulübünün dijital oyuncu sözleşmelerini (DPC) satın al. Oyuncunun piyasa değeri artarsa, Community Success Fee ile sen de kazanırsın."
```

**Step 3: Build + verify**

Run: `npx next build`

**Step 4: Commit**

```bash
git add -A && git commit -m "feat(market): DPC onboarding tip for new users in Club Verkauf"
```

---

## Task 9: Wire it all together — Final ClubVerkaufSection rewrite

Assemble all new components in the correct layout order with the full data flow.

**Files:**
- Modify: `src/components/market/ClubVerkaufSection.tsx` (final assembly)

**Step 1: Final layout order**

The component render should follow this hierarchy:

```tsx
<div className="space-y-4">
  {/* 1. Urgency: ending soon strip */}
  <EndingSoonStrip ... />

  {/* 2. Onboarding: DPC explainer (only for new users) */}
  <NewUserTip ... />

  {/* 3. Navigation: league bar */}
  <LeagueBar ... />

  {/* 4. Controls: sort + filter expand */}
  <div className="flex items-center gap-2"> ... </div>
  {showAdvancedFilters && <div> ... </div>}

  {/* 5. Empty state */}
  {!hasContent && <EmptyState ... />}

  {/* 6. Club cards grid + accordions */}
  {hasContent && (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {clubAggregates.map(agg => (
        <React.Fragment key={agg.clubName}>
          <ClubCard ... />
          {expanded && <ClubAccordion ... />}
        </React.Fragment>
      ))}
    </div>
  )}
</div>
```

**Step 2: Add `hasHoldings` prop**

```ts
interface ClubVerkaufSectionProps {
  players: Player[];
  activeIpos: DbIpo[];
  announcedIpos: DbIpo[];
  endedIpos: DbIpo[];
  playerMap: Map<string, Player>;
  onIpoBuy: (playerId: string) => void;
  buyingId: string | null;
  hasHoldings: boolean;  // NEW
}
```

In `market/page.tsx`, pass `hasHoldings={holdings.length > 0}`.

**Step 3: Clean up unused imports**

Remove: `HotSalesCarousel`, `ClubTile`, old filter constants that are no longer inline.

**Step 4: Build + verify**

Run: `npx next build`

**Step 5: Commit**

```bash
git add -A && git commit -m "feat(market): ClubVerkaufSection final assembly — urgency → onboarding → leagues → filters → cards"
```

---

## Task 10: Add all missing i18n keys

Collect all new `t()` keys used across Tasks 1–9 and add them to `messages/de.json` and `messages/tr.json`.

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Step 1: Add keys under `"market"` namespace**

New keys (DE):
```json
"endingSoon": "Endet bald",
"endingSoonLabel": "Endet bald",
"remainingCount": "{count} übrig",
"sold": "verkauft",
"available": "verfügbar",
"leagueNavLabel": "Liga-Navigation",
"clubCardLabel": "{club} — {count} DPCs verfügbar",
"followedBadge": "Mein Club",
"morePlayers": "weitere",
"position": "Position",
"posFilterLabel": "Position {pos} filtern",
"minPerformance": "Min. L5",
"l5FilterLabel": "Minimum L5 Score {value}",
"fitFilterLabel": "Nur fitte Spieler anzeigen",
"buyPlayerLabel": "{player} für {price} $SCOUT kaufen",
"players": "Spieler",
"dpcIntroTitle": "Was sind DPCs?",
"dpcIntroDesc": "Kaufe digitale Spieler-Verträge (DPCs) deines Lieblingsvereins. Steigt der Marktwert des Spielers, profitierst du durch die Community Success Fee."
```

New keys (TR):
```json
"endingSoon": "Yakında bitiyor",
"endingSoonLabel": "Yakında bitiyor",
"remainingCount": "{count} kaldı",
"sold": "satıldı",
"available": "mevcut",
"leagueNavLabel": "Lig navigasyonu",
"clubCardLabel": "{club} — {count} DPC mevcut",
"followedBadge": "Benim Kulübüm",
"morePlayers": "daha fazla",
"position": "Pozisyon",
"posFilterLabel": "{pos} pozisyonunu filtrele",
"minPerformance": "Min. L5",
"l5FilterLabel": "Minimum L5 Skor {value}",
"fitFilterLabel": "Sadece fit oyuncuları göster",
"buyPlayerLabel": "{player} oyuncusunu {price} $SCOUT'a satın al",
"players": "Oyuncu",
"dpcIntroTitle": "DPC nedir?",
"dpcIntroDesc": "Favori kulübünün dijital oyuncu sözleşmelerini (DPC) satın al. Oyuncunun piyasa değeri artarsa, Community Success Fee ile sen de kazanırsın."
```

**Step 2: Build + verify**

Run: `npx next build`

**Step 3: Commit**

```bash
git add -A && git commit -m "feat(market): add all i18n keys for Club Verkauf redesign (DE + TR)"
```

---

## Task 11: Delete old files + barrel export cleanup

Remove old components that were replaced.

**Files:**
- Delete: `src/components/market/HotSalesCarousel.tsx` (if not already deleted in Task 1)
- Delete: `src/components/market/ClubTile.tsx` (if not already deleted in Task 3)
- Check: No other file imports `HotSalesCarousel` or `ClubTile`

**Step 1: Verify no stale imports**

```bash
grep -r "HotSalesCarousel\|ClubTile" src/ --include="*.tsx" --include="*.ts"
```

Expected: 0 results.

**Step 2: Build + verify**

Run: `npx next build`

**Step 3: Commit**

```bash
git add -A && git commit -m "chore(market): remove replaced ClubTile and HotSalesCarousel"
```

---

## Task 12: Quality Pipeline

Run the quality checks on all modified UI files.

**Files checked:**
- `ClubVerkaufSection.tsx`
- `ClubCard.tsx`
- `EndingSoonStrip.tsx`
- `LeagueBar.tsx`
- `PlayerIPORow.tsx`
- `ClubAccordion.tsx`
- `CountdownBadge.tsx`

**Step 1:** `/baseline-ui` on each file
**Step 2:** `/fixing-accessibility` on each file
**Step 3:** `/fixing-motion-performance` on each file
**Step 4:** Fix any findings
**Step 5:** Final build

Run: `npx next build`
Expected: 0 errors

**Step 6: Final commit**

```bash
git add -A && git commit -m "fix(market): quality pipeline — baseline-ui + a11y + motion-perf fixes"
```

---

## Summary

| Task | Component | What changes |
|------|-----------|-------------|
| 1 | EndingSoonStrip | Real urgency strip replacing dead placeholder |
| 2 | LeagueBar | Visual navigation with country flags |
| 3 | ClubCard | Larger cards with player preview + scarcity |
| 4 | Progressive Filters | Hidden by default, expandable |
| 5 | CountdownBadge | Always-icon, fixed urgency bands |
| 6 | PlayerIPORow | Mobile progress, a11y, touch targets |
| 7 | ClubAccordion | Semantic groups, heading hierarchy |
| 8 | NewUserTip | DPC explainer for newcomers |
| 9 | Final Assembly | Wire everything in correct order |
| 10 | i18n | All new keys DE + TR |
| 11 | Cleanup | Delete replaced files |
| 12 | Quality | Baseline + a11y + motion-perf checks |
