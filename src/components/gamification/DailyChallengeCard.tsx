'use client';

import React, { useState } from 'react';
import { Zap, Check, X as XIcon, Ticket, Flame, AlertCircle, Gift } from 'lucide-react';
import { Card, Button, Skeleton, InfoTooltip } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { DbDailyChallenge } from '@/types';
import { getStreakBenefitLabels } from '@/lib/streakBenefits';

// ============================================
// DAILY CHALLENGE CARD
// ============================================

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
  const t = useTranslations('gamification');
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <Card className="p-4 md:p-5 border-amber-500/20">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-5 w-full mb-4" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
      </Card>
    );
  }

  // No challenge today (or malformed data)
  if (!challenge || !Array.isArray(challenge.options)) {
    return (
      <Card className="p-4 md:p-5 border-white/[0.08]">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="size-4 text-white/30" />
          <span className="font-black text-sm text-white/50">{t('dailyChallenge')}</span>
        </div>
        <p className="text-sm text-white/30">{t('noChallengeToday')}</p>
        {onOpenMysteryBox && (
          <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] text-white/50">
              <Ticket className="size-3.5 text-gold/60" />
              <span className="font-mono font-bold text-white/70">{ticketBalance}</span>
              {' '}{t('tickets')}
              <InfoTooltip text={t('ticketsTooltip')} />
            </span>
            <button
              onClick={onOpenMysteryBox}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/[0.08] border border-gold/15 text-[11px] font-bold text-gold hover:bg-gold/[0.12] active:scale-[0.97] transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Gift className="size-3.5" />
              {t('mysteryBox')}
            </button>
          </div>
        )}
      </Card>
    );
  }

  const hasAnswered = userAnswer !== null;
  const isCorrect = userAnswer?.isCorrect ?? null;

  const handleSubmit = async (idx: number) => {
    if (hasAnswered || isSubmitting) return;
    setError(null);
    setSelectedIdx(idx);
    try {
      await onSubmit(challenge.id, idx);
    } catch (err) {
      console.error('DailyChallengeCard submit error:', err);
      setError(t('submitError'));
    }
  };

  // Determine option styling after answer
  const getOptionClass = (idx: number): string => {
    if (!hasAnswered) {
      return 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15 text-white/80';
    }

    const wasSelected = userAnswer.selectedOption === idx;

    // Find correct option — correct option is always the one that isCorrect=true was triggered by
    if (wasSelected && isCorrect) {
      return 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
    }
    if (wasSelected && !isCorrect) {
      return 'bg-red-500/15 border-red-500/30 text-red-400';
    }
    // Non-selected options are dimmed
    return 'bg-surface-minimal border-white/[0.05] text-white/25';
  };

  const streakBonusThreshold = 7;
  const streakRemaining = streakBonusThreshold - (streakDays % streakBonusThreshold);
  const benefitLabels = streakDays >= 4 ? getStreakBenefitLabels(streakDays) : [];

  return (
    <Card className="p-4 md:p-5 border-amber-500/20 overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <Zap className="size-4 text-amber-400" />
          </div>
          <span className="font-black text-sm">{t('dailyChallenge')}</span>
        </div>
        {!hasAnswered && (
          <span className="text-[11px] font-mono tabular-nums text-gold/60 flex items-center gap-1">
            <Ticket className="size-3" />
            +{challenge.reward_correct}
          </span>
        )}
      </div>

      {/* Question */}
      <p className="text-sm text-white/80 font-medium mb-4 leading-relaxed">
        {challenge.question_de}
      </p>

      {/* Options Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {challenge.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSubmit(idx)}
            disabled={hasAnswered || isSubmitting}
            aria-label={`${t('selectOption', { option: String.fromCharCode(65 + idx) })}: ${option}`}
            className={cn(
              'relative px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors min-h-[44px]',
              'focus-visible:ring-2 focus-visible:ring-gold/50 outline-none',
              getOptionClass(idx),
              !hasAnswered && !isSubmitting && 'active:scale-[0.97] cursor-pointer',
              (hasAnswered || isSubmitting) && 'cursor-default',
              isSubmitting && selectedIdx === idx && 'animate-pulse motion-reduce:animate-none',
            )}
          >
            <span className="relative z-10">{option}</span>
            {hasAnswered && userAnswer.selectedOption === idx && isCorrect && (
              <Check className="absolute top-1 right-1 size-3.5 text-emerald-400" />
            )}
            {hasAnswered && userAnswer.selectedOption === idx && !isCorrect && (
              <XIcon className="absolute top-1 right-1 size-3.5 text-red-400" />
            )}
          </button>
        ))}
      </div>

      {/* Result Banner */}
      {hasAnswered && (
        <div className={cn(
          'mt-4 flex items-center justify-between p-3 rounded-xl border',
          isCorrect
            ? 'bg-emerald-500/10 border-emerald-500/20'
            : 'bg-red-500/10 border-red-500/20',
        )}>
          <span className={cn('text-sm font-bold', isCorrect ? 'text-emerald-400' : 'text-red-400')}>
            {isCorrect ? t('correct') : t('wrong')}
          </span>
          <span className={cn(
            'flex items-center gap-1 text-sm font-mono tabular-nums font-bold',
            isCorrect ? 'text-gold' : 'text-white/50',
          )}>
            <Ticket className="size-3.5" />
            {t('ticketsEarned', { amount: userAnswer.ticketsAwarded })}
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mt-3 flex items-center gap-1.5">
          <AlertCircle className="size-3.5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Streak Counter + Active Benefits */}
      {streakDays > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-white/40">
            <span className="flex items-center gap-1">
              <Flame className="size-3 text-orange-400" />
              {t('streakDays', { days: streakDays })}
              <InfoTooltip text={t('streakTooltip')} />
            </span>
            {streakRemaining > 0 && streakRemaining < streakBonusThreshold && (
              <span>{t('streakBonus', { remaining: streakRemaining })}</span>
            )}
          </div>
          {benefitLabels.length > 1 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {benefitLabels.slice(1).map((label) => (
                <span key={label} className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-400/10 text-orange-300/70">
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer — Ticket Balance + Mystery Box */}
      {onOpenMysteryBox && (
        <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] text-white/50">
            <Ticket className="size-3.5 text-gold/60" />
            <span className="font-mono font-bold text-white/70">{ticketBalance}</span>
            {' '}{t('tickets')}
            <InfoTooltip text={t('ticketsTooltip')} />
          </span>
          <button
            onClick={onOpenMysteryBox}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gold/[0.08] border border-gold/15 text-[11px] font-bold text-gold hover:bg-gold/[0.12] active:scale-[0.97] transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            <Gift className="size-3.5" />
            {t('mysteryBox')}
          </button>
        </div>
      )}
    </Card>
  );
}
