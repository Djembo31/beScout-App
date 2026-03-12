# Profile Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Profile page from a 13-section data dump into a 4-tab engagement surface with compressed header, mobile-first layout, and visible engagement loops.

**Architecture:** Compress the ~1200px header to ~250px, eliminate sidebar on mobile, redistribute 13 Overview sections into 4 focused tabs (Überblick/Kader/Statistiken/Aktivität), move Settings to a dedicated route, wire the existing MissionBanner component, add Activity filters.

**Tech Stack:** Next.js 14 (App Router), TypeScript strict, Tailwind (Dark Mode), React, next-intl, lucide-react

**Design Doc:** `docs/plans/2026-03-11-profile-redesign-design.md`

---

## Task 1: Update ProfileTab Type + i18n Keys

**Files:**
- Modify: `src/types/index.ts` (ProfileTab type)
- Modify: `messages/de.json` (profile section)
- Modify: `messages/tr.json` (profile section)

**Step 1: Update ProfileTab type**

In `src/types/index.ts`, find the ProfileTab type (search for `ProfileTab`) and change it:

```typescript
// BEFORE:
export type ProfileTab = 'overview' | 'portfolio' | 'activity' | 'settings';

// AFTER:
export type ProfileTab = 'overview' | 'squad' | 'stats' | 'activity';
```

**Step 2: Add new i18n keys to de.json**

In `messages/de.json`, find the `"profile"` section (~line 1374) and add these keys (keep existing keys, add new ones):

```json
"squad": "Kader",
"stats": "Statistiken",
"nextActionBuy": "Scout deinen ersten Spieler",
"nextActionMissions": "{count} Missionen offen",
"nextActionFantasy": "Event aktiv — du bist #{rank}",
"nextActionScoreRoad": "Noch {points} Punkte bis {tier}",
"portfolioPulse": "Kader-Puls",
"streakLabel": "Streak",
"recentActivity": "Letzte Aktivität",
"viewAllActivity": "Alle anzeigen",
"achievementHighlights": "Letzte Erfolge",
"viewAllAchievements": "Alle {count} Erfolge",
"filterAll": "Alle",
"filterTrades": "Trades",
"filterFantasy": "Fantasy",
"filterMissions": "Missionen",
"filterRewards": "Belohnungen",
"squadValue": "Kaderwert",
"totalRank": "Gesamtrang",
"moreBio": "Mehr anzeigen",
"lessBio": "Weniger"
```

**Step 3: Add same keys to tr.json**

```json
"squad": "Kadro",
"stats": "İstatistikler",
"nextActionBuy": "İlk oyuncunu keşfet",
"nextActionMissions": "{count} görev açık",
"nextActionFantasy": "Etkinlik aktif — #{rank}. sıradasın",
"nextActionScoreRoad": "{tier} için {points} puan daha",
"portfolioPulse": "Kadro Nabzı",
"streakLabel": "Seri",
"recentActivity": "Son Aktivite",
"viewAllActivity": "Tümünü göster",
"achievementHighlights": "Son Başarılar",
"viewAllAchievements": "Tüm {count} başarı",
"filterAll": "Tümü",
"filterTrades": "İşlemler",
"filterFantasy": "Fantezi",
"filterMissions": "Görevler",
"filterRewards": "Ödüller",
"squadValue": "Kadro Değeri",
"totalRank": "Genel Sıralama",
"moreBio": "Daha fazla",
"lessBio": "Daha az"
```

**Step 4: Verify build**

Run: `npx next build`
Expected: PASS (type change may cause TS errors in ProfileView — that's expected and will be fixed in Task 2)

**Step 5: Commit**

```bash
git add src/types/index.ts messages/de.json messages/tr.json
git commit -m "refactor(profile): update ProfileTab type + add i18n keys for redesign"
```

---

## Task 2: Compress Header + Eliminate Sidebar on Mobile

This is the biggest single task — transforms ProfileView.tsx.

**Files:**
- Modify: `src/components/profile/ProfileView.tsx`

**Step 1: Update TAB_IDS and imports**

In `ProfileView.tsx`, update the TAB_IDS array (line 48-53):

```typescript
// BEFORE:
const TAB_IDS: { id: ProfileTab; selfOnly?: boolean }[] = [
  { id: 'overview' },
  { id: 'portfolio', selfOnly: true },
  { id: 'activity' },
  { id: 'settings', selfOnly: true },
];

// AFTER:
const TAB_IDS: { id: ProfileTab }[] = [
  { id: 'overview' },
  { id: 'squad' },
  { id: 'stats' },
  { id: 'activity' },
];
```

Remove `selfOnly` since all tabs are now visible to everyone.

Add import for `Flame` icon (for streak) and `Settings` icon (for settings gear), ensure both are imported from lucide-react. Remove `DimensionRangStack` import. Add dynamic import for `ProfileStatsTab` (will be created in Task 4).

**Step 2: Remove Settings from renderSettings prop**

Remove the `renderSettings` prop from `ProfileViewProps` interface:

```typescript
// BEFORE:
interface ProfileViewProps {
  targetUserId: string;
  targetProfile: Profile;
  isSelf: boolean;
  renderSettings?: () => React.ReactNode;
}

// AFTER:
interface ProfileViewProps {
  targetUserId: string;
  targetProfile: Profile;
  isSelf: boolean;
}
```

Remove `renderSettings` from the destructured props in the function signature.

**Step 3: Compress the header section**

Replace the entire header block (lines 270-428) with a compressed version. The new header should be:

**Row 1: Avatar (48px) + Name + Badges**
- Avatar: `size-12` (48px) instead of `size-20 md:size-24`
- Name: `text-lg md:text-2xl` instead of `text-xl md:text-3xl`
- Keep: Verified badge, Plan chip, FoundingPassBadge
- Remove: Nothing from this row

**Row 2: Handle + Follower count + Club**
- Handle (@user)
- `· {followerCount} Follower`
- Club name + SubscriptionBadge (inline, not its own row)

**Row 3: Compact 3-Dimension Elo Bars** (replaces DimensionRangStack)
- 3 horizontal bars: Trader | Manager | Analyst
- Each shows: label, tier name, small progress bar
- Use `scoutScores` data
- Background: `bg-white/[0.03] border border-white/[0.06] rounded-xl p-3`
- This is inline, not a separate Card

**Row 4: Stats Ribbon — 3 key metrics**
- Gesamtrang: `#{rank}` or "—"
- Portfolio: `{value} bC` (compact, using `fmtScout`)
- Streak: `🔥 {days}` (from userStats, field: `login_streak` or similar)
- Layout: `flex items-center justify-between` in a subtle bg strip

**Row 5: Action Buttons**
- Self: "Bearbeiten" button + ⚙️ gear icon (links to `/profile/settings`)
- Public: Follow/Unfollow + Teilen
- The gear icon replaces `setTab('settings')` with `router.push('/profile/settings')`

**Expandable Bio** (below handle, collapsed by default):
- If `targetProfile.bio` exists, show "Mehr anzeigen" toggle
- Collapsed: hidden. Expanded: shows bio + member-since date

**What to REMOVE entirely from the header:**
- Top Post card (→ moves to Stats tab)
- DimensionRangStack component (→ replaced by inline bars)
- Scout Stats Row (reports, hit-rate, rating, bounties) (→ moves to Stats tab)
- RangBadge (→ replaced by Gesamtrang in stats ribbon)
- FoundingScoutBadge (→ keep only if it's truly compact, otherwise remove)
- Member-since date (→ expandable bio section)

**Step 4: Restructure sidebar for mobile**

Replace the sidebar grid (lines 458-629) with:

```tsx
{/* Desktop Sidebar — hidden on mobile */}
<div className="hidden lg:block space-y-6">
  {/* Wallet — self only */}
  {isSelf && (
    <Card className="p-4 md:p-6">
      {/* ... wallet card content unchanged ... */}
    </Card>
  )}
  {/* Airdrop Score */}
  <AirdropScoreCard userId={targetUserId} compact={!isSelf} />
  {/* Referral — self only */}
  {isSelf && <ReferralCard userId={targetUserId} />}
</div>

{/* Main Content — full width on mobile, 2/3 on desktop */}
<div className="lg:col-span-2 space-y-6">
  {/* ... tab content ... */}
</div>
```

Key change: `<div className="space-y-6">` → `<div className="hidden lg:block space-y-6">`

Remove from sidebar:
- Scout Scores Card (T/M/S circles) — redundant with header bars
- Expert Badges — moves to Stats tab
- Cosmetic Inventory — moves to Stats tab

**Step 5: Update tab content routing**

Replace the tab routing section (lines 601-627) to match new tab IDs:

```tsx
{!holdingsLoading && !dataError && tab === 'overview' && (
  <ProfileOverviewTab
    holdings={holdings}
    achievements={achievements}
    portfolioValueCents={portfolioValueCents}
    portfolioCostCents={portfolioCostCents}
    totalDpcs={totalDpcs}
    userId={targetUserId}
    transactions={transactions}
    isSelf={isSelf}
  />
)}
{!holdingsLoading && !dataError && tab === 'squad' && (
  <ProfileSquadTab
    holdings={isSelf ? holdings : holdings}
    isSelf={isSelf}
  />
)}
{!holdingsLoading && !dataError && tab === 'stats' && (
  <ProfileStatsTab
    userId={targetUserId}
    userStats={userStats}
    achievements={achievements}
    recentTrades={recentTrades}
    fantasyResults={fantasyResults}
    myResearch={myResearch}
    trackRecord={trackRecord}
    topPost={topPost}
    transactions={transactions}
    holdings={holdings}
    isSelf={isSelf}
  />
)}
{!holdingsLoading && !dataError && tab === 'activity' && (
  <ProfileActivityTab
    transactions={isSelf ? transactions : transactions.filter(t => PUBLIC_TX_TYPES.has(t.type))}
    userId={targetUserId}
    isSelf={isSelf}
  />
)}
```

Remove the `settings` tab rendering and the `renderSettings?.()` call entirely.

**Step 6: Fix visibleTabs computation**

Since all tabs are now public, simplify:

```typescript
// BEFORE:
const visibleTabs = TAB_IDS.filter((t) => !t.selfOnly || isSelf);

// AFTER:
const visibleTabs = TAB_IDS;
```

**Step 7: Run build to check**

Run: `npx next build`
Expected: May fail because ProfileStatsTab and ProfileSquadTab don't exist yet. That's ok — we create them in Tasks 3-4.

**Step 8: Commit**

```bash
git add "src/components/profile/ProfileView.tsx"
git commit -m "refactor(profile): compress header to ~250px, hide sidebar on mobile, update tab routing"
```

---

## Task 3: Create ProfileSquadTab (renamed + public Portfolio)

**Files:**
- Modify: `src/components/profile/ProfilePortfolioTab.tsx` → rename to `ProfileSquadTab.tsx`

**Step 1: Rename file**

```bash
git mv src/components/profile/ProfilePortfolioTab.tsx src/components/profile/ProfileSquadTab.tsx
```

**Step 2: Update component**

In the renamed `ProfileSquadTab.tsx`:

1. Rename the component function: `ProfilePortfolioTab` → `ProfileSquadTab`
2. Add `isSelf` prop to the interface:

```typescript
interface ProfileSquadTabProps {
  holdings: HoldingRow[];
  isSelf: boolean;
}
```

3. When `!isSelf`, hide price columns:
   - Don't show `avg_buy_price`
   - Don't show P&L
   - Don't show total portfolio value
   - Only show: Player name, position, club, quantity

4. Move DPC Mastery section here from ProfileOverviewTab:
   - Add import: `import { useUserMasteryAll } from '@/lib/queries/mastery';`
   - Add `userId` prop
   - Add mastery section after holdings list (copy from ProfileOverviewTab lines 313-336)

5. Update the header translation key from `tp('portfolioValue')` to `tp('squadValue')`.

**Step 3: Update imports in ProfileView.tsx**

```typescript
// BEFORE:
import ProfilePortfolioTab from '@/components/profile/ProfilePortfolioTab';

// AFTER:
import ProfileSquadTab from '@/components/profile/ProfileSquadTab';
```

**Step 4: Update ProfileOverviewTab imports**

In `ProfileOverviewTab.tsx`, the `HoldingRow` type is exported from there. Keep it exported — `ProfileSquadTab` should import from `ProfileOverviewTab`:

```typescript
import type { HoldingRow } from './ProfileOverviewTab';
```

**Step 5: Verify build**

Run: `npx next build`
Expected: May still fail (ProfileStatsTab missing). Continue to Task 4.

**Step 6: Commit**

```bash
git add src/components/profile/ProfileSquadTab.tsx src/components/profile/ProfileView.tsx
git commit -m "refactor(profile): rename Portfolio tab to Kader, make public, add mastery section"
```

---

## Task 4: Create ProfileStatsTab (consolidated stats)

**Files:**
- Create: `src/components/profile/ProfileStatsTab.tsx`

**Step 1: Create the new component**

This component consolidates sections moved from ProfileOverviewTab and the sidebar. Create `src/components/profile/ProfileStatsTab.tsx`:

```typescript
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// ... import all icons and components needed (copy from ProfileOverviewTab)

interface ProfileStatsTabProps {
  userId: string | undefined;
  userStats: DbUserStats | null;
  achievements: DbUserAchievement[];
  recentTrades: UserTradeWithPlayer[];
  fantasyResults: UserFantasyResult[];
  myResearch: ResearchPostWithAuthor[];
  trackRecord: AuthorTrackRecord | null;
  topPost: PostWithAuthor | null;
  transactions: DbTransaction[];
  holdings: HoldingRow[];
  isSelf: boolean;
}
```

**Sections to include (in this order):**

1. **Track Record** — Copy from ProfileOverviewTab lines 178-239
2. **Research Earnings** — Copy from ProfileOverviewTab lines 241-276
3. **Expert Badges** — Move from ProfileView sidebar lines 531-586
4. **Achievements Grid** — Copy from ProfileOverviewTab lines 338-391
5. **Fantasy Results** — Copy from ProfileOverviewTab lines 462-529
6. **Prediction Stats** — Copy from ProfileOverviewTab line 397 (`<PredictionStatsCard userId={userId} />`)
7. **Score Road** — Copy from ProfileOverviewTab line 394 (`<ScoreRoadCard userId={userId} />`)
8. **Earnings Breakdown** — Copy from ProfileOverviewTab lines 149-176
9. **Trading History** — Copy from ProfileOverviewTab lines 399-460
10. **Top Post** — Move from ProfileView header lines 304-319

Each section keeps its existing conditional rendering (e.g., Track Record only shows if `trackRecord.totalCalls > 0`).

**For Expert Badges** (moved from sidebar): Import `getExpertBadges` from `@/lib/expertBadges` and the badge icons. Also move `CosmeticInventory` here if `isSelf && userCosmetics.length > 0`.

**Step 2: Verify build**

Run: `npx next build`
Expected: PASS — all components now exist.

**Step 3: Commit**

```bash
git add src/components/profile/ProfileStatsTab.tsx
git commit -m "feat(profile): create ProfileStatsTab consolidating all performance metrics"
```

---

## Task 5: Slim Down ProfileOverviewTab (13 → 5 Sections)

**Files:**
- Modify: `src/components/profile/ProfileOverviewTab.tsx`

**Step 1: Update props interface**

Remove props that are no longer needed (moved to StatsTab):

```typescript
// BEFORE:
interface ProfileOverviewTabProps {
  holdings: HoldingRow[];
  recentTrades: UserTradeWithPlayer[];
  fantasyResults: UserFantasyResult[];
  achievements: DbUserAchievement[];
  portfolioValueCents: number;
  portfolioCostCents: number;
  totalDpcs: number;
  userId: string | undefined;
  transactions?: DbTransaction[];
  myResearch?: ResearchPostWithAuthor[];
  trackRecord?: AuthorTrackRecord | null;
  isSelf?: boolean;
}

// AFTER:
interface ProfileOverviewTabProps {
  holdings: HoldingRow[];
  achievements: DbUserAchievement[];
  portfolioValueCents: number;
  portfolioCostCents: number;
  totalDpcs: number;
  userId: string | undefined;
  transactions?: DbTransaction[];
  isSelf?: boolean;
}
```

**Step 2: Add MissionBanner import**

```typescript
import dynamic from 'next/dynamic';
const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), { ssr: false });
```

**Step 3: Replace component body**

The new component renders only 5 sections:

**Section 1: Adaptive "Nächste Aktion" Card**

```tsx
{/* Adaptive Next Action */}
{isSelf && (() => {
  const hasHoldings = holdings.length > 0;
  // Determine which CTA to show
  if (!hasHoldings) {
    return (
      <Card className="p-5 border-gold/20 bg-gold/[0.03]">
        <div className="flex items-start gap-3">
          <Sparkles className="size-5 text-gold flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="font-bold text-sm">{tp('nextActionBuy')}</div>
            <div className="text-xs text-white/50 mt-1">{tp('overviewWelcomeDesc')}</div>
            <Link href="/market?tab=kaufen">
              <Button variant="gold" size="sm" className="mt-3">{tp('overviewStartNow')}</Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }
  return null; // Will be enhanced in Phase 2 with mission/fantasy context
})()}
```

**Section 2: MissionBanner**

```tsx
{isSelf && <MissionBanner />}
```

**Section 3: Portfolio Pulse**

```tsx
{/* Portfolio Pulse — compact value + top 3 */}
<Card className="p-4 md:p-5">
  <div className="flex items-center justify-between mb-3">
    <h3 className="font-black text-sm">{tp('portfolioPulse')}</h3>
    <Link href="?tab=squad" className="text-xs text-gold hover:text-gold/80 transition-colors">
      {tp('viewAllActivity')} →
    </Link>
  </div>
  <div className="flex items-center gap-4 mb-3">
    <div>
      <span className="text-xl font-mono font-black text-gold">{fmtScout(centsToBsd(portfolioValueCents))}</span>
      <span className="text-xs text-white/30 ml-1.5">bCredits</span>
    </div>
    {portfolioCostCents > 0 && (
      <span className={cn('text-sm font-mono font-bold', pnlCents >= 0 ? 'text-green-500' : 'text-red-400')}>
        {pnlCents >= 0 ? '+' : ''}{fmtScout(centsToBsd(pnlCents))}
      </span>
    )}
  </div>
  {/* Top 3 Holdings compact */}
  {holdings.length > 0 && (
    <div className="grid grid-cols-3 gap-2">
      {holdings
        .sort((a, b) => (b.quantity * (b.player?.floor_price ?? 0)) - (a.quantity * (a.player?.floor_price ?? 0)))
        .slice(0, 3)
        .map(h => (
          <Link key={h.id} href={`/player/${h.player_id}`} className="p-2 bg-white/[0.03] rounded-lg border border-white/[0.06] hover:border-white/10 transition-colors">
            <div className="text-xs font-bold truncate">{h.player?.last_name || h.player?.first_name}</div>
            <div className="text-[11px] font-mono text-gold mt-0.5">{fmtScout(centsToBsd(h.quantity * (h.player?.floor_price ?? 0)))}</div>
          </Link>
        ))}
    </div>
  )}
</Card>
```

**Section 4: Recent Activity (5 items)**

```tsx
{/* Recent Activity — compact, 5 items max */}
{transactions && transactions.length > 0 && (
  <Card className="p-4 md:p-5">
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-black text-sm">{tp('recentActivity')}</h3>
      <button onClick={() => /* switch to activity tab */} className="text-xs text-gold hover:text-gold/80 transition-colors">
        {tp('viewAllActivity')} →
      </button>
    </div>
    <div className="space-y-1">
      {transactions.slice(0, 5).map(tx => (
        <div key={tx.id} className="flex items-center justify-between py-1.5 text-sm">
          <span className="text-white/60 truncate">{tx.description}</span>
          <span className={cn('font-mono text-xs', tx.amount >= 0 ? 'text-green-500' : 'text-white/50')}>
            {tx.amount >= 0 ? '+' : ''}{formatScout(tx.amount)}
          </span>
        </div>
      ))}
    </div>
  </Card>
)}
```

**Section 5: Achievement Highlights (3 recent)**

```tsx
{/* Achievement Highlights — 3 most recent */}
{achievements.length > 0 && (() => {
  const recent = achievements.slice(0, 3);
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-sm">{tp('achievementHighlights')}</h3>
        <button onClick={() => /* switch to stats tab */} className="text-xs text-gold hover:text-gold/80 transition-colors">
          {tp('viewAllAchievements', { count: achievements.length })} →
        </button>
      </div>
      <div className="flex gap-3">
        {recent.map(a => {
          const def = getAchievementDef(a.achievement_key);
          return def ? (
            <div key={a.achievement_key} className="flex-1 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] text-center">
              <div className="text-xl mb-1">{def.icon}</div>
              <div className="text-xs font-bold truncate">{tg(`achievement.${def.key}`)}</div>
            </div>
          ) : null;
        })}
      </div>
    </Card>
  );
})()}
```

**Remove ALL the following sections** (they are now in ProfileStatsTab):
- Stats grid (4 StatCards)
- Earnings Breakdown
- Track Record
- Research Earnings
- Top Holdings (replaced by Portfolio Pulse top 3)
- DPC Mastery (moved to Squad tab)
- Full Achievements grid (replaced by highlights)
- Score Road
- Prediction Stats
- Recent Trades (full list)
- Fantasy Results
- Full Holdings list (Bestände)

**Step 4: Remove unused imports**

Clean up imports that are no longer needed (StatCard, many icons, etc.).

**Step 5: Verify build**

Run: `npx next build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/profile/ProfileOverviewTab.tsx
git commit -m "refactor(profile): slim overview from 13 to 5 sections, add MissionBanner"
```

---

## Task 6: Add Activity Filter Chips

**Files:**
- Modify: `src/components/profile/ProfileActivityTab.tsx`

**Step 1: Add filter state and chip data**

At the top of the component, add:

```typescript
const FILTER_TYPES = [
  { key: 'all', labelKey: 'filterAll' },
  { key: 'trades', labelKey: 'filterTrades', types: new Set(['buy', 'sell', 'ipo_buy']) },
  { key: 'fantasy', labelKey: 'filterFantasy', types: new Set(['fantasy_join', 'fantasy_reward']) },
  { key: 'missions', labelKey: 'filterMissions', types: new Set(['mission_reward', 'streak_reward']) },
  { key: 'rewards', labelKey: 'filterRewards', types: new Set(['bounty_reward', 'research_earning', 'poll_revenue', 'pbt_liquidation', 'tip_receive']) },
] as const;

type FilterKey = typeof FILTER_TYPES[number]['key'];
```

Add state: `const [filter, setFilter] = useState<FilterKey>('all');`

**Step 2: Add filter chips UI**

Before the transaction list, add:

```tsx
<div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
  {FILTER_TYPES.map(f => (
    <button
      key={f.key}
      onClick={() => setFilter(f.key)}
      className={cn(
        'px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0',
        filter === f.key
          ? 'bg-gold/15 text-gold border border-gold/25'
          : 'bg-white/[0.04] text-white/50 border border-white/[0.08] hover:text-white/70'
      )}
    >
      {tp(f.labelKey)}
    </button>
  ))}
</div>
```

**Step 3: Filter the transactions**

```typescript
const filteredTx = useMemo(() => {
  if (filter === 'all') return transactions;
  const filterDef = FILTER_TYPES.find(f => f.key === filter);
  if (!filterDef || !('types' in filterDef)) return transactions;
  return transactions.filter(t => filterDef.types.has(t.type));
}, [transactions, filter]);
```

Use `filteredTx` instead of `transactions` for rendering and pagination.

**Step 4: Add `tp` translations import**

The component already uses `useTranslations`. Ensure it has access to `profile` translations:
```typescript
const tp = useTranslations('profile');
```

**Step 5: Verify build**

Run: `npx next build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/profile/ProfileActivityTab.tsx
git commit -m "feat(profile): add filter chips to activity tab (trades/fantasy/missions/rewards)"
```

---

## Task 7: Move Settings to Dedicated Route

**Files:**
- Modify: `src/app/(app)/profile/page.tsx`
- Create: `src/app/(app)/profile/settings/page.tsx`

**Step 1: Extract SettingsTab to own route**

Create `src/app/(app)/profile/settings/page.tsx`:

```typescript
'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useTranslations } from 'next-intl';

// Copy the SettingsTab function from profile/page.tsx here
// (lines 22-420 of the current file)

export default function ProfileSettingsPage() {
  const { user, profile, loading: authLoading } = useUser();
  const t = useTranslations('profile');

  if (authLoading) return <div className="p-6">Loading...</div>;
  if (!user || !profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-black">{t('settings')}</h1>
      </div>
      <SettingsTab />
    </div>
  );
}
```

Move the entire `SettingsTab` function and all its related imports from `profile/page.tsx` into this new file.

**Step 2: Simplify profile/page.tsx**

In `src/app/(app)/profile/page.tsx`, remove:
- The `SettingsTab` function entirely
- The `renderSettings` prop from the `ProfileView` call
- All SettingsTab-related imports (Camera, Bell, AlertTriangle, etc.)

The simplified page.tsx should just be:

```typescript
export default function ProfilePage() {
  // ... existing auth loading logic ...
  return <ProfileView targetUserId={user.id} targetProfile={profile} isSelf={true} />;
}
```

**Step 3: Verify build**

Run: `npx next build`
Expected: PASS

**Step 4: Commit**

```bash
git add "src/app/(app)/profile/page.tsx" "src/app/(app)/profile/settings/page.tsx"
git commit -m "refactor(profile): move settings to /profile/settings route"
```

---

## Task 8: Font Compliance + Final Build Verification

**Files:**
- Modify: All changed profile files

**Step 1: Search for font violations**

Search all modified files for `text-[9px]` and `text-[10px]`:

```bash
grep -rn 'text-\[9px\]\|text-\[10px\]' src/components/profile/ src/app/\(app\)/profile/
```

Replace ALL occurrences with `text-[11px]`.

**Step 2: Fix any remaining `text-[10px]` in ProfileStatsTab**

Since we copied sections from ProfileOverviewTab that may have `text-[10px]`, fix them all.

**Step 3: Run full build**

Run: `npx next build`
Expected: PASS with 0 errors

**Step 4: Run existing profile tests (if any)**

```bash
npx vitest run --reporter=verbose 2>&1 | head -50
```

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix(profile): font compliance min 11px + build verification"
```

---

## Task Summary

| Task | What | Files | Commit |
|------|------|-------|--------|
| 1 | ProfileTab type + i18n keys | types, de.json, tr.json | `refactor: update ProfileTab type` |
| 2 | Header compress + sidebar mobile | ProfileView.tsx | `refactor: compress header` |
| 3 | ProfileSquadTab (public portfolio) | ProfilePortfolioTab → SquadTab | `refactor: rename Portfolio to Kader` |
| 4 | ProfileStatsTab (consolidated) | NEW ProfileStatsTab.tsx | `feat: create ProfileStatsTab` |
| 5 | Slim ProfileOverviewTab (13→5) | ProfileOverviewTab.tsx | `refactor: slim overview, add MissionBanner` |
| 6 | Activity filter chips | ProfileActivityTab.tsx | `feat: add filter chips` |
| 7 | Settings → own route | page.tsx + settings/page.tsx | `refactor: move settings to route` |
| 8 | Font compliance + build | All changed files | `fix: font compliance` |

## Execution Order

Tasks 1-8 are sequential — each depends on the previous. Do NOT parallelize.

**Critical dependencies:**
- Task 2 references `ProfileSquadTab` and `ProfileStatsTab` → they must exist before build passes
- Task 4 (StatsTab) copies code from Task 5 (Overview slim) → create StatsTab BEFORE slimming Overview
- Task 7 (Settings route) depends on Task 2 (renderSettings removed from ProfileView)
