'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { PlayerPhoto, getL5Color } from '@/components/player';
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

export default function PlayerIPORow({ player: p, ipo, onBuy, buying }: PlayerIPORowProps) {
  const t = useTranslations('market');
  const priceBsd = centsToBsd(ipo.price);
  const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className="relative block px-3 py-2 min-h-[44px] hover:bg-white/[0.03] transition-colors group"
    >
      {/* Progress bar as subtle bottom stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.04]">
        <div
          className="h-full bg-vivid-green/40"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Row 1: Photo + Name + L5 + Price + Buy */}
      <div className="flex items-center gap-2">
        <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={28} />

        <span className="text-xs font-bold text-white truncate flex-1 min-w-0">
          {p.last}
        </span>

        <span className={cn('font-mono font-bold text-[11px] tabular-nums flex-shrink-0', getL5Color(p.perf.l5))}>
          {p.perf.l5}
        </span>

        <span className="font-mono font-black text-xs text-gold tabular-nums flex-shrink-0">
          {fmtScout(priceBsd)}
        </span>

        {onBuy ? (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
            disabled={buying}
            aria-label={t('buyPlayerLabel', {
              player: `${p.first} ${p.last}`,
              price: fmtScout(priceBsd),
              defaultMessage: '{player} für {price} $SCOUT kaufen',
            })}
            className="px-2.5 py-1 min-h-[32px] min-w-[36px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-[10px] font-black hover:bg-gold/20 transition-colors active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
          </button>
        ) : (
          <span className="text-[9px] text-white/25 font-bold flex-shrink-0">
            {ipo.status === 'ended' ? t('ipoBeendet', { defaultMessage: 'Beendet' }) : t('ipoGeplant', { defaultMessage: 'Geplant' })}
          </span>
        )}
      </div>

      {/* Row 2: Sold count + Countdown */}
      <div className="flex items-center gap-2 mt-0.5 pl-9">
        <span className="text-[9px] text-white/30 font-mono tabular-nums whitespace-nowrap">
          {ipo.sold}/{ipo.total_offered} {t('sold', { defaultMessage: 'verkauft' })}
        </span>
        <CountdownBadge targetDate={ipo.ends_at} compact className="flex-shrink-0" />
      </div>
    </Link>
  );
}
