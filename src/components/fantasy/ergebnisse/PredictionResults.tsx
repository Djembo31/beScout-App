'use client';

import React from 'react';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getClubName } from '@/lib/clubs';
import type { Prediction } from '@/types';

type Props = {
  predictions: Prediction[];
};

/** Render confidence as star characters */
function ConfidenceStars({ confidence }: { confidence: number }) {
  // confidence 1-5
  const filled = Math.min(5, Math.max(1, confidence));
  return (
    <span className="text-xs text-gold/60 tracking-tight" aria-label={`${filled} von 5 Sterne`}>
      {'★'.repeat(filled)}{'☆'.repeat(5 - filled)}
    </span>
  );
}

/** Readable condition text — uses i18n via passed-in t() */
function getConditionText(p: Prediction, t: (key: string) => string): string {
  const playerPrefix = `${p.player?.first_name?.charAt(0) ?? ''}. ${p.player?.last_name ?? '?'}`;
  switch (p.condition) {
    case 'match_result': return p.predicted_value === 'home' ? t('homeWin') : p.predicted_value === 'away' ? t('awayWin') : t('draw');
    case 'total_goals': return `${p.predicted_value === 'over' ? t('over25') : t('under25')} ${t('goalsLabel')}`;
    case 'both_score': return p.predicted_value === 'yes' ? t('bothScoreYes') : t('bothScoreNo');
    case 'player_goals': return `${playerPrefix} ${t('goalLabel')}`;
    case 'player_assists': return `${playerPrefix} ${t('assistLabel')}`;
    case 'player_card': return `${playerPrefix} ${t('cardLabel')}`;
    case 'clean_sheet': return `${playerPrefix} ${t('cleanSheetLabel')}`;
    case 'player_minutes': return `${playerPrefix} ${t('minutesLabel')}`;
    default: return p.condition;
  }
}

function getFixtureContext(p: Prediction): string {
  if (!p.fixture) return '';
  const home = getClubName(p.fixture.home_club_id);
  const away = getClubName(p.fixture.away_club_id);
  return `${home} vs ${away}`;
}

export function PredictionResults({ predictions }: Props) {
  const tp = useTranslations('predictions');
  const tf = useTranslations('fantasy');

  const resolved = predictions.filter(p => p.status !== 'pending');
  const correctCount = resolved.filter(p => p.status === 'correct').length;
  const totalResolved = resolved.length;
  const accuracy = totalResolved > 0 ? Math.round((correctCount / totalResolved) * 100) : 0;

  if (resolved.length === 0) {
    return (
      <div className="py-6 text-center text-white/30 text-xs">
        {tf('ergebnisse.noPredictions')}
      </div>
    );
  }

  return (
    <div>
      {/* Aggregate header */}
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className="text-xs font-bold text-white/60">
          {correctCount}/{totalResolved} {tp('correct')}
        </span>
        <span className="text-xs text-white/30">·</span>
        <span className={`text-xs font-mono font-bold tabular-nums ${accuracy >= 70 ? 'text-gold gold-glow' : 'text-white/50'}`}>{accuracy}%</span>
      </div>

      {/* Individual prediction rows */}
      <div className="rounded-xl border border-divider bg-surface-minimal divide-y divide-white/[0.04]">
        {resolved.map(p => {
          const isCorrect = p.status === 'correct';
          const isVoid = p.status === 'void';

          return (
            <div key={p.id} className={`flex items-center gap-2 px-3 py-2 ${isCorrect ? 'border-l-2 border-l-green-500/40' : ''}`}>
              {/* Status icon */}
              {isVoid ? (
                <MinusCircle className="size-4 text-white/25 flex-shrink-0" aria-hidden="true" />
              ) : isCorrect ? (
                <CheckCircle className="size-4 text-green-500 flex-shrink-0" aria-hidden="true" />
              ) : (
                <XCircle className="size-4 text-red-400 flex-shrink-0" aria-hidden="true" />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{getConditionText(p, tp)}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-white/30 truncate">{getFixtureContext(p)}</span>
                  <ConfidenceStars confidence={p.confidence} />
                </div>
              </div>

              {/* Points */}
              <span className={`text-xs font-mono font-bold tabular-nums flex-shrink-0 ${
                p.points_awarded > 0 ? 'text-vivid-green' : 'text-white/20'
              }`}>
                {p.points_awarded > 0 ? `+${p.points_awarded}` : '0'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
