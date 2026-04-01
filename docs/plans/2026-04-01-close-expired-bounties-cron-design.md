# Design: Move auto_close_expired_bounties to Vercel Cron

**Date:** 2026-04-01
**Tier:** Targeted (<80 LOC)
**Status:** Approved

## Problem

`auto_close_expired_bounties` RPC is called client-side on every Community page load (2 call sites in `bounties.ts`). Adds ~2.8s latency to every bounty query. Unnecessary — bounty deadlines are in days, not seconds.

## Solution

Vercel Cron job running 1x/day (like `gameweek-sync`). Remove client-side calls.

## Changes

### 1. New file: `src/app/api/cron/close-expired-bounties/route.ts`
- `GET` handler with `CRON_SECRET` auth (same pattern as `gameweek-sync`)
- Calls `supabaseAdmin.rpc('auto_close_expired_bounties')`
- Returns JSON with count of closed bounties
- No env vars needed beyond existing `CRON_SECRET` + `SUPABASE_SERVICE_ROLE_KEY`

### 2. Edit: `vercel.json`
- Add cron entry: `{ "path": "/api/cron/close-expired-bounties", "schedule": "0 5 * * *" }` (5 AM UTC, before gameweek-sync at 6 AM)

### 3. Edit: `src/lib/services/bounties.ts`
- Remove `await (async () => { await supabase.rpc('auto_close_expired_bounties'); })().catch(...)` from `getBountiesByClub()` (line 29)
- Remove same from `getAllActiveBounties()` (line 48)

### 4. Edit: `src/lib/services/__tests__/bounties.test.ts`
- Remove all `setRpcResponse('auto_close_expired_bounties', ...)` lines from tests
- Remove the test case "continues even if auto_close_expired_bounties RPC fails"

## Acceptance Criteria
- [ ] tsc --noEmit: 0 errors
- [ ] All bounty tests green (minus removed auto-close test)
- [ ] No client-side calls to `auto_close_expired_bounties` (grep confirms 0 hits in src/)
- [ ] Cron route returns 200 with `CRON_SECRET` header
- [ ] `vercel.json` has new cron entry
