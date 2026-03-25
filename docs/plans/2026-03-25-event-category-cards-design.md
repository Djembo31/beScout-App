# Event Category Cards — Design Doc

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Sorare-style visual category card row above the EventBrowser that lets users browse events by type (bescout, club, sponsor, creator, special) with attractive gradient cards and BeScout logo watermark.

**Architecture:** New `EventCategoryCards` component renders 5 horizontal-scrollable gradient cards. Clicking a card sets `selectedCategory` state in `EventsTab`, which filters the existing `EventBrowser`. The category filter chips inside `EventBrowser` are hidden when a category card is active (to avoid redundancy).

**Tech Stack:** React, Tailwind CSS, lucide-react, next-intl, existing BeScout design tokens

---

## Task 1: Create EventCategoryCards component

**Files:**
- Create: `src/components/fantasy/events/EventCategoryCards.tsx`

**Step 1: Create the component**

```tsx
'use client';

import React from 'react';
import { Sparkles, Building2, Gift, UserPlus, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { EventType, FantasyEvent } from '../types';

type CategoryConfig = {
  type: EventType;
  icon: typeof Sparkles;
  gradient: string;
  logoDark?: boolean; // true = use black logo variant
};

const CATEGORIES: CategoryConfig[] = [
  {
    type: 'bescout',
    icon: Sparkles,
    gradient: 'from-amber-900/80 via-yellow-800/60 to-amber-950',
  },
  {
    type: 'club',
    icon: Building2,
    gradient: 'from-emerald-900/80 via-green-800/60 to-emerald-950',
  },
  {
    type: 'sponsor',
    icon: Gift,
    gradient: 'from-sky-900/80 via-cyan-800/60 to-sky-950',
  },
  {
    type: 'creator',
    icon: UserPlus,
    gradient: 'from-orange-900/80 via-amber-800/60 to-orange-950',
    logoDark: true,
  },
  {
    type: 'special',
    icon: Star,
    gradient: 'from-purple-900/80 via-violet-800/60 to-purple-950',
  },
];

type Props = {
  events: FantasyEvent[];
  selected: EventType | null;
  onSelect: (type: EventType | null) => void;
};

export function EventCategoryCards({ events, selected, onSelect }: Props) {
  const t = useTranslations('fantasy');

  // Count open (non-ended) events per type
  const counts = React.useMemo(() => {
    const map: Record<EventType, { open: number; live: number }> = {
      bescout: { open: 0, live: 0 },
      club: { open: 0, live: 0 },
      sponsor: { open: 0, live: 0 },
      creator: { open: 0, live: 0 },
      special: { open: 0, live: 0 },
    };
    for (const e of events) {
      if (e.type in map) {
        if (e.status !== 'ended') map[e.type].open++;
        if (e.status === 'running' || e.status === 'late-reg') map[e.type].live++;
      }
    }
    return map;
  }, [events]);

  return (
    <section>
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const { open, live } = counts[cat.type];
          const isActive = selected === cat.type;

          return (
            <button
              key={cat.type}
              onClick={() => onSelect(isActive ? null : cat.type)}
              className={cn(
                'flex-shrink-0 relative w-[220px] sm:w-[260px] aspect-[16/10] snap-start rounded-2xl',
                'border overflow-hidden transition-all duration-200',
                'flex flex-col justify-end p-4 text-left',
                'active:scale-[0.97]',
                `bg-gradient-to-br ${cat.gradient}`,
                isActive
                  ? 'ring-2 ring-gold border-gold/30 scale-[1.02]'
                  : 'border-white/10 hover:border-white/20 hover:brightness-110'
              )}
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
            >
              {/* Logo watermark */}
              <img
                src={cat.logoDark ? '/icons/bescout_icon_premium_black.svg' : '/icons/bescout_icon_premium.svg'}
                alt=""
                aria-hidden="true"
                className="absolute bottom-2 right-2 size-16 opacity-[0.08] -rotate-12 pointer-events-none select-none"
              />

              {/* Icon */}
              <div className="mb-2">
                <Icon className="size-6 text-white/80" aria-hidden="true" />
              </div>

              {/* Category name */}
              <div className="font-black text-sm uppercase tracking-wide text-white">
                {t(`eventCategories.${cat.type}`)}
              </div>

              {/* Event count + live badge */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/50">
                  {t('categoryCardCount', { count: open })}
                </span>
                {live > 0 && (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-bold">
                    <span className="size-1.5 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
                    {live} LIVE
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
```

**Step 2: Verify tsc compiles**

Run: `npx tsc --noEmit`
Expected: No errors related to EventCategoryCards

---

## Task 2: Add i18n key for category card count

**Files:**
- Modify: `messages/de.json` — add `fantasy.categoryCardCount`
- Modify: `messages/tr.json` — add `fantasy.categoryCardCount`

**Step 1: Add DE translation**

In `messages/de.json` under `fantasy` object, add:
```json
"categoryCardCount": "{count} Events offen"
```

**Step 2: Add TR translation**

In `messages/tr.json` under `fantasy` object, add:
```json
"categoryCardCount": "{count} Etkinlik acik"
```

---

## Task 3: Wire into EventsTab

**Files:**
- Modify: `src/components/fantasy/EventsTab.tsx`

**Step 1: Add state and import**

Add import:
```tsx
import { EventCategoryCards } from './events/EventCategoryCards';
import type { EventType } from './types';
```

Add state in component:
```tsx
const [selectedCategory, setSelectedCategory] = useState<EventType | null>(null);
```

**Step 2: Insert between EventSpotlight and EventBrowser**

```tsx
return (
  <div className="space-y-4">
    <EventPulse events={events} />
    <EventSpotlight events={events} onEventClick={onEventClick} />
    {/* NEW: Category Cards */}
    <EventCategoryCards
      events={events}
      selected={selectedCategory}
      onSelect={setSelectedCategory}
    />
    <EventBrowser
      events={events}
      onEventClick={onEventClick}
      categoryFilter={selectedCategory}
    />
  </div>
);
```

---

## Task 4: Update EventBrowser to accept categoryFilter prop

**Files:**
- Modify: `src/components/fantasy/events/EventBrowser.tsx`

**Step 1: Add categoryFilter prop**

Update Props type:
```tsx
type Props = {
  events: FantasyEvent[];
  onEventClick: (event: FantasyEvent) => void;
  categoryFilter?: EventType | null;
};
```

Update destructuring:
```tsx
export function EventBrowser({ events, onEventClick, categoryFilter }: Props) {
```

**Step 2: Sync internal category state with external filter**

Add useEffect after the existing category state:
```tsx
// Sync with external category filter from CategoryCards
useEffect(() => {
  if (categoryFilter) {
    setCategory(categoryFilter);
  } else {
    setCategory('all');
  }
}, [categoryFilter]);
```

**Step 3: Hide category filter pills when external filter is active**

Wrap the category pills section with a conditional:
```tsx
{!categoryFilter && (
  <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-0.5">
    {/* existing category pills */}
  </div>
)}
```

Keep the view toggle visible regardless.

---

## Task 5: Visual QA + tsc verification

**Step 1: Run tsc**
```bash
npx tsc --noEmit
```

**Step 2: Run vitest for fantasy components**
```bash
npx vitest run --reporter verbose 2>&1 | head -50
```

**Step 3: Visual check**
Open Fantasy page, verify:
- 5 category cards render in horizontal scroll row
- Each card has correct gradient, icon, logo watermark
- Clicking a card filters the EventBrowser
- Clicking the same card again deselects (shows all)
- Category pills in EventBrowser are hidden when a card is active
- Cards snap correctly on mobile scroll
- Active card has gold ring

---

## Task 6: Commit

```bash
git add src/components/fantasy/events/EventCategoryCards.tsx \
        src/components/fantasy/EventsTab.tsx \
        src/components/fantasy/events/EventBrowser.tsx \
        messages/de.json messages/tr.json
git commit -m "feat(fantasy): add Sorare-style event category cards

Visual category card row above EventBrowser with gradient backgrounds,
BeScout logo watermark, and live event badges. Clicking a card filters
the event list by type."
```
