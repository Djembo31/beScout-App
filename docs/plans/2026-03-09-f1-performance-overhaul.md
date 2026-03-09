# F1 Performance Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce app load time from ~4-5s to <1.5s LCP. Instant shell, progressive content, lazy everything.

**Architecture:** 4 waves — Foundation (render-blocking), Progressive Loading (perceived perf), Code Splitting (bundle), Advanced (SSR/SW). Each wave's tasks are independent and can run as parallel agents in worktrees.

**Tech Stack:** Next.js 14 (App Router), next/font, React Suspense, next/dynamic, React Query v5

---

## Wave 1: Foundation — Eliminate Render-Blocking (Sequential)

These tasks must be done first — they affect every subsequent page load.

---

### Task 1.1: Font Loading — next/font statt Google CDN

**Files:**
- Modify: `src/app/globals.css` (line 1 — remove @import)
- Modify: `src/app/layout.tsx` (add next/font import + apply classes)
- Modify: `tailwind.config.ts` (update fontFamily to use CSS variable)

**Context:**
- Currently: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');` in globals.css line 1 blocks rendering
- `body` also sets `font-family: 'Outfit', sans-serif;` in globals.css line 29
- `tailwind.config.ts` line 37-38 defines `sans: ["Outfit", "sans-serif"]` and `mono: ["Space Mono", "monospace"]`

**Step 1: Add next/font imports to layout.tsx**

In `src/app/layout.tsx`, add at top (after existing imports):

```typescript
import { Outfit, Space_Mono } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '700', '900'],
  display: 'swap',
  variable: '--font-outfit',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-space-mono',
});
```

**Step 2: Apply font variables to html element**

In `src/app/layout.tsx`, change:
```tsx
<html lang={locale}>
```
to:
```tsx
<html lang={locale} className={`${outfit.variable} ${spaceMono.variable}`}>
```

**Step 3: Remove Google Fonts import from globals.css**

Delete line 1 of `src/app/globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
```

**Step 4: Update body font-family to use variable**

In `src/app/globals.css`, change line 29:
```css
font-family: 'Outfit', sans-serif;
```
to:
```css
font-family: var(--font-outfit), 'Outfit', sans-serif;
```

**Step 5: Update tailwind.config.ts to use CSS variables**

Change `fontFamily` in `tailwind.config.ts` lines 37-38:
```typescript
fontFamily: {
  sans: ['var(--font-outfit)', 'Outfit', 'sans-serif'],
  mono: ['var(--font-space-mono)', 'Space Mono', 'monospace'],
},
```

**Step 6: Build and verify**

Run: `npx next build`
Expected: 0 errors. Fonts now self-hosted by Next.js, no external CSS blocking request.

**Step 7: Commit**
```bash
git add src/app/globals.css src/app/layout.tsx tailwind.config.ts
git commit -m "perf: replace Google Fonts CDN with next/font for instant FCP"
```

---

### Task 1.2: PostHog → Lazy Load after First Paint

**Files:**
- Modify: `src/lib/posthog.ts` (lazy import pattern)
- Modify: `src/components/providers/AnalyticsProvider.tsx` (defer init)

**Context:**
- `posthog.ts` imports `posthog-js` at module top level (line 1) — 60KB loaded even if PostHog key is missing
- `AnalyticsProvider.tsx` calls `initPostHog()` in useEffect (line 12) — runs on first render
- Functions `identifyUser`, `trackEvent`, `resetUser` are called from other components

**Step 1: Rewrite posthog.ts with lazy loading**

Replace entire `src/lib/posthog.ts`:

```typescript
import type { PostHog } from 'posthog-js';

let posthogInstance: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;
const eventQueue: Array<{ type: 'capture' | 'identify' | 'reset'; args: unknown[] }> = [];

function getPostHogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

export async function initPostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null;
  if (!getPostHogKey()) return null;
  if (posthogInstance) return posthogInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { default: posthog } = await import('posthog-js');
    posthog.init(getPostHogKey()!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.opt_out_capturing();
        }
      },
    });
    posthogInstance = posthog;

    // Flush queued events
    for (const event of eventQueue) {
      if (event.type === 'capture') posthog.capture(event.args[0] as string, event.args[1] as Record<string, unknown>);
      else if (event.type === 'identify') posthog.identify(event.args[0] as string, event.args[1] as Record<string, unknown>);
      else if (event.type === 'reset') posthog.reset();
    }
    eventQueue.length = 0;

    return posthog;
  })();

  return initPromise;
}

export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!getPostHogKey()) return;
  if (posthogInstance) { posthogInstance.identify(userId, properties); return; }
  eventQueue.push({ type: 'identify', args: [userId, properties] });
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  if (!getPostHogKey()) return;
  if (posthogInstance) { posthogInstance.capture(event, properties); return; }
  eventQueue.push({ type: 'capture', args: [event, properties] });
}

export function resetUser() {
  if (typeof window === 'undefined') return;
  if (!getPostHogKey()) return;
  if (posthogInstance) { posthogInstance.reset(); return; }
  eventQueue.push({ type: 'reset', args: [] });
}
```

**Step 2: Defer AnalyticsProvider init to idle time**

Replace `src/components/providers/AnalyticsProvider.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { initPostHog, identifyUser, resetUser } from '@/lib/posthog';
import { useUser } from '@/components/providers/AuthProvider';

export default function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useUser();

  // Initialize PostHog after browser is idle — not during critical render
  useEffect(() => {
    const init = () => { initPostHog().catch(err => console.error('[Analytics] PostHog init failed:', err)); };
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(init, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(init, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Identify user when auth state changes
  useEffect(() => {
    if (user && profile) {
      identifyUser(user.id, {
        handle: profile.handle,
        plan: profile.plan,
        level: profile.level,
        language: profile.language,
        favorite_club: profile.favorite_club,
      });
    } else if (!user) {
      resetUser();
    }
  }, [user, profile]);

  return <>{children}</>;
}
```

**Step 3: Build and verify**

Run: `npx next build`
Expected: 0 errors. PostHog no longer in critical bundle — loaded after idle.

**Step 4: Commit**
```bash
git add src/lib/posthog.ts src/components/providers/AnalyticsProvider.tsx
git commit -m "perf: lazy-load PostHog SDK after idle — remove 60KB from critical bundle"
```

---

### Task 1.3: Delete Orphaned goal_icon.png (6.7MB)

**Files:**
- Delete: `public/goal_icon.png`

**Context:**
- File is 6.7MB — no source code references it (grep confirmed: 0 matches in .ts/.tsx files)
- Only referenced in planning docs

**Step 1: Delete the file**
```bash
rm public/goal_icon.png
```

**Step 2: Commit**
```bash
git add -A public/goal_icon.png
git commit -m "perf: delete orphaned goal_icon.png (6.7MB unused asset)"
```

---

### Task 1.4: next.config.mjs — Optimize Package Imports

**Files:**
- Modify: `next.config.mjs`

**Context:**
- Currently only optimizes `lucide-react` (line 9)
- Missing: `@supabase/supabase-js`, other large packages

**Step 1: Expand optimizePackageImports**

In `next.config.mjs`, change:
```javascript
experimental: {
  optimizePackageImports: ['lucide-react'],
},
```
to:
```javascript
experimental: {
  optimizePackageImports: ['lucide-react', '@supabase/supabase-js', 'posthog-js'],
},
```

**Step 2: Build and verify**

Run: `npx next build`
Expected: 0 errors. Smaller initial JS chunks.

**Step 3: Commit**
```bash
git add next.config.mjs
git commit -m "perf: extend optimizePackageImports for supabase and posthog"
```

---

## Wave 2: Progressive Loading (Parallel — 4 Independent Tasks)

These tasks are independent and can each run in a separate worktree/agent.

---

### Task 2.1: Loading Skeletons for Fantasy + Market

**Files:**
- Create: `src/app/(app)/fantasy/loading.tsx`
- Create: `src/app/(app)/market/loading.tsx`
- Create: `src/app/(app)/community/loading.tsx`

**Context:**
- `(app)/loading.tsx` exists (30 lines) — good generic skeleton
- Fantasy, Market, Community have NO loading.tsx — user sees nothing while JS loads
- These are Server Components (no 'use client') — rendered immediately by Next.js

**Step 1: Create Fantasy loading skeleton**

Create `src/app/(app)/fantasy/loading.tsx`:
```typescript
export default function FantasyLoading() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-52 bg-white/[0.04] rounded-lg" />
        <div className="h-9 w-32 bg-white/[0.04] rounded-xl" />
      </div>
      {/* Tab bar */}
      <div className="h-[52px] bg-white/[0.04] rounded-2xl" />
      {/* Event cards */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-36 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create Market loading skeleton**

Create `src/app/(app)/market/loading.tsx`:
```typescript
export default function MarketLoading() {
  return (
    <div className="max-w-[1400px] mx-auto space-y-5 animate-pulse">
      {/* Header + Balance */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-white/[0.04] rounded-lg" />
        <div className="h-9 w-44 bg-white/[0.04] rounded-xl" />
      </div>
      {/* Tab bar */}
      <div className="h-[52px] bg-white/[0.04] rounded-2xl" />
      {/* Card grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-64 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
```

**Step 3: Create Community loading skeleton**

Create `src/app/(app)/community/loading.tsx`:
```typescript
export default function CommunityLoading() {
  return (
    <div className="max-w-[1200px] mx-auto space-y-5 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-white/[0.04] rounded-lg" />
        <div className="h-9 w-28 bg-white/[0.04] rounded-xl" />
      </div>
      {/* Filter pills */}
      <div className="flex gap-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-8 w-20 bg-white/[0.04] rounded-full" />
        ))}
      </div>
      {/* Post cards */}
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-48 bg-surface-base border border-white/10 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Build and verify**

Run: `npx next build`
Expected: 0 errors. Routes now show instant skeleton before JS hydrates.

**Step 5: Commit**
```bash
git add src/app/(app)/fantasy/loading.tsx src/app/(app)/market/loading.tsx src/app/(app)/community/loading.tsx
git commit -m "perf: add loading.tsx skeletons for Fantasy, Market, Community routes"
```

---

### Task 2.2: Homepage — Progressive Sections with Suspense

**Files:**
- Modify: `src/app/(app)/page.tsx`

**Context:**
- Currently: 7 queries load in parallel, but `if (playersLoading) return <HomeSkeleton />` at line 172 blocks EVERYTHING until all data arrives
- Goal: Show shell immediately, let each section load independently
- Key queries: `usePlayers()` (all 630 players!), `useHoldings`, `useEvents`, `useUserStats`, `useScoutScores`, `useRecentGlobalTrades`, `useTrendingPlayers`
- `usePlayers()` is the heaviest — used for IPOs (line 141) and trending match (line 164)

**Step 1: Remove blocking guard, add per-section loading**

In `src/app/(app)/page.tsx`, remove lines 172-180 (the blocking guard):
```typescript
// DELETE THESE LINES:
if (playersLoading) return <HomeSkeleton />;

if (playersError && players.length === 0) {
  return (
    <div className="max-w-[1200px] mx-auto py-12">
      <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
    </div>
  );
}
```

**Step 2: Add loading state to individual sections**

Replace the return block starting at line 182 with progressive loading pattern. Wrap the main return so that the story header + skeleton renders immediately, and data-dependent sections show their own loading states:

After the derived data block (after line 170), add:

```typescript
// ── Error state (only if no cached data at all) ──
if (playersError && players.length === 0) {
  return (
    <div className="max-w-[1200px] mx-auto py-12">
      <ErrorState onRetry={() => queryClient.refetchQueries({ queryKey: qk.players.all })} />
    </div>
  );
}
```

Then in the JSX return, wrap data-dependent sections with inline loading checks:

```tsx
{/* 2. Spotlight — shows skeleton while players load */}
{playersLoading ? (
  <div className="h-40 bg-surface-base border border-white/10 rounded-2xl animate-pulse" />
) : (
  <HomeSpotlight
    activeIPOs={activeIPOs}
    nextEvent={nextEvent}
    holdings={holdings}
    trendingPlayers={trendingPlayers}
    players={players}
  />
)}
```

Same pattern for LiveTicker, PortfolioStrip, and the trending section — show a small skeleton while their specific data loads, not the entire page.

The `HomeStoryHeader` can render immediately with `loading={loading}` since it already handles its own loading state.

**Step 3: Build and verify**

Run: `npx next build`
Expected: 0 errors. Homepage now shows content progressively.

**Step 4: Commit**
```bash
git add src/app/(app)/page.tsx
git commit -m "perf: homepage progressive loading — remove blocking guard, per-section skeletons"
```

---

### Task 2.3: Market Page — Tab-Gated Queries

**Files:**
- Modify: `src/app/(app)/market/page.tsx` (lines 150-159)

**Context:**
- Currently: 10 queries fire on mount regardless of active tab (lines 150-159)
- `tab` state from Zustand store — defaults to `'portfolio'`
- Kaufen-specific queries: `useActiveIpos`, `useAnnouncedIpos`, `useRecentlyEndedIpos`, `useTrendingPlayers`, `useAllPriceHistories`
- Portfolio-specific queries: `useIncomingOffers`
- Both tabs: `useEnrichedPlayers`, `useHoldings`, `useAllOpenOrders`, `useWatchlist`

**Step 1: Add `enabled` gates to tab-specific queries**

In `src/app/(app)/market/page.tsx`, modify the query hooks (around lines 150-159).

First check: do these hooks accept an `enabled` option? They're React Query hooks — check their signatures.

The hooks likely wrap `useQuery`. The approach: pass `enabled` option to the ones that support it. For hooks that DON'T accept `enabled`, we need to check their implementation and add it.

**Approach A (if hooks accept options):**
```typescript
// Shared (always load)
const { data: enrichedPlayers = [], isLoading: playersLoading, isError: playersError } = useEnrichedPlayers(user?.id);
const { data: holdings = [] } = useHoldings(user?.id);
const { data: watchlistEntries = [] } = useWatchlist(user?.id);
const { data: recentOrders = [] } = useAllOpenOrders();

// Kaufen-only (gate by tab)
const { data: ipoList = [] } = useActiveIpos({ enabled: tab === 'kaufen' });
const { data: announcedIpos = [] } = useAnnouncedIpos({ enabled: tab === 'kaufen' });
const { data: endedIpos = [] } = useRecentlyEndedIpos({ enabled: tab === 'kaufen' });
const { data: trending = [] } = useTrendingPlayers(8, { enabled: tab === 'kaufen' });
const { data: priceHistMap } = useAllPriceHistories(10, { enabled: tab === 'kaufen' });

// Portfolio-only
const { data: incomingOffers = [] } = useIncomingOffers(user?.id, { enabled: tab === 'portfolio' });
```

**Approach B (if hooks DON'T accept options):**
Check each hook's implementation in `src/lib/queries/`. If they use `useQuery({ queryKey, queryFn })` pattern, add an optional `options` param:

```typescript
// Example hook modification pattern:
export function useActiveIpos(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.ipos.active,
    queryFn: () => getActiveIpos(),
    enabled: options?.enabled ?? true,
  });
}
```

The implementing agent should:
1. Check each hook's signature in `src/lib/queries/`
2. If the hook already accepts an options/enabled param, use Approach A
3. If not, extend the hook (Approach B) and then use the enabled gate

**Step 2: Build and verify**

Run: `npx next build`
Expected: 0 errors. Market page now loads 4 queries instead of 10 on first render.

**Step 3: Commit**
```bash
git add src/app/(app)/market/page.tsx src/lib/queries/
git commit -m "perf: market page tab-gated queries — only load active tab data"
```

---

### Task 2.4: AuthProvider — Non-Blocking with SessionStorage Hydration

**Files:**
- Modify: `src/components/providers/AuthProvider.tsx`

**Context:**
- AuthProvider ALREADY hydrates from sessionStorage (lines 110-119) — `loading` starts as `false` when cached user exists (line 117: `useState(!cachedUser)`)
- The blocking path is ONLY on first visit (no sessionStorage) or expired session
- Current flow: `getSession()` → `loadProfile()` → `setLoading(false)` (lines 180-197)
- This is ALREADY well-optimized for repeat visits!

**Improvement needed:** On first visit only (no cache), the auth check blocks everything. We can show the shell immediately and load auth in background.

**Step 1: Set loading to false earlier on fresh visits**

In `src/components/providers/AuthProvider.tsx`, the `useEffect` (line 178) should not block the entire app. Change the flow so the app shell renders immediately:

In the `.then()` block (lines 181-197), restructure to NOT await `loadProfile`:

```typescript
useEffect(() => {
  let cancelled = false;

  supabase.auth.getSession()
    .then(({ data: { session } }) => {
      if (cancelled) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        ssSet(SS_USER, u);
        // Load profile in background — don't block app render
        loadProfile(u.id).finally(() => {
          if (!cancelled) setLoading(false);
        });
      } else {
        setProfile(null);
        setPlatformRole(null);
        setClubAdmin(null);
        ssClear();
        queryClient.clear();
        setLoading(false);
      }
    })
    .catch(() => {
      if (cancelled) return;
      setUser(null);
      setProfile(null);
      setPlatformRole(null);
      setClubAdmin(null);
      ssClear();
      setLoading(false);
    });

  // Listen for auth changes
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (cancelled) return;
    const u = session?.user ?? null;
    setUser(u);
    if (u) {
      ssSet(SS_USER, u);
      await loadProfile(u.id);
      if (_event === 'SIGNED_IN') {
        import('@/lib/services/activityLog').then(({ logActivity }) => {
          logActivity(u.id, 'login', 'auth', { provider: session?.user?.app_metadata?.provider });
        }).catch(err => console.error('[AuthProvider] logActivity login:', err));
      }
    } else {
      if (_event === 'SIGNED_OUT' && user) {
        import('@/lib/services/activityLog').then(({ logActivity, flushActivityLogs }) => {
          logActivity(user.id, 'logout', 'auth');
          flushActivityLogs();
        }).catch(err => console.error('[AuthProvider] logActivity logout:', err));
      }
      setProfile(null);
      setPlatformRole(null);
      setClubAdmin(null);
      ssClear();
      queryClient.clear();
    }
    setLoading(false);
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
  };
}, [loadProfile]);
```

**IMPORTANT:** The `user` is set immediately after `getSession()` resolves. `loading` stays true until `loadProfile` finishes. The key improvement is the `cancelled` flag for proper cleanup and the `.finally()` pattern. The user context (`user`) is available sooner even though profile is still loading.

**CAUTION:** Pages that need `profile` (like onboarding redirect) already handle `if (!loading && !profile)` pattern via `useRequireProfile()` (line 97-106). This still works because `loading` stays true until profile loads.

**Step 2: Build and verify**

Run: `npx next build`
Expected: 0 errors. Auth flow unchanged for users, but cancelled cleanup is cleaner.

**Step 3: Commit**
```bash
git add src/components/providers/AuthProvider.tsx
git commit -m "perf: AuthProvider non-blocking profile load with proper cancellation"
```

---

## Wave 3: Code Splitting (Parallel — 2 Independent Tasks)

---

### Task 3.1: EventDetailModal — Split into Lazy Tabs

**Files:**
- Modify: `src/components/fantasy/EventDetailModal.tsx` (1,854 lines)
- Create: `src/components/fantasy/event-tabs/LeaderboardPanel.tsx`
- Create: `src/components/fantasy/event-tabs/LineupPickerPanel.tsx`
- Create: `src/components/fantasy/event-tabs/OverviewPanel.tsx`

**Context:**
- EventDetailModal has internal tabs: Overview, Lineup Picker, Leaderboard
- Currently ALL tab content is in one 1,854-line file
- Only the active tab needs to render

**Approach:**
1. Read EventDetailModal.tsx fully
2. Identify the tab sections (look for tab state and conditional rendering)
3. Extract each tab's JSX + logic into a separate component file
4. Use `dynamic()` imports in the parent modal for non-default tabs
5. Keep the modal shell (header, tab bar, state management) in the original file

**Implementation notes for the agent:**
- Read the file first to understand the tab structure
- The modal likely has useState for `activeTab` — find it
- Extract the JSX block for each tab into its own file
- Pass required state via props
- Use `const LeaderboardPanel = dynamic(() => import('./event-tabs/LeaderboardPanel'), { ssr: false })` pattern
- Keep the first/default tab inline (no lazy load needed for the initially visible tab)
- The extracted components should be `'use client'` since they use hooks

**Step 1: Read and analyze tab structure**
**Step 2: Create tab component files with extracted logic**
**Step 3: Replace inline tab content with dynamic imports**
**Step 4: Build and verify**
**Step 5: Commit**

```bash
git commit -m "perf: split EventDetailModal into lazy tab panels — reduce initial bundle"
```

---

### Task 3.2: FixtureDetailModal — Split into Lazy Tabs

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` (1,272 lines)
- Create: `src/components/fantasy/spieltag/fixture-tabs/FormationTab.tsx`
- Create: `src/components/fantasy/spieltag/fixture-tabs/RankingTab.tsx`
- Create: `src/components/fantasy/spieltag/fixture-tabs/TimelineTab.tsx`

**Context:**
- Same pattern as Task 3.1 but for fixture/match detail modal
- Has tabs: Overview/Formation, Ranking, Timeline
- 1,272 lines — split reduces initial modal load

**Approach:** Same as Task 3.1:
1. Read FixtureDetailModal.tsx fully
2. Identify tab sections
3. Extract into lazy-loaded components
4. Keep modal shell + first tab inline

**Implementation notes:**
- Also batch HTTP requests with `Promise.all()` where sequential calls are found
- Check for `getFixturePlayerStats`, `getFixtureSubstitutions`, `getFloorPricesForPlayers` calls
- If they fire sequentially, combine into `Promise.all()`

**Step 1: Read and analyze**
**Step 2: Extract tab components**
**Step 3: Batch HTTP requests**
**Step 4: Build and verify**
**Step 5: Commit**

```bash
git commit -m "perf: split FixtureDetailModal into lazy tabs + batch HTTP requests"
```

---

## Wave 4: Advanced Optimizations (Parallel — 3 Independent Tasks)

---

### Task 4.1: Provider Chain — Lazy Init Non-Critical Providers

**Files:**
- Modify: `src/components/providers/Providers.tsx`
- Modify: `src/components/providers/ClubProvider.tsx` (may need to check)
- Modify: `src/components/providers/WalletProvider.tsx` (may need to check)

**Context:**
- Current chain: Query → Auth → Analytics → Club → Wallet → Toast
- Club + Wallet providers fetch data on mount — but only needed AFTER auth resolves
- Analytics already deferred in Task 1.2

**Approach:**
- ClubProvider and WalletProvider should check `user` before fetching
- If they already do (likely via `useUser()` → `if (!user) return`), they're fine
- The improvement: wrap Club + Wallet in a component that only mounts after auth is ready

**Step 1: Check ClubProvider and WalletProvider implementations**

Read both files. If they already gate on `user` (e.g., `const { user } = useUser(); if (!user) return`), they're already lazy. If they fetch unconditionally, add the gate.

**Step 2: Create LazyProviders wrapper**

If providers don't self-gate, wrap them:

```typescript
'use client';

import { QueryProvider } from './QueryProvider';
import { AuthProvider, useUser } from './AuthProvider';
import { ClubProvider } from './ClubProvider';
import { WalletProvider } from './WalletProvider';
import { ToastProvider } from './ToastProvider';
import AnalyticsProvider from './AnalyticsProvider';

function AuthGatedProviders({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser();

  // Don't mount data providers until we know if user is logged in
  if (loading || !user) {
    return <ToastProvider>{children}</ToastProvider>;
  }

  return (
    <ClubProvider>
      <WalletProvider>
        <ToastProvider>{children}</ToastProvider>
      </WalletProvider>
    </ClubProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <AuthProvider>
        <AnalyticsProvider>
          <AuthGatedProviders>{children}</AuthGatedProviders>
        </AnalyticsProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
```

**CAUTION:** Components that use `useClub()` or `useWallet()` when NOT logged in will get default/empty values. Check if any public pages (like `/club/[slug]`) use these providers. If yes, keep ClubProvider outside the gate.

**Step 3: Build and verify**

Run: `npx next build`
Expected: 0 errors.

**Step 4: Commit**
```bash
git add src/components/providers/
git commit -m "perf: gate Club + Wallet providers behind auth — skip unnecessary fetches for logged-out users"
```

---

### Task 4.2: CSS Animation Cleanup + prefers-reduced-motion

**Files:**
- Modify: `src/app/globals.css`

**Context:**
- `globals.css` is 436 lines with many animations
- `prefers-reduced-motion` block (lines 429-435) only covers 5 animations — many are missing
- `confetti-fall` animation (line 138) is CPU-heavy and should respect reduced motion

**Step 1: Extend prefers-reduced-motion to cover ALL animations**

Replace the `@media (prefers-reduced-motion: reduce)` block at line 428 with:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This is the nuclear option — disables ALL animations for users who prefer reduced motion. This is the correct accessibility approach.

**Step 2: Remove duplicate animations**

Check if `price-tick-up`/`price-tick-down` (lines 247-254) duplicate the flash-cell animations (lines 260-261). If they serve the same purpose, consolidate.

**Step 3: Build and verify**

Run: `npx next build`
Expected: 0 errors.

**Step 4: Commit**
```bash
git add src/app/globals.css
git commit -m "perf: comprehensive prefers-reduced-motion + CSS animation cleanup"
```

---

### Task 4.3: Service Worker — Stale-While-Revalidate for API

**Files:**
- Modify: `public/sw.js`

**Context:**
- Current SW uses network-first for navigation, cache-first for static assets
- Missing: caching strategy for Supabase API responses
- Adding SWR for API would make repeat visits instant even on slow networks

**Step 1: Read current sw.js**
**Step 2: Add stale-while-revalidate for Supabase API calls**

Add a handler that:
- Matches requests to `*.supabase.co/rest/v1/*`
- Returns cached response immediately (if available)
- Fetches fresh response in background
- Updates cache with fresh response
- Cache TTL: 2 minutes (matches React Query staleTime)

```javascript
// In the fetch event handler, add before the default handler:
if (url.hostname.endsWith('supabase.co') && url.pathname.startsWith('/rest/v1/')) {
  // Stale-while-revalidate for API
  event.respondWith(
    caches.open('bescout-api-v1').then(async (cache) => {
      const cached = await cache.match(event.request);
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse.ok) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      }).catch(() => cached); // Fallback to cache on network error

      return cached || fetchPromise;
    })
  );
  return;
}
```

**CAUTION:** Only cache GET requests. POST/PATCH/DELETE must NOT be cached. Add a method check:
```javascript
if (event.request.method === 'GET' && url.hostname.endsWith('supabase.co') && ...)
```

Also add cache expiry — periodically clean entries older than 5 minutes.

**Step 3: Build and verify**
**Step 4: Commit**

```bash
git add public/sw.js
git commit -m "perf: add stale-while-revalidate caching for Supabase API in Service Worker"
```

---

## Verification Checklist (After All Waves)

- [ ] `npx next build` → 0 errors
- [ ] `npx vitest run` → all tests pass
- [ ] Manual test: Open app in incognito — should see skeleton within 500ms
- [ ] Manual test: Refresh app with cache — should feel instant
- [ ] Manual test: Navigate to Market → only active tab queries fire (check Network tab)
- [ ] Manual test: Navigate to Fantasy → skeleton shows before content
- [ ] Check: No Google Fonts request in Network waterfall
- [ ] Check: PostHog loads after idle (not in initial bundle)
- [ ] Check: `goal_icon.png` no longer served
- [ ] Lighthouse audit: FCP < 1s, LCP < 1.5s, TTI < 2s
