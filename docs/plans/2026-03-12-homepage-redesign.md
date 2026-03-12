# Homepage Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce Homepage from 12 sections to 6 with clear visual hierarchy, min 11px fonts, portfolio at position 2, and merged engagement zone.

**Architecture:** UI-only restructure. No DB, RPC, or service changes. Modify 4 components, restructure page.tsx, delete LiveTicker. DailyChallengeCard gets a footer row for tickets + mystery box.

**Tech Stack:** React, Tailwind, next-intl, lucide-react

---

### Task 1: Font fixes on HomeStoryHeader

**Files:**
- Modify: `src/components/home/HomeStoryHeader.tsx:46,85,100,105`

**Step 1: Fix font sizes and font-black overuse**

Replace `text-[9px]` labels with `text-[11px]`, greeting subtitle to `text-sm`, label weights from `font-semibold` instead of `font-black` where they're just labels.

```tsx
// Line 46: greeting label
// OLD:
<div className="text-xs text-white/40" suppressHydrationWarning>{t(greetingKey)},</div>
// NEW:
<div className="text-sm text-white/40" suppressHydrationWarning>{t(greetingKey)},</div>

// Line 85: portfolio label
// OLD:
<span className="text-[9px] text-white/40 uppercase font-semibold mt-0.5 inline-flex items-center gap-0.5">{t('portfolioRoster')} <InfoTooltip text={t('portfolioRosterTooltip')} /></span>
// NEW:
<span className="text-[11px] text-white/40 uppercase font-semibold mt-0.5 inline-flex items-center gap-0.5">{t('portfolioRoster')} <InfoTooltip text={t('portfolioRosterTooltip')} /></span>

// Line 100: PnL label
// OLD:
<span className="text-[9px] text-white/40 uppercase font-semibold mt-0.5 inline-flex items-center gap-0.5">{t('pnl')} <InfoTooltip text={t('pnlTooltip')} /></span>
// NEW:
<span className="text-[11px] text-white/40 uppercase font-semibold mt-0.5 inline-flex items-center gap-0.5">{t('pnl')} <InfoTooltip text={t('pnlTooltip')} /></span>

// Line 105: Players label
// OLD:
<span className="text-[9px] text-white/40 uppercase font-semibold mt-0.5">{t('players')}</span>
// NEW:
<span className="text-[11px] text-white/40 uppercase font-semibold mt-0.5">{t('players')}</span>
```

**Step 2: Build to verify**

Run: `npx next build`
Expected: PASS (no type errors, pure className changes)

**Step 3: Commit**

```bash
git add src/components/home/HomeStoryHeader.tsx
git commit -m "fix(home): min 11px font sizes in HomeStoryHeader"
```

---

### Task 2: Font fixes on PortfolioStrip

**Files:**
- Modify: `src/components/home/PortfolioStrip.tsx:85`

**Step 1: Fix DPC count font size**

```tsx
// Line 85:
// OLD:
<div className="text-[9px] text-white/30 mt-1 font-mono">{h.qty} DPC</div>
// NEW:
<div className="text-[11px] text-white/30 mt-1 font-mono">{h.qty} DPC</div>
```

**Step 2: Build to verify**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/home/PortfolioStrip.tsx
git commit -m "fix(home): min 11px font size in PortfolioStrip"
```

---

### Task 3: Font fixes on HomeSpotlight

**Files:**
- Modify: `src/components/home/HomeSpotlight.tsx`

**Step 1: Fix all text-[10px] and text-[9px] occurrences**

All `text-[10px]` → `text-[11px]`, all `text-[9px]` → `text-[11px]`:

```tsx
// Line 45: IPO label
text-[10px] → text-[11px]

// Line 49: club name
text-[10px] → text-[11px]

// Line 55: bCredits/DPC label
text-[10px] → text-[11px]

// Line 66: progress percentage
text-[9px] → text-[11px]

// Line 88: event label
text-[10px] → text-[11px]

// Line 107: Preisgeld label
text-[10px] → text-[11px]

// Line 133: top mover label
text-[10px] → text-[11px]

// Line 137: DPC count
text-[10px] → text-[11px]

// Line 170: trending label
text-[10px] → text-[11px]

// Line 174: club trades
text-[10px] → text-[11px]

// Line 180: change %
text-[10px] → text-[11px]

// Line 200: CTA label
text-[10px] → text-[11px]
```

Use `replace_all` for efficiency — replace `text-[10px]` with `text-[11px]` and `text-[9px]` with `text-[11px]` across the file.

**Step 2: Build to verify**

Run: `npx next build`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/home/HomeSpotlight.tsx
git commit -m "fix(home): min 11px font sizes in HomeSpotlight"
```

---

### Task 4: Add footer row to DailyChallengeCard

**Files:**
- Modify: `src/components/gamification/DailyChallengeCard.tsx`

**Step 1: Add new props to interface**

```tsx
// After line 24 (isLoading prop):
interface DailyChallengeCardProps {
  challenge: DbDailyChallenge | null;
  userAnswer: {
    selectedOption: number;
    isCorrect: boolean | null;
    ticketsAwarded: number;
  } | null;
  onSubmit: (challengeId: string, option: number) => void | Promise<void>;
  isSubmitting?: boolean;
  streakDays?: number;
  isLoading?: boolean;
  /** Ticket balance for footer row */
  ticketBalance?: number;
  /** Opens mystery box modal */
  onOpenMysteryBox?: () => void;
}
```

**Step 2: Destructure new props**

```tsx
// Line 27-34, add to destructuring:
export default function DailyChallengeCard({
  challenge,
  userAnswer,
  onSubmit,
  isSubmitting = false,
  streakDays = 0,
  isLoading = false,
  ticketBalance = 0,
  onOpenMysteryBox,
}: DailyChallengeCardProps) {
```

**Step 3: Add Gift import**

```tsx
// Line 4: add Gift to imports
import { Zap, Check, X as XIcon, Ticket, Flame, AlertCircle, Gift } from 'lucide-react';
```

**Step 4: Add footer row after streak counter (before closing `</Card>`)**

Insert before line 200 (`</Card>`):

```tsx
      {/* Footer — Ticket Balance + Mystery Box */}
      {onOpenMysteryBox && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Ticket className="size-3.5 text-gold/60" />
            <span className="font-mono font-bold text-white/70">{ticketBalance}</span>
            {' '}{t('tickets')}
          </span>
          <button
            onClick={onOpenMysteryBox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/[0.08] border border-gold/15 text-[11px] font-bold text-gold hover:bg-gold/[0.12] active:scale-[0.97] transition-all"
          >
            <Gift className="size-3.5" />
            Mystery Box
          </button>
        </div>
      )}
```

**Step 5: Fix existing text-[10px] in the component**

```tsx
// Line 119: ticket reward hint
// OLD:
<span className="text-[10px] font-mono tabular-nums text-gold/60 flex items-center gap-1">
// NEW:
<span className="text-[11px] font-mono tabular-nums text-gold/60 flex items-center gap-1">
```

**Step 6: Build to verify**

Run: `npx next build`
Expected: PASS (new optional props don't break existing usage)

**Step 7: Commit**

```bash
git add src/components/gamification/DailyChallengeCard.tsx
git commit -m "feat(home): add ticket balance + mystery box footer to DailyChallengeCard"
```

---

### Task 5: Restructure page.tsx

This is the main task — reorder sections, remove elements, wire up new props.

**Files:**
- Modify: `src/app/(app)/page.tsx`

**Step 1: Remove unused imports**

Remove these imports that are no longer needed:
- `LiveTicker` import (line 41)
- `OnboardingChecklist` dynamic import (lines 50-53)
- `MissionBanner` dynamic import (lines 54-57)
- `Gift` from lucide-react (line 17, if only used for standalone mystery box button)

**Step 2: Restructure JSX in return statement**

New section order (replace entire return JSX):

```tsx
return (
    <div className="max-w-[1200px] mx-auto space-y-4 md:space-y-6">

      {/* ── 1. HERO HEADER — Greeting + Stats ── */}
      <HomeStoryHeader
        loading={loading}
        firstName={firstName}
        streak={streak}
        shieldsRemaining={shieldsRemaining}
        userStats={userStats}
        portfolioValue={portfolioValue}
        holdingsCount={holdings.length}
        pnl={pnl}
        pnlPct={pnlPct}
        storyMessage={storyMessage}
      />

      {/* ── 1b. SPOTLIGHT — Context-aware hero card ── */}
      {playersLoading ? (
        <div className="h-40 bg-surface-base border border-white/10 rounded-2xl animate-pulse" />
      ) : (
        <HomeSpotlight
          activeIPOs={activeIPOs}
          nextEvent={nextEvent}
          holdings={holdings}
          trendingPlayers={trendingPlayers}
          players={players}
        />
      )}

      {/* ── 2. PORTFOLIO STRIP — Top holdings ── */}
      <PortfolioStrip holdings={holdings} />

      {/* ── 3. ENGAGEMENT ZONE — Daily Challenge + Mystery Box ── */}
      {uid && (
        <>
          <DailyChallengeCard
            challenge={todaysChallenge}
            userAnswer={todaysAnswer ? {
              selectedOption: todaysAnswer.selected_option,
              isCorrect: todaysAnswer.is_correct,
              ticketsAwarded: todaysAnswer.tickets_awarded,
            } : null}
            onSubmit={handleChallengeSubmit}
            isSubmitting={isSubmitting}
            streakDays={streak}
            isLoading={challengeLoading}
            ticketBalance={ticketData?.balance ?? 0}
            onOpenMysteryBox={() => setShowMysteryBox(true)}
          />

          <MysteryBoxModal
            open={showMysteryBox}
            onClose={() => setShowMysteryBox(false)}
            onOpen={handleOpenMysteryBox}
            ticketBalance={ticketData?.balance ?? 0}
          />
        </>
      )}

      {/* ── 4. DYNAMIC FEED — Event/IPO + Trending ── */}
      {playersLoading ? (
        <div className="h-24 bg-surface-base border border-white/10 rounded-2xl animate-pulse" />
      ) : (
        <>
          {nextEvent && spotlightType !== 'event' && (
            <div>
              <SectionHeader
                title={t('nextEvent')}
                href="/fantasy"
                badge={
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-400/25">
                    <Clock className="size-3 text-purple-400" />
                    <span className="text-[11px] font-bold text-purple-300">
                      {nextEvent.status === 'running' ? getTimeUntil(nextEvent.ends_at) : getTimeUntil(nextEvent.starts_at)}
                    </span>
                  </span>
                }
              />
              <Link href="/fantasy" className="block mt-3">
                <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/10 shadow-lg">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="size-4 text-purple-400" />
                          <span className="text-[11px] font-black uppercase text-purple-400">{nextEvent.format}</span>
                        </div>
                        <h3 className="text-base md:text-lg font-black text-balance">{nextEvent.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-white/50">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {nextEvent.current_entries}/{nextEvent.max_entries ?? '\u221E'}
                          </span>
                          <span>{t('entryLabel')}{nextEvent.entry_fee === 0 ? t('entryFree') : `${fmtScout(centsToBsd(nextEvent.entry_fee))} bCredits`}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-white/40 mb-0.5">{t('prizeMoney')}</div>
                        <div className="text-xl md:text-2xl font-black font-mono tabular-nums text-gold">
                          {formatPrize(centsToBsd(nextEvent.prize_pool))}
                        </div>
                        <div className="text-[11px] text-white/40">bCredits</div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {activeIPOs.length > 0 && spotlightType !== 'ipo' && (
            <Link href={`/player/${activeIPOs[0].id}`} className="block">
              <div className="relative overflow-hidden rounded-2xl border border-green-500/30 bg-green-500/10">
                <div className="relative flex items-center justify-between p-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center size-10 rounded-2xl bg-green-500/15 border border-green-500/25 shrink-0">
                      <Rocket className="size-5 text-green-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] font-black uppercase text-green-500">{t('liveIPO')}</span>
                        <span className="relative flex size-2.5">
                          <span className="animate-ping motion-reduce:animate-none absolute inline-flex size-full rounded-full bg-green-500 opacity-75" />
                          <span className="relative inline-flex rounded-full size-2.5 bg-green-500" />
                        </span>
                      </div>
                      <div className="font-black text-sm truncate">
                        {activeIPOs.map((p) => `${p.first} ${p.last}`).join(', ')}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {activeIPOs[0].club} · {activeIPOs[0].ipo.progress}% {t('sold')}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono font-black text-gold text-lg">{activeIPOs[0].ipo.price}</div>
                    <div className="text-[11px] text-white/40">bCredits/DPC</div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {trendingWithPlayers.length > 0 && (
            <div>
              <SectionHeader title={t('marketPulse')} href="/market" />
              <div className="mt-3 flex gap-2.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
                {trendingWithPlayers.map(({ tp, player }) => (
                  <DiscoveryCard
                    key={player.id}
                    player={player}
                    variant="trending"
                    tradeCount={tp.tradeCount}
                    change24h={tp.change24h}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 5. MY CLUBS — Conditional ── */}
      {followedClubs.length > 0 && (
        <div>
          <SectionHeader title={t('myClubs')} href="/clubs" />
          <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
            {followedClubs.map(club => {
              const color = club.primary_color ?? '#FFD700';
              return (
                <Link
                  key={club.id}
                  href={`/club/${club.slug}`}
                  className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/[0.08] rounded-xl hover:bg-white/[0.06] hover:border-white/15 transition-colors shrink-0"
                >
                  <div className="size-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
                    {club.logo_url ? (
                      <img src={club.logo_url} alt="" className="size-5 object-contain" />
                    ) : (
                      <Shield className="size-3.5" style={{ color }} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate max-w-[100px]">{club.name}</div>
                    <div className="text-[11px] text-white/30">{club.league}</div>
                  </div>
                </Link>
              );
            })}
            <Link href="/clubs" className="flex items-center gap-2 px-3 py-2 bg-gold/[0.03] border border-gold/10 rounded-xl hover:bg-gold/[0.06] transition-colors shrink-0">
              <Compass className="size-4 text-gold/60" />
              <span className="text-xs font-medium text-gold/60">{t('discover')}</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── 6. SPONSOR — Single footer placement ── */}
      <SponsorBanner placement="home_mid" />
    </div>
  );
```

**Step 3: Clean up unused imports at top of file**

After restructuring, remove:
- `Gift` from lucide-react imports (line 17) — no longer used in page.tsx
- `LiveTicker` import (line 41)

Remove dynamic imports that are no longer rendered:
```tsx
// DELETE these blocks:
const OnboardingChecklist = dynamic(...)  // lines 50-53
const MissionBanner = dynamic(...)        // lines 54-57
```

**Step 4: Build to verify**

Run: `npx next build`
Expected: PASS

**Step 5: Commit**

```bash
git add src/app/(app)/page.tsx
git commit -m "feat(home): restructure homepage to 6 sections — portfolio elevated, engagement merged, noise removed"
```

---

### Task 6: Delete LiveTicker

**Files:**
- Delete: `src/components/home/LiveTicker.tsx`

**Step 1: Verify no other imports**

Search for `LiveTicker` across the codebase. Expected: only `page.tsx` (already removed in Task 5).

Run: `grep -r "LiveTicker" src/`
Expected: No results (import already removed in Task 5)

**Step 2: Delete the file**

```bash
rm src/components/home/LiveTicker.tsx
```

**Step 3: Check for barrel exports**

Search `src/components/home/index.ts` or similar barrel file. If LiveTicker is exported, remove that line.

**Step 4: Build to verify**

Run: `npx next build`
Expected: PASS

**Step 5: Commit**

```bash
git add -u src/components/home/LiveTicker.tsx
git commit -m "chore(home): remove unused LiveTicker component"
```

---

### Task 7: Font fixes in Dynamic Feed inline cards (page.tsx)

Already handled in Task 5 — all `text-[10px]` in the Event/IPO cards within page.tsx were changed to `text-[11px]` in the new JSX.

No separate action needed.

---

### Task 8: Final verification

**Step 1: Full build**

Run: `npx next build`
Expected: 0 errors, 0 warnings related to our changes

**Step 2: Visual verification**

Take screenshot of homepage at localhost:3000 on mobile (375px) and desktop (1200px) to verify:
- Section order: Header → Portfolio → Challenge → Feed → Clubs → Sponsor
- No text below 11px
- No standalone Mystery Box button
- No LiveTicker
- No OnboardingChecklist
- No MissionBanner
- Single SponsorBanner at bottom

**Step 3: Final commit (if any fixups)**

```bash
git add -A
git commit -m "fix(home): homepage redesign polish"
```

---

## Summary of Changes

| File | Action | What |
|------|--------|------|
| `HomeStoryHeader.tsx` | Modify | Font sizes 9px → 11px |
| `PortfolioStrip.tsx` | Modify | Font size 9px → 11px |
| `HomeSpotlight.tsx` | Modify | Font sizes 9-10px → 11px |
| `DailyChallengeCard.tsx` | Modify | Add footer row (tickets + mystery box) |
| `page.tsx` | Modify | Restructure to 6 sections, remove noise |
| `LiveTicker.tsx` | Delete | No longer used |

## Not Modified (explicitly)

| File | Why |
|------|-----|
| `OnboardingChecklist.tsx` | Kept in codebase, just not rendered on Homepage |
| `MissionBanner.tsx` | Kept in codebase, just not rendered on Homepage (future: Profile tab) |
| `helpers.tsx` | No changes needed |
| `SponsorBanner.tsx` | No changes needed, just rendered once instead of twice |
