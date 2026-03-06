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
  onBuy: (playerId: string) => void;
  buying: boolean;
}

export default function PlayerIPORow({ player: p, ipo, onBuy, buying }: PlayerIPORowProps) {
  const t = useTranslations('market');
  const priceBsd = centsToBsd(ipo.price);
  const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className="flex items-center gap-2 px-3 py-2 hover:bg-white/[0.03] transition-colors rounded-lg group"
    >
      <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />

      <span className={cn('font-mono font-bold text-[11px] tabular-nums flex-shrink-0', getL5Color(p.perf.l5))}>
        {p.perf.l5}
      </span>

      <div className="w-10 flex-shrink-0 hidden sm:block">
        <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-vivid-green"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <span className="text-[8px] text-white/30 tabular-nums">{progress.toFixed(0)}%</span>
      </div>

      <CountdownBadge targetDate={ipo.ends_at} compact className="flex-shrink-0 w-16 text-right" />

      <span className="font-mono font-black text-xs text-gold tabular-nums flex-shrink-0 w-16 text-right">
        {fmtScout(priceBsd)}
      </span>

      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
        disabled={buying}
        className="px-3 py-1.5 min-h-[36px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-[11px] font-black hover:bg-gold/20 transition-colors active:scale-[0.95] disabled:opacity-50 flex-shrink-0 flex items-center gap-1"
      >
        {buying ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
      </button>
    </Link>
  );
}
