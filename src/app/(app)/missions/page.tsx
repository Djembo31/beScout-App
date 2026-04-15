'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Flame, Sparkles } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import NewUserTip from '@/components/onboarding/NewUserTip';

import { useUser } from '@/components/providers/AuthProvider';
import { useTodaysChallenge, useChallengeHistory } from '@/lib/queries/dailyChallenge';
import { useUserTickets } from '@/lib/queries/tickets';
import { useHasFreeBoxToday } from '@/lib/queries/mysteryBox';
import { useUserStats } from '@/lib/queries';
import { useLoginStreak } from '@/lib/queries/streaks';
import { submitDailyChallenge } from '@/lib/services/dailyChallenge';
import { openMysteryBox } from '@/lib/services/mysteryBox';
import { getUserAchievements } from '@/lib/services/social';
import { qk } from '@/lib/queries';
import { queryClient } from '@/lib/queryClient';
import { getStreakBenefits, getStreakBenefitLabels } from '@/lib/streakBenefits';
import { getStreakMilestone } from '@/lib/retentionEngine';
import { MissionDisclaimer } from '@/components/legal/MissionDisclaimer';

const DailyChallengeCard = dynamic(() => import('@/components/gamification/DailyChallengeCard'), {
  ssr: false,
  loading: () => <div className="h-40 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none" />,
});
const MissionBanner = dynamic(() => import('@/components/missions/MissionBanner'), {
  ssr: false,
  loading: () => <div className="h-32 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none" />,
});
const ScoreRoadCard = dynamic(() => import('@/components/gamification/ScoreRoadCard'), {
  ssr: false,
  loading: () => <div className="h-48 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none" />,
});
const MysteryBoxModal = dynamic(() => import('@/components/gamification/MysteryBoxModal'), {
  ssr: false,
});
const StreakMilestoneBanner = dynamic(() => import('@/components/missions/StreakMilestoneBanner'), {
  ssr: false,
  loading: () => <div className="h-16 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none" />,
});
const AchievementsSection = dynamic(() => import('@/components/missions/AchievementsSection'), {
  ssr: false,
  loading: () => <div className="h-48 rounded-2xl bg-surface-minimal animate-pulse motion-reduce:animate-none" />,
});

export default function MissionsPage() {
  const { user, loading } = useUser();
  const uid = user?.id;
  const t = useTranslations('missions');
  // Streak-Benefit Labels live in the `common` namespace (streakTickets,
  // streakFantasy, streakElo, streakMysteryBox, streakMysteryDiscount).
  const tc = useTranslations('common');

  // ── Queries ──
  const { data: todaysChallenge = null, isLoading: challengeLoading } = useTodaysChallenge();
  const { data: challengeHistory = [] } = useChallengeHistory(uid);
  const { data: ticketData = null } = useUserTickets(uid);
  const { data: userStats = null } = useUserStats(uid);
  const { hasFreeBoxToday } = useHasFreeBoxToday(uid);
  const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);

  // ── Streak — DB-authoritative via React Query (J7F-01 fix) ──
  // Was: getLoginStreak() from localStorage → returned 0 for deep-link users
  // who entered /missions without first visiting /home.
  // Now: useLoginStreak triggers record_login_streak RPC (idempotent) and
  // shares the result via React Query cache (60s stale).
  const { streak } = useLoginStreak(uid);
  const streakBenefits = useMemo(() => getStreakBenefits(streak), [streak]);
  // Pass the common-namespace translator so labels are localized in TR (FIX-06).
  // The keys (streakTickets, streakFantasy, …) live under "common" in messages/.
  // The `params.n` is always a number from getStreakBenefitLabels — narrow the type.
  const benefitLabels = useMemo(
    () =>
      getStreakBenefitLabels(streak, (key, params) =>
        tc(key, params as Record<string, string | number | Date>),
      ),
    [streak, tc],
  );
  const streakMilestone = useMemo(() => getStreakMilestone(streak), [streak]);

  // ── Unlocked Achievements ──
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getUserAchievements(uid)
      .then(rows => {
        if (cancelled) return;
        setUnlockedAchievements(new Set(rows.map(r => r.achievement_key)));
      })
      .catch(err => console.error('[MissionsPage] getUserAchievements:', err));
    return () => { cancelled = true; };
  }, [uid]);

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
    if (!result.ok) {
      throw new Error(result.error ?? 'Unknown error');
    }
    queryClient.invalidateQueries({ queryKey: qk.tickets.balance(uid) });
    if (result.rewardType === 'cosmetic') {
      queryClient.invalidateQueries({ queryKey: qk.cosmetics.user(uid) });
    }
    if (result.rewardType === 'equipment') {
      queryClient.invalidateQueries({ queryKey: qk.equipment.inventory(uid) });
    }
    if (result.rewardType === 'bcredits') {
      queryClient.invalidateQueries({ queryKey: qk.wallet.all });
    }
    if (free) {
      queryClient.invalidateQueries({ queryKey: qk.mysteryBox.freeBoxToday(uid) });
    }
    const effectiveCost = free ? 0 : Math.max(1, 15 - (streakBenefits.mysteryBoxTicketDiscount ?? 0));
    return {
      id: crypto.randomUUID(),
      rarity: result.rarity!,
      reward_type: result.rewardType!,
      tickets_amount: result.ticketsAmount ?? null,
      cosmetic_id: result.cosmeticKey ?? null,
      equipment_type: result.equipmentType ?? null,
      equipment_rank: result.equipmentRank ?? null,
      bcredits_amount: result.bcreditsAmount ?? null,
      ticket_cost: effectiveCost,
      opened_at: new Date().toISOString(),
      equipment_name_de: result.equipmentNameDe,
      equipment_name_tr: result.equipmentNameTr,
      equipment_position: result.equipmentPosition,
    } as import('@/types').MysteryBoxResult & {
      equipment_name_de?: string;
      equipment_name_tr?: string;
      equipment_position?: string;
    };
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
                <span key={label} className="text-[10px] px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-300/80 border border-orange-400/15">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Streak Milestone Banner (when user exactly hits a milestone day) */}
      {streakMilestone && <StreakMilestoneBanner milestone={streakMilestone} />}

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

      {/* Achievements (moved from Profile in 3-hub refactor) */}
      {uid && <AchievementsSection userStats={userStats} unlockedKeys={unlockedAchievements} />}

      {/* Compliance-Disclaimer (AR-56 Journey #7) — virtuelle Plattform-Guthaben, keine Auszahlung */}
      <MissionDisclaimer variant="card" />

      {/* Mystery Box Modal — server-authoritative daily gate via useHasFreeBoxToday */}
      <MysteryBoxModal
        open={showMysteryBox}
        onClose={() => setShowMysteryBox(false)}
        onOpen={handleOpenMysteryBox}
        ticketBalance={ticketData?.balance ?? 0}
        hasFreeBox={hasFreeBoxToday}
        ticketDiscount={streakBenefits.mysteryBoxTicketDiscount}
      />
    </div>
  );
}
