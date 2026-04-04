'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { Card } from '@/components/ui';
import type { ResearchPostWithAuthor } from '@/types';

interface ScoutConsensusProps {
  research: ResearchPostWithAuthor[];
  className?: string;
}

/** Minimum quality threshold for research to count toward consensus */
const MIN_AVG_RATING = 4.0;
const MIN_RATINGS_COUNT = 3;
const MAX_AGE_DAYS = 60;

export default function ScoutConsensus({ research, className = '' }: ScoutConsensusProps) {
  const t = useTranslations('research');

  const consensus = useMemo(() => {
    const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
    const qualified = research.filter(
      (p) =>
        p.avg_rating >= MIN_AVG_RATING &&
        p.ratings_count >= MIN_RATINGS_COUNT &&
        new Date(p.created_at).getTime() >= cutoff,
    );
    if (qualified.length === 0) return null;

    const bullish = qualified.filter((p) => p.call === 'Bullish').length;
    const bearish = qualified.filter((p) => p.call === 'Bearish').length;
    const neutral = qualified.filter((p) => p.call === 'Neutral').length;

    // Find top analyst (highest hit rate among qualified)
    let topAnalyst: { handle: string; hitRate: number } | null = null;
    for (const p of qualified) {
      const hr = p.author_track_record?.hitRate ?? 0;
      if (hr > (topAnalyst?.hitRate ?? 0) && p.author_handle) {
        topAnalyst = { handle: p.author_handle, hitRate: hr };
      }
    }

    return { bullish, bearish, neutral, total: qualified.length, topAnalyst };
  }, [research]);

  if (!consensus) return null;

  const { bullish, bearish, neutral, total, topAnalyst } = consensus;
  const bullishPct = Math.round((bullish / total) * 100);
  const bearishPct = Math.round((bearish / total) * 100);

  // Dominant sentiment
  const dominant =
    bullish > bearish ? 'bullish' : bearish > bullish ? 'bearish' : 'neutral';
  const dominantColor =
    dominant === 'bullish'
      ? 'text-green-400'
      : dominant === 'bearish'
        ? 'text-red-400'
        : 'text-gold';

  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-violet-500/10 to-violet-500/5 border-b border-violet-500/20 p-4">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-violet-300" aria-hidden="true" />
          <span className="font-black">{t('consensus')}</span>
          <span className="text-xs text-white/40 ml-auto">
            {t('consensusReports', { count: total })}
          </span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {/* Sentiment bars */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-green-400 shrink-0" aria-hidden="true" />
            <span className="text-xs text-white/60 w-16">Bullish</span>
            <div className="flex-1 h-2 bg-surface-base rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500/70 rounded-full transition-colors"
                style={{ width: `${bullishPct}%` }}
              />
            </div>
            <span className="font-mono tabular-nums text-xs text-green-400 w-8 text-right">
              {bullish}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="size-4 text-gold shrink-0" aria-hidden="true" />
            <span className="text-xs text-white/60 w-16">Neutral</span>
            <div className="flex-1 h-2 bg-surface-base rounded-full overflow-hidden">
              <div
                className="h-full bg-gold/70 rounded-full transition-colors"
                style={{ width: `${total > 0 ? Math.round((neutral / total) * 100) : 0}%` }}
              />
            </div>
            <span className="font-mono tabular-nums text-xs text-gold w-8 text-right">
              {neutral}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="size-4 text-red-400 shrink-0" aria-hidden="true" />
            <span className="text-xs text-white/60 w-16">Bearish</span>
            <div className="flex-1 h-2 bg-surface-base rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500/70 rounded-full transition-colors"
                style={{ width: `${bearishPct}%` }}
              />
            </div>
            <span className="font-mono tabular-nums text-xs text-red-400 w-8 text-right">
              {bearish}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className={`text-sm font-bold ${dominantColor}`}>
            {dominant === 'bullish'
              ? t('consensusBullish', { count: bullish })
              : dominant === 'bearish'
                ? t('consensusBearish', { count: bearish })
                : t('consensusNeutral')}
          </span>
        </div>

        {/* Top analyst */}
        {topAnalyst && topAnalyst.hitRate > 0 && (
          <div className="text-xs text-white/40">
            {t('consensusTopAnalyst', {
              handle: topAnalyst.handle,
              hitRate: topAnalyst.hitRate,
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
