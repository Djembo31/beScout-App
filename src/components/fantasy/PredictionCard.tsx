'use client';

import React from 'react';
import { CheckCircle, XCircle, Clock, MinusCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import { getClub } from '@/lib/clubs';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { Prediction } from '@/types';

interface PredictionCardProps {
  prediction: Prediction;
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const t = useTranslations('predictions');
  const homeClubId = prediction.fixture?.home_club_id;
  const awayClubId = prediction.fixture?.away_club_id;
  const homeClub = homeClubId ? getClub(homeClubId) : null;
  const awayClub = awayClubId ? getClub(awayClubId) : null;

  const conditionLabel = getConditionLabel(prediction.condition, t);
  const valueLabel = getValueLabel(prediction.condition, prediction.predicted_value, t);
  const actualLabel = prediction.actual_value ? getValueLabel(prediction.condition, prediction.actual_value, t) : null;

  const statusConfig = getStatusConfig(prediction.status, prediction.points_awarded, t);
  const confidenceColor = prediction.confidence >= 86 ? 'text-[#FFD700] bg-[#FFD700]/15' :
    prediction.confidence >= 66 ? 'text-[#22C55E] bg-[#22C55E]/15' :
    'text-amber-400 bg-amber-400/15';

  return (
    <Card className="p-3 md:p-4">
      {/* Header: fixture info */}
      <div className="flex items-center gap-2 mb-2">
        {prediction.prediction_type === 'match' ? (
          <div className="flex items-center gap-1.5 text-sm">
            <ClubDot club={homeClub} />
            <span className="font-semibold truncate">{homeClub?.short ?? '?'}</span>
            <span className="text-white/30 text-xs">vs</span>
            <span className="font-semibold truncate">{awayClub?.short ?? '?'}</span>
            <ClubDot club={awayClub} />
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-sm">
            <span className="font-semibold">
              {prediction.player?.first_name?.charAt(0)}. {prediction.player?.last_name}
            </span>
            <span className="text-white/40 text-xs">
              ({homeClub?.short ?? '?'} vs {awayClub?.short ?? '?'})
            </span>
          </div>
        )}
      </div>

      {/* Condition + Value + Confidence + Status */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-white/50">{conditionLabel}:</span>
        <span className="text-sm font-bold">{valueLabel}</span>

        {/* Actual value (only when resolved) */}
        {prediction.status !== 'pending' && actualLabel && (
          <span className="text-xs text-white/40">
            ({t('actual')}: {actualLabel})
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Confidence badge */}
          <span className={cn('px-2 py-0.5 rounded-full text-xs font-bold', confidenceColor)}>
            {prediction.confidence}%
          </span>

          {/* Difficulty */}
          <span className={cn(
            'px-1.5 py-0.5 rounded text-[10px] font-bold',
            prediction.difficulty === 0.5 ? 'text-emerald-400 bg-emerald-400/10' :
            prediction.difficulty === 1.5 ? 'text-red-400 bg-red-400/10' :
            'text-white/40 bg-white/5'
          )}>
            {prediction.difficulty === 0.5 ? '★' : prediction.difficulty === 1.5 ? '★★★' : '★★'}
          </span>

          {/* Status badge */}
          <div className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold', statusConfig.className)}>
            {statusConfig.icon}
            <span>{statusConfig.label}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Helpers ──

function ClubDot({ club }: { club: { colors?: { primary: string }; logo?: string | null } | null }) {
  if (club?.logo) {
    return <img src={club.logo} alt="" className="w-4 h-4 rounded-full object-cover" />;
  }
  return (
    <div
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: club?.colors?.primary ?? '#666' }}
    />
  );
}

function getStatusConfig(
  status: Prediction['status'],
  points: number,
  t: ReturnType<typeof useTranslations<'predictions'>>,
) {
  switch (status) {
    case 'correct':
      return {
        icon: <CheckCircle className="w-3.5 h-3.5" />,
        label: `+${points.toFixed(1)}`,
        className: 'text-[#22C55E] bg-[#22C55E]/10',
      };
    case 'wrong':
      return {
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: `${points.toFixed(1)}`,
        className: 'text-red-400 bg-red-400/10',
      };
    case 'void':
      return {
        icon: <MinusCircle className="w-3.5 h-3.5" />,
        label: t('void'),
        className: 'text-white/40 bg-white/5',
      };
    default:
      return {
        icon: <Clock className="w-3.5 h-3.5 animate-pulse" />,
        label: t('pending'),
        className: 'text-white/40 bg-white/5',
      };
  }
}

function getConditionLabel(
  condition: string,
  t: ReturnType<typeof useTranslations<'predictions'>>,
): string {
  const map: Record<string, string> = {
    match_result: t('matchResult'),
    total_goals: t('totalGoals'),
    both_score: t('bothScore'),
    player_goals: t('playerGoals'),
    player_assists: t('playerAssists'),
    player_card: t('playerCard'),
    clean_sheet: t('cleanSheet'),
    player_minutes: t('playerMinutes'),
  };
  return map[condition] ?? condition;
}

function getValueLabel(
  condition: string,
  value: string,
  t: ReturnType<typeof useTranslations<'predictions'>>,
): string {
  const map: Record<string, Record<string, string>> = {
    match_result: { home: t('home'), draw: t('draw'), away: t('away') },
    total_goals: { over_2_5: t('over25'), under_2_5: t('under25') },
    both_score: { yes: t('yes'), no: t('no') },
    player_goals: { '0': '0', '1': '1', '2+': '2+' },
    player_assists: { '0': '0', '1+': '1+' },
    player_card: { yellow: t('yellowCard'), red: t('redCard'), none: t('noCard') },
    clean_sheet: { yes: t('yes'), no: t('no') },
    player_minutes: { over_60: '>60 Min', sub: t('sub'), bench: t('bench') },
  };
  return map[condition]?.[value] ?? value;
}
