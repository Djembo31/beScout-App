'use client';

import React from 'react';
import { Shield, Star, Gem, Crown, Flame, TrendingUp } from 'lucide-react';
import { getRang, getGesamtRang, getDimensionColor, getDimensionBgColor, getDimensionBorderColor, type RangId, type DimensionScores, type Dimension } from '@/lib/gamification';
import { useTranslations } from 'next-intl';

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
  sm: { badge: 'px-2 py-0.5 gap-1', icon: 'w-3 h-3', text: 'text-[10px]' },
  md: { badge: 'px-2.5 py-1 gap-1.5', icon: 'w-3.5 h-3.5', text: 'text-[11px]' },
  lg: { badge: 'px-3 py-1.5 gap-2', icon: 'w-4 h-4', text: 'text-xs' },
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
  const rang = scores ? getGesamtRang(scores) : getRang(score ?? 0);
  const displayScore = scores
    ? Math.round((scores.trader_score + scores.manager_score + scores.analyst_score) / 3)
    : (score ?? 0);
  const Icon = RANG_ICONS[rang.id];
  const s = sizeClasses[size];
  const rangLabel = t(`rang.${rang.i18nKey}`);

  return (
    <span
      className={`inline-flex items-center rounded-xl border font-black ${rang.bgColor} ${rang.borderColor} ${rang.color} ${s.badge} ${className}`}
      title={`${rangLabel} — ${displayScore.toLocaleString('de-DE')} Punkte`}
    >
      <Icon className={s.icon} />
      <span className={s.text}>{rangLabel}</span>
      {showScore && (
        <span className={`${s.text} font-mono opacity-70`}>
          {displayScore.toLocaleString('de-DE')}
        </span>
      )}
    </span>
  );
}

/** Kompakte Rang-Anzeige nur mit Icon + Score (für Leaderboards, Tabellen) */
export function RangScorePill({ score, className = '' }: { score: number; className?: string }) {
  const t = useTranslations('gamification');
  const rang = getRang(score);
  const Icon = RANG_ICONS[rang.id];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${rang.bgColor} ${rang.borderColor} border ${rang.color} ${className}`}
      title={t(`rang.${rang.i18nKey}`)}
    >
      <Icon className="w-3 h-3" />
      <span className="text-[11px] font-mono font-bold">{score.toLocaleString('de-DE')}</span>
    </span>
  );
}

/** Score-Fortschrittsbalken zum nächsten Rang */
export function RangProgress({ score, className = '' }: { score: number; className?: string }) {
  const rang = getRang(score);
  const minScore = rang.minScore;
  const maxScore = rang.maxScore;

  if (maxScore === null) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${rang.gradientFrom} to-transparent w-full`} />
        </div>
        <span className={`text-[10px] font-mono ${rang.color}`}>MAX</span>
      </div>
    );
  }

  const range = maxScore - minScore + 1;
  const progress = Math.min(((score - minScore) / range) * 100, 100);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${rang.gradientFrom} to-white/20 transition-all`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-white/40">
        {(maxScore + 1 - score).toLocaleString('de-DE')}
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
    <div className={`flex items-center justify-between gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${dimColor} w-16`}>
          {t(`dimension.${dimension}`)}
        </span>
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border ${rang.bgColor} ${rang.borderColor} ${rang.color}`}>
          <Icon className="w-3 h-3" />
          <span className="text-[10px] font-bold">{t(`rang.${rang.i18nKey}`)}</span>
        </span>
      </div>
      <span className="text-[11px] font-mono text-white/50">{score.toLocaleString('de-DE')}</span>
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
    <div className={`flex flex-col gap-1.5 ${className}`}>
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
