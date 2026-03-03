'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { posTintColors } from '@/components/player/PlayerRow';
import { RadarChart, buildPlayerRadarAxes } from '@/components/player/RadarChart';
import { useTilt } from '@/lib/hooks/useTilt';
import { fmtScout, countryToFlag, cn } from '@/lib/utils';
import type { Pos, Trend } from '@/types';

// Position glow ring — matches Tailwind shadow-glow-* tokens from tailwind.config
const posRingGlow: Record<Pos, string> = {
  GK: '0 0 24px rgba(16,185,129,0.25), 0 0 48px rgba(16,185,129,0.12)',
  DEF: '0 0 24px rgba(245,158,11,0.25), 0 0 48px rgba(245,158,11,0.12)',
  MID: '0 0 24px rgba(14,165,233,0.25), 0 0 48px rgba(14,165,233,0.12)',
  ATT: '0 0 24px rgba(244,63,94,0.25), 0 0 48px rgba(244,63,94,0.12)',
};

// Radar chart tint for position
const posRadarColor: Record<Pos, string> = {
  GK: '#10B981',
  DEF: '#F59E0B',
  MID: '#0EA5E9',
  ATT: '#F43F5E',
};

export interface CardBackStats {
  goals: number;
  assists: number;
  matches: number;
  l15: number;
  trend: Trend;
  floorPrice?: number;
}

interface TradingCardFrameProps {
  first: string;
  last: string;
  pos: Pos;
  club: string;
  shirtNumber: number;
  imageUrl?: string | null;
  l5: number;
  edition?: string;
  className?: string;
  backStats?: CardBackStats;
  age?: number;
  country?: string;
}

/* FIFA-style stat cell: big number on top, tiny label below */
function FifaStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[22px] md:text-[26px] font-black text-white/90 leading-none tabular-nums font-mono">
        {value}
      </span>
      <span className="text-[8px] md:text-[9px] font-bold uppercase tracking-widest text-white/35 leading-none">
        {label}
      </span>
    </div>
  );
}

export default function TradingCardFrame({
  first, last, pos, club, shirtNumber, imageUrl, l5, edition, className = '', backStats,
  age, country,
}: TradingCardFrameProps) {
  const tp = useTranslations('player');
  const [flipped, setFlipped] = useState(false);
  const canFlip = !!backStats;

  const { ref, tiltProps } = useTilt<HTMLDivElement>({
    maxTilt: 7,
    scale: 1.0,
    yOffset: flipped ? 180 : 0,
    perspective: false,
  });

  const tint = posTintColors[pos];
  const clubData = club ? getClub(club) : null;
  const ringGlow = posRingGlow[pos];
  const flag = country ? countryToFlag(country) : '';

  // Foil/holo effect based on L5 performance
  const effectClass = l5 >= 80 ? 'holo-rainbow' : l5 >= 65 ? 'foil-shimmer' : '';

  // Initials fallback
  const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`;

  const handleClick = canFlip ? () => setFlipped(f => !f) : undefined;

  return (
    <div className={cn('relative', className)}>
      {/* Ambient gold + position glow behind card */}
      <div
        className="absolute inset-0 rounded-3xl blur-2xl opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.15) 0%, ${tint}15 40%, transparent 70%)`,
          transform: 'scale(1.4)',
        }}
      />

      {/* Perspective Provider */}
      <div style={{ perspective: '600px' }}>
        {/* Tilt + Flip Container */}
        <div
          ref={ref}
          {...tiltProps}
          onClick={handleClick}
          className={cn(
            'relative aspect-[3/4] w-[240px] md:w-[280px] rounded-2xl card-gold-frame',
            effectClass,
            canFlip && 'cursor-pointer'
          )}
          style={{
            ...tiltProps.style,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* ===== FRONT FACE ===== */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Background: carbon fiber */}
            <div className="absolute inset-0 card-carbon" />
            {/* Subtle position gradient at top */}
            <div
              className="absolute inset-x-0 top-0 h-1/3 opacity-15"
              style={{ background: `linear-gradient(180deg, ${tint}40 0%, transparent 100%)` }}
            />

            {/* Top Bar: Club Logo | Flag + Age | Position Pill */}
            <div className="relative z-10 flex items-center justify-between px-3 pt-2.5">
              {/* Club Logo */}
              {clubData?.logo ? (
                <div className="size-8 md:size-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                  <img src={clubData.logo} alt={clubData.name} className="size-6 md:size-7 rounded-full object-cover" />
                </div>
              ) : (
                <div className="size-8" />
              )}

              {/* Flag + Age */}
              <div className="flex items-center gap-1.5">
                {flag && <span className="text-base leading-none" aria-label={country}>{flag}</span>}
                {age != null && age > 0 && (
                  <span className="text-[10px] font-bold text-white/50 tabular-nums">{age}</span>
                )}
              </div>

              {/* Position Pill with shirt number */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black backdrop-blur-sm"
                style={{ backgroundColor: `${tint}40`, color: '#fff', border: `1px solid ${tint}60`, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {pos} {shirtNumber > 0 && <span className="font-mono tabular-nums">{shirtNumber}</span>}
              </div>
            </div>

            {/* Photo with topo overlay + position glow ring */}
            <div className="relative z-10 flex justify-center mt-2 md:mt-3">
              <div
                className="size-[100px] md:size-[120px] rounded-full border-[3px] overflow-hidden topo-overlay"
                style={{ borderColor: `${tint}99`, boxShadow: ringGlow }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`${first} ${last}`}
                    className="size-full object-cover"
                  />
                ) : (
                  <div
                    className="size-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${tint}30 0%, ${tint}10 100%)` }}
                  >
                    <span className="font-black text-2xl text-white/40">{initials}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Gold Separator */}
            <div className="relative z-10 mx-4 mt-2 md:mt-3">
              <div className="gold-separator" />
            </div>

            {/* Glassmorphism Name Bar with gold accent */}
            <div
              className="relative z-10 mt-1.5 md:mt-2 backdrop-blur-md px-3 py-1.5"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderTop: '1px solid rgba(255,215,0,0.15)',
                borderBottom: '1px solid rgba(255,215,0,0.15)',
              }}
            >
              <div className="text-sm md:text-base font-black text-white leading-tight truncate drop-shadow-lg text-center text-balance">
                {first} {last}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5 truncate text-center flex items-center justify-center gap-1.5">
                <span>{clubData?.name ?? club}</span>
                {edition && (
                  <>
                    <span className="text-gold/30">&middot;</span>
                    <span
                      className="text-[9px] font-mono font-bold"
                      style={{ color: `${tint}cc` }}
                    >
                      {edition}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* FIFA 2x3 Stats Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-y-2 gap-x-1 px-4 mt-2 md:mt-3">
              <FifaStat label="L5" value={l5} />
              <FifaStat label="L15" value={backStats?.l15 ?? '—'} />
              <FifaStat label="GOL" value={backStats?.goals ?? '—'} />
              <FifaStat label="AST" value={backStats?.assists ?? '—'} />
              <FifaStat label="MAT" value={backStats?.matches ?? '—'} />
              <FifaStat
                label="FLOOR"
                value={backStats?.floorPrice != null ? fmtScout(backStats.floorPrice) : '—'}
              />
            </div>

            {/* BeScout Logo — veredelt gold */}
            <div className="relative z-10 flex justify-center mt-auto pb-2.5 pt-1.5">
              <img src="/logo_schrift.svg" alt="BeScout" className="h-3 md:h-3.5 logo-veredelt-glow" />
            </div>
          </div>

          {/* ===== BACK FACE ===== */}
          {backStats && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {/* Background: carbon fiber */}
              <div className="absolute inset-0 card-carbon" />
              {/* Subtle position gradient */}
              <div
                className="absolute inset-x-0 top-0 h-1/2 opacity-15"
                style={{ background: `linear-gradient(180deg, ${tint}40 0%, transparent 100%)` }}
              />

              {/* Radar Chart */}
              <div className="relative z-10 flex justify-center pt-4 md:pt-5">
                <RadarChart
                  datasets={[{
                    axes: buildPlayerRadarAxes({
                      goals: backStats.goals,
                      assists: backStats.assists,
                      cleanSheets: 0,
                      matches: backStats.matches,
                      perfL5: l5,
                      perfL15: backStats.l15,
                      bonus: 0,
                      minutes: 0,
                    }),
                    color: posRadarColor[pos],
                    fillOpacity: 0.2,
                  }]}
                  size={130}
                  rings={3}
                  showLabels={false}
                />
              </div>

              {/* Gold separator */}
              <div className="relative z-10 mx-4 mt-2">
                <div className="gold-separator" />
              </div>

              {/* Stats Grid — same FIFA style */}
              <div className="relative z-10 grid grid-cols-3 gap-y-3 gap-x-2 px-4 mt-3">
                <FifaStat label={tp('statGoals')} value={backStats.goals} />
                <FifaStat label={tp('statAssists')} value={backStats.assists} />
                <FifaStat label={tp('statMatches')} value={backStats.matches} />
                <FifaStat label={tp('statL15')} value={backStats.l15} />
                <FifaStat label="L5" value={l5} />
                <FifaStat
                  label={tp('statFloor')}
                  value={backStats.floorPrice != null ? fmtScout(backStats.floorPrice) : '—'}
                />
              </div>

              {/* Name + Flip hint */}
              <div
                className="relative z-10 mt-3 backdrop-blur-md px-3 py-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderTop: '1px solid rgba(255,215,0,0.15)',
                  borderBottom: '1px solid rgba(255,215,0,0.15)',
                }}
              >
                <div className="text-xs font-bold text-white/90 text-center truncate">
                  {first} {last}
                </div>
                <div className="text-[9px] text-white/30 text-center mt-0.5">
                  {tp('tapToFlip')}
                </div>
              </div>

              {/* BeScout branding — veredelt gold */}
              <div className="relative z-10 flex justify-center pb-2.5 mt-auto">
                <img src="/logo_schrift.svg" alt="BeScout" className="h-3 md:h-3.5 logo-veredelt-glow" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
