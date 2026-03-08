# Club Verkauf Redesign — Design Document

> Date: 2026-03-06
> Status: Approved (Brainstorming)
> Scope: Manager Office > Kaufen > Club Verkauf

## Problem

The current Club Verkauf is a flat list of IPOs (Live > Upcoming > Ended). It lacks:

1. **No countdown** for offer duration
2. **No league context** — at scale (50+ clubs), no way to navigate by league
3. **No club identity** — the club as a brand disappears behind player rows
4. **No "Hot Sales"** — no monetization option for clubs to promote their DPCs
5. **No trending** — no sense of what's hot right now
6. **No scalability** — flat list breaks at 200+ players from 20+ clubs

## Design Decision

**Hybrid approach**: Hero section (Hot Sales) at top, structured league > club > player navigation below.

## Architecture

```
+-------------------------------------------+
|  Hot Sales Carousel (placeholder)         |  Phase 2
|  [Featured Slot] [Featured Slot] ...      |
+-------------------------------------------+
|  Liga: [v Dropdown]                       |  Liga selector
|  [GK] [DEF] [MID] [ATT] [L5 55+] [Fit]  |  Global filters
+-------------------------------------------+
|  +------------+  +------------+           |
|  | Club Tile  |  | Club Tile  |           |  2-column grid
|  | Logo+Color |  | Logo+Color |           |
|  | 12 DPCs    |  | 8 DPCs     |           |
|  | Avg 45 $SC |  | Avg 32 $SC |           |
|  | 2T 14:30   |  | 5T 03:12   |           |
|  +------------+  +------------+           |
|                                           |
|  v Sakaryaspor (expanded accordion)       |  Only 1 open at a time
|  +--- TW ---------------------------------+
|  | Player | L5 | Price | Countdown | Buy  |
|  +--- DEF --------------------------------+
|  | Player | L5 | Price | Countdown | Buy  |
|  | Player | L5 | Price | Countdown | Buy  |
|  +--- MID --------------------------------+
|  | ...                                    |
|  +--- STU --------------------------------+
|  | ...                                    |
|  +----------------------------------------+
+-------------------------------------------+
```

## Component Breakdown

### 1. Hot Sales Carousel (placeholder — logic later)

- Horizontal scrollable carousel at the top
- Simple slot system: club books "Featured Spot" for X days, their active IPOs appear here
- Max 5-8 slots
- **Phase 1 (now):** Empty state or static promotional banner
- **Phase 2 (later):** Booking logic, payment, slot management

### 2. Liga Dropdown

- Compact `<select>` or custom dropdown
- Options populated from available leagues in the data
- Default: "Alle Ligen" (shows all)
- Filters both the club tiles AND players within accordions
- Mobile-friendly: native select on small screens

### 3. Global Filter Bar

- Sits between liga dropdown and club tiles
- Horizontal scrollable chips:
  - Position: GK | DEF | MID | ATT
  - L5 presets: 45+ | 55+ | 65+
  - Only Fit toggle
  - Sort: L5 | Price asc | Price desc | Goals | Assists | Matches | Contract
- Filters propagate globally:
  - Club tiles: only show clubs that have matching players (hide empty clubs)
  - Accordion: only show matching players within position groups
- Reuse existing `MarketFilters` logic where possible

### 4. Club Tiles (Grid)

2-column grid of club cards. Each tile shows:

| Element | Description |
|---------|-------------|
| Club logo | From `getClub()` data |
| Club name | Bold, prominent |
| League badge | Small text/icon next to name |
| Vereinsfarben | Background accent using `club.colors.primary` |
| Available DPCs | Count of active IPOs for this club |
| Average DPC price | `Avg XX $SCOUT` |
| Countdown | Time until earliest IPO ends for this club |
| "Hot" badge | Shown if club has high trading volume (trending) |

**Tap behavior:** Opens accordion below the tile, closes any other open accordion.

**When filters are active:** Hide clubs that have 0 matching players.

### 5. Club Accordion (expanded)

When a club tile is tapped:

- Only one club can be open at a time (tap another = close current, open new)
- Club header row with logo, name, close button
- Players grouped by position: TW > DEF > MID > STU
- Each position group has a small header: `DEF (4)` with count

**Player row within accordion:**

| Element | Description |
|---------|-------------|
| PlayerIdentity | Photo + name + club (using shared component) |
| Position badge | Small colored badge |
| L5 score | Color-coded via `getL5Color()` |
| DPC price | `fmtScout()` formatted, gold color |
| Countdown | Compact format: `2T 14:30:22` |
| Countdown color | Green >7d, Orange <3d, Red <24h, Pulsing red <1h |
| Buy button | Gold-themed, compact |

### 6. Countdown Color Logic

```
> 7 days:   text-white/50 (neutral, no urgency)
3-7 days:   text-vivid-green (plenty of time)
1-3 days:   text-orange-400 (getting close)
< 24 hours: text-vivid-red (urgent)
< 1 hour:   text-vivid-red + animate-pulse (critical)
```

Applied at both:
- Club tile level (earliest ending IPO of that club)
- Player row level (individual IPO countdown)

## Tabs Structure (updated)

```
Kaufen
  +-- Club Verkauf  (this design)
  +-- Transferliste (existing, untouched)
  +-- Trending      (new tab, built later — placeholder only)
```

## Data Flow

```
KaufenTab
  |-- HotSalesCarousel (placeholder)
  |-- LeagueDropdown (filters state in marketStore)
  |-- GlobalFilterBar (reuses MarketFilters logic)
  |-- ClubTileGrid
  |     |-- ClubTile (per club, computed from playerMap + activeIpos)
  |     |-- ClubAccordion (expanded, only 1)
  |           |-- PositionGroup "TW"
  |           |     |-- PlayerIPORow (per player)
  |           |-- PositionGroup "DEF"
  |           |-- PositionGroup "MID"
  |           |-- PositionGroup "STU"
```

### Store Changes (marketStore)

New state needed:
- `clubVerkaufLeague: string` — selected league filter ('' = all)
- `clubVerkaufExpandedClub: string | null` — which club accordion is open (only 1)
- `kaufenSubTab: 'clubverkauf' | 'transferliste' | 'trending'` — add trending option

Reuse existing:
- `filterPos`, `filterMinL5`, `filterOnlyFit`, `marketSortBy` — global filters

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `HotSalesCarousel` | `market/HotSalesCarousel.tsx` | Placeholder carousel for featured slots |
| `ClubVerkaufSection` | `market/ClubVerkaufSection.tsx` | Main container: dropdown + filters + grid + accordion |
| `ClubTile` | `market/ClubTile.tsx` | Individual club card in the grid |
| `ClubAccordion` | `market/ClubAccordion.tsx` | Expanded view with position-grouped players |
| `PlayerIPORow` | `market/PlayerIPORow.tsx` | Compact player row within accordion |
| `CountdownBadge` | `market/CountdownBadge.tsx` | Countdown with urgency color logic |

### Modified Components

| Component | Change |
|-----------|--------|
| `ClubSaleSection.tsx` | Replace entirely with `ClubVerkaufSection` |
| `KaufenDiscovery.tsx` | Update to use new `ClubVerkaufSection` when `kaufenSubTab === 'clubverkauf'` |
| `marketStore.ts` | Add `clubVerkaufLeague`, `clubVerkaufExpandedClub`, update `KaufenSubTab` type |

### Deleted Components

| Component | Reason |
|-----------|--------|
| `ClubSaleSection.tsx` | Replaced by `ClubVerkaufSection` |

## Deferred (Phase 2)

- Hot Sales booking logic (club pays for featured slot)
- Trending tab with hype-score algorithm
- Club-level analytics for promoted slots (impressions, clicks, conversions)

## i18n Keys (new, estimated)

~20-25 new keys needed for:
- League dropdown labels
- Club tile labels (available DPCs, average price, hot badge)
- Position group headers
- Countdown urgency labels
- Empty states per section
- Trending tab placeholder

## Success Criteria

1. A fan who doesn't know the players can browse by league > club > position
2. Club identity (colors, logo) is visible at every level
3. Countdown is prominent — urgency drives purchases
4. Structure holds at 20 clubs / 500+ players without becoming chaotic
5. Hot Sales slot is visually reserved (placeholder) for future monetization
6. Mobile-first: everything works on 375px width, touch targets 44px+
