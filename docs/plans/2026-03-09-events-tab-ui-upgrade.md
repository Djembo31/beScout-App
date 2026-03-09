# Fantasy Events Tab UI Upgrade — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the Fantasy Events tab to professional quality with Card/Row toggle, fill bars, urgency timers, and event requirement badges — matching the FixtureDetailModal quality standard.

**Architecture:** 4 new shared sub-components (FillBar, UrgencyTimer, RequirementChips, EventCardView) composed into existing EventBrowser/EventSpotlight/EventCompactRow. Card/Row toggle state persisted in localStorage. Requirements displayed as compact chips (Card view) or icon-only (Row view). Old unused EventCard.tsx + EventTableRow.tsx deleted.

**Tech Stack:** React, TypeScript strict, Tailwind CSS (dark theme), next-intl (DE+TR), lucide-react icons, localStorage for view persistence.

**Design Doc:** `docs/plans/2026-03-09-events-tab-ui-upgrade-design.md`

---

## Task 1: FillBar Component

**Files:**
- Create: `src/components/fantasy/events/FillBar.tsx`

**Context:**
- Design system: `bg-white/[0.02]` cards on `#0a0a0a`, borders `border-white/10`
- Fill bar tracks `participants / maxParticipants` percentage
- 3-tier color: green (0-79%), amber (80-94%), red (95-100%)
- When `maxParticipants` is null → show participant count text only, no bar

**Step 1: Create FillBar component**

```tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

type FillBarProps = {
  current: number;
  max: number | null;
  /** 'card' = full width bar + text, 'mini' = 40px bar only */
  variant?: 'card' | 'mini';
};

export function FillBar({ current, max, variant = 'card' }: FillBarProps) {
  if (max === null) {
    if (variant === 'mini') return null;
    return (
      <div className="text-xs text-white/40 font-mono tabular-nums">
        {current} Teilnehmer
      </div>
    );
  }

  const pct = Math.min((current / max) * 100, 100);
  const isFull = pct >= 100;

  const barColor =
    pct >= 95 ? 'bg-red-500' :
    pct >= 80 ? 'bg-amber-500' :
    'bg-green-500';

  if (variant === 'mini') {
    return (
      <div className="w-10 h-[3px] rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden" aria-hidden="true">
        <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/40 font-mono tabular-nums">{current} / {max}</span>
        {isFull ? (
          <span className="text-red-400 font-bold">VOLL</span>
        ) : (
          <span className="text-white/30 font-mono tabular-nums">{Math.round(pct)}%</span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/fantasy/events/FillBar.tsx
git commit -m "feat(events): add FillBar component with 3-tier color coding"
```

---

## Task 2: UrgencyTimer Component

**Files:**
- Create: `src/components/fantasy/events/UrgencyTimer.tsx`

**Context:**
- Existing `formatCountdown()` in `src/components/fantasy/helpers.ts:67-76` — reuse for time formatting
- 4-tier urgency colors: >24h white/40, 6-24h white/60, 1-6h amber, <1h red+pulse
- For `ended` status: show "Beendet" in muted text
- Uses next-intl for i18n

**Step 1: Create UrgencyTimer component**

```tsx
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatCountdown } from '../helpers';

type UrgencyTimerProps = {
  lockTime: number;
  status: string;
  className?: string;
};

export function UrgencyTimer({ lockTime, status, className }: UrgencyTimerProps) {
  if (status === 'ended') {
    return <span className={cn('text-xs text-white/25', className)}>Beendet</span>;
  }

  if (status === 'running') {
    return <span className={cn('text-xs text-green-500 font-bold', className)}>LIVE</span>;
  }

  const diff = lockTime - Date.now();
  if (diff <= 0) {
    return <span className={cn('text-xs text-white/30', className)}>Gestartet</span>;
  }

  const hours = diff / 3600000;

  const urgencyClass =
    hours < 1 ? 'text-red-400 animate-pulse motion-reduce:animate-none font-bold' :
    hours < 6 ? 'text-amber-400 font-semibold' :
    hours < 24 ? 'text-white/60' :
    'text-white/40';

  return (
    <span className={cn('text-xs font-mono tabular-nums', urgencyClass, className)}>
      {formatCountdown(lockTime)}
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/fantasy/events/UrgencyTimer.tsx
git commit -m "feat(events): add UrgencyTimer with 4-tier urgency colors"
```

---

## Task 3: RequirementChips Component

**Files:**
- Create: `src/components/fantasy/events/RequirementChips.tsx`

**Context:**
- `FantasyEvent.requirements` type defined in `src/components/fantasy/types.ts:71-77`:
  ```typescript
  requirements: {
    dpcPerSlot?: number;
    minDpc?: number;
    minClubPlayers?: number;
    minScoutLevel?: number;
    specificClub?: string;
  };
  ```
- Additional: `minSubscriptionTier?: string` and `leagueId?: string` + `leagueName?: string` on FantasyEvent
- Two display modes: 'chips' (Card view — icon+text) and 'icons' (Row view — icon only)
- Use lucide-react: Lock, TrendingUp, Layers, Wallet, Users, Building2, Globe

**Step 1: Create RequirementChips component**

```tsx
'use client';

import React from 'react';
import { Lock, TrendingUp, Layers, Wallet, Users, Building2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FantasyEvent } from '../types';

type RequirementChipsProps = {
  event: FantasyEvent;
  /** 'chips' = icon + text label, 'icons' = icon only (compact) */
  variant?: 'chips' | 'icons';
  /** Max items to show before "+N" overflow */
  max?: number;
};

type ReqItem = {
  icon: typeof Lock;
  label: string;
  color: string;
};

function getRequirements(event: FantasyEvent): ReqItem[] {
  const items: ReqItem[] = [];

  if (event.minSubscriptionTier) {
    const tierLabel = event.minSubscriptionTier === 'gold' ? 'Gold+' :
      event.minSubscriptionTier === 'silber' ? 'Silber+' : 'Bronze+';
    items.push({ icon: Lock, label: tierLabel, color: event.minSubscriptionTier === 'gold' ? 'text-gold' : event.minSubscriptionTier === 'silber' ? 'text-gray-300' : 'text-orange-300' });
  }

  if (event.requirements.minScoutLevel) {
    items.push({ icon: TrendingUp, label: `Level ${event.requirements.minScoutLevel}+`, color: 'text-purple-400' });
  }

  if (event.requirements.dpcPerSlot) {
    items.push({ icon: Layers, label: `Min ${event.requirements.dpcPerSlot} DPC/Slot`, color: 'text-sky-400' });
  }

  if (event.requirements.minDpc) {
    items.push({ icon: Wallet, label: `Min ${event.requirements.minDpc} DPC`, color: 'text-sky-400' });
  }

  if (event.requirements.specificClub) {
    items.push({ icon: Building2, label: event.requirements.specificClub, color: 'text-green-400' });
  }

  if (event.requirements.minClubPlayers) {
    items.push({ icon: Users, label: `Min ${event.requirements.minClubPlayers} Club`, color: 'text-green-400' });
  }

  if (event.leagueId && event.leagueName) {
    items.push({ icon: Globe, label: event.leagueName, color: 'text-amber-400' });
  }

  return items;
}

export function RequirementChips({ event, variant = 'chips', max = 4 }: RequirementChipsProps) {
  const items = getRequirements(event);
  if (items.length === 0) return null;

  const visible = items.slice(0, max);
  const overflow = items.length - max;

  if (variant === 'icons') {
    return (
      <div className="flex items-center gap-1">
        {visible.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className={cn('size-4 flex items-center justify-center', item.color)}
              title={item.label}
            >
              <Icon className="size-3" aria-hidden="true" />
            </div>
          );
        })}
        {overflow > 0 && (
          <span className="text-xs text-white/30 font-mono">+{overflow}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {visible.map((item, i) => {
        const Icon = item.icon;
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs',
              'bg-white/[0.06] border border-white/[0.08]',
              item.color
            )}
          >
            <Icon className="size-3" aria-hidden="true" />
            {item.label}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs bg-white/[0.04] text-white/30 font-mono">
          +{overflow}
        </span>
      )}
    </div>
  );
}

/** Check if user meets all requirements — used for "Fuer mich" filter */
export function hasRequirements(event: FantasyEvent): boolean {
  const r = event.requirements;
  return !!(
    event.minSubscriptionTier ||
    r.dpcPerSlot || r.minDpc || r.minClubPlayers ||
    r.minScoutLevel || r.specificClub ||
    event.leagueId
  );
}
```

**Step 2: Commit**

```bash
git add src/components/fantasy/events/RequirementChips.tsx
git commit -m "feat(events): add RequirementChips with chips/icons variants"
```

---

## Task 4: EventCardView Component

**Files:**
- Create: `src/components/fantasy/events/EventCardView.tsx`

**Context:**
- Replaces unused `src/components/fantasy/EventCard.tsx` (179 lines)
- Uses new sub-components: FillBar, UrgencyTimer, RequirementChips
- Card surface: `bg-white/[0.02] border border-white/10 rounded-2xl` (design system)
- Inset light: `shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]`
- CTA: `Button` from `@/components/ui` — variant `gold` for open, `outline` for joined
- Event type styles: `getTypeStyle()` from `src/components/fantasy/helpers.ts:17-25`
- i18n keys mostly exist already in `messages/{locale}.json` under `fantasy.*`

**Step 1: Create EventCardView component**

```tsx
'use client';

import React from 'react';
import { Plus, Edit3, Lock, Eye, Play, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { FantasyEvent } from '../types';
import { getTypeStyle, getTierStyle } from '../helpers';
import { FillBar } from './FillBar';
import { UrgencyTimer } from './UrgencyTimer';
import { RequirementChips } from './RequirementChips';

type Props = {
  event: FantasyEvent;
  onClick: () => void;
};

export function EventCardView({ event, onClick }: Props) {
  const t = useTranslations('fantasy');
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;
  const tierStyle = getTierStyle(event.eventTier);
  const isArena = event.eventTier === 'arena';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl p-4 border transition-colors active:scale-[0.98]',
        'bg-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
        event.isJoined
          ? 'border-green-500/20 bg-green-500/[0.02]'
          : isArena
            ? 'border-amber-500/20'
            : 'border-white/10 hover:border-white/20'
      )}
    >
      {/* Row 1: Type + Tier + Timer */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <div className={cn('size-7 rounded-lg flex items-center justify-center', typeStyle.bg)}>
            <TypeIcon className={cn('size-3.5', typeStyle.color)} aria-hidden="true" />
          </div>
          {isArena && (
            <span className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold border',
              tierStyle.bg, tierStyle.border, tierStyle.color
            )}>
              <tierStyle.icon className="size-3" aria-hidden="true" />
              Arena
            </span>
          )}
          {event.isJoined && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-500/15">
              <CheckCircle2 className="size-3 text-green-500" aria-hidden="true" />
              <span className="text-xs font-bold text-green-500">{t('eventJoined')}</span>
            </div>
          )}
        </div>
        <UrgencyTimer lockTime={event.lockTime} status={event.status} />
      </div>

      {/* Row 2: Name */}
      <h3 className="font-black text-sm line-clamp-2 mb-1">{event.name}</h3>

      {/* Row 3: Meta */}
      <div className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
        <span>{event.format}</span>
        <span className="text-white/15">·</span>
        <span>{event.mode === 'league' ? t('modeLeague') : t('modeTournament')}</span>
        {event.clubName && (
          <>
            <span className="text-white/15">·</span>
            <span className="truncate max-w-[100px]">{event.clubName}</span>
          </>
        )}
      </div>

      {/* Row 4: Requirement Chips */}
      <div className="mb-3">
        <RequirementChips event={event} variant="chips" max={3} />
      </div>

      {/* Row 5: Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-white/[0.03] rounded-lg">
          <div className={cn('font-mono font-bold text-sm tabular-nums', event.buyIn === 0 ? 'text-green-500' : 'text-gold')}>
            {event.buyIn === 0 ? t('freeEntry') : event.buyIn}
          </div>
          <div className="text-xs text-white/40">{t('entryLabel')}</div>
        </div>
        <div className="text-center p-2 bg-white/[0.03] rounded-lg">
          <div className="font-mono font-bold text-sm text-purple-400 tabular-nums">
            {event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool}
          </div>
          <div className="text-xs text-white/40">{t('prizeLabel')}</div>
        </div>
        <div className="text-center p-2 bg-white/[0.03] rounded-lg">
          <div className="font-mono font-bold text-sm tabular-nums">{event.participants}</div>
          <div className="text-xs text-white/40">{t('playersCountLabel')}</div>
        </div>
      </div>

      {/* Row 6: Fill bar */}
      <div className="mb-3">
        <FillBar current={event.participants} max={event.maxParticipants} variant="card" />
      </div>

      {/* Row 7: CTA */}
      <div onClick={e => e.stopPropagation()}>
        <Button
          variant={event.isJoined ? 'outline' : 'gold'}
          fullWidth
          size="sm"
          onClick={onClick}
        >
          {event.isJoined && event.status === 'ended' ? (
            <><Eye className="size-4" aria-hidden="true" /> {t('resultsBtn')}</>
          ) : event.isJoined && event.status === 'running' ? (
            <><Lock className="size-4" aria-hidden="true" /> {t('eventJoined')}</>
          ) : event.isJoined ? (
            <><Edit3 className="size-4" aria-hidden="true" /> {t('lineupBtn')}</>
          ) : event.status === 'ended' ? (
            <><Eye className="size-4" aria-hidden="true" /> {t('resultsBtn')}</>
          ) : event.status === 'running' ? (
            <><Play className="size-4" aria-hidden="true" /> {t('runningBtn')}</>
          ) : (
            <><Plus className="size-4" aria-hidden="true" /> {event.buyIn === 0 ? t('joinBtn') : `${event.buyIn} $SCOUT`}</>
          )}
        </Button>
      </div>
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/fantasy/events/EventCardView.tsx
git commit -m "feat(events): add EventCardView with fill bar, urgency, requirements"
```

---

## Task 5: Enhance EventCompactRow

**Files:**
- Modify: `src/components/fantasy/events/EventCompactRow.tsx` (full rewrite, 80 → ~95 lines)

**Context:**
- Current: uses `formatCountdown()` for timer, inline style for left border, no fill bar, no requirements
- Target: UrgencyTimer replaces raw countdown, mini FillBar before status, RequirementChips icons before chevron
- Left border via `borderLeftColor` inline → keep inline (type color mapping already works)
- Keep the same Props interface `{ event, onClick }`

**Step 1: Rewrite EventCompactRow with enhancements**

Replace the entire file content with:

```tsx
'use client';

import React from 'react';
import { CheckCircle2, ChevronRight, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { FantasyEvent } from '../types';
import { getTypeStyle } from '../helpers';
import { FillBar } from './FillBar';
import { UrgencyTimer } from './UrgencyTimer';
import { RequirementChips } from './RequirementChips';

type Props = {
  event: FantasyEvent;
  onClick: () => void;
};

export function EventCompactRow({ event, onClick }: Props) {
  const t = useTranslations('fantasy');
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors text-left active:scale-[0.98]',
        event.isJoined && 'bg-green-500/[0.03]'
      )}
      style={{ borderLeftWidth: '2px', borderLeftColor: typeStyle.color === 'text-gold' ? '#FFD700' : typeStyle.color === 'text-green-500' ? '#22c55e' : typeStyle.color === 'text-sky-400' ? '#38bdf8' : typeStyle.color === 'text-orange-400' ? '#fb923c' : typeStyle.color === 'text-purple-400' ? '#c084fc' : 'rgba(255,255,255,0.1)' }}
    >
      {/* Type icon */}
      <div className={cn('flex-shrink-0 size-8 rounded-lg flex items-center justify-center', typeStyle.bg)}>
        <TypeIcon className={cn('size-4', typeStyle.color)} aria-hidden="true" />
      </div>

      {/* Name + Meta */}
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm font-semibold">{event.name}</div>
        <div className="flex items-center gap-1.5 text-xs text-white/40 mt-0.5 flex-wrap">
          <span>{event.format}</span>
          <span className="text-white/15">·</span>
          <span>{event.participants}/{event.maxParticipants ?? '∞'}</span>
          <span className="text-white/15">·</span>
          <span className={event.buyIn === 0 ? 'text-green-500' : 'text-gold'}>
            {event.buyIn === 0 ? t('freeEntry') : `${event.buyIn} $SCOUT`}
          </span>
          {event.prizePool > 0 && (
            <>
              <span className="text-white/15">·</span>
              <span className="text-purple-400 font-mono tabular-nums">
                {event.prizePool >= 1000 ? `${(event.prizePool / 1000).toFixed(0)}K` : event.prizePool} Prize
              </span>
            </>
          )}
        </div>
      </div>

      {/* Requirement icons (compact) */}
      <RequirementChips event={event} variant="icons" max={3} />

      {/* Mini fill bar */}
      <FillBar current={event.participants} max={event.maxParticipants} variant="mini" />

      {/* Status + arrow */}
      <div className="flex-shrink-0 flex items-center gap-1.5">
        {event.isJoined ? (
          <CheckCircle2 className="size-4 text-green-500" aria-hidden="true" />
        ) : event.status === 'ended' ? (
          <Lock className="size-3.5 text-white/25" aria-hidden="true" />
        ) : (
          <UrgencyTimer lockTime={event.lockTime} status={event.status} />
        )}
        <ChevronRight className="size-3.5 text-white/15" aria-hidden="true" />
      </div>
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/fantasy/events/EventCompactRow.tsx
git commit -m "feat(events): enhance CompactRow with fill bar, urgency, requirement icons"
```

---

## Task 6: Enhance EventSpotlight

**Files:**
- Modify: `src/components/fantasy/events/EventSpotlight.tsx` (115 → ~120 lines)

**Context:**
- Spotlight = horizontal scroll of LIVE + Late-Reg cards
- Current: 200px wide, no fill bar, no requirements, no urgency colors
- Target: 260px wide, mini fill bar, UrgencyTimer, requirement icons (max 2)
- Keep same overall structure, just enhance the card content

**Step 1: Update EventSpotlight**

Changes to make:
1. Card width: `w-[200px]` → `w-[260px]`
2. Replace inline status indicator with `<UrgencyTimer />`
3. Add `<FillBar variant="mini" />` after participants meta
4. Add `<RequirementChips variant="icons" max={2} />` in header
5. Add green border when joined: `event.isJoined && 'border-green-500/20'`

Replace imports at top:
```tsx
import { FillBar } from './FillBar';
import { UrgencyTimer } from './UrgencyTimer';
import { RequirementChips } from './RequirementChips';
```

Remove unused imports: `Radio, Play, Plus, Edit3, Lock` — only keep what's needed.

Key changes in the card JSX:
- Width: `w-[200px]` → `w-[260px]`
- After meta section, before CTA: add `<FillBar current={event.participants} max={event.maxParticipants} variant="mini" />`
- Header status badge: replace inline status div with `<UrgencyTimer lockTime={event.lockTime} status={event.status} />`
- Add `<RequirementChips event={event} variant="icons" max={2} />` in the header row

**Step 2: Commit**

```bash
git add src/components/fantasy/events/EventSpotlight.tsx
git commit -m "feat(events): enhance Spotlight cards — wider, fill bar, urgency, reqs"
```

---

## Task 7: Card/Row Toggle in EventBrowser + "Fuer mich" Filter

**Files:**
- Modify: `src/components/fantasy/events/EventBrowser.tsx` (159 → ~200 lines)
- Modify: `src/components/fantasy/EventsTab.tsx` (44 → ~55 lines)

**Context:**
- Current EventBrowser: shows only `EventCompactRow` in status-grouped lists
- Target: Card/Row toggle with localStorage persistence, renders either `EventCardView` or `EventCompactRow`
- ViewMode type already exists: `'cards' | 'table'` in `src/components/fantasy/types.ts:11`
- "Fuer mich" filter: new pill after "Alle" that filters events where user meets requirements (approximation: show events with NO requirements, since we don't have user state here — or show events WITH requirements as a "restrictive" filter)
- Actually simpler: "Fuer mich" = events where `isJoined` OR events with no restrictive requirements. But since we don't have user-level/subscription info in the event list context, a practical approach is: filter to only events with NO requirements (user is guaranteed eligible). Label as "Offen fuer alle" instead.

**Step 1: Update EventBrowser with toggle and card view**

Key changes:
1. Add `viewMode` state with localStorage: `useState<ViewMode>(() => { if (typeof window !== 'undefined') { return (localStorage.getItem('bescout-events-view') as ViewMode) ?? 'cards'; } return 'cards'; })`
2. Add toggle icons (LayoutGrid + List from lucide-react) next to category pills
3. Import `EventCardView` for card rendering
4. When `viewMode === 'cards'`, render `EventCardView` in a grid instead of `EventCompactRow` in list
5. Grid: `grid grid-cols-1 sm:grid-cols-2 gap-3` for cards, keep existing `divide-y` list for rows
6. Persist toggle: `useEffect` to save to localStorage on change

Add to CATEGORIES array (after 'all'):
```tsx
{ id: 'eligible' as EventCategory, labelKey: 'eligible', icon: CheckCircle2 },
```

Update EventCategory type: `type EventCategory = 'all' | 'eligible' | EventType;`

Filter logic for 'eligible': `events.filter(e => !hasRequirements(e))` — import `hasRequirements` from RequirementChips.

**Step 2: Update EventsTab to remove unused `onToggleInterest` prop**

The `onToggleInterest` prop is defined but never passed through. Clean it up from the type.

**Step 3: Commit**

```bash
git add src/components/fantasy/events/EventBrowser.tsx src/components/fantasy/EventsTab.tsx
git commit -m "feat(events): card/row toggle with localStorage + eligible filter"
```

---

## Task 8: i18n Keys (DE + TR)

**Files:**
- Modify: `messages/de.json` — add ~12 new keys under `fantasy.*`
- Modify: `messages/tr.json` — add ~12 new keys under `fantasy.*`

**Context:**
- Most event-related keys already exist (freeEntry, entryLabel, prizeLabel, etc.)
- New keys needed for: UrgencyTimer labels, FillBar "VOLL", RequirementChips labels, Card/Row toggle, eligible filter
- Keep existing keys, add new ones near existing event keys

**Step 1: Add new i18n keys to de.json**

Add these under the `fantasy` section (after line ~511 in de.json, near existing event keys):

```json
"fillFull": "VOLL",
"fillParticipants": "{count} Teilnehmer",
"urgencyStarted": "Gestartet",
"urgencyEnded": "Beendet",
"modeLeague": "Liga",
"modeTournament": "Turnier",
"eventCategories": {
  ... existing keys ...,
  "eligible": "Offen für alle"
},
"viewCards": "Kartenansicht",
"viewRows": "Listenansicht",
"reqLevel": "Level {level}+",
"reqDpcSlot": "Min {count} DPC/Slot",
"reqMinDpc": "Min {count} DPC",
"reqClubPlayers": "Min {count} Club",
```

Note: Check if `modeLeague` and `modeTournament` already exist before adding.

**Step 2: Add matching keys to tr.json**

```json
"fillFull": "DOLU",
"fillParticipants": "{count} Katılımcı",
"urgencyStarted": "Başladı",
"urgencyEnded": "Bitti",
"modeLeague": "Lig",
"modeTournament": "Turnuva",
"eventCategories": {
  ... existing keys ...,
  "eligible": "Herkese Açık"
},
"viewCards": "Kart Görünümü",
"viewRows": "Liste Görünümü",
"reqLevel": "Level {level}+",
"reqDpcSlot": "Min {count} DPC/Slot",
"reqMinDpc": "Min {count} DPC",
"reqClubPlayers": "Min {count} Kulüp",
```

**Step 3: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "feat(i18n): add Events Tab UI upgrade keys (DE + TR)"
```

---

## Task 9: Delete Unused Files + Barrel Export Update

**Files:**
- Delete: `src/components/fantasy/EventCard.tsx` (179 lines — replaced by EventCardView)
- Delete: `src/components/fantasy/EventTableRow.tsx` (102 lines — replaced by enhanced CompactRow)

**Context:**
- Both files exist but are NOT imported anywhere in the codebase (verified in design phase)
- EventCardView is the replacement for EventCard
- Enhanced EventCompactRow is the replacement for EventTableRow
- Check for any barrel exports that reference these files

**Step 1: Verify no imports exist**

Run: `grep -r "EventCard\b" src/ --include="*.tsx" --include="*.ts" | grep -v EventCardView | grep -v "__test__"`
Run: `grep -r "EventTableRow" src/ --include="*.tsx" --include="*.ts"`

Expected: No results (or only the files themselves).

**Step 2: Delete files**

```bash
git rm src/components/fantasy/EventCard.tsx src/components/fantasy/EventTableRow.tsx
```

**Step 3: Check and update any barrel exports**

Check `src/components/fantasy/index.ts` or similar for exports of deleted components. Remove if found.

**Step 4: Commit**

```bash
git commit -m "chore: delete unused EventCard + EventTableRow (replaced by EventCardView + enhanced CompactRow)"
```

---

## Task 10: Build Verification + Visual QA

**Files:** None (verification only)

**Step 1: Run TypeScript build**

Run: `npx next build`
Expected: 0 errors, successful build

**Step 2: Check for import errors**

If build fails, fix missing imports or type errors.

**Step 3: Visual spot-check**

If dev server available, navigate to Fantasy → Events tab:
- Verify Card view renders on mobile viewport
- Toggle to Row view, verify CompactRow with fill bars
- Check Spotlight section for wider cards
- Verify requirement chips show when events have requirements

**Step 4: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix(events): build fixes for Events Tab UI upgrade"
```

---

## Task 11: Quality Pipeline

**Files:** Various (depends on findings)

**Step 1: Run baseline-ui on new components**

Invoke: `/baseline-ui src/components/fantasy/events/EventCardView.tsx`
Invoke: `/baseline-ui src/components/fantasy/events/EventBrowser.tsx`

**Step 2: Run fixing-accessibility on new components**

Invoke: `/fixing-accessibility src/components/fantasy/events/EventCardView.tsx`

**Step 3: Fix any findings**

Apply baseline-ui and accessibility fixes.

**Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix(events): baseline-ui + accessibility fixes"
```

---

## Summary

| Task | Component | Estimated Lines | Dependencies |
|------|-----------|----------------|--------------|
| 1 | FillBar | ~50 | None |
| 2 | UrgencyTimer | ~40 | `helpers.ts` |
| 3 | RequirementChips | ~100 | `types.ts` |
| 4 | EventCardView | ~130 | Tasks 1-3 |
| 5 | EventCompactRow enhance | ~90 | Tasks 1-3 |
| 6 | EventSpotlight enhance | ~120 | Tasks 1-3 |
| 7 | EventBrowser toggle | ~200 | Tasks 4-5 |
| 8 | i18n (DE + TR) | ~30 keys | None |
| 9 | Delete old files | -281 | Task 4 |
| 10 | Build verification | 0 | All |
| 11 | Quality pipeline | ~10 fixes | Task 10 |

**Execution order:** Tasks 1-3 (parallel, no deps) → Tasks 4-6 (parallel, depend on 1-3) → Tasks 7-8 (parallel) → Task 9 → Task 10 → Task 11
