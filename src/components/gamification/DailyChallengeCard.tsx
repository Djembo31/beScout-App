'use client';

import React, { useState } from 'react';
import { Zap, Check, X as XIcon, Ticket, Flame, AlertCircle } from 'lucide-react';
import { Card, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { DbDailyChallenge } from '@/types';

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
}

export default function DailyChallengeCard({
  challenge,
  userAnswer,
  onSubmit,
  isSubmitting = false,
  streakDays = 0,
  isLoading = false,
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

  // No challenge today
  if (!challenge) {
    return (
      <Card className="p-4 md:p-5 border-white/[0.08]">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="size-4 text-white/30" />
          <span className="font-black text-sm text-white/50">{t('dailyChallenge')}</span>
        </div>
        <p className="text-sm text-white/30">{t('noChallengeToday')}</p>
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
    return 'bg-white/[0.02] border-white/[0.05] text-white/25';
  };

  const streakBonusThreshold = 7;
  const streakRemaining = streakBonusThreshold - (streakDays % streakBonusThreshold);

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
          <span className="text-[10px] font-mono tabular-nums text-gold/60 flex items-center gap-1">
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
              'relative px-3 py-2.5 rounded-xl border text-sm font-medium transition-all min-h-[44px]',
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

      {/* Streak Counter */}
      {streakDays > 0 && (
        <div className="mt-3 flex items-center justify-between text-[11px] text-white/40">
          <span className="flex items-center gap-1">
            <Flame className="size-3 text-orange-400" />
            {t('streakDays', { days: streakDays })}
          </span>
          {streakRemaining > 0 && streakRemaining < streakBonusThreshold && (
            <span>{t('streakBonus', { remaining: streakRemaining })}</span>
          )}
        </div>
      )}
    </Card>
  );
}
