# Player Detail Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `/player/[id]` from 5-tab overloaded layout to a premium 3-tab experience with sticky dashboard, P&L tracking, fixture difficulty, percentile context, and mastery-tier card visuals.

**Architecture:** Hybrid approach — compact hero (268px mobile vs 564px current) + sticky 48px dashboard strip on scroll + 3 tabs (Trading/Performance/Community). Progressive disclosure: key metrics always visible, deep data in tabs.

**Tech Stack:** Next.js 14 App Router, TypeScript strict, Tailwind, React Query v5, IntersectionObserver for sticky strip, CSS-only card mastery tiers.

**Design Spec:** `docs/plans/2026-03-15-symbiosis-design.md`

**Benchmark Research:** `docs/plans/2026-03-15-benchmark-*.md` (Sorare, SofaScore, FIFA, Opta/FotMob, LiveScore)

---

## Phase 1: Structural Redesign (P0)

The foundation. Hero shrinks, tabs consolidate, sticky strip appears, mobile bar slims down. No new features yet — just restructuring.

### Task 1: Tab Type Consolidation

**Files:**
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx`

**Step 1: Update Tab type and TABS array**

Change the Tab type from 5 to 3 tabs:

```typescript
// OLD
type Tab = 'profil' | 'markt' | 'rewards' | 'statistik' | 'community';
const TABS = [
  { id: 'profil', label: 'profile' },
  { id: 'markt', label: 'market' },
  { id: 'rewards', label: 'rewards' },
  { id: 'statistik', label: 'stats' },
  { id: 'community', label: 'community' },
];

// NEW
type Tab = 'trading' | 'performance' | 'community';
const TABS = [
  { id: 'trading', label: 'playerDetail.tabs.trading' },
  { id: 'performance', label: 'playerDetail.tabs.performance' },
  { id: 'community', label: 'community' },
];
```

**Step 2: Update tab content rendering**

Replace the 5-tab switch/conditional with 3 tabs. `trading` renders the new TradingTab, `performance` renders the new PerformanceTab, `community` keeps existing CommunityTab.

Initially, TradingTab = existing MarktTab content + RewardsTab accordion. PerformanceTab = existing ProfilTab + StatistikTab merged.

**Step 3: Update all `enabled: tab === 'x'` query gates**

Map old gates to new:
- `tab === 'markt'` → `tab === 'trading'`
- `tab === 'profil'` or `tab === 'statistik'` → `tab === 'performance'`
- `tab === 'rewards'` → `tab === 'trading'`
- `tab === 'community'` stays

**Step 4: Add i18n keys**

Add to `messages/de.json` and `messages/tr.json`:
```json
"playerDetail": {
  "tabs": {
    "trading": "Handel",
    "performance": "Leistung",
    "community": "Community"
  }
}
```

**Step 5: Run `tsc --noEmit` and fix type errors**

**Step 6: Commit**
```
feat(player): consolidate 5 tabs to 3 (trading/performance/community)
```

---

### Task 2: Create TradingTab (Merge MarktTab + RewardsTab)

**Files:**
- Create: `src/components/player/detail/TradingTab.tsx`
- Modify: `src/components/player/detail/index.ts` (add export)
- Reference: `src/components/player/detail/MarktTab.tsx` (copy trading sections)
- Reference: `src/components/player/detail/RewardsTab.tsx` (copy reward ladder as accordion)

**Step 1: Create TradingTab.tsx**

Copy all MarktTab content. Add RewardsTab content as a collapsible accordion at the bottom. Props should match what PlayerContent passes.

Key sections in order (per symbiosis design):
1. TradingDisclaimer (compliance, top)
2. PriceChart
3. Quick Stats Row (Floor, Spread placeholder, 7d Volume placeholder, Holders) — initially use existing data, Spread/Volume added in Phase 2
4. OrderbookDepth (existing)
5. ScoutConsensus (moved from MarktTab — already there)
6. Active Orders + Offers (existing)
7. Reward Tiers (collapsed `<details>` element wrapping existing RewardsTab content)
8. Trade History (existing, condensed)

**Step 2: Add export to index.ts**

```typescript
export { default as TradingTab } from './TradingTab';
```

**Step 3: Update PlayerContent.tsx to render TradingTab**

**Step 4: Build check `npx next build`**

**Step 5: Commit**
```
feat(player): create TradingTab merging MarktTab + RewardsTab accordion
```

---

### Task 3: Create PerformanceTab (Merge ProfilTab + StatistikTab)

**Files:**
- Create: `src/components/player/detail/PerformanceTab.tsx`
- Modify: `src/components/player/detail/index.ts`
- Reference: `src/components/player/detail/ProfilTab.tsx`
- Reference: `src/components/player/detail/StatistikTab.tsx`

**Step 1: Create PerformanceTab.tsx**

Sections in order (per symbiosis design):
1. Score Dashboard — L5 (80px hero circle with position glow), L15 (48px), Season Avg (44px), Trend badge
2. Gameweek Score Bars (from StatistikTab)
3. Radar Chart (from ProfilTab)
4. Season Stats Grid (matches/goals/assists from StatistikTab)
5. Player Info Grid (market value, position, nationality — from ProfilTab)
6. DPC Supply Ring (from ProfilTab)
7. Contract Status (from ProfilTab)
8. PBT Widget (from ProfilTab)

Remove from old ProfilTab: Quick Stats grid (duplicated data), Community Valuation (moves to Community tab).

**Step 2: Add export to index.ts**

**Step 3: Update PlayerContent.tsx to render PerformanceTab**

**Step 4: Build check**

**Step 5: Commit**
```
feat(player): create PerformanceTab merging ProfilTab + StatistikTab
```

---

### Task 4: Update CommunityTab (Reorder + Add Valuation)

**Files:**
- Modify: `src/components/player/detail/CommunityTab.tsx`

**Step 1: Reorder sections**

New order:
1. Scout Consensus (move to top, always show with empty state)
2. Community Valuation (moved FROM ProfilTab)
3. Sentiment Gauge
4. Research Posts (sort by quality: `avg_rating * ratings_count`, not chronological)
5. Player Takes
6. Transfer Rumors

**Step 2: Add "Write Research" CTA**

Gold button at top-right of research section. Links to Community page with `?playerId=X` pre-filled.

**Step 3: Ensure all user-visible strings use `t()`**

**Step 4: Build check**

**Step 5: Commit**
```
feat(player): reorder CommunityTab, add valuation + write research CTA
```

---

### Task 5: PlayerHero — Compact Horizontal Layout

**Files:**
- Modify: `src/components/player/detail/PlayerHero.tsx`

**Step 1: Mobile layout — card + info side by side**

Current: Card stacked above info (full width).
New: `flex flex-row` on mobile. Card 140px wide (flex-shrink-0), info fills remaining space.

```tsx
{/* Mobile: side-by-side, Desktop: side-by-side wider */}
<div className="flex gap-3 md:gap-5 p-3 md:p-5">
  <div className="w-[140px] md:w-[240px] flex-shrink-0">
    <TradingCardFrame ... />
  </div>
  <div className="flex flex-col justify-between flex-1 min-w-0">
    {/* name, position badge, club */}
    {/* PRICE — largest element */}
    {/* badges row */}
    {/* action buttons desktop only */}
  </div>
</div>
```

**Step 2: Price as primary visual element**

Move price to info column, make it `text-xl md:text-2xl font-mono font-black text-gold`. 24h change pill adjacent.

**Step 3: Remove price strip section below card** (merged into info column)

**Step 4: Add mastery badge inline** — `Lv3 Expert` gold pill if mastery > 0

**Step 5: Visual QA at 360px and 1024px**

Target: Max 280px mobile hero, max 340px desktop hero.

**Step 6: Commit**
```
feat(player): compact horizontal hero layout (564px → 268px mobile)
```

---

### Task 6: StickyDashboardStrip (NEW)

**Files:**
- Create: `src/components/player/detail/StickyDashboardStrip.tsx`
- Modify: `src/components/player/detail/index.ts`
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx`

**Step 1: Create StickyDashboardStrip component**

```tsx
'use client';
import { useRef, useState, useEffect } from 'react';

interface Props {
  playerName: string;
  position: string;
  photoUrl?: string;
  floorPrice: number;
  l5Score: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  change24h: number;
  holdingQty: number;
  holderCount: number;
  posColor: string; // hex from getL5Hex
}
```

Desktop (md+): 6 metrics — Photo 28px + Name, Floor Price (gold), L5 28px circle, Trend icon, 24h Change pill, Holdings/Holders.

Mobile: 4 metrics — Photo 24px + Last Name, Floor Price (gold), L5 mini 24px, 24h Change pill.

Style: `sticky top-0 z-40 h-12 md:h-12 glass border-b border-white/[0.06] shadow-sm`

**Step 2: IntersectionObserver in PlayerContent**

```tsx
const heroRef = useRef<HTMLDivElement>(null);
const [showStrip, setShowStrip] = useState(false);

useEffect(() => {
  if (!heroRef.current) return;
  const obs = new IntersectionObserver(
    ([entry]) => setShowStrip(!entry.isIntersecting),
    { threshold: 0 }
  );
  obs.observe(heroRef.current);
  return () => obs.disconnect();
}, []);
```

Wrap hero in `<div ref={heroRef}>`. Render strip with `translate-y` animation:
```tsx
<StickyDashboardStrip
  className={cn(
    'transition-transform duration-200 ease-out',
    showStrip ? 'translate-y-0' : '-translate-y-full'
  )}
  {...stripProps}
/>
```

**Step 3: Add export to index.ts**

**Step 4: Visual QA — scroll up/down, verify strip appears/disappears**

**Step 5: Commit**
```
feat(player): add StickyDashboardStrip with IntersectionObserver
```

---

### Task 7: MobileTradingBar Slim-Down

**Files:**
- Modify: `src/components/player/detail/MobileTradingBar.tsx`

**Step 1: Reduce height from ~80px to 56px**

- Left: Price (font-mono, gold) + 24h change (inline, not stacked)
- Right: Buy button (gold gradient) + "..." overflow for Sell/Limit/Offer
- Remove "Du besitzt X DPC" line (moved to sticky strip)

**Step 2: Implement overflow menu**

"..." button opens a small popover with Sell, Limit Order, Make Offer options.

**Step 3: Ensure min-h-[44px] touch targets on all buttons**

**Step 4: Visual QA at 360px**

**Step 5: Commit**
```
refactor(player): slim MobileTradingBar to 56px with overflow menu
```

---

### Task 8: Remove Deprecated Components

**Files:**
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx`
- Modify: `src/components/player/detail/index.ts`

**Step 1: Remove from PlayerContent rendering:**
- `<ScoreMasteryStrip>` (data in StickyDashboardStrip + PerformanceTab)
- `<TradeHistoryChips>` (data in TradingTab trade history)
- `<SponsorBanner>` (mid-page placement removed)

**Step 2: Remove exports from index.ts** (keep files for reference, just remove from barrel)

**Step 3: Remove unused imports from PlayerContent**

**Step 4: `tsc --noEmit` + `npx next build`**

**Step 5: Commit**
```
refactor(player): remove ScoreMasteryStrip, TradeHistoryChips, SponsorBanner from player detail
```

---

### Task 9: Phase 1 Integration Test

**Step 1: Full build** `npx next build`

**Step 2: Visual QA at 360px** — verify:
- Hero max 280px height
- 3 tabs render correctly, no overflow
- Sticky strip appears on scroll
- Mobile trading bar 56px
- No layout shifts

**Step 3: Visual QA at 1024px** — verify:
- Hero max 340px height
- Sticky strip 6 metrics
- Desktop action buttons visible

**Step 4: Commit any fixes**

---

## Phase 2: Trading Tab Enhancements (P1)

New features for the Trading tab: Spread indicator, P&L, Orderbook summary, enhanced price chart.

### Task 10: TradingQuickStats Component (Spread, Volume)

**Files:**
- Create: `src/components/player/detail/TradingQuickStats.tsx`
- Modify: `src/components/player/detail/TradingTab.tsx`

**Step 1: Create component**

4 inline metrics (not cards — flat row):
- **Floor:** Lowest sell order price. Gold, font-mono.
- **Spread:** `lowestAsk - highestBid`. Color: tight (<5%) green, medium (5-15%) amber, wide (>15%) red. If no bids: show "—".
- **7d Vol:** Count of trades in last 7 days from `playerTrades`.
- **Holders:** From `holderCount`.

```tsx
<div className="flex items-center justify-between px-4 py-3 bg-white/[0.02] rounded-xl border border-white/[0.06]">
  {metrics.map(m => (
    <div key={m.label} className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] font-semibold text-white/35 tracking-wider uppercase">{m.label}</span>
      <span className={cn("font-mono font-bold text-sm", m.color)}>{m.value}</span>
    </div>
  ))}
</div>
```

**Step 2: Integrate into TradingTab below PriceChart**

**Step 3: i18n — all labels via `t()`**

**Step 4: Build check**

**Step 5: Commit**
```
feat(player): add TradingQuickStats with spread, volume, floor, holders
```

---

### Task 11: YourPosition Component (P&L)

**Files:**
- Create: `src/components/player/detail/YourPosition.tsx`
- Create: `src/lib/queries/player-cost.ts` (useAvgCost hook)
- Modify: `src/components/player/detail/TradingTab.tsx`

**Step 1: Create useAvgCost hook**

Calculate weighted average buy price from user's trade history:
```typescript
export function useAvgCost(userId: string | undefined, playerId: string) {
  return useQuery({
    queryKey: ['avg-cost', userId, playerId],
    queryFn: async () => {
      // Query trades where buyer_id = userId AND player_id = playerId
      // Weighted avg: sum(price * qty) / sum(qty)
      // Fallback to IPO price if no trades
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}
```

**Step 2: Create YourPosition component**

Only renders when `holdingQty > 0`. Robinhood "Your Position" pattern:
- **Total Value:** `holdingQty * floorPrice` (gold, large)
- **Avg. Cost:** Weighted avg buy price (white/70)
- **P&L:** `(floor - avgCost) / avgCost * 100`. Green if positive, red if negative. Show both % and absolute bCredits.
- **Mastery bar** below (level badge + XP progress from existing DpcMasteryCard logic)

**Step 3: Integrate into TradingTab after TradingQuickStats**

**Step 4: i18n all strings**

**Step 5: Build check**

**Step 6: Commit**
```
feat(player): add YourPosition with P&L calculation
```

---

### Task 12: OrderbookSummary (Condensed)

**Files:**
- Create: `src/components/player/detail/OrderbookSummary.tsx`
- Modify: `src/components/player/detail/TradingTab.tsx`

**Step 1: Create condensed orderbook view**

- Best Ask, Best Bid, Spread prominently displayed
- Horizontal bid/ask balance bar: green (left = bid volume), red (right = ask volume)
- "Tiefe anzeigen" button expands to full `<OrderbookDepth>` component

```tsx
<div className="space-y-3">
  <div className="flex justify-between items-center">
    <div className="text-center">
      <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('bestBid')}</p>
      <p className="font-mono font-bold text-green-500">{fmtScout(bestBid)}</p>
    </div>
    <div className="text-center">
      <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('spread')}</p>
      <p className="font-mono font-bold text-white/60">{spreadPct}%</p>
    </div>
    <div className="text-center">
      <p className="text-[10px] text-white/35 uppercase tracking-wider">{t('bestAsk')}</p>
      <p className="font-mono font-bold text-red-400">{fmtScout(bestAsk)}</p>
    </div>
  </div>
  {/* Balance bar */}
  {/* Expand button */}
</div>
```

**Step 2: Replace full OrderbookDepth in TradingTab with OrderbookSummary**

**Step 3: Build check**

**Step 4: Commit**
```
feat(player): add condensed OrderbookSummary with bid/ask balance bar
```

---

### Task 13: PriceChart Enhancement

**Files:**
- Modify: `src/components/player/detail/PriceChart.tsx`

**Step 1: Add time range toggle**

4 pill buttons: 1W / 1M / 3M / ALL. Gold active state. Filter trade data by time range.

**Step 2: Improve chart aesthetics**

- Smooth bezier curves (catmull-rom interpolation or quadratic)
- Area gradient fill (green-to-transparent or red-to-transparent based on trend)
- Remove data point dots (cleaner Robinhood style)
- IPO baseline as dashed gold line

**Step 3: Add crosshair interaction**

On hover/touch: vertical line + price+date tooltip above chart.

**Step 4: i18n time range labels**

**Step 5: Build check**

**Step 6: Commit**
```
feat(player): enhance PriceChart with time ranges, bezier curves, crosshair
```

---

### Task 14: Reward Accordion in TradingTab

**Files:**
- Modify: `src/components/player/detail/TradingTab.tsx`

**Step 1: Wrap reward tiers in collapsible section**

Default collapsed showing: Current tier name + next tier reward amount.
Expanded: Full reward ladder from existing RewardsTab.

Use native `<details>/<summary>` or a simple `useState` toggle:

```tsx
const [rewardsOpen, setRewardsOpen] = useState(false);
// ...
<div className="border border-white/[0.06] rounded-xl overflow-hidden">
  <button onClick={() => setRewardsOpen(!rewardsOpen)} className="w-full flex justify-between items-center p-4">
    <span className="font-bold text-sm">{t('rewardTiers')}</span>
    <ChevronDown className={cn("w-4 h-4 text-white/40 transition-transform", rewardsOpen && "rotate-180")} />
  </button>
  {rewardsOpen && <div className="px-4 pb-4">{/* Reward ladder content */}</div>}
</div>
```

**Step 2: Build check**

**Step 3: Commit**
```
feat(player): add collapsible reward tiers accordion to TradingTab
```

---

## Phase 3: Performance Tab Enhancements (P1)

### Task 15: Percentile Context for L5/L15

**Files:**
- Create: `src/lib/hooks/usePositionPercentiles.ts`
- Modify: `src/components/player/detail/PerformanceTab.tsx`

**Step 1: Create usePositionPercentiles hook**

Client-side calculation from `allPlayers` (already loaded via React Query):

```typescript
export function usePositionPercentiles(position: string, l5: number, allPlayers: Player[]) {
  return useMemo(() => {
    const samePosPlayers = allPlayers.filter(p => p.position === position && p.l5 != null);
    const sorted = samePosPlayers.map(p => p.l5!).sort((a, b) => a - b);
    const rank = sorted.filter(s => s < l5).length;
    const percentile = Math.round((rank / sorted.length) * 100);
    return { percentile, rank: samePosPlayers.length - rank, total: samePosPlayers.length };
  }, [position, l5, allPlayers]);
}
```

**Step 2: Show percentile in Score Dashboard**

Below L5 circle: `"Top 12% der MID"` in position color.

**Step 3: i18n**

**Step 4: Build check**

**Step 5: Commit**
```
feat(player): add L5 percentile context ("Top X% of MIDs")
```

---

### Task 16: Gameweek Bars with Opponent Info

**Files:**
- Modify: `src/components/player/detail/GameweekScoreBar.tsx`

**Step 1: Add opponent name below each bar**

Use fixture data to show opponent abbreviation (3 chars) below each gameweek bar. Home/Away indicator (H/A prefix).

**Step 2: Add 6-tier color scale**

Replace 3-tier (green/amber/red) with 6-tier:
- Gold (100-150), Cyan (85-99), Emerald (65-84), Amber (51-64), Orange (31-50), Red (1-30)

**Step 3: Tap-to-expand interaction**

Tap a bar → bottom sheet with score breakdown (goals, assists, clean sheets, minutes).

**Step 4: Build check**

**Step 5: Commit**
```
feat(player): enhance GameweekScoreBar with opponents, 6-tier colors, tap-to-expand
```

---

### Task 17: UpcomingFixtures Component (NEW)

**Files:**
- Create: `src/components/player/detail/UpcomingFixtures.tsx`
- Create: `src/lib/queries/upcoming-fixtures.ts`
- Modify: `src/components/player/detail/PerformanceTab.tsx`

**Step 1: Create useUpcomingFixtures hook**

Query next 5 fixtures for the player's club:
```typescript
export function useUpcomingFixtures(clubId: number | undefined) {
  return useQuery({
    queryKey: ['upcoming-fixtures', clubId],
    queryFn: async () => {
      // Query fixtures table where home_team_id or away_team_id = clubId
      // AND kickoff > now(), ORDER BY kickoff ASC, LIMIT 5
    },
    enabled: !!clubId,
    staleTime: 300_000,
  });
}
```

**Step 2: Create UpcomingFixtures component**

Horizontal scroll with 5 fixture pills:
- Opponent abbreviation
- Home/Away indicator
- Difficulty color: league_position 1-6 = red (hard), 7-13 = amber (medium), 14+ = green (easy)
- Composite: also factor in opponent L5 average

**Step 3: Integrate into PerformanceTab after Gameweek bars**

**Step 4: i18n**

**Step 5: Build check**

**Step 6: Commit**
```
feat(player): add UpcomingFixtures with difficulty indicators
```

---

### Task 18: Stats Breakdown with Percentile Bars (Opta-style)

**Files:**
- Create: `src/components/player/detail/StatsBreakdown.tsx`
- Modify: `src/components/player/detail/PerformanceTab.tsx`

**Step 1: Create StatsBreakdown component**

Position-specific stat rows with percentile bars:

```tsx
// Each stat row:
<div className="flex items-center justify-between py-2">
  <span className="text-xs text-white/50">{label}</span>
  <div className="flex items-center gap-2">
    <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${percentile}%`, backgroundColor: posColor }} />
    </div>
    <span className="font-mono text-xs font-bold text-white/80 w-8 text-right">{value}</span>
  </div>
</div>
```

Stats by position:
- **GK:** Saves, Clean Sheets, Goals Conceded, Minutes
- **DEF:** Tackles, Interceptions, Clean Sheets, Aerial Wins
- **MID:** Key Passes, Assists, Goals, Pass Accuracy
- **ATT:** Goals, Shots on Target, Assists, Chances Created

**Step 2: Integrate into PerformanceTab after Radar Chart**

**Step 3: Build check**

**Step 4: Commit**
```
feat(player): add Opta-style StatsBreakdown with percentile bars
```

---

### Task 19: Fantasy CTA (Contextual)

**Files:**
- Create: `src/components/player/detail/FantasyCTA.tsx`
- Modify: `src/components/player/detail/PerformanceTab.tsx`

**Step 1: Create FantasyCTA component**

Only renders when:
- User is logged in
- User holds DPCs of this player
- An active fantasy event exists with open lineups

Shows: Event name + countdown + "Zum Lineup hinzufuegen" gold button.

**Step 2: Create useActiveFantasyEvent hook or derive from existing event queries**

**Step 3: Integrate at bottom of PerformanceTab (before DPC Supply)**

**Step 4: i18n**

**Step 5: Build check**

**Step 6: Commit**
```
feat(player): add contextual Fantasy CTA in PerformanceTab
```

---

## Phase 4: Polish (P2)

### Task 20: Card Mastery Tier Visuals (CSS-only)

**Files:**
- Modify: `src/components/player/detail/TradingCardFrame.tsx`
- Modify: `src/app/globals.css` (add tier CSS classes)

**Step 1: Define CSS classes for 6 tiers**

```css
/* Card Mastery Tiers */
.card-tier-0 { /* Standard — carbon fiber + position wash (existing) */ }
.card-tier-1 { /* Rookie — + subtle shimmer animation */ }
.card-tier-2 { /* Regular — + silver foil accent on name bar */ }
.card-tier-3 { /* Expert — + gold foil accent + stats glow */ }
.card-tier-4 { /* Master — + holographic prismatic overlay */ }
.card-tier-5 { /* Legend — + animated gold particle border */
  animation: card-tier-5-glow 3s ease-in-out infinite;
}

@keyframes card-tier-5-glow {
  0%, 100% { box-shadow: 0 0 15px rgba(255,215,0,0.3), inset 0 0 15px rgba(255,215,0,0.1); }
  50% { box-shadow: 0 0 25px rgba(255,215,0,0.5), inset 0 0 25px rgba(255,215,0,0.2); }
}
```

**Step 2: Apply tier class in TradingCardFrame based on mastery level**

```tsx
const tierClass = `card-tier-${Math.min(masteryLevel ?? 0, 5)}`;
```

**Step 3: Visual QA — verify each tier looks distinct**

**Step 4: Commit**
```
feat(player): add CSS-only card mastery tier visuals (Lv0-5)
```

---

### Task 21: Score Number Animations

**Files:**
- Modify: `src/components/player/detail/StickyDashboardStrip.tsx`
- Modify: `src/components/player/detail/PerformanceTab.tsx`

**Step 1: Apply existing `useNumTick` hook to score circles**

Ensure L5/L15 circles animate from 0 to value on mount (600ms).

**Step 2: Apply to floor price in sticky strip**

Price morphs when data changes (not on mount).

**Step 3: Commit**
```
feat(player): add number morphing animations to scores and prices
```

---

### Task 22: Trade Success Gold Particle Burst

**Files:**
- Create: `src/components/player/detail/TradeSuccessEffect.tsx`
- Modify: `src/components/player/detail/hooks/usePlayerTrading.ts`

**Step 1: Create TradeSuccessEffect component**

CSS-only gold particle burst (no library). 8-12 small gold circles that explode outward from buy button, fade out in 1500ms.

```css
@keyframes particle-burst {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
}
```

**Step 2: Trigger on successful buy/sell**

In `usePlayerTrading`, after successful trade → set `showBurst = true` for 1500ms.

**Step 3: Visual QA**

**Step 4: Commit**
```
feat(player): add gold particle burst on trade success
```

---

### Task 23: Cleanup + Final Integration

**Files:**
- Modify: `src/components/player/detail/index.ts`
- Possibly modify: Various files for consistency

**Step 1: Update barrel exports**

Remove old tab exports (ProfilTab, MarktTab, StatistikTab, RewardsTab as standalone), add new (TradingTab, PerformanceTab, StickyDashboardStrip, TradingQuickStats, YourPosition, etc.)

Note: Keep old files in codebase for reference but remove from barrel export. They can be deleted in a follow-up cleanup.

**Step 2: Full build** `npx next build`

**Step 3: Full test suite** `npx vitest run`

**Step 4: Visual QA at 360px and 1024px**

Verify checklist:
- [ ] Hero max 280px mobile, 340px desktop
- [ ] 3 tabs render, no overflow
- [ ] Sticky strip appears/disappears on scroll
- [ ] Trading tab: chart, quick stats, P&L, orderbook summary, rewards accordion, trade history
- [ ] Performance tab: L5 percentile, GW bars with opponents, upcoming fixtures, stats breakdown, radar, fantasy CTA
- [ ] Community tab: consensus top, valuation, sentiment, quality-sorted research, write button
- [ ] Mobile trading bar 56px with overflow
- [ ] Card mastery tiers visible (test with different mastery levels)
- [ ] Number animations on scores
- [ ] Gold burst on trade success

**Step 5: Final commit**
```
feat(player): complete player detail redesign — 3 tabs, sticky strip, P&L, percentiles, mastery tiers
```

---

## Summary

| Phase | Tasks | Scope |
|-------|-------|-------|
| **P0 Structural** | 1-9 | Hero compact, 3 tabs, sticky strip, mobile bar |
| **P1 Trading** | 10-14 | Spread, P&L, orderbook summary, price chart, rewards accordion |
| **P1 Performance** | 15-19 | Percentiles, GW opponents, fixtures, stats breakdown, fantasy CTA |
| **P2 Polish** | 20-23 | Mastery tiers, animations, particle burst, cleanup |

**Total: 23 Tasks, 4 Phases**

**Dependencies:** Phase 1 must complete before Phase 2-3. Phase 2 and 3 can run in parallel. Phase 4 requires Phase 1-3 complete.
