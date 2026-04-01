# BES-31: Server-side player percentiles RPC (replace client-side usePlayers)
**Agent:** SeniorEngineer
**Date:** 2026-04-01
**Status:** ready-for-qa

## Changes
- `supabase/migrations/20260401124653_rpc_get_player_percentiles.sql` — New RPC: computes global + position-filtered percent_rank() for all key stats. REVOKED from public/authenticated/anon, GRANT to authenticated only.
- `src/lib/services/players.ts` — Added `getPlayerPercentiles(playerId)` service function
- `src/lib/queries/players.ts` — Added `usePlayerPercentiles(playerId, enabled)` hook; staleTime: FIVE_MIN; query key: `[...qk.players.byId(id), 'percentiles']`
- `src/components/player/detail/hooks/usePlayerDetailData.ts` — Removed `usePlayers` import/call; added `usePlayerPercentiles(playerId, tab === 'performance')`; replaced `allPlayersForPercentile: Player[]` with `percentiles: Record<string, number> | undefined` in interface + return
- `src/components/player/detail/PerformanceTab.tsx` — Replaced `allPlayers?: Player[]` prop with `percentiles?: Record<string, number>`; derives `posPercentile` object for MatchTimeline
- `src/components/player/detail/MatchTimeline.tsx` — Replaced `allPlayers` + `usePositionPercentile` hook call with `posPercentile` prop (passed pre-computed value)
- `src/components/player/detail/StatsBreakdown.tsx` — Rewrote to use `percentiles: Record<string, number>` instead of computing from `allPlayers[]`; uses `pos_*_pct` keys from RPC (×100 for display)
- `src/app/(app)/player/[id]/PlayerContent.tsx` — Pass `percentiles={data.percentiles}` instead of `allPlayers={data.allPlayersForPercentile}`
- `src/app/(app)/player/[id]/__tests__/PlayerContent.test.tsx` — Updated mock + fixture: `usePlayers` → `usePlayerPercentiles`, `allPlayersForPercentile` → `percentiles`
- `src/components/player/detail/hooks/__tests__/usePlayerDetailData.test.ts` — Updated mock: `usePlayers` → `usePlayerPercentiles`

## Test Checklist
- [x] tsc --noEmit: 0 errors
- [x] grep usePlayers src/components/player/detail/ = 0 hits
- [x] RPC smoke test: returns all 14 keys (pos_l5_pct, pos_l5_rank, pos_l5_total, floor_price_pct, l5_score_pct, l15_score_pct, holder_count_pct, total_trades_pct, pos_matches_pct, pos_goals_pct, pos_assists_pct, pos_minutes_pct, pos_saves_pct, pos_clean_sheets_pct)
- [x] 2 pre-existing test failures unrelated to this change (BuyModal/SellModal lazy-load)

## Impact
- Player Detail Performance tab: eliminates `usePlayers()` fetch of 632 players
- Single RPC call instead: returns JSONB with all percentile ranks server-side

## Risks
- `pos_l5_total` uses integer cast — verify type coercion in TS (`Number()` already applied in PerformanceTab)
- RPC runs full table scan on `players` + `holdings` + `trades` — acceptable for 632 players, should index if player count grows past 10K
