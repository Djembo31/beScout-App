# Player Detail Page -- Information Architecture

> Date: 2026-03-15
> Scope: Restructuring the Player Detail page (~1880 lines, 5 tabs, ~25 data sections)
> Goal: Optimize for 3 user types (Trader, Fantasy Manager, Scout) with progressive disclosure

---

## 1. Data Grouping Analysis

### 1.1 Complete Data Inventory (Current State)

| # | Data Point | Current Location | Primary Consumer | Notes |
|---|-----------|-----------------|-----------------|-------|
| 1 | Player photo (TradingCardFrame) | Hero | All | Flippable card with front/back stats |
| 2 | Name, position, club, age, country | Hero | All | |
| 3 | Floor price + 24h change | Hero | Trader | Gold-highlighted, primary CTA |
| 4 | IPO price (when active) | Hero | Trader | Replaces floor when IPO live |
| 5 | Buy/Sell/Limit buttons | Hero (desktop) + MobileTradingBar | Trader | |
| 6 | Holder count | Hero badge | Trader | |
| 7 | Your holdings badge | Hero badge | Trader | |
| 8 | Status badges (IPO, liquidated) | Hero | Trader | |
| 9 | Watchlist toggle | Hero overflow | Trader | |
| 10 | Price alert | Hero overflow | Trader | |
| 11 | Share action | Hero overflow | All | |
| 12 | Compare link | Hero overflow | Scout | |
| 13 | L5 score circle | ScoreMasteryStrip | Fantasy/Trader | DUPLICATED: also in Profil quick stats, Statistik tab, TradingCard |
| 14 | L15 score circle | ScoreMasteryStrip | Fantasy/Scout | DUPLICATED: also in Statistik tab, TradingCard |
| 15 | Trend indicator (Hot/Cold/Stable) | ScoreMasteryStrip | Fantasy/Trader | DUPLICATED: also in Statistik tab |
| 16 | DPC Mastery (level, XP, progress) | ScoreMasteryStrip | Trader | Only shown if user holds DPCs |
| 17 | Trade history chips | Above tabs | Trader | Horizontal scroll, last 10 trades |
| 18 | L5 performance (quick stat) | Profil tab | Fantasy | Duplicate of #13 |
| 19 | 7-day price sparkline | Profil tab | Trader | |
| 20 | DPC supply count | Profil tab | Trader | |
| 21 | Holder count (quick stat) | Profil tab | Trader | Duplicate of #6 |
| 22 | Radar chart (8 axes) | Profil tab | Scout/Fantasy | Goals, assists, CS, matches, L5, L15, saves, minutes |
| 23 | Player info grid | Profil tab | All | Market value, position, nationality, holders |
| 24 | DPC supply ring | Profil tab | Trader | Supply/released/sold/owned/available |
| 25 | Contract status + burn timer | Profil tab | Trader/Scout | Urgency badges, progress bar |
| 26 | PBT widget | Profil tab | Trader | Treasury balance + inflow sources |
| 27 | Community valuation (slider) | Profil tab | All | Fair value median, user vote |
| 28 | Price chart | Markt tab | Trader | Trade-based time series |
| 29 | Orderbook depth | Markt tab | Trader | Aggregated sell orders by price level |
| 30 | Scout consensus | Markt tab | Trader/Scout | Bullish/Bearish/Neutral from research |
| 31 | Offers (bids) | Markt tab | Trader | Open buy offers from others |
| 32 | Sell order listings | Markt tab | Trader | Active sell orders |
| 33 | Transfer market orders (full table) | Markt tab | Trader | All sell orders with seller info |
| 34 | Trade history (full list) | Markt tab | Trader | All trades with buyer/seller |
| 35 | Price info grid | Markt tab | Trader | Club price, floor, last trade, 24h change, pool, circulation |
| 36 | Top owners | Markt tab | Trader/Scout | Ranked list with acceptance rate |
| 37 | Reward intro card | Rewards tab | Trader | Success fee explanation |
| 38 | Current market value + entry price | Rewards tab | Trader | |
| 39 | Reward ladder (tier visualization) | Rewards tab | Trader | Market value tiers with fee amounts |
| 40 | Potential earnings (if holding) | Rewards tab | Trader | Personalized reward projections |
| 41 | Score overview (L5/L15/season avg) | Statistik tab | Fantasy | Duplicate of #13, #14 |
| 42 | Form indicator | Statistik tab | Fantasy | Duplicate of #15 |
| 43 | Season stats (matches/goals/assists) | Statistik tab | Fantasy/Scout | |
| 44 | Season sparkline | Statistik tab | Fantasy | GW scores over time |
| 45 | Gameweek score bars | Statistik tab | Fantasy | Per-GW breakdown with bar chart |
| 46 | Sentiment gauge | Community tab | Scout | Based on 7-day trade data |
| 47 | Player takes (posts) | Community tab | Scout | User opinions with voting |
| 48 | Transfer rumors | Community tab | Scout | Categorized rumors with source/target |
| 49 | Research reports | Community tab | Scout | Premium research cards |
| 50 | Create post / Create rumor modals | Community tab | Scout | UGC creation |
### 1.2 Duplication Map

| Data Point | Locations | Recommendation |
|-----------|----------|----------------|
| L5 Score | Hero (TradingCard), ScoreMasteryStrip, Profil quick stats, Statistik tab, TradingCard back | Keep in 2 places max: Dashboard strip + Statistik deep dive |
| L15 Score | ScoreMasteryStrip, Statistik tab, TradingCard front+back | Keep in 2 places max |
| Trend (Hot/Cold) | ScoreMasteryStrip, Statistik tab | Keep only in dashboard strip |
| Holder Count | Hero badge, Profil quick stats, Profil player info grid | Single location: dashboard strip |
| Floor Price | Hero, MobileTradingBar, TradingCard (FLOOR stat), Markt price info | Keep in hero + mobile bar only |
| 24h Change | Hero, MobileTradingBar, Markt price info | Keep in hero + mobile bar only |
| DPC Circulation | Profil DPC ring, Markt price info grid | Consolidate to one section |
| Holdings (owned) | Hero badge, MobileTradingBar, Rewards tab | Keep in hero + mobile bar |
| Radar chart data | Profil tab, TradingCard back | Keep in one canonical location |
### 1.3 Misplaced Data Points

| Data Point | Current Tab | Should Be In | Reasoning |
|-----------|------------|-------------|-----------|
| 7-day price sparkline | Profil | Trading/Market | Price data is a trading signal, not a profile attribute |
| DPC supply ring | Profil | Trading/Market | Supply/demand is trading context |
| PBT widget | Profil | Rewards or Trading | Financial returns belong with rewards |
| Community valuation | Profil | Trading/Market or Community | Crowd signal -- market intelligence or community feature |
| Scout consensus | Markt | Could be cross-cutting | Bridges market and community |
| Contract status | Profil | Could be cross-cutting | Affects both trading (burn risk) and scouting (transfer potential) |
| Sentiment gauge | Community | Could be cross-cutting | Trade-based sentiment is market data presented as community feature |

---

## 2. User Journey Mapping

### 2.1 Trader Journey (Should I buy/sell/hold this DPC?)

**Step 1: IDENTIFY** -- Who is this player? Hero: Name, club, position, photo.

**Step 2: PRICE CHECK** -- What does it cost? Hero: Floor price, 24h change. Dashboard: L5 (performance proxy for price direction).

**Step 3: SIGNAL SCAN** -- Which direction? Quick: Trend indicator, 7d sparkline, holder count. Medium: Scout consensus, community valuation. Deep: Research reports, sentiment gauge.

**Step 4: SUPPLY ANALYSIS** -- Can I get in/out? Quick: Orderbook depth, sell orders count. Deep: Full order book, trade history.

**Step 5: UPSIDE ASSESSMENT** -- What could I earn? Quick: Current market value vs entry. Deep: Reward ladder, potential earnings, PBT treasury.

**Step 6: EXECUTE** -- Buy, sell, or set limit. Action: Buy/Sell modal, limit order, price alert.

**Pain points in current layout:**
- Steps 2-3 are split across Hero, ScoreMasteryStrip, Profil tab, and Markt tab
- Step 5 requires navigating to a separate Rewards tab
- Step 4 requires scrolling deep into Markt tab (past price chart, orderbook, consensus, offers)
- No at-a-glance signal summary

### 2.2 Fantasy Manager Journey (Should I pick this player for my lineup?)

**Step 1: IDENTIFY** -- Who is this player? Hero: Name, club, position.

**Step 2: FORM CHECK** -- Is he performing? Quick: L5 score, trend indicator. Medium: L15, season average.

**Step 3: FIXTURE CONTEXT** -- What are the upcoming games? **[MISSING]** -- Not available on player page at all.

**Step 4: STAT DEEP DIVE** -- How consistent? Medium: Gameweek score bars. Deep: Season sparkline, full GW breakdown.

**Step 5: COMPARE** -- Better than alternatives? Compare link in overflow menu (buried).

**Step 6: DECIDE** -- Pick or skip. No action on this page -- happens in Fantasy lineup builder.

**Pain points in current layout:**
- Step 2 data (L5/L15/trend) appears 4+ times but requires scrolling to find the meaningful version
- Step 3 (upcoming fixtures) is completely absent -- a critical gap
- Step 5 (compare) is hidden in an overflow menu behind a three-dot icon
- No fantasy-specific score context (e.g. top 15% of MIDs this GW)

### 2.3 Scout Journey (What is this player story?)

**Step 1: IDENTIFY** -- Hero: Name, club, position, age, nationality.

**Step 2: PROFILE SCAN** -- Quick: Radar chart, season stats. Medium: Contract status, market value.

**Step 3: READ COMMUNITY** -- Medium: Research reports, player takes. Deep: Transfer rumors, sentiment gauge.

**Step 4: CONTRIBUTE** -- Action: Create post, create rumor. Deep: Write full research report.

**Step 5: TRACK** -- Action: Watchlist, price alert (both buried in overflow).

**Pain points in current layout:**
- Step 2 is split between Profil tab (radar, stats) and Statistik tab (detailed stats)
- Step 3 requires clicking to Community tab, then scrolling past sentiment gauge
- The radar chart in Profil tab duplicates TradingCard back face
- No player timeline/career narrative

### 2.4 Journey Overlap and Divergence

|  | TRADER | FANTASY | SCOUT | Notes |
|--|--------|---------|-------|-------|
| Hero (identity) | Critical | Critical | Critical | ALL SHARE |
| Price/floor | Critical | Minor | Minor | Trader primary |
| L5/Trend | Useful | Critical | Useful | Fantasy primary |
| Radar/Stats | -- | Useful | Critical | Scout primary |
| Orderbook/Orders | Critical | -- | -- | Trader only |
| GW Scores | -- | Critical | Useful | Fantasy primary |
| Research/Posts | -- | -- | Critical | Scout primary |
| Rewards/PBT | Critical | -- | -- | Trader only |
| Contract | Useful | -- | Critical | Scout + Trader risk |

**Key insight:** The 3 user types share identity (hero) and diverge heavily after that. The current 5-tab structure does not align with these 3 journeys -- it fragments trading data across Profil/Markt/Rewards, and fragments performance data across Profil/Statistik.

---

## 3. Progressive Disclosure Strategy

### Layer 0 -- Above the Fold (Always Visible, 0 Scrolls)

**Purpose:** Answer who is this? and what is the one number I care about? in under 2 seconds.

| Element | Data | Rationale |
|---------|------|-----------|
| TradingCardFrame | Photo, name, club, position, L5, key stats | Visual identity anchor |
| Price strip | Floor price, 24h change, IPO badge | Primary trading signal |
| CTA buttons | Buy, Sell (desktop) | Immediate action availability |
| Dashboard strip | 6 key metrics (see Section 5) | Cross-cutting snapshot |

**What to remove from current above-fold:**
- Separate ScoreMasteryStrip (merge into dashboard strip)
- TradeHistoryChips (useful but not Layer 0 -- move to Layer 1 or 2)
- SponsorBanner (player_mid placement should move below fold)

### Layer 1 -- Quick Scan (1 Scroll, ~5 Seconds)

**Purpose:** Provide the decision signals for all 3 user types without tab switching.

| Section | Data | Consumer |
|---------|------|----------|
| Signal cards | Scout consensus, community valuation median, sentiment direction | All (cross-cutting intelligence) |
| Performance strip | L5 circle, L15 circle, trend, season avg | Fantasy/Scout |
| Contract status | Expiry date, urgency indicator, months remaining | Scout/Trader |
| Quick trade context | Orderbook depth mini, sell orders count, 24h volume | Trader |

**Design principle:** Each card answers one question. Tap/expand for detail.

### Layer 2 -- Deep Dive (Expandable Sections or Tabs)

**Purpose:** Detailed analysis for users who have committed to investigating this player.

| Section | Data | Consumer |
|---------|------|----------|
| Trading deep dive | Price chart, full orderbook, trade history, sell order table, offers, price info grid | Trader |
| Performance deep dive | Radar chart, gameweek score bars, season sparkline, detailed stats | Fantasy/Scout |
| Rewards and economics | Reward ladder, PBT treasury, potential earnings, DPC supply ring | Trader |
| Community and research | Research reports, player takes, transfer rumors, create post/rumor | Scout |

### Layer 3 -- Full Detail (Separate Modal or Page)

**Purpose:** Data that only a small percentage of users ever needs.

| Element | Data | Trigger |
|---------|------|---------|
| Full trade history modal | All trades with pagination, filters by date/type | Show all link in trade history |
| Full order book modal | All sell orders with profile details | Show all link in order section |
| Research report detail | Full research post with unlock | Card click |
| Compare page | Side-by-side player comparison | Compare button |
| DPC Mastery detail | Full XP breakdown, milestone history | Mastery badge tap |

---

## 4. Alternative Navigation Models

### Option A: No Tabs -- Single Continuous Scroll

Layout: Hero + Dashboard Strip > Signal Cards Row > Performance Section (expandable) > Trading Section (expandable) > Community Section (expandable) > Rewards Section (expandable)

**Pros:**
- No hidden content -- everything is discoverable through scrolling
- Mobile-native pattern (Instagram, TikTok profile style)
- Eliminates which-tab-was-that-in confusion
- Better SEO (all content on one page)
- Expandable accordions keep page manageable

**Cons:**
- Long page can feel overwhelming (~3000px+ mobile)
- Loading all sections upfront increases initial data fetch
- No clear mental model for what is where
- Hard to deep-link to a specific section
- Performance cost if not lazy-loaded

**Verdict:** Viable with accordion/collapse pattern. Risk of wall-of-cards fatigue.

### Option B: 3 Tabs Instead of 5

Layout: Hero + Dashboard Strip > [Trading] [Performance] [Community]

**Tab: Trading** (merges current Profil economics + Markt + Rewards)
- Price chart, orderbook depth, scout consensus
- Sell orders, offers, trade history
- DPC supply ring, PBT treasury
- Reward ladder, potential earnings
- Price info grid, contract status (risk context)

**Tab: Performance** (merges current Profil stats + Statistik)
- Score overview (L5/L15/season avg)
- Radar chart
- Season stats (matches/goals/assists)
- Gameweek score bars
- Season sparkline
- Form indicator

**Tab: Community** (same as current, plus community valuation)
- Community valuation (moved from Profil)
- Sentiment gauge
- Player takes
- Transfer rumors
- Research reports

**Pros:**
- Maps directly to the 3 user journeys
- Reduces tab bar from 5 to 3 (less cognitive load, fits mobile better)
- Each tab is self-contained for its audience
- No data feels misplaced
- Eliminates Profil tab which was a dumping ground

**Cons:**
- Trading tab becomes very long (11+ sections)
- Users who want both trading and performance data must switch tabs
- Performance label may confuse non-Fantasy users

**Verdict:** Strong option. The 3-tab model directly maps to user intent. Trading tab length can be managed with internal section navigation or collapsible groups.

### Option C: Hybrid -- Sticky Dashboard + Scrollable Deep Dive

Layout: [Sticky Header: Hero compact + Dashboard Strip + CTAs] > all content in single scroll

**Dashboard strip is always visible** at the top (collapses hero on scroll like Spotify/Apple Music artist pages). Contains: Floor Price, L5, Trend, Holders, 24h Change, Your Holdings.

Below the sticky header, content flows as a single scroll:
1. Signal cards (consensus, valuation)
2. Performance overview
3. Trading overview
4. Community overview
5. Full detail sections (expandable)

**Pros:**
- Key metrics always visible -- never lost
- Combines benefits of no-tabs (discoverability) with fixed reference point
- Natural mobile scroll behavior
- The 6-metric strip acts as a health dashboard
- Hero collapse animation adds polish

**Cons:**
- Sticky header takes ~80-100px of screen real estate (significant on mobile)
- Implementation complexity (scroll detection, hero collapse animation)
- Still long page below the fold
- Must carefully manage z-index with MobileTradingBar

**Verdict:** Best UX but highest implementation cost. The sticky dashboard strip is the key innovation. Can be combined with Option B (sticky strip + 3 tabs below).

### Option D: Mode Switcher (Trader Mode / Fantasy Mode / Scout Mode)

Layout: Hero + Dashboard Strip > [Trader] [Fantasy] [Scout] mode selector > Content curated per mode

**Pros:**
- Maximum personalization per user type
- Can reorder/prioritize sections per mode
- User declares intent upfront -- page delivers exactly what they need
- Could remember preference per user

**Cons:**
- Users often wear multiple hats (trader who also plays fantasy)
- Which-mode-am-I-in confusion
- Duplicates sections across modes with different priority ordering
- Maintenance burden: every new feature must be placed in 3 modes
- User must understand the 3 archetypes to choose correctly
- Higher complexity for marginal benefit vs 3-tab model

**Verdict:** Over-engineered. The 3-tab model (Option B) achieves similar user-focus without the cognitive overhead of a mode concept. Mode switching implies personality -- tabs imply content categories. Tabs are more intuitive.

### Recommendation: Option B+C Hybrid

Combine **3 tabs** (Option B) with a **sticky dashboard strip** (Option C):

[Sticky: Hero compact + Dashboard Strip (6 metrics) + Buy/Sell] > [Trading] [Performance] [Community] > Tab content (each tab internally organized with Layer 1 summary + Layer 2 detail)

This gives:
- Always-visible key metrics (Option C strength)
- Clear content organization aligned to user journeys (Option B strength)
- 3 tabs instead of 5 (less cognitive load)
- Each tab self-contained (no where-did-I-see-that?)
- Natural hero collapse on scroll (polish)

---

## 5. Cross-Cutting Metrics Dashboard Strip

### The 6 Metrics

These are the metrics that ALL user types benefit from, regardless of their primary journey.

| # | Metric | Source | Format | Why |
|---|--------|--------|--------|-----|
| 1 | **Floor Price** | player.prices.floor | fmtScout() + bCredits | The universal price reference. Every user type cares about the current price. |
| 2 | **L5 Score** | player.perf.l5 | ScoreCircle (color-coded) | The single best proxy for is this player performing now. Bridges trading signals and fantasy decisions. |
| 3 | **Trend** | player.perf.trend | UP/DOWN/FLAT icon + label | Directional momentum. Traders use it for timing, Fantasy managers for form picks. |
| 4 | **Holders** | holderCount | Integer with Users icon | Social proof / liquidity signal. High holder count = liquid market. |
| 5 | **24h Change** | player.prices.change24h | +/-X.X% (green/red) | Recency signal. Is something happening right now? |
| 6 | **Your Holdings** | holdingQty | X DPC or empty | Personal relevance. Do I already have skin in the game? |

### Design Specification

  [Floor Price]  [L5]  [Trend]  [Holders]  [24h]  [Yours]

- **Mobile (360px):** 3 items visible, horizontally scrollable, or 2x3 compact grid
- **Desktop:** All 6 inline, single row
- **Sticky behavior:** Strip becomes sticky after hero scrolls out of viewport
- **Compact mode:** When sticky, hero collapses to single line (name + price + CTAs)
- **Touch target:** Each metric tappable -- scrolls to relevant detail section

**Alternative metrics considered and rejected:**

| Metric | Why Rejected |
|--------|-------------|
| Volume (24h) | Not currently tracked; would need new trade volume aggregation |
| Market value (EUR) | Only relevant for rewards context, not real-time |
| DPC supply | Too niche for the dashboard strip |
| Season avg | Derived metric, L5+Trend is more actionable |
| Scout consensus | Requires research data, often empty |

---

## 6. Action Architecture

### 6.1 Primary Actions (Always Visible)

**Trigger:** 0 taps from anywhere on the page.

| Action | Desktop | Mobile | Condition |
|--------|---------|--------|-----------|
| **Buy** | Gold button in hero info column | Sticky MobileTradingBar (bottom) | Not liquidated, not restricted admin |
| **Sell** | Outline button next to Buy | Sticky MobileTradingBar (bottom) | Holds > 0 DPCs |

**Design rules:**
- Buy is ALWAYS the most prominent action (gold gradient, primary position)
- Sell only appears when user holds DPCs
- Both disabled with error toast for restricted club admins
- MobileTradingBar: floor price + change + holdings + Buy + Sell

### 6.2 Secondary Actions (1 Tap Away)

**Trigger:** Visible in the UI but requires one interaction to access.

| Action | Current Location | Proposed Location | Rationale |
|--------|-----------------|-------------------|-----------|
| **Limit Order** | MobileTradingBar clock icon | Keep in MobileTradingBar + add to desktop hero | Power-trader feature, should be 1 tap but not primary |
| **Price Alert** | Hero overflow menu (3-dot) | Dashboard strip tap on price metric, or bell icon next to price | Too buried currently. Traders set alerts frequently. |
| **Watchlist** | Hero star icon + overflow menu | Keep star icon in hero (already 1-tap) | Good placement, accessible |
| **Make Offer** | Markt tab, inside Offers section | Trading tab header or as tertiary CTA in hero | Should not require tab navigation + scroll |
| **Compare** | Hero overflow menu (3-dot) | Performance tab header or dashboard strip | Common fantasy manager action, too buried |

### 6.3 Tertiary Actions (Behind Menu or Context)

**Trigger:** Requires 2+ taps or is contextual to specific content.

| Action | Trigger | Context |
|--------|---------|---------|
| **Share player** | Overflow menu (3-dot) | Hero -- keep as is |
| **Create player take** | + button in Community tab | Only relevant for scout-type users |
| **Create transfer rumor** | + button in Community tab | Community-only action |
| **Accept bid** | Button on individual bid card | Trading tab, offers section |
| **Cancel sell order** | Button on individual order | Sell modal or Trading tab |
| **Submit valuation** | Button in community valuation widget | Community or Trading tab |
| **Unlock research** | Button on research card | Community tab |
| **Rate research** | Star rating on research card | Community tab |
| **Delete own post** | Trash icon on own post | Community tab |
| **Share post** | Send icon on post | Community tab |

### 6.4 Action Visibility Matrix

|  | Trader | Fantasy | Scout |
|--|--------|---------|-------|
| Buy | Always visible | Can be in overflow | Can be in overflow |
| Sell | Always visible | Irrelevant | Irrelevant |
| Limit Order | 1 tap away | Irrelevant | Irrelevant |
| Price Alert | 1 tap away | Irrelevant | Irrelevant |
| Watchlist | 1 tap away | Can be in overflow | 2 taps OK |
| Compare | Can be in overflow | 1 tap away | 2 taps OK |
| Make Offer | 2 taps OK | Irrelevant | Irrelevant |
| Create Post | Irrelevant | Irrelevant | 1 tap away |
| Create Rumor | Irrelevant | Irrelevant | 2 taps OK |

---

## 7. Implementation Priorities

### Phase 1: Data Consolidation (Low Risk)

1. **Eliminate L5/L15/Trend duplication** -- single canonical ScoreMasteryStrip, remove from Profil quick stats
2. **Move 7d sparkline, DPC supply ring, PBT** from Profil to appropriate tab
3. **Move community valuation** from Profil to Community or create cross-cutting signal section

### Phase 2: Tab Restructure (Medium Risk)

4. **Collapse 5 tabs to 3:** Trading | Performance | Community
5. **Merge Profil + Statistik** into Performance tab
6. **Merge Profil economics + Markt + Rewards** into Trading tab
7. **Promote price alert and compare** to 1-tap actions

### Phase 3: Dashboard Strip (Medium Risk)

8. **Build sticky dashboard strip** with 6 metrics
9. **Implement hero collapse on scroll** (compact mode)
10. **Each metric tappable** to scroll to relevant detail

### Phase 4: Content Gaps

11. **Add upcoming fixtures** to Performance tab (Fantasy manager critical gap)
12. **Add position rank** (top 15% of MIDs) to Performance tab
13. **Add 24h volume** to dashboard strip (requires trade volume aggregation)

---

## 8. Open Questions for Anil

1. **Tab labels:** Trading | Performance | Community or Markt | Leistung | Community (full German)?
2. **Rewards as sub-section vs tab:** Should rewards/PBT be folded into Trading tab, or stay independent?
3. **Community valuation placement:** Is it a market signal (Trading tab) or community feature (Community tab)?
4. **Upcoming fixtures widget:** Should it show the player club fixtures or fantasy event fixtures?
5. **Sticky strip on mobile:** Is 80px header + 80px bottom trading bar + 56px bottom nav too much fixed UI?
