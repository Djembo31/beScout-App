'use client';

import React from 'react';
import Link from 'next/link';
import { PositionBadge, PlayerPhoto, getL5Color } from '@/components/player';
import { fmtBSD, cn } from '@/lib/utils';
import type { Player } from '@/types';

interface ComparePlayerCardProps {
  player: Player;
  isHighest: Record<string, boolean>; // stat key → is this player the highest?
}

export default function ComparePlayerCard({ player, isHighest }: ComparePlayerCardProps) {
  return (
    <Link href={`/player/${player.id}`} className="block text-center p-3 hover:bg-white/[0.02] rounded-xl transition-colors">
      <div className="flex flex-col items-center gap-2 mb-2">
        <PlayerPhoto imageUrl={player.imageUrl} first={player.first} last={player.last} pos={player.pos} size={48} />
        <div className="flex items-center gap-1.5">
          <PositionBadge pos={player.pos} size="sm" />
          <div className="font-bold text-sm truncate">{player.first} {player.last}</div>
        </div>
      </div>
      <div className="text-[11px] text-white/40 mb-3">{player.club} · {player.age} J.</div>

      <div className="space-y-2 text-xs">
        <StatRow label="L5 Perf" value={String(player.perf.l5)} gold={isHighest.l5} color={isHighest.l5 ? undefined : getL5Color(player.perf.l5)} />
        <StatRow label="L15 Perf" value={String(player.perf.l15)} gold={isHighest.l15} color={isHighest.l15 ? undefined : getL5Color(player.perf.l15)} />
        <StatRow label="Spiele" value={String(player.stats.matches)} gold={isHighest.matches} />
        <StatRow label="Tore" value={String(player.stats.goals)} gold={isHighest.goals} />
        <StatRow label="Assists" value={String(player.stats.assists)} gold={isHighest.assists} />
        <StatRow label="Floor" value={`${fmtBSD(player.prices.floor ?? 0)} BSD`} gold={isHighest.floor} />
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
