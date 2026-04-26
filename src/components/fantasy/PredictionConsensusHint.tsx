'use client';

/**
 * Slice 201d (C-03): Prediction-Consensus-Hint Component.
 *
 * Zeigt anonymisierte Distribution der Community-Predictions fuer
 * fixture+condition+(player_id?). Wird im CreatePredictionModal Step 3
 * (confirm) gerendert um User vor Submit zu informieren ob er mit der
 * Mehrheit oder differential tippt.
 *
 * Edge-Cases:
 *   - 0 predictions: rendert nothing (early return)
 *   - <5 predictions: zeigt Disclaimer "wenig Daten"
 *   - User-selected value matched top: "Du tippst mit der Mehrheit (X%)"
 *   - User-selected value differential: "Du tippst differential (Y% wählten X)"
 */

import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePredictionConsensus } from '@/lib/queries';

type Props = {
  fixtureId: string;
  condition: string;
  playerId?: string;
  /** User's currently selected value (highlights row + sets differential-state). */
  selectedValue: string;
  /** Map condition+value -> localized label fuer Display. */
  getValueLabel: (condition: string, value: string) => string;
  className?: string;
};

const SPARSE_THRESHOLD = 5;

export function PredictionConsensusHint({
  fixtureId,
  condition,
  playerId,
  selectedValue,
  getValueLabel,
  className,
}: Props) {
  const t = useTranslations('predictions');
  const { data, isLoading } = usePredictionConsensus(fixtureId, condition, playerId);

  if (isLoading) {
    return (
      <div
        className={cn('h-12 rounded-xl bg-surface-subtle animate-pulse motion-reduce:animate-none', className)}
        role="status"
        aria-busy="true"
      />
    );
  }

  if (!data || data.total_count === 0) {
    return null;
  }

  const top = data.distribution[0];
  const userEntry = data.distribution.find(d => d.value === selectedValue);
  const isMajority = userEntry && top && userEntry.value === top.value;
  const isSparse = data.total_count < SPARSE_THRESHOLD;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 space-y-2',
        isMajority ? 'bg-amber-500/[0.06] border-amber-500/15' : 'bg-purple-500/[0.06] border-purple-500/15',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Users className="size-3.5 text-white/50" aria-hidden="true" />
        <span className="text-[11px] text-white/60">
          {t('consensusTitle', { count: data.total_count })}
        </span>
      </div>

      {/* Top-3 distribution bars */}
      <div className="space-y-1.5">
        {data.distribution.slice(0, 3).map(d => {
          const isUser = d.value === selectedValue;
          return (
            <div key={d.value} className="flex items-center gap-2 text-xs">
              <span className={cn('w-20 truncate', isUser ? 'text-white font-bold' : 'text-white/60')}>
                {getValueLabel(condition, d.value)}
              </span>
              <div className="flex-1 h-1.5 rounded bg-white/[0.06] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded transition-all',
                    isUser ? 'bg-gold/80' : 'bg-purple-400/60',
                  )}
                  style={{ width: `${Math.min(100, d.pct)}%` }}
                />
              </div>
              <span className={cn('w-10 text-right font-mono tabular-nums', isUser ? 'text-gold font-bold' : 'text-white/50')}>
                {d.pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Verdict-Text */}
      {userEntry && (
        <p className="text-[11px] leading-relaxed">
          {isMajority ? (
            <span className="text-amber-300/90">
              {t('consensusMajority', { pct: userEntry.pct.toFixed(0) })}
            </span>
          ) : (
            <span className="text-purple-300/90">
              {t('consensusDifferential', { pct: userEntry.pct.toFixed(0) })}
            </span>
          )}
        </p>
      )}

      {isSparse && (
        <p className="text-[10px] text-white/30 italic">
          {t('consensusSparse', { count: data.total_count })}
        </p>
      )}
    </div>
  );
}
