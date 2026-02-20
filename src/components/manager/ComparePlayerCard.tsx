'use client';

import React from 'react';
import Link from 'next/link';
import { PlayerIdentity, getL5Color } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import type { Player } from '@/types';

interface ComparePlayerCardProps {
  player: Player;
  isHighest: Record<string, boolean>; // stat key → is this player the highest?
}

export default function ComparePlayerCard({ player, isHighest }: ComparePlayerCardProps) {
  return (
    <Link href={`/player/${player.id}`} className="block text-center p-3 hover:bg-white/[0.02] rounded-xl transition-colors">
      <div className="flex flex-col items-center gap-2 mb-3">
        <PlayerIdentity
          player={{ first: player.first, last: player.last, pos: player.pos, status: player.status ?? 'fit', club: player.club, ticket: player.ticket ?? 0, age: player.age ?? 0, imageUrl: player.imageUrl }}
          size="lg"
          showMeta
        />
      </div>

      <div className="space-y-2 text-xs">
        <StatRow label="L5 Perf" value={String(player.perf.l5)} gold={isHighest.l5} color={isHighest.l5 ? undefined : getL5Color(player.perf.l5)} />
        <StatRow label="L15 Perf" value={String(player.perf.l15)} gold={isHighest.l15} color={isHighest.l15 ? undefined : getL5Color(player.perf.l15)} />
        <StatRow label="Spiele" value={String(player.stats.matches)} gold={isHighest.matches} />
        <StatRow label="Tore" value={String(player.stats.goals)} gold={isHighest.goals} />
        <StatRow label="Assists" value={String(player.stats.assists)} gold={isHighest.assists} />
        <StatRow label="Floor" value={`${fmtScout(player.prices.floor ?? 0)} $SCOUT`} gold={isHighest.floor} />
        <StatRow label="24h" value={`${player.prices.change24h >= 0 ? '+' : ''}${player.prices.change24h.toFixed(1)}%`}
          color={player.prices.change24h >= 0 ? 'text-[#22C55E]' : 'text-red-400'} gold={isHighest.change} />
      </div>
    </Link>
  );
}

function StatRow({ label, value, gold, color }: { label: string; value: string; gold?: boolean; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
      <span className="text-white/40">{label}</span>
      <span className={cn(
        'font-mono font-bold',
        gold ? 'text-[#FFD700]' : color ?? 'text-white/80'
      )}>
        {value}
      </span>
    </div>
  );
}
