# Club Verkauf Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat Club Verkauf IPO list with a structured Liga > Club > Position hierarchy, Hot Sales placeholder, and urgency countdowns.

**Architecture:** Hybrid layout — Hot Sales carousel (placeholder) at top, liga dropdown + global filters, 2-column club tile grid with single-open accordion showing position-grouped players. All data comes from existing React Query hooks (`useActiveIpos`, `useAnnouncedIpos`, `useRecentlyEndedIpos`, `useEnrichedPlayers`). Club metadata from `getClub()` cache in `src/lib/clubs.ts`.

**Tech Stack:** Next.js 14 / TypeScript strict / Tailwind (dark mode) / Zustand v5 / next-intl / lucide-react

**Key Files to Understand:**
- `src/app/(app)/market/page.tsx` — Main market page, renders `ClubSaleSection` at line 456-466
- `src/components/market/ClubSaleSection.tsx` — Current flat IPO list (WILL BE REPLACED)
- `src/components/market/MarketFilters.tsx` — Shared filter bar with `applyFilters()` / `applySorting()`
- `src/lib/stores/marketStore.ts` — Zustand store for all market UI state
- `src/lib/clubs.ts` — `getClub()`, `getAllClubsCached()`, `ClubLookup` type (has `.league`, `.colors`, `.logo`)
- `src/components/ui/Countdown.tsx` — Existing countdown component (will be extended)
- `src/types/index.ts` — `Player` (line 25, has `.club`, `.league`, `.pos`), `DbIpo` (line 704)

---

### Task 1: Store — Add Club Verkauf state to marketStore

**Files:**
- Modify: `src/lib/stores/marketStore.ts`

**Step 1: Add new state fields and setters**

Add to `KaufenSubTab` type (line 9):
```ts
export type KaufenSubTab = 'clubverkauf' | 'transferliste' | 'trending';
```

Add to `MarketState` interface (after line 59, before setters):
```ts
  clubVerkaufLeague: string;           // '' = all leagues
  clubVerkaufExpandedClub: string | null;  // only 1 accordion open
```

Add setters to interface:
```ts
  setClubVerkaufLeague: (v: string) => void;
  setClubVerkaufExpandedClub: (v: string | null) => void;
```

Add default values in `create()` (after line 158):
```ts
  clubVerkaufLeague: '',
  clubVerkaufExpandedClub: null,
```

Add setter implementations:
```ts
  setClubVerkaufLeague: (v) => set({ clubVerkaufLeague: v }),
  setClubVerkaufExpandedClub: (v) => set((state) => ({
    clubVerkaufExpandedClub: state.clubVerkaufExpandedClub === v ? null : v,
  })),
```

Note: `setClubVerkaufExpandedClub` toggles — same club = close, different club = open that one.

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: No type errors in marketStore

**Step 3: Commit**

```bash
git add src/lib/stores/marketStore.ts
git commit -m "feat(market): add club verkauf league + accordion state to store"
```

---

### Task 2: CountdownBadge — Urgency-colored countdown component

**Files:**
- Create: `src/components/market/CountdownBadge.tsx`

**Step 1: Create the component**

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownBadgeProps {
  targetDate: string;
  className?: string;
  /** Compact mode: no icon, smaller text */
  compact?: boolean;
  onExpired?: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Beendet';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}T ${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  if (hours > 0) return `${hours}h ${String(mins).padStart(2, '0')}m`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

function getUrgencyColor(ms: number): string {
  if (ms <= 0) return 'text-white/30';
  if (ms < 3600000) return 'text-vivid-red';       // < 1h
  if (ms < 86400000) return 'text-vivid-red';       // < 24h
  if (ms < 259200000) return 'text-orange-400';      // < 3 days
  if (ms < 604800000) return 'text-vivid-green';     // < 7 days
  return 'text-white/50';                            // > 7 days
}

function shouldPulse(ms: number): boolean {
  return ms > 0 && ms < 3600000; // < 1 hour
}

export default function CountdownBadge({ targetDate, className, compact, onExpired }: CountdownBadgeProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(targetDate).getTime() - Date.now())
  );

  const stableOnExpired = useCallback(() => onExpired?.(), [onExpired]);

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const ms = Math.max(0, target - Date.now());
      setRemaining(ms);
      if (ms <= 0) stableOnExpired();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate, stableOnExpired]);

  if (remaining <= 0) return null;

  const color = getUrgencyColor(remaining);
  const pulse = shouldPulse(remaining);

  return (
    <span className={cn(
      'inline-flex items-center gap-1 tabular-nums font-mono',
      compact ? 'text-[10px]' : 'text-xs',
      color,
      className,
    )}>
      {!compact && (
        <Clock
          className={cn('size-3', pulse && 'animate-pulse motion-reduce:animate-none')}
          aria-hidden="true"
        />
      )}
      {formatRemaining(remaining)}
    </span>
  );
}

/** Get the earliest ends_at date from a list of ISO date strings */
export function getEarliestEndDate(dates: string[]): string | null {
  if (dates.length === 0) return null;
  return dates.reduce((earliest, d) =>
    new Date(d).getTime() < new Date(earliest).getTime() ? d : earliest
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/components/market/CountdownBadge.tsx
git commit -m "feat(market): add CountdownBadge with urgency color logic"
```

---

### Task 3: PlayerIPORow — Compact player row for accordion

**Files:**
- Create: `src/components/market/PlayerIPORow.tsx`

**Step 1: Create the component**

This is a compact row showing: PlayerIdentity | L5 | Price | Countdown | Buy button.

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { PlayerIdentity, getL5Color } from '@/components/player';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo } from '@/types';

interface PlayerIPORowProps {
  player: Player;
  ipo: DbIpo;
  onBuy: (playerId: string) => void;
  buying: boolean;
}

export default function PlayerIPORow({ player: p, ipo, onBuy, buying }: PlayerIPORowProps) {
  const t = useTranslations('market');
  const priceBsd = centsToBsd(ipo.price);
  const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors rounded-lg group"
    >
      {/* Player identity */}
      <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />

      {/* L5 */}
      <span className={cn('font-mono font-bold text-[11px] tabular-nums flex-shrink-0', getL5Color(p.perf.l5))}>
        {p.perf.l5}
      </span>

      {/* Progress mini */}
      <div className="w-10 flex-shrink-0 hidden sm:block">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-vivid-green"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="text-[8px] text-white/30 tabular-nums">{progress.toFixed(0)}%</span>
      </div>

      {/* Countdown */}
      <CountdownBadge targetDate={ipo.ends_at} compact className="flex-shrink-0 w-16 text-right" />

      {/* Price */}
      <span className="font-mono font-black text-xs text-gold tabular-nums flex-shrink-0 w-16 text-right">
        {fmtScout(priceBsd)}
      </span>

      {/* Buy */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
        disabled={buying}
        className="px-3 py-1.5 min-h-[36px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-[11px] font-black hover:bg-gold/20 transition-colors active:scale-[0.95] disabled:opacity-50 flex-shrink-0 flex items-center gap-1"
      >
        {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
      </button>
    </Link>
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/components/market/PlayerIPORow.tsx
git commit -m "feat(market): add PlayerIPORow compact row for club accordion"
```

---

### Task 4: ClubAccordion — Position-grouped player list

**Files:**
- Create: `src/components/market/ClubAccordion.tsx`

**Step 1: Create the component**

Shows players grouped by position (TW > DEF > MID > STU) when a club is expanded.

```tsx
'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { getClub } from '@/lib/clubs';
import PlayerIPORow from './PlayerIPORow';
import type { Player, DbIpo, Pos } from '@/types';

const POS_ORDER: { pos: Pos; label: string }[] = [
  { pos: 'GK', label: 'TW' },
  { pos: 'DEF', label: 'DEF' },
  { pos: 'MID', label: 'MID' },
  { pos: 'ATT', label: 'STU' },
];

interface ClubAccordionProps {
  clubName: string;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  onBuy: (playerId: string) => void;
  buyingId: string | null;
  onClose: () => void;
}

export default function ClubAccordion({ clubName, players, ipoMap, onBuy, buyingId, onClose }: ClubAccordionProps) {
  const t = useTranslations('market');
  const club = getClub(clubName);
  const primaryColor = club?.colors.primary ?? '#666';

  const groups = useMemo(() => {
    return POS_ORDER.map(({ pos, label }) => {
      const posPlayers = players
        .filter(p => p.pos === pos)
        .sort((a, b) => b.perf.l5 - a.perf.l5);
      return { pos, label, players: posPlayers };
    }).filter(g => g.players.length > 0);
  }, [players]);

  if (groups.length === 0) return null;

  return (
    <div className="col-span-2 border border-white/[0.08] rounded-2xl overflow-hidden anim-fade">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]"
        style={{ borderLeft: `3px solid ${primaryColor}` }}
      >
        {club?.logo ? (
          <img src={club.logo} alt="" className="size-5 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="size-5 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
        )}
        <span className="font-bold text-sm flex-1">{clubName}</span>
        <span className="text-[10px] text-white/40 tabular-nums">{players.length} DPCs</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label={t('closeClub', { defaultMessage: 'Schliessen' })}
        >
          <X className="size-4 text-white/40" aria-hidden="true" />
        </button>
      </div>

      {/* Position groups */}
      <div className="divide-y divide-white/[0.04]">
        {groups.map(({ pos, label, players: posPlayers }) => (
          <div key={pos}>
            {/* Position header */}
            <div className="px-4 py-1.5 bg-white/[0.02]">
              <span className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
                {label} ({posPlayers.length})
              </span>
            </div>
            {/* Player rows */}
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
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/components/market/ClubAccordion.tsx
git commit -m "feat(market): add ClubAccordion with position-grouped player list"
```

---

### Task 5: ClubTile — Club card for the grid

**Files:**
- Create: `src/components/market/ClubTile.tsx`

**Step 1: Create the component**

Shows club branding, DPC count, avg price, countdown, hot badge.

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Flame } from 'lucide-react';
import CountdownBadge, { getEarliestEndDate } from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import type { ClubLookup } from '@/lib/clubs';

interface ClubTileProps {
  club: ClubLookup;
  dpcCount: number;
  avgPrice: number;       // in $SCOUT (already converted from cents)
  earliestEnd: string | null;  // ISO date of earliest IPO end
  isHot?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

export default function ClubTile({ club, dpcCount, avgPrice, earliestEnd, isHot, isExpanded, onToggle }: ClubTileProps) {
  const t = useTranslations('market');
  const primaryColor = club.colors.primary;

  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-full text-left rounded-xl border p-3 transition-colors group',
        isExpanded
          ? 'bg-white/[0.06] border-white/[0.15]'
          : 'bg-surface-base border-white/[0.08] hover:border-white/[0.12]'
      )}
      style={{
        borderLeftWidth: 3,
        borderLeftColor: primaryColor,
        backgroundImage: `linear-gradient(135deg, ${primaryColor}12, transparent 60%)`,
      }}
    >
      {/* Hot badge */}
      {isHot && (
        <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 bg-vivid-red/15 rounded text-[9px] font-black text-vivid-red">
          <Flame className="size-2.5" aria-hidden="true" />
          HOT
        </div>
      )}

      {/* Club identity */}
      <div className="flex items-center gap-2 mb-2">
        {club.logo ? (
          <img src={club.logo} alt="" className="size-7 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="size-7 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm text-white truncate">{club.name}</div>
          <div className="text-[9px] text-white/30 truncate">{club.league}</div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-[10px] tabular-nums">
        <span className="text-white/50">
          {dpcCount} {t('dpcAvailable', { defaultMessage: 'DPCs' })}
        </span>
        {avgPrice > 0 && (
          <span className="font-mono font-bold text-gold">
            {t('avgSymbol', { defaultMessage: 'Ø' })} {fmtScout(avgPrice)}
          </span>
        )}
      </div>

      {/* Countdown */}
      {earliestEnd && (
        <div className="mt-1.5">
          <CountdownBadge targetDate={earliestEnd} compact />
        </div>
      )}
    </button>
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/components/market/ClubTile.tsx
git commit -m "feat(market): add ClubTile with branding, stats, countdown"
```

---

### Task 6: HotSalesCarousel — Structural placeholder

**Files:**
- Create: `src/components/market/HotSalesCarousel.tsx`

**Step 1: Create placeholder component**

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Zap } from 'lucide-react';

export default function HotSalesCarousel() {
  const t = useTranslations('market');

  return (
    <div className="bg-white/[0.02] border border-dashed border-white/[0.08] rounded-2xl p-4 flex items-center gap-3">
      <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
        <Zap className="size-5 text-gold" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-white/60">{t('hotSalesTitle', { defaultMessage: 'Featured Sales' })}</div>
        <div className="text-[10px] text-white/30">{t('hotSalesPlaceholder', { defaultMessage: 'Clubs konnen hier ihre DPCs bewerben — bald verfugbar.' })}</div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/market/HotSalesCarousel.tsx
git commit -m "feat(market): add HotSalesCarousel placeholder"
```

---

### Task 7: ClubVerkaufSection — Main container component

**Files:**
- Create: `src/components/market/ClubVerkaufSection.tsx`

**Step 1: Create the main orchestrator**

This replaces `ClubSaleSection.tsx`. It composes: HotSalesCarousel + LeagueDropdown + FilterBar + ClubTileGrid + ClubAccordion.

```tsx
'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Heart } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { getClub, getAllClubsCached } from '@/lib/clubs';
import type { ClubLookup } from '@/lib/clubs';
import { useMarketStore } from '@/lib/stores/marketStore';
import { applyFilters, applySorting } from './MarketFilters';
import HotSalesCarousel from './HotSalesCarousel';
import ClubTile from './ClubTile';
import ClubAccordion from './ClubAccordion';
import { getEarliestEndDate } from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo, Pos } from '@/types';
import type { SortOption } from '@/lib/stores/marketStore';

// ============================================
// FILTER BAR (inline — specific to Club Verkauf)
// ============================================

const POSITIONS: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];
const POS_LABELS: Record<Pos, string> = { GK: 'TW', DEF: 'DEF', MID: 'MID', ATT: 'STU' };
const L5_PRESETS = [45, 55, 65] as const;
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'l5', label: 'L5' },
  { value: 'floor_asc', label: 'Preis ↑' },
  { value: 'floor_desc', label: 'Preis ↓' },
  { value: 'goals', label: 'Tore' },
  { value: 'assists', label: 'Assists' },
];

// ============================================
// TYPES
// ============================================

interface ClubVerkaufSectionProps {
  players: Player[];
  activeIpos: DbIpo[];
  announcedIpos: DbIpo[];
  endedIpos: DbIpo[];
  playerMap: Map<string, Player>;
  onIpoBuy: (playerId: string) => void;
  buyingId: string | null;
}

type ClubAggregate = {
  clubName: string;
  club: ClubLookup | null;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  dpcCount: number;
  avgPrice: number;
  earliestEnd: string | null;
  isHot: boolean;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function ClubVerkaufSection({
  players, activeIpos, announcedIpos, endedIpos, playerMap, onIpoBuy, buyingId,
}: ClubVerkaufSectionProps) {
  const t = useTranslations('market');
  const store = useMarketStore();
  const {
    clubVerkaufLeague, setClubVerkaufLeague,
    clubVerkaufExpandedClub, setClubVerkaufExpandedClub,
    filterPos, toggleFilterPos,
    filterMinL5, setFilterMinL5,
    filterOnlyFit, setFilterOnlyFit,
    marketSortBy, setMarketSortBy,
  } = store;

  // All IPOs (active + announced) mapped by player_id
  const allIposByPlayer = useMemo(() => {
    const m = new Map<string, DbIpo>();
    for (const ipo of activeIpos) m.set(ipo.player_id, ipo);
    for (const ipo of announcedIpos) m.set(ipo.player_id, ipo);
    return m;
  }, [activeIpos, announcedIpos]);

  // Available leagues from club cache
  const leagues = useMemo(() => {
    const allClubs = getAllClubsCached();
    const leagueSet = new Set<string>();
    for (const c of allClubs) {
      if (c.league) leagueSet.add(c.league);
    }
    return Array.from(leagueSet).sort();
  }, []);

  // Build club aggregates
  const clubAggregates = useMemo(() => {
    // Group players by club name (only those with IPOs)
    const ipoPlayerIds = new Set(activeIpos.map(i => i.player_id));
    const announcedPlayerIds = new Set(announcedIpos.map(i => i.player_id));
    const allIpoPlayerIds = new Set([...ipoPlayerIds, ...announcedPlayerIds]);

    const ipoPlayers = players.filter(p => allIpoPlayerIds.has(p.id));

    // Apply global filters
    const filtered = applyFilters(ipoPlayers, store);

    // Group by club
    const grouped = new Map<string, Player[]>();
    for (const p of filtered) {
      const arr = grouped.get(p.club) ?? [];
      arr.push(p);
      grouped.set(p.club, arr);
    }

    // Build aggregates
    const result: ClubAggregate[] = [];
    grouped.forEach((clubPlayers, clubName) => {
      const club = getClub(clubName);

      // League filter
      if (clubVerkaufLeague && club?.league !== clubVerkaufLeague) return;

      // Build IPO map for this club's players
      const ipoMap = new Map<string, DbIpo>();
      const endDates: string[] = [];
      let totalPrice = 0;
      let priceCount = 0;

      for (const p of clubPlayers) {
        const ipo = allIposByPlayer.get(p.id);
        if (ipo) {
          ipoMap.set(p.id, ipo);
          endDates.push(ipo.ends_at);
          totalPrice += centsToBsd(ipo.price);
          priceCount++;
        }
      }

      // Sort players within club
      const sorted = applySorting(clubPlayers, marketSortBy);

      result.push({
        clubName,
        club,
        players: sorted,
        ipoMap,
        dpcCount: clubPlayers.length,
        avgPrice: priceCount > 0 ? Math.round(totalPrice / priceCount) : 0,
        earliestEnd: getEarliestEndDate(endDates),
        isHot: clubPlayers.length >= 5, // Simple heuristic for now
      });
    });

    // Sort clubs: most DPCs first
    return result.sort((a, b) => b.dpcCount - a.dpcCount);
  }, [players, activeIpos, announcedIpos, store, clubVerkaufLeague, allIposByPlayer, marketSortBy]);

  const hasContent = clubAggregates.length > 0;

  return (
    <div className="space-y-4">
      {/* Hot Sales Carousel */}
      <HotSalesCarousel />

      {/* League Dropdown + Filter Bar */}
      <div className="space-y-2">
        {/* League selector */}
        <select
          value={clubVerkaufLeague}
          onChange={(e) => setClubVerkaufLeague(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-white/20 min-h-[44px]"
          aria-label={t('leagueFilter', { defaultMessage: 'Liga wahlen' })}
        >
          <option value="" className="bg-[#1a1a1a]">{t('allLeagues', { defaultMessage: 'Alle Ligen' })}</option>
          {leagues.map(l => (
            <option key={l} value={l} className="bg-[#1a1a1a]">{l}</option>
          ))}
        </select>

        {/* Filter chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Sort */}
          <select
            value={marketSortBy}
            onChange={(e) => setMarketSortBy(e.target.value as SortOption)}
            className="px-2.5 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-[10px] font-bold text-white/60 appearance-none cursor-pointer pr-6 shrink-0 min-h-[32px]"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
            aria-label={t('sortBy', { defaultMessage: 'Sortieren' })}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
            ))}
          </select>

          {/* Position pills */}
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => toggleFilterPos(pos)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 min-h-[32px]',
                filterPos.has(pos)
                  ? 'bg-white/15 text-white border-white/20'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/40'
              )}
            >
              {POS_LABELS[pos]}
            </button>
          ))}

          {/* L5 presets */}
          {L5_PRESETS.map(threshold => (
            <button
              key={threshold}
              onClick={() => setFilterMinL5(filterMinL5 === threshold ? 0 : threshold)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 min-h-[32px]',
                filterMinL5 === threshold
                  ? 'bg-gold/10 border-gold/20 text-gold'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/40'
              )}
            >
              L5 {threshold}+
            </button>
          ))}

          {/* Only Fit */}
          <button
            onClick={() => setFilterOnlyFit(!filterOnlyFit)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 flex items-center gap-1 min-h-[32px]',
              filterOnlyFit
                ? 'bg-green-500/15 border-green-500/30 text-green-500'
                : 'bg-white/[0.03] border-white/[0.06] text-white/40'
            )}
          >
            <Heart className="size-3" aria-hidden="true" />{t('discoveryOnlyFit', { defaultMessage: 'Fit' })}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasContent && (
        <EmptyState
          icon="shopping-cart"
          title={t('noClubSales', { defaultMessage: 'Keine Club Verkaufe aktiv' })}
          description={t('noClubSalesDesc', { defaultMessage: 'Aktuell gibt es keine aktiven Verkaufe vom Verein.' })}
        />
      )}

      {/* Club Grid + Accordion */}
      {hasContent && (
        <div className="grid grid-cols-2 gap-2">
          {clubAggregates.map(agg => (
            <React.Fragment key={agg.clubName}>
              <ClubTile
                club={agg.club ?? { id: '', slug: '', name: agg.clubName, short: '', colors: { primary: '#666', secondary: '#fff' }, logo: null, league: '', league_id: null, country: '' }}
                dpcCount={agg.dpcCount}
                avgPrice={agg.avgPrice}
                earliestEnd={agg.earliestEnd}
                isHot={agg.isHot}
                isExpanded={clubVerkaufExpandedClub === agg.clubName}
                onToggle={() => setClubVerkaufExpandedClub(agg.clubName)}
              />
              {/* Accordion inserted after the tile, spanning full width */}
              {clubVerkaufExpandedClub === agg.clubName && (
                <ClubAccordion
                  clubName={agg.clubName}
                  players={agg.players}
                  ipoMap={agg.ipoMap}
                  onBuy={onIpoBuy}
                  buyingId={buyingId}
                  onClose={() => setClubVerkaufExpandedClub(null)}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build

**Step 3: Commit**

```bash
git add src/components/market/ClubVerkaufSection.tsx
git commit -m "feat(market): add ClubVerkaufSection with league/filter/grid/accordion"
```

---

### Task 8: Wire up — Replace ClubSaleSection in market page

**Files:**
- Modify: `src/app/(app)/market/page.tsx` (lines 54-57, 409-412, 456-466)

**Step 1: Update the dynamic import (line 54-57)**

Replace:
```tsx
const ClubSaleSection = dynamic(() => import('@/components/market/ClubSaleSection'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>,
});
```

With:
```tsx
const ClubVerkaufSection = dynamic(() => import('@/components/market/ClubVerkaufSection'), {
  ssr: false,
  loading: () => <div className="space-y-3">{[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-32" />)}</div>,
});
```

**Step 2: Add "Trending" tab option to sub-tabs (lines 409-412)**

Replace the sub-tabs array:
```tsx
{([
  { id: 'clubverkauf' as const, label: t('clubSale', { defaultMessage: 'Club Verkauf' }) },
  { id: 'transferliste' as const, label: t('transferList', { defaultMessage: 'Transferliste' }) },
  { id: 'trending' as const, label: t('trendingTab', { defaultMessage: 'Trending' }) },
]).map(st => (
```

**Step 3: Replace ClubSaleSection render (lines 456-466)**

Replace:
```tsx
{kaufenSubTab === 'clubverkauf' && (
  <ClubSaleSection
    players={players}
    activeIpos={ipoList}
    announcedIpos={announcedIpos}
    endedIpos={endedIpos}
    playerMap={playerMap}
    onIpoBuy={handleIpoBuy}
    buyingId={buyingId}
  />
)}
```

With:
```tsx
{kaufenSubTab === 'clubverkauf' && (
  <ClubVerkaufSection
    players={players}
    activeIpos={ipoList}
    announcedIpos={announcedIpos}
    endedIpos={endedIpos}
    playerMap={playerMap}
    onIpoBuy={handleIpoBuy}
    buyingId={buyingId}
  />
)}
{kaufenSubTab === 'trending' && (
  <EmptyState
    icon="flame"
    title={t('trendingComingSoon', { defaultMessage: 'Trending — Bald verfugbar' })}
    description={t('trendingComingSoonDesc', { defaultMessage: 'Hier siehst du bald die meistgehandelten Spieler.' })}
  />
)}
```

**Step 4: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build, no references to old `ClubSaleSection`

**Step 5: Commit**

```bash
git add src/app/(app)/market/page.tsx
git commit -m "feat(market): wire ClubVerkaufSection into market page, add trending placeholder"
```

---

### Task 9: i18n — Add new translation keys

**Files:**
- Modify: `messages/de.json` (market namespace)
- Modify: `messages/tr.json` (market namespace)

**Step 1: Add keys to `messages/de.json`**

Add to the `"market"` object:
```json
"leagueFilter": "Liga wahlen",
"allLeagues": "Alle Ligen",
"dpcAvailable": "DPCs",
"avgSymbol": "Ø",
"closeClub": "Schliessen",
"hotSalesTitle": "Featured Sales",
"hotSalesPlaceholder": "Clubs konnen hier ihre DPCs bewerben — bald verfugbar.",
"trendingTab": "Trending",
"trendingComingSoon": "Trending — Bald verfugbar",
"trendingComingSoonDesc": "Hier siehst du bald die meistgehandelten Spieler."
```

**Step 2: Add keys to `messages/tr.json`**

Add to the `"market"` object:
```json
"leagueFilter": "Lig sec",
"allLeagues": "Tum Ligler",
"dpcAvailable": "DPC'ler",
"avgSymbol": "Ø",
"closeClub": "Kapat",
"hotSalesTitle": "One Cikan Satislar",
"hotSalesPlaceholder": "Kulupler burada DPC'lerini tanitabilir — yakinda.",
"trendingTab": "Trend",
"trendingComingSoon": "Trend — Yakinda",
"trendingComingSoonDesc": "Burada yakinda en cok islem goren oyunculari goreceksiniz."
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build

**Step 4: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "i18n: add club verkauf redesign translation keys (DE + TR)"
```

---

### Task 10: Cleanup — Delete old ClubSaleSection

**Files:**
- Delete: `src/components/market/ClubSaleSection.tsx`

**Step 1: Verify no remaining imports**

Run: `grep -r "ClubSaleSection" src/ --include="*.tsx" --include="*.ts"`
Expected: No results (all references replaced in Task 8)

**Step 2: Delete the file**

```bash
rm src/components/market/ClubSaleSection.tsx
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -30`
Expected: Clean build

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(market): remove old ClubSaleSection (replaced by ClubVerkaufSection)"
```

---

### Task 11: Visual QA — Test on mobile viewport

**Step 1: Start dev server**

Run: `npx next dev`

**Step 2: Manual checks (375px viewport)**

1. Navigate to `/market?tab=kaufen`
2. Verify Hot Sales placeholder appears at top
3. Verify Liga dropdown shows all available leagues
4. Select a league — verify club tiles filter
5. Verify club tiles show: logo, name, league, DPC count, avg price, countdown
6. Tap a club tile — verify accordion opens with position groups
7. Tap another club tile — verify first closes, second opens
8. Verify countdown colors: check different urgency levels
9. Verify filter chips work (position, L5, Fit)
10. Verify "Trending" tab shows placeholder
11. Check all touch targets are >= 44px
12. Verify no horizontal overflow

**Step 3: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "fix(market): club verkauf visual QA fixes"
```

---

## Summary

| Task | Component | Type |
|------|-----------|------|
| 1 | marketStore | Modify (add state) |
| 2 | CountdownBadge | Create |
| 3 | PlayerIPORow | Create |
| 4 | ClubAccordion | Create |
| 5 | ClubTile | Create |
| 6 | HotSalesCarousel | Create (placeholder) |
| 7 | ClubVerkaufSection | Create (orchestrator) |
| 8 | market/page.tsx | Modify (wire up) |
| 9 | i18n (DE + TR) | Modify |
| 10 | ClubSaleSection | Delete |
| 11 | Visual QA | Manual test |
