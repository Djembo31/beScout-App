# Club Fan Portal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the generic club page into a cinematic, club-branded fan portal that makes every club look premium and unique.

**Architecture:** Extract HeroSection + StatsBar from the 1348-line ClubContent.tsx into standalone components. Add CSS custom properties per club for dynamic theming. Create animation hooks (useCountUp, useScrollReveal) for cinematic scroll experience. Redesign sections in-place where possible, create new components for Hero/StatsBar/FeatureShowcase.

**Tech Stack:** Next.js 14 / TypeScript / Tailwind / next-intl / IntersectionObserver / CSS Custom Properties

**Design Doc:** `docs/plans/2026-03-10-club-portal-design.md`

---

## Wave 1: Foundation (Sequential)

### Task 1: Animation Hooks

**Files:**
- Create: `src/hooks/useCountUp.ts`
- Create: `src/hooks/useScrollReveal.ts`

**Step 1: Create useCountUp hook**

```typescript
// src/hooks/useCountUp.ts
'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Animates a number from 0 to target when element enters viewport.
 * @param target - final number to count up to
 * @param duration - animation duration in ms (default 600)
 * @param decimals - decimal places (default 0)
 */
export function useCountUp(target: number, duration = 600, decimals = 0) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasAnimated.current) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setValue(target);
      hasAnimated.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const startTime = performance.now();
          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Number((eased * target).toFixed(decimals)));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, decimals]);

  return { value, ref };
}
```

**Step 2: Create useScrollReveal hook**

```typescript
// src/hooks/useScrollReveal.ts
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns a ref and `revealed` boolean. Element fades in when it enters viewport.
 * CSS classes should handle the visual transition.
 */
export function useScrollReveal(options?: { threshold?: number; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (options?.delay) {
            setTimeout(() => setRevealed(true), options.delay);
          } else {
            setRevealed(true);
          }
          observer.disconnect();
        }
      },
      { threshold: options?.threshold ?? 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [options?.threshold, options?.delay]);

  return { ref, revealed };
}
```

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -20`
Expected: No type errors from new hooks.

**Step 4: Commit**

```bash
git add src/hooks/useCountUp.ts src/hooks/useScrollReveal.ts
git commit -m "feat(club): add useCountUp + useScrollReveal animation hooks"
```

---

### Task 2: i18n Bugfixes

**Files:**
- Modify: `messages/de.json`
- Modify: `messages/tr.json`

**Context:** The MembershipSection passes `t('subscribe')` without the `{tier}` parameter, causing raw key display. The ClubEventsSection shows `club.statusLive` which may fail during hydration.

**Step 1: Check and fix subscribe key usage in MembershipSection**

In `src/components/club/sections/MembershipSection.tsx` line 108, the subscribe button uses:
```typescript
{isUpgrade ? t('upgrade') : t('subscribe')}
```

But the i18n key `subscribe` is defined as `"{tier} abonnieren"` — it expects a `{tier}` parameter.

Fix: Change the button text to pass the tier name:
```typescript
// Line 108 — change from:
{isUpgrade ? t('upgrade') : t('subscribe')}
// To:
{isUpgrade ? t('upgrade') : t('subscribe', { tier: ts(config.labelKey) })}
```

**Step 2: Verify the i18n keys exist in both locales**

Grep for all club-namespace keys used in sections. Verify `statusLive`, `statusOpen`, `statusUpcoming`, `statusLateReg` exist under `club` namespace in both `de.json` and `tr.json`.

If any are missing, add them:
- DE: `"statusLive": "LIVE"`, `"statusOpen": "OFFEN"`, `"statusUpcoming": "BALD"`, `"statusLateReg": "LATE REG"`
- TR: `"statusLive": "CANLI"`, `"statusOpen": "AÇIK"`, `"statusUpcoming": "YAKINDA"`, `"statusLateReg": "GEÇ KAYIT"`

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/components/club/sections/MembershipSection.tsx messages/de.json messages/tr.json
git commit -m "fix(club): fix subscribe button i18n + verify status keys"
```

---

## Wave 2: Core Components (Parallel — 4 Agents)

### Task 3: ClubHero — Cinematic Redesign

**Files:**
- Create: `src/components/club/ClubHero.tsx`
- Modify: `src/app/(app)/club/[slug]/ClubContent.tsx` (remove old HeroSection lines 72-215, import new)

**Context:**
- Current HeroSection is lines 72-215 in ClubContent.tsx
- Club data: `club.primary_color` (hex), `club.secondary_color` (hex), `club.logo_url`, `club.name`, `club.league`, `club.city`, `club.is_verified`, `club.slug`, `club.stadium`
- Stadium images at `/stadiums/{slug}.jpg` with fallback to `/stadiums/default.jpg`
- Design doc section 2: Full-width, 50vh mobile / 45vh desktop, parallax, counter animations, club gradient overlay

**Step 1: Create ClubHero component**

Extract from ClubContent and redesign with:
- `50vh` mobile / `45vh` desktop height (currently 120px/160px/350px — too small)
- 3-layer overlay: club gradient (primary→transparent→secondary at 35%), bottom fade to #0a0a0a, subtle vignette
- Parallax via CSS `transform: translateY(calc(var(--scroll-y) * 0.3))` using IntersectionObserver
- Club logo: 100px mobile / 140px desktop with club-color box-shadow glow
- Animated entrance: logo scale 0.8→1 (0.3s), name slide-up (0.4s), stats counter (0.6s)
- Stats row with useCountUp for Scouts/24h Vol/Spieler numbers
- Follow button in `bg-[var(--club-primary)]` instead of gold
- CSS custom properties `--club-primary` and `--club-secondary` set on root div

**Props interface (keep same as existing + add new):**
```typescript
type ClubHeroProps = {
  club: ClubWithAdmin;
  followerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  onFollow: () => void;
  totalVolume24h: number;
  playerCount: number;
  buyablePlayers?: number;
  isPublic?: boolean;
  loginUrl?: string;
  // NEW for desktop merged stats bar:
  totalDpcFloat: number;
  avgPerf: number;
  formResults: ('W' | 'D' | 'L')[];
  prestigeTier?: PrestigeTier;
};
```

**Key design rules:**
- Stadium background: `object-fit: cover`, NO blur (current has `blur-sm` — remove it for cinematic feel)
- Club name: `font-black text-3xl md:text-5xl` (bigger than current `text-base md:text-lg lg:text-4xl`)
- `prefers-reduced-motion`: skip all entrance animations, show everything immediately
- Use `useCountUp` hook for the stat numbers
- Desktop: Include a semi-transparent stats row at bottom of hero (`bg-black/40 backdrop-blur-md`)
- Mobile: Stats row is separate (handled by ClubStatsBar in Task 4)

**Step 2: Update ClubContent imports**

Remove the inline `HeroSection` function (lines 72-215) and import the new component:
```typescript
import { ClubHero } from '@/components/club/ClubHero';
```

Update usage at lines 1020-1030 and 887-899 to use new component with new props.

**Step 3: Verify build**

Run: `npx next build 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/components/club/ClubHero.tsx src/app/\(app\)/club/\[slug\]/ClubContent.tsx
git commit -m "feat(club): cinematic ClubHero with parallax + counter animations"
```

---

### Task 4: ClubStatsBar — Extract + Redesign

**Files:**
- Create: `src/components/club/ClubStatsBar.tsx`
- Modify: `src/app/(app)/club/[slug]/ClubContent.tsx` (remove old StatsBar lines 221-319)

**Context:**
- Current StatsBar is lines 221-319 in ClubContent.tsx
- PRESTIGE_CONFIG is at line 371-376 — keep in ClubContent or move to shared
- Design: Mobile-only component (desktop stats are merged into hero in Task 3)
- Form badges should be bigger, prestige badge more prominent

**Step 1: Create ClubStatsBar component**

Extract existing StatsBar with these changes:
- Add `className="lg:hidden"` — only show on mobile/tablet (desktop has it in hero)
- Use `--club-primary` CSS var for accent colors
- Form streak badges: increase from `size-5` to `size-6`, add ring border
- Prestige badge: bigger icon, colored background pill instead of just icon+text
- Numbers use `useCountUp` for animation on scroll

**Step 2: Update ClubContent**

Remove inline StatsBar function, import new component. Add `PRESTIGE_CONFIG` export to ClubStatsBar or move to a shared location.

**Step 3: Verify build + Commit**

---

### Task 5: NextMatchCard — Expanded Design

**Files:**
- Modify: `src/app/(app)/club/[slug]/ClubContent.tsx` (inline NextMatchCard function at lines 503-547)

**Context:**
- Current NextMatchCard is a small inline function showing opponent name + H/A badge
- Design: Full-width, both club logos, date/countdown, club gradient background
- Club logo available via `getClub(short)?.logo` or fallback initials
- Own club logo via `club.logo_url`

**Step 1: Redesign NextMatchCard inline**

Replace the current function (lines 503-547) with:
- Full-width card with `bg-gradient-to-r from-[var(--club-primary)]/10 to-transparent`
- Layout: `[Own Logo] — VS — [Opponent Logo]` centered
- Own club logo (from club prop) on the left
- Opponent logo on the right
- Spieltag number + date above
- "In X Tagen" countdown below (calculate from `next.kickoff` if available, else just show GW)
- Pulsing red dot + "LIVE" if `next.status === 'running'`
- Pass `club` as additional prop

**Step 2: Verify build + Commit**

---

### Task 6: SquadPreviewSection — Card Carousel

**Files:**
- Modify: `src/components/club/sections/SquadPreviewSection.tsx`

**Context:**
- Currently a vertical list of 5 players (79 lines)
- Design: Horizontal scrollable card carousel
- PlayerPhoto component: `<PlayerPhoto first={p.first} last={p.last} pos={p.pos} size={48} />`
- Position colors: GK=emerald, DEF=amber, MID=sky, ATT=rose

**Step 1: Redesign to card carousel**

Replace the `<div className="space-y-1">` list with:
```tsx
<div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1 scrollbar-none">
  {trending.map((player, i) => (
    <Link
      key={player.id}
      href={`/player/${player.id}`}
      className="snap-start flex-shrink-0 w-[160px] rounded-2xl p-3 border border-white/10 bg-white/[0.02] hover:border-[var(--club-primary,#FFD700)]/40 transition-all hover:-translate-y-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <div className="flex flex-col items-center text-center gap-2">
        <PlayerPhoto first={player.first} last={player.last} pos={player.pos} size={48} />
        <div className="w-full">
          <div className="text-sm font-bold truncate">{player.last}</div>
          <div className="text-[10px] text-white/40">{player.pos} · {fmtScout(player.prices.floor ?? 0)}</div>
        </div>
        <div className={cn(
          'text-xs font-mono font-bold tabular-nums flex items-center gap-0.5',
          change >= 0 ? 'text-green-500' : 'text-red-400'
        )}>
          {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
    </Link>
  ))}
</div>
```

- Add Tailwind `scrollbar-none` utility (or use `[&::-webkit-scrollbar]:hidden`)
- Keep CollectionProgress bar above with `clubColor`
- Keep "Alle anzeigen" link

**Step 2: Verify build + Commit**

---

## Wave 3: Secondary Components (Parallel — 3 Agents)

### Task 7: FeatureShowcase — Smart-Hide Component

**Files:**
- Create: `src/components/club/sections/FeatureShowcase.tsx`

**Context:**
- Shows when >2 content sections would be empty (no events, no trades, no scouts, no IPOs)
- Design: 2x2 grid mobile / 4-col desktop with preview cards
- Each card: icon + title + description + CTA link
- Uses `--club-primary` for subtle gradient background

**Step 1: Create FeatureShowcase component**

```typescript
type Props = {
  clubColor: string;
};

// 4 feature cards: DPC Trading, Fantasy Events, Scout Community, Club Membership
// Each with: lucide icon, title (i18n), 1-line description (i18n), link
// Card style: bg-gradient-to-br from-[var(--club-primary)]/5 to-transparent, border border-white/10, rounded-2xl
```

**Step 2: Add i18n keys**

Add to `messages/de.json` and `messages/tr.json` under `club` namespace:
- `featureShowcaseTitle`: "Was dein Club bietet" / "Kulubun neler sunuyor"
- `featureDpcTitle`: "DPC Trading" / "DPC Trading"
- `featureDpcDesc`: "Handle mit Spieler-Contracts" / "Oyuncu kontratlarıyla işlem yap"
- `featureFantasyTitle`: "Fantasy Events" / "Fantezi Etkinlikler"
- `featureFantasyDesc`: "Stelle dein Dream-Team auf" / "Rüya takımını kur"
- `featureScoutTitle`: "Scout Community" / "Scout Topluluğu"
- `featureScoutDesc`: "Analysiere Spieler, verdiene Credits" / "Oyuncuları analiz et, kredi kazan"
- `featureMemberTitle`: "Club-Mitgliedschaft" / "Kulüp Üyeliği"
- `featureMemberDesc`: "Exklusive Vorteile fuer Fans" / "Taraftarlar için özel avantajlar"
- `featureExplore`: "Entdecken" / "Keşfet"

**Step 3: Verify build + Commit**

---

### Task 8: MembershipSection — Premium Redesign

**Files:**
- Modify: `src/components/club/sections/MembershipSection.tsx`

**Context:**
- Current: 118 lines, generic cards with broken subscribe button text
- Design: Colored headers per tier, animated active border, bigger price, club-colored CTA

**Step 1: Redesign tier cards**

Changes to existing component:
- Add gradient header to each card: `bg-gradient-to-r from-{tierColor}/20 to-transparent`
- Active tier: `animate-pulse` on border (subtle, 2s loop) — use `ring-2 ring-{color}/30 animate-[pulse_2s_ease-in-out_infinite]`
- Price: increase from `text-sm` to `text-xl font-black`
- Check icons: use tier color instead of green-500
- CTA button: use `style={{ backgroundColor: clubColor }}` for non-gold tiers
- Fix subscribe button text (already done in Task 2, but verify)

**Step 2: Verify build + Commit**

---

### Task 9: RecentActivity + LastResults — Visual Upgrade

**Files:**
- Modify: `src/components/club/sections/RecentActivitySection.tsx`
- Modify: `src/app/(app)/club/[slug]/ClubContent.tsx` (LastResultsCard inline function, lines 553-602)

**Context:**
- RecentActivity: 51 lines, plain list of trades
- LastResults: inline function in ClubContent, plain fixture rows
- Design: Add player initials avatar, distinguish buy/sell, bigger scores

**Step 1: Upgrade RecentActivitySection**

- Add player initials avatar before name (2-letter circle with position color)
- Change "Jemand" to "Ein Scout" (update i18n key `someone` → `aScout`)
- Price accent in `--club-primary` instead of gold
- Add subtle buy/sell icon (ArrowUpRight green / ArrowDownRight red)

**Step 2: Upgrade LastResultsCard**

- Increase score font size from `text-xs` to `text-sm font-bold`
- Increase W/D/L badge size from `text-[9px] w-5` to `text-xs px-2 py-0.5`
- Add Heim/Auswaerts indicator (currently missing in this widget)

**Step 3: Verify build + Commit**

---

## Wave 4: Integration (Sequential)

### Task 10: ClubContent Integration — Wire Everything + Scroll Animations + Smart-Hide

**Files:**
- Modify: `src/app/(app)/club/[slug]/ClubContent.tsx`

**Context:**
- This is the main wiring task — all new components from Wave 2+3 get integrated
- ClubContent currently 1348 lines — after extracting Hero+StatsBar it should be ~1000
- Add CSS custom properties, scroll reveal wrapper, smart-hide logic
- IMPORTANT: Read the CURRENT state of ClubContent.tsx before making changes (Wave 2+3 agents will have modified it)

**Step 1: Add CSS custom properties to root div**

At line ~1017 (the main return div), add inline style:
```tsx
<div
  className="max-w-[1200px] mx-auto"
  style={{
    '--club-primary': club.primary_color || '#006633',
    '--club-secondary': club.secondary_color || '#333',
    '--club-glow': `${club.primary_color || '#006633'}4D`,
  } as React.CSSProperties}
>
```

Do the same for the public view (line ~886).

**Step 2: Add scroll reveal wrappers**

Wrap each section in Uebersicht tab with scroll reveal:
```tsx
function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, revealed } = useScrollReveal({ delay });
  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-500 ease-out',
        revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
      )}
    >
      {children}
    </div>
  );
}
```

Wrap each section with incremental delays: 0, 50, 100, 150...

**Step 3: Add smart-hide logic**

Calculate how many sections are empty:
```typescript
const emptySections = [
  clubIpos.length === 0,           // no IPOs
  clubEvents.length === 0,         // no events
  recentTrades.length === 0,       // no trades
  // MitmachenSection handles its own null return
].filter(Boolean).length;

const showFeatureShowcase = emptySections >= 2;
```

Conditionally render FeatureShowcase instead of empty sections.

**Step 4: Update Uebersicht tab section order**

New order (per design doc):
1. NextMatchCard (expanded)
2. YourHoldingsCard (if holdings)
3. ActiveOffersSection (if IPOs)
4. SquadPreviewSection (card carousel)
5. FeatureShowcase (if showFeatureShowcase) OR individual sections:
   - ClubEventsSection
   - MitmachenSection
   - RecentActivitySection
6. MembershipSection
7. ClubNewsSection (if news)
8. LastResultsCard
9. ClubInfoCard

**Step 5: Update Sponsor Banner styling**

Pass `clubColor` to SponsorBanner if it accepts it, or wrap with styled div for club-colored border accent.

**Step 6: Tab accent color**

Already using `accentColor={clubColor}` on TabBar — verify it's using `--club-primary` CSS var now.

**Step 7: Verify build**

Run: `npx next build 2>&1 | head -20`

**Step 8: Commit**

```bash
git add src/app/\(app\)/club/\[slug\]/ClubContent.tsx
git commit -m "feat(club): integrate all components + scroll animations + smart-hide"
```

---

## Wave 5: Verification (Parallel — 3 Agents)

### Task 11: Build Verification

Run: `npx next build`
Expected: 0 errors, 0 type errors

### Task 12: Visual QA — Screenshots

Take Playwright screenshots:
1. Desktop 1440px: `/club/sakaryaspor` (green theme)
2. Desktop 1440px: `/club/adana-demirspor` (blue/orange theme)
3. Mobile 375px: `/club/sakaryaspor`
4. Mobile 375px: `/club/adana-demirspor`

Verify:
- Club colors visible in hero gradient
- Counter animations play
- Sections reveal on scroll
- Empty sections hidden / feature showcase visible
- Membership buttons show translated text
- Form streak badges visible and colored

### Task 13: Accessibility Check

Run `/fixing-accessibility` on:
- `src/components/club/ClubHero.tsx`
- `src/components/club/sections/FeatureShowcase.tsx`
- `src/components/club/sections/MembershipSection.tsx`

Verify:
- `prefers-reduced-motion` disables all animations
- All images have alt text
- Color contrast meets WCAG AA on `#0a0a0a` background
- Interactive elements have focus states

---

## Summary

| Wave | Tasks | Agents | Execution |
|------|-------|--------|-----------|
| 1 | Hooks + i18n | 1 (sequential) | Foreground |
| 2 | Hero + StatsBar + NextMatch + SquadPreview | 4 parallel | Background |
| 3 | FeatureShowcase + Membership + Activity/Results | 3 parallel | Background |
| 4 | Integration (wiring + scroll + smart-hide) | 1 | Foreground |
| 5 | Build + Screenshots + Accessibility | 3 parallel | Background |

**Estimated total: 11 tasks across 5 waves.**
