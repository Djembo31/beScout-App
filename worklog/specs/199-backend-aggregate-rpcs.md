# Slice 199 — Backend-Aggregat-RPC-Wave (3 SECURITY DEFINER RPCs)

## Ziel

Drei read-only Aggregat-RPCs liefern, die bisher in 198b als "skipped" geparkt
wurden, plus Service-Layer und Tests, damit Frontend-Slices anschliessend
Top-Predictors-Leaderboard, Most-Owned-Players-pro-Club und
Event-Difficulty-Score rendern koennen.

## Betroffene Files

- `supabase/migrations/20260425220000_slice_199_top_predictors.sql` (neu)
- `supabase/migrations/20260425220100_slice_199_most_owned_per_club.sql` (neu)
- `supabase/migrations/20260425220200_slice_199_event_difficulty.sql` (neu)
- `src/lib/services/leaderboards.ts` (neu)
- `src/lib/services/club.ts` (Append: getMostOwnedPlayersPerClub)
- `src/lib/services/events.ts` (Append: getEventDifficultyScore)
- `src/lib/queries/keys.ts` (qk.leaderboards, qk.clubs.mostOwned, qk.events.difficultyScore)
- `src/lib/services/__tests__/leaderboards.test.ts` (neu)
- `src/lib/services/__tests__/club-most-owned.test.ts` (neu)
- `src/lib/services/__tests__/events-difficulty.test.ts` (neu)

## Acceptance Criteria

1. `get_top_predictors_leaderboard(p_limit INT DEFAULT 10)` liefert plain JSONB
   array `[{user_id, handle, display_name, tier, predictions_total,
   predictions_correct, hit_rate_pct, rank}]` sortiert nach hit_rate DESC,
   predictions_total DESC. Mind. 5 resolved predictions pro user (HAVING).
2. `get_most_owned_players_per_club(p_club_id UUID, p_limit INT DEFAULT 5)`
   liefert plain JSONB array `[{player_id, first_name, last_name, shirt_number,
   position, image_url, holders_count, rank}]` mit `holdings.quantity > 0` UND
   `players.club_id = p_club_id`.
3. `get_event_difficulty_score(p_event_id UUID)` liefert JSONB-Objekt
   `{event_id, difficulty_score, difficulty_tier, avg_ipo_price_cents,
   participant_clubs_count}`. Bei NULL-club_id: `{success: false,
   error: 'event_not_clubbed'}`.
4. Alle 3 RPCs: SECURITY DEFINER, STABLE, AR-44 REVOKE/GRANT korrekt.
5. Service-Layer wrapper: `getTopPredictorsLeaderboard`, `getMostOwnedPlayersPerClub`,
   `getEventDifficultyScore` mit klaren Return-Types und error-throw.
6. Query-Keys in `qk.*` zentralisiert.
7. Tests: smoke-tests gegen echte DB (Pattern Slice 195e).

## Edge Cases

- 0 Predictions in DB → `[]`
- User mit 4 resolved predictions → nicht im Result (HAVING ≥5)
- Club ohne Holdings → `[]`
- Event mit NULL club_id → `{success: false, error: 'event_not_clubbed'}`
- Empty club (alle Spieler liquidated): avg_ipo_price 0 → easy-tier
- p_limit = 0 → coerce to 1; p_limit > 100 → cap at 100 (sane defaults)
- Ties in ranking: secondary sort by predictions_total DESC, then user_id ASC

## Proof-Plan

- `pg_get_functiondef('public.<rpc>(<args>)'::regprocedure)` Body-Probe → security definer + plpgsql
- `SELECT * FROM information_schema.routine_privileges WHERE routine_name = '<rpc>'` → nur authenticated + service_role
- `npx vitest run src/lib/services/__tests__/leaderboards.test.ts` smoke green
- `npx tsc --noEmit` clean

## Scope-Out

- KEIN Frontend-UI (folgt im naechsten Slice)
- KEIN Cron-Job
- KEIN Money-Path-Write
- KEINE Idempotency (read-only)
- KEINE eligible_clubs-Branch (events-Schema hat nur club_id, nicht eligible_clubs[])
