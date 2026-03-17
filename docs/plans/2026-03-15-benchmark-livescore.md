# Benchmark: LiveScore, FlashScore, OneFootball -- Player/Match Detail Patterns

> **Purpose:** Competitive analysis of live-score app design patterns for BeScout player page redesign.
> **Date:** 2026-03-15
> **Context:** BeScout is dark mode (#0a0a0a), fan engagement platform where performance data drives trading decisions. The player page must feel like a live dashboard, not a static profile.

---

## 1. LiveScore -- Player Page Patterns

### Information Architecture
- **Minimal-first approach:** LiveScore shows the least data of the three -- scores, recent results, upcoming fixtures, and basic player stats (top scorers, assists). No deep career analytics.
- **Team-centric, not player-centric:** Player data lives under team pages. You navigate Team > Squad > Player, not standalone player profiles.
- **Tabs on team page:** Overview, Fixtures, Results, Standings, Player Stats, Team Stats. Players are a sub-section, not a primary entity.

### Dark Mode Design Language
- LiveScore defaults to a **dark navy/charcoal background** (not pure black), with white text for primary content and gray (#8B8B8B range) for secondary.
- **Accent color:** Deep brand purple for Premier League context, orange/amber for live match indicators.
- **Live matches** get a highlighted card treatment with orange glow and minute counter ("21'"), creating clear visual separation from completed/upcoming matches.
- **High-contrast theme** offered separately -- an accessibility option for users with contrast difficulties.
- Cards use subtle elevation rather than borders: slightly lighter surfaces against the dark background.

### Real-Time Feel
- "FT" (Full Time) badge with muted gray treatment for finished matches vs. bright animated minute counter for live.
- **Instant lineup comparison:** Auto-highlights formation changes between teams, surfacing insights automatically rather than requiring manual analysis.
- Score numbers use noticeably larger font weight than surrounding text -- the score is always the loudest element on screen.

### What BeScout Can Learn
- The "live indicator as accent color break" pattern -- even historical data can feel alive if the most recent data point gets a visual pulse treatment.
- Team-page-first navigation is wrong for BeScout (we need player-first), but the "stats as sub-tabs under a parent entity" pattern is solid.

---

## 2. FlashScore -- Compact Data Mastery

### Player Profile Page Structure (e.g., Haaland)

**Header Section:**
| Element | Content |
|---------|---------|
| Photo | Player profile image (circular) |
| Name | Erling Haaland |
| Position | Forward |
| Club | Manchester City (with logo) |
| Age | 25 (born 21.07.2000) |
| Market Value | EUR 204.2m |
| Contract | Expires 30.06.2034 |

**Primary Tabs:**
1. **Summary** (default) -- Career stats + last matches
2. **News** -- Player-related articles
3. **Transfers** -- Chronological transfer history with fees
4. **Injury History** -- Date ranges + injury types

**Career Stats Sub-Tabs:**
- League | Domestic Cups | International Cups | National Team
- Each shows a table: Season, Team, Competition, Rating, Appearances, Goals, Assists, Yellow/Red Cards
- Totals row at bottom (e.g., 264 appearances, 200 goals)

### The "TOP Stats" Hierarchy -- Key Pattern
FlashScore most important UX innovation is **data categorization by importance:**

1. **TOP Stats** -- The metrics casual users care about: goals, corner kicks, cards. Also the most common betting-adjacent metrics. Shown first, always.
2. **Shots** -- xG, xGOT (xG on Target), shots on/off target
3. **Attack** -- Successful dribbles, accurate crosses, key passes
4. **Passes** -- Expected Assists (xA), long passes (32m+), pass accuracy
5. **Defence** -- Duels won, errors leading to shot/goal, interceptions
6. **Goalkeeping** -- Goals prevented, xGOT Faced, save percentage

**Color-coded highlighting:** Best performances in each stat category get color emphasis on desktop. On mobile, top 3 performers per category are surfaced directly.

**Tooltips for jargon:** Every advanced metric (xGOT, xA) has an explanatory tooltip on hover -- users never wonder what a number means.

### Dark Mode Implementation
- FlashScore underwent a 2-year rebrand by DesignStudio London with 600+ screen designs.
- Dark mode was treated as a first-class theme, not an afterthought -- "new identity colors presented in full scale in dark mode."
- **Background:** Deep dark blue-gray (not pure black, not neutral gray -- tinted toward their brand blue-green).
- **Surface cards:** Slightly elevated with minimal border, lighter shade of the base dark.
- **Accent:** Brand green for primary actions and active states.
- **Score text:** Bold white, largest element on any card.
- **Secondary text:** Cool gray with enough contrast for WCAG AA on dark backgrounds.
- User theme persistence via localStorage with class-based application.
- 50,000+ beta testers validated the dark mode before global launch.

### Match Detail Page
- Transitioned from popup window to **full-page layout** on desktop (important for power users monitoring multiple matches).
- **Toggle control** (top-right icon) to revert to windowed mode for multi-match monitoring.
- Summary tab shows: recent matches list + competition table -- most-needed context in one view.
- Same experience preserved on mobile app (no degradation).

### Navigation Patterns
- Click player name in any match lineup to reach player profile.
- Player profiles link back to team, competition, and specific matches.
- Breadcrumb-style: Competition > Team > Player (but hidden on mobile, replaced by back arrow).
- No swipe-between-players -- each player is a discrete destination.

### What BeScout Can Learn
- **TOP Stats pattern:** Surface the 3-5 metrics that matter most for trading decisions FIRST. Hide the rest behind expandable categories.
- **Tooltip everything:** BeScout has xG-like metrics (L5 Score, PBT Rating) that need explanation.
- **Market value + contract in header:** This is exactly what DPC traders need -- contract end date drives liquidation timeline.
- **Career progression table:** Season-by-season stats tell a performance story that influences buy/sell decisions.
- **Color-coded standout metrics:** Highlight personal bests or above-average stats in gold.

---

## 3. OneFootball -- Editorial + Data Hybrid

### App Architecture (4 Bottom Tabs)
1. **Home** -- Personalized feed: news, videos, transfers, scores (all mixed)
2. **Matches** -- Live scores, fixtures, results by competition
3. **News** -- Pure editorial content stream
4. **More** -- Settings, favorites, profile

### Player Page Design
- **Comprehensive tabs** for career history, news, and performance stats.
- **Heatmaps:** Show where a player performs best on the pitch -- visual, not tabular.
- **Shot and Save charts:** Visual representation of shot placement and goalkeeper saves.
- **Individual match stats via Lineups tab:** Click a player in any match lineup to see their performance.
- **Opta-powered data:** Goals, accuracy, tackles, distribution stats at depth.

### Editorial + Data Hybrid Approach
OneFootball unique strength is blending **journalism with statistics:**
- Player pages include both hard stats AND related news articles.
- Transfer rumors sit alongside performance data -- the "narrative" around a player.
- News cards use large imagery + headlines (content-first, not data-first).
- "Shorts" video format integrated into feeds -- bite-sized content between stats.
- **Community elements:** Polls, comments within editorial pieces create engagement.
- **Gamification section:** Quizzes and achievements encourage return visits with badge systems.

### 2025/26 Season Feature Additions
- **Match Stats leaders:** New section showing which players lead every statistical category.
- **Enhanced Lineups:** Manager info, stadiums, attendance, injury updates.
- **Player filters:** Nationality, age, stats directly on lineup displays.
- **Expanded Head-to-Head:** Pre-match context for upcoming fixtures.
- **Live ticker improvements:** xG and Win Probability added to live feeds.
- **Reduced ad load** on Home -- user experience prioritized over monetization.

### Visual Design (Red Dot Award Winner)
- Brand claim: "Football for the people" -- community-centered visual strategy.
- **Bottom tab navigation** with bright green accent color on active tab.
- Iconography + text pairing on every navigation item.
- Photography of real fans integrated into brand design -- users see themselves.
- Clean, contemporary aesthetic prioritizing readability.
- Soft paywall: "Minimal ads, maximum experience!" messaging on profile pages.

### What BeScout Can Learn
- **News + data on one page:** BeScout Community tab (scouting reports) should appear on the player page alongside stats. OneFootball proves this hybrid works.
- **Heatmaps as visual anchors:** A single heatmap is worth 20 stat rows for quick scanning.
- **Transfer context alongside performance:** BeScout has DPC price charts -- adding "market sentiment" (scouting reports, community valuation) next to the chart follows OneFootball editorial+data pattern.
- **Gamification integration:** Quizzes/achievements on player pages drive engagement without cluttering the stats experience.

---

## 4. Real-Time Feel -- How to Make Historical Data Feel Alive

### Patterns Observed Across All Apps

#### a) Live Pulse Indicator
- Red/green dot with keyframe animation (scale 1 to 1.5, opacity 1 to 0)
- Placed next to "LIVE" text label
- transform + opacity only (compositor-friendly, no layout thrashing)
- Always paired with visible text label for accessibility

Used by: All three apps for live matches. BeScout can adapt for "Last updated X ago" on player data.

#### b) Temporal Badges
| State | Visual Treatment |
|-------|-----------------|
| Live | Bright accent color + pulse animation + minute counter |
| Recent (< 24h) | Warm color, "Today" or "Yesterday" label |
| Historical | Muted gray, date format |
| Upcoming | White/neutral, countdown or date |

**Key insight:** The **recency gradient** (bright to muted as time passes) creates a sense that data has a "freshness temperature." Even daily-update data like BeScout can feel alive if the most recent gameweek gets the "warm" treatment.

#### c) Score/Price Update Animations
- **Number flip:** Score digits animate when changing (counter rolls up/down).
- **Background flash:** Brief color pulse behind updated values (green for positive, red for negative).
- **Slide-in:** New data rows slide in from the right, pushing old data down.
- All animations are short (200-300ms) and use prefers-reduced-motion respect.

#### d) Freshness Indicators
- "Updated 2h ago" timestamps on data sections.
- "Last match: 3 days ago" contextual timestamps on player profiles.
- "Next: vs. Fenerbahce in 4 days" countdown on upcoming fixtures.
- **Relative time** (not absolute dates) for anything within 7 days.

#### e) State Transitions
- Smooth crossfades between tab content (not hard cuts).
- Skeleton loading states that match the final layout shape.
- Optimistic UI updates: action happens visually before server confirms.

### What BeScout Should Implement
1. **"Last Gameweek" pulse badge** on the most recent GW score row.
2. **Price change flash** on the DPC price when navigating to the page (brief green/red highlight).
3. **Relative timestamps** everywhere: "Scored 2 days ago" instead of "12.03.2026."
4. **Countdown to next match** in the player header.
5. **Skeleton loading** that matches final layout (already partially implemented).

---

## 5. Match Context Integration on Player Pages

### How Live-Score Apps Show Fixtures

#### Calendar Strip Pattern (FotMob/FlashScore)
- Horizontal scrollable date strip at top.
- Bold indicator on current day, dots under days with matches.
- Swipe left/right to change date range.

#### Recent Results + Upcoming Fixtures (All Apps)
- Results show: opponent, score, W/D/L badge, player individual stats.
- Upcoming show: opponent, home/away indicator, competition.

#### Fixture Difficulty Ratings (FPL Ecosystem)
- Color scale: Green (easy, 1-2) to Yellow (medium, 3) to Red (hard, 4-5).
- Based on opponent league position, home/away form, historical results.
- Color-coded for instant scanning: green=easy fixture, red=hard fixture.
- FPL tools show this as a **fixture ticker**: horizontal strip with 5-6 upcoming GWs, each cell colored by difficulty.

#### Opponent Strength Indicators
- League position badge next to opponent name (e.g., "FEN (2nd)").
- Form icons: last 5 results as W/D/L circles for the opponent.
- Goal difference or points as a secondary strength metric.

### What BeScout Should Build
- **Fixture difficulty strip** on the player profile: next 5 GWs, color-coded cells, essential for Fantasy managers deciding lineup picks.
- **"Recent performance vs. upcoming difficulty" juxtaposition:** Show last 3 GW scores alongside next 3 opponents difficulty. This is a trading signal.
- **Home/Away badge** on each fixture (SAK scores differently home vs away -- this matters for DPC valuation).

---

## 6. Form Visualization Patterns

### W/D/L Form Strip (Universal Pattern)
- **Circles** (FlashScore, SofaScore): Colored dots -- green=W, gray=D, red=L.
- **Letters** (FotMob, LiveScore): W/D/L in colored boxes.
- **Score sequences** (detailed view): "2-1, 0-0, 3-1, 1-2, 2-0" with color.
- Always reads **left=oldest, right=most recent** (chronological).
- Typically shows last 5 matches, expandable to 10.

### Performance Trend Arrows
- **Direction arrows** next to key metrics showing trend vs. average.
- **Color coding:** Green arrow = improving, red = declining, gray = stable.
- Usually compare last 5 matches vs. season average.

### SofaScore Attribute Pentagon
- 5 key attributes (Technical, Attacking, Tactical, Defending, Creativity) on a radar/pentagon chart.
- Filled area shows player relative strengths.
- Color matches player team or a neutral accent.
- **Instant visual impression** of player type without reading numbers.

### SofaScore Heatmap
- Pitch overlay with color intensity showing positional presence.
- Vivid/bright colors = high activity zones.
- Pale tones = rarely visited areas.
- Available per-match and aggregated across season.

### SofaScore Advanced Maps (New)
- **Passing Map:** Directional colored lines showing pass origins and targets.
- **Dribbling Map:** Ball carry paths across the pitch.
- **Defending Map:** Tackle/interception locations plotted on pitch.
- Each map reveals spatial dominance patterns invisible in tabular stats.

### What BeScout Should Build
1. **L5 Form Strip:** 5 colored circles (based on L5 score thresholds) showing last 5 GW performances. Tap to expand to full score + opponent.
2. **Trend arrow on L5 Score:** Compare last 5 vs. season average, show direction.
3. **Simplified radar chart** (already exists as RadarChart.tsx -- enhance with SofaScore-style pentagon for quick scanning).
4. **GameweekScoreBar enhancement:** Already exists -- add W/D/L color coding and opponent labels.

---

## 7. Navigation Patterns for Deep Player Pages

### Back Button vs. Breadcrumbs
| App | Desktop | Mobile |
|-----|---------|--------|
| FlashScore | Breadcrumb: Competition > Team > Player | Back arrow only |
| OneFootball | Bottom tabs + back arrow | Bottom tabs + back arrow |
| LiveScore | Breadcrumb path | Back arrow only |
| FotMob | Header with back arrow | Header with back arrow |
| SofaScore | Breadcrumb: League > Team > Player | Back arrow only |

**Consensus:** Mobile never uses breadcrumbs. A single back arrow is universal. Desktop can show breadcrumbs for wayfinding but they are secondary to the back action.

### Swipe Navigation
- **Between dates:** Horizontal swipe on calendar strips (universal).
- **Between tabs:** Swipe left/right to change tabs within a page (OneFootball, FotMob).
- **Between players:** NOT standard. No app supports swiping between players -- each player is a discrete navigation target.
- **Between matches:** SofaScore allows swiping between matches in the same gameweek.

### Related Players / Contextual Links
- **Same team:** Squad list accessible from player page (FlashScore, SofaScore).
- **Similar position:** Not standard in any live-score app (but common in fantasy apps).
- **Transfer connections:** FlashScore shows transfer history linking to clubs.
- **Match opponents:** Clicking opponent name in recent results navigates to that team.

### Deep Linking
- All apps support deep links to player profiles: /player/{slug}/{id}.
- URL structure includes human-readable slugs for SEO.
- Deep links recreate proper back-stack (you can always navigate "up" to team/competition).

### What BeScout Should Implement
- **Back arrow + contextual title** in mobile header (e.g., "Back to Sakaryaspor Squad").
- **Swipe between tabs** on the player page (already have TabBar -- add gesture support).
- **"Similar Players" section:** Show 3-4 players of same position + similar price range -- a trading signal unique to BeScout.
- **Deep link support** for sharing player pages in community/social features.

---

## 8. Dark Mode Excellence -- Lessons from the Masters

### Color Palette Comparison

| Layer | FlashScore | SofaScore | FotMob | LiveScore | **BeScout Current** |
|-------|-----------|-----------|--------|-----------|-------------------|
| Background | Deep blue-dark (#0D1117 range) | Material dark (#121212 range) | Dark charcoal (#1A1A2E range) | Dark navy (#101820 range) | **#0a0a0a** |
| Surface/Card | +5% white overlay | +7% white overlay (dp02) | +5-8% elevation | +5% lighter | **white/[0.02]** |
| Border | Subtle, minimal | white/8-10% | Minimal | Minimal | **white/[0.06-0.10]** |
| Primary Text | Pure white | #FFFFFF or #F5F5F5 | White | White | **white** |
| Secondary Text | Cool gray (#8B8B8B) | #B0B0B0 | #999 | #8B8B8B | **white/50+** |
| Accent | Brand green | Blue (#1A73E8) | Green | Purple/Orange | **Gold #FFD700** |
| Win/Positive | Green (#4CAF50) | Green (#4CAF50) | Green | Green | **green-500** |
| Loss/Negative | Red (#E53935) | Red (#FF5252) | Red | Red | **rose-500** |
| Draw/Neutral | Gray | Gray/Yellow | Gray | Gray | **white/30** |

### Key Dark Mode Principles (Consensus)

1. **Never pure black (#000000).** All apps use slightly tinted dark backgrounds. FlashScore tints toward blue, FotMob toward purple-blue, LiveScore toward navy. BeScout #0a0a0a is very close to pure black -- consider shifting to #0C0C0E or #0A0B0D for a subtle warm/cool tint.

2. **Elevation = lighter, not shadows.** In dark mode, higher surfaces are LIGHTER (opposite of light mode). Material Design prescribes white overlay percentages: 5% for dp01, 7% for dp02, 12% for dp08. BeScout uses white/[0.02] which is only 2% -- possibly too subtle for clear hierarchy.

3. **Desaturate colors by ~20%.** Saturated colors on dark backgrounds cause eye strain. FlashScore green accent is a slightly muted green, not pure #00FF00. BeScout gold (#FFD700) may benefit from slight desaturation on certain surfaces.

4. **Accent color restraint.** Every app uses their accent sparingly -- only for: active tab indicators, primary CTAs, live/important badges. Never for backgrounds or large areas. BeScout should ensure gold is used as a highlight, not a flood.

5. **Minimum contrast 4.5:1.** All apps maintain WCAG AA minimum. On #0a0a0a, text below ~#737373 fails contrast. BeScout white/50 (#808080) is borderline -- verify with contrast checker.

6. **Status colors are universal.** Green=positive/win/live, Red=negative/loss/error, Amber=warning/draw is a global convention. BeScout should not deviate from this for any data-driven indicators.

### BeScout-Specific Recommendations
- Consider tinting the base background very slightly warm (toward #0B0A09) to differentiate from generic dark themes and complement the gold accent.
- Increase card surface opacity from white/[0.02] to white/[0.04] for clearer elevation hierarchy.
- Add a third surface level: white/[0.06] for modals and floating elements (already defined as surface-modal in design tokens).
- Ensure all secondary text meets 4.5:1 contrast ratio on the actual background color used.

---

## 9. What BeScout Should Steal

### Priority 1 -- Fixture Difficulty Indicators (Fantasy Managers)
- Color-coded by opponent strength (league position + form algorithm).
- Home/Away indicator affects difficulty (away = harder by default).
- Essential for Fantasy lineup decisions -- "should I captain this player this GW?"
- Compact: fits in a single row on mobile, expandable on tap.

### Priority 2 -- L5 Form Strip (Quick Scanning)
- Each circle color maps to L5 score thresholds (already defined in getL5Color).
- Below each circle: score value, match result, opponent abbreviation.
- Tap any circle to see full match stats.
- **This replaces paragraph descriptions with instant visual scanning.**

### Priority 3 -- "Live Feel" UI Patterns
| Pattern | Implementation | Effort |
|---------|---------------|--------|
| Pulse dot on latest GW | CSS keyframe animation on most recent GW score | Low |
| Price change flash | Brief bg-green/bg-red flash on DPC price load | Low |
| Relative timestamps | "2 days ago" instead of "13.03.2026" | Low |
| Next match countdown | "vs FEN in 3d 14h" in player header | Medium |
| Number roll animation | Counter animation on stats when tab opens | Medium |
| Skeleton loaders | Layout-matching skeletons per tab | Done |
| "Updated after GW28" | Freshness label on stats sections | Low |

### Priority 4 -- Dark Mode Refinements
| Current | Proposed | Rationale |
|---------|----------|-----------|
| #0a0a0a flat | #0A0B0D slight cool tint | Depth perception, matches gold accent |
| white/[0.02] cards | white/[0.04] cards | Clearer elevation hierarchy |
| No inset light on all cards | inset 0 1px 0 rgba(255,255,255,0.06) | Top-edge light catch, premium feel |
| Gold everywhere possible | Gold only on CTAs + badges + active states | Restraint = premium |
| white/50 secondary text | white/60 minimum | Ensure WCAG AA compliance |

### Priority 5 -- Compact Stat Presentation (Mobile)
FlashScore **TOP Stats** pattern adapted for BeScout:

**TOP STATS (always visible):**
- L5 Score: 7.2 (trending up, green)
- Market Val: 2,450 $S (+12%)
- GW Points: 48/28 GWs
- Holders: 127 (+8 this week)

**PERFORMANCE (expandable):**
- Goals 12 | Assists 5
- Tackles 34 | xG 10.8
- Pass% 82 | Minutes 2,340

**TRADING (expandable):**
- Ask Price: 2,500 $S
- Bid Price: 2,380 $S
- Spread: 4.8%
- Volume 24h: 12 trades

### Priority 6 -- Match Timeline Events
- Vertical timeline, newest event at top.
- Icons: goal, card, substitution, VAR, injury.
- Player-filtered: on a player page, show only events involving this player (with full match context expandable).
- Essential for understanding "what happened in this match" without watching highlights.

---

## 10. Symbiosis -- Combining Live-Score Dynamism with BeScout Trinity

### The Three Personas and What They Need from Live-Score Patterns

#### Trader Persona
From live-score apps, traders need:
- **Price trend arrows** (like form arrows) -- is the DPC trending up or down?
- **Match performance to price correlation:** Show last 5 GW scores alongside DPC price movement.
- **Orderbook depth as a live-feeling chart** (already built as OrderDepthView).
- **"Market activity" pulse:** "12 trades in last 24h" with recency indicator.

#### Fantasy Manager Persona
From live-score apps, Fantasy managers need:
- **Fixture difficulty strip** -- the single most requested feature in FPL tools.
- **Form strip** -- last 5 GW scores with W/D/L color coding.
- **Captain pick confidence:** "Haaland has scored in 4 of last 5 home games vs bottom-half teams."
- **Injury/fitness status** with traffic light indicator (green=fit, amber=doubt, red=out).

#### Scout/Analyst Persona
From live-score apps, scouts need:
- **SofaScore-style attribute pentagon** -- instant visual player profile.
- **Heatmap** -- positional presence data.
- **Career progression table** -- FlashScore-style season-by-season stats.
- **Community sentiment** alongside hard data -- OneFootball editorial+data model.

### The Unified Player Dashboard Layout

**Header:**
- Back navigation + Player photo + Name + Club + Position
- L5 Score with form dots and trend arrow
- Next match countdown with difficulty indicator

**Quick Stats Bar:**
- DPC Price with trend (flash animation on load) | Holder count with weekly delta

**Tab Bar:**
- Profil | Markt | Stats | Community | XP

**Above-the-fold Content (Profil tab):**
- FORM: Last 5 GW colored circles with score, result, opponent
- FIXTURE DIFFICULTY: Next 5 GW color-coded cells
- TOP STATS: L5 Score, Goals, xG, Assists, Minutes, Pass%
- [More Stats] expandable

**Below-the-fold Content:**
- RECENT MATCH EVENTS (player-filtered timeline)
- CAREER PROGRESSION (season-by-season table)
- RADAR CHART (attribute pentagon)
- SIMILAR PLAYERS (same position, similar price)

**Footer:**
- "Updated after GW28 -- 2 days ago" freshness label

### Design Principles for the Hybrid

1. **Data temperature:** Most recent data is "hot" (bright, prominent). Older data is "cool" (muted). This creates the live-score feeling with daily-update data.

2. **Progressive disclosure:** TOP Stats visible immediately. Full stats behind "More." Match events behind "expand." This is FlashScore core pattern.

3. **Triple context on every metric:** Show the number + trend direction + comparison point. "7.2 up vs 6.8 avg" is more useful than "7.2" alone.

4. **Trader-first above the fold:** DPC price, holder count, and trend arrow in the hero section -- this is what drives engagement. Stats are supporting evidence.

5. **Fantasy-first on the form section:** Fixture difficulty + form strip immediately after the hero. Fantasy managers need to make quick decisions.

6. **Scout depth below the fold:** Detailed career stats, radar chart, and community analysis for users who want to go deep.

7. **Every section has a timestamp:** "Updated after GW28 -- 2 days ago" -- this builds trust and creates the "living document" feel.

8. **Micro-animations on arrival:** Price flashes, form strip animates in left-to-right, fixture difficulty cells fade in with stagger delay. Subtle, purposeful, 200-300ms per element.

---

## Appendix A: Component Mapping

| Live-Score Pattern | BeScout Component | Status | Priority |
|-------------------|-------------------|--------|----------|
| Form Strip (W/D/L) | New: FormStrip.tsx | To Build | P1 |
| Fixture Difficulty | New: FixtureDifficulty.tsx | To Build | P1 |
| Pulse Live Indicator | CSS utility class | To Build | P1 |
| Relative Timestamps | Utility: formatRelativeTime() | To Build | P1 |
| TOP Stats Hierarchy | Enhance: ProfilTab.tsx | Refactor | P2 |
| Match Timeline (filtered) | New: PlayerMatchTimeline.tsx | To Build | P2 |
| Price Change Flash | Enhance: PlayerHero.tsx | To Build | P2 |
| Trend Arrows | New: TrendArrow.tsx | To Build | P2 |
| Attribute Pentagon | Enhance: RadarChart.tsx | Refactor | P3 |
| Countdown Timer | New: NextMatchCountdown.tsx | To Build | P3 |
| Number Roll Animation | CSS/JS utility | To Build | P3 |
| Similar Players Section | New: SimilarPlayers.tsx | To Build | P3 |
| Career Progression Table | New: CareerStats.tsx | To Build | P3 |
| Swipe Between Tabs | Enhance: TabBar.tsx | Refactor | P4 |

## Appendix B: Sources

### LiveScore
- [LiveScore App - Apple App Store](https://apps.apple.com/us/app/livescore-live-sports-scores/id356928178)
- [LiveScore Themes Documentation](https://www.live-score-app.com/userguide/themes)
- [LiveScore Premier League Page](https://www.livescore.com/en/football/england/premier-league/)

### FlashScore
- [FlashScore Stats Redesign Announcement](https://www.flashscore.com/news/more-data-to-help-you-read-the-game-flashscore-s-football-stats-get-a-facelift/42Kj2YYI/)
- [FlashScore Match Details Redesign](https://www.flashscore.com/news/new-look-match-details-on-flashscore-a-full-page-instead-of-a-small-window/QJg8Wtgg/)
- [FlashScore Player Detailed Statistics](https://www.flashscore.co.uk/news/players-under-the-magnifying-glass-a-look-at-players-detailed-statistics/6Vt63FoI/)
- [FlashScore Dark Mode by Martin Prokop (Dribbble)](https://dribbble.com/shots/17420385-Flashscore-dark-mode)
- [FlashScore Haaland Player Page](https://www.flashscore.com/player/haaland-erling/UmV9iQmE/)
- [FlashScore Rebrand - Football Italia](https://football-italia.net/flashscore-enters-a-new-era-with-a-new-look/)

### OneFootball
- [OneFootball App (ScreensDesign Analysis)](https://screensdesign.com/showcase/onefootball-all-soccer-scores)
- [OneFootball 2025/26 Season Improvements](https://onefootball.com/en/news/onefootball-app-improvements-as-the-202526-season-gets-underway-41516423)
- [OneFootball Red Dot Design Award](https://www.red-dot.org/project/onefootball-12472)
- [OneFootball Help Center - Features](https://onefootballsupport.zendesk.com/hc/en-us/articles/4412970161937-What-does-the-OneFootball-app-offer)

### SofaScore (Supplementary)
- [SofaScore Player Performance: Heatmaps and Stats](https://www.sofascore.com/news/football-player-performance-how-to-use-heatmaps-stats-and-attribute-overviews-to-measure-contribution/)
- [SofaScore New Maps: Passing, Dribbling, Defending](https://www.sofascore.com/news/introducing-sofascores-new-maps-a-smarter-way-to-read-the-game/)

### FotMob (Supplementary)
- [FotMob Design Critique - IxD at Pratt](https://ixd.prattsi.org/2021/09/design-critique-fotmob-android-app/)
- [FotMob Player Ratings Explained](https://www.scribd.com/document/920258497/Stats-Definitions-FotMob)

### General Sports App Design
- [Design Patterns for Sports Apps and Live Events - Ably](https://ably.com/blog/design-patterns-sports-live-events)
- [Sports App UI Design Tips - Togwe](https://www.togwe.com/blog/sports-app-ui-design/)
- [Live Score Features Strategy - Moldstud](https://moldstud.com/articles/p-enhance-your-sports-app-experience-top-strategies-for-effective-live-score-features)
- [Dark Mode Best Practices 2025 - UiNkits](https://www.uinkits.com/blog-post/best-dark-mode-ui-design-examples-and-best-practices-in-2025)
- [FPL Fixture Difficulty Ticker - Fantasy Football Hub](https://www.fantasyfootballhub.co.uk/fixture-ticker)
- [CSS Pulsing Live Indicator - CSS3 Shapes](https://css3shapes.com/how-to-make-a-pulsing-live-indicator/)
