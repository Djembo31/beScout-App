# Marketplace UX Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure the /market page with clear separation of Club Verkauf (IPO) and Transferliste (P2P), live countdowns, better filters, and beginner-friendly terminology.

**Architecture:** Zustand store gets new sub-tab state. Market page splits "Kaufen" into two sub-tabs rendered as Pill-Tabs under a Segmented Control. "Angebote" moves under "Mein Kader". Shared Countdown component replaces static formatCountdown. Terminology changes sweep across all trading components + i18n files.

**Tech Stack:** Next.js 14 / TypeScript / Tailwind / Zustand / React Query / next-intl

---

## Task 1: Shared Countdown Component

**Files:**
- Create: `src/components/ui/Countdown.tsx`
- Modify: `src/components/ui/index.tsx` (add export)

**Step 1: Create `src/components/ui/Countdown.tsx`**

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownProps {
  targetDate: string; // ISO timestamp
  className?: string;
  onExpired?: () => void;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Beendet';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

export function Countdown({ targetDate, className, onExpired }: CountdownProps) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, new Date(targetDate).getTime() - Date.now())
  );

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const ms = Math.max(0, target - Date.now());
      setRemaining(ms);
      if (ms <= 0) onExpired?.();
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate, onExpired]);

  const isUrgent = remaining > 0 && remaining < 3600000; // < 1h
  const isExpired = remaining <= 0;

  if (isExpired) return null;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs tabular-nums',
      isUrgent ? 'text-red-400' : 'text-white/60',
      className
    )}>
      <Clock className={cn('size-3', isUrgent && 'animate-pulse')} aria-hidden="true" />
      {formatRemaining(remaining)}
    </span>
  );
}
```

**Step 2: Add export to `src/components/ui/index.tsx`**

Find the exports section and add:
```tsx
export { Countdown } from './Countdown';
```

**Step 3: Verify build**

Run: `npx next build`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/ui/Countdown.tsx src/components/ui/index.tsx
git commit -m "feat: add shared Countdown component with live ticking"
```

---

## Task 2: InfoTooltip for Onboarding

**Files:**
- Modify: `src/components/ui/index.tsx` (check existing InfoTooltip, extend if needed)

**Step 1: Read current InfoTooltip implementation**

Check `src/components/ui/index.tsx` for the existing InfoTooltip. It may already support what we need (icon + tooltip text on tap). If it does, skip this task. If it only shows static text without tap-to-expand, extend it.

**Step 2: Ensure InfoTooltip supports these props**

```tsx
interface InfoTooltipProps {
  text: string;       // tooltip content
  className?: string;
}
```

The component should:
- Render a small (i) icon button (16px, `aria-label="Info"`)
- On click/tap: toggle a small popover with the text
- Click outside dismisses
- Mobile-friendly (no hover-only)

If the existing component already does this, no changes needed. If not, update it.

**Step 3: Verify build**

Run: `npx next build`

**Step 4: Commit (only if changed)**

```bash
git add src/components/ui/index.tsx
git commit -m "feat: extend InfoTooltip for marketplace onboarding"
```

---

## Task 3: Zustand Store — New Tab & Filter Structure

**Files:**
- Modify: `src/lib/stores/marketStore.ts`

**Step 1: Update tab types and state**

Current state has:
```
tab: 'portfolio' | 'kaufen' | 'angebote'
```

Change to:
```
tab: 'portfolio' | 'kaufen'
portfolioSubTab: 'team' | 'bestand' | 'angebote'   // NEW: angebote moves here
kaufenSubTab: 'clubverkauf' | 'transferliste'       // NEW
```

**Step 2: Add new filter state for both tabs**

Add shared filters (both tabs):
```typescript
// Shared filters (Club Verkauf + Transferliste)
filterPos: string[];           // ['GK','DEF','MID','ATT'] multi-select
filterMinL5: number;           // 0, 45, 55, 65
filterMinGoals: number;        // 0, 3, 5, 10
filterMinAssists: number;      // 0, 2, 4, 8
filterMinMatches: number;      // 0, 10, 20, 30
filterContractMax: number;     // 0 (all), 6, 12 months
filterOnlyFit: boolean;

// Transferliste-only
filterPriceMin: number;        // in cents
filterPriceMax: number;        // in cents (0 = no max)
filterMinSellers: number;      // 0 = all
filterBestDeals: boolean;      // high L5 / low price ratio

// Sort (shared, applies to active sub-tab)
sortBy: 'l5' | 'price_asc' | 'price_desc' | 'goals' | 'assists' | 'matches' | 'contract';
```

**Step 3: Add setters and reset function**

Add action methods:
```typescript
setKaufenSubTab: (sub: 'clubverkauf' | 'transferliste') => void;
setPortfolioSubTab: (sub: 'team' | 'bestand' | 'angebote') => void;
setFilterPos: (pos: string[]) => void;
setFilterMinL5: (v: number) => void;
setFilterMinGoals: (v: number) => void;
setFilterMinAssists: (v: number) => void;
setFilterMinMatches: (v: number) => void;
setFilterContractMax: (v: number) => void;
setFilterOnlyFit: (v: boolean) => void;
setFilterPriceMin: (v: number) => void;
setFilterPriceMax: (v: number) => void;
setFilterMinSellers: (v: number) => void;
setFilterBestDeals: (v: boolean) => void;
setSortBy: (v: string) => void;
resetMarketFilters: () => void;  // resets all filters to defaults
```

**Step 4: Remove `'angebote'` from tab type**

Since "Angebote" moves under portfolio, the main `tab` only needs `'portfolio' | 'kaufen'`. Remove `'angebote'` and any references.

**Step 5: Verify build**

Run: `npx next build`
Expected: Build errors in market/page.tsx (references to old tab values) — that's expected, fixed in Task 4.

**Step 6: Commit**

```bash
git add src/lib/stores/marketStore.ts
git commit -m "feat: restructure market store for Club Verkauf / Transferliste tabs"
```

---

## Task 4: Market Page — Navigation Restructure

**Files:**
- Modify: `src/app/(app)/market/page.tsx`

**Step 1: Update tab configuration (lines ~80-94)**

Replace 3-tab config with 2 main tabs:
```tsx
const MAIN_TABS = [
  { id: 'portfolio' as const, label: t('market.mySquad', { defaultMessage: 'Mein Kader' }) },
  { id: 'kaufen' as const, label: t('market.buy', { defaultMessage: 'Kaufen' }) },
];

const PORTFOLIO_SUB_TABS = [
  { id: 'team' as const, label: t('market.team', { defaultMessage: 'Team' }) },
  { id: 'bestand' as const, label: t('market.inventory', { defaultMessage: 'Bestand' }) },
  { id: 'angebote' as const, label: t('market.offers', { defaultMessage: 'Angebote' }) },
];

const KAUFEN_SUB_TABS = [
  { id: 'clubverkauf' as const, label: t('market.clubSale', { defaultMessage: 'Club Verkauf' }) },
  { id: 'transferliste' as const, label: t('market.transferList', { defaultMessage: 'Transferliste' }) },
];
```

**Step 2: Render Segmented Control for main tabs**

Replace existing TabBar with a prominent Segmented Control (two large buttons, active state with bg fill):

```tsx
{/* Main Tabs — Segmented Control */}
<div className="flex gap-1 rounded-lg bg-white/5 p-1">
  {MAIN_TABS.map(t => (
    <button
      key={t.id}
      onClick={() => setTab(t.id)}
      className={cn(
        'flex-1 rounded-md px-4 py-2.5 text-sm font-semibold transition-colors',
        tab === t.id
          ? 'bg-white/10 text-white'
          : 'text-white/50 hover:text-white/70'
      )}
    >
      {t.label}
    </button>
  ))}
</div>
```

**Step 3: Render Pill Sub-Tabs below main tabs**

Below Segmented Control, render context-dependent sub-tabs as smaller pills:

```tsx
{/* Sub-Tabs — Pill Style */}
{tab === 'portfolio' && (
  <div className="flex gap-2 mt-2">
    {PORTFOLIO_SUB_TABS.map(st => (
      <button
        key={st.id}
        onClick={() => setPortfolioSubTab(st.id)}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          portfolioSubTab === st.id
            ? 'bg-white/15 text-white'
            : 'text-white/40 hover:text-white/60'
        )}
      >
        {st.label}
      </button>
    ))}
  </div>
)}
{tab === 'kaufen' && (
  <div className="flex gap-2 mt-2">
    {KAUFEN_SUB_TABS.map(st => (
      <button
        key={st.id}
        onClick={() => setKaufenSubTab(st.id)}
        className={cn(
          'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
          kaufenSubTab === st.id
            ? 'bg-white/15 text-white'
            : 'text-white/40 hover:text-white/60'
        )}
      >
        {st.label}
      </button>
    ))}
  </div>
)}
```

**Step 4: Update tab panels**

Replace 3 tab panels with new structure:
```tsx
{/* Portfolio Tab */}
{tab === 'portfolio' && (
  <>
    {portfolioSubTab === 'team' && <KaderContent ... />}
    {portfolioSubTab === 'bestand' && <BestandContent ... />}
    {portfolioSubTab === 'angebote' && <ManagerOffersTab ... />}
  </>
)}

{/* Kaufen Tab */}
{tab === 'kaufen' && (
  <>
    {kaufenSubTab === 'clubverkauf' && <ClubSaleSection ... />}
    {kaufenSubTab === 'transferliste' && <TransferListSection ... />}
  </>
)}
```

**Step 5: Remove old "Angebote" tab panel (line ~452-456)**

Delete the standalone Angebote tab panel — it's now under portfolio.

**Step 6: Verify build**

Run: `npx next build`
Expected: Errors for ClubSaleSection and TransferListSection (not created yet). That's fine — created in Tasks 5+6.

**Step 7: Commit**

```bash
git add src/app/(app)/market/page.tsx
git commit -m "feat: restructure market navigation — 2 main tabs + sub-tabs"
```

---

## Task 5: Club Verkauf Section (Three Phases)

**Files:**
- Create: `src/components/market/ClubSaleSection.tsx`

**Step 1: Create component with three phase sections**

This component receives all IPOs (not just active ones — we need ended too) and renders three groups:

```tsx
'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Countdown } from '@/components/ui/Countdown';
import { InfoTooltip } from '@/components/ui/index';
import type { Player } from '@/types';

interface ClubSaleProps {
  players: Player[];
  ipos: DbIpo[];          // ALL ipos (open + early_access + announced + recently ended)
  userPurchases: Map<string, number>;  // ipoId -> qty purchased
  filters: { ... };       // from store
  sortBy: string;
  onBuy: (player: Player, ipoId: string) => void;
  buying: string | null;
}
```

**Step 2: Split IPOs into three groups**

```tsx
const { live, upcoming, ended } = useMemo(() => {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;

  return {
    live: ipos.filter(i => i.status === 'open' || i.status === 'early_access'),
    upcoming: ipos.filter(i => i.status === 'announced'),
    ended: ipos.filter(i =>
      i.status === 'ended' && new Date(i.ends_at).getTime() > sevenDaysAgo
    ),
  };
}, [ipos]);
```

**Step 3: Render three sections**

Structure:
1. **Jetzt Live** — Large cards with Countdown, progress bar, stats, buy button
2. **Demnaechst** — Compact rows with "Startet in X Tagen", player info
3. **Beendet** — Compact rows with "X/Y verkauft", ended timestamp, transfermarkt link

Each section has a header with section title.

Live cards show:
- Player photo, name, position badge, club logo, nationality flag
- L5 score + trend arrow
- Tore / Assists / Spiele stats row
- Preis pro Spieler Lizenz (in $SCOUT)
- Progress bar (sold / total_offered)
- Live Countdown (using Countdown component)
- Kaufen button

**Step 4: Apply filters**

Use the shared filter state (position, L5, goals, assists, matches, contract) to filter IPO players before rendering. Apply sortBy for ordering.

**Step 5: Add section header with InfoTooltip**

```tsx
<div className="flex items-center gap-2 mb-3">
  <h3 className="text-sm font-semibold text-white">Club Verkauf</h3>
  <InfoTooltip text="Hier kaufst du Spieler Lizenzen direkt vom Verein — limitierte Stueckzahl, fester Preis, begrenzte Zeit." />
</div>
```

**Step 6: Verify build**

Run: `npx next build`

**Step 7: Commit**

```bash
git add src/components/market/ClubSaleSection.tsx
git commit -m "feat: ClubSaleSection with live/upcoming/ended phases"
```

---

## Task 6: Transferliste Section (Extended Filters)

**Files:**
- Create: `src/components/market/TransferListSection.tsx`

**Step 1: Create component**

This component shows all players with active sell orders on the secondary market.

```tsx
interface TransferListProps {
  players: Player[];
  sellOrders: DbOrder[];    // all open sell orders
  filters: { ... };         // shared + transferliste-specific from store
  sortBy: string;
  onBuy: (player: Player) => void;
  buying: string | null;
}
```

**Step 2: Aggregate orders by player**

```tsx
const listings = useMemo(() => {
  const grouped = new Map<string, { count: number; floor: number; totalQty: number }>();
  for (const order of sellOrders) {
    if (order.status !== 'open' && order.status !== 'partial') continue;
    const existing = grouped.get(order.player_id);
    const available = order.quantity - order.filled_qty;
    if (!existing) {
      grouped.set(order.player_id, { count: 1, floor: order.price, totalQty: available });
    } else {
      existing.count++;
      existing.totalQty += available;
      if (order.price < existing.floor) existing.floor = order.price;
    }
  }
  return grouped;
}, [sellOrders]);
```

**Step 3: Card layout (different from Club Verkauf)**

Each card shows:
- Player photo, name, position badge, club logo, nationality flag
- **"Gelistet ab"** price (floor price from listings) + InfoTooltip
- "X Angebote" (seller count)
- 24h price change (if available)
- Sparkline (7-day price history)
- Tore / Assists / Spiele stats row
- L5 score + trend
- Kaufen button

**Step 4: Render extended filter strip**

Above the listings, show filter controls:
- Shared filters (position, L5, goals, assists, matches, contract, fit-only)
- Transferliste-only: Price range slider, min sellers, "Beste Deals" toggle
- Sort dropdown

**Step 5: Add section header with InfoTooltip**

```tsx
<div className="flex items-center gap-2 mb-3">
  <h3 className="text-sm font-semibold text-white">Transferliste</h3>
  <InfoTooltip text="Hier kaufst du Spieler Lizenzen von anderen Fans — der Preis wird vom Markt bestimmt." />
</div>
```

**Step 6: Verify build**

Run: `npx next build`

**Step 7: Commit**

```bash
git add src/components/market/TransferListSection.tsx
git commit -m "feat: TransferListSection with extended filters and market cards"
```

---

## Task 7: Global Search with Grouped Results

**Files:**
- Create: `src/components/market/MarketSearch.tsx`
- Modify: `src/app/(app)/market/page.tsx` (integrate search)

**Step 1: Create MarketSearch component**

```tsx
interface MarketSearchProps {
  players: Player[];
  ipos: DbIpo[];
  sellOrders: DbOrder[];
  onPlayerSelect: (player: Player, source: 'clubverkauf' | 'transferliste') => void;
}
```

**Step 2: Search logic**

- Single search input at top of "Kaufen" tab
- Filters players by name (first + last), club name, position, nationality
- Results grouped: "X im Club Verkauf" + "Y auf der Transferliste"
- Each result shows: player info + where available + price
- Click navigates to player detail or opens buy modal

**Step 3: Render grouped results**

```tsx
{clubSaleResults.length > 0 && (
  <div>
    <h4 className="text-xs font-medium text-white/50 mb-2">
      {clubSaleResults.length} im Club Verkauf
    </h4>
    {clubSaleResults.map(p => <SearchResultRow key={p.id} ... />)}
  </div>
)}
{transferResults.length > 0 && (
  <div>
    <h4 className="text-xs font-medium text-white/50 mb-2">
      {transferResults.length} auf der Transferliste
    </h4>
    {transferResults.map(p => <SearchResultRow key={p.id} ... />)}
  </div>
)}
```

**Step 4: Integrate into market page**

Add MarketSearch above sub-tab content when `tab === 'kaufen'`. When search is active, hide sub-tab content and show search results. When search clears, show sub-tab content again.

**Step 5: Verify build**

Run: `npx next build`

**Step 6: Commit**

```bash
git add src/components/market/MarketSearch.tsx src/app/(app)/market/page.tsx
git commit -m "feat: global marketplace search with grouped results"
```

---

## Task 8: IPO Service — Fetch Ended IPOs

**Files:**
- Modify: `src/lib/services/ipo.ts`
- Modify: `src/lib/queries/ipos.ts`

**Step 1: Add `getRecentlyEndedIpos()` function**

In `src/lib/services/ipo.ts`, add:
```typescript
export async function getRecentlyEndedIpos(): Promise<DbIpo[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('status', 'ended')
    .gte('ends_at', sevenDaysAgo)
    .order('ends_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
```

**Step 2: Add `getAnnouncedIpos()` function**

```typescript
export async function getAnnouncedIpos(): Promise<DbIpo[]> {
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('status', 'announced')
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
```

**Step 3: Add React Query hooks**

In `src/lib/queries/ipos.ts`:
```typescript
export function useRecentlyEndedIpos() {
  return useQuery({
    queryKey: qk.ipos.recentlyEnded,
    queryFn: getRecentlyEndedIpos,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAnnouncedIpos() {
  return useQuery({
    queryKey: qk.ipos.announced,
    queryFn: getAnnouncedIpos,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Step 4: Add query keys**

Find the `qk` definition (likely in `src/lib/queries/keys.ts` or similar) and add:
```typescript
ipos: {
  active: ['ipos', 'active'],
  recentlyEnded: ['ipos', 'recently-ended'],
  announced: ['ipos', 'announced'],
}
```

**Step 5: Verify build**

Run: `npx next build`

**Step 6: Commit**

```bash
git add src/lib/services/ipo.ts src/lib/queries/ipos.ts
git commit -m "feat: add hooks for announced and recently ended IPOs"
```

---

## Task 9: Terminology Sweep

**Files:**
- Modify: `src/components/player/detail/BuyModal.tsx`
- Modify: `src/components/player/detail/trading/IPOBuySection.tsx`
- Modify: `src/components/player/detail/trading/TransferBuySection.tsx`
- Modify: `src/components/market/DiscoveryCard.tsx` (if still used)
- Modify: `src/components/market/KaufenDiscovery.tsx` (if still used)
- Modify: `messages/de.json`, `messages/en.json`, `messages/tr.json`

**Step 1: BuyModal.tsx — rename labels**

| Old | New |
|-----|-----|
| "Initial Sale" | "Club Verkauf" |
| "Market" | "Transferliste" |
| "DPC" / "DPCs" | "Spieler Lizenz" / "Spieler Lizenzen" |
| "Floor Price" | "Gelistet ab" |
| "Fixed Price" | "Festpreis" |

**Step 2: IPOBuySection.tsx — rename labels**

| Old | New |
|-----|-----|
| "Initial Sale" | "Club Verkauf" |
| "Club Price" | "Vereinspreis" |
| "DPC" | "Spieler Lizenz" |
| formatCountdown | Replace with `<Countdown>` component |

**Step 3: TransferBuySection.tsx — rename labels**

| Old | New |
|-----|-----|
| "Transfer Market" | "Transferliste" |
| "User Offers" | "Angebote" |
| "Floor Price" | "Gelistet ab" |
| "DPC" | "Spieler Lizenz" |

**Step 4: Replace static countdown with Countdown component**

In BuyModal.tsx (lines 41-47) and IPOBuySection.tsx (lines 13-22):
- Remove `formatCountdown` helper
- Replace rendered countdown text with `<Countdown targetDate={ipo.ends_at} />`

**Step 5: i18n keys**

Add new keys to `messages/de.json`:
```json
{
  "market": {
    "clubSale": "Club Verkauf",
    "transferList": "Transferliste",
    "listedFrom": "Gelistet ab",
    "playerLicense": "Spieler Lizenz",
    "playerLicenses": "Spieler Lizenzen",
    "clubPrice": "Vereinspreis",
    "offers": "Angebote",
    "liveSales": "Jetzt Live",
    "upcoming": "Demnächst",
    "ended": "Beendet",
    "soldOf": "{sold} / {total} verkauft",
    "endedAgo": "Beendet {time}",
    "availableOnTransferList": "Auf der Transferliste verfügbar",
    "startsIn": "Startet in {time}",
    "sellers": "{count} Angebote",
    "tooltipClubSale": "Hier kaufst du Spieler Lizenzen direkt vom Verein — limitierte Stückzahl, fester Preis, begrenzte Zeit.",
    "tooltipTransferList": "Hier kaufst du Spieler Lizenzen von anderen Fans — der Preis wird vom Markt bestimmt.",
    "tooltipPlayerLicense": "Eine BeScout Spieler Lizenz ist dein digitaler Vertrag mit einem Spieler. Wird der Spieler transferiert, verdienst du mit.",
    "tooltipListedFrom": "Der günstigste Preis zu dem dieser Spieler aktuell auf der Transferliste angeboten wird.",
    "tooltipContractLength": "Je kürzer der Vertrag, desto wahrscheinlicher ein Transfer — und damit eine Ausschüttung an Lizenz-Halter."
  }
}
```

Add equivalent keys in `en.json` and `tr.json`.

**Step 6: Verify build**

Run: `npx next build`

**Step 7: Commit**

```bash
git add src/components/player/detail/BuyModal.tsx \
  src/components/player/detail/trading/IPOBuySection.tsx \
  src/components/player/detail/trading/TransferBuySection.tsx \
  messages/de.json messages/en.json messages/tr.json
git commit -m "feat: terminology sweep — IPO→Club Verkauf, DPC→Spieler Lizenz, Floor→Gelistet ab"
```

---

## Task 10: Wire Everything Together in Market Page

**Files:**
- Modify: `src/app/(app)/market/page.tsx`

**Step 1: Import new components**

```tsx
import { ClubSaleSection } from '@/components/market/ClubSaleSection';
import { TransferListSection } from '@/components/market/TransferListSection';
import { MarketSearch } from '@/components/market/MarketSearch';
import { useRecentlyEndedIpos, useAnnouncedIpos } from '@/lib/queries/ipos';
```

**Step 2: Add data fetching for new IPO states**

```tsx
const { data: endedIpos } = useRecentlyEndedIpos();
const { data: announcedIpos } = useAnnouncedIpos();
```

**Step 3: Combine all IPOs for ClubSaleSection**

```tsx
const allIpos = useMemo(() => [
  ...(activeIpos ?? []),
  ...(announcedIpos ?? []),
  ...(endedIpos ?? []),
], [activeIpos, announcedIpos, endedIpos]);
```

**Step 4: Pass data to new components**

Wire ClubSaleSection with allIpos, filters, sortBy from store.
Wire TransferListSection with players, sellOrders, extended filters from store.
Wire MarketSearch above sub-tabs.

**Step 5: Clean up old KaufenDiscovery usage**

Remove or replace the old KaufenDiscovery component reference. The new ClubSaleSection and TransferListSection replace its functionality. KaufenDiscovery.tsx can be kept for reference but should no longer be rendered.

**Step 6: Verify build**

Run: `npx next build`
Expected: Clean build, all components wired.

**Step 7: Commit**

```bash
git add src/app/(app)/market/page.tsx
git commit -m "feat: wire ClubSaleSection + TransferListSection into market page"
```

---

## Task 11: Filter UI Components

**Files:**
- Create: `src/components/market/MarketFilters.tsx`

**Step 1: Create shared filter bar component**

Renders filter controls that work for both tabs:
- Position multi-select pills (GK / DEF / MID / ATT)
- L5 threshold pills (Alle / 45+ / 55+ / 65+)
- Sort dropdown (L5 / Preis / Tore / Assists / Spiele / Vertrag)
- Stats thresholds (Tore >= X, Assists >= X, Spiele >= X)
- Contract filter (Alle / < 6M / < 12M)
- Fit-only toggle

**Step 2: Create extended filter bar for Transferliste**

Additional controls:
- Price range slider (min/max)
- Min sellers input
- "Beste Deals" toggle

**Step 3: Filter as bottom sheet on mobile**

Wrap extended filters in a collapsible section. On mobile, render as a bottom sheet triggered by a "Filter" button with active filter count badge.

**Step 4: Wire to store**

All filter values read from and write to the marketStore.

**Step 5: Verify build**

Run: `npx next build`

**Step 6: Commit**

```bash
git add src/components/market/MarketFilters.tsx
git commit -m "feat: shared market filter bar with extended transferliste filters"
```

---

## Task 12: Mobile Polish & Final Verification

**Files:**
- Modify: `src/app/(app)/market/page.tsx` (responsive tweaks)
- Modify: `src/components/market/ClubSaleSection.tsx` (card sizing)
- Modify: `src/components/market/TransferListSection.tsx` (card sizing)

**Step 1: Verify mobile tab sizing**

- Segmented Control: `min-h-[44px]` on each button
- Pill Sub-Tabs: `min-h-[36px]` on each pill, `overflow-x-auto scrollbar-hide` on container
- No horizontal overflow anywhere

**Step 2: Verify card layout on mobile**

- Club Verkauf live cards: full width, stacked vertically
- Transferliste cards: full width on mobile, 2-col grid on desktop
- Touch targets: all buttons >= 44x44px

**Step 3: Test filter bottom sheet on mobile**

- Filter button visible on mobile
- Bottom sheet opens with all filter options
- Dismiss on backdrop tap or swipe down

**Step 4: Full build verification**

Run: `npx next build`
Expected: Clean build, no errors.

**Step 5: Manual QA checklist**

- [ ] "Mein Kader" → Team / Bestand / Angebote all render correctly
- [ ] "Kaufen" → Club Verkauf shows Live / Demnaechst / Beendet
- [ ] "Kaufen" → Transferliste shows listings with "Gelistet ab"
- [ ] Countdown ticks live, turns red < 1h
- [ ] Expired IPOs disappear from Live, appear in Beendet
- [ ] Beendet shows "Auf der Transferliste verfuegbar" link
- [ ] Search finds players in both tabs, grouped results
- [ ] Filters work: Position, L5, Goals, Assists, Matches, Contract
- [ ] Transferliste extra filters: Price range, sellers, deals
- [ ] Sort works in both tabs
- [ ] InfoTooltips show on tap for: Club Verkauf, Transferliste, Spieler Lizenz, Gelistet ab
- [ ] BuyModal says "Club Verkauf" not "IPO"
- [ ] No "DPC" visible — all replaced with "Spieler Lizenz"
- [ ] No "Floor-Preis" visible — all replaced with "Gelistet ab"
- [ ] Mobile: tabs 44px, no overflow, cards full width

**Step 6: Final commit**

```bash
git add -A
git commit -m "feat: marketplace UX redesign — mobile polish and QA verification"
```

---

## Execution Order Summary

| Task | Depends On | Description |
|------|-----------|-------------|
| 1 | — | Countdown component |
| 2 | — | InfoTooltip check/extend |
| 3 | — | Store restructure |
| 4 | 3 | Market page navigation |
| 5 | 1, 2, 3 | ClubSaleSection |
| 6 | 1, 2, 3 | TransferListSection |
| 7 | 5, 6 | Global search |
| 8 | — | IPO service (ended/announced) |
| 9 | 1 | Terminology sweep |
| 10 | 4, 5, 6, 7, 8 | Wire everything |
| 11 | 3 | Filter UI components |
| 12 | ALL | Mobile polish + QA |

Tasks 1, 2, 3, 8 can run in parallel (no dependencies).
Tasks 5, 6, 9, 11 can run after their deps.
Tasks 7, 10, 12 are sequential.
