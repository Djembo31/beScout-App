# Benchmark: SofaScore Player Detail Page

> Design research for BeScout player page redesign (3 tabs: Trading / Performance / Community + Sticky Dashboard Strip).
> Date: 2026-03-15

---

## 1. Player Profile Layout and Visual Hierarchy

### Header Section
SofaScore player page header follows a strict information hierarchy:

1. **Player Photo** (left-aligned, circular crop, ~80px on mobile)
2. **Name** (large, bold -- uses SofaScore Sans Bold, their custom variable typeface)
3. **Team badge + Team name** (inline, clickable link to team page)
4. **Position** (abbreviated: GK, DEF, MID, FWD)
5. **Jersey number** (secondary, right-aligned or badge-overlaid)
6. **Nationality flag** (small inline icon)
7. **Personal info row**: Age, Height, Preferred Foot, Market Value (compact horizontal strip)

The header is **sticky on scroll** on mobile -- the player name and team badge persist at the top while content scrolls beneath. This is a pattern BeScout should adopt for the Dashboard Strip.

### Page-Level Navigation (Tabs)
SofaScore organizes the player page into distinct sections accessible via a horizontal scrollable tab bar:

- **Overview** -- Summary with key stats, recent form, attribute overview
- **Matches** -- Match-by-match list with ratings, expandable for details
- **Statistics** -- Detailed season stats organized by competition and category
- **Transfer** -- Transfer history timeline
- **Media** (newer addition) -- News and related content

The tab bar sits directly below the header and uses an **underline indicator** for the active tab. Tabs are horizontally scrollable on mobile (no wrapping). This is the core navigation pattern across all detail pages.

### Desktop Layout
On desktop (>768px), SofaScore shifts to a **two-column layout**:
- **Left column (~65%)**: Main content (matches, stats, detailed data)
- **Right column (~35%)**: Sidebar with summary card, attribute overview, recent form mini-chart, and contextual widgets

This asymmetric layout maximizes information density without overwhelming the user.

---

## 2. Performance Visualization

### The Rating System (SofaScore Signature)
The algorithmic rating is their most recognizable feature. Key characteristics:

**Scale:** 3.0 to 10.0 (baseline 6.5 at match start)

**Color Scale (updated June 2024):**

| Range | Color | Meaning |
|-------|-------|---------|
| 9.0 - 10.0 | **Blue** (bright/royal blue) | Exceptional / Player of the Match |
| 8.0 - 8.9 | **Blue-Green** (teal) | Very Good |
| 7.0 - 7.9 | **Green** | Good |
| 6.5 - 6.9 | **Yellow/Amber** | Average |
| 6.0 - 6.4 | **Orange** | Below Average |
| 3.0 - 5.9 | **Red** | Poor |

**Visual Design of Rating Badge:**
- **Shape:** Rounded rectangle (not a circle -- common misconception). ~28x20px on mobile, slightly larger on desktop
- **Corners:** Generously rounded (~6px radius)
- **Background:** Solid fill using the color from the scale above
- **Text:** White, bold, centered, monospace-style numerals for alignment
- **Shadow:** Subtle drop shadow for elevation above the surface
- The badge appears inline next to player names in lineups, match lists, and comparison views
- A **10.0 rating** gets a special "Player of the Match" badge with a star icon

**BeScout parallel:** BeScout L5/L15 scoring uses a 0-200 scale. The color mapping should follow a similar semantic gradient: gold (>100 = excellent), white/neutral (70-100 = average), red (<70 = poor). BeScout already does this in GameweekScoreBar.tsx.

### Season Rating Graph
SofaScore shows a **line chart** of match-by-match ratings across a season:
- X-axis: Match number or date
- Y-axis: Rating (typically 5.0 to 9.0 visible range)
- **6.5 baseline** marked as a horizontal reference line
- Points are color-coded using the rating color scale
- Hovering/tapping a point reveals match details (opponent, score, date)
- The line shows form trends clearly -- rising, falling, or consistent

### Attribute Overview (Pentagon/Radar Chart)
The "Attribute Overview" is a **pentagon-shaped radar chart** displaying five dimensions:

**Outfield Players:**
1. **Attacking** -- Goals, shots, big chances, movement in final third
2. **Technical** -- Ball control, dribbling success, first touch quality
3. **Tactical** -- Positioning, off-the-ball movement, decision-making
4. **Defending** -- Tackles, interceptions, clearances, duels won
5. **Creativity** -- Key passes, through balls, assists, chance creation

**Goalkeepers:**
1. **Saves** -- Shot-stopping ability, reflexes, one-on-one performance
2. **Anticipation** -- Reading the game, quick reactions
3. **Tactical** -- Positioning, organizing defense
4. **Ball Distribution** -- Passing accuracy, long distribution
5. **Aerial** -- Cross claiming, high ball handling

**Visual Design:**
- Pentagon shape with 5 concentric rings (0%, 25%, 50%, 75%, 100%)
- Filled area in a semi-transparent team color or brand blue
- Axis labels at each vertex
- Tapping a vertex reveals the underlying stats that compose that dimension
- **Position average overlay**: Users can tap to overlay the average pentagon for all players at that position, showing where the player exceeds or falls below the norm
- Data is based on **two years of statistics**, not just the current season

**BeScout parallel:** BeScout has a RadarChart.tsx component with configurable axes (0-100 normalized). The SofaScore pentagon structure with 5 clear categories is a direct model for organizing per-player performance data.

---

## 3. Statistics Depth

### Organization Pattern
SofaScore organizes detailed stats in a **hierarchical accordion/section pattern**:

**Level 1: Competition Selector** (horizontal chips)
- "All Competitions" | "Premier League" | "Champions League" | etc.
- Each competition shows separate stats

**Level 2: Category Groups** (vertical sections, collapsible)
- **Summary**: Matches, Minutes, Rating (avg), Goals, Assists
- **Attack**: Goals, Shots (total/on target/off target), Big Chances (created/missed), Penalties (scored/missed)
- **Passing**: Passes (total/accurate), Key Passes, Long Balls, Crosses, Accuracy %
- **Defense**: Tackles, Interceptions, Clearances, Blocked Shots, Duels (won/lost)
- **Discipline**: Yellow Cards, Red Cards, Fouls Committed/Drawn
- **Goalkeeping** (GK only): Saves, Clean Sheets, Goals Conceded, Penalty Saves

**Level 3: Individual Stats** (rows within each category)
Each stat row shows:
- Stat name left-aligned
- Total value right-aligned
- Per-game average in smaller secondary text
- Some stats show a **horizontal progress bar** indicating percentile vs. position average

### Percentile Rankings
SofaScore calculates where a player ranks among peers at the same position in the same league:
- Shown as "Top X%" labels
- Color-coded: Green (top quartile), yellow (middle), red (bottom quartile)
- Available for key metrics like goals, assists, tackles, passes

### Physical Stats (newer addition)
- Distance covered per match
- Top speed
- Sprint count
- These appear in a separate "Physical" category

---

## 4. Match-by-Match Data

### Match List Design
Match history is presented as a **vertically scrolling list** with each match as a card/row:

**Match Row Structure:**
- **Left**: Date (compact: "15 Mar") and competition icon
- **Center**: Teams with score. The player team is **bolded**
- **Right**: Rating badge (rounded rectangle, color-coded)
- Win/Draw/Loss indicated by **green/gray/red dot** or score color
- Substitute appearances show a **sub icon** and minutes played

### Expandable Match Details
Tapping a match row expands to reveal:
- **Heatmap**: Where the player was positioned during that match (pitch overlay, warm/cool colors)
- **Key Stats**: Goals, Assists, Shots, Passes, Tackles for that match
- **Rating Breakdown**: How the rating was composed (positive/negative contributions)
- **Timeline**: Goal/assist/card events with minute markers
- **Passing/Dribbling/Defending Maps** (newer feature): Directional visualizations on a pitch graphic

### Form Indicator
Above the match list, SofaScore shows a **"Last 5 Matches" form strip**:
- Five small colored circles or dots (green = win, gray = draw, red = loss)
- Average rating across last 5 matches
- This compact form indicator appears in multiple places (header, sidebar, comparison)

**BeScout parallel:** BeScout GameweekScoreBar shows vertical bars per gameweek. The SofaScore approach of a compact form strip + expandable match details is more information-dense. Consider adding expandable rows to the gameweek bars.

---

## 5. Comparison Features

### Player Comparison Tool
SofaScore offers a dedicated comparison page (/football/player/compare):

**Layout:**
- **Two-column split** with player A on the left, player B on the right
- Central divider with shared metric labels
- Each player has their photo, name, team, and basic info at the top

**Comparison Metrics:**
- **Header Stats**: Age, Height, Market Value, Team
- **Average Rating**: Side-by-side with color-coded badges
- **Season Stats**: Goals, Assists, Matches, Minutes -- shown as opposing horizontal bars
  - Bars extend from center outward (left for Player A, right for Player B)
  - Longer bar = higher value
  - Color distinguishes the two players (typically team colors or brand blue vs orange)
- **Attribute Overview Overlay**: Two pentagons overlaid on the same chart
  - Player A in one color (semi-transparent)
  - Player B in another color (semi-transparent)
  - Overlap areas visible as blended color
  - Clearly shows where each player excels relative to the other
- **Season Heatmap**: Side-by-side season heatmaps

**Self-Comparison:**
Users can compare a player against themselves across different seasons or teams -- useful for tracking development or impact of a transfer.

**BeScout parallel:** BeScout has a /compare route. The SofaScore pattern of central-axis bar charts (extending left/right from center) is more visually compelling than simple side-by-side numbers. The radar overlay for two players is directly applicable to RadarChart.tsx.

---

## 6. Mobile Information Density Patterns

SofaScore is the gold standard for packing dense sports data into mobile screens. Their patterns:

### Pattern 1: Compact Horizontal Strips
Key stats shown as a horizontal row of metric blocks:
- Number large and bold (SofaScore Sans Bold)
- Label small, muted, below the number
- 3-5 metrics per strip, evenly spaced
- No card borders -- just spacing and typography hierarchy

### Pattern 2: Collapsible Category Sections
Stats grouped under labeled headers that collapse/expand:
- Section header: Bold text + chevron icon + optional count badge
- Content: Dense data table rows
- Default state: First 2-3 sections expanded, rest collapsed
- This lets users drill into areas of interest without scrolling past irrelevant data

### Pattern 3: Scrollable Chips for Filters
Competition selectors, season selectors, and stat type filters use **horizontal chip rows**:
- Pill-shaped buttons, ~32px height
- Active chip: Filled background (blue)
- Inactive chips: Outline or muted background
- Horizontally scrollable with momentum
- No wrapping -- single row always

### Pattern 4: Inline Data Tables
Stat tables are extremely space-efficient:
- **No borders between rows** -- only subtle separators (1px, very low opacity)
- **Alternating row tints** (barely visible, ~2% opacity difference)
- **Fixed left column** (stat name), right-aligned values
- **Monospace numbers** for perfect column alignment
- Row height: ~36-40px (tight but touchable)
- Creates a "spreadsheet feel" without looking like a spreadsheet

### Pattern 5: Contextual Mini-Visualizations
Instead of separate chart sections, SofaScore embeds tiny visualizations inline:
- **Micro bar charts** next to percentile numbers
- **Tiny heatmap thumbnails** in match lists
- **Colored dots** for form indicators
- **Sparkline-style** rating trend in the header area
These avoid the need to scroll to separate visualization sections.

### Pattern 6: Progressive Disclosure
SofaScore never shows everything at once on mobile:
1. **Level 0**: Summary strip (4-5 key numbers)
2. **Level 1**: Category sections (expandable)
3. **Level 2**: Individual stat details (tap into a stat for context)
4. **Level 3**: Full match detail (tap a match for complete breakdown)

Each level adds depth without cluttering the initial view.

### Pattern 7: Sticky Navigation
On long scrolling pages:
- Tab bar sticks below the header
- Header compresses (photo shrinks, name stays)
- This ensures users always know where they are and can switch sections

---

## 7. What BeScout Should Steal

### 7.1 Rating Badge Design (for L5/L15 Scores)

**Current BeScout state:** GameweekScoreBar.tsx uses vertical bars with three tiers (gold >100, white/neutral 70-100, red <70).

**SofaScore pattern to adopt:**
- **Rounded rectangle badges** with color fill for individual score display
- Color scale mapped to BeScout 0-200 range:
  - 150-200: Gold/Amber (exceptional)
  - 120-149: Green (very good)
  - 100-119: Blue-green/Teal (good)
  - 70-99: Gray/Neutral (average)
  - 40-69: Orange (below average)
  - 0-39: Red (poor)
- White bold monospace number on colored background
- Use these badges everywhere: match lists, player rows, comparison views, portfolio cards
- Consistent visual language = instant readability

### 7.2 Match-by-Match Presentation (for Gameweek Score History)

**Current BeScout state:** Vertical bar chart showing gameweek scores with DNP gaps.

**SofaScore patterns to adopt:**
- **Compact form strip** above the detailed view: 5-10 small colored circles showing recent form
- **Expandable match rows** instead of (or in addition to) bar chart: each gameweek as a row with opponent, score, and rating badge -- tappable to expand for detailed stats
- **Season rating line chart** with 6.5-equivalent baseline (100 for BeScout)
- **Sparkline in the header** showing L5 trend as a tiny inline chart

### 7.3 Stats Categorization (for Radar Chart and Stats Tab)

**Current BeScout state:** RadarChart.tsx with configurable axes, StatistikTab.tsx with season stats.

**SofaScore patterns to adopt:**
- **Pentagon structure with 5 categories** (adapt to BeScout context):
  - Attacking (goals, shots, xG contribution)
  - Technical (passing accuracy, dribbling, ball control)
  - Defensive (tackles, interceptions, aerial duels)
  - Physical (distance, sprints, stamina)
  - Set Pieces / Creativity (key passes, assists, chances created)
- **Position-average overlay** on the radar: show "average midfielder" vs. this player
- **Tappable vertices** that reveal underlying stat details
- **Collapsible stat categories** in the detail tab (Summary, Attack, Passing, Defense, Discipline)
- **Per-game averages** next to totals
- **Percentile bars** next to key stats (horizontal micro-bars showing rank vs peers)

### 7.4 Information Density (BeScout Biggest Opportunity)

**Current BeScout state:** Player page has 5 tabs (profil, markt, rewards, statistik, community) with content that often feels sparse on mobile.

**SofaScore patterns to adopt:**

| Pattern | BeScout Application |
|---------|---------------------|
| Compact horizontal stat strips | Dashboard Strip: floor price, L5, holder count, 24h change in one row |
| Collapsible sections | Stats tab: group by Attack/Defense/Passing, collapse by default except Summary |
| Inline micro-visualizations | Tiny sparklines next to price, tiny form dots next to L5 score |
| Monospace numbers + right-alignment | All financial and stat numbers in font-mono tabular-nums (already in design system) |
| No borders, subtle separators | Replace border-white/10 cards with border-white/[0.04] row dividers |
| Progressive disclosure (3 levels) | Level 0: Dashboard Strip, Level 1: Tab content, Level 2: Expandable sections, Level 3: Modals |
| Scrollable chip filters | Season selector, competition filter, time range selector |
| Sticky compressed header | Player photo shrinks, name persists, Dashboard Strip sticks on scroll |

---

## 8. Key Design Patterns (Visual Language)

### Color Coding System
SofaScore color system is semantic and consistent:

| Element | Color Application |
|---------|-------------------|
| Ratings | 5-tier gradient: Red -> Orange -> Yellow -> Green -> Blue |
| Win/Loss/Draw | Green / Red / Gray |
| Positive stats | Green text or green micro-bar |
| Negative stats | Red text or red micro-bar |
| Active/Selected | Brand blue (fill) |
| Inactive/Default | Gray/muted (outline or low opacity) |
| Player of the Match | Blue badge + star icon |
| Substitution | Arrow icon (green in, red out) |

**BeScout mapping:**
- Gold (#FFD700) replaces SofaScore blue as the "exceptional" indicator
- Green stays green for good performance
- Red stays red for poor performance
- The neutral range uses white/gray at varying opacities (matches BeScout dark theme)

### Typography Hierarchy
SofaScore uses their custom "SofaScore Sans" typeface family:

| Level | Usage | Weight | Relative Size |
|-------|-------|--------|---------------|
| H1 | Player name | Bold | 24px |
| H2 | Section titles | Bold | 18px |
| H3 | Subsection / Category | Medium | 15px |
| Body | Stat labels, descriptions | Regular | 14px |
| Caption | Secondary info, per-game averages | Regular | 12px |
| Numbers | All numerical data | Mono/Bold | Varies (always prominent) |

Key principle: **Numbers are always the most prominent element.** The custom typeface was designed with exaggerated numerical forms -- flattened rounds becoming vertical stems -- specifically to make stats pop. SofaScore Sans includes a Condensed variant for fitting long player/team names in tight spaces.

**BeScout mapping:**
- Use font-black (900) for key numbers (already in design system)
- Use font-mono tabular-nums for all stat values (already in design system)
- Ensure numbers are larger than their labels (not equal size)

### Section Dividers
SofaScore uses minimal dividers to maximize content density:
- **Between sections**: 8-12px vertical spacing (no visible line)
- **Between rows**: 1px line at ~5% opacity
- **Between cards**: 8px gap with slightly different background tint
- **Category headers**: Slightly bolder background tint (~3-5% white) acting as a visual break
- **No heavy borders** -- the content hierarchy comes from spacing and typography, not lines

**BeScout mapping:**
- Reduce reliance on border-white/10 card borders
- Use spacing + typography hierarchy as primary organization
- Reserve cards (bg-white/[0.02] border border-white/[0.06]) for truly distinct content blocks (like trading panels), not every stat group

### Data Table Styling
SofaScore stat tables are their secret weapon for density:
- **Row padding**: 8px vertical, 12px horizontal (tight)
- **Label alignment**: Left-aligned, truncated with ellipsis if needed
- **Value alignment**: Right-aligned, monospace
- **Header row**: Slightly bolder, no background change
- **Hover state** (desktop): Subtle highlight (~3% white)
- **No zebra striping** in current design -- just spacing
- **Scrollable on mobile**: Horizontal scroll for tables with many columns, with the first column (stat name) frozen

### Dark Mode Specifics
SofaScore offers three themes: Light, Dark, and AMOLED Black.

**Dark theme palette** (approximate):
- Background: Dark navy/charcoal (~#1a1a2e or similar)
- Surface/Cards: Slightly elevated (~#252540 or +5% white)
- Text primary: White
- Text secondary: ~60% opacity white
- Text tertiary: ~40% opacity white
- Dividers: ~8-10% opacity white
- Active accent: Brand blue

**AMOLED Black theme:**
- Background: Pure black (#000000)
- Surface: Very slight gray (~#111111)
- Designed for OLED screen power saving

**BeScout mapping:**
- BeScout #0a0a0a background is between Dark and AMOLED -- good position
- Surface tokens (bg-white/[0.02]) match SofaScore subtle elevation approach
- Consider adding a second elevation level (bg-white/[0.04]) for nested cards or hover states

---

## 9. Advanced Visualizations (Maps)

### Heatmap
- Pitch overlay showing positional activity
- Color gradient: cool (blue/transparent) to hot (yellow/red)
- Available per-match and aggregated per-season
- Interactive: tap zones for detail

### Passing Map
- Directional lines on a pitch showing pass locations
- Color coding: successful (solid) vs unsuccessful (dashed/red)
- Line thickness indicates frequency
- Shows passing patterns and preferred zones

### Dribbling Map
- Dots/paths showing dribble attempts
- Successful: Green path, unsuccessful: Red dot
- Concentrated in attacking zones

### Defending Map
- Icons for tackles, interceptions on pitch positions
- Successful: Filled icon, unsuccessful: Hollow
- Shows defensive coverage area

**BeScout applicability:** These pitch-based maps are football-specific and highly engaging. BeScout could integrate simplified versions as premium content, especially in the Performance tab. They add visual interest and depth that pure numbers cannot match.

---

## 10. Summary: Top 10 Takeaways for BeScout Redesign

1. **Rating badges everywhere.** A single, consistent visual element (rounded rectangle, color-coded) for L5/L15 scores used across all surfaces -- player rows, match lists, portfolio, comparison. This is the most recognizable SofaScore pattern.

2. **Pentagon radar chart with 5 fixed categories.** Standardize on 5 clear dimensions for all outfield players. Allow position-average overlay for context.

3. **Compact horizontal stat strips** replace verbose layouts. 4-5 key metrics in a single row with large numbers and tiny labels.

4. **Progressive disclosure (3 levels).** Never show everything at once. Summary strip -> Category sections -> Detail modals/expandables.

5. **Collapsible stat categories** (Attack, Defense, Passing, etc.) instead of monolithic stat tables. Default: Summary expanded, rest collapsed.

6. **Match-by-match as expandable rows** with inline rating badge, opponent, and score. Tap to reveal per-match stats and mini-heatmap.

7. **Sticky compressed header** that shrinks the player photo and persists name + key metrics (Dashboard Strip) on scroll.

8. **Monospace numbers, always prominent.** Numbers larger than labels. Right-aligned. Tabular figures. This is the single biggest contributor to the "data-dense but readable" feel.

9. **Minimal dividers, maximum spacing-based hierarchy.** Reduce card borders, increase reliance on typography weight and spacing to organize content.

10. **Color-coded everything.** Performance has a color. Every number that represents quality should be tinted by its quality band. This eliminates the need to read numbers -- users learn to scan colors.

---

## Sources

- [SofaScore Rating Explained](https://corporate.sofascore.com/about/rating)
- [SofaScore Attribute Overview](https://www.sofascore.com/news/sofascores-attribute-overview-the-ultimate-tool-for-player-analysis/)
- [SofaScore Player Performance: Heatmaps and Stats](https://www.sofascore.com/news/football-player-performance-how-to-use-heatmaps-stats-and-attribute-overviews-to-measure-contribution/)
- [SofaScore New Maps](https://www.sofascore.com/news/introducing-sofascores-new-maps-a-smarter-way-to-read-the-game/)
- [SofaScore Player Comparison](https://www.sofascore.com/news/how-to-compare-players-using-player-stats-to-analyze-strengths-weaknesses-and-form/)
- [SofaScore Typography (Hot Type)](https://hottype.co/projects/sofascore)
- [SofaScore Rating Color Coding](https://www.sofascore.com/news/colorcoding-sofascore-statistical-player-rating/)
- [SofaScore Rating Guidelines](https://www.sofascore.com/rating-guidelines)
- [SofaScore Player Attributes Deep Dive](https://www.sofascore.com/news/a-deep-dive-into-player-attributes-what-attacking-creativity-and-defending-ratings-reveal/)
- [SofaScore Widgets](https://corporate.sofascore.com/widgets)
- [SofaScore Design (Order Design)](https://www.orderdesign.co.uk/sofascore)
- [SofaScore iOS App Store](https://apps.apple.com/us/app/sofascore-live-sports-scores/id1176147574)
- [SofaScore Ratings FAQ](https://sofascore.helpscoutdocs.com/article/50-sofascore-statistical-ratings-explained)
- [SofaScore AMOLED Black Theme](https://www.sofascore.com/news/sofascore-v-6-6-17-black-theme-for-amoled-screens-and-improvements-in-motorsports/)
- [SofaScore New Rating Color Scheme (Twitter/X)](https://x.com/SofascoreINT/status/1797328206820700504)
