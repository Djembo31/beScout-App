'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PlayerPhoto, GoalBadge } from '@/components/player';
import type { FixturePlayerStat } from '@/types';
import type { Pos } from '@/types';
import { getPosAccent, getRingFrameClass, getMatchScore } from './helpers';
import { getScoreBadgeStyle } from '@/components/player/scoreColor';

type Props = {
  scorers: FixturePlayerStat[];
  gameweek: number;
};

type Mode = '7er' | '11er';

type FormationDef = {
  name: string;
  slots: { pos: string; count: number }[];
};

// ============================================
// Effective Position (match_position > player_position > 'MID')
// ============================================

function getEffectivePosition(stat: FixturePlayerStat): string {
  return stat.match_position || stat.player_position || 'MID';
}

// ============================================
// Formation Definitions
// ============================================

const FORMATIONS_11: FormationDef[] = [
  { name: '4-3-3', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 4 }, { pos: 'MID', count: 3 }, { pos: 'ATT', count: 3 }] },
  { name: '4-4-2', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 4 }, { pos: 'MID', count: 4 }, { pos: 'ATT', count: 2 }] },
  { name: '3-4-3', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 3 }, { pos: 'MID', count: 4 }, { pos: 'ATT', count: 3 }] },
  { name: '3-5-2', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 3 }, { pos: 'MID', count: 5 }, { pos: 'ATT', count: 2 }] },
  { name: '5-3-2', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 5 }, { pos: 'MID', count: 3 }, { pos: 'ATT', count: 2 }] },
  { name: '5-4-1', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 5 }, { pos: 'MID', count: 4 }, { pos: 'ATT', count: 1 }] },
  { name: '4-5-1', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 4 }, { pos: 'MID', count: 5 }, { pos: 'ATT', count: 1 }] },
  { name: '4-2-4', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 4 }, { pos: 'MID', count: 2 }, { pos: 'ATT', count: 4 }] },
];

const FORMATIONS_7: FormationDef[] = [
  { name: '2-2-2', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 2 }, { pos: 'MID', count: 2 }, { pos: 'ATT', count: 2 }] },
  { name: '3-2-1', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 3 }, { pos: 'MID', count: 2 }, { pos: 'ATT', count: 1 }] },
  { name: '2-3-1', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 2 }, { pos: 'MID', count: 3 }, { pos: 'ATT', count: 1 }] },
  { name: '3-1-2', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 3 }, { pos: 'MID', count: 1 }, { pos: 'ATT', count: 2 }] },
  { name: '1-3-2', slots: [{ pos: 'GK', count: 1 }, { pos: 'DEF', count: 1 }, { pos: 'MID', count: 3 }, { pos: 'ATT', count: 2 }] },
];

// ============================================
// Multi-Formation Optimizer
// ============================================

function optimizeBestTeam(
  scorers: FixturePlayerStat[],
  formations: FormationDef[],
  teamSize: number,
): { players: FixturePlayerStat[]; formation: FormationDef } {
  // Group by effective position, sorted by rating DESC
  const byPos = new Map<string, FixturePlayerStat[]>();
  for (const s of scorers) {
    const pos = getEffectivePosition(s);
    const arr = byPos.get(pos) || [];
    arr.push(s);
    byPos.set(pos, arr);
  }
  Array.from(byPos.values()).forEach(arr => arr.sort((a, b) => (getMatchScore(b) ?? 0) - (getMatchScore(a) ?? 0)));

  let bestPlayers: FixturePlayerStat[] = [];
  let bestFormation: FormationDef = formations[0];
  let bestTotalRating = -1;

  for (const formation of formations) {
    const picked: FixturePlayerStat[] = [];
    const pickedIds = new Set<string>();
    let canFill = true;

    for (const { pos, count } of formation.slots) {
      const candidates = (byPos.get(pos) || []).filter(p => !pickedIds.has(p.id));
      if (candidates.length < count) {
        canFill = false;
        break;
      }
      for (let i = 0; i < count; i++) {
        picked.push(candidates[i]);
        pickedIds.add(candidates[i].id);
      }
    }

    if (!canFill) continue;

    const totalRating = picked.reduce((s, p) => s + (getMatchScore(p) ?? 0), 0);
    if (totalRating > bestTotalRating) {
      bestTotalRating = totalRating;
      bestPlayers = picked;
      bestFormation = formation;
    }
  }

  // Fallback: if NO formation fills completely, take top N by rating (greedy)
  if (bestPlayers.length === 0) {
    const sorted = [...scorers].sort((a, b) => (getMatchScore(b) ?? 0) - (getMatchScore(a) ?? 0));
    bestPlayers = sorted.slice(0, teamSize);
  }

  return { players: bestPlayers, formation: bestFormation };
}

// ============================================
// Formation Row Layout
// ============================================

function getFormationRows(players: FixturePlayerStat[]): FixturePlayerStat[][] {
  const posOrder = ['GK', 'DEF', 'MID', 'ATT'];
  const grouped = new Map<string, FixturePlayerStat[]>();

  for (const p of players) {
    const pos = getEffectivePosition(p);
    const arr = grouped.get(pos) || [];
    arr.push(p);
    grouped.set(pos, arr);
  }

  return posOrder
    .map(pos => (grouped.get(pos) || []).sort((a, b) => (getMatchScore(b) ?? 0) - (getMatchScore(a) ?? 0)))
    .filter(row => row.length > 0);
}

// ============================================
// PitchNode — Player on Pitch
// ============================================

function PitchNode({ stat }: { stat: FixturePlayerStat }) {
  const effectivePos = getEffectivePosition(stat);
  const accent = getPosAccent(effectivePos);
  const score = getMatchScore(stat);
  const hasImage = !!stat.player_image_url;

  return (
    <Link href={stat.player_id ? `/player/${stat.player_id}` : '#'} className="flex flex-col items-center w-[42px] sm:w-[52px] md:w-[60px] hover:scale-105 transition-transform active:scale-95">
      {/* Score badge — heat-map */}
      <div
        className="mb-0.5 min-w-[1.5rem] px-1 py-px rounded-full text-xs font-mono font-black text-center shadow-lg tabular-nums"
        style={getScoreBadgeStyle(score)}
      >
        {score ?? '\u2013'}
      </div>
      {/* Circle with PlayerPhoto or initials + ring frame + badges */}
      <div className={`relative rounded-full ${getRingFrameClass(effectivePos)}`}>
        {hasImage ? (
          <PlayerPhoto
            imageUrl={stat.player_image_url}
            first={stat.player_first_name}
            last={stat.player_last_name}
            pos={effectivePos as Pos}
            size={32}
            className="sm:!w-[2.25rem] sm:!h-[2.25rem] md:!w-[2.75rem] md:!h-[2.75rem]"
          />
        ) : (
          <div
            className="size-8 sm:size-9 md:size-11 rounded-full flex items-center justify-center border-2 bg-black/40"
            style={{ borderColor: accent, boxShadow: `0 0 10px ${accent}30` }}
          >
            <span className="font-bold text-xs" style={{ color: accent }}>
              {(stat.player_last_name || '?').slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        {/* Goal badge — bottom right */}
        <GoalBadge goals={stat.goals} size={14} className="-bottom-0.5 -right-1 sm:size-4" />
        {/* Assists badge — bottom left */}
        {stat.assists > 0 && (
          <span className="absolute -bottom-0.5 -left-1 min-w-[14px] sm:size-4 px-0.5 rounded-full bg-sky-500 text-white text-xs font-bold text-center leading-[14px] sm:leading-4 shadow-lg">
            {stat.assists}A
          </span>
        )}
        {/* Card badge — top left */}
        {stat.red_card ? (
          <span className="absolute -top-0.5 -left-0.5 w-[8px] h-[11px] sm:w-[9px] sm:h-[12px] bg-red-500 rounded-[1px] shadow-lg" />
        ) : stat.yellow_card ? (
          <span className="absolute -top-0.5 -left-0.5 w-[8px] h-[11px] sm:w-[9px] sm:h-[12px] bg-yellow-400 rounded-[1px] shadow-lg" />
        ) : null}
      </div>
      {/* Name */}
      <div className="text-xs mt-0.5 font-medium text-center truncate max-w-full text-white/70">
        {stat.player_last_name || '?'}
      </div>
      {/* Club */}
      <div className="text-xs text-white/30 text-center truncate max-w-full">
        {stat.club_short}
      </div>
    </Link>
  );
}

// ============================================
// Main Component
// ============================================

export function BestElevenShowcase({ scorers, gameweek }: Props) {
  const t = useTranslations('fantasy');
  const [mode, setMode] = useState<Mode>('7er');

  const { players, formation } = useMemo(() => {
    const formations = mode === '11er' ? FORMATIONS_11 : FORMATIONS_7;
    const teamSize = mode === '11er' ? 11 : 7;
    return optimizeBestTeam(scorers, formations, teamSize);
  }, [scorers, mode]);

  const rows = useMemo(() => getFormationRows(players), [players]);

  if (players.length === 0) return null;

  const avgScore = players.length > 0
    ? Math.round(players.reduce((s, p) => s + (getMatchScore(p) ?? 0), 0) / players.length)
    : 0;

  const label = mode === '11er' ? 'XI' : 'VI';

  return (
    <div>
      {/* Pitch */}
      <div className="rounded-2xl border border-green-500/20 overflow-hidden">
        {/* Top bar with avg rating + formation name */}
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/10">
          <Users className="size-3.5 text-gold" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest text-white/50 uppercase">
            {t('bestLabel', { label })}
          </span>
          <span className="text-xs font-mono text-white/30">({formation.name})</span>
          <span className="text-xs font-mono font-bold text-gold tabular-nums gold-glow">Ø {avgScore}</span>
        </div>

        {/* Green pitch — compact aspect ratio on mobile */}
        <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 aspect-[5/6] sm:aspect-[4/3]">
          {/* Floodlight glow from above */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 60%)' }} />
          {/* SVG field markings */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 400 300">
            {/* Outer boundary */}
            <rect x="15" y="8" width="370" height="284" fill="none" stroke="white" strokeOpacity="0.1" strokeWidth="1.5" />
            {/* Center line */}
            <line x1="15" y1="150" x2="385" y2="150" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            {/* Center circle */}
            <circle cx="200" cy="150" r="35" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            <circle cx="200" cy="150" r="2.5" fill="white" fillOpacity="0.1" />
            {/* Top penalty box */}
            <rect x="120" y="8" width="160" height="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            <rect x="155" y="8" width="90" height="22" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
            {/* Bottom penalty box */}
            <rect x="120" y="242" width="160" height="50" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="1" />
            <rect x="155" y="270" width="90" height="22" fill="none" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
            {/* Grass stripes */}
            {[0, 1, 2].map(i => (
              <rect key={i} x="15" y={8 + i * 94.67} width="370" height="47.33" fill="white" fillOpacity="0.012" />
            ))}
          </svg>

          {/* Player rows — ATT at top, GK at bottom */}
          <div className="relative z-10 h-full flex flex-col justify-around py-2 px-1">
            {[...rows].reverse().map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center justify-center gap-1 sm:gap-2 md:gap-4">
                {row.map(s => <PitchNode key={s.id} stat={s} />)}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#0f3460] to-[#1a1a2e] px-3 py-1.5 flex items-center justify-center border-t border-white/10">
          <span className="text-xs text-white/20 font-bold tracking-widest uppercase">{t('poweredBy')}</span>
        </div>
      </div>

      {/* 7er / 11er Toggle — BELOW the pitch */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.04] border border-white/[0.08] rounded-lg">
          {(['7er', '11er'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors min-h-[44px] min-w-[44px] ${
                mode === m
                  ? 'bg-gold/15 text-gold'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
