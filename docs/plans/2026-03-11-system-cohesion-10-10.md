# BeScout System Cohesion Overhaul: From 5/10 to 10/10

> **Author:** Lead Architect | **Date:** 2026-03-11
> **Scope:** Full platform gamification and engagement systems interconnection
> **Goal:** Every system feeds at least 2 others. No orphaned features. The ticket economy is the universal glue.

---

## Part 1: PERSONA AND USER STORIES

### Persona 1: Mehmet (The Passionate Fan)

**Demographics:** 22, Sakarya, Turkey. Lives 15 minutes from Yeni Ataturk Stadium.
**Behavior:** Goes to every home game. Active on Twitter/X football discussions. Tech-savvy (uses TikTok, Instagram daily), but has never traded stocks or crypto. Earns modest income from part-time work.
**Motivation:** Feels like he knows Sakaryaspor better than the coaching staff. Wants to prove it. Wants to feel like he *matters* to his club.
**Device:** Android phone (Samsung Galaxy A-series), always mobile.

**User Stories:**

1. "As Mehmet, I want to buy DPCs of my favorite player so that I feel like I have a real stake in his career."
2. "As Mehmet, I want to set up my fantasy lineup before the match so that I can prove my squad knowledge to other fans."
3. "As Mehmet, I want to complete daily challenges and missions so that I earn tickets and bCredits without spending real money."
4. "As Mehmet, I want to see my streak and rank grow over time so that I feel rewarded for being a loyal fan."
5. "As Mehmet, I want to vote on club decisions (e.g., jersey designs, fan events) so that my voice actually reaches the club."
6. "As Mehmet, I want to open mystery boxes with my tickets so that I get a surprise reward after a long week."
7. "As Mehmet, I want to see my rank badge on my profile so that other fans know I am a dedicated Sakaryaspor supporter."
8. "As Mehmet, I want to earn a special cosmetic frame for being in the top 100 fans of my club so that I stand out in the community."

### Persona 2: Lisa (The Strategic Investor)

**Demographics:** 34, Berlin, Germany. Works in data analytics. Turkish-German family roots (father from Trabzon).
**Behavior:** Plays FPL every season (top 50k finish). Follows Turkish football closely for undervalued talent. Reads scouting reports. Comfortable with trading and market dynamics.
**Motivation:** Wants to monetize her football knowledge. Sees BeScout as an opportunity to profit from spotting talent early.
**Device:** iPhone 15 Pro + MacBook for detailed research.

**User Stories:**

1. "As Lisa, I want to analyze player statistics and price history so that I can identify undervalued DPCs to buy low."
2. "As Lisa, I want to read and purchase research reports from top analysts so that I gain information advantages."
3. "As Lisa, I want to write my own research reports and sell them so that I earn bCredits from my analysis skills."
4. "As Lisa, I want to play fantasy events competitively and use chips strategically so that I maximize my bCredits earnings from prizes."
5. "As Lisa, I want my research track record (hit rate) to be visible on my profile so that other users trust and follow me."
6. "As Lisa, I want to receive notifications when players I own have price-moving events (goals, assists, IPO announcements) so that I can trade at the right moment."
7. "As Lisa, I want my Analyst rank to unlock premium features (better research tools, priority bounty access) so that expertise is rewarded."
8. "As Lisa, I want to use my DPC ownership as a fantasy advantage (ownership bonus) so that investing and fantasy are synergistic."

### Persona 3: Serkan (The Club Marketing Manager)

**Demographics:** 40, Sakarya. Marketing Director at Sakaryaspor for 5 years. Non-technical.
**Behavior:** Manages social media accounts, organizes fan events, deals with sponsors. Tracks fan engagement through spreadsheets and gut feeling.
**Motivation:** Needs to show ROI to the board. Wants to grow the fanbase and create new revenue streams. Wants to understand his most engaged fans.
**Device:** Laptop (Chrome), occasionally checks mobile.

**User Stories:**

1. "As Serkan, I want to see a dashboard showing active users, DPC sales volume, and fan engagement metrics so that I can report to the board."
2. "As Serkan, I want to create fantasy events tied to our match schedule so that fans are more engaged on match days."
3. "As Serkan, I want to create polls and votes that cost bCredits so that fan participation generates revenue."
4. "As Serkan, I want to post bounties for scouting reports on transfer targets so that I get crowd-sourced intelligence."
5. "As Serkan, I want to identify our top 100 fans by engagement score so that I can invite them to exclusive meet-and-greet events."
6. "As Serkan, I want to create club-specific rewards (signed jerseys, stadium tours) that fans can redeem with tickets so that digital engagement translates to real-world perks."
7. "As Serkan, I want to set IPO timing for new player signings so that the hype around transfers drives DPC sales."
8. "As Serkan, I want to see which fans have the highest Fan Rank for my club so that I can publicly recognize them."

### Persona 4: Ayse (The Content Creator / Scout)

**Demographics:** 28, Istanbul. Football analyst, writes for a blog, aspires to work professionally in football.
**Behavior:** Watches 5+ matches per week. Takes detailed notes. Has a Twitter following of 3,000 for her match analysis. Creates tactical breakdowns with screenshots.
**Motivation:** Wants to build a verifiable track record that could lead to a real scouting job. Wants to monetize her analysis beyond ad revenue.
**Device:** iPad Pro for match watching + annotation, iPhone for posting.

**User Stories:**

1. "As Ayse, I want to publish detailed research reports with player evaluations so that I build my analyst reputation."
2. "As Ayse, I want my research predictions to be automatically tracked against outcomes so that my hit rate proves my credibility."
3. "As Ayse, I want clubs to post bounties that I can fulfill so that I earn bCredits and get noticed by professional clubs."
4. "As Ayse, I want to build a follower base so that my research reports generate passive income from unlocks."
5. "As Ayse, I want my Analyst rank and achievements to be prominently displayed so that visitors to my profile see my credentials."
6. "As Ayse, I want to earn cosmetic titles ('Treffsicherer Analyst', 'Club Scout') so that my expertise is socially visible."
7. "As Ayse, I want my content engagement (likes, unlocks, ratings) to contribute to my ticket income so that creating content is economically viable."
8. "As Ayse, I want to compare my track record against other analysts in a leaderboard so that I know where I stand and what to improve."

---

## Part 2: SYSTEM COHESION MAP

### Current System Inventory

| System | Location | Status | Connections |
|--------|----------|--------|-------------|
| **Elo/Rank System** | `gamification.ts` | Active | Feeds ScoutCard, ScoreRoad |
| **Score Road** | `gamification.ts` + `ScoreRoadCard.tsx` | Active | Only rendered on Profile overview tab |
| **Achievements** | `achievements.ts` + `social.ts` | Active | Checked on stats refresh, notifications only |
| **Missions** | `services/missions.ts` + `MissionBanner.tsx` | Active | Only rendered on Homepage (collapsed banner) |
| **Daily Challenge** | `services/dailyChallenge.ts` + `DailyChallengeCard.tsx` | Active | Only on Homepage |
| **Streak** | `services/streaks.ts` | Active | Displayed on Homepage header + DailyChallengeCard footer |
| **Tickets** | `services/tickets.ts` | Active | Sources: streaks, missions, challenges, achievements. Sinks: mystery box, chips only |
| **Mystery Box** | `MysteryBoxModal.tsx` | Active | Opened from DailyChallengeCard footer only |
| **Cosmetics** | `CosmeticInventory.tsx` | Active | Only visible in Profile Cosmetics sub-tab |
| **Chips** | `chips.ts` + `ChipSelector.tsx` | Active | Only in Fantasy EventDetailModal |
| **Fan Rank** | `FanRankOverview.tsx` | Active | Only on Club page |
| **Airdrop Score** | `services/airdropScore.ts` + `AirdropScoreCard.tsx` | Active | Only on Profile overview + /airdrop page |
| **Referral** | `services/referral.ts` + `ReferralCard.tsx` | Active | Only on Profile overview |
| **Club Subscriptions** | `services/clubSubscriptions.ts` | Active | Purchased on Club page, badge on profile |
| **Founding Passes** | `foundingPasses.ts` | Defined | Badge on profile, airdrop multiplier |
| **Research/Bounties** | `services/research.ts` | Active | Community page, profile analyst tab |
| **Trading** | `services/trading.ts` | Active | Market page, player detail |
| **Fantasy** | `services/lineups.ts` | Active | Fantasy page |

### Critical Gaps (Why We Are 5/10)

1. **ScoreRoad** is buried in Profile. Users never see it during their primary activities.
2. **Missions** are a collapsed banner on the Homepage. No contextual missions appear where the action happens.
3. **Cosmetics** exist but are invisible -- no one sees your equipped frame/title anywhere except a sub-tab.
4. **Tickets** have only 2 sinks (mystery boxes at 15 each, chips at 5-15 each). No scarcity pressure.
5. **Achievements** trigger a notification but have no lasting impact. No perks, no gates, no social visibility.
6. **DPC ownership has zero fantasy advantage.** The two biggest systems are disconnected.
7. **Research quality does not affect market prices.** Good analysis has no market signal.
8. **Fan Rank** has no consequences beyond a badge. Top fans get nothing.
9. **Streak** gives tickets but the compound benefit plateaus at day 7.
10. **Social actions (posts, likes, follows) do not generate tickets.** Half the platform has no ticket connection.

### Target Cohesion Map

```
                    ┌─────────────────────────────┐
                    │     DAILY SESSION LOOP       │
                    │  Login → Streak → Challenge  │
                    │  → Missions → Activity       │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
        ┌──────────┐   ┌──────────┐   ┌──────────────┐
        │ TRADING  │   │ FANTASY  │   │  COMMUNITY   │
        │ Buy/Sell │◄──► Lineups  │◄──► Posts/Research│
        │  DPCs    │   │  Events  │   │  Votes/Bounty│
        └────┬─────┘   └────┬─────┘   └──────┬───────┘
             │              │                  │
             ▼              ▼                  ▼
        ┌──────────────────────────────────────────┐
        │          REPUTATION ENGINE               │
        │  Elo Scores → Ranks → Achievements       │
        │  Fan Rank → CSF Multiplier               │
        │  Track Record → Social Proof             │
        └────────────────────┬─────────────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ TICKETS  │  │COSMETICS │  │ bCREDITS │
        │ Earn+Burn│  │ Aspire   │  │ Real Econ│
        └──────────┘  └──────────┘  └──────────┘
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    ┌──────────────────┐
                    │    RETENTION     │
                    │  Streak → Rank   │
                    │  Rank → Perks    │
                    │  Perks → Return  │
                    └──────────────────┘
```

---

## Part 3: THE 10/10 PLAN

### A) Orphaned Systems Activation

#### A1. ScoreRoad: From Hidden to Central Progress Bar

**Problem:** ScoreRoadCard is rendered only in `ProfileView.tsx` under the overview tab. Users never see it during their primary activities.

**Solution:** Add a compact ScoreRoad progress indicator to:
1. **Homepage** -- below the DailyChallenge card, as a "Next Milestone" strip
2. **Profile header** (ScoutCard) -- inline progress bar showing next milestone
3. **Post-action toasts** -- when any action generates Elo points, show "X pts toward [next rank]"

**Implementation:**

New component: `ScoreRoadStrip.tsx` (compact, single-line milestone indicator)
```typescript
interface ScoreRoadStripProps {
  medianScore: number;
  nextMilestone: ScoreRoadMilestone | null;
  claimableCount: number;  // gold badge if > 0
}
```

**Files to change:**
- `src/components/gamification/ScoreRoadStrip.tsx` -- NEW compact component
- `src/app/(app)/page.tsx` -- add after DailyChallengeCard section
- `src/components/profile/ScoutCard.tsx` -- add inline progress bar below rang display
- `messages/de.json` + `messages/tr.json` -- add `gamification.scoreRoad.strip*` keys

#### A2. Missions: From Banner to Contextual Prompts

**Problem:** MissionBanner is only on Homepage, collapsed by default. Users forget missions exist once they navigate to Market/Fantasy/Community.

**Solution:** Contextual mission hints appear in the systems where the action happens.

1. **Fantasy page:** If a mission is "Submit 1 lineup", show a mini-banner above the event list: "Mission: Stelle ein Lineup auf (+200 bCredits)"
2. **Market page:** If a mission is "Execute 1 trade", show hint on the Buy button
3. **Community page:** If a mission is "Write 1 post", show hint on the New Post button
4. **Player detail:** If a mission is "Buy DPC of [position]", highlight on the buy section

**Implementation:**

New hook: `useMissionHints(context: 'fantasy' | 'market' | 'community' | 'trading')`

```typescript
// Returns relevant incomplete missions for the given context
function useMissionHints(context: string): {
  hints: { missionId: string; label: string; reward: number; progress: string }[];
}
```

New component: `MissionHint.tsx`
```typescript
interface MissionHintProps {
  label: string;
  reward: number;        // cents
  progress: string;      // "2/3"
  compact?: boolean;     // single-line vs card
}
```

**Files to change:**
- `src/lib/queries/missions.ts` -- new `useMissionHints` hook
- `src/components/missions/MissionHint.tsx` -- NEW context-aware mini component
- `src/components/fantasy/EventList.tsx` -- add MissionHint at top if relevant
- `src/app/(app)/market/page.tsx` (or market component) -- add MissionHint
- `src/app/(app)/community/page.tsx` (or community component) -- add MissionHint
- `messages/de.json` + `messages/tr.json` -- add `missions.hint*` keys

#### A3. Cosmetics: From Invisible to Socially Visible

**Problem:** Equipped cosmetics (frames, titles, effects) are visible only in a sub-tab of the profile. Nobody sees them during normal interaction.

**Solution:** Display equipped cosmetics everywhere the user's identity appears:
1. **Profile avatar frame** -- equipped frame cosmetic wraps the avatar
2. **Post author row** -- equipped title appears below display_name
3. **Fantasy leaderboard** -- equipped flame/effect visible on rank entry
4. **Community post cards** -- equipped badge appears next to handle
5. **Leaderboard entries** -- frame and title visible

**Implementation:**

New component: `CosmeticAvatar.tsx`
```typescript
interface CosmeticAvatarProps {
  avatarUrl: string | null;
  equippedFrame: string | null;  // cosmetic key
  equippedFlame: string | null;  // cosmetic key
  size: number;
}
```

New helper: `useEquippedCosmetics(userId: string)`
```typescript
function useEquippedCosmetics(userId: string): {
  frame: string | null;
  title: string | null;
  flame: string | null;
  badge: string | null;
  effect: string | null;
}
```

**Files to change:**
- `src/components/ui/CosmeticAvatar.tsx` -- NEW component
- `src/lib/queries/cosmetics.ts` -- new `useEquippedCosmetics` hook
- `src/components/profile/ScoutCard.tsx` -- replace plain avatar with CosmeticAvatar
- `src/components/community/PostCard.tsx` -- add title cosmetic display
- `src/components/fantasy/LeaderboardRow.tsx` -- add frame + flame
- All leaderboard/ranking components -- integrate cosmetics

### B) Cross-System Synergies

#### B1. DPC Ownership -> Fantasy Bonus

**Mechanic:** If you own DPCs of a player and field them in your fantasy lineup, you receive a *Besitzer-Bonus* (Ownership Bonus) of +5% on that player's fantasy score. Capped at 3 players per lineup to prevent whales from dominating.

**Why it matters for BeScout's vision:** This is THE link between the two biggest systems. It makes DPC purchasing not just a speculative activity but a *strategic fantasy advantage*. Fans who buy DPCs of Sakaryaspor players have a tangible edge in fantasy, which drives DPC purchases, which drives trading volume, which generates fees.

**Implementation:**

1. **Scoring adjustment** -- During fantasy scoring (after match completion), check `holdings` table for each lineup player. If user holds >= 1 DPC of that player, apply +5% to that slot's score.
2. **UI indicator** -- In the lineup builder, show a small DPC icon next to owned players: "Besitzer-Bonus: +5%"
3. **Cap enforcement** -- Only first 3 owned players in a lineup get the bonus.

```typescript
// In scoring RPC (DB-side) — pseudo-logic:
// For each slot in lineup:
//   SELECT count(*) FROM holdings WHERE user_id = p_user_id AND player_id = slot_player_id AND quantity > 0
//   If count > 0 AND bonus_slots_used < 3: score *= 1.05, bonus_slots_used++
```

**Files to change:**
- Supabase migration: update `score_event` RPC to check holdings
- `src/components/fantasy/EventDetailModal.tsx` or lineup builder -- add ownership indicator
- `src/lib/services/lineups.ts` -- add `getOwnedPlayerIds(userId)` helper for UI
- `messages/de.json` -- add `fantasy.ownershipBonus`, `fantasy.ownershipBonusDesc`
- `messages/tr.json` -- Turkish equivalents

**User experience:** Lisa sets up her lineup. She sees 4 of her players have a gold DPC icon. She strategically uses the 3 best-performing ones to maximize her +5% bonus. Mehmet, who owns all his Sakaryaspor players' DPCs, gets the bonus on his 3 strongest Sakaryaspor players in club-scoped events.

#### B2. Research Quality -> Market Signal

**Mechanic:** When a highly-rated research report (avg_rating >= 4.0, ratings_count >= 5) makes a Bullish/Bearish call on a player, a "Scout Consensus" badge appears on that player's trading page. This is purely informational -- no price manipulation, but it gives social proof that influences organic buying/selling behavior.

**Why it matters:** Good research creates value for the entire platform. By making quality analysis visible at the point of trade, we reward analysts (more unlocks), help traders (better decisions), and increase trading volume (more fees).

**Implementation:**

1. **Aggregation query:** For each player, count research posts with `call` = Bullish/Bearish where `avg_rating >= 4.0` and `ratings_count >= 5` and created in last 30 days.
2. **UI component:** `ScoutConsensus.tsx` -- small badge on player detail trading section
3. **Trigger:** Run aggregation on `getResearchPosts` for the player, or use a materialized view.

```typescript
interface ScoutConsensus {
  playerId: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  topAnalyst: { handle: string; hitRate: number } | null;
}
```

**Files to change:**
- `src/components/player/detail/ScoutConsensus.tsx` -- NEW component
- `src/lib/services/research.ts` -- add `getPlayerConsensus(playerId)` function
- Player detail page -- integrate ScoutConsensus in trading section
- `messages/de.json` -- add `research.consensus*` keys

#### B3. Fan Rank -> Feature Unlocks

**Mechanic:** Fan Rank tiers unlock real platform features, not just cosmetics:

| Fan Rank Tier | Unlock |
|---------------|--------|
| Bronze | Basic access (default) |
| Silver | Custom profile title, 2 mystery boxes/week |
| Gold | Early access to new events (1 hour), research preview |
| Platinum | Priority bounty submissions, exclusive cosmetics |
| Diamond | Direct message to club admins, beta feature access |

**Why it matters:** Rank becomes aspirational with concrete utility. Users actively work to increase their Fan Rank because each tier unlocks something tangible.

**Implementation:**

1. **Feature gate helper:**
```typescript
function canAccess(feature: FeatureGate, fanRankTier: FanRankTier): boolean
type FeatureGate = 'custom_title' | 'extra_mystery_boxes' | 'early_event_access' | 'research_preview' | 'priority_bounty' | 'exclusive_cosmetics' | 'dm_club_admin' | 'beta_features';
```

2. **Enforcement points:** Check Fan Rank at:
   - Mystery box open (silver+ gets 2 free/week instead of 0)
   - Event registration (gold+ gets 1 hour early access)
   - Bounty submission (platinum+ appears first in queue)

**Files to change:**
- `src/lib/fanRankGates.ts` -- NEW feature gate logic
- `src/components/gamification/FanRankOverview.tsx` -- show unlock list per tier
- `src/components/gamification/MysteryBoxModal.tsx` -- check rank for free boxes
- Event registration flow -- check rank for early access
- `messages/de.json` -- add `fanRank.unlock*` keys

#### B4. Tickets <-> Events (Ticket Sinks at Events)

**Mechanic:** Fantasy events have a ticket entry cost in addition to (or instead of) bCredits:

| Event Type | Entry Cost | Why |
|------------|-----------|-----|
| Freeroll | 0 | Accessibility |
| Standard | 5 tickets + 0 bCredits | Ticket sink, low barrier |
| Premium | 10 tickets + entry fee bCredits | Both currencies |
| Championship | 25 tickets + higher entry fee | Scarcity creates prestige |

Additionally, special "Ticket-Only" events appear weekly where the ONLY entry cost is tickets (no bCredits), and the prizes are exclusive cosmetics or bCredits.

**Why it matters:** This is the single biggest ticket sink upgrade. Currently tickets only flow to mystery boxes (15 each) and chips (5-15 each). Adding ticket costs to events creates consistent burn pressure across the most popular feature.

**Implementation:**

1. **DB change:** Add `ticket_cost` column to `events` table (default 0).
2. **Entry flow:** In EventDetailModal, check ticket balance. Deduct tickets before lineup submission.
3. **Club admin:** Add ticket cost field to event creation form.

```typescript
// In submitLineup flow (EventDetailModal):
if (event.ticket_cost > 0) {
  const result = await spendTickets(userId, event.ticket_cost, 'event_entry', eventId);
  if (!result.ok) throw new Error('notEnoughTickets');
}
```

**Files to change:**
- Supabase migration: `ALTER TABLE events ADD COLUMN ticket_cost INTEGER DEFAULT 0;`
- `src/types/index.ts` -- add `ticket_cost` to `DbEvent`
- `src/components/fantasy/EventDetailModal.tsx` -- add ticket cost display + deduction
- `src/components/fantasy/EventCard.tsx` -- show ticket cost badge
- Club admin event creation -- add ticket cost input
- `messages/de.json` -- add `fantasy.ticketCost*` keys

#### B5. Social Actions <-> Tickets

**Mechanic:** Social actions generate and consume tickets:

| Action | Tickets |
|--------|---------|
| Write a post | +3 earned |
| Receive 10 upvotes on a post | +5 earned |
| Write a research report | +10 earned |
| Receive a research rating (4.0+) | +5 per rating |
| Follow 5 new users | +3 earned |
| Create a poll | -5 spent |
| Boost a post (highlight) | -10 spent |
| Promote research to "Featured" | -20 spent |

**Why it matters:** This connects the community layer (posts, research, follows) to the ticket economy. Content creators earn tickets from quality content, which they spend on visibility or fantasy chips. This creates a self-sustaining content economy.

**Implementation:**

1. **Ticket credits on post creation:**
```typescript
// In createPost service (after successful insert):
creditTickets(userId, 3, 'post_create', postId);
```

2. **Ticket credits on upvote threshold:**
```typescript
// DB trigger: AFTER INSERT ON post_votes
// When total upvotes on a post reaches 10, 25, 50: credit author
```

3. **Ticket spend on poll creation:**
```typescript
// In createPoll flow:
await spendTickets(userId, 5, 'poll_create', pollId);
```

**Files to change:**
- `src/lib/services/community.ts` -- add ticket credits to post/research creation
- Supabase migration: trigger for upvote milestone ticket credits
- `src/types/index.ts` -- extend `TicketSource` type with new sources
- `messages/de.json` -- add ticket notification messages

#### B6. Missions <-> Everything

**Mechanic:** Expand mission definitions to cover ALL platform activities, not just "trade 1 player" and "submit 1 lineup." New mission types:

**Daily Missions (pick 3 per day):**
- "Complete the daily challenge" (+50 bCredits)
- "Open 1 mystery box" (+30 bCredits)
- "Visit a club page" (+20 bCredits)
- "Rate 1 research report" (+40 bCredits)
- "Upvote 3 posts" (+30 bCredits)
- "Check your portfolio" (+20 bCredits)
- "Follow 1 new user" (+25 bCredits)
- "Use a chip in fantasy" (+60 bCredits)

**Weekly Missions (pick 2 per week):**
- "Submit lineups for 3 events" (+300 bCredits)
- "Execute 5 trades" (+250 bCredits)
- "Write 1 research report" (+400 bCredits)
- "Earn 50 tickets from any source" (+200 bCredits)
- "Reach top 50% in 1 fantasy event" (+350 bCredits)
- "Refer 1 friend" (+500 bCredits)

**Implementation:**

1. **Expand `mission_definitions` table** with new keys
2. **Add trigger points** in each relevant service
3. **Dynamic assignment RPC** already handles random selection

**Files to change:**
- Supabase migration: INSERT new mission_definitions rows
- `src/lib/services/community.ts` -- add `triggerMissionProgress` calls
- `src/lib/services/research.ts` -- add mission tracking on create/rate
- `src/lib/services/social.ts` -- add mission tracking on follow
- `src/lib/services/mysteryBox.ts` -- add mission tracking on open

#### B7. Cosmetics -> Social Identity

**Mechanic:** Equipped cosmetics appear everywhere:
- **Frame:** Wraps avatar in profile, posts, leaderboards, fantasy results
- **Title:** Appears under display name ("Treffsicherer Analyst", "Founding Scout", "Diamant-Händler")
- **Flame:** Animated effect on leaderboard entry when user is in top 10
- **Badge:** Appears next to username in community posts

**Why it matters:** Cosmetics become the primary aspiration layer. They are non-inflationary (unlike bCredits) and socially visible (unlike achievements). When Mehmet sees a "Legendary" frame on another user in the fantasy leaderboard, he wants one.

**Implementation:** See A3 above for core component. Additional integration points:

**Files to change:**
- All components that render user identity (PostCard, LeaderboardRow, FantasyResult, ChatMessage)
- New DB query: `equipped_cosmetics` view joining `user_cosmetics` with `cosmetic_definitions` where `equipped = true`

#### B8. Streak -> Compound Benefits

**Mechanic:** Current streak gives flat tickets (5/10/15). New compound benefits:

| Streak | Daily Tickets | Bonus |
|--------|--------------|-------|
| 1-3 days | 5 | -- |
| 4-6 days | 10 | +1 mystery box ticket discount |
| 7-13 days | 15 | +5% fantasy score bonus (all events) |
| 14-29 days | 20 | +10% Elo gain rate |
| 30-59 days | 25 | 1 free mystery box per week |
| 60-89 days | 30 | +15% fantasy score + research visibility boost |
| 90+ days | 40 | All above + exclusive "Loyalist" title cosmetic |

**Why it matters:** The current system plateaus. A 90-day streak user and a 7-day streak user get the same rewards. Compound benefits create a powerful "do not break the chain" mechanic.

**Implementation:**

```typescript
export function getStreakBenefits(streakDays: number): StreakBenefits {
  return {
    dailyTickets: streakDays >= 90 ? 40 : streakDays >= 60 ? 30 : streakDays >= 30 ? 25 : streakDays >= 14 ? 20 : streakDays >= 7 ? 15 : streakDays >= 4 ? 10 : 5,
    fantasyBonus: streakDays >= 60 ? 0.15 : streakDays >= 7 ? 0.05 : 0,
    eloBoostPct: streakDays >= 14 ? 10 : 0,
    freeMysteryBoxes: streakDays >= 30 ? 1 : 0,
    mysteryBoxDiscount: streakDays >= 4 ? 1 : 0,
  };
}
```

**Files to change:**
- `src/lib/services/streaks.ts` -- update `recordLoginStreak` ticket amounts
- `src/lib/streakBenefits.ts` -- NEW benefits calculator
- `src/components/home/HomeStoryHeader.tsx` -- show current streak benefits
- Fantasy scoring RPC -- apply streak fantasy bonus
- `messages/de.json` -- add `streak.benefit*` keys

#### B9. Achievement -> Real Perks

**Mechanic:** Achievements currently only trigger a notification and +25/50 tickets. Upgrade:

| Achievement | Perk |
|-------------|------|
| first_trade | Unlock "Trader" profile title |
| 10_trades | +100 bCredits one-time bonus |
| 100_trades | Exclusive "Trading Legend" frame cosmetic |
| first_event | Unlock chip system (currently always available) |
| event_winner | "Champion" title + gold frame |
| first_research | Unlock research pricing (can sell reports) |
| complete_scout | +500 bCredits + "Complete Scout" legendary badge |
| founding_scout | Permanent 1.5x airdrop multiplier |

**Why it matters:** Achievements become progression gates, not just trophy notifications. The first_research achievement unlocking report pricing means users must engage with the community before monetizing.

**Implementation:**

```typescript
export const ACHIEVEMENT_PERKS: Record<string, AchievementPerk> = {
  first_trade: { type: 'cosmetic_unlock', cosmeticKey: 'title_trader' },
  '10_trades': { type: 'bsd_bonus', amountCents: 10000 },
  '100_trades': { type: 'cosmetic_unlock', cosmeticKey: 'frame_trading_legend' },
  first_event: { type: 'feature_unlock', feature: 'chips' },
  event_winner: { type: 'cosmetic_unlock', cosmeticKey: 'title_champion' },
  first_research: { type: 'feature_unlock', feature: 'research_pricing' },
  complete_scout: { type: 'bsd_bonus', amountCents: 50000 },
  founding_scout: { type: 'multiplier', target: 'airdrop', value: 1.5 },
};
```

**Files to change:**
- `src/lib/achievementPerks.ts` -- NEW perk definitions
- `src/lib/services/social.ts` `checkAndUnlockAchievements` -- apply perks on unlock
- `src/components/gamification/AchievementUnlockModal.tsx` -- show perk in modal
- Feature gate checks where relevant (chip system, research pricing)
- `messages/de.json` -- add `achievement.perk*` keys

#### B10. Club Activity -> Fan Rewards

**Mechanic:** When a club creates an event, poll, or vote, participating fans earn club-specific reward points that feed into their Fan Rank. Additionally, clubs can create "Fan Challenges" -- special club-issued missions:

- "Attend Fantasy Event for GW15" -- club awards +50 Fan Rank points to all participants
- "Vote in the Transfer Poll" -- +20 Fan Rank points
- "Top 10 in Club Fantasy" -- +100 Fan Rank points + exclusive club cosmetic

**Why it matters:** This closes the B2B loop. Clubs create engagement activities, fans participate, fans earn Fan Rank, Fan Rank unlocks CSF multiplier and perks. The club has a direct lever to drive engagement that benefits both sides.

**Implementation:**

1. **Club admin UI:** "Create Fan Challenge" form in admin dashboard
2. **DB:** New `club_challenges` table linking to events/polls
3. **Fan Rank update:** Participation in club-issued challenges adds points to relevant Fan Rank dimensions

**Files to change:**
- Supabase migration: `club_challenges` table
- Club admin dashboard: new "Fan Challenges" tab
- `src/lib/services/fanRank.ts` -- add challenge reward logic
- Fan Rank scoring RPC -- incorporate challenge points
- `messages/de.json` -- add `clubAdmin.challenges*` keys

---

### C) The Daily Engagement Blueprint

#### Mehmet's Perfect Daily Session (The Passionate Fan)

**Opening (30 seconds):**
1. Opens app. HomeStoryHeader greets: "Merhaba Mehmet! 15-Tage-Serie!" with flame icon.
2. Sees ScoreRoadStrip: "Noch 120 Punkte bis Silber I — 500 bCredits Belohnung"
3. Streak benefit shown: "+20 Tickets heute (14-Tage Bonus)"

**First Engagement (2 minutes):**
4. DailyChallengeCard is prominent: "Welcher Sakaryaspor-Spieler hat die meisten Assists diese Saison?"
5. Mehmet answers, earns 10 tickets. Result banner: "Richtig! +10 Tickets"
6. Mystery Box button glows (he has 45 tickets). He opens one, gets an Uncommon badge.

**Core Activity (5-10 minutes):**
7. MissionHint on Fantasy section: "Mission: Stelle 1 Lineup auf (+200 bCredits)"
8. He sets up his lineup for GW16. Sees DPC ownership indicators: 3 of his players have the gold DPC icon (+5% bonus each).
9. Decides to activate a Synergy Surge chip (10 tickets).
10. HomeSpotlight shows a Live IPO for a new signing -- he buys 5 DPCs.

**Social Loop (2 minutes):**
11. Checks community. Sees a friend's post about Sakaryaspor's new formation. Upvotes it.
12. His 3 upvotes contribute to daily mission progress (3/3 upvotes -- mission complete!).

**Closing (30 seconds):**
13. Claims completed mission reward: +30 bCredits.
14. Sees updated rank in ScoutCard: "Bronze III -- noch 50 Punkte bis Silber I"

**What makes him come back tomorrow:**
- Streak is at 15 days. Breaking it loses the 14-day compound benefits.
- His fantasy event resolves tomorrow -- he needs to check results.
- The mystery box he opened was Uncommon. He wants to try for Rare.
- His DPC holdings show a +3.2% increase. He wants to see if the trend continues.

#### Lisa's Perfect Daily Session (The Strategic Investor)

**Opening (15 seconds):**
1. Checks portfolio strip on Homepage. Top mover: Yilmaz +8.2%.
2. ScoreRoadStrip: "Gold II -- noch 600 Punkte bis Gold III. 'Stratege' Titel wartet."

**Research Phase (10 minutes):**
3. Goes to Community, reads 2 research reports. Rates them (earns +5 tickets each for 4.0+ rating).
4. MissionHint: "Mission: Bewerte 1 Research (+40 bCredits)" -- completes it.
5. Sees ScoutConsensus on a player she owns: "5 Analysten bullish, 1 bearish." Confirms her thesis.

**Trading Phase (5 minutes):**
6. Places a sell order on an overvalued player. Notification pops for the buyer.
7. Buys 10 DPCs of an undervalued player (the one with bullish consensus).
8. Mission progress: "Trades: 2/5 diese Woche"

**Fantasy Phase (3 minutes):**
9. Adjusts lineup for GW16. Uses her DPC ownership bonus strategically (3 owned players).
10. Activates Triple Captain chip on her best player (15 tickets).

**Content Creation (10 minutes):**
11. Writes a detailed research report on the player she bought. Sets price: 50 bCredits.
12. Earns +10 tickets for publishing. Mission: "Schreibe 1 Research (+400 bCredits)" completes.

**What makes her come back tomorrow:**
- Her research report might get ratings/unlocks = passive income.
- Her sell order might fill = bCredits.
- Fantasy event scoring happens overnight.
- She is close to Gold III rank which unlocks the "Stratege" title.

#### Serkan's Perfect Weekly Session (The Club Marketing Manager)

**Monday (15 minutes):**
1. Opens club admin dashboard. Sees: 850 active fans this week (+12% from last week).
2. Creates a Fan Challenge: "Top 10 in GW16 Fantasy earn exclusive Sakaryaspor frame."
3. Creates a poll: "Welchen Trikotsponsor bevorzugt ihr?" Entry: 5 bCredits/vote.

**Wednesday (5 minutes):**
4. Checks poll results: 340 votes, 1,700 bCredits generated.
5. Sees Fan Rank leaderboard for his club. Identifies top 5 fans by name.

**Friday (10 minutes):**
6. Posts a bounty: "Analyse unsere letzten 3 Gegner" -- 2,000 bCredits reward.
7. Creates next week's fantasy event with 10-ticket entry cost.
8. Reviews fan engagement metrics for board presentation.

#### Ayse's Perfect Daily Session (The Content Creator)

**Opening (1 minute):**
1. Checks notification center: "Dein Research zu Yilmaz wurde 3x freigeschaltet (+150 bCredits)."
2. ScoreRoadStrip: "Diamant -- noch 1000 Punkte bis Mythisch. Avatar + 7.500 bCredits!"

**Content Phase (20 minutes):**
3. Watches match highlights, writes detailed tactical analysis.
4. Publishes research report with Bullish call on a striker. Price: 100 bCredits.
5. Earns +10 tickets for publishing.
6. MissionHint completes: "Schreibe 1 Research (+400 bCredits)"

**Social Phase (5 minutes):**
7. Checks her track record page: 73% hit rate, top 5% of analysts.
8. Her ScoutConsensus badge appears on 3 player pages she analyzed.
9. Sees a club bounty in her notifications. Reviews the requirements.

**Bounty Fulfillment (15 minutes):**
10. Starts writing the bounty analysis. Her Platinum Fan Rank gives her priority placement.
11. Submits. If approved: 2,000 bCredits + "Club Scout" achievement.

**What makes her come back tomorrow:**
- Research report earnings trickle in throughout the day.
- Bounty approval notification expected.
- Her 73% hit rate is tracked -- she needs to maintain it.
- Close to "Scout-Spezialist" achievement (need 2 more 4.0+ reports).

---

### D) The Retention Architecture

#### Day 0-1: First Session Magic

**Onboarding Flow (5 minutes):**
1. Sign up -> immediate welcome bonus: 1,000 bCredits.
2. Guided tour: "Buy your first DPC" -> directed to a recommended player from their club.
3. After first purchase: Achievement "Erster Deal" unlocks -> confetti + "Trader" title unlocked.
4. Prompted to set up first fantasy lineup (no entry cost for freeroll event).
5. Daily Challenge available immediately.
6. Shown Streak counter: "Tag 1 -- 30 Tage Serie = 1 gratis Mystery Box pro Woche!"

**Key hooks planted:**
- First DPC creates portfolio investment (loss aversion kicks in)
- First fantasy lineup creates stake in upcoming match result
- Streak counter creates tomorrow-obligation
- Achievement unlock creates "collect them all" instinct

#### Day 2-7: Building the Habit

**Day 2:** Streak +1. Fantasy results from yesterday shown prominently. "Du bist 45. von 120 -- noch 5 Plätze bis Top 33%!" Mission: complete daily challenge.

**Day 3:** New daily missions rotate. DPC price may have moved -- notification if > 5%. MissionHint on Community: "Schreibe deinen ersten Post (+100 bCredits)."

**Day 4:** Streak reaches 4 -- Mystery Box discount unlocked: "Deine Serie gibt dir 1 Ticket Rabatt auf Mystery Boxes!" First post earns +3 tickets.

**Day 5-6:** Weekly mission progress visible. Fantasy event registration for next gameweek opens. Social feed shows friends' activities.

**Day 7:** MILESTONE. "7-Tage Serie! +5% Fantasy-Bonus freigeschaltet!" Big visual celebration. Weekly missions can be claimed. Score Road progress visible.

**Mechanisms active by Day 7:**
- Streak (compound benefits started)
- Portfolio (DPC prices fluctuating, checking becomes habit)
- Fantasy (results create emotional investment)
- Missions (daily + weekly reward cadence)
- Social connections (following people, seeing their activity)

#### Day 8-30: Deepening Investment

**Week 2:** Introduce research system. "Du hast jetzt genug Erfahrung -- schreibe deine erste Analyse!" Achievement gate: unlock research pricing after first_research achievement.

**Week 3:** Club subscription suggestion. "Silber-Abo: Early Access auf IPOs + Streak Shields." Fan Rank becomes visible. "Du bist #47 von 850 Sakaryaspor-Fans."

**Week 4:** First Score Road milestone reachable (Bronze II = 350 points). "200 bCredits Belohnung!" Airdrop Score becomes relevant. "Dein Engagement-Score: 340. Top 25%."

**Mechanisms deepening:**
- Score Road (tangible milestones with real rewards)
- Fan Rank (club-specific status)
- Research economy (content creation as income)
- Chip strategy (saving tickets for crucial fantasy weeks)
- Airdrop anticipation (long-term engagement multiplier)

#### Day 31-90: Creating Evangelists

**Month 2:** 30-day streak unlocked: free mystery box weekly. Fan Rank likely Silver+. Achievement collection growing (likely 8-12 unlocked). First referral prompted: "Lade Freunde ein -- du bekommst 500 bCredits, sie 250."

**Month 3:** Users at this stage become content creators or competitive fantasy players. Their profile shows: multiple achievements, tracked record, equipped cosmetics, follower count. They start creating value for the platform (research, posts, community interaction).

**Evangelist triggers:**
- Referral rewards (economic incentive to invite)
- Social proof (visible rank, achievements, cosmetics attract followers)
- Identity investment (profile = football CV, cant abandon it)
- Community recognition (leaderboard placement, top analyst badges)
- Sunk cost (streak, DPC portfolio, earned cosmetics, rank progress)

#### Day 90+: Sustaining Engagement

**Quarter 2+:** Focus shifts from acquisition mechanics to depth mechanics:
- New seasons bring new Score Road milestones
- New player signings = new IPOs = new trading opportunities
- Seasonal chip limits reset
- New cosmetic sets released (seasonal themes)
- Club-specific challenges for matchdays
- Leaderboard resets keep competition fresh
- Research track record compounds over time

**Anti-churn mechanisms:**
- 90-day streak benefits are substantial (40 tickets/day, 15% fantasy bonus)
- Breaking streak loses all compound benefits immediately
- Streak shields (from club subscriptions) provide safety net
- Portfolio value creates economic lock-in
- Social graph (followers, following) creates relational lock-in
- Research track record creates professional lock-in (for Ayse personas)

---

### E) Economy Rebalancing

#### New Ticket Sinks

| Sink | Cost | Frequency | Monthly Burn (per user) |
|------|------|-----------|------------------------|
| Fantasy Standard Entry | 5 tickets | 4x/month | 20 |
| Fantasy Premium Entry | 10 tickets | 2x/month | 20 |
| Fantasy Championship Entry | 25 tickets | 1x/month | 25 |
| Chip: Triple Captain | 15 tickets | 1x/season | ~1.5/month |
| Chip: Synergy Surge | 10 tickets | 2x/season | ~2/month |
| Chip: Second Chance | 10 tickets | 2x/season | ~2/month |
| Chip: Wildcard | 5 tickets | 1x/season | ~0.5/month |
| Mystery Box | 15 tickets | 2x/month | 30 |
| Create Poll | 5 tickets | 1x/month | 5 |
| Boost Post | 10 tickets | 1x/month | 10 |
| Feature Research | 20 tickets | 0.5x/month | 10 |
| **Total Monthly Burn** | | | **~126 tickets** |

#### New Ticket Sources

| Source | Amount | Frequency | Monthly Earn (per user) |
|--------|--------|-----------|------------------------|
| Daily Login (streak 7+) | 15/day | 30x/month | 450 (max) |
| Daily Challenge (correct) | 10 | 30x/month | 300 (max) |
| Daily Challenge (wrong) | 3 | 30x/month | 90 (max) |
| Mission Claim | 10-50 | 5x/month | ~100 |
| Achievement Unlock | 25-50 | 2x/month | ~60 |
| Write Post | 3 | 5x/month | 15 |
| 10 Upvotes Milestone | 5 | 2x/month | 10 |
| Write Research | 10 | 1x/month | 10 |
| Research Rating 4.0+ | 5 | 2x/month | 10 |
| Follow 5 Users | 3 | 1x/month | 3 |
| **Total Monthly Earn (active)** | | | **~600-1000 tickets** |

**Analysis:** Active users earn 600-1000 tickets/month, burn ~126 tickets/month on essentials. This leaves a healthy surplus for mystery boxes (the "fun" sink) and chips (the "strategic" sink). The surplus prevents frustration while the sinks prevent hyperinflation.

**Casual users** (login + challenge only): ~350-450 tickets/month, burn ~50 tickets/month. Still positive, keeping them engaged.

#### bCredits Flow Optimization

**Current Sources:**
- Welcome bonus: 1,000 bCredits
- Score Road milestones: 200-20,000 bCredits
- Mission rewards: 20-400 bCredits
- Fantasy prizes: variable
- Trading profits: variable
- Research sales: variable

**Proposed Additions:**
- Achievement perks: 100-500 bCredits (one-time per achievement)
- Fan Rank milestone: 250 bCredits per tier-up
- Referral: 500 bCredits (referrer), 250 bCredits (referee)

**Sinks remain:** DPC purchases, club subscriptions, research unlocks, poll votes, event entry fees, bounty posts. This is healthy because the primary bCredits sink (DPC trading) is the core business model.

**Inflation Prevention:**
1. Tickets are the "casual" currency (high volume, low value per unit). Keep bCredits scarce.
2. Cosmetics are the "aspirational" currency (zero-sum, non-inflationary).
3. Achievement perks are one-time only (no recurring inflation).
4. Score Road rewards are progression-gated (users earn them once, ever).
5. Mission rewards are small relative to trading volume.

---

## Part 4: IMPLEMENTATION PRIORITY

### Tier 1: High Impact, High Cohesion (Do First)

| # | Feature | Impact on Vision | Impact on Cohesion | Impact on Retention | Effort | Files |
|---|---------|------------------|--------------------|--------------------| -------|-------|
| 1 | **B4: Tickets <-> Events** | High (drives engagement) | Critical (biggest sink gap) | High (daily return reason) | Medium | Migration + 4 files |
| 2 | **B1: DPC Ownership -> Fantasy Bonus** | Critical (core flywheel) | Critical (links 2 biggest systems) | High (drives DPC purchases) | Medium | Migration + 3 files |
| 3 | **B5: Social Actions <-> Tickets** | High (monetizes community) | High (connects community to economy) | Medium (content creators) | Small | 3 services + migration |
| 4 | **B8: Streak Compound Benefits** | Medium (retention mechanic) | Medium (streak feeds everything) | Critical (daily return) | Small | 2 files |
| 5 | **B6: Missions <-> Everything** | High (covers all activities) | Critical (missions span all systems) | High (daily tasks) | Medium | Migration + 5 services |

**Estimated effort:** 3-5 days for a 2-agent team (Mode 2 orchestration).

### Tier 2: High Visibility, Medium Effort (Do Second)

| # | Feature | Impact on Vision | Impact on Cohesion | Impact on Retention | Effort | Files |
|---|---------|------------------|--------------------|--------------------| -------|-------|
| 6 | **A3: Cosmetics Visible Everywhere** | Medium (aspiration) | High (visual identity layer) | Medium (social proof) | Medium | 5+ components |
| 7 | **A1: ScoreRoad Compact Strip** | Medium (progress visibility) | Medium (connects to homepage) | High (daily progress) | Small | 3 files |
| 8 | **A2: Contextual Mission Hints** | Medium (awareness) | High (in-context prompts) | Medium (completion rate) | Small | 4 files |
| 9 | **B9: Achievement Perks** | Medium (progression gates) | Medium (achievement -> feature unlock) | Medium (collect motivation) | Small | 3 files |
| 10 | **B3: Fan Rank Feature Unlocks** | High (club engagement) | Medium (rank -> features) | High (aspiration) | Medium | 4 files |

**Estimated effort:** 3-4 days for a 2-agent team.

### Tier 3: Depth Features (Do Third)

| # | Feature | Impact on Vision | Impact on Cohesion | Impact on Retention | Effort | Files |
|---|---------|------------------|--------------------|--------------------| -------|-------|
| 11 | **B2: Research -> Market Signal** | High (content -> trading) | High (community -> market) | Medium (analyst motivation) | Medium | 3 files |
| 12 | **B7: Cosmetic Social Identity** | Medium (aspiration depth) | Medium (visual depth) | Medium (collection) | Large | Many components |
| 13 | **B10: Club Activity -> Fan Rewards** | High (B2B value) | Medium (club -> fan loop) | Medium (club-specific) | Large | Migration + admin UI |
| 14 | **D: Full Retention Architecture** | High (long-term) | Medium (systemic) | Critical (90+ day) | Large | Cross-cutting |

**Estimated effort:** 5-7 days for a 3-agent team (Mode 3 orchestration).

### Implementation Sequence

```
Week 1 (Tier 1 — Foundation):
  Day 1-2: B4 (Tickets <-> Events) + B5 (Social Actions <-> Tickets)
           → These are DB migrations + service-level changes, no major UI
  Day 3-4: B1 (DPC Ownership Fantasy Bonus) + B8 (Streak Compound Benefits)
           → B1 needs scoring RPC change + UI indicator
           → B8 is purely logic + constants
  Day 5:   B6 (Missions Everywhere)
           → New mission definitions + trigger points in services

Week 2 (Tier 2 — Visibility):
  Day 1-2: A3 (Cosmetics Visible) + A1 (ScoreRoad Strip)
           → CosmeticAvatar component + ScoreRoadStrip component
  Day 3:   A2 (Contextual Mission Hints) + B9 (Achievement Perks)
           → MissionHint component + achievementPerks.ts
  Day 4-5: B3 (Fan Rank Feature Unlocks)
           → fanRankGates.ts + integration points

Week 3 (Tier 3 — Depth):
  Day 1-2: B2 (Research -> Market Signal)
           → ScoutConsensus component + aggregation query
  Day 3-5: B10 (Club Activity -> Fan Rewards)
           → club_challenges table + admin UI + Fan Rank integration
```

---

## Appendix A: New TypeScript Interfaces

```typescript
// ---- Streak Benefits ----
export interface StreakBenefits {
  dailyTickets: number;
  fantasyBonusPct: number;       // 0 | 0.05 | 0.15
  eloBoostPct: number;           // 0 | 10
  freeMysteryBoxesPerWeek: number; // 0 | 1
  mysteryBoxTicketDiscount: number; // 0 | 1
}

// ---- Feature Gates ----
export type FeatureGate =
  | 'custom_title'
  | 'extra_mystery_boxes'
  | 'early_event_access'
  | 'research_preview'
  | 'priority_bounty'
  | 'exclusive_cosmetics'
  | 'dm_club_admin'
  | 'beta_features';

export type FanRankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// ---- Achievement Perks ----
export type AchievementPerkType = 'cosmetic_unlock' | 'bsd_bonus' | 'feature_unlock' | 'multiplier';

export interface AchievementPerk {
  type: AchievementPerkType;
  cosmeticKey?: string;
  amountCents?: number;
  feature?: string;
  target?: string;
  value?: number;
}

// ---- Mission Hint ----
export interface MissionHint {
  missionId: string;
  label: string;
  rewardCents: number;
  progress: number;
  targetValue: number;
  context: 'fantasy' | 'market' | 'community' | 'trading' | 'social';
}

// ---- Scout Consensus ----
export interface ScoutConsensus {
  playerId: string;
  bullishCount: number;
  bearishCount: number;
  neutralCount: number;
  totalReports: number;
  avgRating: number;
  topAnalyst: {
    handle: string;
    hitRate: number;
    avatarUrl: string | null;
  } | null;
}

// ---- Club Challenge ----
export interface ClubChallenge {
  id: string;
  clubId: string;
  title: string;
  description: string;
  type: 'event_participation' | 'poll_vote' | 'fantasy_top_n' | 'custom';
  referenceId: string | null;  // event_id or poll_id
  fanRankPoints: number;
  cosmeticRewardKey: string | null;
  startsAt: string;
  endsAt: string;
  status: 'active' | 'ended';
}

// ---- Cosmetic Display ----
export interface EquippedCosmetics {
  frame: { key: string; name: string; rarity: CosmeticRarity } | null;
  title: { key: string; name: string; rarity: CosmeticRarity } | null;
  flame: { key: string; name: string; rarity: CosmeticRarity } | null;
  badge: { key: string; name: string; rarity: CosmeticRarity } | null;
  effect: { key: string; name: string; rarity: CosmeticRarity } | null;
}

// ---- Event with Ticket Cost ----
// Extends existing DbEvent:
// ticket_cost: number;  // ADD to DbEvent in types/index.ts
```

## Appendix B: New i18n Keys Required

```
gamification.scoreRoad.stripTitle: "Nächster Meilenstein"
gamification.scoreRoad.stripProgress: "{current}/{target} Punkte"
gamification.scoreRoad.stripClaimable: "{count} einlösbar!"

missions.hintTitle: "Mission"
missions.hintReward: "+{reward} bCredits"
missions.hintProgress: "{current}/{target}"

fantasy.ownershipBonus: "Besitzer-Bonus"
fantasy.ownershipBonusDesc: "+5% Punkte für eigene DPCs"
fantasy.ownershipBonusActive: "Aktiv ({count}/3)"
fantasy.ticketCost: "{cost} Tickets"
fantasy.notEnoughTickets: "Nicht genug Tickets"

research.consensus: "Scout-Konsens"
research.consensusBullish: "{count} Analysten bullish"
research.consensusBearish: "{count} Analysten bearish"
research.consensusTopAnalyst: "Top-Analyst: {handle} ({hitRate}% Trefferquote)"

fanRank.unlockTitle: "Rang-Vorteile"
fanRank.unlockSilver: "Custom Profiltitel, 2 Mystery Boxes/Woche"
fanRank.unlockGold: "Early Access auf Events (1h), Research-Vorschau"
fanRank.unlockPlatinum: "Priorität bei Bounties, exklusive Cosmetics"
fanRank.unlockDiamond: "Direkt-Nachricht an Club, Beta-Features"

streak.benefitTitle: "Serien-Bonus"
streak.benefitTickets: "+{count} Tickets/Tag"
streak.benefitFantasy: "+{pct}% Fantasy-Bonus"
streak.benefitElo: "+{pct}% Elo-Gewinn"
streak.benefitMysteryBox: "{count} gratis Mystery Box/Woche"
streak.benefitDiscount: "-{count} Ticket Rabatt auf Mystery Boxes"
streak.benefitLoyalist: "'Treuer Fan' Titel freigeschaltet"

achievement.perkUnlocked: "Belohnung freigeschaltet!"
achievement.perkCosmetic: "Cosmetic: {name}"
achievement.perkBsd: "+{amount} bCredits"
achievement.perkFeature: "Feature freigeschaltet: {feature}"

clubAdmin.challenges: "Fan-Challenges"
clubAdmin.challengeCreate: "Challenge erstellen"
clubAdmin.challengeReward: "Fan-Rang Punkte: {points}"
```

## Appendix C: Database Migrations Required

```sql
-- 1. Event ticket costs
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_cost INTEGER DEFAULT 0;

-- 2. Club challenges
CREATE TABLE IF NOT EXISTS club_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('event_participation', 'poll_vote', 'fantasy_top_n', 'custom')),
  reference_id UUID,
  fan_rank_points INTEGER NOT NULL DEFAULT 0,
  cosmetic_reward_key TEXT,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Achievement perks tracking (prevent double-claim)
CREATE TABLE IF NOT EXISTS achievement_perk_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  achievement_key TEXT NOT NULL,
  perk_type TEXT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_key)
);

-- 4. New mission definitions
INSERT INTO mission_definitions (key, type, title, description, target_value, reward_cents, active) VALUES
  ('daily_challenge', 'daily', 'Tagesquiz lösen', 'Beantworte die tägliche Frage', 1, 5000, true),
  ('mystery_box', 'daily', 'Mystery Box öffnen', 'Öffne eine Mystery Box', 1, 3000, true),
  ('visit_club', 'daily', 'Club besuchen', 'Besuche eine Club-Seite', 1, 2000, true),
  ('rate_research', 'daily', 'Research bewerten', 'Bewerte einen Research-Bericht', 1, 4000, true),
  ('upvote_posts', 'daily', 'Posts bewerten', 'Gib 3 Upvotes', 3, 3000, true),
  ('follow_user', 'daily', 'User folgen', 'Folge einem neuen User', 1, 2500, true),
  ('submit_3_lineups', 'weekly', '3 Lineups aufstellen', 'Stelle 3 Lineups auf', 3, 30000, true),
  ('earn_50_tickets', 'weekly', '50 Tickets verdienen', 'Verdiene 50 Tickets', 50, 20000, true),
  ('write_research', 'weekly', 'Research schreiben', 'Schreibe eine Analyse', 1, 40000, true),
  ('refer_friend', 'weekly', 'Freund einladen', 'Lade einen Freund ein', 1, 50000, true)
ON CONFLICT (key) DO NOTHING;

-- 5. Extend ticket_source CHECK constraint for new sources
ALTER TABLE ticket_transactions DROP CONSTRAINT IF EXISTS ticket_transactions_source_check;
ALTER TABLE ticket_transactions ADD CONSTRAINT ticket_transactions_source_check
  CHECK (source IN (
    'daily_login', 'daily_challenge', 'mission', 'achievement',
    'mystery_box', 'chip_purchase', 'event_entry', 'admin',
    'post_create', 'upvote_milestone', 'research_create', 'research_rating',
    'follow_milestone', 'poll_create', 'post_boost', 'research_feature',
    'score_road', 'fan_rank_milestone'
  ));
```

---

## Summary

This plan transforms BeScout from a collection of independent features into a tightly woven engagement ecosystem where:

1. **Every action feeds the ticket economy** (universal glue)
2. **DPC ownership enhances fantasy** (core flywheel link)
3. **Research quality signals to traders** (content -> market value)
4. **Rank unlocks real features** (aspiration -> utility)
5. **Streak compounds over time** (daily return mechanism)
6. **Cosmetics are socially visible** (non-inflationary aspiration)
7. **Missions span all activities** (awareness + completion drive)
8. **Achievements gate features** (progression structure)
9. **Club challenges drive engagement** (B2B value proposition)
10. **Every system feeds at least 2 others** (no orphans)

The implementation is ordered by impact * cohesion / effort, starting with the foundation (ticket sinks at events, DPC->fantasy link) and building toward depth (club challenges, full cosmetic visibility). Total estimated timeline: 3 weeks for a Mode 2-3 orchestrated implementation.
