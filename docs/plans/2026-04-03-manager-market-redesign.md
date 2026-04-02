# Manager + Market Redesign — Design Doc

> Approved by Anil, 2026-04-03. Session 282.

## Problem

The current Market page ("Manager Office") combines team management and trading
in one tab-based view. It works technically but fails emotionally:

- No manager feeling — it's an admin tool, not a dugout
- Team and Market are separate mental worlds forced into tabs
- User must constantly switch between pages to get context (Fantasy events, results, stats)
- Traders who think in P&L/charts and managers who think in formations are served by the same flat UI
- "We show everything, but not properly" — data exists, presentation lacks

## Solution

Split into two dedicated experiences that complement each other:

- **`/manager`** — The Dugout. Think, plan, prepare. Pitch-centric command center.
- **`/market`** — The Transfermarkt. Shop, trade, invest. Brokerage-style portfolio + marketplace.

Connected by deep-links: Manager says "I need a DEF" → opens Market filtered to DEF.
Market says "bought a player" → offers "assign in Manager now?"

## Target Users

| Persona | Primary Page | What They Want |
|---------|-------------|----------------|
| **The Manager** | `/manager` | Formation, tactics, player fitness, event prep, results review |
| **The Trader** | `/market` | Portfolio P&L, price charts, order book, best deals, quick sell |
| **Both** | Cross-link | Most users switch between modes — deep-links make this seamless |

---

## `/manager` — Command Center

### Layout (Desktop, lg+)

```
+-----------------------------------------------------------+
|  STATUS BAR                                                |
|  Kader: 3 fit, 1 fraglich, 1 verletzt | Event: Cup in 2d  |
|  (11er, 3 DPC locked) | Portfolio +12%                    |
+-----------------------------+-----------------------------+
|                             |                             |
|  TACTICAL BOARD             |  INTEL PANEL                |
|                             |                             |
|  [Formation: 4-3-3 v]      |  [Stats] [Form] [Markt]    |
|                             |                             |
|       ATT  ATT  ATT        |  Spieler: Hakan Yilmaz      |
|                             |  L5: 78 | Fitness: 92%      |
|       MID  MID  MID        |  Letzte 5: 6.8 7.2 8.1 ... |
|                             |  Naechster: Goeztepe (A)    |
|     DEF DEF DEF DEF        |  Floor: 1.250 $SCOUT        |
|                             |  Trend: +8% (7d)            |
|           GK               |  Event: verfuegbar           |
|                             |  Letztes Ergebnis: GW27 82p |
|  [Preset v] [Save] [Load]  |  [Transfermarkt ->]         |
|                             |  [Tauschen] [Verkaufen]     |
+-----------------------------+-----------------------------+
|  SQUAD STRIP (horizontal scroll)                           |
|  [GK] [DEF DEF DEF DEF DEF] [MID MID MID] [ATT ATT ATT]  |
|  Sort: Form | Wert | Fitness | Filter: Position            |
+-----------------------------------------------------------+
```

### Layout (Mobile)

```
+---------------------------+
| Status Bar (kompakt)      |
+---------------------------+
|                           |
|  TACTICAL BOARD           |
|  (full width, touch)      |
|                           |
+---------------------------+
| SQUAD STRIP (scroll)      |
| [GK] [DEF...] [MID...]   |
+---------------------------+
| Tap Spieler -> Bottom     |
| Sheet = Intel Panel       |
+---------------------------+
```

### Zone 1: Status Bar

Always visible, single row. Shows at a glance:

- **Squad Health:** Count of fit / doubtful / injured players with color dots
- **Next Event:** Name, format (6er/11er), days until deadline, DPC lock count
- **Portfolio Trend:** Total value change this week (percentage + direction arrow)

Tap on event section -> deep-link to event detail.
Tap on portfolio -> deep-link to `/market` portfolio tab.

### Zone 2: Tactical Board

The heart of the manager experience. A football pitch with your formation.

**Players displayed as:**
- Circle with player photo (or initials)
- L5 score badge (color-coded: gold >=80, white 60-79, red <60)
- Fitness dot (green/yellow/red) top-right
- Lock icon if committed to an event
- Injury icon if injured

**Interactions:**
- Tap player on pitch -> Intel Panel opens with their data
- Tap empty slot -> Squad Strip filters to matching position, Intel Panel shows "Slot leer — waehle einen Spieler"
- Long-press player -> drag to swap positions (desktop: drag & drop)

**Formation Picker:** Dropdown above pitch. Options: 4-3-3, 4-4-2, 3-5-2, 3-4-3, custom.
Changing formation repositions players intelligently (keep GK, redistribute field players by position).

**Presets:** Save/load named formations to localStorage.
- "Event-Aufstellung", "Stammelf", "Budget Squad"
- Load preset -> restores formation + player assignments

**Event Prep Mode:** Toggle that overlays event requirements on the pitch:
- Highlights which slots satisfy event requirements
- Shows DPC lock status per player
- Warns if a player is already locked in another event
- "X Spieler fehlen noch" counter

### Zone 3: Intel Panel

Desktop: fixed right panel (300-350px). Mobile: bottom sheet (swipe up).

**3 tabs within the panel:**

#### Tab: Stats
- L5 Performance score (large number + trend arrow)
- Last 5 match scores as mini bar chart
- Season stats: matches, goals, assists, minutes
- Fitness percentage + injury status
- Next fixture: opponent + home/away + date
- Age, contract, position

#### Tab: Form (Formkurve)
- Score history as sparkline chart (last 10 GWs)
- Last 3 event lineups this player was in (event name + your score)
- Last 3 match results for their club (score + player's individual score)
- Manager Points earned from this player

#### Tab: Markt
- Your holdings: quantity, avg buy price, current floor
- P&L for this player (absolute + percentage)
- 7-day price sparkline
- Active sell orders (yours)
- Quick actions: [Sell] [Place Buy Order]
- [Auf Transfermarkt ->] deep-link to `/market` with player focused

**When no player selected:** Panel shows squad summary:
- Squad value, average L5, weakest position, upcoming events

### Zone 4: Squad Strip

Horizontal scrollable bar at the bottom. Shows ALL your players (not just those on pitch).

- Grouped by position: GK | DEF | MID | ATT (with position-color dividers)
- Each player as compact card: photo, name (truncated), L5 badge, fitness dot
- Players ON the pitch have a checkmark overlay
- Players LOCKED for events have a lock badge
- Players INJURED have red overlay

**Sort options:** Form (L5) | Wert (Floor) | Fitness | Alphabetisch
**Filter:** Position buttons (all, GK, DEF, MID, ATT)
**Search:** Quick search field at the left of the strip

Tap player in strip -> Intel Panel shows their info.
Double-tap (or "Aufstellen" button in Intel Panel) -> assigns to appropriate pitch slot.

---

## `/market` — Transfermarkt

### Layout (Desktop, lg+)

```
+-----------------------------------------------------------+
|  HEADER BAR                                                |
|  Balance: 12.450 $SCOUT | Portfolio: 45.200 (+12%)        |
|  [Suche] [Filter]                                          |
+-----------------------------+-----------------------------+
|                             |                             |
|  MEIN PORTFOLIO             |  MARKTPLATZ                 |
|                             |                             |
|  Sort: Wert v               |  [Club Verkauf]             |
|                             |  [Transferliste]            |
|  +- Hakan Y. ------------+ |  [Trending]                 |
|  | 3x | +12% | 1.250     | |                             |
|  | ====--- Sparkline      | |  +- IPO: Sakaryaspor ----+ |
|  | [Sell] [-> Manager]    | |  | 12 Spieler | ab 800   | |
|  +------------------------+ |  | Endet in 18h          | |
|                             |  +------------------------+ |
|  +- Mehmet K. -----------+  |                             |
|  | 5x | -3%  | 980       |  |  +- Best Deal -----------+ |
|  | =------- Sparkline    |  |  | Ali V. | Floor < IPO  | |
|  | [Sell] [-> Manager]   |  |  | 890 $S | 2 Seller     | |
|  +------------------------+ |  +------------------------+ |
|                             |                             |
|  P&L Summary                |  Detail-Expand:             |
|  Winner: +450 | Loser: -80  |  Chart, Orderbook, Buy-Btn  |
|  Offene Orders (3)          |                             |
|  Eingehende Angebote (1)    |                             |
+-----------------------------+-----------------------------+
|  TICKER: Hakan Y. sold for 1.250 | Ali V. IPO 85% sold   |
+-----------------------------------------------------------+
```

### Layout (Mobile)

```
+---------------------------+
| Balance | Portfolio-Wert  |
+---------------------------+
| [Portfolio] [Marktplatz]  |
+---------------------------+
|                           |
| Full-screen content for   |
| active tab                |
|                           |
| Portfolio: Cards with     |
| sparklines, swipe-to-sell |
|                           |
| Marktplatz: IPOs top,     |
| Transferliste below,      |
| Trending as strip         |
+---------------------------+
```

### Zone 1: Header Bar

Always visible. Shows:
- **Balance:** Current $SCOUT balance
- **Portfolio Value:** Total holdings value + weekly trend percentage
- **Global Search:** Search any player across portfolio + market
- **Filter Button:** Opens shared filter panel (position, L5, price range)

### Zone 2: Mein Portfolio (Left Panel / Tab 1 Mobile)

Your holdings displayed as compact trading cards:

**Per-Player Card:**
- Player photo + name + position badge
- Quantity held
- P&L: percentage + absolute (color-coded: green positive, red negative)
- Floor price in $SCOUT
- 7-day sparkline (inline, ~60px wide)
- Quick actions: [Sell] [-> Im Manager anzeigen]

**Sort options:** Wert (total value) | P&L% | L5 | Position | Alphabetisch
**Group by:** Club (toggle)

**Below the holdings list:**
- **P&L Summary Card:** Total P&L, top winner, top loser
- **Offene Orders:** Your active sell orders with cancel option
- **Eingehende Angebote:** P2P offers received, accept/reject

### Zone 3: Marktplatz (Right Panel / Tab 2 Mobile)

Three sub-sections, shown as sub-tabs:

#### Club Verkauf (IPOs)
- Club cards in grid (2-col mobile, 3-col desktop)
- Each card: club crest, player count, price range, countdown
- "Hot" badge if >50% sold or ending <24h
- Followed clubs pinned to top
- Tap card -> expands to show all players grouped by position
- Each player: IPO price, progress bar, sentiment, buy button

#### Transferliste (P2P Market)
- Player rows with: photo, name, floor price, seller count, L5
- "Best Deals" filter: floor price below reference/IPO price
- Tap player -> inline expand: all open sell orders (order depth)
- Price chart (7d), buy button, quantity selector
- [Passt in mein Team?] -> deep-link to `/manager`

#### Trending
- Horizontal strip of top movers (max 8)
- Card: player, price change %, sparkline, quick buy

### Zone 4: Ticker Bar (Desktop only, optional/low priority)

Horizontal scrolling strip at bottom. Shows recent trades in real-time:
"Hakan Y. x2 for 1.250 $S | Ali V. IPO 85% sold | New listing: Mehmet K. at 950 $S"

Low priority — nice for trading floor atmosphere, not essential for v1.

---

## Deep-Link Bridges

### Manager -> Market
| Trigger | Target | Context Passed |
|---------|--------|----------------|
| Intel Panel: "Auf Transfermarkt ->" | `/market?player={id}` | Player focused in Marktplatz |
| Intel Panel: "Verkaufen" | `/market?sell={id}` | Opens sell modal for player |
| Empty slot: "Spieler suchen" | `/market?pos={pos}` | Marktplatz filtered by position |
| Status Bar: Portfolio trend tap | `/market` | Portfolio tab active |

### Market -> Manager
| Trigger | Target | Context Passed |
|---------|--------|----------------|
| Portfolio card: "Im Manager anzeigen" | `/manager?player={id}` | Intel Panel opens with player |
| After purchase: "Jetzt aufstellen?" | `/manager?assign={id}` | Player highlighted in Squad Strip |
| Marktplatz: "Passt in mein Team?" | `/manager?evaluate={id}` | Shows where player fits in formation |

### Implementation: URL search params parsed on mount, trigger corresponding UI state.

---

## Navigation Changes

### Current
```
SideNav:
  Home
  Fantasy
  Market (= Manager Office)    <-- wird aufgesplittet
  Community
  Player Detail
  Profile
  Club
```

### New
```
SideNav:
  Home
  Fantasy
  Manager                      <-- NEU: /manager (Dugout)
  Transfermarkt                 <-- NEU: /market (Brokerage)
  Community
  ...rest unchanged
```

Icons: Manager = shield/clipboard, Transfermarkt = trending-up/store

---

## Data Flow

### `/manager` needs (always loaded):
- `useEnrichedPlayers()` — all players with stats, holdings
- `useHoldings()` — quantities per player
- `useActiveIpos()` — for IPO badges
- `useRecentMinutes()` — last 5 match minutes
- `useNextFixtures()` — upcoming opponents
- `usePlayerEventUsage()` — locked for events
- `useHoldingLocks()` — qty locked in events
- `useUpcomingEvents()` — NEW: next 2-3 events with requirements

### `/manager` needs (on-demand, Intel Panel):
- `usePlayerScoreHistory()` — last 10 GW scores for sparkline
- `usePlayerEventHistory()` — past lineups/results for Form tab
- `usePriceHistory(playerId)` — 7d chart for Markt tab

### `/market` needs (always loaded):
- `useEnrichedPlayers()` — all players with holdings enrichment
- `useHoldings()` — portfolio
- `useAllOpenOrders()` — sell orders (P2P)
- `useWatchlist()` — favorites
- `useActiveIpos()` — running IPOs
- `useWallet()` — balance

### `/market` needs (tab-gated):
- `useAllPriceHistories()` — when Marktplatz tab active
- `useAnnouncedIpos()` — planned IPOs
- `useTrendingPlayers()` — trending section
- `useAllOpenBuyOrders()` — pending buy orders
- `useIncomingOffers()` — P2P offers

### Shared hooks (reused across both pages):
- `useEnrichedPlayers`, `useHoldings`, `useActiveIpos` — same queries, React Query cache shared
- Trade actions (buy/sell/cancel) — same mutations, same invalidation

---

## What Stays, What Changes, What's New

### Reuse (existing code, refactor into shared):
- `SquadPitch.tsx` — pitch visualization (enhance, don't rebuild)
- `BestandTab.tsx` logic — becomes Portfolio section in `/market`
- `KaderTab.tsx` logic — becomes Tactical Board in `/manager`
- `BuyConfirmModal` / `BuyOrderModal` — used in both pages
- `TradeSuccessCard` — used in both pages
- `MarketFilters` — shared filter logic
- `ClubVerkaufSection` — moves to `/market` Marktplatz
- `TransferListSection` — moves to `/market` Marktplatz
- `TrendingSection` — moves to `/market` Marktplatz
- `OffersTab` — moves to `/market` Portfolio (below holdings)
- `WatchlistView` — integrates into `/market` as filter/mode
- `OrderDepthView` — used in `/market` player detail expand
- `BestandSellModal` — used in both pages (sell action)

### Enhance (existing component, significant changes):
- `SquadPitch` -> add fitness dots, lock icons, injury overlay, event prep mode
- `KaderTab` -> strip out into Tactical Board + Intel Panel + Squad Strip
- `BestandTab` -> strip out into Portfolio cards with sparklines
- `marketStore` -> split into `managerStore` + `marketStore`

### New components:
- `StatusBar` — squad health + event countdown + portfolio trend
- `IntelPanel` — 3-tab context panel (Stats/Form/Markt)
- `SquadStrip` — horizontal player bar with filters
- `PortfolioCard` — compact holding card with sparkline and P&L
- `PortfolioSummary` — P&L overview, top winners/losers
- `TickerBar` — live trade feed (low priority)
- `EventPrepOverlay` — event requirements overlaid on pitch
- `FormationPicker` — dropdown with formation options

### New hooks:
- `useManagerData()` — orchestrates manager page data
- `useUpcomingEvents()` — next events with format/requirements
- `usePlayerScoreHistory(playerId)` — GW score history
- `usePlayerEventHistory(playerId)` — past lineup participation

### New queries (may need new RPCs):
- `get_upcoming_events_for_user` — events user can join, with requirements
- `get_player_score_history` — last N gameweek scores for a player
- `get_player_event_results` — events where player was in user's lineup + score

---

## Nicht in v1 (bewusst raus)

- Drag & drop auf Mobile (zu fummelig — tap-to-assign reicht)
- Ticker Bar (nice-to-have, nicht essential)
- "KI-Empfehlungen" fuer Transfers (spaeter)
- Taktik-Analyse ("deine Formation ist schwach gegen 3-5-2") (spaeter)
- Vergleichs-Tool im Intel Panel (spaeter)
- Push-Notifications bei Preis-Alerts (spaeter)

---

## Success Criteria

1. User kann Formation aufstellen und Event vorbereiten OHNE die Seite zu verlassen
2. User sieht Spieler-Stats, Form, und Markt-Daten in einem Panel
3. User kann vom Manager zum Market und zurueck navigieren mit Kontext (Player, Position)
4. Portfolio-View zeigt P&L mit Sparklines wie ein Brokerage
5. Mobile: Bottom Sheet fuer Intel Panel, kein Informationsverlust gegenueber Desktop
6. Bestehende Funktionalitaet (Buy/Sell/IPO/Offers) bleibt erhalten
7. Kein Feature-Verlust gegenueber aktuellem Manager Office
