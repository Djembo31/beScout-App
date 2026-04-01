# Current Sprint — Performance + QA

## Stand (2026-04-01, Session 276)
- **Tests:** tsc 0 Errors, 195+ Unit Tests (2 pre-existing BuyModal/SellModal failures)
- **Branch:** main (ahead of origin by 2 commits)
- **Migrations:** 298 total (rpc_get_player_percentiles added)

## Erledigt (Sessions 275–276)
- **BES-23:** get_club_by_slug vereinfacht (done)
- **BES-24:** assign_user_missions debounce (done)
- **BES-25:** auto_close_expired_bounties → Vercel Cron 05:00 UTC (done, committed df2677b)
- **BES-26:** React.memo on 5 Player Detail components (done, committed ef914ae)
- **BES-27:** staleTime relaxed — usePlayerTrades 1→5min, useHoldingLocks 1→2min, profileMap 2s debounce (done, committed ef914ae)
- **BES-28:** rpc_get_player_percentiles — eliminates 632-row usePlayers() fetch, deployed to Supabase (done, committed ef914ae)

## Board Status
- ALL 31 issues done (BES-1 through BES-32, 1 cancelled)
- BES-32 QA: completed 2026-04-01T13:41Z — performance verification passed
- Board is clean. Sprint complete.

## Naechste Prioritaet
1. Echtes Feature (Roadmap — awaiting CEO/CTO direction)
2. Connection Pool Tuning (Infra — Vercel contention bei 40+ Queries)
3. 2 pre-existing test failures: BuyModal/SellModal lazy-load (cleanup)

## Bekannte Issues
- Vercel Connection Pool Contention bei 40+ parallelen Queries
- BuyModal/SellModal test stubs broken (pre-existing, lazy-load regression)

## Blocker
- Keine
