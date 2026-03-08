---
paths:
  - "src/components/community/**"
  - "src/lib/services/social*"
  - "src/lib/services/research*"
  - "src/lib/services/bounties*"
  - "src/lib/services/posts*"
  - "src/lib/services/communityPolls*"
  - "src/lib/services/votes*"
---

## Feed Union-Type (Single-Scroll Layout)
```typescript
type FeedItem =
  | { type: 'post'; data: PostWithAuthor; date: string }
  | { type: 'research'; data: ResearchPostWithAuthor; date: string }
  | { type: 'bounty'; data: BountyWithCreator; date: string }
  | { type: 'vote'; data: DbClubVote; date: string }
  | { type: 'poll'; data: CommunityPollWithCreator; date: string };
type ContentFilter = 'all' | 'posts' | 'rumors' | 'research' | 'bounties' | 'votes' | 'news';
```
- Sorting: pinned first, dann 'new' (date), 'trending' (engagement/age^1.5), 'top' (upvotes-downvotes)
- Search: case-insensitive ueber content, handle, title, preview, question

## Post Types
- `post_type`: 'general' | 'player_take' | 'transfer_rumor' | 'club_news'
- `post_votes.vote_type` = SMALLINT (1/-1), NICHT boolean
- Replies: `parent_id` FK, ordered by created_at ASC

## Research (Paywall)
- `price` in BIGINT cents. `price_at_creation` = Snapshot (floor_price ODER ipo_price)
- `call`: 'Bullish' | 'Bearish' | 'Neutral' (Capitalized!)
- `category`: 'Spieler-Analyse' | 'Transfer-Empfehlung' | 'Taktik' | 'Saisonvorschau' | 'Scouting-Report'
- Track Record: >= 5 resolved + >= 60% hitRate = "verified" Pill
- Unlock: RPC `unlock_research` (Wallet deduct + 80/20 Author/Platform Split)
- Rating: 1-5 Sterne, nur fuer Unlocker, kein Self-Rating

## Bounties
- Club-Bounties: Admin erstellt, Reward aus Club-Wallet
- User-Bounties: `create_user_bounty` RPC (Escrow: Wallet lock → Insert → bei Fehler: Unlock)
- `min_tier`: Optional (bronze/silber/gold Gate). TIER_ORDER: bronze=1, silber=2, gold=3
- `type`: 'general' | 'scouting' (scouting braucht ScoutingEvaluation: 5 Scores + Texte)
- `auto_close_expired_bounties` — lazy Trigger bei Deadline
- Approval: `approve_bounty_submission` RPC → Reward + Auto-Post + Notification + Gamification

## Votes & Polls
- `options` = JSONB Array: `{label: string; votes: number}[]`
- `option_index` = 0-basiert (Array-Index, nicht ID)
- Active Check: `status='active' AND ends_at > now()` (BEIDE Bedingungen!)
- Poll Cancel: nur Creator, nur wenn total_votes=0
- Vote Gewicht: Bronze+ = 2x (`cast_vote` RPC prueft Abo)

## ScoutingEvaluation
- 5 Felder: technik, taktik, athletik, mentalitaet, potenzial (0-10)
- Plus: staerken, schwaechen, gesamteindruck (Strings)
- Validation: alle 5 Scores >= 1, Textfelder >= min chars

## Geld-Regeln
- IMMER BIGINT cents: price, reward_cents, cost_bsd, amount_paid, total_earned
- `avg_rating` ist 0-5.0 float (Ausnahme)
- Escrow bei User-Bounties: `locked_balance` FOR UPDATE

## Cross-Domain (bei Bedarf nachladen)
- **Gamification:** Analyst Score Triggers, Achievement Unlocks nach Content → `gamification.md`
- **Trading:** Research Price Snapshot (floor_price/ipo_price), Escrow Pattern → `trading.md`
- **Profile:** Author Track Record, Follower System, Leaderboard → `profile.md`
- **Club-Admin:** Bounty min_tier Gate, Vote Gewicht nach Abo → `club-admin.md`

## Gamification-Trigger (DB-seitig, kein Client-Code noetig)
- Post create → `trg_analyst_score_on_post`
- Research create → `trg_analyst_score_on_research`
- Research unlock → `trg_fn_research_unlock_gamification`
- Bounty approve → `trg_fn_bounty_approved_analyst`
- Follow → `trg_fn_follow_gamification`
- Vote/Poll → Mission tracking via `triggerMissionProgress(['daily_vote'])`
