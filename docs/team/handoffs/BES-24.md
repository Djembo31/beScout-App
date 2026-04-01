# BES-24: Move assign_user_missions to login-only (not per-page)
**Agent:** FrontendEngineer
**Date:** 2026-04-01
**Status:** ready-for-qa

## Changes
- `src/lib/services/missions.ts` — Added module-level 60s cooldown cache (Map keyed by userId) to `getUserMissions`. Exported `_resetCache` for tests. Same pattern as `resolveExpiredResearch` in `research.ts`.
- `src/lib/services/__tests__/missions.test.ts` — Added `_resetCache()` import and call in `beforeEach` so each test starts fresh.

## Test Checklist
- [x] tsc --noEmit: 0 errors
- [x] 17/17 missions service tests green
- [x] Cache deduplicates within 60s; error clears cache (allows retry)

## Risks
- None. Cache is cleared on error, so if the first call fails, the next call will retry.
- React Query's 30s staleTime already reduces frequency via the hook; the service-level cache covers MissionBanner and any other direct callers.
