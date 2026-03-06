'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
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

export default function PlayerIPORow({ player: p, ipo, onBuy, buying }: PlayerIPORowProps) {
  const t = useTranslations('market');
  const priceBsd = centsToBsd(ipo.price);
  const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] hover:bg-white/[0.03] transition-colors rounded-lg group"
    >
      <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />

      <span className={cn('font-mono font-bold text-[11px] tabular-nums flex-shrink-0', getL5Color(p.perf.l5))}>
        {p.perf.l5}
      </span>

      <div className="w-10 flex-shrink-0">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-vivid-green"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="text-[8px] text-white/30 font-mono tabular-nums">{ipo.sold}/{ipo.total_offered}</span>
      </div>

      <CountdownBadge targetDate={ipo.ends_at} compact className="flex-shrink-0 w-16 text-right" />

      <span className="font-mono font-black text-xs text-gold tabular-nums flex-shrink-0 w-16 text-right">
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
          className="px-3 py-1.5 min-h-[44px] min-w-[44px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-[11px] font-black hover:bg-gold/20 transition-colors active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main"
        >
          {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
        </button>
      ) : (
        <span
          className="text-[10px] text-white/30 font-bold tabular-nums flex-shrink-0 w-16 text-right"
          aria-label={ipo.status === 'ended'
            ? t('ipoStatusEnded', { defaultMessage: 'Verkauf beendet' })
            : t('ipoStatusPlanned', { defaultMessage: 'Verkauf geplant' })}
        >
          {ipo.status === 'ended' ? t('ipoBeendet', { defaultMessage: 'Beendet' }) : t('ipoGeplant', { defaultMessage: 'Geplant' })}
        </span>
      )}
    </Link>
  );
}
