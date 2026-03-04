'use client';

import React from 'react';
import Link from 'next/link';
import { Goal, HandHelping, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui';
import { PlayerPhoto, PositionBadge, GoalBadge } from '@/components/player';
import { scoreBadgeColor } from '../spieltag/helpers';
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
  const mvpRating = best.rating ?? best.fantasy_points / 10;

  return (
    <Card surface="elevated" className="rounded-2xl overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr] gap-0">
        {/* MVP (left) */}
        <Link
          href={`/player/${best.player_id}`}
          className="p-3 flex flex-col items-center gap-1.5 hover:bg-white/[0.04] transition-colors active:bg-white/[0.06] border-r border-white/[0.06]"
        >
          <div className="relative">
            <PlayerPhoto
              imageUrl={best.player_image_url}
              first={best.player_first_name}
              last={best.player_last_name}
              pos={best.player_position as Pos}
              size={44}
            />
            <GoalBadge goals={best.goals} size={18} />
          </div>
          <div className="text-center min-w-0 w-full">
            <div className="font-black text-sm truncate">
              {best.player_first_name.charAt(0)}. {best.player_last_name}
            </div>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black tabular-nums ${scoreBadgeColor(mvpRating)}`}>
                {mvpRating.toFixed(1)}
              </span>
              <PositionBadge pos={best.player_position as Pos} size="sm" />
            </div>
          </div>
          <div className="text-[9px] text-white/30 font-bold uppercase tracking-wider">MVP</div>
        </Link>

        {/* Stats (right) */}
        <div className="p-3 flex flex-col items-center justify-center gap-2">
          {/* Avg Rating — hero number */}
          <div className="text-center">
            <div className="text-xl font-mono font-black tabular-nums gold-glow">{avgRating.toFixed(1)}</div>
            <div className="text-[9px] text-white/40 mt-0.5">{tf('ergebnisse.avgRating')}</div>
          </div>

          {/* 2x2 mini stats */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex items-center gap-1">
              <Goal className="size-3 text-gold" aria-hidden="true" />
              <span className="font-mono font-bold tabular-nums text-sm">{totalGoals}</span>
            </div>
            <div className="flex items-center gap-1">
              <HandHelping className="size-3 text-sky-400" aria-hidden="true" />
              <span className="font-mono font-bold tabular-nums text-sm">{totalAssists}</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="size-3 text-emerald-400" aria-hidden="true" />
              <span className="font-mono font-bold tabular-nums text-sm">{cleanSheets}</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="size-3 text-amber-400" aria-hidden="true" />
              <span className="font-mono font-bold tabular-nums text-sm">{yellowCards}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floodlight divider */}
      <div className="floodlight-divider" />
    </Card>
  );
}
