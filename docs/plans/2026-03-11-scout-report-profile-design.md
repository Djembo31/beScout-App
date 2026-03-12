# Scout Report Profile — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create implementation plan from this design.

**Goal:** Redesign the Profile page as an auto-generated "Scout Report" — the platform evaluates the scout, just like the scout evaluates players. Each profile feels unique based on the user's strengths.

**Core Concept:** BeScout users evaluate players. The profile flips the script: the platform evaluates the user across 3 dimensions (Manager/Trader/Analyst). The strongest dimension is highlighted automatically. No manual curation — 100% data-driven.

**Audience:** 80% other fans/scouts ("Should I follow this person?"), 20% club admins ("Is this a valuable community member?")

**Value Hierarchy:** Manager (Fantasy) > Trading > Content > Analyst > Engagement

---

## Architecture

### Layout Structure
- **Mobile:** Scout Card (hero, ~300px) → Dimension Tabs → Tab Content (scrollable)
- **Desktop:** Scout Card (top, full-width) → Dimension Tabs → Tab Content (wider area)
- **Tabs:** `Manager | Trader | Analyst | Timeline`
- **Default Tab:** Strongest dimension auto-selected (highest score)
- **Tab Order:** Strongest dimension first, weakest last, Timeline always last

### Dynamic Elements (the USP)
1. **Strength Label** — auto-generated from highest dimension
2. **Tab Order** — strongest dimension = first tab = default selected
3. **Auto-Badges** — up to 3, picked by priority algorithm
4. **Empty States** — encouraging CTAs for self, graceful for public

---

## Scout Card (Hero)

### Layout (Mobile ~300px)
```
┌─────────────────────────────────────┐
│  [Avatar+Frame]  @handle    Lv.42  │
│  Display Name                       │
│  "Fantasy-Stratege" (auto-label)    │
│                                     │
│         ┌── Manager ──┐             │
│        /       ●        \           │
│  Analyst ●─────────────● Trader     │
│        (Radar-Chart, 3 Axes)        │
│                                     │
│       ◆ Gold II — #1.247            │
│                                     │
│  ┌─────┐ ┌──────────┐ ┌─────────┐  │
│  │ 78% │ │ Top 5%   │ │ 100-Day │  │
│  │ Hit │ │ Manager  │ │ Streak  │  │
│  │ Rate│ │          │ │         │  │
│  └─────┘ └──────────┘ └─────────┘  │
│  (up to 3 auto-picked badges)       │
│                                     │
│  142 Follower · 87 Trades · 24 GWs │
│                                     │
│  [Folgen]  [···]    (self: ⚙️)      │
└─────────────────────────────────────┘
```

### Strength Labels (auto-generated)
| Condition | Label DE | Label TR |
|-----------|----------|----------|
| Manager >> others | "Fantasy-Stratege" | "Fantezi Stratejisti" |
| Manager high + Trader high | "Taktischer Investor" | "Taktik Yatırımcı" |
| Trader >> others | "Marktkenner" | "Piyasa Uzmanı" |
| Analyst >> others | "Treffsicherer Analyst" | "İsabetli Analist" |
| All ~equal (variance <15%) | "Allrounder" | "Çok Yönlü" |
| All low (<400) | "Aufsteiger" | "Yükselen Yetenek" |

">> others" means: highest score is >30% above second highest.

### Auto-Badge Priority (max 3 shown)
| Priority | Badge | Condition |
|----------|-------|-----------|
| 1 | Track Record | >=5 resolved calls + >=60% hit rate |
| 2 | Manager Percentile | Avg fantasy rank in top 10% |
| 3 | Streak | current_streak >= 30 days |
| 4 | Club Subscription | Active subscription (Gold > Silber > Bronze) |
| 5 | Founding Pass | Has founding pass (any tier) |
| 6 | Portfolio Performance | PnL > +20% (self only) |
| 7 | Follower Milestone | >= 100 followers |

### Stats Ribbon
Compact row of 3-4 key numbers:
- Follower count
- Total trades count
- Fantasy events count
- Research posts count (if > 0)

### Action Buttons
- **Public view:** Folgen/Entfolgen + More menu (Report, Share)
- **Self view:** Settings gear (links to /profile/settings) + Share + Edit Bio

### Radar Chart
- 3 axes: Manager / Trader / Analyst
- Scores normalized to 0-100 scale (based on max possible at current tier)
- Filled polygon with gradient (gold fill, white/10 border)
- Axis labels in dimension colors: Manager=purple, Trader=sky, Analyst=emerald

---

## Manager Tab (Fantasy & Lineups)

### Sections (top to bottom)

**1. Manager Score Progress**
- Current score (e.g. 1.847)
- Current rank badge (e.g. Silber III)
- Progress bar to next rank
- "Noch X bis [next rank]"

**2. Season Summary Card**
| Stat | Source |
|------|--------|
| Events played | Count of lineups this season |
| Best Rank | Min rank from lineups |
| Avg Rank | Avg rank from lineups |
| Total Earned | Sum of reward_amount |
| Podiums | Count of rank 1/2/3 (split by medal) |

**3. Recent Events (last 5)**
Compact cards:
- Event name (gameweek + fixture)
- Total score
- Rank (with medal emoji if top 3)
- Reward amount
- "Alle anzeigen" link expands to full history

**4. Club Fan Ranks (if any)**
- Club logo + name
- Fan rank tier (Zuschauer → Vereinsikone)
- Progress bar to next tier

### Data Sources
| Data | Query | Visibility |
|------|-------|------------|
| Manager Score | `user_stats.manager_score` | Public |
| Fantasy Results | `getUserFantasyHistory(userId)` | Public |
| Fan Rankings | `fan_ranking` table | Public |

### Empty State
Self: "Noch kein Event gespielt. Fantasy-Events starten jeden Spieltag." + CTA button
Public: "Noch keine Fantasy-Teilnahmen."

---

## Trader Tab (Portfolio & Market)

### Sections (top to bottom)

**1. Trader Score Progress**
- Same pattern as Manager Score

**2. Portfolio Overview**
| Stat | Public | Self |
|------|--------|------|
| Portfolio Value | ✓ (bCredits) | ✓ |
| PnL | ✗ | ✓ (+ color green/red) |
| DPC Count | ✓ | ✓ |
| Total Trades | ✓ | ✓ |
| Trading Volume | ✓ | ✓ |
| Win Rate | ✓ | ✓ |

**3. Top Holdings (5)**
Each holding shows:
- Player identity (photo, name, position, club) via PlayerIdentity component
- Quantity owned
- Current value (public) or value + PnL (self)
- Mastery level (1-5 stars)
- Link to player page
- "Ganzes Squad" link to see all holdings

**4. Recent Trades (5)**
Compact list:
- BUY/SELL indicator (color-coded)
- Player name
- Quantity + price
- Relative time
- "Alle anzeigen" link

**5. DPC Mastery Summary**
Grouped by level:
- ★★★★★ Legende: X DPCs
- ★★★★☆ Meister: X DPCs
- etc.
Only levels with DPCs shown.

### Data Sources
| Data | Query | Visibility |
|------|-------|------------|
| Trader Score | `user_stats.trading_score` | Public |
| Holdings | `getHoldings(userId)` | Public (player+qty), Self (+prices) |
| Trades | `getUserTrades(userId, 5)` | Public |
| Mastery | `useUserMasteryAll(userId)` | Public |
| Win Rate | `user_stats` or computed from trades | Public |

### Empty State
Self: "Noch keine DPCs im Portfolio. Entdecke Spieler auf dem Marktplatz." + CTA
Public: "Noch keine DPCs im Portfolio."

---

## Analyst Tab (Research & Predictions)

### Sections (top to bottom)

**1. Analyst Score Progress**
- Same pattern as Manager/Trader Score

**2. Track Record Card**
Only shown if >= 5 resolved calls:
- Large hit rate percentage (prominent)
- Correct / Wrong / Pending counts
- "Verified Analyst" badge if >= 60% hit rate

If < 5 calls:
- "Track Record wird ab 5 Calls sichtbar."
- Progress bar: X/5 with "Noch Y Calls bis zur Bewertung"

**3. Research Posts (last 5)**
Each post shows:
- Call direction (▲ Bullish / ▼ Bearish / ● Neutral) with color
- Player name + horizon (24h/7d/Season)
- Title/preview (1 line truncated)
- Avg rating (stars)
- Unlock count
- Earnings (self only)
- Link to full post

**4. Prediction Stats**
| Stat | Description |
|------|-------------|
| Accuracy | % correct predictions |
| Best Streak | Longest correct streak |
| Total | Total predictions made |

**5. Bounty Summary**
- Submitted count
- Approved count
- Total earnings (self only)

**6. Content Earnings Breakdown (self only)**
Horizontal bar chart:
- Research earnings
- Bounty earnings
- Poll earnings
- Tips received
- Total at bottom

**7. Expert Badges**
Grid of 6 badges:
- Earned: colored with icon
- Locked: grayed out
- Progress % shown for locked badges

### Data Sources
| Data | Query | Visibility |
|------|-------|------------|
| Analyst Score | `user_stats.analyst_score` | Public |
| Track Record | `getAuthorTrackRecord(userId)` | Public (if >= 5 calls) |
| Research Posts | `getResearchPosts({ userId })` | Public (no earnings) |
| Predictions | `getPredictionStats(userId)` | Public |
| Bounties | `getUserBountySubmissions(userId)` | Public |
| Content Earnings | `transactions` by type | Self only |
| Expert Badges | `getExpertBadges(userStats)` | Public |

### Empty State
Self: "Noch keine Analysen veröffentlicht. Teile deine Einschätzung zu Spielern." + CTA
Public: "Noch keine Analysen."

---

## Timeline Tab

### Concept
Chronological feed mixing all dimensions. Shows the "story" of the scout — what they did and when. Available for both public and self.

### Event Types in Timeline
| Type | Icon | Color | Text |
|------|------|-------|------|
| buy | CircleDollarSign | gold | "BUY [Player] [Qty]x" |
| sell | CircleDollarSign | green | "SELL [Player] [Qty]x" |
| ipo_buy | CircleDollarSign | gold | "IPO [Player] [Qty]x" |
| fantasy_join | Trophy | purple | "GW [N]: Rank #[X]" |
| fantasy_reward | Trophy | purple | "Fantasy Reward" |
| research | FileText | emerald | "Research: [Title]" |
| bounty_reward | Target | emerald | "Bounty approved" |
| mission_reward | Zap | amber | "Mission completed" |
| streak_reward | Flame | orange | "Streak Reward" |
| achievement | Award | gold | "Achievement: [Name]" |
| prediction | Search | sky | "Prediction [correct/wrong]" |
| poll_revenue | Vote | purple | "Poll Revenue" |
| tip_receive | Heart | pink | "Tip received" |

### Layout
```
┌─────────────────────────────────────┐
│ Timeline                            │
│ [Alle] [Trades] [Fantasy]           │
│ [Research] [Rewards]                │
│                                     │
│ Heute ─────────────────────────     │
│ ● BUY Müldür 12x           +840 bC │
│ ● 🏆 Achievement: "50 Trades"      │
│                                     │
│ Gestern ───────────────────────     │
│ ● GW 28: Rank #4           +850 bC │
│ ● ▲ Research: Müldür (Bullish)     │
│                                     │
│ 09. März ──────────────────────     │
│ ● SELL Demir 5x            +320 bC │
│ ● ✓ Prediction correct      +80 bC │
│ ● 🎯 Bounty approved       +500 bC │
│                                     │
│ [Mehr laden...]                     │
└─────────────────────────────────────┘
```

### Grouping
- Events grouped by day (relative: Heute, Gestern, Vorgestern, then absolute dates)
- Within a day: reverse chronological (newest first)

### Filters
Same as current: Alle | Trades | Fantasy | Research | Rewards
With proper a11y (role="radiogroup", aria-checked, min-h-[44px], focus-visible)

### Data Source
- `getTransactions(userId, PAGE_SIZE, offset)` — paginated
- Enriched with description/type mapping
- bCredit amounts: shown for public (positive only), full for self

### Empty State
"Noch keine Aktivität."

---

## Public vs Self Summary

| Element | Public | Self |
|---------|--------|------|
| Scout Card (full) | ✓ | ✓ |
| Radar Chart | ✓ | ✓ |
| Strength Label | ✓ | ✓ |
| Auto-Badges | ✓ (no PnL badge) | ✓ |
| Stats Ribbon | ✓ | ✓ |
| Follow Button | ✓ | ✗ (Settings gear instead) |
| Manager Tab | ✓ (all sections) | ✓ + CTAs |
| Trader Tab | ✓ (no PnL, no buy prices) | ✓ (full financial data) |
| Analyst Tab | ✓ (no earnings per post) | ✓ + Content Earnings |
| Timeline | ✓ (public events only) | ✓ (all events) |
| Empty State CTAs | ✗ | ✓ |

---

## Technical Notes

### Existing Components to Reuse
- `PlayerIdentity` — for holdings display
- `PlayerDisplay` — for squad view (compact variant)
- `Card, Button, Modal` — from ui/index.tsx
- `TabBar` — for dimension tabs
- `LoadMoreButton` — for timeline pagination
- `getRang(), getDimensionColor()` — from gamification.ts
- `getExpertBadges()` — from gamification.ts
- `formatScout()` — for bCredit formatting
- `getRelativeTime()` — for timeline timestamps
- `getActivityIcon(), getActivityColor()` — for timeline event icons

### New Components Needed
- `RadarChart` — SVG-based 3-axis radar chart (lightweight, no library)
- `ScoreProgress` — Dimension score + rank badge + progress bar (reused 3x)
- `AutoBadge` — Priority-based badge picker + display
- `StrengthLabel` — Dynamic label generator
- `TimelineEvent` — Single timeline entry with type-based rendering
- `TimelineGroup` — Day-grouped timeline section

### Queries Needed
All existing, no new RPCs required:
- `getUserStats(userId)` → 3 scores + tier
- `getUserFantasyHistory(userId)` → fantasy results
- `getHoldings(userId)` → portfolio
- `getUserTrades(userId)` → trade history
- `getAuthorTrackRecord(userId)` → hit rate
- `getResearchPosts({ userId })` → research
- `getPredictionStats(userId)` → predictions
- `getUserBountySubmissions(userId)` → bounties
- `getTransactions(userId)` → timeline
- `useUserMasteryAll(userId)` → mastery
- `getUserAchievements(userId)` → achievements
- `getExpertBadges(stats)` → badges

### i18n Keys Needed
New namespace or extend `profile`:
- Strength labels (6 variants, DE + TR)
- Auto-badge labels
- Tab names (Manager, Trader, Analyst, Timeline)
- Section headers
- Empty states (per tab, per section, self vs public)
- Filter labels for timeline
- Score progress text ("Noch X bis [rank]")

### Performance
- Tab-gated queries: `enabled: activeTab === 'manager'` etc.
- Timeline: paginated (20 per page)
- Holdings: loaded once, shared between Scout Card (top 3) and Trader Tab
- Radar Chart: pure SVG, no animation library

---

## Migration from Current Profile

### Files to Replace
- `ProfileView.tsx` — complete rewrite (Scout Card + Tabs)
- `ProfileOverviewTab.tsx` — removed (split into 3 dimension tabs)
- `ProfileSquadTab.tsx` — merged into Trader Tab
- `ProfileStatsTab.tsx` — split across Manager/Trader/Analyst tabs
- `ProfileActivityTab.tsx` — becomes Timeline Tab

### Files to Keep
- `FollowListModal.tsx` — unchanged
- `PredictionStatsCard.tsx` — reuse in Analyst Tab
- `profile/settings/page.tsx` — unchanged (separate route)

### New Files
- `ScoutCard.tsx` — Hero component with radar chart
- `RadarChart.tsx` — SVG radar chart component
- `ManagerTab.tsx` — Manager dimension tab
- `TraderTab.tsx` — Trader dimension tab
- `AnalystTab.tsx` — Analyst dimension tab
- `TimelineTab.tsx` — Chronological activity feed
- `ScoreProgress.tsx` — Reusable score + rank + progress
- `AutoBadges.tsx` — Badge priority logic + display
- `StrengthLabel.tsx` — Dynamic label generator

---

## Open Questions
None — design is complete. Ready for implementation planning.
