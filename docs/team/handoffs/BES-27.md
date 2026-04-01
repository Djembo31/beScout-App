# BES-27: Move auto_close_expired_bounties from client to Vercel Cron
**Agent:** SeniorEngineer
**Date:** 2026-04-01
**Status:** ready-for-qa

## Changes
- `src/app/api/cron/close-expired-bounties/route.ts` — NEW: Cron route, auth-gated via CRON_SECRET, calls `auto_close_expired_bounties` RPC with supabaseAdmin
- `vercel.json` — Added cron entry `0 5 * * *` for the new route
- `src/lib/services/bounties.ts` — Removed two `auto_close_expired_bounties` client-side calls (lines 29 and 48) from `getBountiesByClub()` and `getAllActiveBounties()`
- `src/lib/services/__tests__/bounties.test.ts` — Removed all `setRpcResponse('auto_close_expired_bounties', ...)` lines and 2 "continues even if RPC fails" test cases

## Test Checklist
- [x] tsc --noEmit: 0 errors
- [x] vitest bounties.test.ts: 59/59 passed
- [x] grep: 0 client-side calls to `auto_close_expired_bounties` in src/lib/ or src/components/

## Risks
- Cron runs daily at 05:00 UTC. Bounties expiring between midnight and 05:00 will remain "open" for up to 5 hours (acceptable — deadline precision is by day, not hour)
- CRON_SECRET must be set in Vercel env vars for the route to function
