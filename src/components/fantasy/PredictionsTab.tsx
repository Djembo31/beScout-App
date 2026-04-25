'use client';

import React, { useState, useMemo } from 'react';
import { Target, Plus, CheckCircle, XCircle, BarChart3, Flame, Trophy } from 'lucide-react';
import { Card, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import {
  usePredictions,
  usePredictionCount,
  usePredictionStats,
  useTopPredictorsLeaderboard,
} from '@/lib/queries/predictions';
import { PredictionCard } from './PredictionCard';
import { CreatePredictionModal } from './CreatePredictionModal';

interface PredictionsTabProps {
  gameweek: number;
  userId: string;
}

export function PredictionsTab({ gameweek, userId }: PredictionsTabProps) {
  const t = useTranslations('predictions');
  const { data: predictions = [], isLoading } = usePredictions(userId, gameweek);
  const { data: count = 0 } = usePredictionCount(userId, gameweek);
  // Slice 198d C-01: Streak-Anzeige (current consecutive correct).
  const { data: stats } = usePredictionStats(userId);
  const [showModal, setShowModal] = useState(false);

  const pendingPredictions = useMemo(() =>
    predictions.filter(p => p.status === 'pending'),
    [predictions]
  );
  const resolvedPredictions = useMemo(() =>
    predictions.filter(p => p.status !== 'pending'),
    [predictions]
  );

  const correctCount = resolvedPredictions.filter(p => p.status === 'correct').length;
  const wrongCount = resolvedPredictions.filter(p => p.status === 'wrong').length;
  const accuracy = (correctCount + wrongCount) > 0
    ? Math.round((correctCount / (correctCount + wrongCount)) * 100)
    : 0;

  const limitReached = count >= 5;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Target className="size-5 text-gold" aria-hidden="true" />
          <h3 className="font-black">{t('myPredictions')}</h3>
          <span
            className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              limitReached ? 'text-red-400 bg-red-400/10' : 'text-white/40 bg-surface-base'
            )}
            title={t('limitHint')}
          >
            {count}/5
          </span>
          {/* Slice 198d C-01: Current-Streak Badge — Engagement-Treiber, Compliance-clean (kein "Sieg"/"gewinn"). */}
          {stats && stats.currentStreak >= 2 && (
            <span
              className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full text-amber-400 bg-amber-400/10"
              title={t('streakTooltip', { count: stats.currentStreak })}
            >
              <Flame className="size-3" aria-hidden="true" />
              {t('streakBadge', { count: stats.currentStreak })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          disabled={limitReached}
        >
          <Plus className="size-4 mr-1" aria-hidden="true" />
          {limitReached ? t('limitReached') : t('create')}
        </Button>
      </div>

      {/* Slice 198b C-04: Limit-Begründung im UI (compliance-clean, kein "gewinn") */}
      <p className="text-xs text-white/50 text-pretty">{t('limitHint')}</p>

      {/* Pending predictions */}
      {pendingPredictions.length > 0 && (
        <div className="space-y-2">
          {pendingPredictions.map(p => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {predictions.length === 0 && (
        <Card className="p-6 text-center">
          <Target className="size-8 text-white/20 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-white/40">{t('empty')}</p>
          <p className="text-xs text-white/20 mt-1">{t('emptyHint')}</p>
        </Card>
      )}

      {/* Resolved section */}
      {resolvedPredictions.length > 0 && (
        <div className="space-y-3">
          {/* Stats bar */}
          <Card className="p-3 flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="size-4 text-white/30" aria-hidden="true" />
              <span className="text-xs text-white/40">{t('resolved')}</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1 text-xs font-bold text-green-500">
                <CheckCircle className="size-3.5" aria-hidden="true" /> {correctCount}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                <XCircle className="size-3.5" aria-hidden="true" /> {wrongCount}
              </span>
              <span className="text-xs font-mono font-bold text-white/60">
                {accuracy}%
              </span>
            </div>
          </Card>

          {/* Resolved cards */}
          {resolvedPredictions.map(p => (
            <PredictionCard key={p.id} prediction={p} />
          ))}
        </div>
      )}

      {/* Slice 199 C-05 — Top-Predictor Leaderboard (anonymized aggregate). */}
      <TopPredictorsSection />

      {/* Create Modal */}
      <CreatePredictionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        gameweek={gameweek}
        userId={userId}
        currentCount={count}
      />
    </div>
  );
}

// ============================================
// Slice 199 C-05 — Top Predictors Section
// ============================================

function TopPredictorsSection() {
  const t = useTranslations('predictions');
  const { data: leaders = [], isLoading } = useTopPredictorsLeaderboard(10);

  if (isLoading) {
    return <Skeleton className="h-40 rounded-xl" />;
  }

  if (leaders.length === 0) {
    return null;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="size-4 text-gold" aria-hidden="true" />
        <h3 className="font-black text-sm">{t('topPredictorsTitle')}</h3>
        <span className="text-[10px] text-white/40 font-mono tabular-nums">
          {t('topPredictorsHint')}
        </span>
      </div>
      <ol className="space-y-1.5">
        {leaders.map((row) => (
          <li
            key={row.user_id}
            className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-surface-base"
          >
            <span
              className={cn(
                'flex-shrink-0 size-6 rounded-full text-[10px] font-black flex items-center justify-center tabular-nums',
                row.rank === 1
                  ? 'bg-gold text-black'
                  : row.rank === 2
                    ? 'bg-white/20 text-white'
                    : row.rank === 3
                      ? 'bg-amber-700/40 text-amber-200'
                      : 'bg-surface-elevated text-white/60',
              )}
            >
              {row.rank}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold truncate">
                  {row.display_name || row.handle}
                </span>
                {row.tier && (
                  <span className="text-[9px] uppercase font-bold text-white/40">
                    {row.tier}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 font-mono tabular-nums text-xs">
              <span className="text-emerald-400 font-bold">
                {row.hit_rate_pct}%
              </span>
              <span className="text-white/40">
                {t('topPredictorsVolume', { count: row.predictions_total })}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
