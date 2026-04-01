# Current Sprint — Performance + QA

## Stand (2026-04-01, Session 276)
- **Tests:** tsc 0 Errors, 195+ Unit Tests (2 pre-existing BuyModal/SellModal failures)
- **Branch:** main (ahead of origin by 2 commits)
- **Migrations:** 298 total (rpc_get_player_percentiles added)

## Erledigt (Sessions 275–276)
- **BES-23:** get_club_by_slug vereinfacht (done)
- **BES-24:** assign_user_missions debounce (done)
- **BES-25:** auto_close_expired_bounties → Vercel Cron 05:00 UTC (done, committed df2677b)
- **BES-26:** React.memo on 5 Player Detail components (in_review, committed ef914ae)
- **BES-27:** staleTime relaxed — usePlayerTrades 1→5min, useHoldingLocks 1→2min, profileMap 2s debounce (done, committed ef914ae)
- **BES-28:** rpc_get_player_percentiles — eliminates 632-row usePlayers() fetch, deployed to Supabase (done, committed ef914ae)

## Board Status
- QA issue fde8ed0e: Player Detail Performance BES-26/27/28 → QA pending
- BES-26: in_review (FrontendEngineer)
- All other issues: done

## Naechste Prioritaet
1. Echtes Feature (Roadmap — awaiting CEO/CTO direction)
2. Connection Pool Tuning (Infra — Vercel contention bei 40+ Queries)
3. 2 pre-existing test failures: BuyModal/SellModal lazy-load (cleanup)

## Bekannte Issues
- Vercel Connection Pool Contention bei 40+ parallelen Queries
- BuyModal/SellModal test stubs broken (pre-existing, lazy-load regression)

## Blocker
- Keine
