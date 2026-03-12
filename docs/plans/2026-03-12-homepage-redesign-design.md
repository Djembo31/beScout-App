# Homepage Redesign — Design Document

## Status: Approved
## Date: 2026-03-12

## Problem

The current Homepage has 12 sections, creating scroll fatigue and burying the portfolio (position 5). Font sizes drop to 9-10px (below WCAG AA on dark backgrounds). Multiple competing visual systems (6+ color treatments), font-black overuse, and two sponsor banners make it feel cluttered rather than professional. The LiveTicker adds noise without clear user value. The Mystery Box button floats alone. There is no cohesive "hero moment" above the fold.

## Goal

Reduce to 6 focused sections with clear visual hierarchy. Portfolio elevated to position 2. Minimum font size 11px. One unified card system. Professional, PokerStars/Sorare-inspired aesthetic.

## Approach: "Magazine Layout" (Approach A)

### Section 1: Hero Header

Merges `HomeStoryHeader` + `HomeSpotlight` into one cohesive above-the-fold block.

**Structure:**
- Greeting line (`text-sm`, not `text-xs`) + TierBadge + Streak badge
- 3-stat strip (Portfolio Value, PnL%, Player Count) — labels min `11px`, values min `14px`
- Spotlight card embedded below stats — context-aware priority: IPO > Event > TopMover > Trending > CTA
- Story message moves into Spotlight card as subtitle (not separate text under greeting)

**Components affected:**
- `HomeStoryHeader.tsx` — font size fixes, remove story message text
- `HomeSpotlight.tsx` — receives `storyMessage` prop, renders it as subtitle
- `page.tsx` — merge Spotlight into header visual block (single `<div>` wrapper)

**Font fixes:**
- `text-[9px]` stat labels → `text-[11px]`
- `text-xs text-white/40` greeting → `text-sm text-white/40`

### Section 2: Portfolio Strip

Elevated from position 5 to position 2. Structurally unchanged — it already works well.

**Changes:**
- `text-[9px]` DPC count → `text-[11px]`
- `text-[10px]` change percentage → `text-[11px]`
- Empty state acts as primary onboarding CTA (replaces OnboardingChecklist)

**Components affected:**
- `PortfolioStrip.tsx` — font size fixes only

### Section 3: Engagement Zone

Merges DailyChallengeCard + Mystery Box into one block.

**Changes:**
- Remove standalone Mystery Box button wrapper (`<div className="flex justify-end">`)
- Add footer row to DailyChallengeCard: ticket balance (left) + Mystery Box button (right)
- Footer row always visible when user is logged in
- After answering: shows result + tickets earned + Mystery Box button

**Components affected:**
- `DailyChallengeCard.tsx` — add `ticketBalance` prop, add footer row with Mystery Box trigger
- `page.tsx` — remove standalone Mystery Box button, pass `ticketBalance` + `onOpenMysteryBox` to DailyChallengeCard

### Section 4: Dynamic Feed

Replaces separate Event card (old section 7), IPO banner (old section 7), and Trending Players (old section 8).

**Logic:**
1. If active Event AND NOT already in Spotlight → show Event card
2. If active IPO AND NOT already in Spotlight → show IPO card
3. If trending players exist → show horizontal scroll (max 5)
- Max 2 of these 3 (Spotlight already shows highest priority)

**Changes:**
- Same card designs, consolidated into one section
- Remove `floodlight-divider`
- Font fixes: all `text-[10px]` labels → `text-[11px]`

**Components affected:**
- `page.tsx` — restructure JSX ordering

### Section 5: My Clubs

Unchanged structurally. Only font fix.

**Changes:**
- `text-[10px]` league label → `text-[11px]`
- Conditional render when `followedClubs.length > 0` (same as now)

### Section 6: Sponsor (Footer)

Single sponsor placement at the bottom.

**Changes:**
- Remove `<SponsorBanner placement="home_hero" />` (was between Portfolio and Clubs)
- Keep `<SponsorBanner placement="home_mid" />` at bottom
- Rename placement to `home_footer`

## Removed Elements

| Element | Reason | Mitigation |
|---------|--------|------------|
| LiveTicker | Visual noise, minimal user value | Trade counts visible in trending player cards |
| SponsorBanner (home_hero) | 2 sponsors too aggressive for beta | Single footer placement |
| OnboardingChecklist | Redundant with empty PortfolioStrip CTA | Empty state IS the onboarding |
| MissionBanner | Not homepage priority | Move to Profile tab, add badge indicator in nav |
| Standalone Mystery Box button | Feels tacked on | Merged into DailyChallengeCard footer |

## Global Font Fixes

| Current | Fix |
|---------|-----|
| `text-[9px]` everywhere | Min `text-[11px]` |
| `text-[10px]` labels | Min `text-[11px]` |
| `font-black` on all labels | Reserve for greeting name + stat values. Labels get `font-semibold` |

## Final Section Order

1. **Hero Header** — Greeting + Stats + Spotlight (merged)
2. **Portfolio Strip** — Top holdings (elevated from pos 5)
3. **Engagement Zone** — Daily Challenge + Tickets + Mystery Box (merged)
4. **Dynamic Feed** — Event/IPO + Trending (context-aware, max 2)
5. **My Clubs** — Compact row (conditional)
6. **Sponsor** — Single footer placement

6 sections vs current 12. Half the scroll depth.

## Files to Modify

- `src/app/(app)/page.tsx` — Main restructure
- `src/components/home/HomeStoryHeader.tsx` — Font fixes, remove story message
- `src/components/home/HomeSpotlight.tsx` — Add story message as subtitle
- `src/components/home/PortfolioStrip.tsx` — Font fixes
- `src/components/home/LiveTicker.tsx` — DELETE (no longer used)
- `src/components/gamification/DailyChallengeCard.tsx` — Add footer row (tickets + mystery box)
- `src/components/home/helpers.tsx` — No changes needed

## Not in Scope

- New components or new patterns
- Backend/DB changes
- New React Query hooks
- Responsive breakpoint changes (mobile-first stays)
- Color system unification (separate initiative)
- MissionBanner relocation to Profile (separate task)
