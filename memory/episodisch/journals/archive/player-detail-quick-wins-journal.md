# Player Detail Quick-Wins Journal

## Status: COMPLETE

## Quick-Wins
1. [x] QW1: Club Logo in MatchTimeline (opponent logo next to short name)
   - Extended `MatchTimelineEntry` type with `opponentLogoUrl: string | null`
   - Extended Supabase query to select `logo_url` from clubs joins
   - Added `<img>` for opponent logo in timeline row (null-safe, graceful fallback)
   - Widened opponent column from w-12 to w-[72px] to fit logo

2. [x] QW2: Form Dots (W/D/L visual indicators based on matchScore)
   - Parse matchScore "X-Y" format (first = player team, second = opponent)
   - W=green, D=amber, L=red, invalid=gray dots in hero strip area
   - Added between hero strip and data freshness info
   - i18n keys: formLabel, formWin, formDraw, formLoss (DE + TR)

3. [x] QW3: Starter/Sub indicator in MatchTimeline
   - Show XI (green) or SUB (amber) badge next to minutes
   - Uses existing `isStarter` field from MatchTimelineEntry
   - i18n keys: starterLabel="XI", subLabel="SUB" (same in both languages)

4. [x] QW4: Section reorder in PerformanceTab
   - New order: Timeline > Stats > Upcoming Fixtures (moved up) > StatsBreakdown > PlayerInfo > Contract > DPC > PBT > FantasyCTA (moved to bottom)
   - Rationale: performance/actionable data first, investment data second

5. [x] QW5: Collapsible sections in PerformanceTab
   - Created inline CollapsibleHeader component with ChevronDown toggle
   - DPC Supply Ring: collapsed by default, shows circulation/supply summary
   - PBT Widget: collapsed by default, shows balance summary
   - Contract: collapsed by default EXCEPT when urgent or <12 months
   - Proper aria-expanded for accessibility

## Files Modified
- `src/lib/services/scoring.ts` — Extended MatchTimelineEntry type + query
- `src/components/player/detail/MatchTimeline.tsx` — Logo, Form Dots, Starter/Sub
- `src/components/player/detail/PerformanceTab.tsx` — Reorder + Collapsible sections
- `messages/de.json` — New i18n keys (playerDetail namespace)
- `messages/tr.json` — New i18n keys (playerDetail namespace)

## Decisions
- Used "XI" and "SUB" as universal labels (same in DE/TR since they are football jargon)
- Form dots placed above data freshness info (chronologically latest = leftmost)
- CollapsibleHeader is inline component (not shared) — follows existing pattern in codebase
- Contract section auto-expands when urgent (<=12 months) for visibility

## Errors Encountered
- None

## Learnings
- matchScore format: first number = player's team, second = opponent (regardless of home/away)
- Club logos use `<img>` not `next/image` throughout project — convention for small dynamic images
- Clubs table has `logo_url` column, accessible via FK joins from fixtures
- Build error (Supabase env vars) is pre-existing worktree limitation, not caused by changes
