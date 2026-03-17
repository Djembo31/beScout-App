# Sorare Benchmark Analysis for BeScout Player Detail Redesign

> Research date: 2026-03-15
> Purpose: Inform BeScout player detail page redesign (3-tab model: Trading / Performance / Community + Sticky Dashboard Strip)
> BeScout context: Dark mode (#0a0a0a), Gold (#FFD700) accent, DPC trading, fantasy, scouting research

---

## 1. Player Card Design: The Collectible Aesthetic

### Rarity Tier System

Sorare uses 5 rarity tiers with strict color-coding and supply caps:

| Tier | Color | Supply/Season | Visual Treatment |
|------|-------|---------------|------------------|
| Common | Gray/White | Unlimited | Flat, muted frame |
| Limited | Yellow/Gold | 1,000 per player | Warm gold frame, subtle shimmer |
| Rare | Red | 100 per player | Rich red frame, increased visual weight |
| Super Rare | Blue | 10 per player | Deep blue frame, premium glow |
| Unique | Black/Gold | 1 per player | Black frame with gold accents, maximum prestige |

This strict scarcity pyramid (1000 / 100 / 10 / 1) makes the visual hierarchy immediately legible.

### Card Layout Elements

The card itself is a carefully composed artifact:

- **Top-left:** Season year + serial number (e.g., 2024-25 #047/1000)
- **Top-right:** Club logo + shirt number
- **Center:** Player photo with a shield/frame surround, designed to make the player pop from the background
- **Bottom:** Player name, position, age at minting
- **Special badges:** #1 serial gets a distinctive badge; jersey-number-matching serials get a special badge; rookies get a Rookie badge bottom-left

### 3D and Animation Effects

Sorare invested heavily in making cards feel like physical collectibles in a digital space:

- **3D Card Design 2.0 (2023-24):** Cards have depth -- a visible frame connects front and back, creating a physical-object illusion. Dynamic reflections and lighting respond to rotation.
- **AR Integration:** Cards viewable in real-world surroundings via the Sorare app (stadium, home, etc.)
- **Tilt/Rotate:** Cards respond to device orientation or mouse movement with parallax effects
- **Animated Backgrounds (2024-25):** 6 exclusive animated styles per season: Chrome (metallic trophy shimmer), Stadium (atmospheric crowd visuals), Waves (hypnotic ball-motion swirl), Magma (flowing red-hot lava), Lightning (electrical spark effects), Fragments (fractured record-breaking shards)
- **Holo Variant:** Ultra-rare holographic treatment, only 22 cards per European competition. Owners get physical perks (tickets, signed jerseys).
- **Sorare 26 Shiny Editions:** Glitchball, Digital Blaze, Neon Grid, Matrix, Legacy -- each with unique animated effects and a 10% base reveal rate

### The Emotional Design Philosophy

Sorare co-founder stated the goal explicitly: cards should feel special and owners should want to show them off. The design decisions consistently serve this:

1. **Scarcity is visual** -- you see rarity before reading stats
2. **Animation = aliveness** -- cards are not static JPEGs, they breathe
3. **Physical metaphors** -- 3D depth, AR placement, frame = I hold something
4. **Progressive reveal** -- when earning/buying a card, the tier is revealed first, then club, then the card itself bottom-to-top. This builds anticipation
5. **Season-specific designs** -- cards from different seasons look different, creating a timeline of ownership

### BeScout Relevance

BeScout TradingCardFrame.tsx already has position-based glow rings, tilt effects (useTilt hook), and a FIFA-style stat layout. The foundation is there. What is missing vs. Sorare: animated backgrounds, the physical object depth illusion, and the progressive reveal ceremony.
---

## 2. Player Detail Layout

### Sorare Information Architecture

Sorare player detail page (and the companion SorareData platform) organizes information into distinct tabs:

| Tab | Contents |
|-----|----------|
| **Overview** | L5/L15/L40 score averages, current card supply across all scarcities, best market prices, valuations |
| **SO5 Scores** | Score graph over time, per-match breakdown (minutes played, position, Decisive Score, All-Around Score) |
| **Price** | Market indices, price graph over time, transaction details, scarcity/currency filters |
| **Live Market** | All available cards for this player (auctions + manager sales), open and completed transactions, date range filters |

### The Stats + Trading Duality

This is the core design challenge both Sorare and BeScout face. Sorare approach:

1. **Card is always visible** -- The player card (with current form indicator) stays anchored while you explore tabs
2. **L5 as the universal metric** -- The L5 (last 5 games average) appears on the card itself AND in the overview, creating a single number that bridges performance and value
3. **Price and performance side by side** -- The Overview tab combines both. You see L5/L15/L40 averages next to market prices and supply counts in a single view
4. **Dedicated price tab** -- For deep market analysis, there is a separate Price tab with charts and transaction history
5. **Form indicator on cards** -- A small bar/strip on the left side of the card showing L5 form, visible in all contexts (gallery, market, lineup)

### Key Layout Patterns

- **Above-the-fold:** Card visual + key numbers (L5, price, supply) -- the should-I-care zone
- **Tabs below:** Deeper analysis organized by intent (performance, price, market availability)
- **Filters everywhere:** Scarcity filters persist across tabs
- **Score graph as centerpiece:** The SO5 Scores tab main visualization is a line graph of scores over time, immediately showing form trajectory

---

## 3. Market/Trading UX

### Marketplace Structure

Sorare runs two parallel markets:

**Primary Market (from Sorare):**
- **Auctions:** Timed bidding (eBay-style). Card detail shows current bid, time remaining, player score. Max-bid feature for automatic bidding.
- **Instant Buy (2024+):** Fixed-price purchases for Limited and Rare cards. One-click buy flow. Price set to not undercut secondary market.

**Secondary Market (Manager Sales):**
- Fixed-price listings with Buy Now button
- Private offers and negotiated trades (including multi-card swaps)
- Listings expire after 7 days by default, cancellable anytime
- 5% platform fee on all sales

### What is Shown During Purchase

Card detail during buying shows: Card rarity (color-coded), Serial number, Player current form (L5), Current price / current bid, Seller notes (secondary market), Time remaining (auctions).

### Price History and Market Intelligence

- Price chart over time with per-transaction drill-down
- Sorting options: Newly Listed, Ending Soon, Highest Price, Lowest Price, Highest Average Score
- Filters: Player name, team, position, rarity, season
- Card supply counts per scarcity level
- SorareData adds: ETH earnings history per card, ROI tracking, transaction ledger

### Trading Actions Prominence

Trading is not buried. On any player page: Available listings are one tab away (Live Market). Price data is in the Overview (not hidden). From any card you own, listing is one click. The marketplace is a top-level navigation item, not a sub-menu.
---

## 4. Fantasy Integration

### Score-to-Lineup Connection

Sorare fantasy system is deeply intertwined with the card/trading system:

- **Cards ARE lineup entries** -- you do not pick players, you play cards you own
- **Card XP progression** -- using a card in competitions earns XP, increasing its power bonus
- **Captain selection** -- one card per lineup gets a 50% score bonus
- **Position slots:** GK, DEF, MID, FWD, + Extra (any outfield) -- 5 cards per lineup
- **Card once-per-gameweek:** Each card can only be used in one competition per gameweek

### Player Page to Lineup Flow

The connection is indirect but strong: Player pages show L5/L15/L40 scores prominently (the same metrics used for lineup decisions). Card supply and availability shown alongside performance. No dedicated Use in Lineup button on the player page -- the Lineup Builder has its own interface with search/filter. The Lineup Builder displays: player photo, name, team, position, recent performance snapshot, XP bonus percentage.

### Lineup Builder UX

- Walk-through interface: 5 empty slots to fill
- Per-position filtering with eligibility checks
- L15 scores + positional averages against upcoming opposition visible during selection
- Captain designation after lineup is set
- Deadline: Friday 16:00 CET for most competitions

### Competition Tiers

- **Rivals:** Head-to-head, accessible (Common cards allowed)
- **Pro:** Competitive, requires paid cards (Limited+)
- **Mega 3/5/8:** Different lineup sizes for different competition levels

---

## 5. Score Presentation

### The Scoring System

Sorare uses a 0-100 scale with two components:

- Player Score = Decisive Score (DS) + All-Around Score (AAS)
- DS = Goals, assists, penalties, clean sheets (high-impact events)
- AAS = Passes, tackles, interceptions, duels (cumulative contribution)
- Base: 35 points for starting. Maximum: 100.

This is powered by Opta data with 48+ stat categories.

### Visualization on Player Pages

1. **Score graph:** Line chart showing scores over time, with visual form trajectory
2. **L5 average:** Average of last 5 games, shown prominently on card AND page
3. **L15 average:** Broader form indicator, shown in overview
4. **L40 average:** Season-level consistency metric
5. **Per-match breakdown:** Each game shows minutes played, position played, DS and AAS components separately
6. **Form indicator strip:** Small bar on the left side of cards showing L5 as a color-coded indicator
7. **Decisive action icons:** Small icons on score displays corresponding to goals, assists, clean sheets

### What Makes This Effective

- **Three timeframes (L5/L15/L40)** let you see: hot streak vs. consistent vs. season trajectory
- **DS vs. AAS split** reveals whether a player scores from one lucky goal or genuine consistent performance
- **The 0-100 scale** is universally intuitive -- no explanation needed
- **Form indicator on the card itself** means you never see a card without context about current form

---

## 6. Mobile Experience

### Navigation Structure

Sorare mobile app uses: Bottom tab bar with primary sections (Play, Market, My Club, etc.), Swipe navigation between related views (This Week / Last Week / Upcoming), Date picker for historical gameweek navigation.

### Information Density Approach

1. **Progressive disclosure:** Start with summary (score, rank, key stats), tap to expand
2. **Card as information container:** The card visual itself carries data (rarity, form indicator, club, position) reducing the need for text labels
3. **Competition view:** Shows overall score, opponent scores, rank position, with small decisive-action icons -- dense but readable
4. **Persistent login:** Mobile stays logged in (vs. desktop which required frequent re-auth)

### What Works on Mobile

- Swipe between related temporal views is natural
- Card-as-visual-summary reduces text clutter
- Score + decisive action icons = high information density without overwhelm

### What Fails on Mobile

User reviews consistently cite:
- **Core functions missing:** Selling cards, managing wallets reported as severely flawed or missing on mobile
- **Frequent crashes and login failures**
- **Navigation confusion:** Layout keeps changing and confuses returning users
- **Cards disappearing** from galleries (bugs, not design)

### Recent Navigation Improvements (2025-26)

Sorare redesigned navigation: Home Page upgrade (follow top squads, track progress in real time), My Lineups tab retired (reduced confusion), Scout Tab added (live match scores), My Cards improved, Notification Center cleaned up.
---

## 7. What BeScout Should Steal

### 7.1 The L5 as Universal Currency

Sorare L5 average appears EVERYWHERE -- on cards, in listings, in lineup builder, on player pages. It is the single number that bridges how good is this player and how much is this card worth. BeScout already calculates L5 (getL5Color/Hex/Bg). The redesign should make L5 the persistent, ever-visible anchor metric -- in the sticky dashboard strip, on every card representation, in every trading context.

**Implementation:** L5 badge visible in the sticky dashboard strip at all times, color-coded by BeScout existing L5 color system.

### 7.2 Three-Timeframe Form Display (L5 / L15 / Season)

Sorare L5/L15/L40 trio elegantly answers three questions: L5 = Is this player hot RIGHT NOW? L15 = Is this a real trend or a blip? L40/Season = Can I trust this player long-term?

**Implementation:** Performance tab should prominently display all three with trend arrows. The dashboard strip could show L5 with a micro-sparkline.

### 7.3 Score Graph as Performance Centerpiece

The line chart of scores over time is the most powerful visualization on Sorare player pages. It instantly communicates form trajectory, injury gaps, and consistency.

**Implementation:** BeScout GameweekScoreBar.tsx already shows per-GW scores. Upgrade to a continuous line/area chart with hover-to-inspect per-gameweek details.

### 7.4 Form Indicator on Every Card Representation

Sorare embeds a small form strip on the left side of every card appearance. You never see a player card without form context.

**Implementation:** Add a 3-4px vertical gradient bar on the left edge of PlayerRow and TradingCardFrame, colored by L5 performance (green = hot, amber = average, red = cold).

### 7.5 Card-as-Visual-Summary for Mobile

On mobile, Sorare card visual itself carries: rarity, club, position, form, season. This reduces text overhead dramatically.

**Implementation:** BeScout TradingCardFrame.tsx already has the foundation (position glow, tilt effect). Use it more aggressively in mobile contexts -- the card IS the hero, not a thumbnail next to text.

### 7.6 Progressive Card Reveal

When you earn or buy a card on Sorare, the reveal is theatrical: tier first, then club, then the card from bottom to top. This turns a transaction into a moment.

**Implementation:** After a DPC purchase (Buy or IPO), show a 2-3 second reveal animation: position color glow -> club badge -> player photo -> You own X DPCs confirmation. CSS animations, no heavy library needed.

### 7.7 Price + Supply in Overview (Not Hidden in Market Tab)

Sorare Overview tab shows card supply counts and best market prices alongside L5/L15 averages. You do not have to switch tabs to see the trading opportunity.

**Implementation:** BeScout sticky dashboard strip should include: floor price, your holdings count, and total supply -- always visible regardless of active tab.

### 7.8 Decisive Action Icons

Sorare uses small icons next to scores to show goals, assists, clean sheets at a glance. High-density information with zero cognitive load.

**Implementation:** Add micro-icons (goal ball, assist arrow, clean sheet shield) next to gameweek scores in the Performance tab. BeScout already has the stat data from API-Football.

### 7.9 Sorting by Performance in Market

Sorare lets you sort market listings by Highest Average Score -- bridging the performance/value gap in the marketplace.

**Implementation:** In the Trading tab orderbook section, allow sorting by price AND by volume. Performance-informed trading UX.

### 7.10 The Shield Frame Composition

Sorare places a shield/frame around the player photo that creates visual separation from the background and elevates the player as the centerpiece.

**Implementation:** TradingCardFrame.tsx should use a subtle shield/border element around the player photo area, with position-colored accents.
---

## 8. What BeScout Should NOT Copy

### 8.1 NFT/Blockchain Complexity

Sorare blockchain layer creates real UX friction: Token IDs, wallet addresses, gas fees (even though abstracted). Your-card-is-an-NFT messaging confuses mainstream football fans. External marketplace fragmentation (OpenSea, Blur, etc.).

**BeScout advantage:** DPCs are database records with clean CRUD operations. No blockchain UX tax. Keep it simple.

### 8.2 Per-Card Uniqueness Model

In Sorare, each card is unique (different serial number, different XP level). This creates: Paradox of choice when buying. Confusing price variation within the same player/rarity. Complex valuation (serial #1 costs 10x serial #500).

**BeScout advantage:** DPCs are fungible within a player. 1 DPC of Player X = 1 DPC of Player X. Dramatically simpler buy/sell flow and price display.

### 8.3 Card-Locked Fantasy

Sorare requires you to OWN cards to play competitive fantasy (Free tier limited to Commons). This is a paywall that frustrates beginners.

**BeScout advantage:** Fantasy is FREE for everyone. DPC ownership is a separate value proposition.

### 8.4 Complex Rarity/XP/Bonus Stacking

Sorare bonus system is layered: rarity + XP level + collection + captain + serial number bonuses. Even experienced users need third-party tools to understand card true power.

**BeScout advantage:** Keep scoring clean. No rarity tiers for DPCs. No XP bonuses. Fantasy scoring is pure performance.

### 8.5 Constantly Changing UI

The #1 UX complaint on Sorare Trustpilot: Layout keeps changing and confuses returning users.

**BeScout lesson:** Once the 3-tab redesign ships, commit to the information architecture for at least 6 months. Iterate within tabs, not on the tab structure.

### 8.6 Season-Based Card Obsolescence

Sorare cards become classic after their season, with severely reduced utility and crashed value. Users feel betrayed.

**BeScout advantage:** DPCs do not expire. Ownership persists until you sell or the player is liquidated (with Community Success Fee payout).

### 8.7 External Tool Dependency

Sorare first-party player page is so limited that the community built entire parallel platforms (SorareData, SorareScore, SorareOptim). This means their own UX failed to serve core user needs.

**BeScout lesson:** Build the analytics INTO the player page. The three-tab model should cover everything without leaving the platform. BeScout PriceChart.tsx, RadarChart.tsx, GameweekScoreBar.tsx, ScoutConsensus.tsx, DPCSupplyRing.tsx, and OrderbookDepth.tsx already exist -- compose them into a cohesive experience.

### 8.8 Crypto/Investment Framing

Sorare positions cards as assets and leans into financial returns. This creates regulatory risk.

**BeScout compliance:** DPCs are Digital Player Contracts (not assets, not investments). SCOUT is Platform Credits (not cryptocurrency). Language discipline is non-negotiable.
---

## 9. Synthesis: The Redesigned Player Detail Page

Based on this analysis, the optimal BeScout player detail page should combine:

### Sticky Dashboard Strip (Always Visible)
Stolen from Sorare card-always-visible pattern but adapted:
- Player photo (small) + Name + Position badge + Club
- L5 score (color-coded) + trend arrow
- Floor price + your holdings count
- Quick action buttons: Buy / Sell (if holding)
- Scrolls with the page on mobile, stays fixed on desktop

### Tab 1: Trading
- DPC supply ring (current holdings / total supply / floor price)
- Price chart (line graph over time, Sorare-style)
- Orderbook depth visualization
- Buy/Sell flow (one-click for market orders, modal for limits)
- Recent trades (chip-style, already exists as TradeHistoryChips.tsx)
- Community Success Fee estimate

### Tab 2: Performance
- Score graph: Line/area chart of GW scores over time (Sorare centerpiece pattern)
- L5 / L15 / Season averages with trend indicators
- Per-GW breakdown with decisive action icons (goals, assists, clean sheets)
- Radar chart for multi-dimensional stats (already exists)
- Season stats table (minutes, goals, assists, etc.)
- Upcoming fixture with opponent strength indicator

### Tab 3: Community
- Scout Consensus (bull/bear/neutral sentiment, already exists)
- Research posts with upvotes
- Community valuation vs. market price
- Scouting reports
- DPC Mastery card (engagement depth)

### Post-Purchase Reveal Animation
- Theatrical DPC acquisition moment (Sorare progressive reveal pattern)
- Position glow -> club badge -> player photo -> You own X DPCs -> confetti

---

## 10. Priority Implementation Ranking

| Priority | Pattern | Effort | Impact |
|----------|---------|--------|--------|
| P0 | Sticky Dashboard Strip (L5 + price + holdings) | Medium | Massive -- removes tab-switching friction |
| P0 | Score graph (line chart with hover details) | Medium | Core Performance tab centerpiece |
| P1 | L5/L15/Season trio display | Small | Bridges performance and trading intent |
| P1 | Form indicator bar on card representations | Small | Ubiquitous context, zero extra space |
| P1 | Decisive action icons on GW scores | Small | High-density, delightful detail |
| P2 | Progressive DPC purchase reveal | Medium | Emotional ownership moment |
| P2 | Shield frame on TradingCardFrame | Small | Subtle premium elevation |
| P3 | Animated card backgrounds | Large | Long-term collectible differentiation |
| P3 | AR/3D card interactions | Very Large | Not priority for pilot |

---

## Sources

- [Sorare 2024-25: A new era for card design](https://sorare.com/blog/football/sorare-2024-25-a-new-era-for-card-design)
- [Sorare 26: The New Card Design Is Here](https://sorare.com/blog/football/sorare-26-the-new-card-design-is-here)
- [Sorare Card Design 2.0](https://medium.com/sorare/sorare-card-design-2-0-how-3d-football-cards-came-to-life-27a1df9ea22b)
- [Connecting Two Worlds with New Card Designs](https://medium.com/sorare/connecting-two-worlds-with-our-new-card-designs-6d3da8d39e31)
- [Sorare AR 3D Cards](https://decrypt.co/154975/sorare-launches-ar-equipped-3d-digital-football-player-cards)
- [Updated Sorare Card Design](https://www.wesorare.com/en/news/updated-sorare-card-design/)
- [Card Types on Sorare](https://sorare-fum.eu/card-types-sorare/)
- [Sorare Marketplace](https://sorare-fum.eu/sorare-marketplace/)
- [Guide to Sorare Data](https://sorarescout.com/guides/the-guide-to-sorare-data/)
- [Player Score Calculation](https://help.sorare.com/hc/en-us/articles/4402897588241-How-is-the-Player-Score-calculated-PS)
- [The Sorare App Guide](https://sorarescout.com/guides/the-sorare-app/)
- [Getting Started on Sorare 2024/25](https://laligaexpert.com/2024/10/17/sorare-guide/)
- [Navigation Improvements](https://sorare.com/blog/navigation-improvements-on-sorare-website-and-app)
- [What is Sorare? 2025/2026](https://sorareceo.com/what-is-sorare/)
- [Sorare Instant Buy](https://medium.com/sorare/sorare-launches-instant-buy-for-new-cards-onweb-and-mobile-983848a7d43f)
- [Sorare Reviews on Trustpilot](https://www.trustpilot.com/review/sorare.com)
- [Sorare Marketplace Updates](https://medium.com/sorare/sorare-football-marketplace-updates-manager-sales-fees-listings-2e547f056266)