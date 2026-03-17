# FixtureDetailModal Premium Overhaul

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform FixtureDetailModal from AI-slop to Sorare/FotMob-level premium. Users invest real money here — the design must radiate trust, quality, and professionalism.

**Architecture:** Iterative overhaul of FixtureDetailModal.tsx + helpers.ts + player/index.tsx (GoalBadge/AssistBadge). Each task has a visual checkpoint — screenshot after implementation, compare against reference apps. Auto-iterate until premium.

**Tech Stack:** React, Tailwind CSS, Lucide icons, inline SVG for match icons, CSS custom properties for theming.

**Reference Apps:** FotMob (colors + ratings), SofaScore (timeline + layout), Sorare (card premium feel), LiveScore (dark theme)

---

## Design Principles (Anti-Slop Rules)

1. **Icons over text** — Never show "G", "A", "CS" as raw text. Always use recognizable SVG icons.
2. **White text, colored accents** — Club identity through logo + accent bar, NEVER colored text for readability.
3. **4-tier rating system** — Blue (8+) / Green (7-8) / Orange (6-7) / Red (<6) like FotMob. Not a continuous heat-map.
4. **Max 3 opacity levels** — white/90 (primary), white/50 (secondary), white/25 (tertiary). No more white/15, white/20, white/30, white/35, white/40 soup.
5. **Information hierarchy** — Score > Scorers > MVP > Ratings > Details. Each level visually distinct.
6. **Professional icons** — SVG football for goals, SVG boot for assists, proper card rectangles (rounded corners, slight tilt for realism).
7. **Depth through shadows** — Not flat color backgrounds. Subtle elevation, glassmorphism on key cards.

---

## Task 1: SVG Match Icons (Goal, Assist, Card, Sub arrows)

**Files:**
- Create: `src/components/fantasy/spieltag/MatchIcons.tsx`
- Modify: `src/components/player/index.tsx:217-252` (GoalBadge upgrade)

**What:** Create a set of premium SVG match icons that replace all emoji/text badges across the modal. These are the building blocks everything else depends on.

**Icons to create:**
- `GoalIcon` — Football/soccer ball SVG (12px default). Monochrome white, subtle shadow. For inline use in rows.
- `AssistIcon` — Boot/shoe SVG (12px). Sky-400 color.
- `YellowCardIcon` — Rounded rectangle, slight 8deg tilt, yellow-400. NOT a flat div.
- `RedCardIcon` — Same shape, red-500.
- `SubInIcon` — Upward arrow in green circle (emerald-400).
- `SubOutIcon` — Downward arrow in red circle (red-400).
- `CleanSheetIcon` — Shield with checkmark (emerald-400).
- `OwnGoalIcon` — Football with X overlay (red-400).
- `PenaltyIcon` — Football with P overlay.
- `MvpCrownIcon` — Refined crown, gold gradient fill.

**Step 1:** Create `MatchIcons.tsx` with all SVG icons as lightweight React components. Each icon takes `size` and optional `className`. Hand-crafted SVG paths, NOT lucide.

**Step 2:** Update `GoalBadge` in `player/index.tsx` to use the new `GoalIcon` SVG instead of `/goal_icon.png` image. The PNG file is blurry at small sizes.

**Step 3:** Screenshot ranking rows + formation nodes to verify icons render crisply at 12px, 16px, 20px.

**Commit:** `feat(icons): add premium SVG match icons replacing emoji/text badges`

---

## Task 2: Rating System — FotMob 4-Tier

**Files:**
- Modify: `src/components/fantasy/spieltag/helpers.ts:72-82` (ratingHeatStyle)
- Modify: `src/components/fantasy/spieltag/helpers.ts:15-21` (scoreBadgeColor)

**What:** Replace the continuous heat-map gradient with FotMob's proven 4-tier color system. The current system produces muddy middle colors that look unprofessional.

**New `ratingHeatStyle`:**
```
9.0+ → #1A6DFF bg, white text (Exceptional — deep blue, gold glow)
8.0-8.9 → #14A0FF bg, white text (Excellent — blue)
7.0-7.9 → #33C771 bg, white text (Good — green)
6.0-6.9 → #F09622 bg, white text (Average — orange)
<6.0 → #DD3636 bg, white text (Poor — red)
```

**Key change:** Solid opaque backgrounds instead of rgba(r,g,b,0.20). The current 20% opacity makes badges look washed out. FotMob uses ~85% opacity backgrounds with white text. This creates confident, readable badges.

**Step 1:** Update `ratingHeatStyle()` to return the 5-tier system with opaque bg + white text.

**Step 2:** Update `scoreBadgeColor()` to match (this is used in other components too).

**Step 3:** Screenshot to verify badges are crisp, scannable, color-coded at a glance.

**Commit:** `feat(ratings): FotMob 4-tier rating system replacing muddy heat-map`

---

## Task 3: Ranking Row — Premium Redesign

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — `RankingRow` component (~Z.326-409)

**What:** Redesign player rows from text-driven to icon-driven. Current problems: ⚽ emoji, 🅰 emoji, colored club text, too many items crammed inline.

**New RankingRow layout:**
```
[Photo 36px] [Pos pill] [Name — bold, white/90] ... [Event Icons] [Rating pill] [Floor $] [>]
```

**Event Icons section (replaces emoji):**
- Goals: `<GoalIcon />` × count (if >1, show small superscript number)
- Assists: `<AssistIcon />` × count
- Yellow: `<YellowCardIcon />`
- Red: `<RedCardIcon />`
- Clean sheet: `<CleanSheetIcon />` (only for GK/DEF)

**Typography cleanup:**
- Name: `text-[13px] font-semibold text-white/90` (not white/100 which is harsh)
- Minutes: `text-[11px] font-mono text-white/25`
- Floor price: `text-[11px] font-mono text-white/40`

**MVP row treatment:**
- Subtle gold gradient border-left (2px), not full gold background
- Crown icon before photo (existing), but smaller (12px) and gold-gradient fill

**Step 1:** Implement new RankingRow with SVG icons from Task 1.

**Step 2:** Screenshot desktop + mobile to verify row height, spacing, icon rendering.

**Commit:** `feat(ranking): premium player rows with SVG icons and clean hierarchy`

---

## Task 4: RankingList — White Club Headers with Logo

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — `RankingList` component (~Z.412-504)
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — Main component where RankingList is used (~Z.804-818)

**What:** Replace colored text club names with white text + club logo + accent bar. Pass club logo data through to RankingList.

**New header layout:**
```
[Club Logo 20px] [Club Name — white font-black uppercase] [accent line fading right]
```

**Changes:**
- Add `clubLogo` and `clubShort` props to RankingList
- Club name in `text-white/90 font-black` (NOT `style={{ color }}`)
- Left border accent bar stays but uses `bg-gradient` from club color to transparent (3px wide, 16px tall)
- Section labels "AUFSTELLUNG" / "EINGEWECHSELT" in `text-white/25` (not white/20)

**Step 1:** Update RankingList component + props.

**Step 2:** Update parent to pass club logo data.

**Step 3:** Screenshot to verify contrast and readability on #0a0a0a.

**Commit:** `feat(ranking): white club headers with logo replacing colored text`

---

## Task 5: Goal Ticker — Elevated Design

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — `GoalTicker` component (~Z.507-545)

**What:** Current goal ticker pills are gold-tinted but generic. Upgrade to show: goal icon + player name + minute + team badge.

**New pill layout:**
```
[ClubLogo 14px] [GoalIcon 10px] [Name bold] [minute' — white/40] [×N if multiple]
```

**Design:**
- Pill bg: `bg-white/[0.04]` with `border border-white/[0.08]` (not gold tint — too loud)
- Name: `text-white/90 text-xs font-bold`
- Minute: `text-white/30 font-mono`
- Multiple goals: gold accent `text-gold font-black` for "×2", "×3"
- Each pill tappable → player detail (existing)

**Step 1:** Update GoalTicker with new design + ClubLogo integration.

**Step 2:** Pass club data (home/away logos) through to GoalTicker.

**Step 3:** Screenshot horizontal scroll with 7+ goals (ERZ 8-1 MAN test case).

**Commit:** `feat(ticker): elevated goal ticker with club badges and minutes`

---

## Task 6: Match Timeline — SofaScore Dual-Column

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — `MatchTimeline` component (~Z.548-617)

**What:** Replace single-column timeline with SofaScore-style dual-column: home events left, away events right, minute in center. Add club badges.

**New layout:**
```
Home events (right-aligned) | Minute | Away events (left-aligned)
                            |  46'   | ▼ Hérelle → ▲ Cissokho
▼ Tozlu → ▲ Keser          |  56'   |
```

**Design:**
- Center column: vertical line (1px white/10) with minute badges
- Minute badge: `rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-white/40`
- Home side: right-aligned text, `[ClubLogo 12px] ▼ Out → ▲ In`
- Away side: left-aligned text, same pattern mirrored
- Sub arrows: proper `<SubOutIcon />` and `<SubInIcon />` from Task 1
- Player OUT: `text-white/40 line-through` (subtle strikethrough)
- Player IN: `text-white/80 font-semibold` (emphasized)

**Step 1:** Rewrite MatchTimeline as dual-column layout.

**Step 2:** Pass home/away club logos through.

**Step 3:** Screenshot to verify alignment, readability, visual balance.

**Commit:** `feat(timeline): SofaScore dual-column match timeline with club badges`

---

## Task 7: Formation Tab — Visual Polish

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — `PlayerNode` (~Z.114-175)
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — `FormationHalf` (~Z.294-323)

**What:** Polish formation rendering to match premium feel. Fix the formation header (colored text → white), improve node badges, refine pitch gradient.

**PlayerNode changes:**
- Replace `{stat.goals}G` text (Z.166) with `<GoalIcon />` + count
- Replace `{stat.assists}A` text (Z.167) with `<AssistIcon />` + count
- Replace "CS" text (Z.170) with `<CleanSheetIcon size={10} />`
- Assist badge: Replace blue circle with "A" → Sky SVG boot icon (from Task 1)
- Card badges: Use `<YellowCardIcon />` / `<RedCardIcon />` instead of plain divs

**FormationHalf header:**
- Club name: `text-white/80 font-black` (not `style={{ color }}`)
- Formation: `text-white/25` (not white/25 — stays same)
- Club logo stays as-is

**Pitch gradient:**
- Slightly darker, more saturated green: `rgba(15,65,15,0.50)` base
- Grass stripes more visible: `fillOpacity="0.025"` → `"0.035"`

**Step 1:** Update PlayerNode with SVG icons.

**Step 2:** Update FormationHalf header to white text.

**Step 3:** Adjust pitch gradient values.

**Step 4:** Screenshot desktop + mobile formations.

**Commit:** `feat(formation): premium pitch rendering with SVG badges and refined styling`

---

## Task 8: Score Header — Refined Typography

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — Score header section (~Z.696-763)

**What:** Subtle refinements to the score header. Current design is functional but can be elevated.

**Changes:**
- Score digits: Increase to `text-6xl md:text-7xl` for more impact
- Score separator: Replace double gold dots with a thin vertical line `w-px h-8 bg-white/10` (cleaner)
- FT badge: `bg-white/[0.08] text-white/60` instead of gold (gold = too noisy for status)
- Club name: cap at 2 lines with `line-clamp-2` instead of infinite wrap
- Bottom edge: single `h-px bg-white/[0.06]` instead of multi-color gradient (the gradient screams AI)
- Team color radial: reduce to 8% opacity (from 15%) — hint, not shout

**Step 1:** Apply typography and spacing changes.

**Step 2:** Screenshot with long club names (Erzurumspor FK, Keçiörengücü) on desktop + mobile.

**Commit:** `feat(header): refined score header typography and subtle accents`

---

## Task 9: Opacity + Spacing Audit

**Files:**
- Modify: `src/components/fantasy/spieltag/FixtureDetailModal.tsx` — Full file

**What:** Global pass to enforce the 3-opacity-level rule and consistent spacing.

**Opacity rules:**
- Primary text: `text-white/90` (names, scores, important data)
- Secondary text: `text-white/50` (labels, minutes, floor prices)
- Tertiary text: `text-white/25` (section headers, separators, hints)
- Kill: white/15, white/20, white/30, white/35, white/40, white/70, white/80 → consolidate to nearest tier

**Spacing rules:**
- Section gaps: `gap-4` or `gap-6` (never gap-2.5 or gap-3 between sections)
- Row internal gap: `gap-2` (consistent)
- Padding: `p-4 md:p-6` everywhere (consistent)

**Border rules:**
- Card borders: `border-white/[0.08]` (one level)
- Divider lines: `border-white/[0.06]` or `bg-white/[0.06]`
- Kill: white/[0.05], white/[0.10], white/[0.15] → consolidate

**Step 1:** Global search-replace for opacity values.

**Step 2:** Verify no visual regressions via screenshot comparison.

**Commit:** `refactor(modal): enforce 3-tier opacity and consistent spacing`

---

## Task 10: Visual QA Loop — Auto-Iterate

**Files:** All modified files from Tasks 1-9

**What:** Take screenshots at desktop (1024px) and mobile (375px) of:
1. Score header with finished match
2. Goal ticker (many goals: ERZ 8-1 MAN)
3. Ranking tab — both teams visible
4. Formation tab — both pitches
5. Match timeline (dual-column)
6. Score header with upcoming match ("vs")

**For each screenshot, evaluate against these criteria:**
- [ ] No emoji anywhere (⚽, 🅰, etc.)
- [ ] No colored text for club names (always white)
- [ ] No text badges ("G", "A", "CS") — all SVG icons
- [ ] Rating badges are crisp 4-tier (blue/green/orange/red), not muddy
- [ ] Max 3 opacity levels visible
- [ ] Club logos present in timeline events
- [ ] Overall vibe: "Would I trust this app with my money?" — must be YES
- [ ] Typography hierarchy clear: score biggest, names next, details smallest
- [ ] No AI-slop tells: no gradient soup, no over-rounded everything, no emoji

**If any criterion fails:** Fix it, re-screenshot, re-evaluate. Loop until all pass.

**Final commit:** `feat(modal): FixtureDetailModal premium overhaul — visual QA passed`

---

## Execution Order & Dependencies

```
Task 1 (Icons) ← foundation, everything depends on this
  ↓
Task 2 (Ratings) ← independent, can parallel with 1
  ↓
Task 3 (Ranking Rows) ← needs Task 1 icons
Task 4 (Club Headers) ← needs club logo data
Task 5 (Goal Ticker) ← needs club logo data
  ↓
Task 6 (Timeline) ← needs Task 1 icons + club logos
Task 7 (Formation) ← needs Task 1 icons
  ↓
Task 8 (Score Header) ← independent refinement
Task 9 (Opacity Audit) ← must be LAST before QA (touches everything)
  ↓
Task 10 (Visual QA Loop) ← final validation
```

**Parallel groups:**
- Group A: Tasks 1 + 2 (icons + ratings — no dependencies)
- Group B: Tasks 3 + 4 + 5 (ranking + headers + ticker — need Group A)
- Group C: Tasks 6 + 7 (timeline + formation — need Group A)
- Group D: Tasks 8 + 9 (header + audit — sequential)
- Group E: Task 10 (QA loop — needs everything)

**Total estimated tasks:** 10 tasks, ~50 steps
