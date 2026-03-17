# Player Detail Page -- DPC Trader Persona Analysis

> Date: 2026-03-15
> Scope: UX research from the perspective of an active DPC trader evaluating a buy/sell/hold decision on the Player Detail page.
> Based on: Full code audit of PlayerContent.tsx, PlayerHero, MarktTab, ProfilTab, RewardsTab, StatistikTab, CommunityTab, MobileTradingBar, ScoreMasteryStrip, PriceChart, OrderbookDepth, ScoutConsensus, BuyModal, SellModal, LimitOrderModal, TradeHistoryChips.

---

## 1. Trader Workflow -- Decision Flow

A trader opening a player page follows a predictable decision tree. The sequence maps to urgency: the faster they can resolve each question, the faster they trade.

### Primary Decision Flow (5-15 seconds)

    1. PRICE CHECK        "What is the floor? What did it trade at last?"
    2. DIRECTION CHECK    "Is this going up or down? L5, trend, 24h change"
    3. LIQUIDITY CHECK    "Can I actually buy/sell? How deep is the book?"
    4. POSITION CHECK     "Do I already own this? How many?"
    5. ACTION             Buy / Sell / Watch / Pass

### Secondary Research Flow (30-120 seconds, only if Step 5 = "maybe")

    6. FUNDAMENTALS       "Stats, form, contract, market value"
    7. SOCIAL PROOF       "What do other scouts think? Bull/bear consensus"
    8. REWARD POTENTIAL    "What is my upside if this player transfers?"
    9. RISK ASSESSMENT    "Contract expiry, liquidity risk, holder concentration"

### Current Page vs. This Flow

| Step | Data Needed | Where It Lives Now | Problem |
|------|-------------|-------------------|---------|
| 1. Price | Floor, last trade, IPO price | Hero (floor), Markt tab (last trade, IPO) | Last trade price hidden behind tab |
| 2. Direction | L5, trend, 24h change, sparkline | Hero (24h), ScoreMasteryStrip (L5/trend), Profil tab (sparkline) | Sparkline buried in Profil tab |
| 3. Liquidity | Sell order count, orderbook depth, spread | Markt tab only | Completely hidden behind tab -- critical failure |
| 4. Position | Holdings count | Hero badge, MobileTradingBar | Good -- visible at glance |
| 5. Action | Buy/Sell buttons | Hero (desktop), MobileTradingBar (mobile) | Good -- always accessible |
| 6. Fundamentals | Stats, contract, market value | Profil tab, Statistik tab | Split across 2 tabs |
| 7. Social | Sentiment, consensus, research | Community tab, Markt tab (consensus) | Consensus in Markt is good; rest hidden |
| 8. Rewards | Success fee tiers, PBT | Rewards tab, Profil tab (PBT) | Entire dedicated tab for rarely-checked info |
| 9. Risk | Contract expiry, holder concentration | Profil tab | OK placement for secondary info |

**Key Finding:** Steps 1-3 (the 5-second decision) require data from 3 different locations. A trader has to click the Markt tab before they can assess whether a trade is even possible. This is the single biggest friction point.

---

## 2. Critical Data Points -- Above the Fold

These numbers must be visible **without scrolling and without switching tabs** for a trader to make a quick decision.

### Tier 1: Must See Instantly (Hero area)

| Data Point | Current State | Priority |
|-----------|---------------|----------|
| **Floor Price** | Shown in Hero | GOOD |
| **24h Change %** | Shown in Hero | GOOD |
| **L5 Score** | ScoreMasteryStrip (below Hero) | OK -- 1 scroll |
| **Trend (Hot/Cold/Stable)** | ScoreMasteryStrip | OK -- 1 scroll |
| **Holdings (owned count)** | Hero badge | GOOD |
| **Holder Count** | Hero badge | GOOD |

### Tier 2: Must See Within 1 Scroll

| Data Point | Current State | Priority |
|-----------|---------------|----------|
| **Spread** | Not shown anywhere | MISSING -- critical gap |
| **Ask depth (total sell volume)** | Markt tab only | HIDDEN -- needs extraction |
| **Last trade price** | Markt tab only | HIDDEN -- should be in Hero |
| **7d price sparkline** | Profil tab | HIDDEN -- should be near price |
| **IPO price (reference)** | Markt tab | HIDDEN -- important for valuation |
| **P/L (unrealized)** | Not calculated anywhere | MISSING -- critical for holders |

### Tier 3: Important But Can Be Behind Interaction

| Data Point | Current State | Notes |
|-----------|---------------|-------|
| Trade history | TradeHistoryChips (visible) + Markt tab (detailed) | Chips are good |
| Orderbook depth chart | Markt tab | Could be summarized above |
| Scout consensus | Markt tab | Good placement |
| Contract expiry | Profil tab | OK for secondary |
| PBT treasury | Profil tab | OK for secondary |
| Market value (EUR) | Profil tab | OK for secondary |

### What is Missing Entirely

1. **Spread (bid-ask gap):** The difference between highest bid and lowest ask. Currently no bid orders are shown in the depth chart -- only sell orders. This is THE most important liquidity signal for any trader.
2. **Unrealized P/L:** If I hold 5 DPCs and bought at avg 120 bCredits, and floor is now 150, my unrealized gain is +150 bCredits. This is not computed or shown anywhere.
3. **Volume (24h / 7d):** Number of DPCs traded in the last 24 hours or 7 days. Trade count exists but is not summarized as a volume metric.
4. **Average buy price:** For position holders, no tracking of cost basis.
5. **Bid-side orderbook:** Only sell orders shown. Bid offers exist (OfferModal) but are not visualized in the depth chart.

---

## 3. Information Hierarchy -- Ranked by Trading Importance

### Rank A: Trade-or-Pass Decision (0-5 seconds)

1. Floor price + 24h change
2. L5 score + trend direction
3. Your position (holdings count + unrealized P/L)
4. Spread (best ask - best bid)
5. Buy/Sell buttons

### Rank B: Size-and-Timing Decision (5-30 seconds)

6. Orderbook depth (sell side volume at each price level)
7. Price chart (trend over time)
8. Last trade price + time
9. 7d volume
10. Scout consensus (bull/bear ratio)

### Rank C: Conviction Builders (30-120 seconds)

11. Season statistics (goals, assists, form)
12. Contract status (expiry risk)
13. Success fee potential (reward tiers)
14. Transfer rumors
15. Market value (EUR)
16. DPC supply distribution (circulation, available, float)

### Rank D: Nice to Have (not needed for trading)

17. Attribute radar chart
18. PBT treasury breakdown by source
19. Community posts / takes
20. Mastery level
21. Sponsor banners

---

## 4. Pain Points -- The 5-Tab Problem

### Why 5 Tabs Hurts Traders

**Context switching kills momentum.** A trader on the Profil tab sees the sparkline and thinks "looks bullish" -- but to check if there is actually liquidity to buy, they must tap Markt, wait for it to render, scroll to the orderbook. By then the mental model is broken.

### Specific Pain Points

1. **Markt tab as gatekeeper:** The most critical trading data (orderbook, price chart, trade history, listings) is ALL behind the Markt tab. A trader who lands on the default Profil tab sees no trading data at all.

2. **Default tab is wrong for traders:** Landing on Profil shows radar charts, player info, DPC distribution -- information a collector cares about, not a trader. The default tab should serve the primary use case.

3. **Profil tab is overloaded:** Quick stats, radar chart, player info, DPC supply ring, contract status, PBT widget, community valuation -- 7 sections for one tab. Meanwhile Rewards is its own tab with only 2-3 sections.

4. **Rewards tab is rarely needed:** Success fee tiers change when market value changes (quarterly at most). This does not justify a dedicated tab. It could be a collapsible section in Profil.

5. **Community tab is disconnected from trading:** Research consensus IS a trading signal, but it is buried in the Community tab alongside casual posts and transfer rumors. The consensus summary belongs near the price data.

6. **Tab-gated queries cause delay:** openBids only loads when the Markt tab is active. When a trader switches to Markt, there is a loading delay. Pre-fetching critical data would eliminate this.

7. **No way to see everything at once:** Desktop has enough screen real estate for a 2-column layout (trading column + info column), but the current single-column tab layout wastes horizontal space.

### What Should NOT Be Behind a Tab

| Data | Currently | Should Be |
|------|-----------|-----------|
| Price chart (mini) | Markt tab | Always visible (compact sparkline) |
| Orderbook summary | Markt tab | Stat card showing ask depth + spread |
| Scout consensus | Markt tab | Badge or mini-indicator near price |
| Floor + last trade + 24h change | Split Hero/Markt | Unified price strip |
| Holdings + P/L | Hero badge only | Dedicated position card |

---

## 5. Comparison with Trading Platforms

### Sorare (Direct Competitor -- Fantasy Football Cards)

**What they do well:**
- Card page shows price, recent sales, and similar cards immediately
- "Buy" button is always visible (sticky)
- Price history chart is above the fold
- No tab system -- single scrollable page with collapsible sections
- Social proof: "X managers own this card"

**What BeScout already does better:**
- Orderbook depth visualization (Sorare is auction-based, no orderbook)
- Scout consensus from research
- DPC supply transparency

**Key takeaway:** Sorare treats the card page as a trading page first, info page second. BeScout currently does the opposite.

### Robinhood / Trading 212 (Stock Trading)

**Pattern: The Price-First Layout**
- Giant price number at top with real-time change
- Price chart immediately below (with time range toggles: 1D/1W/1M/1Y)
- Key stats in a horizontal row below chart (open, high, low, volume, P/E, market cap)
- Buy/Sell as fixed bottom bar on mobile
- News and analyst ratings below the fold

**What BeScout should adopt:**
- Price chart immediately after Hero, not behind a tab
- Key stats strip (floor, last trade, spread, volume, holders) as compact horizontal row
- Time range toggles on price chart

**What does not apply:**
- Real-time price updates (DPC market is too thin for real-time)
- Candlestick charts (insufficient trade frequency)

### Coinbase / Binance (Crypto Trading)

**Pattern: The Trading Dashboard**
- Left column: Price chart + orderbook
- Right column: Buy/Sell form (always visible)
- Below: Trade history, market info
- Mobile: Tabs but only 2 (Chart / Orderbook), buy/sell always sticky

**What BeScout should adopt:**
- Desktop 2-column layout: Chart+Orderbook left, Buy/Sell form right
- Orderbook showing both bid AND ask sides
- Spread displayed prominently between bid and ask

**What does not apply:**
- Candlestick charts (not enough data points)
- Advanced order types (market/limit/stop) -- limit orders are coming but market is too thin for stop-loss

### PokerStars (Referenced in Design System)

**Pattern: The Lobby Card**
- Player card as visual anchor (BeScout TradingCardFrame already does this well)
- Stats visible at a glance on the card itself
- Action buttons prominent and color-coded

**What to keep:**
- TradingCardFrame is a strong visual element
- The "card-as-identity" metaphor works for DPCs

---

## 6. Quick Actions -- 1-Tap Accessibility

### Current State

| Action | Desktop | Mobile | Taps Required |
|--------|---------|--------|---------------|
| Buy | Hero button | MobileTradingBar | 1 (good) |
| Sell | Hero button (if holding) | MobileTradingBar (if holding) | 1 (good) |
| Limit Order | Not in Hero | MobileTradingBar clock icon | 1 (good) |
| Watchlist | Hero star icon | Hero star icon | 1 (good) |
| Price Alert | Overflow menu then Alert | Overflow menu then Alert | 2 (bad) |
| Share | Hero share icon | Hero share icon | 1 (good) |
| Compare | Overflow menu | Overflow menu | 2 (OK) |
| Make Offer | Markt tab then Offer button | Markt tab then Offer button | 3+ (bad) |

### Recommendations

**1-tap (keep or promote):**
- Buy, Sell, Limit Order -- already good
- Watchlist -- already good
- **Price Alert: promote from overflow menu to a dedicated icon in MobileTradingBar** (traders use alerts constantly)

**2-tap (acceptable):**
- Compare, Share -- fine in overflow

**Needs improvement:**
- **Make Offer:** Currently requires navigating to Markt tab, scrolling to offers section, clicking "Make Offer." Should be accessible from BuyModal as a fallback (it partially is, but only when no market exists).

### Missing Quick Actions

- **Quick Sell at Floor:** For holders wanting to exit fast, a "Sell at Floor" preset button would save 5+ taps (open sell modal, enter floor price, confirm)
- **Quick Buy at Ask:** "Buy 1 at best ask" one-tap execution
- **Set Price Alert from MobileTradingBar:** Currently hidden in overflow

---

## 7. Mobile Trading Experience

### Current Mobile Layout

    [PlayerHero -- card + name + price + badges]
    [ScoreMasteryStrip -- L5/L15/trend]
    [TradeHistoryChips -- horizontal scroll]
    [SponsorBanner]
    [TabBar -- 5 tabs]
    [Tab Content -- varies]
    [SponsorBanner]
    [MobileTradingBar -- fixed bottom, price + buy/sell/limit]

### Problems on Mobile

1. **Too much scrolling before actionable data:** Hero card takes ~300px, ScoreMasteryStrip ~80px, TradeHistoryChips ~80px, sponsor ~60px, tabs ~44px = ~564px before tab content even starts. On a 667px iPhone SE viewport, that leaves ~100px of tab content visible.

2. **MobileTradingBar overlaps content:** Fixed at bottom-16 (64px from bottom, accounting for the mobile nav). But content padding is pb-20 which may not be enough on all devices.

3. **Horizontal scroll chips are hard to parse:** TradeHistoryChips show individual trade prices as chips. On mobile, you see 3-4 chips. This does not tell the trader the direction -- a mini sparkline would be more informative.

4. **No swipe between tabs:** TabBar requires tapping. Swipe gestures between tabs would feel more native on mobile.

5. **MobileTradingBar does not show spread or volume:** Only floor price, 24h change, holdings, buy/sell/limit. Missing the spread (gap between best bid and ask) which is critical for illiquid markets.

### Ideal Mobile Trading Experience

    [Compact Hero -- photo + name + position, NO card frame on mobile]
    [Price Strip -- floor | 24h% | spread | volume -- single row]
    [Mini Sparkline -- 7d price, ~40px tall]
    [Quick Stats -- L5 | Holders | Depth -- 3 cards]
    [Tab Content -- 3 tabs: Trading | Info | Community]
    [Fixed Bottom -- price + buy/sell + limit + alert]

**Key changes:**
- Remove TradingCardFrame on mobile (save ~200px vertical space, show it only on desktop)
- Merge Profil, Rewards, Statistik into a single "Info" tab
- Promote price chart and orderbook summary above tabs
- Add spread and volume to MobileTradingBar
- Support swipe navigation between tabs

---

## 8. Data Visualization -- Essential vs. Nice-to-Have

### Essential (must have for trading)

| Visualization | Current State | Notes |
|--------------|---------------|-------|
| **Price Chart (line/area)** | PriceChart.tsx, SVG, in Markt tab | Good implementation. Needs time range toggles (1W/1M/ALL). Must be promoted above tabs or shown in a compact form. |
| **Orderbook Depth (bar chart)** | OrderbookDepth.tsx, in Markt tab | Good but only shows sell side. Must add bid side when bid orders are implemented. |
| **L5/L15 Score Circles** | ScoreCircle component | Clean design. Correctly placed near top. |
| **Trend Indicator** | Text-based (Hot/Cold/Stable) | Sufficient. Could be enhanced with a micro-arrow icon. |

### Important (high value, moderate effort)

| Visualization | Current State | Recommendation |
|--------------|---------------|----------------|
| **7d Sparkline** | MiniSparkline in Profil tab | Move to Hero or price strip. Single most effective "direction at a glance" element. |
| **Scout Consensus Bars** | ScoutConsensus.tsx, in Markt tab | Good design. Consider a mini version (single bullish/bearish indicator) for the Hero area. |
| **DPC Supply Ring** | DPCSupplyRing.tsx, in Profil tab | Good for understanding scarcity. Keep in Info tab. |
| **Sentiment Gauge** | SentimentGauge.tsx, in Community tab | Duplicate signal with consensus. Could merge. |

### Nice-to-Have (low priority)

| Visualization | Current State | Notes |
|--------------|---------------|-------|
| **Radar Chart** | RadarChart.tsx, in Profil tab | Cool but not a trading signal. Fantasy managers care, traders do not. |
| **Gameweek Score Bars** | GameweekScoreBar.tsx, in Statistik tab | Good for form analysis but secondary to L5/L15. |
| **Success Fee Ladder** | Visual ladder in Rewards tab | Informational, not actionable for trading. |
| **PBT Source Breakdown** | Grid in Profil tab | Deep-dive data, not needed for trading. |

### What is Missing

1. **Candlestick / OHLC chart:** Not viable with current trade frequency. Skip.
2. **Volume bars under price chart:** Show trade volume per day/week under the price line. Would help identify momentum.
3. **Bid-Ask depth chart (double-sided):** Current OrderbookDepth only shows asks. A two-sided depth chart (green bids left, red asks right) is the standard for any trading platform.
4. **P/L chart:** For holders, show how their position value has changed over time. Requires tracking purchase history.

---

## 9. Trust Signals -- What Builds Trading Confidence

Traders need to answer: "Is this safe to buy? Will I be able to sell later?" Trust signals reduce the perceived risk of entering a position.

### Currently Present

| Signal | Location | Effectiveness |
|--------|----------|---------------|
| **Holder Count** | Hero badge ("42 Scouts") | STRONG -- social proof of demand |
| **Scout Consensus** | Markt tab (Bullish/Bearish/Neutral) | STRONG -- research-backed signal, but hidden behind tab |
| **Trade History** | TradeHistoryChips + Markt tab | MODERATE -- shows activity but no volume aggregation |
| **DPC Supply Transparency** | DPCSupplyRing in Profil tab | MODERATE -- shows scarcity |
| **Top Owners** | Markt tab | MODERATE -- "smart money" signal |
| **PBT Treasury** | Profil tab | MODERATE -- shows accumulated value |
| **Contract Status** | Profil tab | MODERATE -- expiry risk signal |
| **Community Sentiment** | SentimentGauge in Community tab | WEAK -- too far from trading context |
| **Research Reports** | Community tab | WEAK -- requires unlocking, behind 2 layers |

### Missing Trust Signals

1. **Volume indicator:** "324 DPCs traded this week" is more convincing than showing individual trade chips. Volume = liquidity = confidence.

2. **Holder trend:** "12 new holders this week" or "3 holders sold out." Shows whether smart money is entering or exiting. Currently only total holder count is shown.

3. **Price stability indicator:** A volatility metric. "Price has stayed within +/-5% for 14 days" builds confidence for conservative traders.

4. **Verified seller badges in orderbook:** Sellers with high reputation / long track record should stand out. Currently all sellers look the same except "You."

5. **Trade execution guarantee:** "Your order will fill at the displayed price" -- important for market orders where the book might be thin.

6. **Liquidity score:** A simple 1-5 star or Low/Medium/High indicator summarizing how easy it is to enter and exit this player. Based on: ask depth, bid depth, average daily volume, holder count.

### Trust Signal Hierarchy for Trading Context

    Tier 1 (Always Show):
      - Holder count + trend (growing/shrinking)
      - Orderbook depth summary ("12 DPCs available, spread 2.3%")
      - Scout consensus mini-indicator (3 colored dots)

    Tier 2 (Show on Scroll):
      - Volume (7d trade count + value)
      - Top owners (with whale % indicator)
      - Contract status (only if < 12 months)

    Tier 3 (Behind Interaction):
      - Full research reports
      - Community posts
      - PBT treasury details

---

## Summary: Top 10 Recommendations

### Structural Changes

1. **Reduce tabs from 5 to 3:** Trading | Info | Community. Merge Profil+Rewards+Statistik into "Info." Move price chart and orderbook summary above tabs.

2. **Default to Trading context:** Either make "Trading" (current Markt) the default tab, or promote its key data (chart, orderbook, consensus) above the tab bar so they are visible regardless of active tab.

3. **Desktop 2-column layout:** Left column: price chart + orderbook + trade history. Right column: buy/sell form (always visible) + position info. Info and Community content below in full width.

### Data Gaps

4. **Add spread display:** Show best ask - best bid prominently near the price. If no bids exist, show "No bids" as a warning.

5. **Add unrealized P/L for holders:** Calculate and show (floor - avg_buy_price) * holdings. Requires tracking cost basis (average purchase price per user per player).

6. **Add volume metric:** Aggregate trade count and value for 24h and 7d periods. Show as a stat card.

### Mobile Optimizations

7. **Compact Hero on mobile:** Remove TradingCardFrame on viewports < 768px. Show photo + name + price + key badges in ~150px instead of ~350px.

8. **Enhance MobileTradingBar:** Add spread indicator and price alert shortcut. Show mini P/L for holders.

### Quick Wins

9. **Move 7d sparkline to Hero/price strip:** Currently in Profil tab. Moving it next to the price costs 40px of height but gives traders immediate direction signal.

10. **Pre-fetch orderbook data:** Remove the tab-gating from useOpenBids. The bid data is small and critical for trading decisions. Pre-fetch it always.

---

## Implementation Priority

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| P0 | Show last trade + spread + volume near price (no tab) | S | High |
| P0 | Pre-fetch orderbook data (remove tab gate) | XS | Medium |
| P1 | Move sparkline above tabs | S | High |
| P1 | Reduce to 3 tabs (Trading / Info / Community) | M | High |
| P1 | Add spread to MobileTradingBar | S | Medium |
| P2 | Desktop 2-column layout for trading | L | High |
| P2 | Compact mobile Hero (no card frame) | M | Medium |
| P2 | Unrealized P/L calculation + display | M | High |
| P3 | Volume metric (24h/7d aggregation) | M | Medium |
| P3 | Holder trend indicator | M | Medium |
| P3 | Liquidity score | S | Medium |
| P4 | Swipe navigation between tabs | M | Low |
| P4 | Bid-side orderbook visualization | L | Medium |
