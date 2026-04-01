'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PlayerPhoto } from '@/components/player';
import { CollectionProgress } from './CollectionProgress';
import { fmtScout, cn } from '@/lib/utils';
import type { Player } from '@/types';

type Props = {
  players: Player[];
  ownedPlayerIds: Set<string>;
  clubColor: string;
  onViewAll: () => void;
};

export function SquadPreviewSection({ players, ownedPlayerIds, clubColor, onViewAll }: Props) {
  const t = useTranslations('club');

  const totalPlayers = players.length;
  const ownedCount = players.filter(p => ownedPlayerIds.has(p.id)).length;
  const trending = [...players]
    .sort((a, b) => (b.prices.change24h ?? 0) - (a.prices.change24h ?? 0))
    .slice(0, 5);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5" style={{ color: clubColor }} />
          <h2 className="font-black text-balance">{t('trendingPlayers')}</h2>
        </div>
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-colors"
          style={{ color: 'var(--club-primary, #FFD700)' }}
        >
          {t('viewAll')} <ChevronRight className="size-3" />
        </button>
      </div>

      {/* Collection progress */}
      <div className="mb-4">
        <CollectionProgress owned={ownedCount} total={totalPlayers} clubColor={clubColor} />
      </div>

      {/* Trending carousel */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {trending.map((player) => {
          const change = player.prices.change24h ?? 0;
          const isOwned = ownedPlayerIds.has(player.id);
          return (
            <Link
              key={player.id}
              href={`/player/${player.id}`}
              className={cn(
                'flex-shrink-0 w-[140px] rounded-2xl p-3 border transition-colors',
                'bg-surface-minimal border-white/10 hover:border-[var(--club-primary,#FFD700)]/40',
                'hover:-translate-y-0.5 active:scale-[0.97]',
                'shadow-card-sm hover:shadow-card-md',
                isOwned && 'ring-1 ring-gold/30'
              )}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <PlayerPhoto first={player.first} last={player.last} pos={player.pos} size={48} />
                <div className="w-full min-w-0">
                  <div className="text-sm font-bold truncate">{player.last}</div>
                  <div className="text-[10px] text-white/40">
                    {player.pos} · {fmtScout(player.prices.floor ?? player.prices.referencePrice ?? 0)}
                  </div>
                </div>
                <div className={cn(
                  'text-xs font-mono font-bold tabular-nums flex items-center gap-0.5',
                  change >= 0 ? 'text-green-500' : 'text-red-400'
                )}>
                  {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                  {Math.abs(change).toFixed(1)}%
                </div>
                {isOwned && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold font-bold">
                    {t('owned')}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
