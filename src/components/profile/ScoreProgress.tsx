'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { getRang, getDimensionColor, getDimensionBgColor, getDimensionBorderColor, type Dimension } from '@/lib/gamification';
import { useTranslations, useLocale } from 'next-intl';

// ============================================
// SCORE PROGRESS — Dimension score + rank + progress bar
// ============================================

interface ScoreProgressProps {
  dimension: Dimension;
  score: number;
  className?: string;
}

/** Solid bg class for dimension progress bar fill */
function getDimensionBarColor(dim: Dimension): string {
  switch (dim) {
    case 'trader': return 'bg-sky-400';
    case 'manager': return 'bg-purple-400';
    case 'analyst': return 'bg-emerald-400';
  }
}

const LABEL_KEYS: Record<Dimension, string> = {
  manager: 'managerScore',
  trader: 'traderScore',
  analyst: 'analystScore',
};

export default function ScoreProgress({ dimension, score, className }: ScoreProgressProps) {
  const t = useTranslations('profile');
  const tg = useTranslations('gamification');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';

  const rang = getRang(score);
  const rangLabel = tg(`rang.${rang.i18nKey}`);
  const isMax = rang.maxScore === null;

  // Progress calculation
  let progress = 100;
  let pointsToNext = 0;
  let nextRangLabel = '';

  if (!isMax) {
    const range = rang.maxScore - rang.minScore + 1;
    progress = Math.min(((score - rang.minScore) / range) * 100, 100);
    pointsToNext = rang.maxScore - score + 1;
    const nextRang = getRang(rang.maxScore + 1);
    nextRangLabel = tg(`rang.${nextRang.i18nKey}`);
  }

  const dimColor = getDimensionColor(dimension);
  const dimBgColor = getDimensionBgColor(dimension);
  const dimBorderColor = getDimensionBorderColor(dimension);
  const barColor = getDimensionBarColor(dimension);

  return (
    <div className={cn('p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02]', className)}>
      {/* Header: Label + Score Pill */}
      <div className="flex items-center justify-between mb-3">
        <span className={cn('text-[13px] font-bold', dimColor)}>
          {t(LABEL_KEYS[dimension])}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border font-mono font-bold tabular-nums text-[12px]',
            dimColor, dimBgColor, dimBorderColor
          )}
        >
          {score.toLocaleString(numLocale)}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2" role="progressbar" aria-valuenow={score} aria-valuemin={rang.minScore} aria-valuemax={rang.maxScore ?? score}>
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', barColor)}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Footer: Current Rank + Points to next */}
      <div className="flex items-center justify-between">
        <span className={cn('text-[11px] font-bold', rang.color)}>
          {rangLabel}
        </span>
        {!isMax ? (
          <span className="text-[11px] text-white/40">
            {t('scoreProgress', { points: pointsToNext.toLocaleString(numLocale), rang: nextRangLabel })}
          </span>
        ) : (
          <span className={cn('text-[11px] font-mono font-bold tabular-nums', rang.color)}>
            MAX
          </span>
        )}
      </div>
    </div>
  );
}
