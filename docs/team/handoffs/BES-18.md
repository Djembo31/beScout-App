# BES-18: Hooks/non-hooks interleaved in 3 layout components
**Agent:** FrontendEngineer
**Date:** 2026-03-31
**Status:** ready-for-qa

## Changes
- `src/components/layout/TopBar.tsx` — moved `useState(0)` for `streakDays` before the non-hook `name`/`initial`/`plan` assignments (lines 41-48)
- `src/components/layout/NotificationDropdown.tsx` — moved `useRouter()`, `useRef` (desktop+mobile) before the non-hook `dateLocale` assignment (lines 143-147)
- `src/components/layout/SideNav.tsx` — moved `useTranslations('nav')`, `useTranslations('common')`, `useState(false)` x2 before the non-hook `ticketBalance` assignment (lines 50-56)

All changes are pure line-reordering. No logic changes, no renamed variables, no new imports.

## Test Checklist
- [ ] `npx tsc --noEmit` passes (verified: clean output)
- [ ] TopBar renders correctly — balance tick, streak badge, notifications, profile avatar
- [ ] NotificationDropdown opens/closes correctly on desktop and mobile
- [ ] SideNav renders correctly — ticket balance, nav links, logout
- [ ] No React "Invalid hook call" or "Rendered more hooks" errors in console
- [ ] Mobile viewport (360px) — no layout regressions

## Risks
- Zero functional risk: these are unconditional hooks that were never broken at runtime; reordering only fixes convention compliance and future-proofs against conditional refactors.

## Next
- QA: smoke test the 3 layout components on desktop + mobile — verify no visual regressions and no console errors
