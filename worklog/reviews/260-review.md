# Slice 260 Review — Auth-Hydrate Hardening

**Reviewer:** reviewer-agent (cold-context)
**Datum:** 2026-04-30
**Time-spent:** 18 min
**Verdict:** **PASS** (CONCERNS-mergeable, 2× P3 optional)

## Spec-Coverage

- [x] AC-01 sessionStorage refs in AuthProvider = 0
- [x] AC-02 sessionStorage refs in ClubProvider = 0
- [x] AC-03 User-Switch-Detect-Block at AuthProvider.tsx:320-330
- [x] AC-04 Provider tests 25/25 PASS (ClubProvider migrated, AuthGuard/Providers don't touch storage)
- [x] AC-05 tsc clean
- [x] AC-06 2 actual `requestIdleCallback` call-sites (welcome-bonus + activity-log)
- [x] AC-07 try/catch + typeof window guards intact
- [ ] AC-08 LIVE-VERIFY post-deploy (manual cross-tab-test)

## Findings

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | P3 (Polish) | `AuthProvider.tsx:336-340` | TOKEN_REFRESHED `queryClient.invalidateQueries()` fires nach User-Switch-Detect+`queryClient.clear()`. Redundant aber harmlos | `else`-branch: nur invalidate wenn `!cachedUserId \|\| cachedUserId === u.id` |
| 2 | P3 (Symmetry) | `AuthProvider.tsx:298-302` vs:320-330 | `clearUserState` setTimeout-deferred queryClient.clear; User-Switch-Detect path synchron. Asymmetrie | accept-as-designed (loadProfile-await sequences renders, kein flicker observed) |

## Pflicht-Audit

**1. User-Switch-Detect Event-Coverage:** Korrekt. Block fires auf ALLEN events mit valid u (SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION, USER_UPDATED), aber nur wenn `cachedUserId && cachedUserId !== u.id`. First-login: `cachedUserId === undefined` → short-circuit. TOKEN_REFRESHED-same-user: `cachedUserId === u.id` → no-op.

**2. SSR-Safety:** Alle localStorage in try/catch. localStorage-Reads NUR in useEffect (Rule documented line 145-147). `'requestIdleCallback' in window` gated by typeof-check.

**3. Test-Gap-Audit:** AuthGuard.test + Providers.test = 0 storage-refs (mocken useUser direkt). ClubProvider.test migriert (lines 85, 119, 131, 154). StalePipelineBanner sessionStorage = intentional Per-Tab.

**4. requestIdleCallback Cleanup-Race:** React-Effect-Cleanup-Contract: previous cleanup runs FIRST → no race. logTimer.current ref shared zwischen idle/setTimeout-paths aber idle-path lässt logTimer.current=null → safe.

**5. Welcome-Bonus Idempotency:**
- Tab-close pre-idle: bonusClaimed.current dies → next visit pickup → idempotent at PK ✓
- User A logout → User B login same tab: bonusClaimed.current=true persists, B's bonus deferred 1 visit, idempotent at PK ✓
- User-Switch-Detect path: same as above

**6. queryClient.clear Side-Effects:** Only fires on rare User-Switch (post-tab-crash). loadProfile-await sequences renders → kein flicker observed. Acceptable Beta-Day-2.

## Knowledge-Pattern Cross-Check

- D40-D43 (Auth-State + Data-Cache Consistency): erweitert um cross-tab-Dimension via localStorage. User-Switch-Detect ist neue Mitigation
- Pattern #40 (Slice 259 SW-Cache): orthogonal — TanStack Query bleibt JWT-aware-Layer
- errors-db.md "PostgREST nested-select Auth-Race": holdings.ts comment-drift gefixt
- Slice 234 D54 Slice-Type-Header: ✓ "UI (Provider Hooks)"
- Slice 233 D53 Layer-3-DoD: ✓ Components in Render-Tree, tsc clean, Visual = AC-08 LIVE-VERIFY

## Positive

- Defense-in-Depth: User-Switch-Detect + ClubProvider storedStillValid parallel
- Sentry-Breadcrumb mit truncated UUIDs: GDPR-safe + debuggable
- Symmetrisches Naming `lsGet/lsSet/lsClear` (Auth) + `lsGetClub/lsSetClub` (Club)
- Comment-Drift in holdings.ts proaktiv gefixt
- AC-06 Audit-Anomaly transparent statt fudging
- bonusClaimed.current set BEFORE scheduling (defensive)
- Cleanup functions returned für beide idle/timeout paths

## Knowledge-Capture-Vorschläge

**Pattern (memory/patterns.md):**
> **Cross-Tab Cache Sync via localStorage with User-Switch-Detect Mitigation** (Slice 260)
> sessionStorage→localStorage Migration für besseren first-paint UX (warm cache cross-tab). Cross-User-Pollution-Risk → Mitigation in `onAuthStateChange`: vor `setUser(u)` compare `lsGet<User>(LS_USER)?.id !== u.id` → `lsClear() + queryClient.clear()` mit Sentry-Breadcrumb.

**Pattern (memory/patterns.md):**
> **`requestIdleCallback` für Non-Critical Mount-Effects** (Slice 260)
> Pattern: `if (typeof window !== 'undefined' && 'requestIdleCallback' in window) requestIdleCallback(trigger, { timeout: 5000 }); else setTimeout(trigger, 1000);`. Cleanup return `() => window.cancelIdleCallback?.(idleId)` oder `clearTimeout(timeoutId)`.

## Summary

Slice 260 ist sauber umgesetzt, beide Smoking-Guns (#5 + #7) aus Slice 259 Deep-Dive werden architektonisch korrekt geheilt. Cross-Tab-Warm-Cache via localStorage mit User-Switch-Detect-Mitigation für neue Pollution-Surface, plus idle-callback-Deferral für non-critical mount-Effekte. Zwei P3-Findings sind cosmetic — kein Mergeblocker.

**verdict:** PASS
**findings:** 2 P3 (optional)
**time-spent:** 18 min
