# Slice 151b-RESET Review

**Date:** 2026-04-23
**Time spent:** ~45 minutes (Reviewer-Agent, cold-context)
**Verdict:** PASS with 2 MEDIUM and 3 LOW findings

## Summary

Clean, disciplined refactor. The three anti-pattern classes from the audit (A/C/D) are addressed cleanly: local useState mirrors are gone from useClubActions, ClubProvider no longer duplicates Query-Cache data (only UI-state remains), and useCountUp is throttled via useDeferredValue. Tests cover the critical paths (rapid-click, error rollback, optimistic cache writes, sessionStorage hydration). The overall architecture matches the canonical React Query v5 `onMutate`/`onError`/`onSettled` pattern and follows the existing `useSafeMutation` abstraction faithfully.

## Positive

- **Single Source of Truth achieved**: useClubActions shrunk from 98 → 48 LOC with zero useState for server data. `isFollowingData` and `followerCountData` flow from Query-Cache → useClubData → useClubActions → rendered output. No parallel state layers.
- **Correct optimistic pattern**: `setQueryData` with functional updater + `prev === undefined ? prev : ...` guard prevents hydrating empty caches. `Math.max(0, prev + delta)` preserves the Slice 139 invariant.
- **Rollback handles partial-snapshot**: `ctx.prevX !== undefined` check prevents overwriting a cache that was never populated. Matches Slice 143's deterministic-optimistic pattern (common-errors.md Section 10).
- **Deferred-value decision is correct**: `useDeferredValue(followerCount)` throttles intermediate renders during a mutation. This is the lightest-touch fix for Klasse D.
- **Trade-off with invalidate on `followedByUser`**: The implementer's reasoning is sound — primary-promotion is non-deterministic server-side (see `toggleFollowClub` lines 235-239: `.limit(1)` without ORDER BY), so the list MUST be server-reconciled. The other two keys (isFollowing bool, followers count ±1) are deterministic, so no invalidate → no pgBouncer transient. This is exactly the discipline Slice 143 documented.
- **Test coverage**: 9/9 useClubActions tests include rapid-click regression + error rollback + optimistic seed + cache-propagation + guard paths. The test setup correctly pre-seeds cache with `setQueryData` so the functional updaters have defined `prev` values.
- **ClubProvider shrunk cleanly**: 255 → 128 LOC, activeClub hydration logic is transparent, sessionStorage/user-switch guarded via `followed.some((c) => c.id === stored.id)` cross-user check.

## Findings

| # | Severity | File:Line | Issue | Fix |
|---|----------|-----------|-------|-----|
| 1 | MEDIUM | `src/lib/hooks/useToggleFollowClub.ts:113-124` | `useCallback` with `[mutation]` re-creates `toggle`/`toggleAsync` every render (mutation object identity changes). Defeats memoization for `<Button onClick={toggle}>` consumers. | Replace with `[mutation.safeTrigger, mutation.isPending]` + `[mutation.mutateAsync]` + eslint-disable, mirror useSafeMutation primitive. **FIXED in this session.** |
| 2 | MEDIUM | `src/components/missions/MissionBanner.tsx:79` | `useEffect([user, te])` may re-fire `getUserMissions` when `te` identity changes. Pre-existing — not introduced by this slice. | Move `te` into ref, accept extra refetch, or scope to a follow-up slice. **Not blocking. Documented as known-issue.** |
| 3 | LOW | `src/lib/hooks/useFollowedClubs.ts:30` | Inline sentinel key `['clubs', 'followedByUser', 'no-user']` for the disabled-query branch. Never fetched, but possible key-mismatch if a consumer manually queries with `undefined`. | Documented — keep as-is (TS-only branch). |
| 4 | LOW | `src/components/club/hooks/useClubActions.ts:13` | Comment references `ClubProvider.followedClubs` which no longer exists post-RESET. Comment is "Vorher (Slice 151b)" historic context, accurate. | Optional rephrase. **Left as historical context with explicit "vor Slice 151b-RESET".** |
| 5 | LOW | `src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx:41-52` + `src/components/missions/__tests__/MissionBanner.test.tsx:10` | Both test files still mock `useClub()` with the old surface. Tests pass (components no longer read those keys), but mocks lie about API. | Trim to `{ activeClub, setActiveClub, loading }` only. **FIXED in this session.** |
| 6 | LOW (TEST-RELIABILITY) | `e2e/qa-151b-RESET-follow-sync.ts:146` | Double-escaped regex `/(\\d{1,6}...)/` in `evaluate()` callback may not match in browser context (depends on serialization). Could silently return 0 → false-PASS verdict. | Use single-escaped `\d` or string-expression form. **FIXED in this session.** |

## Answers to Specific Concerns (from briefing)

1. **pgBouncer on `onSettled.invalidateQueries(followedByUser)`** — Trade-off is sound. Slice 139 says *"nach `setX(optimistic)` + DB-Write NICHT blind `setX(server-read)`"*. Follow-path deliberately doesn't re-read for the two deterministic keys (`isFollowing`, `followers`) and only reads back the list (which needs server's primary-promotion truth). Window where stale read could overwrite is bounded to `followedByUser`; optimistic `[...prev, club]` / `filter` already wrote correct end-state, so even stale refetch heals on next focus.

2. **Comment in useClubActions.ts:13** — Accurate but stale-grep-able. LOW.

3. **`loading = !cachesReady || followedLoading || !hydrated`** — Each gates on a different lifecycle stage. Empirically ~100-200ms after mount, unchanged from before. No decoupling needed.

4. **QA script regex** — Double-escaped in TS source serializes incorrectly when passed as function ref to `evaluate()`. Fixed.

5. **`Promise.all([cancelQueries, ...])`** — Could be `Promise.allSettled` for defense-in-depth. NITPICK — `cancelQueries` doesn't reject in normal flow.

## Verified (AC from spec)

- [x] AC1: No Dual-State-Drift — grep returns 0 non-test hits
- [x] AC2: useClubActions has no useState for server data
- [x] AC3/AC4: Single-value renders during mutation (onMutate optimistic + useDeferredValue)
- [x] AC5: Error-Rollback covered by test
- [x] AC6/AC7: tsc clean + 9/9 useClubActions + 7/7 ClubProvider + 12/12 ClubContent + useHomeData all green
- [~] AC8: Playwright pending (post-deploy verification)

## Edge Cases — Verified

- [x] EC1 pgBouncer — addressed via setQueryData for deterministic keys
- [x] EC2 User-Switch — AuthProvider.clearUserState calls `queryClient.clear()`
- [x] EC3 SSR/Hydration — enabled: !!userId
- [x] EC4 Rapid Click — test "rapid-click-prevention"
- [x] EC5 Partial Rollback — `ctx.prevX !== undefined` checked individually
- [x] EC6 Follower-Count < 0 — `Math.max(0, prev + delta)`
- [x] EC7 activeClub Memory-Leak — `setActiveClubState(null)` when userId becomes null
- [x] EC8 Test-Mocks — ClubProvider + useClubActions tests rewritten
- [n/a] EC9 2-Tab Race — invalidate-on-focus default
- [x] EC10 i18n — `t('followError')` verified in DE + TR

## Learnings — Knowledge Capture

Candidates for promotion at Session-DISTILL:

- **patterns.md**: "Single-SoT Follow Pattern" — `useFollowedClubs` (Query) + `useToggleFollowClub` (useSafeMutation with onMutate/onError/onSettled on 3 keys; setQueryData for deterministic ±1, invalidate only for non-deterministic primary-promotion). Reference for Phase 2 (Money Paths).
- **common-errors.md §5**: "useDeferredValue on useCountUp targets" — wrap volatile data before passing to animation hooks. Klasse D anti-pattern.
- **memory/decisions.md D20-candidate**: Provider-vs-Query-Cache boundary rule — "Provider nur für UI-State (activeClub, modal-open, selected-tab), nie für Server-Daten. Server-Daten gehören in React Query Cache + setQueryData-Pattern."

## Verdict: PASS

Findings #1, #4 (QA regex), #5 fixed in same session. Findings #2 (MissionBanner pre-existing), #3 (sentinel key documentation), #4 comment (left as history) deferred. Proceed to commit.
