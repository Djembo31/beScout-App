'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { Target, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCORE_ROAD, getMedianScore, getRang, type ScoreRoadMilestone } from '@/lib/gamification';
import { useScoutScores, useScoreRoadClaims } from '@/lib/queries/gamification';
import { useScoreRoadConfig } from '@/lib/queries/economyConfig';
import { useTranslations } from 'next-intl';

// ============================================
// SCORE ROAD STRIP — Compact progress indicator
// ============================================

interface ScoreRoadStripProps {
  userId: string;
  compact?: boolean;
}

export default function ScoreRoadStrip({ userId, compact }: ScoreRoadStripProps) {
  const t = useTranslations('gamification');
  const tsr = useTranslations('gamification.scoreRoad');
  const { data: scores, isLoading: scoresLoading } = useScoutScores(userId);
  const { data: claims = [], isLoading: claimsLoading } = useScoreRoadClaims(userId);
  const { data: dbScoreRoad } = useScoreRoadConfig();

  // DB-driven Score Road with fallback
  const scoreRoad: ScoreRoadMilestone[] = useMemo(() => {
    if (!dbScoreRoad || dbScoreRoad.length === 0) return SCORE_ROAD;
    return dbScoreRoad.map(r => ({
      score: r.score_threshold, rangName: r.rang_name, rangI18nKey: r.rang_i18n_key,
      rewardBsd: r.reward_cents, rewardLabel: r.reward_label,
      rewardType: r.reward_type as 'bsd' | 'cosmetic' | 'both',
    }));
  }, [dbScoreRoad]);

  const medianScore = scores ? getMedianScore(scores) : 0;
  const rang = scores ? getRang(medianScore) : null;

  const claimedSet = useMemo(() => new Set(claims.map(c => c.milestone)), [claims]);

  // Find next unclaimed milestone
  const nextMilestone = useMemo(() => {
    return scoreRoad.find(ms => !claimedSet.has(ms.score) && medianScore < ms.score) ?? null;
  }, [claimedSet, medianScore, scoreRoad]);

  // Count claimable (reached but not claimed)
  const claimableCount = useMemo(() => {
    return scoreRoad.filter(ms => medianScore >= ms.score && !claimedSet.has(ms.score)).length;
  }, [claimedSet, medianScore, scoreRoad]);

  // Progress toward next milestone
  const progress = useMemo(() => {
    if (!nextMilestone) return 100;
    // Find the previous milestone score as the base
    const idx = scoreRoad.indexOf(nextMilestone);
    const prevScore = idx > 0 ? scoreRoad[idx - 1].score : 0;
    const range = nextMilestone.score - prevScore;
    if (range <= 0) return 100;
    const current = Math.max(0, medianScore - prevScore);
    return Math.min(100, Math.round((current / range) * 100));
  }, [nextMilestone, medianScore]);

  // Loading skeleton
  if (scoresLoading || claimsLoading) {
    return (
      <div className="h-10 rounded-xl bg-surface-minimal border border-divider animate-pulse motion-reduce:animate-none" />
    );
  }

  // No scores yet — don't render
  if (!scores || !rang) return null;

  const allComplete = !nextMilestone && claimableCount === 0;

  return (
    <Link
      href="/profile"
      className={cn(
        'group flex items-center gap-3 px-3 py-2 rounded-xl',
        'bg-surface-minimal border border-divider',
        'hover:bg-surface-elevated hover:border-white/10 transition-colors',
        compact && 'gap-2 px-2.5 py-1.5',
      )}
      aria-label={tsr('title')}
    >
      {/* Rang icon */}
      <div className={cn(
        'flex items-center justify-center size-7 rounded-lg shrink-0',
        rang.bgColor, rang.borderColor, 'border',
      )}>
        <Target className={cn('size-3.5', rang.color)} />
      </div>

      {/* Rang name */}
      <span className={cn(
        'text-xs font-bold shrink-0',
        rang.color,
      )}>
        {t(`rang.${rang.i18nKey}`)}
      </span>

      {/* Progress bar */}
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-colors duration-500',
              allComplete ? 'bg-gold' : 'bg-gradient-to-r from-white/20 to-white/40',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next milestone label OR all-complete */}
      {allComplete ? (
        <span className="text-[11px] font-bold text-gold shrink-0">
          {tsr('allClaimed')}
        </span>
      ) : nextMilestone ? (
        <span className="text-[11px] text-white/40 font-mono tabular-nums shrink-0">
          {tsr('progress', { current: medianScore, target: nextMilestone.score })}
        </span>
      ) : null}

      {/* Claimable badge */}
      {claimableCount > 0 && (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/15 border border-gold/25 shrink-0 animate-pulse motion-reduce:animate-none">
          <Gift className="size-3 text-gold" />
          <span className="text-[11px] font-bold text-gold">
            {claimableCount}
          </span>
        </span>
      )}
    </Link>
  );
}
