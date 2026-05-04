'use client';

import { memo } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

// Slice 269 (D63 Phase 4) — extrahiert aus page.tsx:257-294 als reusable
// Strip für den Markt-Puls movers-Tab. Existing Verhalten unverändert:
//   - rendert horizontalen Strip von topMovers (own holdings winner/loser)
//   - empty-state wenn topMovers.length === 0 trotz holdings.length > 0

export type OwnTopMover = {
  playerId: string;
  player: string;
  club: string;
  change24h: number;
};

interface OwnTopMoversStripProps {
  topMovers: OwnTopMover[];
  hasHoldings: boolean;
}

function OwnTopMoversStripInner({ topMovers, hasHoldings }: OwnTopMoversStripProps) {
  const t = useTranslations('home');

  // Caller hides this strip when hasHoldings === false → render nothing.
  if (!hasHoldings) return null;

  if (topMovers.length === 0) {
    return (
      <div className="mt-2 px-4 py-5 rounded-2xl border border-white/[0.06] bg-surface-minimal text-center shadow-card-sm">
        <div className="text-xs text-white/40 max-w-[280px] mx-auto">
          {t('topMoversWeekEmpty')}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex gap-2.5 mt-2 overflow-x-auto scrollbar-hide pb-1"
      style={{ WebkitOverflowScrolling: 'touch' }}
      aria-label={t('topMoversWeek')}
    >
      {topMovers.map(h => {
        const up = h.change24h >= 0;
        const Icon = up ? TrendingUp : TrendingDown;
        return (
          <Link
            key={h.playerId}
            href={`/player/${h.playerId}`}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl border card-showcase shrink-0 min-w-[180px] shadow-card-md"
            style={{
              borderColor: up ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              background: `linear-gradient(135deg, ${up ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)'} 0%, rgba(255,255,255,0.02) 100%)`,
            }}
          >
            <div className="min-w-0">
              <div className="text-sm font-bold truncate">{h.player}</div>
              <div className="text-[10px] text-white/40">{h.club}</div>
            </div>
            <div className={cn('flex items-center gap-0.5 ml-auto font-mono font-bold text-sm tabular-nums shrink-0', up ? 'text-green-500' : 'text-red-400')}>
              <Icon className="size-3.5" />
              {up ? '+' : ''}{h.change24h.toFixed(1)}%
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default memo(OwnTopMoversStripInner);
