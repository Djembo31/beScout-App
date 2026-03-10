# Club Storefront Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the club detail page from an information sheet into a sales-oriented storefront where clubs sell players, subscriptions, engage fans through votes/bounties/events, and reward scouts.

**Architecture:** Extract ClubContent.tsx (1683 lines) into section components. Overview tab becomes a landing page with 7 sections (Hero, Active Offers, Squad Preview, Mitmachen, Events, Membership, Recent Activity). Kader tab gets collection progress, view modes, and buy CTAs. All data queries already exist — this is purely UI composition. Club Discovery gets sales signals (active IPOs badge, buyable players count).

**Tech Stack:** React, TypeScript strict, Tailwind CSS (dark theme), next-intl (DE+TR), lucide-react, React Query (existing hooks), existing services.

**Design Doc:** `docs/plans/2026-03-10-club-storefront-design.md`

---

## Execution Waves

```
Wave 1: New section components (6 parallel, no deps)
Wave 2: ClubContent.tsx refactor — swap inline sections for new components
Wave 3: Kader tab upgrade (Collection Progress + View Modes)
Wave 4: Club Discovery enhancements
Wave 5: i18n + Build verification
```

---

## Task 1: ActiveOffersSection

**Files:**
- Create: `src/components/club/sections/ActiveOffersSection.tsx`

**Context:**
- Shows active IPOs for this club as horizontal-scroll cards
- Data: `useActiveIpos()` from `src/lib/queries/ipos.ts:9` — returns `DbIpo[]`, filter by `clubId`
- Players: `Player[]` passed as prop (already fetched in ClubContent)
- Needs: player photo, name, position, price, fill bar, countdown, "Kaufen" CTA
- Reuse: `FillBar` (just built in `src/components/fantasy/events/FillBar.tsx`)
- Reuse: `UrgencyTimer` pattern for IPO deadline countdown
- Reuse: `PlayerPhoto` from `src/components/player/index.tsx`
- Link "Kaufen" → `/player/[id]` (existing player detail page handles purchase)
- If no active IPOs → return null (section hidden)

**Step 1: Create component**

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { fmtScout } from '@/lib/utils';
import { PlayerPhoto } from '@/components/player';
import { FillBar } from '@/components/fantasy/events/FillBar';
import type { Player } from '@/types';
import type { DbIpo } from '@/lib/services/ipo';

type Props = {
  ipos: DbIpo[];
  players: Player[];
  clubColor: string;
};

export function ActiveOffersSection({ ipos, players, clubColor }: Props) {
  const t = useTranslations('club');

  if (ipos.length === 0) return null;

  const playerMap = new Map(players.map(p => [p.id, p]));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5" style={{ color: clubColor }} />
          <h2 className="font-black text-balance">{t('activeOffers')}</h2>
        </div>
        <span className="text-xs text-white/40 font-mono tabular-nums">{ipos.length}</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {ipos.map(ipo => {
          const player = playerMap.get(ipo.player_id);
          if (!player) return null;

          const sold = ipo.total_supply - ipo.remaining_supply;
          const pct = ipo.total_supply > 0 ? Math.round((sold / ipo.total_supply) * 100) : 0;
          const endDate = new Date(ipo.ends_at);
          const diff = endDate.getTime() - Date.now();
          const daysLeft = Math.max(0, Math.ceil(diff / 86400000));

          return (
            <Link
              key={ipo.id}
              href={`/player/${player.id}`}
              className={cn(
                'flex-shrink-0 w-[200px] snap-start rounded-2xl p-3 border transition-colors',
                'bg-white/[0.02] border-white/10 hover:border-white/20 active:scale-[0.98]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              )}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <PlayerPhoto first={player.first_name} last={player.last_name} pos={player.position} size="sm" />
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{player.first_name} {player.last_name}</div>
                  <div className="text-[10px] text-white/40">{player.position}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-gold text-sm tabular-nums">{fmtScout(ipo.price_cents)}</span>
                <span className={cn(
                  'text-xs font-mono tabular-nums',
                  daysLeft <= 1 ? 'text-red-400 font-bold' : daysLeft <= 3 ? 'text-amber-400' : 'text-white/40'
                )}>
                  {daysLeft}d
                </span>
              </div>

              <FillBar current={sold} max={ipo.total_supply} variant="card" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/club/sections/ActiveOffersSection.tsx
git commit -m "feat(club): add ActiveOffersSection — IPO cards with fill bar + countdown"
```

---

## Task 2: SquadPreviewSection

**Files:**
- Create: `src/components/club/sections/SquadPreviewSection.tsx`

**Context:**
- Shows top 5 trending players + collection progress badge
- Players sorted by 24h price change (existing `change_24h` field on Player)
- Collection: count user's holdings for this club via `holdings` prop
- "Alle Spieler" link switches to Kader tab (callback prop)
- Reuse: `PlayerIdentity` from `src/components/player/index.tsx`

**Step 1: Create component**

```tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { PlayerPhoto } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import type { Player } from '@/types';

type Props = {
  players: Player[];
  ownedPlayerIds: Set<string>;
  clubColor: string;
  onViewAll: () => void;
};

export function SquadPreviewSection({ players, ownedPlayerIds, clubColor, onViewAll }: Props) {
  const t = useTranslations('club');

  const totalPlayers = players.length;
  const ownedCount = players.filter(p => ownedPlayerIds.has(p.id)).length;
  const trending = [...players]
    .sort((a, b) => (b.change_24h ?? 0) - (a.change_24h ?? 0))
    .slice(0, 5);

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5" style={{ color: clubColor }} />
          <span className="font-black text-balance">{t('trendingPlayers')}</span>
        </div>
        <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-gold font-semibold hover:text-gold/80 transition-colors">
          {t('viewAll')} <ChevronRight className="size-3" />
        </button>
      </div>

      {/* Collection progress */}
      {totalPlayers > 0 && (
        <div className="mb-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/50">{t('collectionProgress')}</span>
            <span className="text-xs font-mono font-bold tabular-nums" style={{ color: clubColor }}>
              {ownedCount} / {totalPlayers}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${totalPlayers > 0 ? (ownedCount / totalPlayers) * 100 : 0}%`, background: clubColor }}
            />
          </div>
        </div>
      )}

      {/* Trending list */}
      <div className="space-y-1">
        {trending.map((player, i) => {
          const change = player.change_24h ?? 0;
          const isOwned = ownedPlayerIds.has(player.id);
          return (
            <Link
              key={player.id}
              href={`/player/${player.id}`}
              className={cn(
                'flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/[0.04]',
                isOwned && 'bg-gold/[0.03]'
              )}
            >
              <span className="text-xs font-mono text-white/30 w-4 text-center tabular-nums">{i + 1}</span>
              <PlayerPhoto first={player.first_name} last={player.last_name} pos={player.position} size="xs" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {player.last_name}
                  {isOwned && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-gold/15 text-gold font-bold">{t('owned')}</span>}
                </div>
                <div className="text-xs text-white/40">{player.position} · {fmtScout(player.floor_price ?? 0)}</div>
              </div>
              <div className={cn('text-xs font-mono font-bold tabular-nums flex items-center gap-0.5', change >= 0 ? 'text-green-500' : 'text-red-400')}>
                {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(change).toFixed(1)}%
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/club/sections/SquadPreviewSection.tsx
git commit -m "feat(club): add SquadPreviewSection — trending players + collection progress"
```

---

## Task 3: MitmachenSection

**Files:**
- Create: `src/components/club/sections/MitmachenSection.tsx`

**Context:**
- Combines: Scout profile, Bounties, Votes/Polls, Top Scouts leaderboard
- Data hooks (ALL EXIST):
  - `useActiveBounties(userId, clubId)` from `src/lib/queries/bounties.ts:9`
  - `useClubVotes(clubId)` from `src/lib/queries/votes.ts:9`
  - `useCommunityPolls(clubId)` from `src/lib/queries/polls.ts:9`
  - `useTopScouts(clubId)` from `src/lib/queries/scouting.ts:18`
  - `useScoutingStats(userId)` from `src/lib/queries/scouting.ts:27`
- Reuse existing card components:
  - `BountyCard` from `src/components/community/BountyCard.tsx`
  - Vote rendering inline (same pattern as existing ClubContent votes section)
- Scout profile: shows user's analyst score, report count, earned $SCOUT
- Top 3 scouts: podium-style (reuse TopScoutsWidget pattern from ClubContent line ~484)
- Show max 3 bounties, max 2 votes, top 3 scouts
- Each sub-section only renders if data exists

**Step 1: Create component**

The component should:
1. Accept `clubId`, `userId`, `clubColor` as props
2. Use the 5 hooks listed above
3. Render 4 sub-cards: Scout Profile, Bounties, Votes, Top Scouts
4. If ALL sub-sections are empty, return null
5. Use existing `BountyCard` for bounties
6. Render votes inline (question + option bars + count — same pattern as ClubContent lines 1414-1430)
7. Render scout profile as a compact stats card (rank + score + reports + earned)
8. Render top 3 scouts with medal colors (gold/silver/bronze)

This is the largest section component (~200 lines). Key imports:
```tsx
import { useActiveBounties } from '@/lib/queries/bounties';
import { useClubVotes } from '@/lib/queries/votes';
import { useCommunityPolls } from '@/lib/queries/polls';
import { useTopScouts, useScoutingStats } from '@/lib/queries/scouting';
import { BountyCard } from '@/components/community/BountyCard';
```

**Step 2: Commit**

```bash
git add src/components/club/sections/MitmachenSection.tsx
git commit -m "feat(club): add MitmachenSection — votes, bounties, scout profile, leaderboard"
```

---

## Task 4: ClubEventsSection

**Files:**
- Create: `src/components/club/sections/ClubEventsSection.tsx`

**Context:**
- Shows next 2-3 open club-specific fantasy events
- Reuse: `EventCardView` from `src/components/fantasy/events/EventCardView.tsx` (just built)
- Data: needs club's events — use existing event data from `FantasyContent` or fetch via service
- For now: accept `events: FantasyEvent[]` as prop (parent filters by clubId)
- If no events → return null

**Step 1: Create component**

```tsx
'use client';

import React from 'react';
import { Calendar, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { EventCardView } from '@/components/fantasy/events/EventCardView';
import type { FantasyEvent } from '@/components/fantasy/types';

type Props = {
  events: FantasyEvent[];
  clubColor: string;
  onEventClick: (event: FantasyEvent) => void;
};

export function ClubEventsSection({ events, clubColor, onEventClick }: Props) {
  const t = useTranslations('club');

  const openEvents = events
    .filter(e => e.status === 'registering' || e.status === 'upcoming' || e.status === 'running' || e.status === 'late-reg')
    .slice(0, 3);

  if (openEvents.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="size-5" style={{ color: clubColor }} />
        <h2 className="font-black text-balance">{t('clubEvents')}</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {openEvents.map(event => (
          <EventCardView key={event.id} event={event} onClick={() => onEventClick(event)} />
        ))}
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/club/sections/ClubEventsSection.tsx
git commit -m "feat(club): add ClubEventsSection — reuses EventCardView"
```

---

## Task 5: MembershipSection

**Files:**
- Create: `src/components/club/sections/MembershipSection.tsx`

**Context:**
- Shows subscription tier comparison (Bronze/Silber/Gold)
- Data: `TIER_CONFIG` from `src/lib/services/clubSubscriptions.ts:28`
- Data: `useClubSubscription(userId, clubId)` from `src/lib/queries/misc.ts`
- Active tier highlighted, CTA to subscribe/upgrade
- Benefits per tier with checkmarks
- `subscribeTo(userId, clubId, tier)` for purchase action

**Step 1: Create component**

Shows 3 tier cards in a row (1 col mobile, 3 col desktop). Each card:
- Tier name + price ($SCOUT/Monat)
- Benefits list with checkmarks
- Current tier badge if active
- "Mitglied werden" gold CTA or "Aktiv" badge

```tsx
'use client';

import React, { useState } from 'react';
import { Crown, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { fmtScout } from '@/lib/utils';
import { TIER_CONFIG, subscribeTo } from '@/lib/services/clubSubscriptions';
import type { SubscriptionTier } from '@/lib/services/clubSubscriptions';
import type { ClubSubscription } from '@/lib/services/clubSubscriptions';
import { useToast } from '@/components/providers/ToastProvider';

type Props = {
  userId: string | undefined;
  clubId: string;
  clubColor: string;
  currentSubscription: ClubSubscription | null;
  onSubscribed: () => void;
};

const TIER_ORDER: SubscriptionTier[] = ['bronze', 'silber', 'gold'];
const TIER_COLORS: Record<SubscriptionTier, string> = {
  bronze: 'text-orange-300',
  silber: 'text-gray-300',
  gold: 'text-gold',
};

export function MembershipSection({ userId, clubId, clubColor, currentSubscription, onSubscribed }: Props) {
  const t = useTranslations('club');
  const { toast } = useToast();
  const [subscribingTier, setSubscribingTier] = useState<SubscriptionTier | null>(null);

  const currentTier = currentSubscription?.status === 'active' ? currentSubscription.tier : null;

  const handleSubscribe = async (tier: SubscriptionTier) => {
    if (!userId) return;
    setSubscribingTier(tier);
    try {
      await subscribeTo(userId, clubId, tier);
      toast({ title: t('subscribeSuccess'), variant: 'success' });
      onSubscribed();
    } catch (err) {
      console.error('[MembershipSection] subscribe failed:', err);
      toast({ title: t('subscribeFailed'), variant: 'error' });
    } finally {
      setSubscribingTier(null);
    }
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Crown className="size-5" style={{ color: clubColor }} />
        <h2 className="font-black text-balance">{t('membershipTitle')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TIER_ORDER.map(tier => {
          const config = TIER_CONFIG[tier];
          const isActive = currentTier === tier;
          const isHigher = currentTier && TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(currentTier);

          return (
            <Card
              key={tier}
              className={cn(
                'p-4 text-center',
                isActive && 'border-gold/30 bg-gold/[0.04]',
                tier === 'gold' && !isActive && 'border-gold/15'
              )}
            >
              <div className={cn('font-black text-lg capitalize mb-1', TIER_COLORS[tier])}>
                {tier === 'silber' ? 'Silber' : tier.charAt(0).toUpperCase() + tier.slice(1)}
              </div>
              <div className="font-mono font-bold text-xl tabular-nums mb-3">
                {fmtScout(config.price)}
                <span className="text-xs text-white/40 font-normal"> /Mo</span>
              </div>

              <div className="space-y-1.5 mb-4 text-left">
                {config.benefits.map((benefit: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <Check className="size-3 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>

              {isActive ? (
                <div className="px-3 py-2 rounded-lg bg-gold/15 text-gold text-xs font-bold">
                  {t('activeTier')}
                </div>
              ) : userId ? (
                <Button
                  variant={tier === 'gold' ? 'gold' : 'outline'}
                  size="sm"
                  fullWidth
                  onClick={() => handleSubscribe(tier)}
                  disabled={subscribingTier !== null}
                >
                  {subscribingTier === tier ? (
                    <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                  ) : isHigher ? (
                    t('upgrade')
                  ) : (
                    t('subscribe')
                  )}
                </Button>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/club/sections/MembershipSection.tsx
git commit -m "feat(club): add MembershipSection — tier comparison with subscribe CTA"
```

---

## Task 6: RecentActivitySection

**Files:**
- Create: `src/components/club/sections/RecentActivitySection.tsx`

**Context:**
- Shows recent trades for this club (social proof)
- Data: `recentTrades` prop (already fetched in ClubContent as `TradeWithPlayer[]`)
- Shows: "UserX hat SpielerY gekauft" with time-ago
- Max 5 entries
- If empty → return null

**Step 1: Create component**

```tsx
'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import { formatTimeAgo } from '@/components/community/PostCard';

type Trade = {
  id: string;
  buyer_handle?: string;
  player_name: string;
  price_cents: number;
  executed_at: string;
  side: string;
};

type Props = {
  trades: Trade[];
  clubColor: string;
};

export function RecentActivitySection({ trades, clubColor }: Props) {
  const t = useTranslations('club');

  if (trades.length === 0) return null;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="size-5" style={{ color: clubColor }} />
        <span className="font-black text-balance">{t('recentActivity')}</span>
      </div>
      <div className="space-y-2">
        {trades.slice(0, 5).map(trade => (
          <div key={trade.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
            <div className="text-sm">
              <span className="text-white/60">{trade.buyer_handle ?? t('someone')}</span>
              <span className="text-white/30"> {t('bought')} </span>
              <span className="font-semibold">{trade.player_name}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-white/30 flex-shrink-0">
              <span className="font-mono text-gold tabular-nums">{fmtScout(trade.price_cents)}</span>
              <span>{formatTimeAgo(trade.executed_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/club/sections/RecentActivitySection.tsx
git commit -m "feat(club): add RecentActivitySection — social proof trade feed"
```

---

## Task 7: CollectionProgress Component

**Files:**
- Create: `src/components/club/sections/CollectionProgress.tsx`

**Context:**
- Shared component used in both SquadPreviewSection and Kader tab
- Shows progress bar + "X von Y Spielern"
- Uses club color for the bar fill

**Step 1: Create component**

```tsx
'use client';

import React from 'react';
import { useTranslations } from 'next-intl';

type Props = {
  owned: number;
  total: number;
  clubColor: string;
};

export function CollectionProgress({ owned, total, clubColor }: Props) {
  const t = useTranslations('club');
  if (total === 0) return null;

  const pct = (owned / total) * 100;

  return (
    <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-white/50">{t('collectionProgress')}</span>
        <span className="text-xs font-mono font-bold tabular-nums" style={{ color: clubColor }}>
          {owned} / {total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: clubColor }}
        />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/club/sections/CollectionProgress.tsx
git commit -m "feat(club): add CollectionProgress — shared progress bar component"
```

---

## Task 8: Refactor ClubContent.tsx — Overview Tab

**Files:**
- Modify: `src/app/(app)/club/[slug]/ClubContent.tsx`

**Context:**
- This is the BIG task. ClubContent.tsx is 1683 lines with everything inline.
- Goal: Replace the Overview tab content (lines 1348-1467) with the new section components.
- Add missing data hooks: `useActiveIpos()`, `useActiveBounties()`, `useCommunityPolls()`
- Hero stays inline (deeply coupled to state), but Overview sections become composition.
- Add "Spieler kaufbar" stat to Hero (count of active IPOs for this club).

**Step 1: Add imports for new sections + hooks**

At top of ClubContent.tsx, add:
```tsx
import { ActiveOffersSection } from '@/components/club/sections/ActiveOffersSection';
import { SquadPreviewSection } from '@/components/club/sections/SquadPreviewSection';
import { MitmachenSection } from '@/components/club/sections/MitmachenSection';
import { ClubEventsSection } from '@/components/club/sections/ClubEventsSection';
import { MembershipSection } from '@/components/club/sections/MembershipSection';
import { RecentActivitySection } from '@/components/club/sections/RecentActivitySection';
import { useActiveIpos } from '@/lib/queries/ipos';
```

**Step 2: Add data hooks in main component body**

After existing hooks, add:
```tsx
const { data: allIpos = [] } = useActiveIpos();
const clubIpos = useMemo(() => allIpos.filter(ipo => {
  const player = players.find(p => p.id === ipo.player_id);
  return !!player;
}), [allIpos, players]);
```

Compute `ownedPlayerIds`:
```tsx
const ownedPlayerIds = useMemo(() => {
  const ids = new Set<string>();
  if (holdings) {
    for (const h of holdings) {
      if (players.some(p => p.id === h.player_id)) ids.add(h.player_id);
    }
  }
  return ids;
}, [holdings, players]);
```

**Step 3: Add "Spieler kaufbar" to Hero stats**

In HeroSection, add a 4th stat after playerCount:
```tsx
<div className="text-center">
  <div className="text-sm md:text-2xl font-black tabular-nums" style={{ color: clubColor }}>{buyableCount}</div>
  <div className="text-[10px] md:text-xs text-white/50">{t('buyable')}</div>
</div>
```

Pass `buyableCount={clubIpos.length}` as prop to HeroSection.

**Step 4: Replace Overview tab content**

Replace lines 1348-1467 (the entire `{tab === 'uebersicht' && (...)}` block) with:

```tsx
{tab === 'uebersicht' && (
  <div className="space-y-6">
    {/* Active IPO Offers */}
    <ActiveOffersSection ipos={clubIpos} players={players} clubColor={clubColor} />

    {/* Squad Preview + Collection */}
    <SquadPreviewSection
      players={players}
      ownedPlayerIds={ownedPlayerIds}
      clubColor={clubColor}
      onViewAll={() => setTab('spieler')}
    />

    {/* Mitmachen — Votes, Bounties, Scouting */}
    {clubId && userId && (
      <MitmachenSection clubId={clubId} userId={userId} clubColor={clubColor} />
    )}

    {/* Club Events */}
    {/* Note: Club events need FantasyEvent data — if not available yet, skip for now */}

    {/* Membership */}
    {clubId && (
      <MembershipSection
        userId={userId}
        clubId={clubId}
        clubColor={clubColor}
        currentSubscription={clubSubscription ?? null}
        onSubscribed={() => queryClient.invalidateQueries({ queryKey: qk.clubSubscription(userId!, clubId) })}
      />
    )}

    {/* Keep existing sections that still make sense */}
    {/* Next Match */}
    {clubId && <NextMatchCard fixtures={clubFixtures} clubId={clubId} />}

    {/* Club Info */}
    <Card className="p-4 md:p-6">
      {/* ... existing Club Info card stays ... */}
    </Card>
  </div>
)}
```

**Step 5: Commit**

```bash
git add src/app/(app)/club/[slug]/ClubContent.tsx
git commit -m "feat(club): refactor Overview tab — section components for storefront layout"
```

---

## Task 9: Kader Tab — Collection Progress + View Modes

**Files:**
- Modify: `src/app/(app)/club/[slug]/ClubContent.tsx` — Spieler tab section (lines 1470-1503)

**Context:**
- Add CollectionProgress at top of Kader tab
- Add View Mode toggle (Kompakt/Detail/Karten) with localStorage
- Position grouping (GK → DEF → MID → ATT) instead of flat grid
- "Dein Spieler" badge on owned players
- Floor price visible in compact/detail modes

**Step 1: Add CollectionProgress import + view state**

```tsx
import { CollectionProgress } from '@/components/club/sections/CollectionProgress';

// In component body:
const [squadView, setSquadView] = useState<'compact' | 'detail' | 'cards'>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('bescout-squad-view') as 'compact' | 'detail' | 'cards') ?? 'cards';
  }
  return 'cards';
});

useEffect(() => {
  localStorage.setItem('bescout-squad-view', squadView);
}, [squadView]);
```

**Step 2: Replace Spieler tab with grouped layout**

```tsx
{tab === 'spieler' && (
  <div className="space-y-4">
    {/* Collection Progress */}
    <CollectionProgress owned={ownedPlayerIds.size} total={players.length} clubColor={clubColor} />

    {/* Filters + View Toggle */}
    <div className="flex flex-col gap-3">
      <SearchInput value={spielerQuery} onChange={setSpielerQuery} placeholder={t('searchPlayers')} />
      <div className="flex items-center justify-between gap-3">
        <PosFilter selected={posFilter} onChange={setPosFilter} showAll allCount={posCounts['ALL']} counts={posCounts} />
        {/* View toggle icons */}
        <div className="flex-shrink-0 flex items-center gap-0.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
          {(['compact', 'detail', 'cards'] as const).map(mode => (
            <button key={mode} onClick={() => setSquadView(mode)}
              className={cn('p-1.5 rounded-md transition-colors text-xs font-semibold',
                squadView === mode ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
              )}>
              {mode === 'compact' ? '≡' : mode === 'detail' ? '☰' : '▦'}
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Player grid/list based on view mode */}
    {squadView === 'cards' ? (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filteredPlayers.map(player => (
          <PlayerDisplay key={player.id} variant="card" player={player} showActions={false} />
        ))}
      </div>
    ) : (
      <div className="space-y-1">
        {filteredPlayers.map(player => (
          <PlayerDisplay key={player.id} variant="compact" player={player} showActions={false} />
        ))}
      </div>
    )}
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/app/(app)/club/[slug]/ClubContent.tsx
git commit -m "feat(club): kader tab — collection progress, view modes, position groups"
```

---

## Task 10: Club Discovery Enhancements

**Files:**
- Modify: `src/app/(app)/clubs/page.tsx` (226 lines)

**Context:**
- Add "Spieler kaufbar" count and "IPO aktiv" badge to each club card
- Add sort options: Beliebteste | Aktive Angebote
- "Deine Vereine" section with horizontal scroll (if following > 0)
- Need IPO data: `getActiveIpos()` in the page's useEffect

**Step 1: Fetch IPO data alongside clubs**

In existing `useEffect` (line 30-46), add `getActiveIpos()` to the Promise.all:
```tsx
Promise.all([getClubsWithStats(), getNextFixturesByClub(), getActiveIpos()])
  .then(([clubData, fixtureData, ipoData]) => {
    // ... existing ...
    // Group IPOs by club:
    const ipoCountMap = new Map<string, number>();
    for (const ipo of ipoData) { /* count per player's club */ }
    setIpoCounts(ipoCountMap);
  })
```

**Step 2: Add IPO badge to club cards**

In the club card rendering, after follower/player count:
```tsx
{ipoCount > 0 && (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-gold/15 text-gold border border-gold/20">
    {ipoCount} IPO
  </span>
)}
```

**Step 3: Add "Deine Vereine" horizontal scroll**

Before "Alle Vereine" grid, if user follows clubs:
```tsx
{followedClubs.length > 0 && (
  <section className="mb-6">
    <h2 className="text-sm font-black mb-2">{t('yourClubs')}</h2>
    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
      {followedClubs.map(club => /* compact horizontal card */)}
    </div>
  </section>
)}
```

**Step 4: Commit**

```bash
git add src/app/(app)/clubs/page.tsx
git commit -m "feat(clubs): discovery — IPO badges, your clubs section, sort options"
```

---

## Task 11: i18n Keys (DE + TR)

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**New keys under `"club"` namespace (~25 keys):**

```json
"activeOffers": "Jetzt verfügbar",
"buyable": "kaufbar",
"collectionProgress": "Deine Sammlung",
"owned": "Deins",
"trendingPlayers": "Trending Spieler",
"viewAll": "Alle anzeigen",
"clubEvents": "Events & Wettbewerbe",
"membershipTitle": "Club-Mitgliedschaft",
"activeTier": "Aktiv",
"subscribe": "Mitglied werden",
"upgrade": "Upgrade",
"subscribeSuccess": "Mitgliedschaft aktiviert!",
"subscribeFailed": "Fehler beim Abonnieren",
"recentActivity": "Letzte Aktivität",
"someone": "Jemand",
"bought": "hat gekauft",
"mitmachen": "Mitmachen",
"mitmachenDesc": "Werde Teil des Teams",
"scoutProfile": "Dein Scout-Profil",
"reports": "Reports",
"earned": "Verdient",
"openBounties": "Offene Aufträge",
"activeVotes": "Abstimmungen",
"topScoutsTitle": "Top Scouts",
"allBounties": "Alle Aufträge",
"allVotes": "Alle Abstimmungen"
```

Turkish equivalents under `"club"`:
```json
"activeOffers": "Şimdi Mevcut",
"buyable": "satın alınabilir",
"collectionProgress": "Koleksiyonun",
"owned": "Seninki",
"trendingPlayers": "Trend Oyuncular",
"viewAll": "Tümünü Göster",
"clubEvents": "Etkinlikler",
"membershipTitle": "Kulüp Üyeliği",
"activeTier": "Aktif",
"subscribe": "Üye Ol",
"upgrade": "Yükselt",
"subscribeSuccess": "Üyelik aktifleştirildi!",
"subscribeFailed": "Abone olma hatası",
"recentActivity": "Son Aktivite",
"someone": "Biri",
"bought": "satın aldı",
"mitmachen": "Katıl",
"mitmachenDesc": "Takımın parçası ol",
"scoutProfile": "Scout Profilin",
"reports": "Raporlar",
"earned": "Kazanılan",
"openBounties": "Açık Görevler",
"activeVotes": "Oylamalar",
"topScoutsTitle": "En İyi Scoutlar",
"allBounties": "Tüm Görevler",
"allVotes": "Tüm Oylamalar"
```

**Step 1: Add keys to both files using Edit tool**

**Step 2: Commit**

```bash
git add messages/de.json messages/tr.json
git commit -m "feat(i18n): club storefront keys — 25 keys DE + TR"
```

---

## Task 12: Build Verification

**Step 1: Run build**

```bash
npx next build
```

Expected: 0 errors.

**Step 2: Fix any type errors or import issues**

**Step 3: Commit fixes if needed**

```bash
git add -A
git commit -m "fix(club): build fixes for storefront refactor"
```

---

## Summary

| Task | Component | Wave | Dependencies |
|------|-----------|------|-------------|
| 1 | ActiveOffersSection | 1 | None |
| 2 | SquadPreviewSection | 1 | None |
| 3 | MitmachenSection | 1 | None |
| 4 | ClubEventsSection | 1 | None |
| 5 | MembershipSection | 1 | None |
| 6 | RecentActivitySection | 1 | None |
| 7 | CollectionProgress | 1 | None |
| 8 | ClubContent Refactor (Overview) | 2 | Tasks 1-7 |
| 9 | Kader Tab Upgrade | 3 | Task 7 |
| 10 | Club Discovery | 4 | None |
| 11 | i18n | 5 | None |
| 12 | Build Verification | 5 | All |

**Execution:** Wave 1 (7 agents parallel) → Wave 2 (1 agent, main refactor) → Wave 3 (1 agent) → Wave 4+5 (2 agents parallel) → Build
