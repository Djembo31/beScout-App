'use client';

import React from 'react';
import Link from 'next/link';
import { PlayerPhoto, PositionBadge, GoalBadge } from '@/components/player';
import { getPosAccent, getRingFrameClass, getMatchScore } from '../spieltag/helpers';
import { getScoreBadgeStyle } from '@/components/player/scoreColor';
import type { FixturePlayerStat } from '@/types';
import type { Pos } from '@/types';

const MEDALS = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];

function PlayerLink({ playerId, className, children, style }: { playerId: string | null; className: string; children: React.ReactNode; style?: React.CSSProperties }) {
  if (playerId) return <Link href={`/player/${playerId}`} className={className} style={style}>{children}</Link>;
  return <div className={className} style={style}>{children}</div>;
}

type Props = {
  scorers: FixturePlayerStat[];
};

export function Top3Cards({ scorers }: Props) {
  const top3 = scorers.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
      {top3.map((stat, i) => {
        const score = getMatchScore(stat);
        const accent = getPosAccent(stat.player_position);
        const isFirst = i === 0;

        return (
          <PlayerLink
            key={stat.id}
            playerId={stat.player_id}
            className={`flex-shrink-0 w-[130px] snap-start rounded-xl p-2.5 card-carbon-mini border border-white/[0.06] hover:bg-white/[0.04] transition-colors active:bg-white/[0.06] relative ${isFirst ? 'card-gold-frame mvp-crown-glow' : ''}`}
            style={{ borderLeftColor: accent, borderLeftWidth: '2px' }}
          >
            {/* Medal */}
            <div className="absolute top-1.5 left-1.5 text-sm">{MEDALS[i]}</div>

            <div className="flex flex-col items-center gap-1.5 pt-3">
              {/* Photo with ring frame */}
              <div className={`relative rounded-full ${getRingFrameClass(stat.player_position)}`}>
                <PlayerPhoto
                  imageUrl={stat.player_image_url}
                  first={stat.player_first_name}
                  last={stat.player_last_name}
                  pos={stat.player_position as Pos}
                  size={isFirst ? 44 : 36}
                />
                <GoalBadge goals={stat.goals} size={16} />
              </div>

              {/* Rating */}
              <span className="px-1.5 py-0.5 rounded-md text-xs font-mono font-black tabular-nums" style={getScoreBadgeStyle(score)}>
                {score ?? '\u2013'}
              </span>

              {/* Name */}
              <div className="text-xs font-bold truncate max-w-full text-center">
                {(stat.player_first_name || '?').charAt(0)}. {stat.player_last_name || '?'}
              </div>

              {/* Club */}
              <div className="text-xs text-white/40">{stat.club_short}</div>

              {/* Stats row */}
              <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums">
                {stat.assists > 0 && <span className="text-sky-400 font-bold">{stat.assists}A</span>}
                {stat.clean_sheet && stat.player_position === 'GK' && <span className="text-emerald-400 font-bold">CS</span>}
              </div>
            </div>
          </PlayerLink>
        );
      })}
    </div>
  );
}
