'use client';

import React from 'react';
import { getClub } from '@/lib/clubs';
import { TrikotBadge, posTintColors } from '@/components/player/PlayerRow';
import type { Pos } from '@/types';

// Position card gradients (darker for card bg)
const posCardGradients: Record<Pos, string> = {
  GK: 'from-emerald-900/80 via-emerald-950/60 to-[#0a0a0a]',
  DEF: 'from-amber-900/80 via-amber-950/60 to-[#0a0a0a]',
  MID: 'from-sky-900/80 via-sky-950/60 to-[#0a0a0a]',
  ATT: 'from-rose-900/80 via-rose-950/60 to-[#0a0a0a]',
};

// Ambient glow radial colors
const posGlowColors: Record<Pos, string> = {
  GK: 'rgba(16,185,129,0.25)',
  DEF: 'rgba(245,158,11,0.25)',
  MID: 'rgba(14,165,233,0.25)',
  ATT: 'rgba(244,63,94,0.25)',
};

interface TradingCardFrameProps {
  first: string;
  last: string;
  pos: Pos;
  club: string;
  shirtNumber: number;
  imageUrl?: string | null;
  l5: number;
  edition?: string; // e.g. "12/300"
  className?: string;
}

export default function TradingCardFrame({
  first, last, pos, club, shirtNumber, imageUrl, l5, edition, className = '',
}: TradingCardFrameProps) {
  const tint = posTintColors[pos];
  const clubData = club ? getClub(club) : null;
  const gradient = posCardGradients[pos];
  const glowColor = posGlowColors[pos];

  // Determine foil/holo class
  const effectClass = l5 >= 80 ? 'holo-rainbow' : l5 >= 65 ? 'foil-shimmer' : '';

  return (
    <div className={`relative ${className}`}>
      {/* Ambient radial glow behind card */}
      <div
        className="absolute inset-0 rounded-3xl blur-2xl opacity-60 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 60%, ${glowColor} 0%, transparent 70%)`,
          transform: 'scale(1.3)',
        }}
      />

      {/* The Card */}
      <div
        className={`relative aspect-[3/4] w-[180px] md:w-[220px] rounded-2xl overflow-hidden border-[3px] card-3d-tilt ${effectClass}`}
        style={{ borderColor: `${tint}88` }}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-b ${gradient}`} />

        {/* Club logo (top-left) — bigger for identity */}
        {clubData?.logo && (
          <div className="absolute top-2.5 left-2.5 z-20">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-black/50 border border-white/15 flex items-center justify-center backdrop-blur-sm">
              <img src={clubData.logo} alt={clubData.name} className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover" />
            </div>
          </div>
        )}

        {/* Position + Shirt# pill (top-right) — higher contrast */}
        <div
          className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-black backdrop-blur-sm"
          style={{ backgroundColor: `${tint}50`, color: '#fff', border: `1px solid ${tint}70`, textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
        >
          {pos} {shirtNumber > 0 && <span className="font-mono">{shirtNumber}</span>}
        </div>

        {/* Player Photo / Fallback — constrained to top 68% so face doesn't overlap name */}
        <div className="absolute inset-x-0 top-0 h-[72%] overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${first} ${last}`}
              className="w-full h-full object-cover object-[center_20%]"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <TrikotBadge number={shirtNumber} pos={pos} club={club} size="lg" />
            </div>
          )}
        </div>

        {/* Bottom dark gradient overlay — taller to clearly separate from photo */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black via-black/80 to-transparent z-10" />

        {/* Name + Edition badge (bottom) */}
        <div className="absolute inset-x-0 bottom-0 z-20 px-3 pb-3">
          <div className="text-sm md:text-base font-black text-white leading-tight truncate drop-shadow-lg">
            {first} {last}
          </div>
          {edition && (
            <div className="flex items-center gap-1 mt-1">
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: `${tint}20`, color: tint, border: `1px solid ${tint}30` }}
              >
                {edition}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
