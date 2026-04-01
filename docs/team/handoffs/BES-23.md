# BES-23: Fix duplicate get_club_by_slug calls on Community page
**Agent:** FrontendEngineer
**Date:** 2026-04-01
**Status:** ready-for-qa

## Changes
- `src/components/community/hooks/useCommunityData.ts` — Consolidated 2 `getClubBySlug` call sites (lines 90-91) into 1. The ternary was branching on `cId` to call the same function with different slug arguments; replaced with a single call using an inline conditional for the slug.

## Test Checklist
- [x] tsc --noEmit: 0 errors
- [x] 42/42 useCommunityData tests green
- [x] Logic identical: cId present → use cName ?? '', absent → 'sakaryaspor'

## Risks
- None. Pure consolidation, no behaviour change.
