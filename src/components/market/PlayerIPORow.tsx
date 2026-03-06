'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, Target } from 'lucide-react';
import { PlayerIdentity, getL5Color } from '@/components/player';
import CountdownBadge from './CountdownBadge';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo } from '@/types';

interface PlayerIPORowProps {
  player: Player;
  ipo: DbIpo;
  onBuy?: (playerId: string) => void;
  buying: boolean;
}

export default function PlayerIPORow({ player, ipo, onBuy, buying }: PlayerIPORowProps) {
  const t = useTranslations('market');
  const tp = useTranslations('player');

  const priceBsd = useMemo(() => centsToBsd(ipo.price), [ipo.price]);
  const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
  const remaining = ipo.total_offered - ipo.sold;

  return (
    <Link
      href={`/player/${player.id}`}
      className={cn(
        'block px-3 py-2.5 rounded-xl transition-colors group min-h-[44px]',
        'hover:bg-white/[0.04] active:bg-white/[0.06]',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
      )}
    >
      {/* Row 1: Identity + L5 + Buy */}
      <div className="flex items-center gap-2">
        <PlayerIdentity player={player} size="sm" showStatus={false} className="flex-1 min-w-0" />
        <span className={cn('font-mono font-bold text-[11px] tabular-nums shrink-0', getL5Color(player.perf.l5))}>
          {player.perf.l5}
        </span>
        {onBuy ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(player.id); }}
            disabled={buying}
            aria-label={`${player.first} ${player.last} ${tp('recruitBtn')}`}
            className={cn(
              'py-1.5 px-3 min-h-[44px] min-w-[44px] bg-gold text-black text-xs font-bold rounded-lg',
              'hover:bg-gold/90 active:scale-[0.95] transition-colors',
              'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'flex items-center gap-1 shrink-0',
            )}
          >
            {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Target className="size-3" aria-hidden="true" />}
            {buying ? tp('recruitingBtn') : tp('recruitBtn')}
          </button>
        ) : (
          <span className="text-[9px] text-white/30 font-bold shrink-0">
            {t('readOnly', { defaultMessage: 'Nur Ansicht' })}
          </span>
        )}
      </div>

      {/* Row 2: Price + Progress Bar + Remaining + Countdown */}
      <div className="flex items-center gap-2 mt-1.5 pl-[42px]">
        <span className="font-mono font-black text-xs text-gold tabular-nums shrink-0">
          {fmtScout(priceBsd)}
        </span>

        {/* Progress bar */}
        <div className="flex-1 min-w-0">
          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('ipoProgress', { defaultMessage: 'Verkaufsfortschritt' })}
            className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
          >
            <div
              className="h-full rounded-full bg-vivid-green"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        <span className="text-[9px] text-white/40 tabular-nums font-mono shrink-0">
          {ipo.sold}/{ipo.total_offered}
        </span>

        <CountdownBadge targetDate={ipo.ends_at} compact className="shrink-0" />
      </div>
    </Link>
  );
}
