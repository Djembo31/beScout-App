# Performance Overhaul v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate app-wide lag so 100K users get instant page loads with zero refresh-clicking.

**Architecture:** 5-phase layered approach — fix each layer completely from data up to UI. Each phase builds on the previous. Phase 1 alone cuts 50-60% of unnecessary API calls.

**Tech Stack:** Next.js 14 / React Query v5 / Supabase (PostgreSQL RPCs) / TypeScript strict / @tanstack/react-virtual (new dep)

**Design Doc:** `docs/plans/2026-03-18-performance-overhaul-v2-design.md`

---

## Phase 1: Query Fundamentals

### Task 1: Fix ActiveGameweek staleTime

**Files:**
- Modify: `src/lib/queries/events.ts:38-60`

**Step 1: Fix useActiveGameweek**

Replace lines 38-48 in `src/lib/queries/events.ts`:

```typescript
export function useActiveGameweek(clubId: string | undefined) {
  return useQuery({
    queryKey: qk.events.activeGw(clubId!),
    queryFn: () => getActiveGameweek(clubId!),
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000,     // 5 min — GW changes 1x/week
    gcTime: 10 * 60 * 1000,
  });
}
```

**Step 2: Fix useLeagueActiveGameweek**

Replace lines 51-60:

```typescript
export function useLeagueActiveGameweek() {
  return useQuery({
    queryKey: qk.events.leagueGw,
    queryFn: getLeagueActiveGameweek,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
```

**Step 3: Verify invalidateFantasyQueries already handles targeted invalidation**

Check `src/lib/queries/invalidation.ts:74-85` — already invalidates `qk.events.activeGw(clubId)` and `qk.events.leagueGw`. No change needed.

**Step 4: Run tsc**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/queries/events.ts
git commit -m "perf: fix activeGameweek staleTime 0 → 5min (eliminates refetch on every navigation)"
```

---

### Task 2: Tab-gate PlayerContent queries

**Files:**
- Modify: `src/app/(app)/player/[id]/PlayerContent.tsx:84-99`
- Modify: `src/lib/queries/misc.ts` (add `active` param to hooks that lack it)

**Step 1: Add `active` parameter to hooks in misc.ts**

Add `active` parameter to these hooks that currently lack gating:

In `src/lib/queries/misc.ts`, modify:

```typescript
// usePlayerGwScores — add active param
export function usePlayerGwScores(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.scoring.gwScores(playerId!),
    queryFn: () => getPlayerGameweekScores(playerId!),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

// usePlayerMatchTimeline — add active param
export function usePlayerMatchTimeline(playerId: string | undefined, limit = 15, active = true) {
  return useQuery({
    queryKey: qk.scoring.matchTimeline(playerId!),
    queryFn: () => getPlayerMatchTimeline(playerId!, limit),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

// usePbtForPlayer — add active param
export function usePbtForPlayer(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.pbt.byPlayer(playerId!),
    queryFn: () => getPbtForPlayer(playerId!),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

// useLiquidationEvent — add active param
export function useLiquidationEvent(playerId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.liquidation.byPlayer(playerId!),
    queryFn: () => getLiquidationEvent(playerId!),
    enabled: !!playerId && active,
    staleTime: FIVE_MIN,
  });
}

// usePosts — add active param (only for player detail context)
// Already has params object — add enabled override:
export function usePosts(params: {
  limit?: number;
  offset?: number;
  playerId?: string;
  userId?: string;
  clubName?: string;
  clubId?: string;
  postType?: PostType;
  eventId?: string;
  active?: boolean;
} = {}) {
  const { active = true, ...queryParams } = params;
  return useQuery({
    queryKey: qk.posts.list(queryParams as Record<string, unknown>),
    queryFn: () => getPosts(queryParams),
    staleTime: TWO_MIN,
    enabled: active,
  });
}
```

**Step 2: Apply tab-gating in PlayerContent.tsx**

Replace lines 84-99 with gated hooks:

```typescript
  // ─── React Query Hooks (ALL before early returns) ────
  // ALWAYS loaded (needed for Hero + Trading default tab):
  const { data: dbPlayer, isLoading: playerLoading, isError: playerError, refetch } = useDbPlayerById(playerId);
  const { data: holdingQtyData } = useHoldingQty(uid, playerId);
  const { data: holderCountData } = usePlayerHolderCount(playerId);
  const { data: allSellOrdersData } = useSellOrders(playerId);
  const { data: activeIpo } = useIpoForPlayer(playerId);

  // TRADING TAB (default tab — loads immediately):
  const { data: tradesData, isLoading: tradesLoading } = usePlayerTrades(playerId);
  const { data: openBidsData } = useOpenBids(playerId, tab === 'trading');
  const { data: pbtTreasury } = usePbtForPlayer(playerId, tab === 'trading');
  const { data: userIpoPurchasedData } = useUserIpoPurchases(uid, activeIpo?.id);
  const { data: masteryData } = useDpcMastery(uid, playerId);

  // PERFORMANCE TAB (loaded only when tab active):
  const { data: gwScoresData } = usePlayerGwScores(playerId, tab === 'performance');
  const { data: matchTimelineData, isLoading: matchTimelineLoading } = usePlayerMatchTimeline(playerId, 15, tab === 'performance');
  const { data: liquidationEvent } = useLiquidationEvent(playerId, tab === 'performance');

  // COMMUNITY TAB (loaded only when tab active):
  const { data: playerResearchData } = usePlayerResearch(playerId, uid, tab === 'community' || tab === 'trading');
  const { data: playerPostsData } = usePosts({ playerId, limit: 30, active: tab === 'community' });
```

**Step 3: Run tsc**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/lib/queries/misc.ts src/app/\(app\)/player/\[id\]/PlayerContent.tsx
git commit -m "perf: tab-gate PlayerContent queries (16 → 7 on initial load)"
```

---

### Task 3: Fix invalidation over-breadth

**Files:**
- Modify: `src/lib/queries/invalidation.ts:26-32`

**Step 1: Remove leaderboard from invalidateSocialQueries**

In `src/lib/queries/invalidation.ts`, replace lines 26-32:

```typescript
/** Invalidate caches affected by social/reputation actions */
export function invalidateSocialQueries(userId: string): void {
  queryClient.invalidateQueries({ queryKey: qk.userStats.byUser(userId) });
  queryClient.invalidateQueries({ queryKey: qk.social.followerCount(userId) });
  queryClient.invalidateQueries({ queryKey: qk.social.followingCount(userId) });
  queryClient.invalidateQueries({ queryKey: qk.social.feed(userId) });
  // Removed: queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
  // Leaderboard has 5min staleTime and doesn't change from a single follow action.
}
```

**Step 2: Run tsc + commit**

```bash
npx tsc --noEmit
git add src/lib/queries/invalidation.ts
git commit -m "perf: remove leaderboard invalidation from social actions"
```

---

### Task 4: Defer below-the-fold Home queries

**Files:**
- Modify: `src/app/(app)/page.tsx:99-103`

**Step 1: Add deferred loading state**

In `src/app/(app)/page.tsx`, add after line 87 (after `shieldsRemaining` state):

```typescript
  // ── Deferred loading for below-fold content ──
  const [belowFoldReady, setBelowFoldReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setBelowFoldReady(true), 800);
    return () => clearTimeout(timer);
  }, []);
```

**Step 2: Gate gamification queries**

Replace lines 100-103:

```typescript
  // ── Gamification v5 Hooks (deferred — below the fold) ──
  const { data: todaysChallenge = null, isLoading: challengeLoading } = useTodaysChallenge(belowFoldReady);
  const { data: challengeHistory = [] } = useChallengeHistory(uid, belowFoldReady);
  const { data: ticketData = null } = useUserTickets(uid, belowFoldReady);
  const { data: highestPass } = useHighestPass(uid, belowFoldReady);
```

**Step 3: Add `active` param to these hooks**

In `src/lib/queries/dailyChallenge.ts`, add enabled gating:

```typescript
export function useTodaysChallenge(active = true) {
  return useQuery({
    queryKey: qk.dailyChallenge.today(),
    queryFn: getTodaysChallenge,
    staleTime: 5 * 60 * 1000,
    enabled: active,
  });
}

export function useChallengeHistory(userId: string | undefined, active = true) {
  return useQuery({
    queryKey: qk.dailyChallenge.history(userId!),
    queryFn: () => getChallengeHistory(userId!),
    enabled: !!userId && active,
    staleTime: 5 * 60 * 1000,
  });
}
```

In `src/lib/queries/tickets.ts`, same pattern:

```typescript
export function useUserTickets(userId: string | undefined, active = true) {
  return useQuery({
    // ... existing config ...
    enabled: !!userId && active,
  });
}
```

In `src/lib/queries/foundingPasses.ts`:

```typescript
export function useHighestPass(userId: string | undefined, active = true) {
  return useQuery({
    // ... existing config ...
    enabled: !!userId && active,
  });
}
```

**Step 4: tsc + commit**

```bash
npx tsc --noEmit
git add src/app/\(app\)/page.tsx src/lib/queries/dailyChallenge.ts src/lib/queries/tickets.ts src/lib/queries/foundingPasses.ts
git commit -m "perf: defer below-fold Home queries by 800ms (9 → 5 immediate)"
```

---

## Phase 2: Service Layer

### Task 5: Add .limit() to unbounded queries

**Files:**
- Modify: `src/lib/services/bounties.ts:55`
- Modify: `src/lib/services/airdropScore.ts` (getAirdropStats)

**Step 1: Add limit to getAllActiveBounties**

In `src/lib/services/bounties.ts`, after line 55 (after `.order(...)`) add:

```typescript
    .limit(100);
```

The line should read:
```typescript
    .order('created_at', { ascending: false })
    .limit(100);
```

**Step 2: Add limit to getAirdropStats**

Find `getAirdropStats` in `src/lib/services/airdropScore.ts` and add appropriate limit or use RPC count.

**Step 3: tsc + commit**

```bash
npx tsc --noEmit
git add src/lib/services/bounties.ts src/lib/services/airdropScore.ts
git commit -m "perf: add .limit() to unbounded bounties and airdrop queries"
```

---

### Task 6: Parallelize getClubFanSegments

**Files:**
- Modify: `src/lib/services/clubCrm.ts:35-83`

**Step 1: Convert 4 sequential awaits to 2 parallel batches**

Replace `getClubFanSegments` (lines 35-83):

```typescript
export async function getClubFanSegments(clubId: string): Promise<FanSegment[]> {
  // Batch 1: All independent queries in parallel
  const [followResult, subsResult, playersResult] = await Promise.all([
    supabase
      .from('club_followers')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId),
    supabase
      .from('club_subscriptions')
      .select('tier, user_id')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString()),
    supabase
      .from('players')
      .select('id')
      .eq('club_id', clubId),
  ]);

  const followerCount = followResult.count ?? 0;
  const subs = subsResult.data ?? [];
  const playerIds = (playersResult.data ?? []).map(p => p.id);

  const bronze = subs.filter(s => s.tier === 'bronze').length;
  const silber = subs.filter(s => s.tier === 'silber').length;
  const gold = subs.filter(s => s.tier === 'gold').length;
  const totalSubs = bronze + silber + gold;

  // Batch 2: Holdings count (depends on playerIds)
  let traderCount = 0;
  if (playerIds.length > 0) {
    const { count } = await supabase
      .from('holdings')
      .select('user_id', { count: 'exact', head: true })
      .in('player_id', playerIds)
      .gt('quantity', 0);
    traderCount = count ?? 0;
  }

  const freeCount = Math.max(0, followerCount - totalSubs);

  return [
    { id: 'all', label: 'Alle Fans', count: followerCount, icon: 'users' },
    { id: 'free', label: 'Free Follower', count: freeCount, icon: 'user' },
    { id: 'bronze', label: 'Bronze', count: bronze, icon: 'shield' },
    { id: 'silber', label: 'Silber', count: silber, icon: 'shield' },
    { id: 'gold', label: 'Gold', count: gold, icon: 'crown' },
    { id: 'trader', label: 'SC-Trader', count: traderCount, icon: 'trending-up' },
  ];
}
```

**Step 2: tsc + commit**

```bash
npx tsc --noEmit
git add src/lib/services/clubCrm.ts
git commit -m "perf: parallelize getClubFanSegments (4 sequential → 2 batches)"
```

---

### Task 7: Parallelize getClubFanList

**Files:**
- Modify: `src/lib/services/clubCrm.ts:86-185`

**Step 1: Convert 6 sequential to 2 parallel batches**

Replace `getClubFanList` (lines 86-185):

```typescript
export async function getClubFanList(
  clubId: string,
  segment: string = 'all',
  limit: number = 50,
): Promise<ClubFanProfile[]> {
  // Batch 1: Followers + club players (independent)
  const [followersResult, clubPlayersResult] = await Promise.all([
    supabase
      .from('club_followers')
      .select('user_id, created_at')
      .eq('club_id', clubId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('players')
      .select('id')
      .eq('club_id', clubId),
  ]);

  const followers = followersResult.data;
  if (!followers || followers.length === 0) return [];

  const userIds = followers.map(f => f.user_id);
  const playerIds = (clubPlayersResult.data ?? []).map(p => p.id);

  // Batch 2: All user-dependent queries in parallel
  const [profilesResult, subsResult, holdingsResult, activitiesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, handle, display_name, avatar_url')
      .in('id', userIds),
    supabase
      .from('club_subscriptions')
      .select('user_id, tier')
      .eq('club_id', clubId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .in('user_id', userIds),
    playerIds.length > 0
      ? supabase
          .from('holdings')
          .select('user_id, quantity')
          .in('player_id', playerIds)
          .in('user_id', userIds)
          .gt('quantity', 0)
      : Promise.resolve({ data: null }),
    supabase
      .from('activity_log')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  const holdingsMap = new Map<string, number>();
  if (holdingsResult.data) {
    for (const h of holdingsResult.data) {
      holdingsMap.set(h.user_id, (holdingsMap.get(h.user_id) ?? 0) + h.quantity);
    }
  }

  const activityMap = new Map<string, string>();
  if (activitiesResult.data) {
    for (const a of activitiesResult.data) {
      if (!activityMap.has(a.user_id)) activityMap.set(a.user_id, a.created_at);
    }
  }

  const profileMap = new Map((profilesResult.data ?? []).map(p => [p.id, p]));
  const subMap = new Map((subsResult.data ?? []).map(s => [s.user_id, s.tier]));
  const followMap = new Map(followers.map(f => [f.user_id, f.created_at]));

  const fans: ClubFanProfile[] = userIds.map(uid => {
    const p = profileMap.get(uid);
    const tier = subMap.get(uid) ?? null;
    const seg = tier ? tier : holdingsMap.has(uid) ? 'trader' : 'free';
    return {
      userId: uid,
      handle: p?.handle ?? 'anonym',
      displayName: p?.display_name ?? null,
      avatarUrl: p?.avatar_url ?? null,
      segment: seg,
      tier,
      holdingsCount: holdingsMap.get(uid) ?? 0,
      lastActivity: activityMap.get(uid) ?? null,
      followedAt: followMap.get(uid) ?? '',
    };
  });

  if (segment !== 'all') {
    return fans.filter(f => {
      if (segment === 'free') return !f.tier && f.holdingsCount === 0;
      if (segment === 'trader') return f.holdingsCount > 0;
      return f.tier === segment;
    });
  }
  return fans;
}
```

**Step 2: tsc + commit**

```bash
npx tsc --noEmit
git add src/lib/services/clubCrm.ts
git commit -m "perf: parallelize getClubFanList (6 sequential → 2 batches)"
```

---

## Phase 3: New RPCs

### Task 8: Create rpc_get_trending_players

**Files:**
- Create: Supabase migration `supabase/migrations/XXXXXX_rpc_get_trending_players.sql`
- Modify: `src/lib/services/trading.ts:369-404`

**Step 1: Write and apply migration**

```sql
CREATE OR REPLACE FUNCTION rpc_get_trending_players(p_limit INT DEFAULT 5)
RETURNS TABLE (
  player_id UUID,
  trade_count BIGINT,
  volume_24h BIGINT,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  club TEXT,
  floor_price BIGINT,
  price_change_24h NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    t.player_id,
    COUNT(*) AS trade_count,
    SUM(t.price * t.quantity) AS volume_24h,
    p.first_name,
    p.last_name,
    p.position,
    p.club,
    p.floor_price,
    p.price_change_24h
  FROM trades t
  JOIN players p ON p.id = t.player_id
  WHERE t.executed_at > NOW() - INTERVAL '24 hours'
  GROUP BY t.player_id, p.first_name, p.last_name, p.position, p.club, p.floor_price, p.price_change_24h
  ORDER BY trade_count DESC
  LIMIT p_limit;
$$;

-- Grant access
REVOKE ALL ON FUNCTION rpc_get_trending_players FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION rpc_get_trending_players TO authenticated;
```

Apply via Supabase MCP or dashboard.

**Step 2: Replace JS aggregation in trading.ts**

Replace `getTrendingPlayers` (lines 369-404):

```typescript
export async function getTrendingPlayers(limit = 5): Promise<TrendingPlayer[]> {
  const { data, error } = await supabase.rpc('rpc_get_trending_players', { p_limit: limit });

  if (error || !data) return [];

  return (data as Array<{
    player_id: string;
    trade_count: number;
    volume_24h: number;
    first_name: string;
    last_name: string;
    position: string;
    club: string;
    floor_price: number;
    price_change_24h: number;
  }>).map(row => ({
    id: row.player_id,
    firstName: row.first_name,
    lastName: row.last_name,
    position: row.position as Pos,
    club: row.club,
    floorPrice: row.floor_price,
    tradeCount: Number(row.trade_count),
    volume24h: Number(row.volume_24h),
    change24h: row.price_change_24h ?? 0,
  }));
}
```

**Step 3: tsc + commit**

```bash
npx tsc --noEmit
git add supabase/migrations/ src/lib/services/trading.ts
git commit -m "perf: replace getTrendingPlayers JS aggregation with DB RPC"
```

---

### Task 9: Create rpc_get_author_track_records

**Files:**
- Create: Supabase migration
- Modify: `src/lib/services/research.ts:85-110`

**Step 1: Write and apply migration**

```sql
CREATE OR REPLACE FUNCTION rpc_get_author_track_records(p_user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  total_calls BIGINT,
  correct_calls BIGINT,
  hit_rate NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT
    rp.user_id,
    COUNT(*) AS total_calls,
    COUNT(*) FILTER (WHERE rp.outcome = 'correct') AS correct_calls,
    ROUND(
      COUNT(*) FILTER (WHERE rp.outcome = 'correct')::numeric
      / NULLIF(COUNT(*), 0), 2
    ) AS hit_rate
  FROM research_posts rp
  WHERE rp.user_id = ANY(p_user_ids)
    AND rp.outcome IS NOT NULL
    AND rp.price_at_creation > 0
  GROUP BY rp.user_id;
$$;

REVOKE ALL ON FUNCTION rpc_get_author_track_records FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION rpc_get_author_track_records TO authenticated;
```

**Step 2: Replace fetchTrackRecords in research.ts**

Replace `fetchTrackRecords` function (lines 85-110):

```typescript
    const fetchTrackRecords = async () => {
      const { data, error } = await supabase.rpc('rpc_get_author_track_records', {
        p_user_ids: authorIds,
      });
      if (error || !data) return new Map<string, { hitRate: number; totalCalls: number }>();
      const result = new Map<string, { hitRate: number; totalCalls: number }>();
      for (const row of data as Array<{ user_id: string; total_calls: number; correct_calls: number; hit_rate: number }>) {
        result.set(row.user_id, {
          hitRate: Math.round((row.hit_rate ?? 0) * 100),
          totalCalls: Number(row.total_calls),
        });
      }
      return result;
    };
```

**Step 3: tsc + commit**

```bash
npx tsc --noEmit
git add supabase/migrations/ src/lib/services/research.ts
git commit -m "perf: replace research track records N+1 with DB RPC"
```

---

## Phase 4: React Rendering

### Task 10: React.memo on presentational components

**Files:**
- Modify: `src/components/home/HomeSpotlight.tsx`
- Modify: `src/components/home/HomeStoryHeader.tsx`
- Modify: `src/components/home/TopMoversStrip.tsx`
- Modify: `src/components/home/PortfolioStrip.tsx`
- Modify: `src/components/community/CommunityHero.tsx`
- Modify: `src/components/community/CommunitySidebar.tsx`
- Modify: `src/components/player/detail/StickyDashboardStrip.tsx`
- Modify: `src/components/player/detail/PlayerHero.tsx`

**Step 1: Wrap each component**

Pattern for each file (example HomeSpotlight.tsx):

Change from:
```typescript
export default function HomeSpotlight(props: HomeSpotlightProps) {
```

To:
```typescript
import { memo } from 'react';

function HomeSpotlightInner(props: HomeSpotlightProps) {
  // ... existing body unchanged ...
}

export default memo(HomeSpotlightInner);
```

Apply same pattern to all 8 components. The existing codebase uses both `memo(FnInner)` (BestandPlayerRow) and `React.memo(function Fn() {})` (PlayerDisplay). Use the `memo(Inner)` pattern for consistency with default exports.

**Step 2: tsc**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/home/ src/components/community/ src/components/player/detail/StickyDashboardStrip.tsx src/components/player/detail/PlayerHero.tsx
git commit -m "perf: add React.memo to 8 presentational components"
```

---

### Task 11: Community state consolidation

**Files:**
- Modify: `src/app/(app)/community/page.tsx:54-85`

**Step 1: Replace 13 useState with useReducer**

Add before the component function:

```typescript
type CommunityState = {
  clubId: string | null;
  clubName: string | null;
  isClubAdmin: boolean;
  clubScope: 'all' | 'myclub';
  feedMode: 'all' | 'following';
  contentFilter: ContentFilter;
  createPostOpen: boolean;
  createResearchOpen: boolean;
  followListMode: 'followers' | 'following' | null;
  defaultPostType: PostType;
  createBountyOpen: boolean;
  postLoading: boolean;
  researchLoading: boolean;
  bountySubmitting: string | null;
  bountyCreating: boolean;
  unlockingResearchId: string | null;
  ratingResearchId: string | null;
  myPostVotes: Map<string, number>;
  userVotedIds: Set<string>;
  userPollVotedIds: Set<string>;
  votingId: string | null;
  pollVotingId: string | null;
  subscriptionMap: Map<string, SubscriptionTier>;
};

type CommunityAction =
  | { type: 'SET_CLUB'; clubId: string | null; clubName: string | null }
  | { type: 'SET_CLUB_ADMIN'; isClubAdmin: boolean }
  | { type: 'SET_CLUB_SCOPE'; clubScope: 'all' | 'myclub' }
  | { type: 'SET_FEED_MODE'; feedMode: 'all' | 'following' }
  | { type: 'SET_CONTENT_FILTER'; contentFilter: ContentFilter }
  | { type: 'SET_CREATE_POST_OPEN'; open: boolean }
  | { type: 'SET_CREATE_RESEARCH_OPEN'; open: boolean }
  | { type: 'SET_FOLLOW_LIST_MODE'; mode: 'followers' | 'following' | null }
  | { type: 'SET_DEFAULT_POST_TYPE'; postType: PostType }
  | { type: 'SET_CREATE_BOUNTY_OPEN'; open: boolean }
  | { type: 'SET_POST_LOADING'; loading: boolean }
  | { type: 'SET_RESEARCH_LOADING'; loading: boolean }
  | { type: 'SET_BOUNTY_SUBMITTING'; id: string | null }
  | { type: 'SET_BOUNTY_CREATING'; creating: boolean }
  | { type: 'SET_UNLOCKING_RESEARCH'; id: string | null }
  | { type: 'SET_RATING_RESEARCH'; id: string | null }
  | { type: 'SET_MY_POST_VOTES'; votes: Map<string, number> }
  | { type: 'SET_USER_VOTED_IDS'; ids: Set<string> }
  | { type: 'SET_USER_POLL_VOTED_IDS'; ids: Set<string> }
  | { type: 'SET_VOTING_ID'; id: string | null }
  | { type: 'SET_POLL_VOTING_ID'; id: string | null }
  | { type: 'SET_SUBSCRIPTION_MAP'; map: Map<string, SubscriptionTier> };

function communityReducer(state: CommunityState, action: CommunityAction): CommunityState {
  switch (action.type) {
    case 'SET_CLUB': return { ...state, clubId: action.clubId, clubName: action.clubName };
    case 'SET_CLUB_ADMIN': return { ...state, isClubAdmin: action.isClubAdmin };
    case 'SET_CLUB_SCOPE': return { ...state, clubScope: action.clubScope };
    case 'SET_FEED_MODE': return { ...state, feedMode: action.feedMode };
    case 'SET_CONTENT_FILTER': return { ...state, contentFilter: action.contentFilter };
    case 'SET_CREATE_POST_OPEN': return { ...state, createPostOpen: action.open };
    case 'SET_CREATE_RESEARCH_OPEN': return { ...state, createResearchOpen: action.open };
    case 'SET_FOLLOW_LIST_MODE': return { ...state, followListMode: action.mode };
    case 'SET_DEFAULT_POST_TYPE': return { ...state, defaultPostType: action.postType };
    case 'SET_CREATE_BOUNTY_OPEN': return { ...state, createBountyOpen: action.open };
    case 'SET_POST_LOADING': return { ...state, postLoading: action.loading };
    case 'SET_RESEARCH_LOADING': return { ...state, researchLoading: action.loading };
    case 'SET_BOUNTY_SUBMITTING': return { ...state, bountySubmitting: action.id };
    case 'SET_BOUNTY_CREATING': return { ...state, bountyCreating: action.creating };
    case 'SET_UNLOCKING_RESEARCH': return { ...state, unlockingResearchId: action.id };
    case 'SET_RATING_RESEARCH': return { ...state, ratingResearchId: action.id };
    case 'SET_MY_POST_VOTES': return { ...state, myPostVotes: action.votes };
    case 'SET_USER_VOTED_IDS': return { ...state, userVotedIds: action.ids };
    case 'SET_USER_POLL_VOTED_IDS': return { ...state, userPollVotedIds: action.ids };
    case 'SET_VOTING_ID': return { ...state, votingId: action.id };
    case 'SET_POLL_VOTING_ID': return { ...state, pollVotingId: action.id };
    case 'SET_SUBSCRIPTION_MAP': return { ...state, subscriptionMap: action.map };
    default: return state;
  }
}
```

Replace lines 54-85 with:

```typescript
  const [state, dispatch] = useReducer(communityReducer, {
    clubId: profile?.favorite_club_id ?? null,
    clubName: profile?.favorite_club ?? null,
    isClubAdmin: false,
    clubScope: 'all',
    feedMode: 'all',
    contentFilter: 'all',
    createPostOpen: false,
    createResearchOpen: false,
    followListMode: null,
    defaultPostType: 'general',
    createBountyOpen: false,
    postLoading: false,
    researchLoading: false,
    bountySubmitting: null,
    bountyCreating: false,
    unlockingResearchId: null,
    ratingResearchId: null,
    myPostVotes: new Map(),
    userVotedIds: new Set(),
    userPollVotedIds: new Set(),
    votingId: null,
    pollVotingId: null,
    subscriptionMap: new Map(),
  });
```

Then update all `setX(val)` calls to `dispatch({ type: 'SET_X', ... })` throughout the file.

**NOTE:** This is a large change. The implementer agent must search-replace every `setClubId(...)` → `dispatch({ type: 'SET_CLUB', clubId: ..., clubName: state.clubName })` etc. All property accesses change from `clubId` to `state.clubId`.

**Step 2: tsc + commit**

```bash
npx tsc --noEmit
git add src/app/\(app\)/community/page.tsx
git commit -m "perf: consolidate Community 13 useState → useReducer"
```

---

## Phase 5: Bundle

### Task 12: Extend optimizePackageImports

**Files:**
- Modify: `next.config.mjs:9`

**Step 1: Add packages**

Replace line 9:

```javascript
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js', 'posthog-js', '@tanstack/react-query', 'next-intl', 'zustand'],
```

**Step 2: Commit**

```bash
git add next.config.mjs
git commit -m "perf: extend optimizePackageImports (3 → 6 packages)"
```

---

### Task 13: Dynamic imports for Community modals

**Files:**
- Modify: `src/app/(app)/community/page.tsx:33-37`

**Step 1: Convert static imports to dynamic**

Replace lines 33-37:

```typescript
const CreatePostModal = dynamic(() => import('@/components/community/CreatePostModal'), { ssr: false });
const CreateResearchModal = dynamic(() => import('@/components/community/CreateResearchModal'), { ssr: false });
const CreateBountyModal = dynamic(() => import('@/components/community/CreateBountyModal'), { ssr: false });
const FollowListModal = dynamic(() => import('@/components/profile/FollowListModal'), { ssr: false });
```

(dynamic is already imported in line 38)

**Step 2: tsc + commit**

```bash
npx tsc --noEmit
git add src/app/\(app\)/community/page.tsx
git commit -m "perf: lazy-load Community modals (4 static → dynamic)"
```

---

### Task 14: Final verification + commit

**Step 1: Full type check**

```bash
npx tsc --noEmit
```

**Step 2: Run tests**

```bash
npx vitest run
```

**Step 3: Dispatch reviewer agent**

Reviewer checks all changes against design doc.

**Step 4: Final commit with all phases**

```bash
git add -A
git commit -m "perf: performance overhaul v2 complete — 5 phases, 100K-ready"
```

---

## Summary

| Task | Phase | Files Changed | Impact |
|------|-------|--------------|--------|
| 1 | P1 | events.ts | -50% Fantasy navigation API calls |
| 2 | P1 | PlayerContent.tsx, misc.ts | 16→7 queries on player load |
| 3 | P1 | invalidation.ts | No more leaderboard cascade |
| 4 | P1 | page.tsx, dailyChallenge.ts, tickets.ts, foundingPasses.ts | 9→5 immediate Home queries |
| 5 | P2 | bounties.ts, airdropScore.ts | Bounded queries |
| 6 | P2 | clubCrm.ts (segments) | 4 seq→2 parallel |
| 7 | P2 | clubCrm.ts (fan list) | 6 seq→2 parallel |
| 8 | P3 | trading.ts + migration | 1000 rows→5 rows |
| 9 | P3 | research.ts + migration | O(n²)→O(1) per author |
| 10 | P4 | 8 component files | Eliminate re-render cascades |
| 11 | P4 | community/page.tsx | 13 rerenders→1 per dispatch |
| 12 | P5 | next.config.mjs | Better tree-shaking |
| 13 | P5 | community/page.tsx | Smaller initial bundle |
| 14 | — | All | Verification + final commit |
