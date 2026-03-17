# Wave 2: Gamification & Onboarding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Missions-Hub als neuer Nav-Punkt (konsolidiert Daily Challenges, Missions, Score Road, Streak, Mystery Box), Achievements + Rang-Progression ins Profil verschieben, Intro Tour mit 3 Konzept-Slides erweitern.

**Architecture:**
- Missions Hub = neue Route `/missions` mit bestehenden Components (DailyChallengeCard, MissionBanner, ScoreRoadCard, MysteryBoxModal)
- Profil = neuer Tab "Erfolge" (Achievements Gallery + Rang-Progression)
- Tour = 3 neue Slides am Anfang von tourSteps.ts

**Tech Stack:** Next.js 14, TypeScript strict, Tailwind (Dark Mode only), next-intl, lucide-react, React Query

---

### Task 1: Missions Hub — Route + Nav Item

Create `/missions` page that consolidates all gamification engagement features in one place.

**Files:**
- Create: `src/app/(app)/missions/page.tsx`
- Modify: `src/lib/nav.ts` (add nav item)
- Modify: `messages/de.json` (i18n)
- Modify: `messages/tr.json` (i18n)

**Step 1: Add nav item**

In `src/lib/nav.ts`, add `Target` to lucide import and new nav item:

```typescript
import {
  Home, Briefcase, Trophy, Compass, Building2, Shield, Rocket, Target,
  type LucideIcon,
} from 'lucide-react';
```

Add after `scouting` entry in NAV_MAIN:
```typescript
export const NAV_MAIN: NavItem[] = [
  { label: 'home', href: '/', icon: Home },
  { label: 'market', href: '/market', icon: Briefcase },
  { label: 'fantasy', href: '/fantasy', icon: Trophy },
  { label: 'missions', href: '/missions', icon: Target },
  { label: 'club', href: '/club', icon: Building2 },
  { label: 'scouting', href: '/community', icon: Compass },
];
```

**Step 2: Add nav i18n keys**

In `messages/de.json` under `"nav"`:
```json
"missions": "Missionen"
```

In `messages/tr.json` under `"nav"`:
```json
"missions": "Görevler"
```

**Step 3: Add missions page i18n keys**

In `messages/de.json`, add new top-level section:
```json
"missions": {
  "title": "Missionen & Challenges",
  "subtitle": "Erledige Aufgaben, sammle Rewards und steige im Rang auf.",
  "dailySection": "Tägliche Challenge",
  "missionsSection": "Aktive Missionen",
  "progressSection": "Rang-Fortschritt",
  "streakSection": "Login-Streak",
  "streakDays": "{days} Tage in Folge",
  "streakShields": "{count} Schutzschilde übrig",
  "mysteryBoxSection": "Mystery Box",
  "noMissions": "Keine aktiven Missionen",
  "nextReset": "Nächster Reset"
}
```

In `messages/tr.json`, add matching section:
```json
"missions": {
  "title": "Görevler & Meydan Okumalar",
  "subtitle": "Görevleri tamamla, ödüller topla ve rütbeni yükselt.",
  "dailySection": "Günlük Meydan Okuma",
  "missionsSection": "Aktif Görevler",
  "progressSection": "Rütbe İlerlemesi",
  "streakSection": "Giriş Serisi",
  "streakDays": "{days} gün üst üste",
  "streakShields": "{count} kalkan kaldı",
  "mysteryBoxSection": "Gizem Kutusu",
  "noMissions": "Aktif görev yok",
  "nextReset": "Sonraki sıfırlama"
}
```

**Step 4: Create Missions Hub page**

Create `src/app/(app)/missions/page.tsx`:

```tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Flame, Shield } from 'lucide-react';
import dynamic from 'next/dynamic';

import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { useTodaysChallenge, useChallengeHistory } from '@/lib/queries/dailyChallenge';
import { useUserTickets } from '@/lib/queries/tickets';
import { submitDailyChallenge } from '@/lib/services/dailyChallenge';
import { openMysteryBox } from '@/lib/services/mysteryBox';
import { qk } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import { updateLoginStreak } from '@/components/home/helpers';
import { Loader2 } from 'lucide-react';

const DailyChallengeCard = dynamic(() => import('@/components/gamification/DailyChallengeCard'), {
  ssr: false,
  loading: () => <div className="h-40 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), {
  ssr: false,
  loading: () => <div className="h-32 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const ScoreRoadCard = dynamic(() => import('@/components/gamification/ScoreRoadCard'), {
  ssr: false,
  loading: () => <div className="h-48 rounded-2xl bg-white/[0.02] animate-pulse" />,
});
const MysteryBoxModal = dynamic(() => import('@/components/gamification/MysteryBoxModal'), {
  ssr: false,
});

export default function MissionsPage() {
  const { user, loading } = useUser();
  const uid = user?.id;
  const t = useTranslations('missions');
  const tg = useTranslations('gamification');

  // ── Queries ──
  const { data: todaysChallenge = null, isLoading: challengeLoading } = useTodaysChallenge();
  const { data: challengeHistory = [] } = useChallengeHistory(uid);
  const { data: ticketData = null } = useUserTickets(uid);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);

  // ── Streak ──
  const streak = useMemo(() => updateLoginStreak(), []);

  // ── Today's answer ──
  const todaysAnswer = useMemo(() => {
    if (!todaysChallenge || !challengeHistory.length) return null;
    return challengeHistory.find(h => h.challenge_id === todaysChallenge.id) ?? null;
  }, [todaysChallenge, challengeHistory]);

  // ── Handlers ──
  const handleChallengeSubmit = useCallback(async (challengeId: string, option: number) => {
    if (!uid) return;
    setIsSubmitting(true);
    try {
      await submitDailyChallenge(challengeId, option);
      queryClient.invalidateQueries({ queryKey: qk.dailyChallenge.history(uid) });
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) });
    } finally {
      setIsSubmitting(false);
    }
  }, [uid]);

  const handleOpenMysteryBox = useCallback(async (free?: boolean) => {
    if (!uid) return null;
    const result = await openMysteryBox(free);
    if (result.ok) {
      queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) });
      queryClient.invalidateQueries({ queryKey: qk.cosmetics.user(uid) });
      return {
        id: crypto.randomUUID(),
        rarity: result.rarity!,
        reward_type: result.reward_type!,
        tickets_amount: result.tickets_amount ?? null,
        cosmetic_id: result.cosmetic_key ?? null,
        ticket_cost: free ? 0 : 15,
        opened_at: new Date().toISOString(),
      };
    }
    return null;
  }, [uid]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" />
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Target className="size-5 text-gold" />
          <h1 className="text-xl font-black">{t('title')}</h1>
        </div>
        <p className="text-sm text-white/50">{t('subtitle')}</p>
      </div>

      {/* Streak Banner */}
      {streak > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <Flame className="size-5 text-orange-400 flex-shrink-0" />
          <span className="text-sm font-bold text-orange-300">
            {t('streakDays', { days: streak })}
          </span>
        </div>
      )}

      {/* Daily Challenge */}
      {uid && (
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
      )}

      {/* Active Missions */}
      <MissionBanner />

      {/* Score Road / Rang Progress */}
      {uid && <ScoreRoadCard userId={uid} />}

      {/* Mystery Box Modal */}
      <MysteryBoxModal
        open={showMysteryBox}
        onClose={() => setShowMysteryBox(false)}
        onOpen={handleOpenMysteryBox}
        ticketBalance={ticketData?.balance ?? 0}
      />
    </div>
  );
}
```

**Step 5: Build + verify**

Run: `npx next build`
Expected: 0 errors. New route `/missions` in build output.

**Step 6: Commit**

```bash
git add src/app/(app)/missions/page.tsx src/lib/nav.ts messages/de.json messages/tr.json
git commit -m "feat: missions hub page with nav item — consolidates challenges, missions, score road"
```

---

### Task 2: Achievements + Rang-Progression ins Profil

Add a new "Erfolge" (Achievements) section to the Profile that shows achievement gallery + rang progression.

**Files:**
- Create: `src/components/profile/AchievementsSection.tsx`
- Modify: `src/components/profile/ProfileView.tsx` (add tab)
- Modify: `src/types/index.ts` (extend ProfileTab)
- Modify: `messages/de.json` (i18n)
- Modify: `messages/tr.json` (i18n)

**Step 1: Extend ProfileTab type**

In `src/types/index.ts`, find `ProfileTab` type and add `'achievements'`:

Current (search for `ProfileTab`):
```typescript
export type ProfileTab = 'manager' | 'trader' | 'analyst' | 'timeline';
```
Change to:
```typescript
export type ProfileTab = 'manager' | 'trader' | 'analyst' | 'achievements' | 'timeline';
```

**Step 2: Add i18n keys**

In `messages/de.json` under `"profile"` (search for `"tabTimeline"`):
```json
"tabAchievements": "Erfolge",
"achievementsTitle": "Achievements",
"achievementsFeatured": "Haupt-Achievements",
"achievementsHidden": "Geheime Achievements",
"achievementsProgress": "{unlocked} von {total} freigeschaltet",
"achievementLocked": "Noch nicht freigeschaltet",
"rangProgression": "Rang-Fortschritt",
"rangNext": "Noch {points} Punkte bis {rang}",
"rangMax": "Maximaler Rang erreicht!",
"dimensionTrader": "Trader",
"dimensionManager": "Manager",
"dimensionAnalyst": "Analyst"
```

In `messages/tr.json` under `"profile"`:
```json
"tabAchievements": "Başarılar",
"achievementsTitle": "Başarılar",
"achievementsFeatured": "Ana Başarılar",
"achievementsHidden": "Gizli Başarılar",
"achievementsProgress": "{total} başarıdan {unlocked} tanesi açıldı",
"achievementLocked": "Henüz açılmadı",
"rangProgression": "Rütbe İlerlemesi",
"rangNext": "{rang} rütbesine {points} puan kaldı",
"rangMax": "Maksimum rütbeye ulaşıldı!",
"dimensionTrader": "Trader",
"dimensionManager": "Manager",
"dimensionAnalyst": "Analist"
```

**Step 3: Create AchievementsSection component**

Create `src/components/profile/AchievementsSection.tsx`:

```tsx
'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Lock, Star } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { getFeaturedAchievements, getHiddenAchievements } from '@/lib/achievements';
import { getRang, getGesamtRang, RANG_DEFS } from '@/lib/gamification';
import { ScoreProgress } from '@/components/profile/ScoreProgress';
import type { DbUserStats } from '@/types';

interface AchievementsSectionProps {
  userStats: DbUserStats | null;
  unlockedKeys: Set<string>;
  isSelf: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  trading: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  manager: 'text-sky-400 bg-sky-400/10 border-sky-400/20',
  scout: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
};

export default function AchievementsSection({ userStats, unlockedKeys, isSelf }: AchievementsSectionProps) {
  const t = useTranslations('profile');
  const tg = useTranslations('gamification');

  const featured = useMemo(() => getFeaturedAchievements(), []);
  const hidden = useMemo(() => getHiddenAchievements(), []);
  const totalUnlocked = useMemo(() => {
    const all = [...featured, ...hidden];
    return all.filter(a => unlockedKeys.has(a.key)).length;
  }, [featured, hidden, unlockedKeys]);

  const scores = useMemo(() => ({
    trader_score: userStats?.trading_score ?? 0,
    manager_score: userStats?.manager_score ?? 0,
    analyst_score: userStats?.scout_score ?? 0,
  }), [userStats]);

  const dimensions = [
    { key: 'trader', label: t('dimensionTrader'), score: scores.trader_score },
    { key: 'manager', label: t('dimensionManager'), score: scores.manager_score },
    { key: 'analyst', label: t('dimensionAnalyst'), score: scores.analyst_score },
  ];

  return (
    <div className="space-y-6">
      {/* Rang Progression */}
      <Card className="p-4">
        <h3 className="text-sm font-bold mb-4">{t('rangProgression')}</h3>
        <div className="space-y-4">
          {dimensions.map(dim => (
            <ScoreProgress
              key={dim.key}
              label={dim.label}
              score={dim.score}
              dimension={dim.key as 'trader' | 'manager' | 'analyst'}
            />
          ))}
        </div>
      </Card>

      {/* Achievement Progress Summary */}
      <div className="flex items-center gap-2 px-1">
        <Trophy className="size-4 text-gold" />
        <span className="text-sm font-bold">{t('achievementsTitle')}</span>
        <span className="text-xs text-white/40 ml-auto font-mono tabular-nums">
          {t('achievementsProgress', { unlocked: totalUnlocked, total: featured.length + hidden.length })}
        </span>
      </div>

      {/* Featured Achievements Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {featured.map(ach => {
          const unlocked = unlockedKeys.has(ach.key);
          return (
            <div
              key={ach.key}
              className={cn(
                'p-3 rounded-xl border transition-colors',
                unlocked
                  ? `${CATEGORY_COLORS[ach.category]} border`
                  : 'bg-white/[0.02] border-white/[0.06] opacity-50',
              )}
            >
              <div className="text-2xl mb-1.5">{ach.icon}</div>
              <p className={cn('text-xs font-bold', unlocked ? 'text-white' : 'text-white/40')}>
                {ach.label}
              </p>
              <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">
                {unlocked ? ach.description : t('achievementLocked')}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hidden Achievements */}
      {hidden.some(a => unlockedKeys.has(a.key)) && (
        <>
          <div className="flex items-center gap-2 px-1 mt-4">
            <Star className="size-4 text-white/30" />
            <span className="text-sm font-bold text-white/50">{t('achievementsHidden')}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {hidden.filter(a => unlockedKeys.has(a.key)).map(ach => (
              <div
                key={ach.key}
                className={cn('p-3 rounded-xl border', CATEGORY_COLORS[ach.category])}
              >
                <div className="text-2xl mb-1.5">{ach.icon}</div>
                <p className="text-xs font-bold text-white">{ach.label}</p>
                <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{ach.description}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

**Step 4: Add Achievements tab to ProfileView**

In `src/components/profile/ProfileView.tsx`:

Add dynamic import (near other tab imports):
```typescript
const AchievementsSection = dynamic(() => import('./AchievementsSection'));
```

Find where `tabDefs` is built and add achievements tab:
```typescript
const tabDefs = useMemo(() => [
  ...dimOrder.map(dim => ({
    id: dim,
    label: t(`tab${dim.charAt(0).toUpperCase() + dim.slice(1)}`),
  })),
  { id: 'achievements' as const, label: t('tabAchievements') },
  { id: 'timeline' as const, label: t('tabTimeline') },
], [dimOrder, t]);
```

Load unlocked achievements in the data fetch section. Search for `getUserStats` call and add:
```typescript
import { supabase } from '@/lib/supabase';
```

In the data loading `useEffect`, add:
```typescript
const [achResult] = await Promise.allSettled([
  supabase.from('user_achievements').select('achievement_key').eq('user_id', targetUserId),
]);
const achKeys = new Set<string>(
  (val(achResult)?.data ?? []).map((r: { achievement_key: string }) => r.achievement_key)
);
setUnlockedAchievements(achKeys);
```

Add state:
```typescript
const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
```

Add TabPanel after analyst and before timeline:
```tsx
<TabPanel id="achievements" activeTab={tab}>
  <AchievementsSection
    userStats={userStats}
    unlockedKeys={unlockedAchievements}
    isSelf={isSelf}
  />
</TabPanel>
```

**Step 5: Check ScoreProgress props**

Read `ScoreProgress.tsx` to verify it accepts `label`, `score`, `dimension` props. If the interface differs, adapt AchievementsSection accordingly. The component may use different prop names — check and align.

**Step 6: Build + verify**

Run: `npx next build`
Expected: 0 errors. Profile should show 5 tabs.

**Step 7: Commit**

```bash
git add src/components/profile/AchievementsSection.tsx src/components/profile/ProfileView.tsx src/types/index.ts messages/de.json messages/tr.json
git commit -m "feat: achievements tab in profile — achievement gallery + rang progression per dimension"
```

---

### Task 3: Intro Tour — 3 Konzept-Slides

Update existing tour with 3 introductory slides that explain BeScout's core concepts before the UI walkthrough.

**Files:**
- Modify: `src/components/tour/tourSteps.ts` (add 3 intro steps)
- Modify: `src/components/tour/TourOverlay.tsx` (support centered slides without spotlight)
- Modify: `messages/de.json` (i18n)
- Modify: `messages/tr.json` (i18n)

**Step 1: Add TourStep type for centered slides**

In `src/components/tour/tourSteps.ts`, extend TourStep:
```typescript
export type TourStep = {
  targetSelector: string;
  titleKey: string;
  descKey: string;
  position: TourStepPosition;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
  /** Show as centered card without spotlight */
  centered?: boolean;
  /** Emoji icon for centered slides */
  icon?: string;
};
```

**Step 2: Add 3 intro slides at beginning of TOUR_STEPS**

Insert at beginning of TOUR_STEPS array (before the balance step):
```typescript
// Intro Slide 1: Welcome
{
  targetSelector: '',
  titleKey: 'introWelcomeTitle',
  descKey: 'introWelcomeDesc',
  position: 'bottom',
  centered: true,
  icon: '👋',
},
// Intro Slide 2: Your Portfolio
{
  targetSelector: '',
  titleKey: 'introPortfolioTitle',
  descKey: 'introPortfolioDesc',
  position: 'bottom',
  centered: true,
  icon: '💼',
},
// Intro Slide 3: Three Dimensions
{
  targetSelector: '',
  titleKey: 'introDimensionsTitle',
  descKey: 'introDimensionsDesc',
  position: 'bottom',
  centered: true,
  icon: '🎯',
},
```

**Step 3: Update TourOverlay for centered mode**

In `src/components/tour/TourOverlay.tsx`, find where the tooltip is positioned. When `step.centered === true`, render as centered card instead of spotlight:

In the render logic, add before the spotlight calculation:
```tsx
if (currentStep.centered) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-sm mx-4 text-center shadow-2xl">
        {currentStep.icon && (
          <div className="text-4xl mb-3">{currentStep.icon}</div>
        )}
        <h3 className="text-lg font-black mb-2">{t(currentStep.titleKey)}</h3>
        <p className="text-sm text-white/60 leading-relaxed mb-6">{t(currentStep.descKey)}</p>
        <div className="flex gap-3">
          <button onClick={handleSkip} className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white/40 hover:bg-white/5 transition-colors">
            {t('skip')}
          </button>
          <button onClick={handleNext} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold bg-gold text-black hover:bg-gold/90 transition-colors">
            {t('next')}
          </button>
        </div>
        <div className="text-[10px] text-white/20 mt-3">
          {stepIndex + 1} / {steps.length}
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Add i18n keys**

In `messages/de.json` under `"tour"`:
```json
"introWelcomeTitle": "Willkommen bei BeScout!",
"introWelcomeDesc": "BeScout ist deine Fan-Plattform. Kaufe Digital Player Cards, spiele Fantasy-Turniere und analysiere Spieler — alles mit bCredits.",
"introPortfolioTitle": "Dein Portfolio aufbauen",
"introPortfolioDesc": "Kaufe DPCs (Digital Player Cards) am Marktplatz. Wenn der Marktwert steigt, profitierst du. Handle clever und baue dein Portfolio aus.",
"introDimensionsTitle": "Drei Wege zum Erfolg",
"introDimensionsDesc": "Trader: Handle am Markt. Manager: Gewinne Fantasy-Events. Analyst: Schreibe Research. Jede Dimension hat eigene Ränge — vom Bronze bis Legendär."
```

In `messages/tr.json` under `"tour"`:
```json
"introWelcomeTitle": "BeScout'a hoş geldin!",
"introWelcomeDesc": "BeScout senin fan platformun. Dijital Oyuncu Kartları satın al, Fantasy turnuvalarına katıl ve oyuncuları analiz et — hepsi bCredits ile.",
"introPortfolioTitle": "Portföyünü oluştur",
"introPortfolioDesc": "Pazaryerinden DPC'ler (Dijital Oyuncu Kartları) satın al. Piyasa değeri yükselirse kazanırsın. Akıllıca işlem yap ve portföyünü büyüt.",
"introDimensionsTitle": "Başarıya üç yol",
"introDimensionsDesc": "Trader: Piyasada işlem yap. Manager: Fantasy etkinliklerini kazan. Analist: Araştırma yaz. Her boyutun kendi rütbeleri var — Bronz'dan Efsanevi'ye."
```

**Step 5: Build + verify**

Run: `npx next build`
Expected: 0 errors.

**Step 6: Commit**

```bash
git add src/components/tour/tourSteps.ts src/components/tour/TourOverlay.tsx messages/de.json messages/tr.json
git commit -m "feat: 3-slide intro tour — welcome, portfolio, dimensions concepts before UI walkthrough"
```

---

## Verification Checklist

- [ ] `npx next build` → 0 errors
- [ ] `/missions` route loads with Challenge, Missions, Score Road sections
- [ ] Nav item "Missionen" appears between Fantasy and Club in SideNav
- [ ] Profile shows new "Erfolge" tab with achievement grid + rang progression
- [ ] Achievements: unlocked show colored, locked show faded
- [ ] Rang progression shows 3 dimensions with progress bars
- [ ] Tour: new user sees 3 intro slides before UI walkthrough
- [ ] Tour: centered slides have backdrop, icon, title, desc, skip/next
- [ ] Mobile: all 3 features work on 360px width
