'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PlayerPhoto, GoalBadge } from '@/components/player';
import type { FixturePlayerStat } from '@/types';
import type { Pos } from '@/types';
import { getPosAccent, scoreBadgeColor } from './helpers';

type Props = {
  scorers: FixturePlayerStat[];
  gameweek: number;
};

type Mode = '6er' | '11er';

/** Build best XI (4-3-3) from scorers, guaranteeing 1 GK + 4 DEF + 3 MID + 3 ATT */
function buildBestEleven(scorers: FixturePlayerStat[]): FixturePlayerStat[] {
  const byPos = new Map<string, FixturePlayerStat[]>();
  for (const s of scorers) {
    const pos = s.player_position || 'MID';
    const arr = byPos.get(pos) || [];
    arr.push(s);
    byPos.set(pos, arr);
  }

  // Sort each group by rating desc
  Array.from(byPos.values()).forEach(arr => arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));

  // Formation slots: 1 GK, 4 DEF, 3 MID, 3 ATT
  const slots: { pos: string; count: number }[] = [
    { pos: 'GK', count: 1 },
    { pos: 'DEF', count: 4 },
    { pos: 'MID', count: 3 },
    { pos: 'ATT', count: 3 },
  ];

  const picked: FixturePlayerStat[] = [];
  const pickedIds = new Set<string>();

  // First pass: fill each position with required count
  for (const { pos, count } of slots) {
    const candidates = (byPos.get(pos) || []).filter(p => !pickedIds.has(p.id));
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      picked.push(candidates[i]);
      pickedIds.add(candidates[i].id);
    }
  }

  // Second pass: if still < 11, fill from best remaining (any position)
  if (picked.length < 11) {
    const remaining = scorers
      .filter(s => !pickedIds.has(s.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    for (const s of remaining) {
      if (picked.length >= 11) break;
      picked.push(s);
      pickedIds.add(s.id);
    }
  }

  return picked.slice(0, 11);
}

/** Build best 6 (1-2-2-1) from scorers, guaranteeing 1 GK + 2 DEF + 2 MID + 1 ATT */
function buildBestSix(scorers: FixturePlayerStat[]): FixturePlayerStat[] {
  const byPos = new Map<string, FixturePlayerStat[]>();
  for (const s of scorers) {
    const pos = s.player_position || 'MID';
    const arr = byPos.get(pos) || [];
    arr.push(s);
    byPos.set(pos, arr);
  }

  Array.from(byPos.values()).forEach(arr => arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));

  // Formation slots: 1 GK, 2 DEF, 2 MID, 1 ATT
  const slots: { pos: string; count: number }[] = [
    { pos: 'GK', count: 1 },
    { pos: 'DEF', count: 2 },
    { pos: 'MID', count: 2 },
    { pos: 'ATT', count: 1 },
  ];

  const picked: FixturePlayerStat[] = [];
  const pickedIds = new Set<string>();

  for (const { pos, count } of slots) {
    const candidates = (byPos.get(pos) || []).filter(p => !pickedIds.has(p.id));
    for (let i = 0; i < Math.min(count, candidates.length); i++) {
      picked.push(candidates[i]);
      pickedIds.add(candidates[i].id);
    }
  }

  // Fill remaining if < 6
  if (picked.length < 6) {
    const remaining = scorers
      .filter(s => !pickedIds.has(s.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    for (const s of remaining) {
      if (picked.length >= 6) break;
      picked.push(s);
      pickedIds.add(s.id);
    }
  }

  return picked.slice(0, 6);
}

/** Get rows for pitch layout — returns array of position groups from GK (bottom) to ATT (top) */
function getFormationRows(players: FixturePlayerStat[]): FixturePlayerStat[][] {
  const posOrder = ['GK', 'DEF', 'MID', 'ATT'];
  const grouped = new Map<string, FixturePlayerStat[]>();

  for (const p of players) {
    const pos = p.player_position || 'MID';
    const arr = grouped.get(pos) || [];
    arr.push(p);
    grouped.set(pos, arr);
  }

  return posOrder
    .map(pos => (grouped.get(pos) || []).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)))
    .filter(row => row.length > 0);
}

function PitchNode({ stat }: { stat: FixturePlayerStat }) {
  const accent = getPosAccent(stat.player_position);
  const rating = stat.rating ?? stat.fantasy_points / 10;
  const badge = scoreBadgeColor(rating);
  const hasImage = !!stat.player_image_url;

  return (
    <Link href={`/player/${stat.player_id}`} className="flex flex-col items-center w-[38px] sm:w-[48px] md:w-[56px] hover:scale-105 transition-transform active:scale-95">
      {/* Score badge */}
      <div className={`mb-0.5 min-w-[1.5rem] px-1 py-px rounded-full text-[8px] sm:text-[9px] md:text-[10px] font-mono font-black text-center shadow-lg tabular-nums ${badge}`}>
        {rating.toFixed(1)}
      </div>
      {/* Circle with PlayerPhoto or initials + GoalBadge overlay */}
      <div className="relative">
        {hasImage ? (
          <PlayerPhoto
            imageUrl={stat.player_image_url}
            first={stat.player_first_name}
            last={stat.player_last_name}
            pos={stat.player_position as Pos}
            size={28}
            className="sm:!w-[2rem] sm:!h-[2rem] md:!w-[2.5rem] md:!h-[2.5rem]"
          />
        ) : (
          <div
            className="size-7 sm:size-8 md:size-10 rounded-full flex items-center justify-center border-2 bg-black/40"
            style={{ borderColor: accent, boxShadow: `0 0 10px ${accent}30` }}
          >
            <span className="font-bold text-[8px] sm:text-[9px] md:text-[10px]" style={{ color: accent }}>
              {stat.player_last_name.slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
        <GoalBadge goals={stat.goals} size={14} className="-bottom-0.5 -right-1 sm:size-4" />
      </div>
      {/* Name */}
      <div className="text-[8px] sm:text-[9px] md:text-[10px] mt-0.5 font-medium text-center truncate max-w-full text-white/70">
        {stat.player_last_name}
      </div>
      {/* Club */}
      <div className="text-[7px] md:text-[8px] text-white/30 text-center truncate max-w-full">
        {stat.club_short}
      </div>
    </Link>
  );
}

export function BestElevenShowcase({ scorers, gameweek }: Props) {
  const t = useTranslations('fantasy');
  const [mode, setMode] = useState<Mode>('6er');

  const players = useMemo(() => {
    return mode === '11er' ? buildBestEleven(scorers) : buildBestSix(scorers);
  }, [scorers, mode]);

  const rows = useMemo(() => getFormationRows(players), [players]);

  if (players.length === 0) return null;

  const avgRating = players.length > 0
    ? players.reduce((s, p) => s + (p.rating ?? p.fantasy_points / 10), 0) / players.length
    : 0;

  return (
    <div>
      {/* Pitch */}
      <div className="rounded-2xl border border-green-500/20 overflow-hidden">
        {/* Top bar with avg rating */}
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/10">
          <Users className="size-3.5 text-gold" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest text-white/50 uppercase">
            {t('bestLabel', { label: mode === '11er' ? 'XI' : 'VI' })}
          </span>
          <span className="text-xs font-mono font-bold text-gold tabular-nums gold-glow">Ø {avgRating.toFixed(1)}</span>
        </div>

        {/* Green pitch — compact aspect ratio on mobile */}
        <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40 aspect-[5/6] sm:aspect-[4/3]">
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
          <span className="text-[9px] text-white/20 font-bold tracking-widest uppercase">{t('poweredBy')}</span>
        </div>
      </div>

      {/* 6er / 11er Toggle — BELOW the pitch */}
      <div className="flex items-center justify-center gap-1 mt-2">
        <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.04] border border-white/[0.08] rounded-lg">
          {(['6er', '11er'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-colors min-h-[44px] min-w-[44px] ${
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
