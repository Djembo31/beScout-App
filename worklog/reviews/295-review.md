# Slice 295 Review — `/clubs` Discovery Page Contract Test

**Reviewer:** reviewer-Agent (cold-context) · **time-spent:** 9 min
**Verdict:** ✅ PASS

## Spec-Coverage
- [x] AC-1 Loading → Skeleton (`.animate-pulse`), no grid/empty/error
- [x] AC-2 Error → `ErrorState` `role="alert"` + retry button
- [x] AC-3 Empty → `EmptyState` `noClubsAvailable`
- [x] AC-4 Follow → `toggleAsync({ club, follow: true })`
- [x] AC-5 Activate → `setActiveClub(club)`
- [x] AC-6 tsc clean
- [x] Edge: anon user no-op on follow
- [x] Edge: Activate button absent for non-followed club

## Verification (non-tautological — confirmed against real render path)
- i18n key-passthrough verified against real keys: `noClubsAvailable`, `follow`, `activate` (clubs ns), `retry` (common ns). Test asserts real `Button`/`EmptyState`/`ErrorState` output, not mock-asserting-mock.
- Accessible names: follow/activate/retry icons `aria-hidden` → bare key string is the a11y name → `getByRole('button', {name})` correct.
- `ErrorState` `role="alert"` + retry gated on `onRetry` (page passes it). `EmptyState` title findable. Skeleton emits `.animate-pulse` only in loading branch.
- All mock shapes match page destructuring (`useUser`/`useClub`/`useFollowedClubs`/`useToggleFollowClub`/`useMostOwnedPlayersPerClubBatch`).

## testing.md Compliance
- [x] No snapshot testing
- [x] Static imports + `vi.mock` at top — avoids SO-3 `vi.resetModules` anti-pattern
- [x] `vi.hoisted` mutable shared state (Pattern 5), reset in `beforeEach`
- [x] useSafeMutation §2: async `toggleAsync` via `waitFor`; sync `setActiveClub` direct
- [x] `console.error` real `vi.spyOn` + `mockRestore` (NOT Slice-282 already-mocked anti-pattern)

## Findings
| # | Severity | Issue | Resolution |
|---|----------|-------|------------|
| 1 | NIT | AC-1 `.animate-pulse` loose selector | ✅ FIXED — tightened to `querySelectorAll(...).length >= 6` |
| 2 | NIT | `as unknown as` fixture cast bypasses DbClub field-completeness | Accepted — fixture-factory norm, no action |

No CRITICAL/MAJOR. No Money/Wording/Security surface (test-only, IMPACT correctly skipped).

## Positive
- Correctly distinguishes async (`waitFor`) vs sync (`setActiveClub`) mutation assertion patterns.
- Anon-edge flushes with `await Promise.resolve()` + asserts `toggleAsync` not called → genuinely locks the `if (!user) return` guard.
- Minimal targeted mocks — `Card`/`Button`/`SearchInput`/`EmptyState`/`ErrorState` render real → exercises real grid/action DOM.

## Knowledge
Reusable reference for **page-contract test against namespace-agnostic i18n passthrough**: assert real components render with the i18n *key* as visible/accessible label, after verifying the page `t()` calls hit real keys. Pairs with `ClubContent.test.tsx` convention — blueprint for planned `/club` + `/fantasy` lifecycle contract tests.
