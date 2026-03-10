'use client';

import React from 'react';
import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import { PlayerPhoto } from '@/components/player';
import { FillBar } from '@/components/fantasy/events/FillBar';
import type { Player, DbIpo } from '@/types';

type Props = {
  ipos: DbIpo[];
  players: Player[];
  clubColor: string;
};

export function ActiveOffersSection({ ipos, players, clubColor }: Props) {
  const t = useTranslations('club');

  if (ipos.length === 0) return null;

  const playerMap = new Map(players.map(p => [p.id, p]));

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="size-5" style={{ color: clubColor }} />
          <h2 className="font-black text-balance">{t('activeOffers')}</h2>
        </div>
        <span className="text-xs text-white/40 font-mono tabular-nums">{ipos.length}</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {ipos.map(ipo => {
          const player = playerMap.get(ipo.player_id);
          if (!player) return null;

          const sold = ipo.sold;
          const endDate = new Date(ipo.ends_at);
          const diff = endDate.getTime() - Date.now();
          const daysLeft = Math.max(0, Math.ceil(diff / 86400000));

          return (
            <Link
              key={ipo.id}
              href={`/player/${player.id}`}
              className={cn(
                'flex-shrink-0 w-[200px] snap-start rounded-2xl p-3 border transition-colors',
                'bg-white/[0.02] border-white/10 hover:border-white/20 active:scale-[0.98]',
                'shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
              )}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <PlayerPhoto first={player.first} last={player.last} pos={player.pos} size={32} />
                <div className="min-w-0">
                  <div className="font-bold text-xs truncate">{player.first} {player.last}</div>
                  <div className="text-[10px] text-white/40">{player.pos}</div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-gold text-sm tabular-nums">{fmtScout(ipo.price)}</span>
                <span className={cn(
                  'text-xs font-mono tabular-nums',
                  daysLeft <= 1 ? 'text-red-400 font-bold' : daysLeft <= 3 ? 'text-amber-400' : 'text-white/40'
                )}>
                  {daysLeft}d
                </span>
              </div>

              <FillBar current={sold} max={ipo.total_offered} variant="card" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
