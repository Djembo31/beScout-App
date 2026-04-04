'use client';

import React from 'react';
import { Shield, Star, Gem, Crown, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRang, getGesamtRang, getDimensionColor, getDimensionBgColor, getDimensionBorderColor, type RangId, type DimensionScores, type Dimension } from '@/lib/gamification';
import { useTranslations, useLocale } from 'next-intl';

// ============================================
// RANG BADGE — 3-Dimension Elo System
// ============================================

const RANG_ICONS: Record<RangId, React.ElementType> = {
  bronze: Shield,
  silber: Shield,
  gold: Star,
  diamant: Gem,
  mythisch: Crown,
  legendaer: Flame,
};

type RangBadgeSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<RangBadgeSize, { badge: string; icon: string; text: string }> = {
  sm: { badge: 'px-2 py-0.5 gap-1', icon: 'size-3', text: 'text-[10px]' },
  md: { badge: 'px-2.5 py-1 gap-1.5', icon: 'size-3.5', text: 'text-[10px]' },
  lg: { badge: 'px-3 py-1.5 gap-2', icon: 'size-4', text: 'text-xs' },
};

export interface RangBadgeProps {
  /** Single dimension score — renders that dimension's rang */
  score?: number;
  /** 3 dimension scores — renders the Gesamt-Rang (median) */
  scores?: DimensionScores;
  size?: RangBadgeSize;
  showScore?: boolean;
  className?: string;
}

export function RangBadge({ score, scores, size = 'md', showScore, className = '' }: RangBadgeProps) {
  const t = useTranslations('gamification');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const rang = scores ? getGesamtRang(scores) : getRang(score ?? 0);
  const displayScore = scores
    ? Math.round((scores.trader_score + scores.manager_score + scores.analyst_score) / 3)
    : (score ?? 0);
  const Icon = RANG_ICONS[rang.id];
  const s = sizeClasses[size];
  const rangLabel = t(`rang.${rang.i18nKey}`);

  return (
    <span
      className={cn('inline-flex items-center rounded-xl border font-black', rang.bgColor, rang.borderColor, rang.color, s.badge, className)}
      title={`${rangLabel} — ${displayScore.toLocaleString(numLocale)} ${t('pointsLabel')}`}
    >
      <Icon className={s.icon} aria-hidden="true" />
      <span className={s.text}>{rangLabel}</span>
      {showScore && (
        <span className={cn(s.text, 'font-mono tabular-nums opacity-70')}>
          {displayScore.toLocaleString(numLocale)}
        </span>
      )}
    </span>
  );
}

/** Kompakte Rang-Anzeige nur mit Icon + Score (für Leaderboards, Tabellen) */
export function RangScorePill({ score, className = '' }: { score: number; className?: string }) {
  const t = useTranslations('gamification');
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const rang = getRang(score);
  const Icon = RANG_ICONS[rang.id];

  return (
    <span
      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border', rang.bgColor, rang.borderColor, rang.color, className)}
      title={t(`rang.${rang.i18nKey}`)}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="text-[10px] font-mono font-bold tabular-nums">{score.toLocaleString(numLocale)}</span>
    </span>
  );
}

/** Score-Fortschrittsbalken zum nächsten Rang */
export function RangProgress({ score, className = '' }: { score: number; className?: string }) {
  const locale = useLocale();
  const numLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';
  const rang = getRang(score);
  const minScore = rang.minScore;
  const maxScore = rang.maxScore;

  if (maxScore === null) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="flex-1 h-1.5 rounded-full bg-surface-base overflow-hidden">
          <div className={cn('h-full rounded-full w-full', rang.bgColor)} />
        </div>
        <span className={cn('text-[10px] font-mono tabular-nums', rang.color)}>MAX</span>
      </div>
    );
  }

  const range = maxScore - minScore + 1;
  const progress = Math.min(((score - minScore) / range) * 100, 100);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 rounded-full bg-surface-base overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-[width]', rang.bgColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-white/40">
        {(maxScore + 1 - score).toLocaleString(numLocale)}
      </span>
    </div>
  );
}

// ============================================
// DIMENSION RANG ROW (for leaderboards)
// ============================================

export function DimensionRangRow({ dimension, score, className = '' }: {
  dimension: Dimension;
  score: number;
  className?: string;
}) {
  const t = useTranslations('gamification');
  const rang = getRang(score);
  const Icon = RANG_ICONS[rang.id];
  const dimColor = getDimensionColor(dimension);

  return (
    <div className={cn('flex items-center justify-between gap-2', className)}>
      <div className="flex items-center gap-2">
        <span className={cn('text-[10px] font-bold uppercase w-16', dimColor)}>
          {t(`dimension.${dimension}`)}
        </span>
        <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border', rang.bgColor, rang.borderColor, rang.color)}>
          <Icon className="size-3" aria-hidden="true" />
          <span className="text-[10px] font-bold">{t(`rang.${rang.i18nKey}`)}</span>
        </span>
      </div>
      <span className="text-[10px] font-mono tabular-nums text-white/50">{score.toLocaleString('de-DE')}</span>
    </div>
  );
}

// ============================================
// DIMENSION RANG STACK (for profile, 3 rows)
// ============================================

export function DimensionRangStack({ scores, className = '' }: {
  scores: DimensionScores;
  className?: string;
}) {
  const dimensions: Dimension[] = ['trader', 'manager', 'analyst'];

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {dimensions.map(dim => (
        <DimensionRangRow
          key={dim}
          dimension={dim}
          score={scores[`${dim}_score`]}
        />
      ))}
    </div>
  );
}
