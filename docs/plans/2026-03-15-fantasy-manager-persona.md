# Fantasy Manager Persona -- Player Detail Page Analysis

> UX research from the perspective of a Fantasy Manager evaluating players for lineup decisions.
> Date: 2026-03-15 | Analyst: Jarvis (CTO Mode)

---

## 1. Manager Workflow: The Decision Process

A Fantasy Manager evaluating a player follows a consistent mental model. The decision tree is:

### The 3-Second Scan (Hero + ScoreMasteryStrip)
1. **Is this player fit?** Status badge (injured/suspended/doubtful) is a binary gate.
2. **Is this player in form?** L5 score + trend indicator (Hot/Cold/Stable). Priority over everything.
3. **Do I own this player’s DPC?** If not owned, cannot use in lineup.

### The 30-Second Evaluation (Statistik Tab)
4. **Recent gameweek scores.** Individual GW bars reveal volatility -- a player with 90,40,110,50,95 (L5=77) is riskier than 75,78,80,76,77 (L5=77).
5. **Position-specific value.** GK with L5=65 + 3 clean sheets is more valuable than ATT with L5=65 + 0 goals.
6. **Season sparkline direction.** Is the trend accelerating or decelerating?

### The 2-Minute Deep Dive (Cross-Reference)
7. **Upcoming fixtures.** Currently missing from Player Detail page.
8. **Captain worthiness.** Requires switching between player pages or /compare.
9. **Synergy consideration.** 2+ players from same club = synergy bonus (5%/extra, cap 15%). Invisible on Player Detail.

### Current State Assessment
The page serves the **trader** persona well but underserves the **fantasy manager**. No connection between player stats and lineup decisions.

---

## 2. Performance at a Glance: L5, L15, Trend

### What Exists
ScoreMasteryStrip: L5 (64px glow), L15 (48px), Trend (Hot/Cold/Stable), Mastery (if DPC held).
StatistikTab: duplicates L5/L15 + season average + sparkline + GW score bars.

### What is Missing

**A. Score Consistency** -- stdev < 10 = "Consistent", 10-20 = "Streaky", > 20 = "Volatile". Client-side calc, no DB change.

**B. Trend Direction** -- Not just UP/DOWN/FLAT. Managers need momentum and form streak count.

**C. Position-Adjusted Context** -- "L5 72 -- Top 15% of MIDs" gives lineup confidence. Client-side from allPlayers.

**D. Points Projection** -- Projected score range (e.g., 60-90) based on form + fixture difficulty.

---

## 3. Comparison Need

Full-page /compare navigation breaks flow. Need inline comparison without leaving the page.

**A. Quick Compare Drawer** -- slide-out with side-by-side L5/L15/trend/GW scores/stats/price.
**B. Similar Players** -- auto-suggest owned players at same position with similar L5.
**C. Position Ranking** -- "Ranked #8 of 45 Midfielders (L5)" from allPlayers query.

---

## 4. Form and Fixtures: The Missing Dimension

**Zero fixture info** on Player Detail. No upcoming opponents, no H2H history, no home/away split.
Fixture difficulty is #1 external factor in fantasy scoring.

### Recommended: Upcoming Fixtures Card
Next 3 fixtures with difficulty rating + home/away + historical avg score vs opponent.
Data: fixtures table (API-Football) + player_gameweek_scores join.

### Home/Away Split
"Home avg: 82 | Away avg: 68" -- simple, powerful.

---

## 5. Captain Decision: The 1.5x Multiplier

Captain gets 1.5x (3x with Triple Captain chip). No guidance on WHO to captain.

**A. Captain Rating (A/B/C/D)** -- composite: L5 (40%) + ceiling (30%) + consistency (20%) + fixture (10%).
**B. If Captained Projection** -- Normal: 60-90 pts | Captained: 90-135 pts.
**C. Historical Captain Performance** -- from lineups.captain_slot + slot_scores.

---

## 6. Score Breakdown

### Current Scoring
| Action | GK | DEF | MID | ATT |
|--------|-----|-----|-----|-----|
| 60+ min | +2 | +2 | +2 | +2 |
| Goal | +6 | +6 | +5 | +4 |
| Assist | +3 | +3 | +3 | +3 |
| Clean Sheet | +4 | +4 | +1 | -- |
| Yellow | -1 | -1 | -1 | -1 |
| Captain | 1.5x | 1.5x | 1.5x | 1.5x |

GameweekScoreBar shows single aggregate. No per-action breakdown visible.
Recommendation: Expandable breakdown per GW bar. Priority: Medium-Low.
Position-specific stat emphasis by position (GK: saves/CS, DEF: CS/tackles, MID: assists, ATT: goals/shots).

---

## 7. Visual Patterns from Fantasy Apps

### FPL: Player Detail as modal, Form as number, Fixture difficulty circles, Ownership %, ICT Index.
### Sorare: Card rarity bonuses, Per-match breakdown, Decisive Score system, Gallery card view.
### Kickbase: Salary cap, Punktetrend, Community starting XI votes.

### Common Patterns
1. Fixture difficulty always visible
2. Form is single scannable number
3. View-to-add-to-lineup is 1-2 taps
4. Score history as bar chart
5. Ownership stats create social dynamics

---

## 8. Mobile Experience

### Current: One direction only
Fantasy > Event > Lineup > Slot > Picker > Select. No player details from picker. No reverse flow.

### Ideal: Bidirectional
**A.** Picker > long-press > condensed bottom sheet > Select
**B.** Player Detail > floating "Add to Lineup" button > select event/slot

---

## 9. Gameweek Context: Personal History

### Fantasy Insight Card (visible when user owns DPC + has used player)
- Times used, avg score, captain track record
- "GW25: Scored 88 in your lineup (Rank #12)"
- "Add to Current Lineup" CTA
- Data: lineups table (slot mapping + slot_scores + captain_slot)

---

## 10. Prioritized Recommendations

### Tier 1: High Impact, Low Effort (~10 hours total)
| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| Score consistency badge (Consistent/Streaky/Volatile) | 2h | High | Client-side from gwScores |
| Position-relative ranking (Top 15% of MIDs) | 3h | High | Client-side from allPlayers |
| Add to Lineup CTA on Player Detail | 4h | High | Check active events |
| Holder count as Selected by X managers | 1h | Medium | Reframe existing data |

### Tier 2: High Impact, Medium Effort
| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| Upcoming fixtures with difficulty | 1-2d | Very High | Fixture query + calc |
| Fantasy Insight card | 1d | High | Join lineups + scores |
| Captain rating (A/B/C/D) | 4h | High | Composite metric |
| Quick Compare bottom sheet | 1d | High | Reuse RadarChart |
| Home/Away score split | 4h | Medium | Join gwScores + fixtures |

### Tier 3: High Impact, High Effort
| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| Per-GW score breakdown | 2-3d | Medium | JSONB column needed |
| Points projection | 2d | High | Difficulty model |
| Similar Players suggestion | 1d | Medium | Filter by pos + score |
| Mobile picker detail sheet | 1-2d | Medium | New bottom sheet |

### Tier 4: Nice to Have
| Feature | Effort | Impact | Notes |
|---------|--------|--------|-------|
| Regret/vindication narrative | 1d | Low-Med | Engaging, not essential |
| Decisive vs. base score | 1d | Low | Advanced managers |
| Community starting XI | 2-3d | Medium | New feature |
| H2H opponent history | 1d | Medium | Fixture joins |

---

## 11. Structural Recommendation: Fantasy Micro-Section

Add a **Fantasy section** above tabs (between ScoreMasteryStrip and TabBar) when user owns DPC:
1. **Quick Stats Row**: L5 | Consistency | Position Rank | Captain Rating
2. **Next Fixture**: opponent + difficulty badge
3. **CTA**: Add to Lineup or Already in GW29 lineup

For non-owners: Own this player DPC to use in Fantasy + [Buy DPC] button.
Creates conversion funnel from fantasy interest to DPC purchase.

---

## 12. Key Takeaway

The Player Detail page answers Who is this player? and Should I trade this DPC?
It does not answer **Should I play this player in my lineup this week?** -- the fantasy manager primary question.

The gap is about **framing and context**, not missing data. The same L5 score, presented with fixture difficulty, consistency, position ranking, and personal history, transforms from a number into a decision.

Fastest path to value: Tier 1 (4 features, ~10 hours) -- no new data, no new DB queries, no new API calls. Only smarter presentation of existing information.