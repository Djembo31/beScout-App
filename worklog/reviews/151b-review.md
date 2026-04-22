# Slice 151b Review — useClubActions Migration

**Verdict:** CONCERNS → PASS nach Fix #1 + #5 (Primary-Claude inline)
**Reviewer:** reviewer-Agent (Cold-Context, read-only)
**Time-spent:** ~25 min

## Scope

- `src/components/club/hooks/useClubActions.ts` — rewrite: `useState(followLoading)` + async `handleFollow` → `useSafeMutation` mit `safeTrigger` + snapshot-context
- `src/components/club/hooks/types.ts` — `handleFollow: () => Promise<void>` → `() => void`
- `src/components/club/hooks/__tests__/useClubActions.test.ts` — QueryClientProvider wrapper, 9 Tests inkl. rapid-click-3x

**Consumer-Check:** Nur `ClubContent.tsx` → `ClubHero.onFollow: () => void`. Kein `await handleFollow()` im Club-Pfad. `useProfileData.handleFollow` ist separat (nicht affected). **Type-Change NICHT breaking.**

## Findings

| # | Severity | Location | Issue | Status |
|---|----------|----------|-------|--------|
| 1 | **HIGH** | `useClubActions.ts:67-68` | **Slice 143 Regression.** `onSuccess` nutzte `invalidateQueries` statt `setQueryData`. pgBouncer-Drift (Slice 139) → UI-Flicker `true→false→true` bei Refetch-Roundtrip. | **FIXED inline** — setQueryData auf beide Keys analog ClubProvider.tsx:203-210 |
| 2 | MEDIUM | error-test | Snapshot-Rollback-Test nicht isoliert — prueft Endzustand (null, 0) der auch bei hardcoded-Reset passen wuerde | BACKLOG (Follow-Up-Test in 151b+) |
| 3 | MEDIUM | `useClubActions.ts:78-81` | `followMut` nicht stable-ref → `handleFollow` re-created each render. Functional OK (ClubHero nicht memoized). | BACKLOG — ClubHero ist nicht memoized, kein Perf-Issue |
| 4 | LOW | `onSuccess` | Short-window UI-stale bis Refetch | **AUTO-FIXED** durch #1 |
| 5 | NIT | `onMutate:56` | `async` ohne `await` — irrefuehrend | **FIXED inline** |

## Positive

- Sauberer Journal-Fit mit Slice 151a Review-Findings (errorTag fuer Money-Path gesetzt, auch wenn Slice 151b selbst nur Data-Integrity-Tier)
- `OptimisticContext` sauber typisiert — kein `unknown`, keine Casts
- Rapid-click-3x-Test ist echter Regression-Guard fuer Slice 149-Bug, inkl. `resolveFirst` Deferred-Promise-Pattern
- Keine Breaking Change am Consumer (`onFollow: () => void` matcht auch vorher)
- Sentry-Tag `club.follow` korrekt gesetzt (151a Finding #3 umgesetzt)

## Empfehlung fuer Slice 151c (MembershipSection, Money-Path)

1. **setQueryData Pattern uebernehmen** — bei Subscribe/Unsubscribe deterministisch in dependent Query-Keys schreiben. NIE invalidate auf Money-Path.
2. **Error-Test isoliert** — Mock-Wallet mit Zwischenzustand + Failure in Mitte → rollback-to-mid, nicht rollback-to-default.
3. **Idempotency-Check auf Service-Layer** — `subscribeTo(tier)` MUSS server-side dedupe haben.
4. **CEO-Approval** fuer `subscribeTo`-RPC-Return-Shape-Review VOR BUILD.

## Knowledge-Capture

- **Pattern D18 (common-errors.md, Slice 151d):** "Pilot-Migration zu useSafeMutation: optimistic-update MUSS `queryClient.setQueryData` auf alle dependent Keys nutzen, nicht `invalidateQueries`. Sonst pgBouncer-Drift reverted optimistic state fuer 0.5-2s. Referenz: Slice 143 ClubProvider.toggleFollow."
- **memory/patterns.md Pattern 25/26 Ergaenzung:** useSafeMutation + `setQueryData` ist der kombinierte Standard — invalidate nur wenn Refetch semantisch noetig (Row-Shape-Change, nicht Counter-Change).

## Summary

Technisch sauber gebaut — Race-Bug geloest, Rollback funktioniert, Type-Change NICHT breaking. **Aber:** `invalidateQueries` statt `setQueryData` im `onSuccess` war eine stille Regression gegenueber dem Slice-143-Pattern im `ClubProvider`. Fix #1 inline erfolgt (setQueryData + dedicated test). **PASS** nach #1 + #5. #2 + #3 sind Backlog-Polish, nicht Blocker fuer Beta-Launch.
