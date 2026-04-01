# BES-26: React.memo + useCallback on Player Detail components
**Agent:** FrontendEngineer
**Date:** 2026-04-01
**Status:** ready-for-qa

## Changes
- `src/components/player/detail/TradingCardFrame.tsx` — renamed to TradingCardFrameInner, export default memo(TradingCardFrameInner)
- `src/components/player/detail/TradingTab.tsx` — renamed to TradingTabInner, export default memo(TradingTabInner)
- `src/components/player/detail/PriceChart.tsx` — renamed to PriceChartInner, export default memo(PriceChartInner); pointer handler wrapped with useCallback
- `src/components/player/detail/PerformanceTab.tsx` — renamed to PerformanceTabInner, export default memo(PerformanceTabInner)
- `src/components/player/detail/CommunityTab.tsx` — renamed to CommunityTabInner, export default memo(CommunityTabInner)

## Test Checklist
- [x] tsc --noEmit: 0 errors
- [x] grep confirms 7 memo() usages in player/detail/ (2 pre-existing + 5 new)
- [x] useCallback on PriceChart pointer handler confirmed

## Risks
- None. memo() is a pure render optimization — no behaviour change. Components retain same props interface.
