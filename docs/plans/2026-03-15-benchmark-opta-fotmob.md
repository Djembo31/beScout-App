# Benchmark Analysis: Opta & FotMob Data Visualization Patterns

> **Purpose:** Design intelligence for BeScout Performance Tab redesign
> **Date:** 2026-03-15
> **Status:** Research Complete

---

## 1. Opta Data Visualization Philosophy

### What Makes Opta Feel Authoritative

Opta (Stats Perform) has built the gold standard for football data presentation over 30 years. Their philosophy rests on three pillars:

**A) Transparent Methodology**
Opta Points combines exactly 19 data points into a single score. Every point value is published openly (e.g., 10 points for a goal, 4 for a shot on target, 2 for a tackle/interception, negative points for offsides and errors). This transparency builds trust. Users can verify why a player scored what they did. The formula is position-agnostic by design, capturing contributions from all roles.

**B) Layered Complexity**
Opta never shows everything at once. Their widget ecosystem is modular:
- **Match Stats Widget** (6 templates) -- quick team-level comparison bars
- **Chalkboard Widget** -- every event plotted on a pitch, filterable by player/event/time
- **xG Shot Map** -- circles sized by xG value, goals highlighted in yellow
- **Pass Matrix** -- inter-player pass connections with line thickness = frequency
- **Goal Replay** -- animated pitch reconstruction of scoring sequences
- **Average Positions** -- player dots on pitch showing mean touch location
- **Action Areas** -- possession zones visualized across pitch thirds
- **Player Match Ratings** -- real-time 20-100 scale with 6 sub-component scores

Each widget tells one story well. No widget tries to do everything.

**C) Data-Ink Ratio**
Opta graphics use minimal decoration. Pitch backgrounds are muted green or dark. Data elements (dots, lines, areas) carry all the meaning. Labels are small, precise, monospace where numeric. Color is functional, not decorative.

### Opta Widget Design System

- **Customizable but constrained:** Fonts, colors, and sizes adapt to the embedding site brand, but the data layout and chart type remain fixed per widget
- **Responsive:** Each widget adapts from mobile to desktop
- **Real-time:** Match widgets update every 30 seconds during live games
- **Embeddable:** Single code snippet, plug-and-play integration
- Up to 50 pre-designed templates across sports, with brand guardrails

### Opta Analytics Products

| Product | Scale | Purpose | Visual Style |
|---------|-------|---------|--------------|
| **Opta Points** | 0-200+ per match | Transparent per-action scoring | Numeric + trend arrows |
| **Opta Player Ratings** | 20-100 | Holistic match rating (100+ metrics, 6 sub-components) | Numeric badge, green/red delta |
| **Opta Radars** | Percentile slices | Multi-metric player profiling | Polar area / pizza chart |
| **Opta Graphics** | N/A | Social/broadcast content | Template-based infographics |
| **xG / xA / xGOT** | 0.00-1.00 per shot | Chance quality measurement | Shot map with sized circles |
| **Opta Vision** | XY coordinates | Tracking data | Animated pitch overlays |

### Color Coding

- **xG Shot Map:** Circle size = xG probability, yellow fill = goal scored, gray = missed/saved
- **Player Ratings (live):** Green = rating increasing, red = rating decreasing, flashing = recent event
- **Match Stats bars:** Team A color vs Team B color, proportional width
- **Chalkboard events:** Color-coded by event type (pass, shot, tackle, foul)
---

## 2. FotMob Player Page Architecture

### Page Structure (Mobile-First)

FotMob is the reference app for consumer football data. Their player page uses progressive-disclosure:

- **Player Header:** Photo, Name, Club, Number, Age, Nationality, Position, Market Value (SciSports ETV)
- **Tabs:** Overview | Stats | Matches | Career

### Overview Tab
- **Rating Badge:** Large numeric rating (0-10 scale, baseline 6.0)
- **Season Summary Cards:** Goals, assists, apps, minutes -- large monospace numbers
- **Player Traits Chart:** Interactive radar showing attacking, defending, passing strengths as percentile bars against positional peers
- **Estimated Transfer Value Graph:** Line chart showing market value over career timeline
- **Recent Form:** Last 5 match ratings as color-coded pills

### Stats Tab
Organized by category tabs within the tab:
- **General:** Rating, matches, minutes, goals, assists
- **Attack:** Shots, shots on target, xG, xA, big chances, key passes
- **Defense:** Tackles, interceptions, blocks, clearances, aerial duels
- **Passing:** Pass accuracy, progressive passes, crosses, long balls
- **Physical:** Distance covered, top speed, sprints (Premier League only)

Each stat row: `[Stat Label] [Per 90 Value] [Percentile Bar] [Rank]`

**Percentile Bars:** Green = among the best at position, red = among the worst. Per-90 basis. Compared ONLY against positional peers in the same competition.

Positional comparison groups: Forwards, Wingers/AM, Midfielders, Fullbacks, Centre-backs, Goalkeepers

### Matches Tab
- Match-by-match list: Date, opponent, result, player rating (color badge), minutes played
- Tap to expand: Goals, assists, cards, substitution time, shot map, heatmap
- xG shown per match for individual player

### Career Tab
- Season-by-season stats table, transfer history timeline, trophy/honors list

### Key Design Patterns
- Bottom tab navigation with icon + text
- Green accent color for interactive elements
- Dark mode with muted backgrounds, high-contrast data
- Expandable/collapsible sections for information density
- Monospace numerals for all stats
- Minimal chrome: Data takes up 80%+ of screen

---

## 3. Rating Systems: Visual Design Patterns

### The Industry-Standard Color Scale

**Sofascore** published their exact 6-tier spec:

| Rating Range | Label | Color | Hex |
|-------------|-------|-------|-----|
| No rating | -- | Gray | #A4A9B3 |
| 3.0 - 5.9 | Poor | Red | #DC0C00 |
| 6.0 - 6.4 | Below Average | Orange | #ED7E07 |
| 6.5 - 6.9 | Average | Yellow | #D9AF00 |
| 7.0 - 7.9 | Good | Green | #00C424 |
| 8.0 - 8.9 | Very Good | Cyan | #00ADC4 |
| 9.0 - 10.0 | Excellent | Blue | #374DF5 |

Warm (bad) to cool (exceptional). Adds nuance at the top end beyond simple traffic light.

### Rating Display Formats

**Badge Style (Sofascore/FotMob/WhoScored):** Color-filled rounded rectangle, white bold monospace number. Badge background = rating tier color.

**FotMob:** 0-10 scale, baseline 6.0, 300+ stats from Opta, min 10 min played.
**Opta Player Ratings:** 20-100 scale, 100+ metrics in 6 sub-components, live every 30s, green/red arrows.
**WhoScored:** 0-10 scale, baseline 6.0, mean 6.62, green star = MOTM, offensive bias.

### Context That Makes Ratings Meaningful

1. **League Average Line:** "Average midfielder rating: 6.8"
2. **Percentile Rank:** "Better than 78% of midfielders"
3. **Season Trend:** Sparkline or bar chart trajectory
4. **Sub-Scores:** Attack/Defense/Possession breakdown
5. **Historical Comparison:** "Best rating since GW12"
---

## 4. Advanced Stats Presentation for Non-Expert Users

### The Percentile Bar Pattern (Best Practice)

The most effective pattern for showing advanced metrics to casual fans is the horizontal percentile bar with contextual label:

```
Progressive Passes    4.2 /90    [============--------]  82nd
                                  <- red         green ->
```

Why it works: Stat name (domain), per-90 value (experts), percentile bar (everyone), percentile number (precision). Green = best, red = worst.

FotMob uses exactly this. StatsBomb and FBRef use similar.

### Making Advanced Metrics Accessible

**xG (Expected Goals):** Shot map with probability-sized circles. Tooltip: "This shot had a 23% chance of being scored." Compare actual vs xG.

**Progressive Passes:** Info icon + one-sentence definition + percentile bar.

**Defensive Actions:** Composite categories (Ball Recoveries = tackles + interceptions). Possession-adjusted normalization.

**Pressing:** Pressures = attempts to regain in opponent half. Heatmap of pressure locations.

### Tooltip Pattern
1. One-sentence definition
2. "Better than X% of [position]"
3. League average reference line
4. No jargon without explanation

---

## 5. Season Overview Patterns

### Match-by-Match Bar Chart

Dominant pattern: Horizontal scrollable bars, each bar = one gameweek, color-coded by tier. DNP gaps shown as empty/gray.

BeScout has this in `GameweekScoreBar.tsx` (gold/white/red at 100/70).

### Season Arc Visualizations

- **Sparkline:** Rolling 5-match average, area fill, threshold lines
- **Form Strip:** Colored dots/squares for last N matches (compact for list views)
- **Cumulative:** xG vs actual goals over time

### Recommendation for BeScout
1. Hero sparkline (exists)
2. Detailed bar chart (exists)
3. NEW: Form strip for player cards/lists -- 5-8 colored dots
4. NEW: Rolling average overlay on bar chart

---

## 6. Match Event Timeline

### FotMob Approach
Vertical timeline: minute + icon + player + detail. Shot maps inline for goals. Chronological, scannable.

### Player Page Match History
Events condensed into icon chips:
```
vs Liverpool  W 3-1  [G][G][A]  Rating: 9.2  MOTM
vs Arsenal    D 1-1  [YC]       Rating: 6.8
vs Chelsea    L 0-2              Rating: 5.4
```
Extremely scannable. Icons replace words. Rating badge = summary, icons = story.

### Opta: Spatial Approach
- **Chalkboard:** All events on 2D pitch, filterable
- **Goal Replay:** Animated build-up sequence
- **xG Timeline:** Cumulative xG stepped line chart

### BeScout Recommendation
1. Opponent + Result + Score (compact header)
2. Event chips (goal, assist, CS, card icons)
3. Fantasy score prominently displayed
4. Tap to expand: scoring breakdown
---

## 7. Comparison and Ranking Visualizations

### StatsBomb Radars (Industry Reference)

Polar area chart where each slice = one metric, distance from center = percentile.

**Position-specific templates:**
- **Striker (11):** xG, Shots, Touches in Box, Shot Touch %, xG Assisted, Pressure Regains, Pressures, Aerial Wins, Turnovers, Successful Dribbles, xG/Shot
- **Midfielder (10):** Passing %, Deep Progressions, xG Assisted, xGBuildup, Successful Dribbles, Turnovers, Pressure Regains, Pressures, PAdj Tackles, PAdj Interceptions
- **Centre Back (11):** Passing %, Pressures, Fouls, Tackle/Dribbled Past %, PAdj Tackles, PAdj Interceptions, Aerial Wins, Aerial Win %, Pressured Long Balls, Unpressured Long Balls, xGBuildup
- **Fullback (11):** PAdj Tackles, PAdj Interceptions, Pressures, Deep Progressions, Passing %, xGBuildup, Successful Dribbles, Turnovers, Aerial Wins, Fouls, Tackle/Dribbled Past %
- **Winger (11):** xG, Shots, Touches in Box, Passing %, Successful Box Cross %, Open Play xG Assisted, Fouls Won, Successful Dribbles, Turnovers, Pressure Regains, xG/Shot

**Key design decisions:**
- **Color by category:** Attacking = blue (#1A78CF), Possession = red (#D70232), Defending = orange (#FF9300)
- **Per-90 normalization:** All metrics normalized to per-90-minutes
- **Possession-adjusted defense:** Defensive stats / (1 - team possession %)
- **Benchmark:** Top/bottom 5% across 5 leagues over 5+ seasons = radar boundaries
- **Actual values in corners:** Raw numbers alongside each slice
- **Top 5% green text, bottom 5% red text** at radar edge

**Opta Radars:** 15 years benchmark, 24,000+ player-seasons, percentile 1-100.

**FotMob Player Traits:** Simplified percentile bars (more accessible than radar shape).

### Percentile Bars vs Radars

For mobile/non-expert: bars win.
- No learning curve (universally understood)
- Better on narrow mobile screens
- Natural sorting (order by percentile)
- Equal visual weight per metric (radars emphasize area, which misleads)

### League Rankings
Show contextual rank: "3rd highest rated midfielder in TFF 1. Lig", "Top 10% of midfielders".

---

## 8. Data Table Design

### Typography
- **Right-align all numbers.** Monospace/tabular-nums mandatory
- **Left-align text** (player names, stat labels)
- **Bold primary metrics**, regular secondary
- Headers 10-11px, data 13-14px

### Number Formatting
- Per-90: one decimal (4.2)
- Percentages: no decimal (78%)
- Totals: no decimal (12)
- Ratings: one decimal (7.4)

### Visual Enhancement
- Zebra striping (2-3% opacity difference)
- Sticky first column + header on mobile scroll
- Color-coded rating badges inline
- Sortable columns with arrow indicators
- Conditional highlighting: top 3 gold/green, bottom 3 red
- Mini bar in cell behind numbers
- Expandable rows for match-by-match

### Mobile
- Linearize tables into card lists
- Accordion for multi-stat rows
- 3-4 visible columns max, horizontal scroll
- Sticky left column (player name + photo)
---

## 9. What BeScout Should Steal

### A) Authoritative Data Presentation

**From Opta:** Transparent methodology builds trust. BeScout L5/L15 scoring should explain its inputs via info icon. Same trust Opta Points achieves with 19-metric transparency.

**From FotMob:** Data = 80%+ of screen. No decorative chrome. The data IS the design.

### B) Percentile-Based Context

Single most impactful pattern to adopt. Compare against same position + same league. Horizontal bars with percentile numbers. Use GK/DEF/MID/ATT groups.

### C) 6-Tier Color Scale for BeScout 0-150 Range

| L5/L15 Range | Label | Color | Hex |
|-------------|-------|-------|-----|
| 0 | No Rating | Neutral | white/30 |
| 1-30 | Poor | Red | #DC0C00 |
| 31-50 | Below Average | Orange | #ED7E07 |
| 51-64 | Average | Amber | #D9AF00 |
| 65-84 | Good | Emerald | #6ee7b7 |
| 85-99 | Very Good | Cyan | #00ADC4 |
| 100-150 | Exceptional | Gold | #FFD700 |

Extends current 3-tier (emerald/amber/red at 65/45). Gold for 100+ = unique BeScout signature.

### D) Compact Stat Rows for Mobile

FotMob pattern: label | per-90 value | percentile bar | rank. Tappable rows. No wasted space.

### E) Enhanced Season Arc

1. Rolling 5-match average line overlaid on bars
2. 6-tier bar colors instead of 3-tier
3. Event annotation icons below bars (goal/assist/CS/card dots)
4. League average reference line
---

## 10. Mapping to BeScout Components

### L5/L15 Display -- Upgrade Path

**Current:** ScoreCircle with 3-tier (emerald >=65, amber >=45, red >0). File: src/components/player/index.tsx

**Upgrade 1 -- Percentile Context:** Add "Top 12% of midfielders" below ScoreCircle.

**Upgrade 2 -- Sub-Score Breakdown:** Mini percentile bars for Goals/Assists, Clean Sheets, Minutes, Defensive.

**Upgrade 3 -- 6-Tier Colors:** Extend to match industry standard.

### GameweekScoreBar -- Upgrade Path

**Current:** GameweekScoreBar.tsx -- gold (100+), white (70-99), red (<70).

**Upgrade 1 -- 6-Tier Bar Colors** per score tier.

**Upgrade 2 -- Event Annotation Layer:** Goal/assist/CS/card icon dots below bars.

**Upgrade 3 -- Rolling Average Overlay:** Thin trend line on top of bars.

**Upgrade 4 -- League Average Reference:** Dashed horizontal line.

### RadarChart -- Upgrade Path

**Current:** RadarChart.tsx -- 8 fixed axes (Goals/Assists/CS/Matches/L5/L15/Saves/Minutes), raw values / fixed max.

**Problems:**
1. Fixed max values are arbitrary, not percentile-based
2. Axes mix performance metrics with counting stats
3. No position-specific templates
4. No color-coding by category

**Upgrade 1 -- Percentile-Based Axes** vs positional peers.

**Upgrade 2 -- Position-Specific Templates:**

| Position | Suggested Axes (8) |
|----------|--------------------|
| **GK** | Save %, Clean Sheets, Goals Conceded/90, Minutes, L5, Distribution %, Penalties Saved, Aerial Claims |
| **DEF** | Tackles/90, Interceptions/90, Aerial Win %, Clean Sheets, Goals, Assists, L5, Minutes |
| **MID** | Goals/90, Assists/90, Key Passes/90, Pass %, Tackles/90, L5, Minutes, Chances Created |
| **ATT** | Goals/90, Assists/90, Shots/90, Shot Accuracy %, Dribbles/90, L5, Minutes, Big Chances |

**Upgrade 3 -- Category Coloring:** Attacking=gold, Defending=cyan, Performance=emerald, Passing=rose.

**Upgrade 4 -- Pizza Chart:** Filled slices instead of connected-polygon. Avoids area-distortion.

### Missing Stats to Add

**Tier 1 -- High Impact (API-Football available):**
xG, xA, Pass %, Key Passes/90, Aerial Win %, Shot Accuracy %, Tackles+Interceptions/90

**Tier 2 -- Medium Impact:**
Progressive passes, pressure actions, fouls ratio, shot conversion, dribble success

**Tier 3 -- Premium (Future):**
Heatmaps, physical stats, xGBuildup, possession-adjusted defense
---

## Appendix A: Platform Comparison Matrix

| Feature | Opta | FotMob | WhoScored | Sofascore | BeScout Now | BeScout Target |
|---------|------|--------|-----------|-----------|-------------|----------------|
| Rating Scale | 20-100 | 0-10 | 0-10 | 3-10 | 0-150 (L5) | Keep 0-150 |
| Color Tiers | 2 | 2 | 2 | 6 | 3 | **6 tiers** |
| Percentile | Yes (radars) | Yes (bars) | No | Limited | **No** | **Yes** |
| Radar | Pizza/polar | Traits | No | Spider | Polygon 8-ax | **Pizza+pos** |
| Season Bars | Timeline | Rating bars | List | Mini bars | GW bars | **Enhanced** |
| Event Icons | Spatial | Timeline | Text | Timeline | **None** | **Add chips** |
| xG | Shot map | Per match | No | Per match | **None** | **Add xG** |
| Sub-Scores | 6 parts | 300 rolled | Weighted | Algorithm | **None** | **L5 breakdown** |
| Mobile Stats | Widgets | Pctile bars | Table | Cards | Grid | **Pctile bars** |
| Transparency | Full | Partial | Minimal | Partial | **None** | **Explainer** |

---

## Appendix B: Key Sources

- [Opta Football Widgets](https://www.optasports.com/services/widgets/football/)
- [Opta Analytics Products](https://www.statsperform.com/opta-analytics/)
- [Opta Points System](https://www.statsperform.com/opta-points/)
- [Opta Graphics Platform](https://www.statsperform.com/opta-graphics/)
- [Opta Football Match Centre](https://theanalyst.com/opta-football-match-centre)
- [Opta Player Radars Introduction](https://theanalyst.com/articles/introducing-opta-radars-compare-players)
- [Opta Player Radars Comparison Tool](https://theanalyst.com/articles/opta-player-radars-comparison-tool)
- [Opta Player Ratings Introduction](https://theanalyst.com/articles/introducing-opta-player-ratings-premier-league-star-players-in-2022-23)
- [Opta Points Hub](https://dataviz.theanalyst.com/opta-points-hub/)
- [FotMob FAQ](https://www.fotmob.com/faq)
- [FotMob Player Ratings Explained](https://www.scribd.com/document/920258497/Stats-Definitions-FotMob)
- [FotMob x SciSports Partnership](https://www.scisports.com/fotmob-partners-with-scisports-to-power-new-player-value-insights/)
- [Sofascore Rating Explained](https://corporate.sofascore.com/about/rating)
- [Sofascore Color Coding](https://www.sofascore.com/news/colorcoding-sofascore-statistical-player-rating/)
- [Sofascore Rating Guidelines](https://www.sofascore.com/rating-guidelines)
- [WhoScored Ratings Explained](https://www.whoscored.com/explanations)
- [Understanding StatsBomb Radars](https://blogarchive.statsbomb.com/articles/soccer/understanding-statsbomb-radars/)
- [StatsBomb Radars 2023 Update](https://statsbomb.com/articles/soccer/new-statsbomb-radars-2023-update/)
- [FotMob Design Critique](https://ixd.prattsi.org/2021/09/design-critique-fotmob-android-app/)
- [Percentile Radars Tutorial](https://www.gettingbluefingers.com/pages/tutorials/RadarPizzaChart/index.html)
- [Data Table Design Best Practices](https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-data-tables)
- [Comparing Player Rating Systems](https://www.tandfonline.com/doi/full/10.1080/02640414.2025.2471208)
- [Flourish Football Data Viz](https://flourish.studio/blog/visualize-premier-league-football-data/)
