# Cross-Domain Dependency Map
> Last Updated: 2026-03-26 (Session 257)
> Rule: When changing ANY domain, check ALL arrows pointing to/from it.

## Domain Interaction Matrix

```
Fantasy ──→ Trading    SC Blocking: holding_locks prevents selling
Fantasy ──→ Wallet     Entry Fee (lock_event_entry), Refund (unlock_event_entry), Chips (activate_chip)
Fantasy ──→ Gamification  Manager Elo (post-scoring), Achievements (event_winner), Missions (weekly_fantasy)
Fantasy ──→ Profile    Season Leaderboard, Fantasy History, Fan Ranks
Fantasy ←── Club Admin Event Creation, Gameweek Advance, Scoring Trigger
Fantasy ←── Scoring    player_gameweek_scores → lineup total_score + rank

Trading ──→ Wallet     Trade Fees (6% split: Platform 3.5% + PBT 1.5% + Club 1%)
Trading ──→ Gamification  Trader Elo (post-trade), Achievements (first_trade, whale)
Trading ──→ Fantasy    Holdings quantity → lineup eligibility (min_sc_per_slot)
Trading ←── Fantasy    holding_locks blocks sell orders

Wallet  ←── Trading    Fee deduction on trade execution
Wallet  ←── Fantasy    Entry fee lock, chip activation, wildcard spend
Wallet  ──→ Profile    Balance display, transaction history

Gamification ←── Fantasy   Manager Points (percentile-based Elo after scoring)
Gamification ←── Trading   Trader Points (volume + profit Elo)
Gamification ←── Community Analyst Points (research quality Elo)
Gamification ──→ Fantasy   Tier gates (min_tier, min_subscription_tier on events)
```

## Trigger Table: "When changing X, check Y"

| If you change... | MUST check... | Why |
|------------------|---------------|-----|
| `lineups` table/RPC | `holding_locks`, `orders` service, `holdings` queries | SC Blocking + Trading |
| `events` table/RPC | `event_entries`, `lineups`, `wallet`, `notifications` | Payment + Lineup cascade |
| `holding_locks` | `getPlayerEventUsage()`, `effectiveHoldings`, Market sell flow | Locks affect trading |
| `event_entries` | `current_entries` counter, `wallet` balance, `joinedIds` cache | Counter + Payment |
| Entry Fee logic | `lock_event_entry` RPC, `unlock_event_entry` RPC, WalletProvider | Dual-currency (tickets/scout) |
| Scoring RPCs | `lineups.total_score`, `lineups.rank`, `reward_amount`, gamification triggers | Points + Rewards + Elo |
| `holdings` table | Fantasy lineup eligibility, Market display, Portfolio display | Multi-domain impact |
| Event status change | `sync_event_statuses`, `trg_fn_event_status_unlock_holdings`, notifications | Auto-unlock + Notify |
| Gameweek advance | Event cloning, fixture scores, prediction resolution | Multi-step orchestration |

## File-Level Dependencies

| Service File | Depends On | Depended By |
|-------------|-----------|-------------|
| events.ts | wallet (fee), notifications | FantasyContent, EventsTab, ClubAdmin |
| lineups.ts | supabase RPC, holdings (ownership) | EventDetailModal, FantasyContent |
| scoring.ts | lineups, player_gameweek_scores, gamification, notifications | ClubAdmin SpieltagTab |
| predictions.ts | fixtures, players | PredictionsTab |
| chips.ts | wallet (tickets), events | ChipSelector, EventDetailModal |
| wildcards.ts | wallet-like (own table) | EventDetailModal (wildcard slots) |
