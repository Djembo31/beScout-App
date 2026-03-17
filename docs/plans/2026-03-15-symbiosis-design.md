# Player Detail Page Redesign — The Symbiosis Blueprint

> Date: 2026-03-15
> Status: SPEC
> Author: Jarvis (Lead Product Designer)
> Scope: Full redesign of `/player/[id]` -- hero, tabs, mobile, interactions

---

## 0. Design Philosophy

BeScout occupies a unique position: no other platform combines DPC trading, fantasy lineups, scouting research, performance scoring, collectible cards, AND live data feel into one player page. The current page has all the pieces but treats them as separate concerns. This redesign fuses them into a single coherent experience.

**The core tension to resolve:** The page must feel like a *trading terminal* for serious traders, a *scouting dossier* for fantasy managers, a *collectible showcase* for card enthusiasts, AND a *fan page* for casual supporters -- simultaneously, without schizophrenia.

**The solution:** Emotional hero (collectible DNA) + rational dashboard (trading DNA) + deep tabs (scouting DNA). Each layer serves a different user mode, but the visual language is unified.

**Reference DNA map:**
- Sorare: Card collectible framing, market data integration, fantasy context
- Robinhood: Price-first simplicity, one-tap trading, clean chart UX
- SofaScore/FotMob: Score ratings, match-by-match bars, sticky headers
- FIFA FUT: Card aesthetics, position colors as identity, stat grids
- Seeking Alpha: Research consensus, analyst credibility, bull/bear framing
- PokerStars: Event lobby energy, live indicators, tournament feel

---

## 1. The Hero Moment (Above Fold)

### Current Problems
- 564px on mobile before content starts -- far too much dead space
- Card and info are vertically stacked on mobile -- wastes vertical real estate
- Price is buried in a subsection; should be the first number you see
- No sense of ownership -- reads like a Wikipedia entry
- Action buttons hidden on mobile (rely on sticky bar)

### New Layout: Split Hero

**Desktop (md+): Two-column, 340px max height.** Card (240px wide, FIFA-style with tilt) sits LEFT. Info column RIGHT: player name (2xl, font-black), club/position/age row, status badges, PRICE BLOCK (gold, font-mono, font-black -- the biggest element), and action buttons.

**Mobile (< md): Compact horizontal, 280px max height.** Card shrinks to 140px wide (187px tall at 3:4), sits LEFT with info RIGHT. No vertical stacking. Price is text-xl. No action buttons in hero.

### Key Design Decisions

**1. Card stays LEFT, always visible, smaller on mobile**
- Desktop: 240px wide, aspect-ratio 3:4 = 320px tall
- Mobile: 140px wide, aspect-ratio 3:4 = 187px tall
- Card tilt KEPT on desktop, removed on mobile for performance
- Card flip KEPT (tap to see radar chart back)

**2. Price is the FIRST number in the info column**
- Gold, font-mono, font-black, text-2xl (desktop) / text-xl (mobile)
- 24h change pill immediately adjacent (green/red)
- Below price: "Floor Price" or "Club Sale (fixed)" context
- Secondary: "Last Trade: X.XX" in white/40

**3. Action buttons: full row on desktop, hidden on mobile**
- Desktop: Buy (gold gradient), Sell (outline), Limit (outline, clock icon)
- Mobile: NO buttons -- MobileTradingBar handles this
- Sell only when holdingQty > 0

**4. Badges communicate state, not decorate**
- Status, IPO, Scout count, Holdings badges -- keep existing
- NEW: Mastery badge inline: "Lv3 Expert" gold pill if mastery > 0

**5. The "MY asset" feeling**
- holdingQty > 0: subtle green left border on hero card
- Top-3 holder: position tint becomes gold
- Card border gold shimmer when owned (CSS animation)

### Dimensions Target
- Desktop hero: max 340px (down from ~420px)
- Mobile hero: max 280px (down from ~564px)

---

## 2. Sticky Dashboard Strip (On Scroll)

When the hero scrolls out of the viewport, a **48px strip** slides down from the top and sticks (position: sticky, top: 0, z-40).

### Desktop: Full 6-metric strip

| Slot | Content | Style |
|------|---------|-------|
| 1 | Photo 28px + Name + POS badge | Truncated, font-bold |
| 2 | Floor Price | font-mono, text-gold |
| 3 | L5 Score 28px circle | Position color |
| 4 | Trend | UP/DOWN/FLAT icon |
| 5 | 24h Change | Green/red pill |
| 6 | Holdings or Holders | Context-dependent |

### Mobile: Condensed 4-metric strip

Photo 24px + Last Name, Floor Price (gold), L5 mini 24px, 24h Change pill.

### Animation
- translateY(-100%) to translateY(0), 200ms ease-out
- Background: glass class (backdrop-blur-xl, bg-surface-modal/80)
- Bottom border: border-b border-white/[0.06], shadow-sm

### Implementation: IntersectionObserver on hero ref
Height: 48px desktop, 44px mobile. Never taller.

---

## 3. Tab Restructure: 5 Tabs to 3 Tabs

### Problem
5 tabs (Profil, Markt, Rewards, Statistik, Community) create choice paralysis. Content fragmented. Mobile overflow.

### New Structure: 3 Tabs

| Tab | Name (DE) | Combines | Primary User |
|-----|-----------|----------|--------------|
| **Trading** | Handel | Markt + Rewards | Trader/Investor |
| **Performance** | Leistung | Profil + Statistik | Fantasy Manager/Scout |
| **Community** | Community | unchanged | Analyst/Fan |

**Rationale:** Rewards answer "what do I earn by holding" -- they belong with trading. Profil+Statistik are both about player performance -- splitting them is false separation.

3 tabs fit any screen. Icon + text desktop, icon-only mobile < 400px. Gold underline active. NO horizontal scroll needed.

New type: `type Tab = "trading" | "performance" | "community"`

---

## 4. Tab 1: Trading (Handel)

Everything needed to make a buy/sell decision, in decision-making order.

### 4.1 Price Chart (Robinhood-style)
- Time range: 1W / 1M / 3M / ALL -- pill toggle, gold active
- 200px desktop, 160px mobile, smooth bezier curves (d3-shape curveCatmullRom)
- Area gradient fill (green-to-transparent or red-to-transparent)
- Crosshair on hover/touch: vertical line + price+date tooltip
- IPO baseline as dashed gold line with label
- NO dots on data points (cleaner)
- Current price LARGE above chart, not in card header

### 4.2 Quick Stats Row (inline, not cards)
4 inline metrics:
- **Floor:** Lowest ask price (gold, prominent)
- **Spread (NEW):** lowestAsk - highestBid. Color: tight (<5%) green, medium (5-15%) amber, wide (>15%) red
- **7d Volume:** Total trades last 7 days
- **Holders:** Total holder count

### 4.3 Your Position (NEW -- only when holdingQty > 0)
Robinhood "Your Position" pattern:
- **Total Value:** holdingQty * floorPrice
- **Avg. Cost (NEW):** Weighted average buy prices from user trades. Fallback: IPO price
- **P&L (NEW):** (floor - avgCost) / avgCost * 100. Green/red. Shows both % and absolute bCredits
- **Mastery bar** below (level badge + XP progress + breakdown)

### 4.4 Orderbook Summary (condensed)
- Best Ask, Best Bid, Spread prominently displayed
- Horizontal bid/ask balance bar (green left = bids, red right = asks)
- "Show Depth Chart" expands to full OrderbookDepth

### 4.5 Scout Consensus
Moved from MarktTab. Already well-designed. Add "View Research" link to Community tab.

### 4.6 Active Orders + Offers (merged)
Single section. Sell Orders / Buy Offers toggle. Own orders gold border.

### 4.7 Reward Tiers (collapsed accordion)
Default collapsed: current tier + next tier reward. Expanded: full reward ladder.

### 4.8 Trade History (condensed)
Table view, last 10 trades. "Show All" expands. Own trades gold left border. No profile links in condensed view.

### 4.9 TradingDisclaimer at top (compliance)

### 4.10 Price Info Grid -- REMOVED
Data merged into Quick Stats (4.2) and Your Position (4.3). Floor/Last/24h in chart header. Club Pool/Circulation in Performance tab DPC Supply.

---

## 5. Tab 2: Performance (Leistung)

### 5.1 Score Dashboard (SofaScore-inspired)
- L5 as HERO metric: 80px circle, position-color glow
- Percentile indicator: "Top 12% of MID" (league-wide)
- Score trend sparkline next to L5
- L15: 48px circle, Season avg: 44px circle
- Trend badge: "Hot / Cold / Stable" with icon

### 5.2 Gameweek Performance (FotMob-style)
- Vertical bars with opponent info below each
- Tap bar for score breakdown (bottom sheet)
- Horizontal scroll with snap points
- Colors: gold (100+), white (70-99), red (<70)

### 5.3 Upcoming Fixtures (NEW -- LiveScore-inspired)
Next 5 fixtures with difficulty: Top 6 = Hard (red), 7-13 = Medium (amber), 14+ = Easy (green).

### 5.4 Attribute Radar (FIFA-inspired)
Keep RadarChart. Position-specific emphasis. 300px desktop, 260px mobile.

### 5.5 Season Stats with Percentile Bars (Opta-style)
Each stat: label, value, percentile bar within position, rank.

### 5.6 Player Info Grid
Market Value, Position (badge), Nationality (flag), Age, Contract inline.

### 5.7 DPC Supply Distribution
Keep DPCSupplyRing as-is. Bottom of Performance tab.

### 5.8 Contract Status
Keep as-is. Urgency colors (red/amber) work well.

### 5.9 Fantasy CTA (contextual NEW)
Only when active event has lineups open. Countdown + "Add to Lineup" gold button.

---

## 6. Tab 3: Community

### Section Order
1. **Scout Consensus** -- ALWAYS show (empty state if no data)
2. **Community Valuation** -- moved from ProfilTab
3. **Sentiment Gauge** -- enhanced with blended trade+research score
4. **Research Posts** -- quality-sorted (avg_rating * ratings_count), not chronological
5. **Player Takes** -- below research
6. **Transfer Rumors** -- red border separation
7. **Write Research CTA** -- gold button, pre-filled player context

---

## 7. Mobile-Specific Design

### 7.1 Hero Height Budget

| Section | Current | Target |
|---------|---------|--------|
| Top bar | 56px | 48px |
| Card + Info | ~380px | 220px (side-by-side) |
| Price strip | 60px | merged into info |
| Score/Mastery strip | 68px | MOVED to sticky strip |
| Trade chips | ~60px | REMOVED |
| **Total** | **~564px** | **~268px** |

### 7.2 Mobile Trading Bar -- Redesigned
56px height. Price+change left, Buy (gold) right, "..." overflow for Sell/Limit/Offer.

### 7.3 Tab Navigation: Tap, not swipe
Swipe conflicts with horizontal scroll within tabs. 3 tabs easily tappable.

### 7.4 Bottom Sheet Patterns
Use for: Buy/Sell modals, GW score breakdown, full trade history, depth chart.
Never for: Tab content, research posts, player info.

---

## 8. Visual Identity -- BeScout DNA

### 8.1 The Five Pillars

1. **Collectible, not clinical** -- TradingCard ever-present, rounded 2xl, holographic/metallic effects
2. **Data authority, not toy-like** -- font-mono tabular-nums, fmtScout(), deterministic score colors
3. **Trading confidence, not overwhelming** -- one CTA per state, price as largest number, progressive disclosure
4. **Fan passion, not sterile** -- position colors as identity, card tilt, emotional form labels (Hot/Cold)
5. **Gold as status, not decoration** -- gold ONLY for prices/active/owned/CTAs. If everything is gold, nothing is gold.

### 8.2 Position Color System

| Pos | Hex | Usage |
|-----|-----|-------|
| GK | #10B981 | Card border, score glow, radar fill, badge |
| DEF | #F59E0B | Card border, score glow, radar fill, badge |
| MID | #0EA5E9 | Card border, score glow, radar fill, badge |
| ATT | #F43F5E | Card border, score glow, radar fill, badge |

### 8.3 Card Tiers (Mastery-driven)

| Lv | Name | Visual |
|----|------|--------|
| 0 | None | Standard card (carbon fiber + position wash) |
| 1 | Rookie | + subtle shimmer |
| 2 | Regular | + silver foil accent on name bar |
| 3 | Expert | + gold foil accent + stats glow |
| 4 | Master | + holographic overlay (prismatic) |
| 5 | Legend | + animated gold particle border |

CSS-only: card-tier-0 through card-tier-5. No JS needed.

### 8.4 Dark Mode Surfaces

| Surface | Usage |
|---------|-------|
| #0a0a0a | Page background |
| bg-[#0d0d0d] | Hero card background |
| bg-white/[0.02] | Card backgrounds |
| bg-surface-subtle | Sticky strip |
| bg-surface-base | Stat boxes, inputs |
| bg-surface-modal | Bottom sheets, modals |

---

## 9. Interaction Design

### 9.1 What Animates

| Element | Animation | Trigger | Duration |
|---------|-----------|---------|----------|
| Card entrance | scale 0.95-1, opacity 0-1 | Page load | 400ms |
| Card info | delayed slide up | Page load | 300ms, 200ms delay |
| Card tilt | perspective transform | Mouse move (desktop) | Continuous |
| Card flip | rotateY(180deg) | Tap/click | 500ms |
| Sticky strip | translateY slide down | Hero leaves viewport | 200ms |
| Score circle | useNumTick number roll | Data load | 600ms |
| Buy button | active:scale-[0.97] | Press | 100ms |
| Trade success | Gold particle burst + toast | Buy/Sell complete | 1500ms |
| Tab switch | Content fade | Tab tap | 150ms |

### 9.2 What Does NOT Animate
- Tab content sliding left/right (instant mount)
- Cards appearing in lists (instant render)
- Scroll position (no hijacking)

### 9.3 Card Tilt/Flip
- Tilt: Desktop only (@media (hover: hover)). Removed on touch devices.
- Flip: Keep on all devices. Back face = radar chart + stats.

### 9.4 No Scroll-Triggered Reveals
Only scroll trigger: sticky dashboard strip appearing/disappearing.

---

## 10. Component Architecture

### New Components

| Component | Location | Priority |
|-----------|----------|----------|
| StickyDashboardStrip | player/detail/ | P0 |
| TradingQuickStats | player/detail/trading/ | P0 |
| YourPosition | player/detail/trading/ | P1 |
| OrderbookSummary | player/detail/trading/ | P1 |
| StatsBreakdown | player/detail/ | P2 |
| UpcomingFixtures | player/detail/ | P2 |
| FantasyCTA | player/detail/ | P2 |

### Refactored Components

| Component | Change | Priority |
|-----------|--------|----------|
| PlayerHero | Horizontal mobile, mastery badge, reduced height | P0 |
| PlayerContent | 5 to 3 tabs, sticky strip integration | P0 |
| MobileTradingBar | Slimmer (56px), overflow menu | P0 |
| PriceChart | Time ranges, bezier curves, crosshair | P1 |
| MarktTab to TradingTab | Merge with RewardsTab content | P1 |
| ProfilTab+StatistikTab to PerformanceTab | Merge, add percentiles | P1 |
| GameweekScoreBar | Add opponent info, tap-to-expand | P2 |

### Keep As-Is
TradingCardFrame, RadarChart, DPCSupplyRing, ScoutConsensus, SentimentGauge, BuyModal/SellModal/OfferModal, TradingDisclaimer, LiquidationAlert.

### Remove
RewardsTab (standalone), TradeHistoryChips (standalone strip), ScoreMasteryStrip (standalone), SponsorBanner (mid-page placement).

---

## 11. Data Flow Changes

### New Queries

| Query | Purpose | Hook |
|-------|---------|------|
| User avg cost per player | P&L calculation | useAvgCost(userId, playerId) |
| League percentiles by position | Stat percentile bars | usePositionPercentiles(pos) |
| Upcoming fixtures for club | Fixture difficulty | useUpcomingFixtures(clubId) |
| Active fantasy event | Lineup CTA | useActiveFantasyEvent(playerId) |
| Best bid price | Spread calc | Derived from openBids |

### Query Gating (tab-based)
openBids gated to trading tab. upcomingFixtures gated to performance tab.

---

## 12. Implementation Phases

### Phase 1: Structural Redesign (P0)
1. PlayerHero horizontal mobile layout + reduced height
2. Tab consolidation (5 to 3)
3. StickyDashboardStrip
4. MobileTradingBar redesign
5. Build verification: tsc + build + visual QA at 360px and 1024px

### Phase 2: Trading Tab (P1)
1. TradingQuickStats (spread, volume)
2. YourPosition with P&L
3. OrderbookSummary (condensed)
4. RewardsTab accordion integration
5. Trade history condensation
6. PriceChart enhancement (time ranges, bezier)

### Phase 3: Performance Tab (P1)
1. Merge ProfilTab + StatistikTab
2. StatsBreakdown with percentile bars
3. GameweekScoreBar with opponent info
4. UpcomingFixtures (new)
5. FantasyCTA (new)

### Phase 4: Polish (P2)
1. Card mastery tier visuals (CSS classes)
2. Chart crosshair interaction
3. Number morphing animations
4. Trade success particle burst
5. Empty state improvements

---

## 13. Metrics to Track

| Metric | Current | Target |
|--------|---------|--------|
| Mobile hero height | 564px | <280px |
| Time to first interaction | ~3s | <1.5s |
| Tab engagement | 60/25/5/5/5 | 40/35/25 |
| Buy button tap rate | Unknown | Track via analytics |
| Avg time on page | Unknown | Expect +15% |

---

## 14. Decisions (Anil, 2026-03-15)

1. **Percentile data:** ✅ Client-side — berechnet aus vollem Spieler-Pool (`allPlayers`), keine neue RPC
2. **Fixture difficulty:** ✅ Kombi — Liga-Position + L5-Form der Gegner als Composite Score
3. **P&L privacy:** ✅ Ja — nur fuer eingeloggten User sichtbar, basierend auf Trade-History
4. **Card mastery tiers:** ✅ Jetzt — inkl. animierte Borders fuer Lv4-5, nicht erst nach Pilot
5. **Trade success:** ✅ Ja — subtiler Gold-Partikel-Burst bei erfolgreichem Kauf

---

*This document is the implementation blueprint. Each section maps to specific components, data flows, and user interactions. Build in phases, verify at each stage, ship incrementally.*
