'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Clock } from 'lucide-react';
import { PlayerPhoto } from '@/components/player';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo } from '@/types';

interface EndingSoonStripProps {
  activeIpos: DbIpo[];
  playerMap: Map<string, Player>;
  onBuy: (playerId: string) => void;
  buyingId: string | null;
  max?: number;
}

export default function EndingSoonStrip({ activeIpos, playerMap, max = 5 }: EndingSoonStripProps) {
  const t = useTranslations('market');

  const endingSoon = useMemo(() => {
    const now = Date.now();
    return activeIpos
      .filter(ipo => new Date(ipo.ends_at).getTime() > now)
      .sort((a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime())
      .slice(0, max)
      .map(ipo => ({ ipo, player: playerMap.get(ipo.player_id) }))
      .filter((x): x is { ipo: DbIpo; player: Player } => !!x.player);
  }, [activeIpos, playerMap, max]);

  if (endingSoon.length === 0) return null;

  return (
    <section aria-label={t('endingSoonLabel', { defaultMessage: 'Endet bald' })}>
      <div className="flex items-center gap-2 mb-2">
        <Clock className="size-4 text-vivid-red" aria-hidden="true" />
        <h3 className="text-xs font-black text-vivid-red uppercase tracking-wide">
          {t('endingSoon', { defaultMessage: 'Endet bald' })}
        </h3>
      </div>
      <div
        className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {endingSoon.map(({ ipo, player: p }) => {
          const remaining = ipo.total_offered - ipo.sold;
          const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
          return (
            <Link
              key={ipo.id}
              href={`/player/${p.id}`}
              className={cn(
                'flex-shrink-0 w-[200px] bg-surface-subtle border border-white/[0.08] rounded-xl p-3',
                'hover:border-white/[0.15] active:scale-[0.98] transition-colors shadow-card-sm hover:shadow-card-md',
                'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-white truncate">{p.first} {p.last}</div>
                  <div className="text-[9px] text-white/30 truncate">{p.club}</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-1.5">
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-vivid-green transition-colors"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[9px] text-white/40 tabular-nums font-mono">
                    {ipo.sold}/{ipo.total_offered}
                  </span>
                  <span className="text-[9px] text-white/40 tabular-nums font-mono">
                    {t('remainingCount', { count: remaining, defaultMessage: '{count} übrig' })}
                  </span>
                </div>
              </div>

              {/* Price + Countdown */}
              <div className="flex items-center justify-between">
                <span className="font-mono font-black text-sm text-gold tabular-nums">
                  {fmtScout(centsToBsd(ipo.price))}
                </span>
                <CountdownBadge targetDate={ipo.ends_at} compact />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
