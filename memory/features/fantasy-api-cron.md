# Fantasy API & Cron System Audit

## Status: Audit Complete
## Audited: 2026-03-14
## File: `src/app/api/cron/gameweek-sync/route.ts` (1252 lines)

---

## 1. Pipeline Overview

The cron runs daily at `06:00 UTC` (vercel.json). It is a single GET endpoint at `/api/cron/gameweek-sync` authenticated via `CRON_SECRET` bearer token.

### Phase A: Housekeeping (always runs)
| Step | What | RPC/Query |
|------|------|-----------|
| 2b. expire_ipos | Auto-expire IPOs past `ends_at` | Direct UPDATE on `ipos` |
| 2c. expire_pending_offers | Expire stale P2P offers, release locked_balance | `expire_pending_offers()` RPC |
| 2c2. expire_pending_orders | Expire stale sell orders past `expires_at` | `expire_pending_orders()` RPC |
| 2d. daily_price_volume_reset | Recalculate `price_change_24h`, reset `volume_24h` | `daily_price_volume_reset()` RPC |

### Phase A: Data Import (runs when fixtures are newly finished)
| Step | What | API Calls |
|------|------|-----------|
| 3. get_active_gw | Find minimum `active_gameweek` across all clubs | DB query on `clubs` |
| 3b. check_processable | Check if unfinished fixtures have `played_at` in past | DB query on `fixtures` |
| 4. check_api_fixtures | Fetch round fixtures from API-Football | 1 API call: `/fixtures?league=204&season=2025&round=Regular Season - N` |
| 5. load_mappings | Load DB fixtures, player external IDs, players, club external IDs | 4 parallel DB queries |
| 5b. identify_new | Compare API finished vs DB finished | DB query on `fixtures` |
| 6. fetch_stats | Per newly-finished fixture: fetch lineups, player stats, events | 3 API calls per fixture (parallel): `/fixtures/lineups`, `/fixtures/players`, `/fixtures/events` |
| 7. import_data | Upsert fixture scores + player stats via RPC | `cron_process_gameweek(p_gameweek, p_fixture_results, p_player_stats)` |
| 7b. save_substitutions | Upsert substitution events | Direct UPSERT on `fixture_substitutions` |
| 7c. auto_reconcile | Persist newly discovered API-Football player IDs | Direct UPSERT on `player_external_ids` |

### Phase B: GW Finalization (only when ALL fixtures in the GW are finished)
| Step | What | RPC/Query |
|------|------|-----------|
| 8-9. score_events | Transition events registering/late-reg to running, then score | `score_event(p_event_id)` per event |
| 9a. fan_rank_update | Recalculate fan rankings for scored event participants | `calculate_fan_rank(p_user_id, p_club_id)` per participant |
| 9b. resolve_predictions | Resolve pending predictions for the GW | `resolve_gameweek_predictions(p_gameweek)` |
| 9c. dpc_of_week | Calculate best-performing DPC for the GW | `calculate_dpc_of_week(p_gameweek)` |
| 10. clone_events | Clone events for next GW (idempotent) | DB insert on `events` |
| 11. advance_gameweek | Bump `active_gameweek` on clubs (max GW 38) | Direct UPDATE on `clubs` |
| 12. recalc_perf | Recalculate `perf_l5`, `perf_l15`, aggregate stats | `cron_recalc_perf()` |

---

## 2. Player Matching Pipeline

### Resolution Order (3-stage, per player stat entry)

1. **Direct API-ID Lookup**: Check `player_external_ids` table for exact `api_football_squad` or `api_football_fixture` match
2. **Shirt-Number Bridge**: If direct fails, name-match to DB player, get their shirt number, find lineup entry with same shirt number
3. **Name Fallback**: Normalize name (Turkish Unicode safe via `normalizeForMatch()`), try exact match then fuzzy last-name match

### Name Matching Algorithm (`nameMatchPlayer`)
- Scoring system (threshold: 40 points minimum)
- Exact last name: +50, last name contained: +35, partial: +25
- First name exact: +30, contained: +15
- Shirt number match: +25
- Best match wins (above threshold)

### Auto-Reconciliation
- When a player is matched by name/shirt but has a different API ID than known, the new ID is persisted to `player_external_ids` with source `api_football_fixture`
- This self-heals the dual-ID problem over time

### Ghost Starter Deduplication (`deduplicateGhostStarters`)
- API-Football sometimes uses different player IDs in lineup vs stats endpoints
- When >11 starters exist for a team, identifies ghosts (is_starter=true, minutes=0, rating=null)
- Removes ghosts, promotes real players, transfers grid_position by position compatibility
- Structural guarantee: exactly 11 starters per team

---

## 3. Fantasy Points Calculation

### Two Scoring Paths (line 690-703)

**Path 1 (preferred):** If API-Football provides a `rating` (0.0-10.0 scale):
```
fantasy_points = Math.round(rating * 10)  // e.g., 7.2 → 72
```

**Path 2 (fallback):** If no rating, use `calcFantasyPoints()`:
- Appearance: +1 (>0 min), +1 (>=60 min)
- Goals: GK/DEF +6, MID +5, ATT +4
- Assists: +3
- Clean sheet (GK/DEF, 60+ min): +4; MID: +1
- Goals conceded (GK/DEF): -1 per 2 conceded
- Yellow: -1, Red: -3
- GK saves: +1 per 3 saves
- Floor: max(0, pts)

### Score Normalization in `cron_process_gameweek` RPC
```sql
-- player_gameweek_scores.score (0-100 scale):
CASE
  WHEN rating IS NOT NULL THEN LEAST(100, GREATEST(0, ROUND(rating * 10)))
  ELSE LEAST(100, GREATEST(0, ROUND(fantasy_points * 5)))
END
```

---

## 4. Event Lifecycle in Cron

1. Events with `gameweek = activeGw` and `scored_at IS NULL` are processed
2. Events in `registering` or `late-reg` status are auto-transitioned to `running`
3. Events with 0 entries are closed directly (status = 'ended', scored_at = now())
4. Events with entries are scored via `score_event` RPC which:
   - Looks up each lineup's slot players in `player_gameweek_scores`
   - Applies captain bonus (1.5x, capped at 150)
   - Calculates club synergy bonus (+5% per club with 2+ players, max 15%)
   - Awards tier bonuses to wallets (decisive/strong/good thresholds)
   - Ranks via DENSE_RANK, distributes prize pool per reward_structure
   - Updates perf_l5/perf_l15 on players
   - Sets event status = 'ended', scored_at = now()

---

## 5. Bugs Found

### CRITICAL: `resolve_gameweek_predictions` fails silently from cron
- **Root cause**: The RPC has an `auth.uid() IS NULL` guard that returns `{ok: false, error: "Not authenticated"}`
- **Impact**: Predictions are NEVER resolved by the cron. They stay in `pending` status forever.
- **Where**: Called at step 9b via `supabaseAdmin.rpc()` where `auth.uid()` is always NULL
- **Fix needed**: Update RPC to skip auth check when `auth.uid() IS NULL` (service role context), similar to how `score_event` handles it
- **Severity**: HIGH -- feature is broken in production

### CRITICAL: `calculate_dpc_of_week` throws exception from cron
- **Root cause**: The RPC uses `RAISE EXCEPTION 'auth_required'` when `auth.uid() IS NULL`
- **Impact**: DPC of the Week is never calculated by the cron
- **Where**: Called at step 9c via `supabaseAdmin.rpc()`
- **Fix needed**: Same pattern as `score_event` -- check `auth.uid() IS NOT NULL` before admin guard
- **Severity**: HIGH -- feature is broken in production

### MODERATE: `expire_pending_orders` RPC not yet deployed
- **Root cause**: Migration `20260314120000_trading_missions_order_expiry.sql` exists locally but hasn't been applied to production
- **Impact**: Step 2c2 throws error and is caught by `runStep`, continuing silently. Expired orders are not cleaned up.
- **Where**: Step 2c2 in the cron
- **Fix needed**: Apply the migration
- **Severity**: MODERATE -- orders with `expires_at` guards in buy RPCs prevent purchasing expired orders, but floor_price may be artificially low

### LOW: `logStep` unconditionally logged "success" for Phase B steps
- **Root cause**: Several `logStep()` calls were placed AFTER `runStep()` with hardcoded 'success' status, regardless of whether `runStep` caught an error
- **Impact**: `cron_sync_log` showed false "success" for steps that actually failed (resolve_predictions, dpc_of_week)
- **Where**: Lines 995, 1037, 1053, 1066, 1158, 1182, 1194
- **Fix applied**: Updated all `logStep` calls to check actual step result
- **Status**: FIXED in this audit

### LOW: `cron_recalc_perf` return type mismatch
- **Root cause**: RPC returns `{success, perf_updated, agg_updated}` but code cast to `{success, updated_count}`
- **Impact**: Log always shows `updated: 0` (cosmetic)
- **Fix applied**: Updated type cast to match actual RPC return
- **Status**: FIXED in this audit

### LOW: `console.log` used for error in auto-reconcile
- **Root cause**: `console.log` used for reconciliation errors instead of `console.error`
- **Fix applied**: Changed to `console.error`, removed noisy success log
- **Status**: FIXED in this audit

### INFO: Documentation error in `.claude/rules/fantasy.md`
- **Was**: "TFF 1. Lig, League ID 203"
- **Should be**: "TFF 1. Lig, League ID 204 (203 = Süper Lig!)"
- **Fix applied**: Corrected
- **Status**: FIXED in this audit

---

## 6. Edge Cases & Failure Modes

### API-Football Down/Timeout
- `apiFetch` has NO timeout configured (uses default `fetch` behavior)
- If API is unreachable, `fetch` will eventually timeout (browser default) and throw
- `runStep('fetch_stats')` catches the error; cron returns 500 with error details
- **Risk**: Vercel function has 10s timeout (Hobby) or 60s (Pro); API calls could exceed this
- **Recommendation**: Add AbortController with 15s timeout to `apiFetch`

### Fixture Postponed/Cancelled
- Only `FINISHED_STATUSES = ['FT', 'AET', 'PEN']` are processed
- Postponed/cancelled fixtures stay `!= 'finished'` in DB forever
- Phase B (finalization) requires ALL fixtures to be done (`allFixturesDone`)
- **Risk**: A single postponed fixture blocks the entire GW from finalizing (events never scored, GW never advances)
- **Recommendation**: Add `PST` (postponed) and `CANC` (cancelled) handling -- either skip or void them

### Player Matching Fails
- Unmatched players get `player_id: null` in `fixture_player_stats`
- Stats are still saved (for audit/debugging) but don't contribute to `player_gameweek_scores`
- `score_event` uses `player_gameweek_scores` to look up scores per slot -- unmatched players get default score of 40
- **Risk**: Systemic name-matching failures would degrade scoring accuracy. Currently tracking shows good match rates.

### Cron Runs Twice (Idempotency)
- **Phase A (housekeeping)**: Idempotent -- IPO expiry, offer/order expiry, price reset all re-run safely
- **Phase A (data import)**: `cron_process_gameweek` RPC DELETEs existing stats before re-inserting (idempotent reimport)
- **Phase B (event scoring)**: `score_event` checks `scored_at IS NOT NULL` and returns early if already scored
- **Phase B (clone events)**: Checks if events already exist for next GW before cloning
- **Phase B (advance GW)**: Re-setting `active_gameweek` to same value is a no-op
- **Verdict**: Fully idempotent for all steps

### Season/League IDs Hardcoded
- `DEFAULT_LEAGUE_ID = 204` and `DEFAULT_SEASON = 2025` in `footballApi.ts`
- Overridable via `NEXT_PUBLIC_LEAGUE_ID` and `NEXT_PUBLIC_SEASON` env vars
- **Risk**: Must update for 2026-27 season start. Easy fix via env vars.

### API-Football Rate Limiting
- API-Football Plus: 300 requests/minute
- Per cron run: 1 + (N_fixtures * 3) API calls = ~31 for 10 fixtures
- **Risk**: No rate limit handling, but usage is well within limits
- **Recommendation**: Consider adding retry with backoff for 429 responses

### GW 38 (Season End)
- `nextGw <= 38` guard prevents advancing past GW 38
- Events are not cloned beyond GW 38
- `advance_gameweek` is skipped
- **Risk**: None -- handled correctly

---

## 7. Performance Notes

### API Call Budget
- 1 call for fixtures check
- 3 calls per newly-finished fixture (lineups + stats + events, parallel)
- Total: 1 + 3N where N = newly finished fixtures (typically 5-10)
- All per-fixture API calls are parallelized via `Promise.all`

### DB Call Budget
- Phase A: 4 RPC calls (housekeeping)
- Mappings: 4 parallel queries + 2 fixture status checks
- Import: 1 RPC + 1 upsert (substitutions) + 1 upsert (external IDs)
- Phase B: N events * 1 RPC each + M participants * 1 RPC each (fan rank) + 3 RPCs + event cloning
- **Bottleneck**: Fan rank update is O(participants) with sequential RPC calls per user

### Timing
- Typical full run (all fixtures done): 5-15 seconds
- Partial run (some fixtures done): 3-8 seconds
- Skip (nothing to process): <1 second
- Vercel Hobby timeout: 10 seconds -- **risk of timeout on full GW finalization with many participants**

---

## 8. Recommendations (Priority Order)

### P0 — Must Fix (broken in production)
1. **Fix `resolve_gameweek_predictions` RPC**: Add `IF auth.uid() IS NULL THEN /* skip guard, service role */` like `score_event` does
2. **Fix `calculate_dpc_of_week` RPC**: Same pattern -- allow NULL auth.uid() for service role
3. **Apply migration `20260314120000`**: Deploy `expire_pending_orders` RPC to production

### P1 — Should Fix (reliability)
4. **Add fetch timeout**: `AbortController` with 15s timeout in `apiFetch` to prevent Vercel function timeout
5. **Handle postponed/cancelled fixtures**: Add `PST`, `CANC`, `WO` to a `SKIP_STATUSES` set; mark fixture as `void` in DB so it doesn't block GW finalization
6. **Add retry with backoff**: For API-Football 429/5xx responses (1 retry, 2s delay)

### P2 — Nice to Have (observability)
7. **Batch fan_rank_update**: Instead of 1 RPC per user, create a batch RPC that handles all users for a club
8. **Add structured logging**: Replace remaining `console.log` with structured JSON for Vercel log aggregation
9. **Add alert on persistent failures**: If `resolve_predictions` or `dpc_of_week` fail for 2+ consecutive GWs, send notification

---

## 9. console.log Audit (5 instances)

| Line | Tag | Level | Verdict |
|------|-----|-------|---------|
| 628 | `[SHIRT_BRIDGE]` | console.log | OK -- successful match trace, useful for debugging dual-ID issues |
| 917 | `[AUTO-RECONCILE] Error` | console.error | FIXED -- was console.log, changed to console.error |
| 919 | `[AUTO-RECONCILE] Persisted` | console.log | REMOVED -- noisy success log, info captured in logStep |
| 1202 | `[INTEGRITY] Match Distribution` | console.log | OK -- important aggregate metrics for observability |
| 1206 | `[INTEGRITY] null player_id` | console.log | OK -- useful for monitoring unmatched player rates |

---

## 10. Files Changed in This Audit

- `src/app/api/cron/gameweek-sync/route.ts` — Fixed logStep accuracy, return type mismatch, console.error for errors, added TODO comments for auth RPC bugs
- `.claude/rules/fantasy.md` — Fixed League ID documentation (203 -> 204)
