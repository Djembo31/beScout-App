# Competitor Player Scoring & Rating Systems — Research

> Researched 2026-03-25. Sources: Official docs, help centers, academic comparison paper.

---

## Executive Summary

| Platform | Type | Scale | Baseline | Decimals | Match vs Season | Color Coding |
|----------|------|-------|----------|----------|-----------------|--------------|
| **Sorare** | Fantasy/Trading | 0-100 pts | 35 (starter) / 25 (sub) | Integer | Match PS + L5/L15/L40 averages | Card rarity colors (not score-based) |
| **FotMob** | Stats App | 0-10 | 6.0 | 1 decimal | Match rating + season average | Not publicly documented |
| **SofaScore** | Stats App | 3-10 | 6.5 | 1 decimal | Match rating + season average | 6-tier color system (red to blue) |
| **WhoScored** | Stats App | 1-10 | 6.0 | 2 decimals | Match rating + season average | Green (up) / Red (down) live |
| **FPL** | Fantasy | Unbounded pts | 2 pts (appearance) | Integer | Match points + total season pts | N/A (cumulative points) |
| **OneFootball** | News/Content | 0-10 | ~6.0 | 1 decimal | Match only (editorial) | Not documented |

---

## 1. Sorare

**Type:** NFT-based fantasy football with card trading

### Scoring Scale
- **0-100 points** per match (integer)
- Two components: **Decisive Score (DS)** + **All-Around Score (AA)**

### Decisive Score (DS) — Level System
| Level | Score | Trigger |
|-------|-------|---------|
| -1 | 15 | Red card, own goal |
| 0 | 35 (starter) / 25 (sub) | Baseline |
| 1 | 60 | 1 decisive action (goal, assist, pen save) |
| 2 | 70 | 2 decisive actions |
| 3 | 80 | 3 decisive actions |
| 4 | 90 | 4 decisive actions |
| 5 | 100 | 5 decisive actions |

**Key rule:** Once Level 1+ reached, negative AA cannot reduce below DS floor.

### All-Around Score (AA) — 6 Categories
| Category | Key Actions | Range |
|----------|-------------|-------|
| General | Yellow cards (-3), fouls | Negative-heavy |
| Defending | Clean sheet (+10 DEF), tackles (+3), Double-Doubles (+4) | +2 to +10 |
| Passing | Big chance created (+3), accurate final-third passes (+0.1-0.5) | +0.1 to +3 |
| Possession | Interceptions (+2-3), turnovers (-0.3 to -1.0) | -1 to +3 |
| Attacking | Shots on target (+3), missed big chance (-5), pen miss (-5) | -5 to +3 |
| Goalkeeping | Diving save (+3), sweeper (+5), unclaimed cross (-5) | -5 to +5 |

### Display Format
- **Match Score:** Single integer 0-100 on card
- **Averages:** L5 (last 5 games), L15 (last 15), L40 (last 40)
- Default display changed from L5 to **L15** (key for Capped Modes)
- **Card Score (CS):** Player Score + bonuses (XP level, captain, card rarity)
- Card rarity colors: Common (white), Limited (yellow), Rare (red), Super Rare (blue), Unique (brown)
- **No score-based color coding** — colors tied to card rarity, not performance

### Match Score vs Card Value
- **Player Score (PS):** Raw 0-100 match performance
- **Card Score (CS):** PS + XP bonus + captain bonus + rarity bonus (competition entry)
- **Card market value:** Driven by L15 average, rarity, player popularity, not a single score
- Cards with L15 > 65 command premium prices

**Data provider:** Opta

---

## 2. FotMob

**Type:** Football statistics & live scores app

### Scoring Scale
- **0-10** (1 decimal place, e.g., 7.5)
- Baseline: **6.0** for each player
- Minimum play time: **10 minutes** to receive a rating
- Range in practice: 0.3 to 9.9

### Methodology
- Based on **300+ in-game indicators**
- Uses **13 different positional classifications** for position-adjusted ratings
- Algorithm is **not publicly disclosed**
- Offensive metrics (shots on target, key passes, take-ons) have highest impact
- Defensive metrics (clearances) have smaller but consistent impact

### Display Format
- Single decimal number (e.g., 7.5)
- Updated in **real-time** during matches
- Post-match adjustments occur after final whistle
- Man of the Match (MOM) designation changes with post-match recalculation

### Match vs Season
- **Match rating:** Per-game 0-10 score
- **Season average:** Average across all matches played
- Both displayed in player profiles and league statistics pages

### Known Quirks
- Generous toward strikers (rarely below 6.0)
- Harsh on goalkeepers who concede 2+ goals
- Generous overall compared to other platforms

**Data provider:** Not publicly specified (believed to be Opta-adjacent)

---

## 3. SofaScore

**Type:** Football statistics & live scores app

### Scoring Scale
- **3.0-10.0** (1 decimal place)
- Baseline: **6.5** for each player
- Minimum play time: **10 minutes**

### Methodology
- **Machine learning algorithm** (not manual)
- Analyzes **hundreds of data points** per match
- 5 action categories: Shooting, Passing, Dribbling, Defending, Goalkeeping
- Context-weighted: same action valued differently based on game situation
- Updated **60 times during a match** + post-match adjustments
- ~2,000 iterations across all players per match

### Color Coding System (6 tiers)
| Range | Color | Hex | Label |
|-------|-------|-----|-------|
| 3.0 - 5.9 | Red | #DC0C00 | Poor |
| 6.0 - 6.4 | Orange | #ED7E07 | Below Average |
| 6.5 - 6.9 | Yellow/Gold | #D9AF00 | Average |
| 7.0 - 7.9 | Green | #00C424 | Good |
| 8.0 - 8.9 | Cyan/Teal | #00ADC4 | Very Good |
| 9.0 - 10.0 | Blue | #374DF5 | Excellent |

### Display Format
- Rounded pill/badge with colored background matching the tier
- 1 decimal place (e.g., "7.3" on green badge)
- Player of the Match: highlighted badge
- **Player of the Season:** highest average SofaScore Rating in a league
- Top-rated players in 120 leagues get **in-app badge** + physical trophy for major leagues

### Match vs Season
- **Match rating:** Individual game, 3.0-10.0
- **Season rating:** Average across all matches
- Both are clearly separated in the UI

### Key Positive Factors
Goals, assists, big chances created, penalty saves, clearances off the line, successful tackles

### Key Negative Factors
Red cards, own goals, penalties committed, errors leading to goals, missed big chances

**Data provider:** Opta

---

## 4. WhoScored

**Type:** Football statistics platform (web-focused)

### Scoring Scale
- **1.0-10.0** (2 decimal places, e.g., 7.23)
- Baseline: **6.0** for each player

### Methodology
- Based on **200+ raw statistics** per match
- Proprietary algorithm (not disclosed)
- Events valued by "researched perception of the effect on the outcome"
- Positive events valued against negative events
- Offensive metrics (shots on target, key passes, take-ons) have highest impact
- Updated **live every 30 seconds** during matches

### Color Coding
- **Green flash:** Rating just increased (positive event occurred)
- **Red flash:** Rating just decreased (negative event occurred)
- **Green star:** Man of the Match (awarded 10 min after full time)
- Static display: appears to use green-orange-red spectrum for final ratings

### Display Format
- 2 decimal places (e.g., "7.23") — most precise of all platforms
- Live flashing indicators during matches
- Man of the Match with green star badge

### Match vs Season
- **Match rating:** Per-game 1.0-10.0
- **Season average rating:** Displayed in player profiles
- **Strengths/Weaknesses:** Derived from season-long statistical patterns
- Season leaderboards by average rating

**Data provider:** Opta

---

## 5. Fantasy Premier League (FPL)

**Type:** Official Premier League fantasy game

### Scoring Scale
- **Unbounded points system** (cumulative, no max)
- Typical match: 2-15 points; exceptional: 20+ points
- Season total: top players reach 200-250+ points

### Point Values by Position

| Action | GK | DEF | MID | FWD |
|--------|-----|-----|-----|-----|
| Playing < 60 min | 1 | 1 | 1 | 1 |
| Playing 60+ min | 2 | 2 | 2 | 2 |
| Goal scored | 10 | 6 | 5 | 4 |
| Assist | 3 | 3 | 3 | 3 |
| Clean sheet | 4 | 4 | 1 | 0 |
| 3 saves | 1 | - | - | - |
| Penalty save | 5 | 5 | 5 | 5 |
| Penalty miss | -2 | -2 | -2 | -2 |
| 2 goals conceded | -1 | -1 | - | - |
| Yellow card | -1 | -1 | -1 | -1 |
| Red card | -3 | -3 | -3 | -3 |
| Own goal | -2 | -2 | -2 | -2 |
| **Def. contributions** (NEW 2025/26) | 2 (10 acts) | 2 (10 acts) | 2 (12 acts) | 2 (12 acts) |

### Bonus Points System (BPS)
- Top 3 performers per match earn bonus: 3 / 2 / 1 points
- Based on 30+ match statistics (goals, assists, key passes, tackles, saves, etc.)
- Ties: both players receive same bonus tier

### ICT Index (Influence, Creativity, Threat)
- **NOT a scoring system** — it's an analytical tool for managers
- Condenses 40+ match stats into 3 sub-scores + overall index
- **Influence:** Goals, assists, defensive actions (impact on match)
- **Creativity:** Passing, crossing, final ball quality
- **Threat:** Shots, shot quality, pitch location
- Helps assess FPL potential but does NOT award points

### Player Value System
- Players priced from 4.0m to 14.0m+
- Price changes daily based on **transfer activity** (supply/demand), NOT performance
- Max +/-0.1m per day, max 3 changes per gameweek
- Selling profit: only 50% of price increase (buy at 6.0, rises to 6.4 = sell at 6.2)
- Captain: 2x points; Triple Captain chip: 3x points

### Match Points vs Player Value
- **Completely separate concepts**: points = on-pitch performance; price = manager demand
- A player can score 0 points and still rise in price if heavily transferred in
- Total points influence manager demand, which influences price — but indirectly

**Data provider:** Opta (official PL data)

---

## 6. OneFootball

**Type:** Football news & content platform

### Scoring Scale
- **0-10** (1 decimal place)
- In practice: 1-10

### Methodology
- **Third-party provided** ratings (not generated by OneFootball)
- **Editorial/human component** — not purely algorithmic
- Context-sensitive: scoring in Champions League knockout > scoring vs relegation side
- Match outcome affects ratings (poor team result = lower individual ratings)

### Display Format
- Single decimal number
- No publicly documented color coding
- Primarily a **content feature**, not a core analytics product

### Match vs Season
- **Match ratings only** — no persistent season average system
- Used primarily in match reports and post-match content

### Scale Interpretation
- 6.0 = average/baseline
- 8.0+ = significant (hard to achieve)
- 9.0+ = exceptional (very rare)
- Context of match heavily weighted

**Data provider:** Third-party (not specified publicly)

---

## Key Patterns & Insights for BeScout

### 1. Two Distinct Concepts Across All Platforms
Every platform separates these (explicitly or implicitly):
- **Match Performance Score:** How well did the player perform in THIS game?
- **Overall Value/Rating:** How good is the player overall? (season avg, market value, card price)

### 2. Scale Choice Tradeoffs
| Scale | Used By | Pros | Cons |
|-------|---------|------|------|
| 0-10 | FotMob, SofaScore, WhoScored, OneFootball | Intuitive (school grades), easy to compare | Narrow range, hard to differentiate |
| 0-100 | Sorare | Wide range, precise differentiation, feels "gamified" | Can feel arbitrary, harder to intuitively grasp |
| Unbounded pts | FPL | Great for cumulative/fantasy, clear action-value mapping | Not comparable across matches without context |

### 3. Color Coding is Standard
- SofaScore has the **best-documented** 6-tier system (red/orange/gold/green/teal/blue)
- Most platforms use some form of red (bad) to green (good) spectrum
- Blue/purple reserved for exceptional (9.0+) — creates "aspirational" tier
- This is effectively universal UX for rating display

### 4. Baseline Matters
- 0-10 systems start at **6.0-6.5** (so a "5" already feels bad)
- Sorare starts at **35** (so even appearing gives you a third of max)
- FPL starts at **2** (just for showing up 60+ minutes)
- The baseline creates the emotional anchor for the scoring experience

### 5. L5/L15/L40 Averaging (Sorare's Pattern)
- Sorare's L5/L15/L40 is directly relevant to BeScout's existing L5/L15 system
- Sorare shifted default display from L5 to **L15** — smoother, less volatile
- L15 is key for competition caps — this is strategic, not just cosmetic

### 6. Match Score vs Market Value (Key for BeScout)
| Platform | Match Score | Market Value Driver |
|----------|-------------|-------------------|
| Sorare | PS 0-100 | L15 average + rarity + demand |
| FPL | Points per GW | Transfer activity (supply/demand) |
| SofaScore | 3-10 rating | N/A (not a trading platform) |
| BeScout (current) | L5 rating (0-100 derived from API-Football) | Floor price from order book |

### 7. Data Providers
- **Opta** dominates: Sorare, SofaScore, WhoScored, FPL all use Opta
- **FotMob:** Proprietary/undisclosed (300+ indicators)
- **BeScout:** API-Football (different data source entirely)
- This means BeScout's scores will NEVER match these platforms exactly

---

## Recommendations for BeScout

1. **Keep 0-100 scale** for match scores — aligns with Sorare (the closest competitor in the trading space), provides good differentiation range

2. **Add color-coded score badges** inspired by SofaScore's 6-tier system, adapted to 0-100:
   | Range | Color | Label |
   |-------|-------|-------|
   | 0-39 | Red | Poor |
   | 40-49 | Orange | Below Average |
   | 50-59 | Yellow/Gold | Average |
   | 60-74 | Green | Good |
   | 75-89 | Teal/Cyan | Very Good |
   | 90-100 | Blue | Exceptional |

3. **Display L15 as default** (like Sorare's shift), with L5 available for "form" view

4. **Clearly separate** Match Score (per-game) vs Card Value (market-driven floor price) in UI

5. **Consider displaying 1 decimal** for the 0-10 derived rating on player cards if a "quick glance" rating is needed alongside the detailed 0-100 score

---

## Sources

- [Sorare Help: Player Score Calculation](https://help.sorare.com/hc/en-us/articles/4402897588241-How-is-the-Player-Score-calculated-PS)
- [Sorare Scoring Matrix (SorareScout)](https://sorarescout.com/guides/the-sorare-matrix/)
- [Sorare L15 Display Change (Twitter)](https://x.com/soraresupport/status/1603404717455036419)
- [FotMob Player Ratings (Scribd)](https://www.scribd.com/document/920258497/Stats-Definitions-FotMob)
- [SofaScore Rating Explained](https://corporate.sofascore.com/about/rating)
- [SofaScore Ratings FAQ](https://sofascore.helpscoutdocs.com/article/50-sofascore-statistical-ratings-explained?lng=en)
- [SofaScore Rating Color Scheme (Twitter)](https://x.com/SofascoreINT/status/1797328206820700504)
- [WhoScored Ratings Explained](https://www.whoscored.com/explanations)
- [WhoScored Ratings Q&A (Medium)](https://medium.com/@dannypage/q-a-about-whoscored-ratings-160eebbbbccf)
- [FPL Scoring Points (PremierLeague.com)](https://www.premierleague.com/en/news/2174909)
- [FPL Points System (LiveFPL)](https://www.livefpl.com/blog/fpl-points-system)
- [FPL 2025/26 Changes](https://www.premierleague.com/en/news/4362211/all-you-need-to-know-about-changes-to-fantasy-for-202526)
- [FPL ICT Index Explained](https://www.premierleague.com/en/news/65567)
- [FPL Price Changes](https://www.premierleague.com/en/news/2858775)
- [OneFootball Player Ratings Help](https://onefootballsupport.zendesk.com/hc/en-us/articles/32452505281041-How-Do-Player-Ratings-Work-on-OneFootball)
- [Academic Comparison: Player Rating Systems (2025)](https://www.tandfonline.com/doi/full/10.1080/02640414.2025.2471208)
- [What is Sorare (SorareCEO)](https://sorareceo.com/what-is-sorare/)
