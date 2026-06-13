# Page Contract Audit — / (Home) + /manager

Date: 2026-06-13
Slice: 289 / S2 Stabilization
Status: READ-ONLY AUDIT / NO CODE CHANGES
Worker: Claude Code (read-only inspection of source/tests/e2e)
Inputs: `memory/current-product-truth.md`, `worklog/audits/2026-06-12/stabilization-master-audit.md`, Slice 288 audit (`page-contract-market-player.md`)

---

## Executive Summary

Both pages have real architecture behind them. They are not mock pages:

- no direct Supabase client imports in Home (`src/components/home`, `src/app/(app)/hooks`, `src/app/(app)/page.tsx`) or Manager (`src/features/manager`, `src/app/(app)/manager`), verified by grep;
- money/credit paths go through services/RPC/mutation hooks (`openMysteryBox`, `useTradeActions`);
- tests are meaningful in scope: no `expect(true).toBe(true)`, no `it.skip`/`test.skip`/`describe.skip` found under Home/Manager scope;
- Home carries page-level `TradingDisclaimer` + founding-pass disclaimer.

The headline cross-page risk for S2 is **portfolio-value Source-of-Truth divergence**: Home and Manager compute the same user's holdings value through two different floor-price chains. This is the concrete instance of Slice 288 F-3 (Holdings Source-of-Truth split) that the master audit flagged as the S2 priority ("Market vs Manager Werte/P&L konsistent").

Status:

| Page | Status | Reason |
|---|---|---|
| `/` Home | GREEN with YELLOW caveat | Strong container/hook/query layering, no direct Supabase, disclaimers present, rich tests (useHomeData 39 + 10 component test files). Caveat: portfolio value uses scalar `floor_price` while Manager uses live-listings floor → values can diverge; spotlight multi-slot suppression logic is complex. |
| `/manager` | YELLOW | Good architecture + hard auth gate + shared Market cache, no direct Supabase. But: no GeoGate around Kader trading CTAs while `/market` gates `dpc_trading`; no page-level `TradingDisclaimer`; portfolio value diverges from Home; tests are thin relative to the squad/lineup surface. |

---

## Contract: / (Home)

Route:
- `/`
- File: `src/app/(app)/page.tsx` (525 lines, client component)
- Data hook: `src/app/(app)/hooks/useHomeData.ts`

Primary user job:
- Orient the user on what matters now: login streak, action-required items (lineup/captain/event lock), portfolio snapshot, market pulse, next event, active IPO, daily mystery box, followed clubs.
- New users: understand BeScout (intro card), onboarding checklist, welcome bonus.

Demo relevance:
- P0. It is step 2 of the demo path (Welcome/Login -> Home -> Market).

Auth / Geo / Compliance gates:
- No hard auth gate: the page renders for anonymous users and adapts via `uid` (`showQuickActions = !!uid`, `isNewUser = holdings.length === 0`).
- No `GeoGate` anywhere in Home scope (grep: `<no matches>`).
- Trading CTAs are mostly links into `/market` (which is GeoGated). BUT:
  - the Active-IPO sidebar card links to `/player/${id}`, which per Slice 288 F-1 has no GeoGate;
  - the Mystery Box modal performs a credit-spend action (`openMysteryBox`) directly on Home with no GeoGate (gamification credits, not `dpc_trading`).
- Compliance: page-level `TradingDisclaimer variant="card"` at bottom; `legal.foundingPassDisclaimer` under the founding upsell. No hardcoded German `addToast` strings in scope (i18n clean).

Primary data sources (all via `useHomeData`):
- `useHomeDashboard(uid)` -> `get_home_dashboard_v1` RPC (holdings + user_stats + tickets + highest_pass), primes individual caches;
- `useEvents`, `useTrendingPlayers(5)`, `useActiveIpos`, `useGlobalMovers(5)`, `usePlayersByIds(miniFetchIds)`;
- `useLoginStreak(uid)`, `useChallengeHistory`, `useHasFreeBoxToday`, `useWildcardBalance`, `useLineupWithPlayers(scopedActiveEvent?.id, uid)`;
- `usePlayerPriceChanges7d(playerIds, 3)`, `useMostWatchedPlayers(uid, 10)`, `useFollowedClubs`, `useLeagueScope`.

Primary mutations:
- `handleOpenMysteryBox` -> `openMysteryBox(free, newIdempotencyKey('mb.open'))` (idempotent, invalidates tickets/home-dashboard/cosmetics/equipment/wallet by reward type);
- login-streak side effects (toasts + localStorage mirror) — one-shot on fresh server response.
- No buy/sell trading mutations live on Home itself.

Query keys / cache ownership:
- `qk.homeDashboard.byUser(uid)` owns per-user home aggregation;
- `['players','byIds']`, `['players','globalMovers']`, `qk.trending.top(5)`, `qk.ipos.active`, `qk.events.all` own discovery data;
- `qk.tickets.balance(uid)`, `qk.mysteryBox.freeBoxToday(uid)`, `qk.watchlist.mostWatched(10)`, `qk.wallet.all` for gamification/wallet;
- error retry refetches the narrow set (Review F-09 lesson: enge `byIds`/`globalMovers` prefixes, never `['players']` root, to avoid re-pulling the 4.2 MB list Slice 282 removed).

Main components:
- `HomeStoryHeader` (hero: streak, portfolio, P&L, heroMode/manager-block pills);
- `ActionRequiredStack` (lineup/captain/lock/streak-risk);
- `ScoutCardStats` (squad breakdown, self-nulls when empty);
- `HomeSpotlight` (multi-slot cascade: liveScore/mysteryBox/ipo/topMover/trending, max 2 slots);
- `QuickActionPills`, `MarktPuls` (3-tab discovery), `LastGameweekWidget`;
- sidebar: Next-Event card, Active-IPO card, Mystery-Box card + modal, `FollowingFeedRail`, My-Clubs, `SponsorBanner`;
- dynamic (ssr:false, fixed-height skeletons): `NewUserTip`, `OnboardingChecklist`, `MissionHintList`, `WelcomeBonusModal`, `BeScoutIntroCard`, `MysteryBoxModal`.

Loading states:
- `homeLoading` skeleton for Spotlight (combined: ipos/globalMovers/trending + byIds-when-requested; Review F-03 waterfall guard);
- `HomeStoryHeader loading` prop; dynamic-import loading skeletons use fixed heights (Slice 116 CLS-fix).

Empty states:
- new-user path: `BeScoutIntroCard`, `OnboardingChecklist`, `WelcomeBonusModal`/`NewUserTip`;
- `ScoutCardStats` self-renders null when portfolio empty (new users never see an empty card);
- My-Clubs section only renders when `followedClubs.length > 0`.

Error states:
- `homeError` -> `ErrorState` with `handleRetry` refetching all home queries;
- `homeError` is deliberately narrow: `miniPlayersError && miniPlayers.length === 0 && miniFetchIds.length > 0` (Slice 282 F-02 lesson — dekorative movers/byIds errors degrade gracefully, not page-fatal).

Mobile state:
- single-column natural DOM order on mobile; `lg:grid lg:grid-cols-[1fr_340px]` 2-column on desktop with sticky sidebar; horizontal-scroll club strip. Detailed visual confidence belongs to a later visual pass.

Source-of-truth owner:
- services/RPC/query layer. No direct Supabase in Home scope.

Bridge/debt:
- **Portfolio value uses the scalar `floor_price` column**: `portfolioValue = holdings.reduce((s,h) => s + h.qty * h.floor)`, `h.floor = centsToBsd(h.player.floor_price)` from `get_home_dashboard_v1`. This differs from Manager (see F-1).
- Multi-slot spotlight suppression: `page.tsx` sidebar sections gate on `spotlightSlots.primary/secondary` for `ipo`/`mysteryBox` and on `spotlightType !== 'event'` for Next-Event (Slice 266/278 cross-section-coupling class). Correct today but complex.
- `spotlightType` is a legacy mapping derived from `spotlightSlots.primary` for the sidebar.

Tests:
- `useHomeData.test.ts`: 39;
- component tests: `ActionRequiredStack` 22, `helpers` 21, `ManagerBlock` 20, `MarktPuls` 10, `HomeSpotlight` 8, `TopMoversStrip` 7, `OnboardingChecklist` 5, `OwnTopMoversStrip` 3, `TrendingPlayersStrip` 3, `HomeSkeleton` 2;
- no placeholder/skip in scope.

E2E status:
- `beta-smoke.spec.ts` step 1: `/` (unauth) loads with status < 500 and non-empty body;
- `synthetic-users.spec.ts` walks `/`. Render-confidence, not deterministic data-confidence; no test asserts Home portfolio value equals Manager value.

Demo status:
- GREEN with YELLOW caveat.

Decision:
- Keep architecture. Do not refactor immediately. Resolve portfolio-floor parity (F-1) before claiming the Home->Manager segment demo-green.

---

## Contract: /manager

Route:
- `/manager`
- Entry: `src/app/(app)/manager/page.tsx` (dynamic, ssr:false, `ManagerSkeleton`)
- Container: `src/features/manager/components/ManagerContent.tsx` (`ManagerInner` inside `Suspense`)
- Data hook: `src/features/manager/hooks/useManagerData.ts`

Primary user job:
- Manage the squad: set lineup (Aufstellen), review/sell the Kader (squad + sell/cancel orders), review history (Historie).
- See squad count, health (fit/doubtful/injured), next event, squad value.

Demo relevance:
- P0. Step 6 of the demo path; must agree with Market/Portfolio truth.

Auth / Geo / Compliance gates:
- Hard auth gate: `if (!user) return notSignedIn` (and `userLoading` spinner first). Good.
- No `GeoGate` anywhere in Manager scope (grep: `<no matches>`), yet the Kader tab receives `onSell={handleSell}` and `onCancelOrder={handleCancelOrder}` from `useTradeActions` — i.e. trading CTAs are reachable. This is the same class as Slice 288 F-1 (GeoGate asymmetry), now extended to `/manager`.
- No page-level `TradingDisclaimer` and no `FantasyDisclaimer` in Manager scope. The sell action's disclaimer + `preventClose` are owned by the shared `SellModalCore` (modal-level), so the disclaimer is present at the moment of selling, but the page itself lacks the page-level compliance surface that Home and Market carry.
- No hardcoded German `addToast` strings in scope (i18n clean).

Primary data sources (via `useManagerData(user?.id)`):
- `useMarketData(userId)` (shared cache with Market) -> `useMarketUserDashboard` (`get_market_dashboard`) + portfolio `usePlayersByIds` enriched via `enrichPlayersWithData`;
- `useActiveIpos`, `useIncomingOffers(userId)`;
- `useRecentMinutes`, `useRecentScores`, `useNextFixtures`, `usePlayerEventUsage(userId)`;
- `useUserEquipment`, `useEquipmentDefinitions`, `useEquipmentRanks`;
- `useOpenEvents()` (next-event pill in `PageHeader`).

Primary mutations:
- `handleSell`, `handleCancelOrder` via `useTradeActions` (shared with Market);
- lineup save inside `AufstellenTab`; equipment plan changes.

Query keys / cache ownership:
- shares Market ownership: `qk.marketDashboard.byUser(userId)`, `['players','byIds']`;
- manager-specific: recent-minutes/scores/fixtures/event-usage + equipment query keys;
- `useManagerStore` (zustand) owns UI state: `activeTab` (URL `?tab=` is source of truth), `selectedEventId`, kader detail player id.

Main components:
- `ManagerContent` (Suspense + dynamic) -> `ManagerInner`;
- `PageHeader` (title + squad/health/next-event pills);
- `TabBar` + `TabPanel`;
- dynamic tabs (ssr:false, skeleton loaders): `AufstellenTab`, `KaderTab`, `HistorieTab`;
- `PlayerDetailModal` (opens from Kader row), `MissionHintList`.

Loading states:
- page-level `ManagerSkeleton` (dynamic import);
- `userLoading` -> `Loader2`; `Suspense` fallback `Loader2`;
- `playersLoading` -> `PageHeader` pill skeletons; tab dynamic-import skeletons (SkeletonCard rows).

Empty states:
- `notSignedIn` text; `noEvent` placeholder pill; squad-empty states inside tabs.

Error states:
- `playersError` -> `ErrorState` with narrow retry: `['players','byIds']` + `qk.marketDashboard.byUser(user.id)` (Slice 283 F-09 lesson, avoid `qk.players.all` root).

Mobile state:
- `max-w-[1100px] px-4 py-6`; `TabBar` scrollable; `PageHeader` pills `overflow-x-auto scrollbar-hide` with `min-h-[44px]` touch targets.

Source-of-truth owner:
- services/query layer; no direct Supabase in Manager scope. Manager intentionally rides the Market hook (`useMarketData`) for the shared portfolio cache.

Bridge/debt:
- **Portfolio value uses `computePlayerFloor`** (live-listings `Math.min` -> `prices.floor` -> 0) via `getFloor`/`floorMap`. This diverges from Home's scalar `floor_price` (see F-1).
- Manager correctness is coupled to Market query health (`useMarketData`) — acceptable shared-cache design but a single failure surface (already noted in Slice 283).
- No GeoGate; no page-level disclaimer.

Tests:
- `KaderSellModal.test.tsx`: 13; `historieHelpers.test.ts`: 19; `eventHelpers.test.ts`: 7;
- no placeholder/skip in scope. Lineup save / auto-sub / scoring logic is tested in the fantasy feature, not at manager scope — manager-scope behavioral coverage is thin relative to the squad/lineup surface.

E2E status:
- `beta-smoke.spec.ts` step 5: `/manager` loads;
- `qa-283-network.ts`, `qa-284c-verify.ts`, `qa-equipment-inventory.ts`, `synthetic-users.spec.ts`, `qa-284-stab-walk.ts` (`?tab=historie` + kader). Render/network confidence, not deterministic value-parity.

Demo status:
- YELLOW.

Decision:
- Keep architecture. First fix candidates are small/decision-scoped, not a refactor: portfolio-floor parity (F-1), GeoGate decision (F-2), page-level disclaimer (F-3).

---

## Verified command evidence

GeoGate in Home scope (`page.tsx`, `hooks`, `components/home`):

```text
<no matches>
```

GeoGate in Manager scope (`app/(app)/manager`, `features/manager`):

```text
<no matches>
```

Direct Supabase client imports (Home scope):

```text
<no matches>
```

Direct Supabase client imports (Manager scope):

```text
<no matches>
```

Test counts:

```text
useHomeData.test.ts                 39
home/ActionRequiredStack.test.tsx   22
home/helpers.test.tsx               21
home/ManagerBlock.test.tsx          20
home/MarktPuls.test.tsx             10
home/HomeSpotlight.test.tsx          8
home/TopMoversStrip.test.tsx         7
home/OnboardingChecklist.test.tsx    5
home/OwnTopMoversStrip.test.tsx      3
home/TrendingPlayersStrip.test.tsx   3
home/HomeSkeleton.test.tsx           2
manager/historie/historieHelpers.test.ts   19
manager/kader/KaderSellModal.test.tsx       13
manager/queries/eventHelpers.test.ts         7
```

Placeholder/skip in Home/Manager scope:

```text
<no matches>
```

Native confirm/alert in Home/Manager scope:

```text
<no matches>
```

Portfolio-floor divergence (the two chains):

```text
Home  (useHomeData.ts:175):  portfolioValue = holdings.reduce(s + h.qty * h.floor)
                             h.floor = centsToBsd(h.player.floor_price)   // scalar column, get_home_dashboard_v1
Manager (useMarketData.ts):  getFloor(p) = computePlayerFloor(p)
                             computePlayerFloor = Math.min(...listings) ?? prices.floor ?? 0   // live listings
```

---

## Findings

### F-1 — Portfolio-value Source-of-Truth divergence (Home vs Manager)

Severity: P1

Finding:
- Home computes portfolio value from the scalar `floor_price` column returned by `get_home_dashboard_v1`.
- Manager (via `useMarketData` -> `computePlayerFloor`) computes value from the live-listings minimum (`Math.min(...listings)`), falling back to `prices.floor`.
- For the same holdings, when a player's live listings differ from the cached `floor_price` column, Home and Manager show different portfolio totals.

Risk:
- Breaks demo-path coherence exactly where the master audit demanded it (S2: "Market vs Manager Werte/P&L konsistent"). A founder/customer can open Home and Manager side by side and see two different squad values.
- This is the concrete materialization of Slice 288 F-3 (Holdings Source-of-Truth split).

Recommended next slice:
- Decision/Fix slice: pick ONE canonical floor source for portfolio value across Home + Manager + Market (either both use `computePlayerFloor`, or both read the scalar column), then verify with a cross-page parity check. Highest demo-coherence value.

---

### F-2 — GeoGate asymmetry extends to /manager

Severity: P1

Finding:
- `/market` is gated by `GeoGate feature="dpc_trading"`.
- `/manager` has no GeoGate, yet the Kader tab exposes `onSell`/`onCancelOrder` trading CTAs.
- Same class as Slice 288 F-1 (`/player/[id]` had no GeoGate).

Risk:
- A user restricted from trading can still see Manager Kader sell/cancel CTAs even though `/market` blocks trading. Server-side RPC defenses may still reject the action, but the UI is inconsistent and compliance-unfriendly.

Recommended next slice:
- Fold into the single F-1(288) CEO/Anil GeoGate decision: decide whether to gate the Kader trading surfaces (whole tab vs. CTAs) the same way `/player/[id]` is decided. One decision should cover `/player/[id]` and `/manager`.

---

### F-3 — Manager missing page-level compliance disclaimer

Severity: P2

Finding:
- Home and Market carry a page-level `TradingDisclaimer`. `/manager` does not.
- The sell-action disclaimer + `preventClose` are owned by the shared `SellModalCore` (modal-level), so a disclaimer appears at sell time, but the page itself has no compliance surface; `AufstellenTab` (fantasy lineup) has no `FantasyDisclaimer` at manager scope.

Risk:
- `business.md` requires "Disclaimers auf JEDER Seite mit $SCOUT/DPC" and `FantasyDisclaimer` on each page/modal with rewards. Manager surfaces both trading and fantasy-lineup actions without a page-level disclaimer.

Recommended next slice:
- Small compliance slice: add page-level `TradingDisclaimer` to `/manager` and confirm `FantasyDisclaimer` coverage for the Aufstellen lineup surface. Verify against `business.md` before deciding placement.

---

### F-4 — Home portfolio-snapshot + spotlight complexity, no cross-page parity test

Severity: P2

Finding:
- `useHomeData` orchestrates ~15 queries plus the multi-slot spotlight suppression logic (Slice 266/278). It is well tested (39 tests), but no test asserts that Home's `portfolioValue` matches Manager's squad value for identical holdings.

Risk:
- F-1-class regressions (floor-source drift, suppression-gate gaps) can slip through because each page is tested in isolation.

Recommended next slice:
- S5 Test Confidence: add a contract test asserting portfolio-value parity across the Home/Manager/Market floor chain once F-1 is unified.

---

### F-5 — E2E for Home/Manager is render-oriented, not deterministic-data-oriented

Severity: P3

Finding:
- `beta-smoke` only asserts that `/` and `/manager` load; synthetic/qa walks assert navigation/network, not deterministic business values.

Risk:
- Tests pass while Home and Manager show inconsistent or stale portfolio data.

Recommended next slice:
- S5 later: deterministic seed user + assertion that Home and Manager render the same squad value.

---

### F-6 — Manager coupled to Market hook (single failure surface)

Severity: P3

Finding:
- `useManagerData` builds entirely on `useMarketData`. Manager correctness depends on Market query/cache health.

Risk:
- A Market-side query regression silently degrades Manager. Acceptable shared-cache design, but worth an explicit boundary note (ties into Slice 288 F-3 / the S4 Source-of-Truth boundary work).

Recommended next slice:
- S4 Source-of-Truth Boundaries: document the Market->Manager dependency as an intentional shared-cache boundary.

---

## Proposed follow-up sequence

1. Decision/Fix Slice: F-1 portfolio-floor parity (Home + Manager + Market one canonical floor). Highest demo-coherence value.
2. Decision Slice: F-2 GeoGate trading surfaces — single CEO/Anil decision covering `/player/[id]` (288 F-1) + `/manager`.
3. Compliance Slice: F-3 page-level `TradingDisclaimer` on `/manager` + `FantasyDisclaimer` on Aufstellen.
4. S3 Audit: `/fantasy` + `/clubs` + `/club/[slug]` page contracts.
5. S4/S5 later: Source-of-Truth boundary note (F-6) + cross-page parity + deterministic e2e (F-4/F-5).
