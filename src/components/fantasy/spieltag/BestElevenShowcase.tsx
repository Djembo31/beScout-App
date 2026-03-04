'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Users, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { FixturePlayerStat } from '@/types';
import { getPosAccent, scoreBadgeColor } from './helpers';

type Props = {
  scorers: FixturePlayerStat[];
  gameweek: number;
};

type Mode = '6er' | '11er';

/** Build best XI (4-3-3) from top scorers, grouped by position */
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

  const gk = (byPos.get('GK') || []).slice(0, 1);
  const def = (byPos.get('DEF') || []).slice(0, 4);
  const mid = (byPos.get('MID') || []).slice(0, 3);
  const att = (byPos.get('ATT') || []).slice(0, 3);

  const picked = [...gk, ...def, ...mid, ...att];

  // If we don't have 11, fill from remaining best scorers
  if (picked.length < 11) {
    const pickedIds = new Set(picked.map(p => p.id));
    const remaining = scorers
      .filter(s => !pickedIds.has(s.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    for (const s of remaining) {
      if (picked.length >= 11) break;
      picked.push(s);
    }
  }

  return picked.slice(0, 11);
}

/** Build best 6 (1-2-2-1) from top scorers */
function buildBestSix(scorers: FixturePlayerStat[]): FixturePlayerStat[] {
  const byPos = new Map<string, FixturePlayerStat[]>();
  for (const s of scorers) {
    const pos = s.player_position || 'MID';
    const arr = byPos.get(pos) || [];
    arr.push(s);
    byPos.set(pos, arr);
  }

  Array.from(byPos.values()).forEach(arr => arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)));

  const gk = (byPos.get('GK') || []).slice(0, 1);
  const def = (byPos.get('DEF') || []).slice(0, 2);
  const mid = (byPos.get('MID') || []).slice(0, 2);
  const att = (byPos.get('ATT') || []).slice(0, 1);

  const picked = [...gk, ...def, ...mid, ...att];

  if (picked.length < 6) {
    const pickedIds = new Set(picked.map(p => p.id));
    const remaining = scorers
      .filter(s => !pickedIds.has(s.id))
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    for (const s of remaining) {
      if (picked.length >= 6) break;
      picked.push(s);
    }
  }

  return picked.slice(0, 6);
}

/** Get rows for pitch layout — returns array of position groups from GK (bottom) to ATT (top) */
function getFormationRows(players: FixturePlayerStat[], mode: Mode): FixturePlayerStat[][] {
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

  return (
    <Link href={`/player/${stat.player_id}`} className="flex flex-col items-center w-[52px] md:w-[60px] hover:scale-105 transition-transform active:scale-95">
      {/* Score badge */}
      <div className={`mb-0.5 min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-mono font-black text-center shadow-lg tabular-nums ${badge}`}>
        {rating.toFixed(1)}
      </div>
      {/* Circle with initials */}
      <div
        className="size-10 md:size-12 rounded-full flex items-center justify-center border-2 bg-black/40"
        style={{ borderColor: accent, boxShadow: `0 0 10px ${accent}30` }}
      >
        <span className="font-bold text-[10px] md:text-[11px]" style={{ color: accent }}>
          {stat.player_last_name.slice(0, 3).toUpperCase()}
        </span>
      </div>
      {/* Name */}
      <div className="text-[10px] md:text-[11px] mt-0.5 font-medium text-center truncate max-w-full text-white/70">
        {stat.player_last_name}
      </div>
      {/* Club */}
      <div className="text-[8px] md:text-[9px] text-white/30 text-center truncate max-w-full">
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

  const rows = useMemo(() => getFormationRows(players, mode), [players, mode]);

  const minPlayers = mode === '6er' ? 6 : 11;
  if (scorers.length < minPlayers && mode === '11er') {
    // Fall back to 6er if not enough players
  }

  if (players.length === 0) return null;

  const avgRating = players.length > 0
    ? players.reduce((s, p) => s + (p.rating ?? p.fantasy_points / 10), 0) / players.length
    : 0;

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-gold" aria-hidden="true" />
          <h2 className="text-sm font-black uppercase tracking-wider text-balance">{t('bestOfWeek', { n: mode === '11er' ? '11' : '6' })}</h2>
          <span className="text-[10px] text-white/25">{t('gameweekN', { gw: gameweek })}</span>
        </div>

        {/* 6er / 11er Toggle */}
        <div className="flex items-center gap-0.5 p-0.5 bg-white/[0.04] border border-white/[0.08] rounded-lg">
          {(['6er', '11er'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors min-h-[44px] min-w-[44px] ${
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

      {/* Pitch */}
      <div className="rounded-2xl border border-green-500/20 overflow-hidden">
        {/* Top bar with total points */}
        <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#1a1a2e] px-4 py-2 flex items-center justify-center gap-3 border-b border-white/10">
          <Users className="size-3.5 text-gold" aria-hidden="true" />
          <span className="text-xs font-bold tracking-widest text-white/50 uppercase">
            {t('bestLabel', { label: mode === '11er' ? 'XI' : 'VI' })}
          </span>
          <span className="text-xs font-mono font-bold text-gold tabular-nums">Ø {avgRating.toFixed(1)}</span>
        </div>

        {/* Green pitch field */}
        <div className="relative bg-gradient-to-b from-[#1a5c1a]/40 via-[#1e6b1e]/30 to-[#1a5c1a]/40" style={{ aspectRatio: '4/3' }}>
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
          <div className="relative z-10 h-full flex flex-col justify-around py-3 px-2">
            {[...rows].reverse().map((row, rowIdx) => (
              <div key={rowIdx} className="flex items-center justify-center gap-2 md:gap-4">
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
    </div>
  );
}
