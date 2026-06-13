# Page Contract Audit — /fantasy + /clubs + /club/[slug]

Date: 2026-06-13
Slice: 292 / S3 Stabilization
Status: READ-ONLY AUDIT / NO CODE CHANGES
Inputs: `memory/current-product-truth.md`, `worklog/active.md`, Slice 288/289 Page Contract audits, Slice 291 GeoGate fix

---

## Executive Summary

The Fantasy/Club segment is real, not mock-only:

- `/fantasy` has a dedicated feature-module hook stack (`useFantasyEvents`, `useGameweek`, `useFantasyHoldings`, `useEventActions`, `useFixtureDeadlines`, `useScoredEvents`) and page-level `GeoGate feature="free_fantasy"` plus `FantasyDisclaimer`.
- `/club/[slug]` has server-side metadata lookup, public unauthenticated view, authenticated rich club view, and a tested `useClubData`/`useClubActions` split.
- `/clubs` is functional and connected to real follow/activate flows, but it is still page-local orchestration rather than a query-backed feature container, and it lacks a dedicated Page test.

Status:

| Page | Status | Reason |
|---|---|---|
| `/fantasy` | demo-yellow, near-green | Strong feature boundaries, real lifecycle tabs, disclaimer, and meaningful tests. Caveat: auth/empty story is implicit (`user &&` tab rendering) and data-confidence is hook/service-heavy rather than page-lifecycle E2E. |
| `/clubs` | demo-yellow | Real discovery/follow/activate UX with loading/error/empty states. Caveat: no dedicated Page test, service calls live directly in page `useEffect`, and page has no compliance/explainer surface. |
| `/club/[slug]` | demo-yellow | Rich public/auth club page, tested container and hook stack. Caveat: large competing-section surface and public metadata uses “Trading” copy, which conflicts with current product-truth copy guidance. |

---

## Contract: /fantasy

Route:
- `/fantasy`
- Entry: `src/app/(app)/fantasy/page.tsx`
- Container: `src/app/(app)/fantasy/FantasyContent.tsx`

Primary user job:
- Understand current Spieltag state, open events, participation options, lineup submission, and results.
- Admin path: create/simulate/reset events when user is club admin.

Demo relevance:
- P0. Step 7 of demo path: Fantasy lifecycle must be understandable.

Auth / Geo / Compliance gates:
- Page-level `GeoGate feature="free_fantasy"` in `page.tsx`.
- `FantasyContent` reads `useUser`; the four main tabs render only when `user` exists (`store.mainTab === ... && user`). There is no explicit not-signed-in empty state inside `FantasyContent`, likely inherited from app shell/auth layout.
- `FantasyDisclaimer variant="card"` is present before the main tabs.
- Admin gate: `useIsClubAdmin(userId, clubId)` controls create-event exposure in `FantasyHeader`.

Primary data sources:
- `useFantasyEvents(store.currentGw)` -> events, current GW events, joined IDs, selected event.
- `useGameweek(gwEvents, leagueScopeId)` -> current/active GW and fixture status.
- `useFantasyHoldings()` -> holdings for lineup modal.
- `useEventActions(clubId)` -> join/leave/submit lineup.
- `useFixtureDeadlines(gw.currentGw, activeEvents.length > 0)` -> lineup lock/deadline map.
- `useScoredEvents(gw.currentGw, events, joinedSet)` -> post-event summary.
- `useUserTickets(userId)` keeps ticket balance cache warm.
- `useLeagueScope` + `useLeagueCacheVersion` + `getCountries(locale)` own league filter/cold-load race fix.

Primary mutations:
- `joinEvent`, `leaveEvent`, `submitLineup` via `useEventActions`.
- Admin create event callback (`handleCreateEvent`) currently toasts; actual modal/service ownership is in `CreateEventModal`/fantasy services.
- `handleSimulated` refetches fantasy events and active gameweek.
- `markEventSeen` for summary modal local seen-state.

Query/cache ownership:
- Fantasy feature owns events, joined IDs, lineups, deadlines, scoring and wildcards.
- League scope store invalidates event/fantasy roots on scope change (Slice 251/254/286 lessons).
- Ticket balance and holdings are shared platform caches.

Main components:
- `FantasyHeader`, `FantasyNav`, `FantasySkeleton`, `FantasyError`.
- Tabs: `SpieltagTab`, `EventsTab`, `MitmachenTab`, `ErgebnisseTab`.
- Modals: `EventDetailModal`, `CreateEventModal`, `EventSummaryModal`.
- Support: `ScoringRules`, `FantasyDisclaimer`, `LeagueScopeHeader`, `MissionHintList`, `NewUserTip`, `StalePipelineBanner`.

Loading states:
- `page.tsx` dynamic skeleton with header/tabs/cards.
- `eventsLoading || gw.isLoading` -> `FantasySkeleton`.
- `EventDetailModal` dynamic import has modal-centered loader.

Empty states:
- `NewUserTip` shows if `joinedSet.size === 0`.
- Tab-level components own no-event/no-lineup/no-results states.
- There is no page-level unauthenticated empty state inside `FantasyContent`.

Error states:
- `eventsError && events.length === 0` -> `FantasyError onRetry={refetchEvents}`.
- Error boundaries wrap event detail and create event modals.

Mobile state:
- `max-w-[1400px]` with compact spacing; `FantasyNav` expected to own sticky/mobile nav behavior; `LeagueScopeHeader` non-sticky here.

Source-of-truth owner:
- Fantasy feature hooks/services. Good separation; page is orchestration, not direct Supabase.

Bridge/debt:
- Auth state is implicit. If a user is not available under app shell, tab content disappears rather than rendering an explicit “sign in to play fantasy” state.
- Lifecycle is broad: Paarungen + Events + Mitmachen + Ergebnisse + modal flows. Demo confidence depends on production-like event data and gameweek state, not just render tests.

Tests:
- `FantasyContent.test.tsx`: 6 page/container tests.
- Fantasy hook/service tests include `useEventActions` 25, fixtures 52, lineups 31, predictions 34, lineupStore 10, useLiveFixtures 6, fixtureLive 5, holdingMapper 4, wildcards 6.
- Focused run in this slice: `FantasyContent.test.tsx` passed 6/6.

E2E status:
- Existing broader smoke paths cover the app, but this audit did not find a deterministic Fantasy lifecycle e2e asserting join/lineup/results across real event states.

Demo status:
- demo-yellow, near-green.

Decision:
- Keep architecture. Next improvement should be an explicit auth/empty-state test and a data-confident Fantasy lifecycle smoke, not a refactor.

---

## Contract: /clubs

Route:
- `/clubs`
- File: `src/app/(app)/clubs/page.tsx`

Primary user job:
- Discover clubs, search/filter by country/league, follow/unfollow clubs, activate a followed club, request missing clubs.

Demo relevance:
- P0/P1. Step 8 bridge into Club context; shows BeScout is club-owned and multi-club, not only market/fantasy.

Auth / Geo / Compliance gates:
- Reads `useUser`; follow/unfollow no-ops if no user.
- No `GeoGate` in `/clubs` scope. That is acceptable for club discovery/content.
- No page-level disclaimer/explainer. This is probably acceptable because this page is club discovery, not trading, but fan-economy copy should remain safe.

Primary data sources:
- `getClubsWithStats({ activeOnly: true })` via local `useEffect`.
- `getNextFixturesByClub()` via same `Promise.all`.
- `useFollowedClubs()` and `useToggleFollowClub()` for follow state/mutation.
- `useMostOwnedPlayersPerClubBatch(filteredClubIds, 1)` for aggregate most-owned hints.
- `useLeagueScope` + `getLeaguesByCountry` for filter state and smart one-league auto-select.

Primary mutations:
- `handleToggleFollow` -> optimistic local follower count update + `toggleAsync({ club, follow })`.
- `setActiveClub(club)` from ClubProvider.
- `FanWishModal` for missing-club request.

Query/cache ownership:
- Followed clubs and follow mutation own query/cache behavior.
- `clubs` list + next fixtures are page-local state, not React Query cache. This is a notable source-of-truth split from the newer feature-hook pattern.
- `mostOwnedByClub` uses query hook with filtered club IDs.

Main components:
- `LeagueScopeHeader`, `SearchInput`, `Card`, `Button`, `ErrorState`, `EmptyState`, `FanWishModal`.
- Page-local card markup for club grid and followed-club rail.

Loading states:
- Local `loading` -> skeleton header/grid.

Empty states:
- `filtered.length === 0` -> `EmptyState`; search empty can open FanWish.
- Followed-club rail hides when none followed.

Error states:
- `dataError` -> `ErrorState` with local retry counter.
- Follow toggle catch rolls back local follower count but does not surface toast/copy in page itself.

Mobile state:
- Grid collapses to one column; followed clubs rail is horizontal scroll; touch targets mostly min-h 44px.

Source-of-truth owner:
- Mixed. Follow ownership is query/mutation hook; club list/fixtures ownership is page-local service calls.

Bridge/debt:
- No dedicated `ClubsDiscoveryPage` test found.
- Direct service orchestration in page `useEffect` is older style compared to `useClubData`/`useFantasyEvents` patterns.
- Optimistic follow rollback has no user-visible error toast here.

Tests:
- No dedicated `/clubs` page test found in `src/app/(app)/clubs`.
- Related services/hooks have tests elsewhere, but not this page contract.

E2E status:
- No deterministic `/clubs` interaction proof found in this slice.

Demo status:
- demo-yellow.

Decision:
- Do not refactor immediately. First fix candidate is a small Page test covering loading/error/empty/follow/activate basics. Later, extract `useClubsDiscoveryData` if page-local ownership causes drift.

---

## Contract: /club/[slug]

Route:
- `/club/[slug]`
- Entry/server metadata: `src/app/(app)/club/[slug]/page.tsx`
- Container: `src/app/(app)/club/[slug]/ClubContent.tsx`
- Data/actions: `src/components/club/hooks/useClubData.ts`, `useClubActions.ts`

Primary user job:
- Understand a club: identity, squad, next match/results, club events, membership, community/research, fan rank and collection progress.
- Public visitor: see why the club page matters and be invited into BeScout.
- Authenticated fan: follow, inspect players, join club-specific activity, manage membership/fan progression.

Demo relevance:
- P0/P1. Step 8 of the demo path: club context explains why BeScout matters to clubs/fans.

Auth / Geo / Compliance gates:
- Public unauthenticated view exists via `PublicClubView`.
- Authenticated view is rich, no hard `GeoGate` needed for general club content.
- Admin link only appears when `club.is_admin` is true.
- Public metadata description currently says: `Spieler, Fantasy, Trading. Werde Fan!` This is public/product copy and conflicts with `current-product-truth.md` §4 guidance to avoid investment/cash-out style language. “Trading” is not as severe as ROI/profit, but it is the wrong public positioning for club pages.

Primary data sources:
- `page.tsx` server metadata uses `supabaseAdmin` to read club meta.
- `useClubData({ slug, userId, filters })` owns club, players, holdings, IPOS, events, fixtures, news/research, fan ranking, prestige and derived stats.
- `useClubActions` owns follow state/loading and handler.
- Additional hooks: `useFollowedClubs`, `useClubStanding`, `useLeagueActiveGameweek`, `useEvents`, `useEventPlayerPickRates`.

Primary mutations:
- Follow/unfollow via `useClubActions.handleFollow`.
- Membership subscribe callback invalidates `qk.clubs.subscription`.
- UI-only tab/filter/view persistence via `localStorage` for squad view.

Query/cache ownership:
- Club and player data through `useClubData` query hooks.
- Follow state/action through `useClubActions`.
- Standing/pick-rate/event queries are additional feature hooks.
- Query invalidation on error retry targets `qk.clubs.bySlug(slug, userId)` and `qk.players.byClub(clubId)`.

Main components:
- Hero/stats: `ClubHero`, `ClubStatsBar`, `ClubStandingCard`, `FanRankBadge`, `FanRankOverview`.
- Overview sections: `ActiveOffersSection`, `ClubFixturesStrip`, `SquadPreviewSection`, `MostOwnedSection`, `MitmachenSection`, `ClubEventsSection`, `MembershipSection`, `RecentActivitySection`, `FeatureShowcase`, news/research cards, `LastResultsCard`.
- Tabs: overview, players, fixtures; `SpielplanTab`, player grid/list via `PlayerDisplay`.
- Public: `PublicClubView`.

Loading states:
- `authLoading || loading` -> `ClubSkeleton`.
- Sponsor dynamic skeletons use fixed height.

Empty states:
- `notFound` -> explicit not-found panel with back home.
- Player tab shows `noPlayersInCategory` when filters yield no players.
- Feature showcase appears when club has empty/limited sections.

Error states:
- `dataError || !club` -> `ErrorState` with targeted invalidation retry.

Mobile state:
- `max-w-[1200px]`, followed-club pills horizontal scroll, cards/grid collapse, tabbed player display and fixture tab.

Source-of-truth owner:
- `useClubData`/`useClubActions` are the right owner for club detail. The page is still a large orchestrator, but the data boundary is clear.

Bridge/debt:
- Public metadata “Trading” copy should be replaced.
- The authenticated overview has many modules competing for attention; for demo-green the page needs a clearer top story: “why this club matters now”.
- `ClubContent.tsx` remains very large (~647 lines) even after hook extraction. Not urgent, but it increases future regression risk.
- Some warnings in existing tests (`act(...)`) indicate asynchronous localStorage/effect updates are not fully stabilized in test harness; tests pass but warnings reduce confidence.

Tests:
- `ClubContent.test.tsx`: 12.
- `useClubData.test.ts`: 27.
- `useClubActions.test.ts`: 9.
- `MembershipSection.test.tsx`: 5.
- `ClubSkeleton.test.tsx`: 3.
- Focused run in this slice: ClubContent passed 12/12, with repeated act warnings.

E2E status:
- No deterministic `/club/[slug]` journey proof found in this slice; likely broader smoke coverage exists but not page-contract-level data assertions.

Demo status:
- demo-yellow.

Decision:
- First fix public metadata copy. Then add a small narrative/above-the-fold audit or test before larger component decomposition.

---

## Findings / follow-up candidates

### F-1 — P1 — Public club metadata says “Trading”

File:
- `src/app/(app)/club/[slug]/page.tsx`

Current:
- `description = "${club.name} auf BeScout: Spieler, Fantasy, Trading. Werde Fan!"`

Why it matters:
- `current-product-truth.md` explicitly says public/product UI copy should avoid investment/cash-out/financial framing. Club page metadata is public product copy.

Suggested slice:
- Replace with compliance-safe fan/club language, e.g. “Scout Cards, Fantasy und Fan-Wissen” or similar i18n-safe phrasing.

### F-2 — P1 — `/clubs` lacks a dedicated Page Contract test

File:
- `src/app/(app)/clubs/page.tsx`

Why it matters:
- Discovery/follow/activate is demo-path important and currently page-local. A lightweight page test would lock loading/error/empty/follow/activate behavior.

Suggested slice:
- Add `src/app/(app)/clubs/__tests__/ClubsDiscoveryPage.test.tsx` with service/hook mocks.

### F-3 — P2 — Fantasy unauth state is implicit

File:
- `src/app/(app)/fantasy/FantasyContent.tsx`

Why it matters:
- Main tab content uses `&& user`; if app shell ever lets unauth through, the page can render header/disclaimer/nav but no primary body. Product-wise, that should be explicit.

Suggested slice:
- Add test for unauth behavior and decide whether page should render sign-in CTA or rely strictly on app AuthGuard.

### F-4 — P2 — Club detail has too many competing overview modules

File:
- `src/app/(app)/club/[slug]/ClubContent.tsx`

Why it matters:
- For demos, one clear above-the-fold club story should lead. Current overview is rich but can feel like a module inventory.

Suggested slice:
- Narrative pass: define one “club now” story selector (next match + active offer + fan rank/membership if relevant) before refactoring UI.

---

## Verified command evidence

GeoGate:

```text
src/app/(app)/fantasy/page.tsx:4:import { GeoGate } from '@/components/geo/GeoGate';
src/app/(app)/fantasy/page.tsx:55:    <GeoGate feature="free_fantasy">
```

Direct Supabase / admin client in S3 scope:

```text
src/app/(app)/club/[slug]/page.tsx        # server metadata only, supabaseAdmin
src/features/fantasy/services/*          # service/query/mutation layer
src/features/fantasy/hooks/useLiveFixtures.ts
```

No native confirm/alert in S3 scope:

```text
<no matches>
```

No placeholder/skip in S3 scope:

```text
<no matches>
```

Focused verification:

```text
FantasyContent.test.tsx: 6 passed
ClubContent.test.tsx: 12 passed
Total focused page tests: 18 passed
```

Test count evidence:

```text
src/app/(app)/club/[slug]/__tests__/ClubContent.test.tsx 12
src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx 6
src/components/club/__tests__/ClubSkeleton.test.tsx 3
src/components/club/hooks/__tests__/useClubActions.test.ts 9
src/components/club/hooks/__tests__/useClubData.test.ts 27
src/components/club/sections/__tests__/MembershipSection.test.tsx 5
src/features/fantasy/hooks/__tests__/useEventActions.test.ts 25
src/features/fantasy/hooks/__tests__/useLiveFixtures.test.ts 6
src/features/fantasy/lib/__tests__/fixtureLive.test.ts 5
src/features/fantasy/mappers/__tests__/holdingMapper.test.ts 4
src/features/fantasy/services/__tests__/fixtures.test.ts 52
src/features/fantasy/services/__tests__/lineups.test.ts 31
src/features/fantasy/services/__tests__/predictions.test.ts 34
src/features/fantasy/services/wildcards.test.ts 6
src/features/fantasy/store/__tests__/lineupStore.test.ts 10
```
