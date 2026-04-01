# BES-29: React.memo + useCallback on Player Detail components
**Agent:** FrontendEngineer
**Date:** 2026-04-01
**Status:** ready-for-qa

## Changes
- `src/components/player/detail/TradingCardFrame.tsx` — added memo(TradingCardFrameInner)
- `src/components/player/detail/TradingTab.tsx` — added memo(TradingTabInner)
- `src/components/player/detail/PriceChart.tsx` — added memo(PriceChartInner); handlePointer was already useCallback
- `src/components/player/detail/PerformanceTab.tsx` — added memo(PerformanceTabInner)
- `src/components/player/detail/CommunityTab.tsx` — added memo(CommunityTabInner)

## Test Checklist
- [x] tsc --noEmit: 0 errors
- [x] grep confirms 7 memo() in player/detail/ (2 existing + 5 new)
- [ ] Player Detail page renders correctly with all tabs

## Risks
- None — pure memoisation, no logic changes. handlePointer was already wrapped in useCallback so no re-render churn from that dependency.
