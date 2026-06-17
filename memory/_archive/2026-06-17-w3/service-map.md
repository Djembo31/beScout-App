---
name: Service Map (Backend-Inventar)
description: SSOT — alle Backend-Artefakte (Services, Query-Hooks, RPCs, Tabellen, Domain-Map). Generiert fuer Operation Beta Ready Phase 0.
type: project
status: complete
created: 2026-04-14
owner: CTO (Claude) via Explore Agent
---

# Backend-Inventar — Operation Beta Ready Phase 0

**Stack:** Supabase (PostgreSQL + Auth + Realtime) + TypeScript strict

---

## 1. Services (src/lib/services/**) — 63 Files, 341 Exported Functions

| Service | Zweck | Key Functions (Top 5) | Konsumenten |
|---------|-------|------------------------|-------------|
| trading.ts | Market orders, buy/sell pricing | buyFromMarket, placeSellOrder, buyFromOrder, cancelOrder, getAllOpenSellOrders | market/**, player/detail, manager |
| wallet.ts | Balance, holdings, transactions | getWallet, getHoldings, getHoldingQty, getAvailableSc, getTransactions | trading, portfolio-pages |
| ipo.ts | IPO lifecycle, purchasing | getActiveIpos, buyFromIpo, createIpo, updateIpoStatus, getIpoForPlayer | market/**, ipos-pages |
| social.ts | Follow/unfollow, stats | followUser, unfollowUser, getUserSocialStats, getFollowerCount, getFollowingCount | profile-pages, follow-features |
| missions.ts | Mission tracking, rewards | getUserMissions, claimMissionReward, invalidateMissionData | mission-pages, gamification |
| gamification.ts | Score roads, fan rank | getScoreRoadClaims, claimScoreRoad, getScoreHistory, calculateFanRank | gamification-pages |
| posts.ts | Post CRUD, feeds | createPost, deletePost, updatePost, getPostById, getHomeFeed | home/**, profiles |
| equipment.ts | Gear management | getUserEquipment, equipToSlot, unequipFromSlot, getEquipmentById | cosmetics-ui, player-detail |
| cosmetics.ts | Shop, user cosmetics | getUserCosmetics, getCosmeticsDefinitions, buyCosmeticItem | cosmetics-pages |
| mysteryBox.ts | Box mechanics | openMysteryBox, getMysteryBoxConfig, getUserMysteryBoxResults | mystery-box-pages |
| bounties.ts | Bounty workflows | submitBountyResponse, approveBountySubmission, createUserBounty | bounty-pages |
| notifications.ts | User alerts | getNotifications, markAsRead, deleteNotification | notification-center |
| profiles.ts | User profiles | getProfile, updateProfile, getProfileByHandle | profile-pages |
| club.ts | Club data, members | getClub, getClubMembers, getClubRecentTrades, getClubStats | club-pages |
| players.ts | Player master | getPlayer, getPlayers, getPlayerLineup, getPlayerStats | player-**, market |
| fixtures.ts | Fixture schedules | getFixture, getFixtures, getFixturePlayerStats | gameweek-pages |
| fantasyLeagues.ts | Fantasy data | getFantasyLeague, getFantasyLeagueMembers, getUserFantasyLeagues | fantasy-pages |
| scouting.ts | Scout events | getScouting, getScoutEvents, assignScoutEvent | scout-pages |
| scoutScores.ts | Scout scoring | getScoutScoresProfile, getScoutScoreDimension, getTopScouts | scout-pages |
| wildcards.ts | Event currency | earn_wildcards, spend_wildcards, refund_wildcards, admin_grant | event-management |
| watchlist.ts | Player watchlist | getWatchlist, addToWatchlist, removeFromWatchlist | watchlist-pages |
| auth.ts | Auth lifecycle | getCurrentUser, refreshAuth, signOut | auth-wrapper |
| research.ts | Research posts | createResearchPost, rateResearch, getResearchPosts | research-pages |
| votes.ts | Post voting | castVote, getVotes, getUserVotes | posts-ui |
| offers.ts | Buy/sell offers | getOffers, createOffer, acceptOffer, cancelOffer | trading-ui |
| streaks.ts | Streak tracking | getUserStreaks, claimStreakMilestone | streak-pages |
| communityPolls.ts | Poll voting | createPoll, castPollVote, getPollResults | polls-ui |
| fanRanking.ts | Fan rank data | calculateFanRank, getFanRanks, getUserFanRank | profile-pages |
| airdropScore.ts | Airdrop eligibility | getAirdropScore, checkAirdropEligibility | airdrop-pages |
| sponsors.ts | Sponsor tracking | getSponsorStats, trackSponsorImpression | sponsor-ui |

**+ 33 weitere** (adminRoles, footballData, creatorFund, clubs, etc.)

---

## 2. Query Hooks (src/lib/queries/**) — 43 Files

| File | Zweck | Query Key Pattern |
|------|-------|--------------------|
| trades.ts | Trade history | qk.trades.byPlayer, qk.clubs.recentTrades |
| orders.ts | Open market orders | qk.orders.all, qk.orders.buy |
| ipos.ts | IPO state | qk.ipos.active, qk.ipos.announced, qk.ipos.ended |
| holdings.ts | Portfolio data | qk.holdings.all, qk.holdings.byPlayer |
| offers.ts | Buy/sell offers | qk.offers.user, qk.offers.open |
| notifications.ts | Notification feed | qk.notifications.all, qk.notifications.unread |
| social.ts | Follow graph | qk.social.followers, qk.social.following |
| gamification.ts | Score roads | qk.gamification.scoreRoad, qk.gamification.scoreHistory |
| missions.ts | Mission state | qk.missions.user, qk.missions.definitions |
| equipment.ts | Gear slots | qk.equipment.user, qk.equipment.slots |
| cosmetics.ts | Cosmetic shop | qk.cosmetics.all, qk.cosmetics.user |
| bounties.ts | Bounty listings | qk.bounties.all, qk.bounties.user |
| fantasyLeagues.ts | League standings | qk.fantasy.myLeagues, qk.fantasy.standings |
| predictions.ts | Prediction accuracy | qk.predictions.user, qk.predictions.accuracy |
| players.ts | Player aggregates | qk.players.all, qk.players.trending |
| fixtures.ts | Fixture schedules | qk.fixtures.upcoming, qk.fixtures.recent |
| research.ts | Research posts | qk.research.all, qk.research.byAuthor |
| sponsors.ts | Sponsor data | qk.sponsors.all, qk.sponsors.stats |
| fanRanking.ts | Fan rank leaderboard | qk.fanRanking.user, qk.fanRanking.leaderboard |
| airdrop.ts | Airdrop eligibility | qk.airdrop.score, qk.airdrop.eligible |
| watchlist.ts | Watched players | qk.watchlist.all, qk.watchlist.byPlayer |
| enriched.ts | Market aggregates | qk.enriched.market, qk.enriched.portfolio |
| stats.ts | User/player stats | qk.stats.user, qk.stats.player |

**+ 20 weitere Hooks**

---

## 3. RPCs (61 Total — 56 public.*, 5 custom schema)

### Trading (9)
place_sell_order, place_buy_order, buy_player_dpc, buy_from_order, cancel_buy_order, expire_pending_orders, expire_pending_buy_orders, recalc_floor_price, get_price_cap

### IPO (1)
buy_from_ipo

### Fantasy/Events (5)
score_event, lock_event_entry, unlock_event_entry, cancel_event_entries, init_user_tickets

### Wildcards (5)
get_wildcard_balance, earn_wildcards, spend_wildcards, refund_wildcards_on_leave, admin_grant_wildcards

### Gamification (4)
award_dimension_score, calculate_fan_rank, scout_events_enabled, tier_rank

### Bounties (6)
submit_bounty_response, approve_bounty_submission, reject_bounty_submission, create_user_bounty, cancel_user_bounty, close_expired_bounties

### Social/Voting (2)
cast_community_poll_vote, cast_vote

### Equipment (2)
equip_to_slot, unequip_from_slot

### Missions (4)
assign_user_missions, claim_mission_reward, update_mission_progress, track_my_mission_progress

### Mystery Box (1)
open_mystery_box_v2

### Fantasy Leagues (1)
fantasy_get_my_league_ids

### Trending/Stats (5)
rpc_get_trending_players, rpc_get_author_track_records, rpc_get_most_watched_players, rpc_get_player_percentiles, notify_watchlist_price_change

### Season Management (4)
get_current_liga_season, get_monthly_liga_winners, close_monthly_liga, soft_reset_season

### Cron/Background (2)
cron_recalc_perf, sync_player_aggregates

**DPC Coverage:** 2 RPCs mit "DPC" im Namen (buy_player_dpc, calculate_dpc_of_week) + dpc_mastery (table) + 16 RPCs mit "DPC" in description strings

---

## 4. Core Tables (26+ mit RLS)

| Table | Zweck | RLS | Cross-User Read |
|-------|-------|-----|------------------|
| profiles | User identity | JA | Oeffentlich |
| wallets | Balance + escrow | JA | Nur Selbst |
| holdings | Stock positions | JA | Nur Selbst |
| transactions | Ledger | JA | Nur Selbst (+ safe subset) |
| trades | Buy/sell history | JA | Oeffentlich |
| orders | Open orders | JA | Oeffentlich |
| ipo_purchases | IPO buys | JA | Nur Selbst |
| ipos | IPO listings | JA | Oeffentlich |
| offers | Buy/sell offers | JA | Nur Beteiligt |
| activity_log | Feed events | JA | Follower + Selbst |
| notifications | User alerts | JA | Nur Selbst |
| user_equipment | Gear slots | JA | Nur Selbst |
| user_cosmetics | Cosmetics owned | JA | Nur Selbst |
| user_tickets | Event tickets | JA | Nur Selbst |
| posts | Social content | JA | Oeffentlich |
| post_votes | Post reactions | JA | Nur Selbst |
| fantasy_leagues | Fantasy leagues | JA | Oeffentlich |
| fantasy_league_members | League membership | JA | In Liga lesbar (SECURITY DEFINER helper) |
| mission_definitions | Mission templates | JA | Oeffentlich |
| user_missions | Mission progress | JA | Nur Selbst |
| bounties | Bounty challenges | JA | Oeffentlich |
| bounty_submissions | Bounty responses | JA | Creator + User |
| user_follows | Follow relationships | JA | Oeffentlich |
| event_entries | Event registrations | JA | Nur Selbst |
| watchlist | Tracked players | JA | Nur Selbst |
| user_stats | Aggregates | JA | Oeffentlich (anonym) |

**Master Tables (ohne RLS):** players, clubs, fixtures, equipment_definitions, cosmetic_definitions, events

---

## 5. Domain-Map

### Trading
- **Services:** trading, wallet, offers, liquidation
- **RPCs:** place_sell_order, buy_player_dpc, buy_from_order, place_buy_order, cancel_buy_order, expire_pending_orders, recalc_floor_price, get_price_cap
- **Tables:** orders, trades, holdings, wallets, transactions
- **Invariants:** Escrow lock (locked_balance), price caps
- **Mutations:** wallet.locked up/down, holdings.qty up/down

### IPO
- **Services:** ipo
- **RPCs:** buy_from_ipo
- **Tables:** ipos, ipo_purchases, players, wallets
- **Invariants:** Quantity cap per user, global limit
- **Mutations:** ipo.sold_qty up, wallet.balance down, holdings.qty up

### Fantasy/Events
- **Services:** scouting, scoring, fixtures, fantasyLeagues, predictions
- **RPCs:** lock_event_entry, unlock_event_entry, cancel_event_entries, score_event, fantasy_get_my_league_ids
- **Tables:** event_entries, events, user_tickets, fantasy_leagues, fantasy_league_members
- **Invariants:** Lock period, refund on cancel
- **Mutations:** event_entries INSERT/DELETE, user_tickets.locked up/down

### Gamification
- **Services:** gamification, scoutScores, fanRanking, achievements
- **RPCs:** award_dimension_score, calculate_fan_rank, scout_events_enabled, tier_rank
- **Tables:** bescout_scores, scout_scores, fan_rankings, user_streaks, user_achievements
- **Invariants:** Immutable after lock, real-time fan_rank

### Missions & Streaks
- **Services:** missions, streaks, scoutMissions
- **RPCs:** assign_user_missions, claim_mission_reward, update_mission_progress
- **Tables:** mission_definitions, user_missions, user_streaks
- **Invariants:** Claim nur bei 100%, one claim per mission

### Social
- **Services:** social, posts, research, votes, communityPolls
- **RPCs:** cast_vote, cast_community_poll_vote
- **Tables:** user_follows, posts, post_votes, research_posts, research_ratings, community_polls
- **Invariants:** No self-follow, one vote per user per post

### Equipment & Cosmetics
- **Services:** equipment, cosmetics, mysteryBox
- **RPCs:** equip_to_slot, unequip_from_slot, open_mystery_box_v2
- **Tables:** user_equipment, user_cosmetics, equipment_definitions, cosmetic_definitions
- **Invariants:** Max 1 item per slot

### Bounties
- **Services:** bounties
- **RPCs:** submit_bounty_response, approve_bounty_submission, reject_bounty_submission, create_user_bounty, cancel_user_bounty, close_expired_bounties
- **Tables:** bounties, bounty_submissions
- **Invariants:** One submission per user per bounty

### Watchlist
- **Services:** watchlist
- **RPCs:** (via insert/delete) + notify_watchlist_price_change (trigger)
- **Tables:** watchlist
- **Invariants:** Max 50 items

### Wildcards
- **Services:** wildcards
- **RPCs:** get_wildcard_balance, earn_wildcards, spend_wildcards, refund_wildcards_on_leave, admin_grant_wildcards
- **Tables:** user_wildcards, wildcard_transactions
- **Invariants:** Balance >= 0, refund on event cancel

### Admin/Season
- **Services:** platformAdmin
- **RPCs:** get_current_liga_season, get_monthly_liga_winners, close_monthly_liga, soft_reset_season
- **Tables:** liga_seasons, monthly_liga_snapshots, monthly_liga_winners
- **Invariants:** One active season

---

## 6. Key Patterns & Observations

1. **Service Layer Consistency:** Alle RPCs durch Service-Funktionen, nie direkt vom UI
2. **RLS + Auth Defense-in-Depth:** DB-level RLS + auth.uid() check in RPC + isRestrictedFromTrading helper
3. **Error Mapping:** trading.ts mapRpcError standardisiert RPC-Fehler auf i18n-Keys
4. **Price Architecture:** reference_price (trigger), initial_listing_price (immutable), floor_price (trigger-updated), price_cap (anti-manipulation)
5. **Escrow Pattern:** locked_balance fuer offene Orders, Unlock nur bei Expiry/Cancel
6. **Query-Key Namespacing:** qk.* zentralisiert Cache-Keys (keys.ts)
7. **Trigger-Based Gamification:** fn_trader_score_on_trade, fn_analyst_score_on_post auto-award
8. **Activity Feed:** activity_log + realtime via notifications (followed users only)

---

## 7. Counts

| Kategorie | Anzahl |
|-----------|--------|
| Services | 63 |
| Query Hooks | 43 |
| RPCs | 61 |
| Core Tables (RLS) | 26+ |
| Master Tables | 6 |
| Domains | 11 |
| Service Functions | 341 |
