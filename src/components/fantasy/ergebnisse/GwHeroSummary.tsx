'use client';

import React from 'react';
import Link from 'next/link';
import { Goal, HandHelping, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { PlayerPhoto, PositionBadge, GoalBadge } from '@/components/player';
import { getRingFrameClass, getMatchScore } from '../spieltag/helpers';
import { getScoreBadgeStyle } from '@/components/player/scoreColor';
import type { FixturePlayerStat } from '@/types';
import type { Pos } from '@/types';

type GwSummary = {
  totalGoals: number;
  totalAssists: number;
  cleanSheets: number;
  avgRating: number;
  yellowCards: number;
  best: FixturePlayerStat;
};

type Props = {
  summary: GwSummary;
};

export function GwHeroSummary({ summary }: Props) {
  const tf = useTranslations('fantasy');
  const { best, avgRating, totalGoals, totalAssists, cleanSheets, yellowCards } = summary;
  const mvpScore = getMatchScore(best);

  return (
    <Card surface="elevated" className="rounded-2xl overflow-hidden">
      {/* MVP Hero Row — full width */}
      <Link
        href={`/player/${best.player_id}`}
        className="relative flex items-center gap-3 p-3 hover:bg-white/[0.04] transition-colors active:bg-white/[0.06]"
        style={{ background: 'linear-gradient(135deg, rgba(255,215,0,0.06), transparent, rgba(255,215,0,0.04))' }}
      >
        {/* MVP label */}
        <div className="absolute top-2 left-3 text-xs text-gold/70 font-black uppercase tracking-[0.15em]">MVP</div>

        {/* Photo with crown glow + position ring */}
        <div className="relative mt-3">
          <div className={`rounded-full mvp-crown-glow ${getRingFrameClass(best.player_position)}`}>
            <PlayerPhoto
              imageUrl={best.player_image_url}
              first={best.player_first_name}
              last={best.player_last_name}
              pos={best.player_position as Pos}
              size={56}
            />
          </div>
          <GoalBadge goals={best.goals} size={18} />
        </div>

        {/* Name + position */}
        <div className="flex-1 min-w-0 mt-3">
          <div className="font-black text-sm truncate">
            {best.player_first_name.charAt(0)}. {best.player_last_name}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-black tabular-nums" style={getScoreBadgeStyle(mvpScore)}>
              {mvpScore ?? '\u2013'}
            </span>
            <PositionBadge pos={best.player_position as Pos} size="sm" />
          </div>
        </div>

        {/* Avg Rating — right side */}
        <div className="text-center flex-shrink-0 mt-3">
          <div className="text-2xl font-mono font-black tabular-nums gold-glow">{Math.round(avgRating)}</div>
          <div className="text-xs text-white/40">{tf('ergebnisse.avgRating')}</div>
        </div>
      </Link>

      {/* 4-col stat strip */}
      <div className="grid grid-cols-4 border-t border-white/[0.06]">
        <div className="p-2.5 flex items-center justify-center gap-1.5">
          <Goal className="size-3.5 text-gold" aria-hidden="true" />
          <span className="font-mono font-bold tabular-nums text-sm">{totalGoals}</span>
        </div>
        <div className="p-2.5 flex items-center justify-center gap-1.5 border-l border-white/[0.06]">
          <HandHelping className="size-3.5 text-sky-400" aria-hidden="true" />
          <span className="font-mono font-bold tabular-nums text-sm">{totalAssists}</span>
        </div>
        <div className="p-2.5 flex items-center justify-center gap-1.5 border-l border-white/[0.06]">
          <ShieldCheck className="size-3.5 text-emerald-400" aria-hidden="true" />
          <span className="font-mono font-bold tabular-nums text-sm">{cleanSheets}</span>
        </div>
        <div className="p-2.5 flex items-center justify-center gap-1.5 border-l border-white/[0.06]">
          <AlertTriangle className="size-3.5 text-amber-400" aria-hidden="true" />
          <span className="font-mono font-bold tabular-nums text-sm">{yellowCards}</span>
        </div>
      </div>

      {/* Floodlight divider */}
      <div className="floodlight-divider" />
    </Card>
  );
}
