# Operation Beta Ready — Phase 3: Performance Audit

**Date:** 2026-04-14
**Scope:** Bundle-Size, React-Query staleTime, Slow-RPCs, Query-Waterfalls, Images, Re-Renders
**Mode:** READ-ONLY — no code changes
**Verdict:** **AMBER (Beta-launchable with known caveats; CEO Phase-4 P95 gate NOT MET on 4 RPCs)**

---

## 1. Bundle-Size Audit

### Build Status
- `npx next build` exit code 0 (success)
- 38 routes built statically
- Build duration ~3 minutes
- Lint warnings: 90+ warnings (no errors), dominated by `no-img-element` and missing useCallback deps

### Top-10 Routes (sorted by First Load JS, largest first)

| Route | Page Size | First Load JS | Beta Target (<300KB) | Status |
|-------|-----------|---------------|----------------------|--------|
| `/player/[id]` | 96.6 kB | **355 kB** | over by 55 kB | RED |
| `/club/[slug]/admin` | 40 kB | **310 kB** | over by 10 kB | AMBER |
| `/bescout-admin` | 42 kB | **299 kB** | within 1 kB of cap | YELLOW |
| `/community` | 18.4 kB | 288 kB | within | OK |
| `/` (Home) | 20.7 kB | 284 kB | within | OK |
| `/club/[slug]` | 21.5 kB | 283 kB | within | OK |
| `/market` | 17.9 kB | 267 kB | within | OK |
| `/missions` | 2.97 kB | 262 kB | within | OK |
| `/airdrop` | 11.5 kB | 256 kB | within | OK |
| `/profile/[handle]` | 1.18 kB | 246 kB | within | OK |

### Largest Static Chunks (.next/static/chunks/)

| Chunk | Size | Likely Content |
|-------|------|----------------|
| `beafed65-*.js` | 241 KB | likely large vendor (recharts? — used in PriceChart, ScoreRoad) |
| `3907-*.js` | 209 KB | likely shared util chunk |
| `2014.*.js` | 186 KB | likely Supabase client + Realtime |
| `460dc3e0-*.js` | 173 KB | shared chunk |
| `app/(app)/club/[slug]/admin/page` | 170 KB | Admin tabs (heavy) |
| `app/(app)/bescout-admin/page` | 169 KB | Platform Admin (heavy) |
| `app/(app)/player/[id]/page` | 166 KB | Player Detail (heavy) |
| `framework-*.js` | 140 KB | React + Next |
| `9045-*.js` | 125 KB | shared (in First Load JS shared) |
| `main-*.js` | 118 KB | Next runtime |
| `polyfills-*.js` | 113 KB | browser polyfills |

### Shared First-Load JS
- 89.4 kB shared by all routes (well within budget)
- Key shared chunks: 460dc3e0 (53.6 kB) + 9045 (31.9 kB)

### Bundle-Size Findings

**MUST-DO (Beta-Blocker):**
1. **`/player/[id]` 355 kB exceeds 300 kB Beta cap by 18%.** Page-bundle is 96.6 kB (largest of all pages). Likely culprits: PriceChart (recharts heavy), TradingTab + PerformanceTab + CommunityTab + 4 detail subcomponents loaded eagerly. **Fix:** lazy-load tabs via `dynamic(() => import(...))`. PriceChart is already memo'd but probably ships full recharts. Audit `src/components/player/detail/*.tsx` for eager imports of heavy modules.

**NICE-TO-HAVE:**
2. `/club/[slug]/admin` and `/bescout-admin` at 310/299 kB are admin-only routes — acceptable for Beta if admin user count <10. Tag for Phase 4 cleanup.
3. `polyfills` 113 kB suggests targeting older browsers via browserslist. Modernize to drop ~40 kB if iPhone target ≥ iOS 14.
4. `optimizePackageImports` is set for lucide-react, supabase, posthog, react-query, next-intl, zustand — verify in production analyzer that tree-shaking actually fires (Next 14 caveat).

---

## 2. React-Query staleTime Audit

### Default Config (`src/lib/queryClient.ts`)
```ts
staleTime: 2 * 60 * 1000,    // 2 min default
gcTime: 10 * 60 * 1000,       // 10 min GC
retry: 2, retryDelay: exp backoff
refetchOnWindowFocus: false
placeholderData: keepPreviousData
```
**OK** — sensible defaults, exceeds rules/performance.md minimum (30s).

### staleTime: 0 — Anti-Pattern Audit
- **Total occurrences:** 1 only (mysteryBox.ts:57)
- **Status:** EXPLICIT-APPROVED per J5F-05 (daily free-box cap race-condition guard, JSDoc documented). Pass.
- **Verdict:** No violations.

### staleTime by Domain (representative)
| Domain | staleTime | Assessment |
|--------|-----------|------------|
| Static config (economy, equipment defs, ranks) | 5 min | OK |
| Holdings (RLS-sensitive money) | 30s | OK (was 0 before — fixed) |
| Mission progress, missions list | 5 min | OK |
| Mystery Box definitions | 5 min | OK |
| User equipment inventory | 30s | OK (cache-invalidated on equip/unequip) |
| Mystery Box state (free-box cap) | 0 | EXCEPTION-OK |
| Manager history | Infinity | OK (immutable past data) |
| Live scoring (event running) | 15-30s | OK + refetchInterval |
| Fixture deadlines (live) | 30s | OK + refetchInterval |
| Posts feed, leaderboard, sponsors | 2-5-10 min | OK |
| Player detail (gw scores, timeline, PBT) | 5 min | OK |
| Sell orders, open bids | 1 min | OK |
| Notifications | 1 min | OK |

### staleTime Findings

**No MUST-DO violations.** All `staleTime: 0` accounted for. Static config (5min) and user data (30s-2min) tiers properly applied.

**NICE-TO-HAVE:**
1. **Equipment Definitions (5min)** — these are admin-managed, near-immutable static config. Could push to 1 hour with `staleTime: Infinity` + manual `invalidateQueries` from admin tooling. Saves ~2 RPC/hour/user.
2. **Sponsors (10min)** — already long, fine.
3. **`useMissionHints` 30s** — acceptable but if mission completion mutates and invalidates correctly (need to verify), could be 2 min.

---

## 3. Slow-RPC Audit (pg_stat_statements LIVE)

### Money-Critical RPCs — Beta Target P95 < 200ms (CEO Q3)

| RPC | Calls | Mean (ms) | Max (ms) | P95 est (ms) | Beta Gate (<200ms) | Status |
|-----|-------|-----------|----------|--------------|---------------------|--------|
| **buy_from_ipo** | 741 | **430** | **6063** | **1998** | NO — 10x over | RED |
| **buy_from_order** (50 calls) | 50 | 394 | 3012 | 1726 | NO — 8.6x over | RED |
| **buy_from_order** (58 calls) | 58 | 340 | 5232 | 1712 | NO — 8.5x over | RED |
| **place_sell_order** | 1122 | **222** | **5932** | **1521** | NO — 7.6x over | RED |
| score_event (Fantasy) | 14 | 203 | 649 | 527 | NO | AMBER (low traffic) |
| save_lineup (Fantasy) | 20 | 86 | 242 | 206 | borderline | YELLOW |
| cancel_order | 108 | 48 | 2942 | 548 | mean OK, p95 NO | AMBER |
| open_mystery_box | 18 | 47 | 155 | 117 | OK | GREEN |
| buy_player_dpc (Smart Buy) | 733 | **4.25** | 449 | 37 | OK | GREEN |
| place_buy_order | 297 | 1.24 | 21 | 4.6 | OK | GREEN |

### Slow-RPC Findings

**CRITICAL (Beta-Blocker):**
1. **buy_from_ipo @ 430ms mean / ~2s P95 / 6s max.** Most-called money RPC (741 calls). Function body is 7127 bytes. Likely culprits:
   - Multi-table writes (ipos, ipo_purchases, holdings, transactions, wallets, treasury)
   - Possibly missing index on `ipo_purchases.user_id+ipo_id`
   - Lock contention on `ipos.sold` UPDATE under load (single row hot-spot during pop launches)
   - Recommend: EXPLAIN ANALYZE under load, consider splitting hot-row counter to materialized view or atomic INCREMENT
2. **place_sell_order @ 222ms mean / 5.9s max.** 1,122 calls. Likely cause: index check on holding rows + INSERT with multi-table ack. Audit for `SELECT ... FOR UPDATE` waits.
3. **buy_from_order @ 340-394ms mean / 5.2s max.** Two distinct stat entries (different signatures). Same family as buy_from_ipo. P95 ~1.7s.

**Note:** `buy_player_dpc` (Smart Buy, the recommended new path) is FAST (4ms mean). The slow RPCs are the older `buy_from_*` family. **Recommendation:** investigate whether `buy_from_ipo` and `buy_from_order` can be migrated to the same lean structure as `buy_player_dpc`, or whether they have heavier business-logic that justifies the cost (price-volume guard, treasury splits, etc.).

**HIGH (Beta-Caveat):**
4. **`posts` INSERT @ 1123ms mean / 5.9s max** (105 calls). Posts INSERT triggers heavy side-effects (probably notification fan-out, follower triggers). Consider deferring fan-out to background job.
5. **`follow_user` @ 218ms mean / 4.2s max** (93 calls). Likely triggers cascade of activity_log + notifications + mission progress.

**INFO (Cron — internal load, no user-facing impact):**
- `daily_price_volume_reset`: 1564 calls @ 121ms — cron health, OK
- `expire_pending_orders`: 1321 calls @ 82ms — cron, OK
- `cron_process_gameweek`: 63 calls @ 396ms — runs at GW boundaries only, fine

### Sequential Scan Audit
- Only 1 table flagged: **event_entries** (114 rows, 53% seq scans, 657 seq_scans / 583 idx_scans). Small table — sequential scan is actually FASTER than index for <1000 rows. Not a real issue, but if `event_entries` grows (multi-event support, longer history), add B-tree index on `(event_id, user_id)`. **NICE-TO-HAVE.**

---

## 4. Query-Waterfall Audit

### useEffect-Chains
- `useEffect.*async|useEffect.*await` — **0 matches** (zero direct sequential awaits in useEffect across src/). Excellent.

### useQueries Pattern
- `useQueries` (parallel hook) — **0 matches** (not used).
- This is acceptable because most pages only need 2-3 queries with React Query — separate hooks fire in parallel anyway. No clear waterfall except via context-provider chains.

### Provider Cascade (potential parallelism loss)
- AuthProvider loads `getAuthState` RPC FIRST (async), then conditionally falls back to 3 separate queries via `Promise.allSettled` (parallel — good).
- AuthProvider has 4 `useState` + `useMemo` value — re-renders all consumers on each user/profile change. **NICE-TO-HAVE:** split into separate contexts (User vs Profile vs Roles) to avoid cascade re-renders.

### Service-Layer Sequential Awaits
- 20 files matched `await\s+\w+\(.*\);\s*\n.*await\s+\w+\(` (sequential awaits within a function).
- Spot-check: most are legitimate (e.g., trading.ts checks balance THEN executes). Not waterfalls in user-facing query layer.

### Verdict
- **No critical waterfalls in user-facing query layer.** React Query's parallel-by-default behavior is preserved.

---

## 5. Image Audit

### `<img>` Tags (Build Lint Warnings)
- 32+ warnings flagged by `@next/next/no-img-element` across:
  - `bescout-admin/AdminSponsorsTab.tsx` (2)
  - `welcome/page.tsx` (1)
  - `onboarding/page.tsx` (1)
  - `community/CreatePostModal.tsx` (1)
  - `fantasy/event-tabs/LineupPanel.tsx` (5)
  - `fantasy/events/EventCardView.tsx` (2)
  - `fantasy/events/EventCategoryCards.tsx` (3)
  - `fantasy/spieltag/ClubLogo.tsx` (1)
  - `fantasy/spieltag/fixture-tabs/FormationTab.tsx` (5)
  - `player/detail/MatchTimeline.tsx` (1)
  - `player/detail/SponsorBanner.tsx` (1)
  - `player/detail/TradingCardFrame.tsx` (4)
  - `ui/EventScopeBadge.tsx` (2)
  - `market/portfolio/BestandView.tsx` (1)

### `next/image` Usage
- 51 occurrences across 48 files — actively used.
- `next.config.mjs` correctly configures `remotePatterns` for `*.supabase.co`, `upload.wikimedia.org`, `img.a.transfermarkt.technology`.

### Image Findings

**NICE-TO-HAVE (NOT Beta-Blocker):**
1. **32 raw `<img>` usages** lose Next/Image LCP optimization. Most are small badges/icons (club logos, country flags, sponsor banners). Player photos are mostly via `next/image` (in `PlayerPhoto`).
2. **Highest-impact fixes:** `PlayerHero` and `TradingCardFrame` use raw `<img>` for player photos — these are LCP candidates on `/player/[id]`. Migrate to `next/image` could improve LCP by 20-40%.
3. **EventCardView, FormationTab, LineupPanel** use raw `<img>` for club logos in lists — high count per page, accelerates jank. Consider migrating to `next/image` with explicit `width`/`height`.

---

## 6. Re-Render Audit

### React.memo Usage
- 28 components use React.memo — solid coverage on:
  - All player rows (PlayerRow, FantasyPlayerRow, BestandPlayerRow, KaderPlayerRow)
  - Layout (TopBar, SideNav, BottomNav, ClubSwitcher, BackgroundEffects)
  - Home widgets (TopMoversStrip, MostWatchedStrip, ScoutCardStats, LastGameweekWidget, etc.)
  - Player detail tabs (PriceChart, TradingTab, PerformanceTab, CommunityTab)
  - Trading card UI (TradingCardFrame, PlayerHero, FormDots)
  - Communality (CommunityHero, CommunitySidebar)

### useMemo / useCallback Density
- 139 calls across 30 files — mostly in feature-heavy areas (BestandView 19 calls, TransactionsPageContent 9, EquipmentSection 9, useTradeActions 8). Reasonable.

### dynamic() (Lazy Loading)
- 39 files use `dynamic()` import — moderate adoption.
- Notable use: EventDetailModal, FixtureDetailModal, profile tabs, fantasy tabs.
- **Gap:** Player Detail page (`PlayerContent.tsx`) uses dynamic for some tabs but page bundle is still 96.6 kB. Could lazy-load PriceChart (recharts heavy) and CommunityTab on-demand.

### Context Re-Render Risk
- 5 providers: AuthProvider, ClubProvider, WalletProvider, ToastProvider, TourProvider
- AuthProvider: 7 state slices in single context value → all consumers re-render on any change. Already split off `useRoles()` selector hook.
- WalletProvider: 4-state value, memo'd properly.
- **NICE-TO-HAVE:** Consider splitting AuthProvider into User+Profile+Roles to reduce cascade re-renders during async auth flow.

### useEffect Hook Lint Warnings
- 12+ exhaustive-deps warnings (missing 't', 'te', 'now', 'TERMINAL_STATUSES', 'packageCosts', 'searchParams', 'result', 'player.pos').
- These are mostly false-positives from translation hooks (`t` is stable per render in next-intl) or local helper objects. Document as known and suppress with eslint-disable comments OR refactor where obvious.

---

## Recommendations Summary

### MUST-DO Before Beta (RED)
1. **Slow money RPCs**: `buy_from_ipo`, `buy_from_order`, `place_sell_order` all have P95 well over 1.5 seconds. If the Beta launch will hit > 50 concurrent users, this WILL cause failed transactions and "double-clicks" (despite preventClose). **Action:** Backend Agent should EXPLAIN ANALYZE these RPCs under load and identify lock contention or missing indexes. Consider migrating to `buy_player_dpc` lean architecture.
2. **`/player/[id]` bundle 355 kB exceeds 300 kB cap.** **Action:** lazy-load PriceChart + CommunityTab + PerformanceTab via dynamic imports. Audit `src/components/player/detail/*` for eager-imported heavy modules (recharts).

### NICE-TO-HAVE Before Beta (AMBER)
3. **PlayerHero / TradingCardFrame** raw `<img>` → `next/image` (LCP improvement on most-visited single-player route).
4. **Posts INSERT @ 1.1s mean** — defer notification fan-out to background job (post.created webhook → edge function).
5. **`follow_user` @ 218ms** — same root cause (sync notification cascade). Defer to async.

### NICE-TO-HAVE Post-Beta (GREEN)
6. Equipment definitions `staleTime: Infinity` (admin-tooled invalidation).
7. Split AuthProvider context (User/Profile/Roles) to reduce re-render cascade.
8. Polyfills 113 kB — modernize browserslist target (drop ~40 kB).
9. Admin routes (310-299 kB) — lazy-load admin tabs (`/bescout-admin`, `/club/[slug]/admin`).
10. Migrate remaining 30+ raw `<img>` to `next/image`.
11. Suppress or fix 12+ exhaustive-deps lint warnings.

---

## Beta-Gate Performance: Verdict

**Build Success:** YES (exit code 0, 38 routes generated)

**Largest Pages:**
- `/player/[id]` 355 kB (over)
- `/club/[slug]/admin` 310 kB (over admin-only)
- `/bescout-admin` 299 kB (at-cap admin-only)

**Top Findings:**
- 4 money-critical RPCs miss CEO P95 < 200 ms gate by 7-10x (RED — likely Beta-blocker for >50 concurrent users)
- 1 page bundle (`/player/[id]`) over CEO 300 KB Beta cap by 18%
- staleTime config: ZERO violations (one approved exception only)
- Image optimization gap: 32 raw `<img>` (NICE-TO-HAVE)
- No useEffect waterfalls; no useQueries-anti-pattern; React.memo coverage solid

**Beta-Gate Performance Ready:** **NO — AMBER**
- Build clean, query layer healthy, no critical re-render or waterfall issues.
- BUT: 4 money RPCs at 200-2000 ms P95 will degrade Beta UX under realistic concurrent load (failed buys, retry storms, possible double-spend exploits if preventClose fails).
- BUT: `/player/[id]` 355 kB exceeds CEO Beta cap. Soft ship-blocker.

**Recommendation:**
- **Approve Beta launch IF** Beta is gated to <50 concurrent users (closed pilot → Sakaryaspor only, opt-in invitation).
- **Block Beta launch IF** open Beta to >50 users planned — fix 2 RPCs minimum (`buy_from_ipo`, `place_sell_order`) and `/player/[id]` bundle first.

---

## Files Referenced (READ-ONLY)
- `C:\bescout-app\next.config.mjs`
- `C:\bescout-app\src\lib\queryClient.ts`
- `C:\bescout-app\src\lib\queries\*.ts` (29 files)
- `C:\bescout-app\src\features\*\queries\*.ts`
- `C:\bescout-app\src\components\providers\AuthProvider.tsx`
- `C:\bescout-app\src\components\providers\WalletProvider.tsx`
- `C:\bescout-app\.next\static\chunks\*` (build artifacts)
- pg_stat_statements live data (project: `skzjfhvgccaeplydsunz` / beScout-App / eu-west-1)
