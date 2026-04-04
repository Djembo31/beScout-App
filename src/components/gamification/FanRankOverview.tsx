'use client';

import React from 'react';
import { Trophy } from 'lucide-react';
import { Card, Skeleton } from '@/components/ui';
import FanRankBadge from '@/components/ui/FanRankBadge';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { DbFanRanking } from '@/types';

// ============================================
// FAN-RANK OVERVIEW — 5 Dimensions + CSF
// ============================================

interface FanRankOverviewProps {
  ranking: DbFanRanking | null;
  clubName: string;
  isLoading?: boolean;
}

interface DimensionDef {
  key: string;
  i18nKey: string;
  scoreField: keyof Pick<DbFanRanking, 'event_score' | 'dpc_score' | 'abo_score' | 'community_score' | 'streak_score'>;
  weight: number;
  color: string;
  bgColor: string;
}

const DIMENSIONS: DimensionDef[] = [
  { key: 'event', i18nKey: 'eventPerformance', scoreField: 'event_score', weight: 30, color: 'text-amber-400', bgColor: 'bg-amber-400' },
  { key: 'dpc', i18nKey: 'dpcOwnership', scoreField: 'dpc_score', weight: 25, color: 'text-sky-400', bgColor: 'bg-sky-400' },
  { key: 'abo', i18nKey: 'clubSubscription', scoreField: 'abo_score', weight: 20, color: 'text-purple-400', bgColor: 'bg-purple-400' },
  { key: 'community', i18nKey: 'communityActivity', scoreField: 'community_score', weight: 15, color: 'text-emerald-400', bgColor: 'bg-emerald-400' },
  { key: 'streak', i18nKey: 'participationStreak', scoreField: 'streak_score', weight: 10, color: 'text-orange-400', bgColor: 'bg-orange-400' },
];

export default function FanRankOverview({
  ranking,
  clubName,
  isLoading = false,
}: FanRankOverviewProps) {
  const t = useTranslations('gamification');

  if (isLoading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex justify-center mb-5">
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!ranking) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-white/30" />
          <span className="font-black text-sm text-white/50">{t('fanRank')}</span>
        </div>
        <p className="text-sm text-white/30">{t('noFanRank')}</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="size-4 text-gold" />
        <span className="font-black text-sm">{t('fanRank')}</span>
        <span className="text-[10px] font-bold text-gold bg-gold/[0.08] border border-gold/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Season 1</span>
      </div>

      {/* Badge + CSF Multiplier */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <FanRankBadge
          tier={ranking.rank_tier}
          csfMultiplier={ranking.csf_multiplier}
          clubName={clubName}
          size="lg"
          showMultiplier
        />
        {ranking.csf_multiplier > 1 && (
          <span className="text-xs font-mono tabular-nums font-bold text-gold">
            {t('csfBonus', { multiplier: ranking.csf_multiplier.toFixed(2) })}
          </span>
        )}
      </div>

      {/* 5 Dimension Bars */}
      <div className="space-y-3.5">
        {DIMENSIONS.map(dim => {
          const score = ranking[dim.scoreField];
          const maxScore = 100;
          const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));

          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn('text-[11px] font-semibold', dim.color)}>
                  {t(dim.i18nKey)}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono tabular-nums text-white/40">
                    {score}/100
                  </span>
                  <span className="text-[9px] font-mono tabular-nums text-white/20">
                    ({dim.weight}%)
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-[width] duration-500', dim.bgColor)}
                  style={{ width: `${pct}%`, opacity: 0.8 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Score */}
      <div className="mt-4 pt-3 border-t border-divider flex items-center justify-between">
        <span className="text-xs text-white/40 font-semibold">{t('totalScore')}</span>
        <span className="text-sm font-mono font-black tabular-nums text-white">
          {ranking.total_score}
        </span>
      </div>
    </Card>
  );
}
