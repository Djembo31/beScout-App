'use client';

import React from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { PlayerPhoto } from '@/components/player';
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
    <Card className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-5" style={{ color: clubColor }} />
          <span className="font-black text-balance">{t('trendingPlayers')}</span>
        </div>
        <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-gold font-semibold hover:text-gold/80 transition-colors">
          {t('viewAll')} <ChevronRight className="size-3" />
        </button>
      </div>

      {/* Collection progress */}
      {totalPlayers > 0 && (
        <div className="mb-4 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-white/50">{t('collectionProgress')}</span>
            <span className="text-xs font-mono font-bold tabular-nums" style={{ color: clubColor }}>
              {ownedCount} / {totalPlayers}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${totalPlayers > 0 ? (ownedCount / totalPlayers) * 100 : 0}%`, background: clubColor }}
            />
          </div>
        </div>
      )}

      {/* Trending list */}
      <div className="space-y-1">
        {trending.map((player, i) => {
          const change = player.prices.change24h ?? 0;
          const isOwned = ownedPlayerIds.has(player.id);
          return (
            <Link
              key={player.id}
              href={`/player/${player.id}`}
              className={cn(
                'flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/[0.04]',
                isOwned && 'bg-gold/[0.03]'
              )}
            >
              <span className="text-xs font-mono text-white/30 w-4 text-center tabular-nums">{i + 1}</span>
              <PlayerPhoto first={player.first} last={player.last} pos={player.pos} size={24} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">
                  {player.last}
                  {isOwned && <span className="ml-1.5 text-[9px] px-1 py-0.5 rounded bg-gold/15 text-gold font-bold">{t('owned')}</span>}
                </div>
                <div className="text-xs text-white/40">{player.pos} · {fmtScout(player.prices.floor ?? 0)}</div>
              </div>
              <div className={cn('text-xs font-mono font-bold tabular-nums flex items-center gap-0.5', change >= 0 ? 'text-green-500' : 'text-red-400')}>
                {change >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {Math.abs(change).toFixed(1)}%
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
