# Slice 286 Proof — Cold-Load-Race Fix (LeagueScopeHeader/LeagueBar)

**Datum:** 2026-06-13

## AC-5 — tsc + Tests grün (lokal)

```
$ pnpm exec tsc --noEmit
✅ exit 0

$ CI=true pnpm exec vitest run \
    src/features/shared/store/__tests__/LeagueScopeHeader.test.tsx \
    src/components/fantasy/__tests__/SpieltagTab.test.tsx \
    src/app/(app)/fantasy/__tests__/FantasyContent.test.tsx \
    src/features/shared/store/__tests__/leagueScopeStore.test.ts
✅ Test Files 4 passed (4) · Tests 45 passed (45)
```

## Build-Verify — cacheVersion-dep in allen 3 race-Konsumenten

```
LeagueScopeHeader.tsx:56   useMemo(() => getCountries(locale), [locale, cacheVersion])
FantasyContent.tsx:111     useMemo(() => getCountries(locale), [locale, cacheVersion])
LeagueBarShared.tsx:38     useMemo(() => ..getAllLeaguesCached().., [country, cacheVersion])
leagues.ts                 emitCacheChange() nach cacheReady=true (Z.100)
                           subscribeLeagueCache / getLeagueCacheVersion exportiert
useLeagueCacheVersion.ts   useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
```

## AC-1/2/3 — Cold-Load Live-Verify (bescout.net, post-Deploy)

> Der entscheidende Test: **Hard-Navigation** (`page.goto`, NICHT warme SPA-Nav).
> Vor dem Fix: childCount 0 / buttonCount 0. Erwartet nach Fix: buttonCount >= 6.

<!-- POST-DEPLOY-COLD-LOAD-MARKER -->

## Review

worklog/reviews/286-review.md — PASS (0 CRITICAL, 3 NIT/INFO). NIT: clubs/page.tsx:55
getLeaguesByCountry in useEffect ist safe (cache-warm bei Country-Select).
