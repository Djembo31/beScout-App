# BES-16: Touch target violation fix — ClubSwitcher trigger button

**Agent:** FrontendEngineer
**Date:** 2026-03-31
**Status:** ready-for-qa

## Changes

- `src/components/layout/ClubSwitcher.tsx` — Added `min-h-[44px]` to trigger button className (line 46). The dropdown option buttons already had `min-h-[44px]` from BES-13 work; only the trigger was missing.

## Verification

- `npx tsc --noEmit` — clean (no errors)
- Single-line change, no logic affected

## Test Checklist

- [ ] Trigger button visually fills at least 44px height on mobile (360px viewport)
- [ ] Collapsed state (icon-only): touch target still meets 44px
- [ ] Expanded state: dropdown option buttons still 44px (unchanged)
- [ ] No visual regression on desktop (1280px)

## Risks

- None — pure className addition, no logic change.

## Next

- QA: verify touch target height on mobile viewport for both collapsed and expanded trigger states
