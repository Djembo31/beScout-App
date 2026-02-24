'use client';

import React from 'react';
import { Trophy, Target, HandHelping, ShieldCheck, Star } from 'lucide-react';
import type { FixturePlayerStat } from '@/types';
import { posColor, scoreBadgeColor } from './helpers';

type Props = {
  scorers: FixturePlayerStat[];
  gameweek: number;
};

const MEDALS = ['', '', ''];

function HeroCard({ stat, medal }: { stat: FixturePlayerStat; medal: string }) {
  return (
    <div className="rounded-2xl border-2 border-[#FFD700]/30 bg-gradient-to-br from-[#FFD700]/[0.08] via-transparent to-transparent p-4 relative overflow-hidden"
      style={{ boxShadow: '0 0 20px rgba(255,215,0,0.08)' }}
    >
      {/* Medal */}
      <div className="absolute top-3 right-3 text-2xl">{medal}</div>

      <div className="flex items-start gap-3">
        {/* Score badge */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${scoreBadgeColor(stat.fantasy_points)}`}>
          {stat.fantasy_points}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-lg font-bold truncate">{stat.player_first_name} {stat.player_last_name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${posColor(stat.player_position)}`}>
              {stat.player_position}
            </span>
            <span className="text-xs text-white/40">{stat.club_short}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-3">
        {stat.goals > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Target className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="font-bold text-[#FFD700]">{stat.goals}</span>
          </div>
        )}
        {stat.assists > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <HandHelping className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-bold text-sky-400">{stat.assists}</span>
          </div>
        )}
        {stat.clean_sheet && (
          <div className="flex items-center gap-1 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-emerald-400">CS</span>
          </div>
        )}
        {stat.bonus > 0 && (
          <div className="flex items-center gap-1 text-xs">
            <Star className="w-3.5 h-3.5 text-[#FFD700]" />
            <span className="font-bold text-[#FFD700]">{stat.bonus}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PodiumCard({ stat, rank, medal }: { stat: FixturePlayerStat; rank: number; medal: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{medal}</span>
        <span className="text-[10px] text-white/30 font-bold">#{rank}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black ${scoreBadgeColor(stat.fantasy_points)}`}>
          {stat.fantasy_points}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold truncate">{stat.player_first_name.charAt(0)}. {stat.player_last_name}</div>
          <div className="flex items-center gap-1.5">
            <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${posColor(stat.player_position)}`}>
              {stat.player_position}
            </span>
            <span className="text-[10px] text-white/30">{stat.club_short}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompactRow({ stat, rank }: { stat: FixturePlayerStat; rank: number }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-xs">
      <span className="w-5 text-center font-bold text-white/25">{rank}</span>
      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${posColor(stat.player_position)}`}>
        {stat.player_position}
      </span>
      <span className="flex-1 font-semibold truncate min-w-0">
        {stat.player_first_name.charAt(0)}. {stat.player_last_name}
      </span>
      <span className="text-white/30">{stat.club_short}</span>
      {stat.goals > 0 && <span className="text-[#FFD700] font-bold">{stat.goals}G</span>}
      {stat.assists > 0 && <span className="text-sky-400 font-bold">{stat.assists}A</span>}
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${scoreBadgeColor(stat.fantasy_points)}`}>
        {stat.fantasy_points}
      </span>
    </div>
  );
}

export function TopScorerShowcase({ scorers, gameweek }: Props) {
  if (scorers.length === 0) return null;

  const [first, ...rest] = scorers;
  const podium = rest.slice(0, 2); // #2 and #3
  const compact = rest.slice(2);    // #4-10

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-[#FFD700]" />
        <h2 className="text-sm font-black uppercase tracking-wider">Top Scorer</h2>
        <span className="text-[10px] text-white/25">Spieltag {gameweek}</span>
      </div>

      {/* #1 Hero */}
      <HeroCard stat={first} medal={MEDALS[0]} />

      {/* #2-3 Grid */}
      {podium.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          {podium.map((s, i) => (
            <PodiumCard key={s.id} stat={s} rank={i + 2} medal={MEDALS[i + 1]} />
          ))}
        </div>
      )}

      {/* #4-10 compact */}
      {compact.length > 0 && (
        <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
          {compact.map((s, i) => (
            <CompactRow key={s.id} stat={s} rank={i + 4} />
          ))}
        </div>
      )}
    </div>
  );
}
