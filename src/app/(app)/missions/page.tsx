'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Flame, Sparkles } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import NewUserTip from '@/components/onboarding/NewUserTip';

import { useUser } from '@/components/providers/AuthProvider';
import { useTodaysChallenge, useChallengeHistory } from '@/lib/queries/dailyChallenge';
import { useUserTickets } from '@/lib/queries/tickets';
import { submitDailyChallenge } from '@/lib/services/dailyChallenge';
import { openMysteryBox } from '@/lib/services/mysteryBox';
import { qk } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import { getLoginStreak } from '@/components/home/helpers';
import { getStreakBenefits, getStreakBenefitLabels } from '@/lib/streakBenefits';

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

  // ── Queries ──
  const { data: todaysChallenge = null, isLoading: challengeLoading } = useTodaysChallenge();
  const { data: challengeHistory = [] } = useChallengeHistory(uid);
  const { data: ticketData = null } = useUserTickets(uid);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);

  // ── Streak (read-only) ──
  const streak = useMemo(() => getLoginStreak().current, []);
  const streakBenefits = useMemo(() => getStreakBenefits(streak), [streak]);
  const benefitLabels = useMemo(() => getStreakBenefitLabels(streak), [streak]);

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
      const effectiveCost = free ? 0 : Math.max(1, 15 - (streakBenefits.mysteryBoxTicketDiscount ?? 0));
      // Track free box claim per week (client-side)
      if (free) {
        const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        localStorage.setItem('bescout-free-box-week', String(currentWeek));
      }
      return {
        id: crypto.randomUUID(),
        rarity: result.rarity!,
        reward_type: result.rewardType!,
        tickets_amount: result.ticketsAmount ?? null,
        cosmetic_id: result.cosmeticKey ?? null,
        ticket_cost: effectiveCost,
        opened_at: new Date().toISOString(),
      };
    }
    return null;
  }, [uid, streakBenefits.mysteryBoxTicketDiscount]);

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
          <h1 className="text-xl font-black">{t('pageTitle')}</h1>
        </div>
        <p className="text-sm text-white/50">{t('pageSubtitle')}</p>
      </div>

      {/* New User Tip */}
      <NewUserTip
        tipKey="missions-intro"
        icon={<Sparkles className="size-4" />}
        title={t('tipTitle')}
        description={t('tipDesc')}
        show={streak <= 1}
      />

      {/* Streak Banner + Active Benefits */}
      {streak > 0 && (
        <div className="px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <div className="flex items-center gap-3">
            <Flame className="size-5 text-orange-400 flex-shrink-0" />
            <span className="text-sm font-bold text-orange-300">
              {t('streakDays', { days: streak })}
            </span>
          </div>
          {benefitLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {benefitLabels.map((label) => (
                <span key={label} className="text-[11px] px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-300/80 border border-orange-400/15">
                  {label}
                </span>
              ))}
            </div>
          )}
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
        hasFreeBox={(() => {
          if (streakBenefits.freeMysteryBoxesPerWeek <= 0) return false;
          const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
          const lastFreeBoxWeek = parseInt(localStorage.getItem('bescout-free-box-week') || '0');
          return lastFreeBoxWeek < currentWeek;
        })()}
        ticketDiscount={streakBenefits.mysteryBoxTicketDiscount}
      />
    </div>
  );
}
