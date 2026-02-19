'use client';

import React, { useState, useMemo } from 'react';
import { Target, Plus, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import { Card, Button, Skeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { usePredictions, usePredictionCount } from '@/lib/queries/predictions';
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
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#FFD700]" />
          <h3 className="font-black">{t('myPredictions')}</h3>
          <span className={cn(
            'text-xs font-bold px-2 py-0.5 rounded-full',
            limitReached ? 'text-red-400 bg-red-400/10' : 'text-white/40 bg-white/5'
          )}>
            {count}/5
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => setShowModal(true)}
          disabled={limitReached}
        >
          <Plus className="w-4 h-4 mr-1" />
          {limitReached ? t('limitReached') : t('create')}
        </Button>
      </div>

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
          <Target className="w-8 h-8 text-white/20 mx-auto mb-2" />
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
              <BarChart3 className="w-4 h-4 text-white/30" />
              <span className="text-xs text-white/40">{t('resolved')}</span>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="flex items-center gap-1 text-xs font-bold text-[#22C55E]">
                <CheckCircle className="w-3.5 h-3.5" /> {correctCount}
              </span>
              <span className="flex items-center gap-1 text-xs font-bold text-red-400">
                <XCircle className="w-3.5 h-3.5" /> {wrongCount}
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
