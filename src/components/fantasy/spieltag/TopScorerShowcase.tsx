'use client';

import React, { useState, useMemo } from 'react';
import { Trophy, Target, HandHelping, ShieldCheck, Star } from 'lucide-react';
import type { FixturePlayerStat } from '@/types';
import { posColor, scoreBadgeColor } from './helpers';

type PosFilter = 'all' | 'GK' | 'DEF' | 'MID' | 'ATT';
const POS_FILTERS: { id: PosFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'GK', label: 'GK' },
  { id: 'DEF', label: 'DEF' },
  { id: 'MID', label: 'MID' },
  { id: 'ATT', label: 'ATT' },
];

type Props = {
  scorers: FixturePlayerStat[];
  gameweek: number;
};

const MEDALS = ['', '', ''];

function HeroCard({ stat, medal }: { stat: FixturePlayerStat; medal: string }) {
  return (
    <div className="rounded-2xl border-2 border-gold/30 bg-gradient-to-br from-gold/[0.08] via-transparent to-transparent p-4 relative overflow-hidden"
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
            <Target className="w-3.5 h-3.5 text-gold" />
            <span className="font-bold text-gold">{stat.goals}</span>
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
            <Star className="w-3.5 h-3.5 text-gold" />
            <span className="font-bold text-gold">{stat.bonus}</span>
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
      {stat.goals > 0 && <span className="text-gold font-bold">{stat.goals}G</span>}
      {stat.assists > 0 && <span className="text-sky-400 font-bold">{stat.assists}A</span>}
      <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${scoreBadgeColor(stat.fantasy_points)}`}>
        {stat.fantasy_points}
      </span>
    </div>
  );
}

export function TopScorerShowcase({ scorers, gameweek }: Props) {
  const [posFilter, setPosFilter] = useState<PosFilter>('all');

  const filtered = useMemo(() => {
    if (posFilter === 'all') return scorers;
    return scorers.filter(s => s.player_position === posFilter);
  }, [scorers, posFilter]);

  if (scorers.length === 0) return null;

  const [first, ...rest] = filtered;
  const podium = rest.slice(0, 2); // #2 and #3
  const compact = rest.slice(2);    // #4-10

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-gold" />
        <h2 className="text-sm font-black uppercase tracking-wider">Top Scorer</h2>
        <span className="text-[10px] text-white/25">Spieltag {gameweek}</span>
      </div>

      {/* Position filter pills */}
      <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1">
        {POS_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setPosFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all min-h-[44px] ${
              posFilter === f.id
                ? 'bg-gold/15 text-gold border border-gold/30'
                : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/60'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-6 text-white/30 text-sm">
          Keine Spieler für diese Position
        </div>
      ) : (
        <>
          {/* #1 Hero */}
          {first && <HeroCard stat={first} medal={MEDALS[0]} />}

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
        </>
      )}
    </div>
  );
}
