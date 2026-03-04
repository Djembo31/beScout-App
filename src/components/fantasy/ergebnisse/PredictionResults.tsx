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
    <span className="text-[9px] text-gold/60 tracking-tight" aria-label={`${filled} von 5 Sterne`}>
      {'★'.repeat(filled)}{'☆'.repeat(5 - filled)}
    </span>
  );
}

/** Readable condition text */
function getConditionText(p: Prediction): string {
  switch (p.condition) {
    case 'match_result': return p.predicted_value === 'home' ? 'Sieg Heim' : p.predicted_value === 'away' ? 'Sieg Auswärts' : 'Unentschieden';
    case 'total_goals': return `${p.predicted_value === 'over' ? 'Über' : 'Unter'} 2.5 Tore`;
    case 'both_score': return p.predicted_value === 'yes' ? 'Beide treffen' : 'Nicht beide treffen';
    case 'player_goals': return `${p.player?.first_name?.charAt(0) ?? ''}. ${p.player?.last_name ?? '?'} Tor`;
    case 'player_assists': return `${p.player?.first_name?.charAt(0) ?? ''}. ${p.player?.last_name ?? '?'} Assist`;
    case 'player_card': return `${p.player?.first_name?.charAt(0) ?? ''}. ${p.player?.last_name ?? '?'} Karte`;
    case 'clean_sheet': return `${p.player?.first_name?.charAt(0) ?? ''}. ${p.player?.last_name ?? '?'} Weiße Weste`;
    case 'player_minutes': return `${p.player?.first_name?.charAt(0) ?? ''}. ${p.player?.last_name ?? '?'} ≥60 Min`;
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
        <span className="text-[10px] text-white/30">·</span>
        <span className="text-xs font-mono font-bold tabular-nums text-white/50">{accuracy}%</span>
      </div>

      {/* Individual prediction rows */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
        {resolved.map(p => {
          const isCorrect = p.status === 'correct';
          const isVoid = p.status === 'void';

          return (
            <div key={p.id} className="flex items-center gap-2 px-3 py-2">
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
                <div className="text-xs font-semibold truncate">{getConditionText(p)}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] text-white/30 truncate">{getFixtureContext(p)}</span>
                  <ConfidenceStars confidence={p.confidence} />
                </div>
              </div>

              {/* Points */}
              <span className={`text-xs font-mono font-bold tabular-nums flex-shrink-0 ${
                p.points_awarded > 0 ? 'text-green-400' : 'text-white/20'
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
