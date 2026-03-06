'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { PlayerPhoto, getL5Color } from '@/components/player';
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
      className="relative flex items-center gap-2.5 px-3 py-2 min-h-[44px] hover:bg-white/[0.03] transition-colors group"
    >
      {/* Progress bar as subtle background stripe */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/[0.04]">
        <div
          className="h-full bg-vivid-green/40"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {/* Photo */}
      <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={28} />

      {/* Name — truncated to one line */}
      <span className="text-xs font-bold text-white truncate flex-1 min-w-0">
        {p.last}
      </span>

      {/* L5 */}
      <span className={cn('font-mono font-bold text-[11px] tabular-nums flex-shrink-0', getL5Color(p.perf.l5))}>
        {p.perf.l5}
      </span>

      {/* Sold count */}
      <span className="text-[9px] text-white/30 font-mono tabular-nums flex-shrink-0 whitespace-nowrap">
        {ipo.sold}/{ipo.total_offered}
      </span>

      {/* Price */}
      <span className="font-mono font-black text-xs text-gold tabular-nums flex-shrink-0">
        {fmtScout(priceBsd)}
      </span>

      {/* Buy or status */}
      {onBuy ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
          disabled={buying}
          aria-label={t('buyPlayerLabel', {
            player: `${p.first} ${p.last}`,
            price: fmtScout(priceBsd),
            defaultMessage: '{player} für {price} $SCOUT kaufen',
          })}
          className="px-2.5 py-1.5 min-h-[36px] min-w-[36px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-[10px] font-black hover:bg-gold/20 transition-colors active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
        >
          {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
        </button>
      ) : (
        <span className="text-[9px] text-white/25 font-bold flex-shrink-0">
          {ipo.status === 'ended' ? t('ipoBeendet', { defaultMessage: 'Beendet' }) : t('ipoGeplant', { defaultMessage: 'Geplant' })}
        </span>
      )}
    </Link>
  );
}
