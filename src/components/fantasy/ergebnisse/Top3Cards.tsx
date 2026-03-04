'use client';

import React from 'react';
import Link from 'next/link';
import { PlayerPhoto, PositionBadge } from '@/components/player';
import { scoreBadgeColor, getPosAccent } from '../spieltag/helpers';
import type { FixturePlayerStat } from '@/types';
import type { Pos } from '@/types';

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

type Props = {
  scorers: FixturePlayerStat[];
};

export function Top3Cards({ scorers }: Props) {
  const top3 = scorers.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
      {top3.map((stat, i) => {
        const rating = stat.rating ?? stat.fantasy_points / 10;
        const accent = getPosAccent(stat.player_position);
        const isFirst = i === 0;

        return (
          <Link
            key={stat.id}
            href={`/player/${stat.player_id}`}
            className={`flex-shrink-0 w-[120px] snap-start rounded-xl p-2.5 card-carbon-mini border border-white/[0.06] hover:bg-white/[0.04] transition-colors active:bg-white/[0.06] relative ${isFirst ? 'card-gold-frame' : ''}`}
            style={{ borderLeftColor: accent, borderLeftWidth: '2px' }}
          >
            {/* Medal */}
            <div className="absolute top-1.5 left-1.5 text-sm">{MEDALS[i]}</div>

            <div className="flex flex-col items-center gap-1.5 pt-3">
              {/* Photo */}
              <PlayerPhoto
                imageUrl={stat.player_image_url}
                first={stat.player_first_name}
                last={stat.player_last_name}
                pos={stat.player_position as Pos}
                size={36}
              />

              {/* Rating */}
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-mono font-black tabular-nums ${scoreBadgeColor(rating)}`}>
                {rating.toFixed(1)}
              </span>

              {/* Name */}
              <div className="text-xs font-bold truncate max-w-full text-center">
                {stat.player_first_name.charAt(0)}. {stat.player_last_name}
              </div>

              {/* Club */}
              <div className="text-[9px] text-white/40">{stat.club_short}</div>

              {/* Stats row */}
              <div className="flex items-center gap-1.5 text-[9px] font-mono tabular-nums">
                {stat.goals > 0 && <span className="text-gold font-bold">{stat.goals}G</span>}
                {stat.assists > 0 && <span className="text-sky-400 font-bold">{stat.assists}A</span>}
                {stat.clean_sheet && <span className="text-emerald-400 font-bold">CS</span>}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
