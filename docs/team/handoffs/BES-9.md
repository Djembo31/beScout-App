# BES-9 Handoff — Add TradingDisclaimer to Airdrop page

## What changed

Added `TradingDisclaimer` component to the airdrop page to satisfy compliance requirement:
> "Disclaimers required on EVERY page showing $SCOUT/DPC values" (business.md)

## Files modified

| File | Change |
|------|--------|
| `src/app/(app)/airdrop/page.tsx` | Added import + `<TradingDisclaimer />` at bottom of page (after "How to improve" card, before closing wrapper div) |

## Diff summary

```tsx
// Added import (line 8):
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';

// Added render (after last Card, before </div>):
<TradingDisclaimer />
```

## Verification notes

- `tsc --noEmit` — clean, no errors
- Component renders with default `variant="inline"` (dark bg, white/30 text — WCAG readable on #0a0a0a)
- No layout impact: `TradingDisclaimer` is a self-contained block element, appended after last card
- Pattern matches existing usage in `src/components/player/detail/TradingTab.tsx`

## Ready for QA

QA to verify:
- [ ] Disclaimer visible at bottom of `/airdrop` on mobile (360px) and desktop (1280px)
- [ ] Text is readable (not clipped, not overflowing)
- [ ] No visual regressions to leaderboard or stats sections above
