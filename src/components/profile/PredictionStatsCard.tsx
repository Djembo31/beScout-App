'use client';

import React from 'react';
import Link from 'next/link';
import { Target, CheckCircle, XCircle, Flame, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { usePredictionStats } from '@/lib/queries/predictions';
import { useTranslations } from 'next-intl';

interface PredictionStatsCardProps {
  userId: string;
}

export default function PredictionStatsCard({ userId }: PredictionStatsCardProps) {
  const t = useTranslations('predictions');
  const { data: stats } = usePredictionStats(userId);

  // Don't show if user has no predictions
  if (!stats || stats.total === 0) return null;

  return (
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-black flex items-center gap-2">
          <Target className="size-4 text-purple-400" aria-hidden="true" />
          {t('statsTitle')}
        </h3>
        <Link href="/fantasy" className="text-xs text-white/40 hover:text-white/60 flex items-center gap-1">
          {t('viewAll')} <ChevronRight className="size-3" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {/* Accuracy */}
        <div className="text-center p-3 bg-surface-subtle rounded-xl border border-divider">
          <p className={cn(
            'text-lg font-mono font-black',
            stats.accuracy >= 70 ? 'text-green-500' : stats.accuracy >= 50 ? 'text-amber-400' : 'text-red-400'
          )}>
            {stats.accuracy}%
          </p>
          <p className="text-[10px] text-white/40 mt-0.5">{t('accuracy')}</p>
        </div>

        {/* Correct */}
        <div className="text-center p-3 bg-surface-subtle rounded-xl border border-divider">
          <p className="text-lg font-mono font-black text-green-500 flex items-center justify-center gap-1">
            <CheckCircle className="size-3.5" aria-hidden="true" /> {stats.correct}
          </p>
          <p className="text-[10px] text-white/40 mt-0.5">{t('correct')}</p>
        </div>

        {/* Wrong */}
        <div className="text-center p-3 bg-surface-subtle rounded-xl border border-divider">
          <p className="text-lg font-mono font-black text-red-400 flex items-center justify-center gap-1">
            <XCircle className="size-3.5" aria-hidden="true" /> {stats.wrong}
          </p>
          <p className="text-[10px] text-white/40 mt-0.5">{t('wrong')}</p>
        </div>

        {/* Streak */}
        <div className="text-center p-3 bg-surface-subtle rounded-xl border border-divider">
          <p className="text-lg font-mono font-black text-gold flex items-center justify-center gap-1">
            <Flame className="size-3.5" aria-hidden="true" /> {stats.bestStreak}
          </p>
          <p className="text-[10px] text-white/40 mt-0.5">{t('bestStreak')}</p>
        </div>
      </div>

      {/* Total Points */}
      <div className="mt-3 flex items-center justify-between px-1">
        <span className="text-xs text-white/40">{t('totalPoints')}</span>
        <span className={cn(
          'text-sm font-mono font-bold',
          stats.totalPoints >= 0 ? 'text-green-500' : 'text-red-400'
        )}>
          {stats.totalPoints >= 0 ? '+' : ''}{stats.totalPoints.toFixed(1)}
        </span>
      </div>
    </Card>
  );
}
