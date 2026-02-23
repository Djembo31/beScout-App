'use client';

import React from 'react';
import { getClub } from '@/lib/clubs';
import { posTintColors } from '@/components/player/PlayerRow';
import { ScoreCircle } from '@/components/player';
import type { Pos } from '@/types';

// Position glow ring colors (for the photo circle border)
const posRingGlow: Record<Pos, string> = {
  GK: '0 0 16px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)',
  DEF: '0 0 16px rgba(245,158,11,0.5), 0 0 40px rgba(245,158,11,0.2)',
  MID: '0 0 16px rgba(14,165,233,0.5), 0 0 40px rgba(14,165,233,0.2)',
  ATT: '0 0 16px rgba(244,63,94,0.5), 0 0 40px rgba(244,63,94,0.2)',
};

// Ambient glow radial colors
const posGlowColors: Record<Pos, string> = {
  GK: 'rgba(16,185,129,0.20)',
  DEF: 'rgba(245,158,11,0.20)',
  MID: 'rgba(14,165,233,0.20)',
  ATT: 'rgba(244,63,94,0.20)',
};

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
}

export default function TradingCardFrame({
  first, last, pos, club, shirtNumber, imageUrl, l5, edition, className = '',
}: TradingCardFrameProps) {
  const tint = posTintColors[pos];
  const clubData = club ? getClub(club) : null;
  const glowColor = posGlowColors[pos];
  const ringGlow = posRingGlow[pos];

  // Foil/holo effect based on L5 performance
  const effectClass = l5 >= 80 ? 'holo-rainbow' : l5 >= 65 ? 'foil-shimmer' : '';

  // Initials fallback
  const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`;

  return (
    <div className={`relative ${className}`}>
      {/* Ambient radial glow behind card */}
      <div
        className="absolute inset-0 rounded-3xl blur-2xl opacity-50 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, ${glowColor} 0%, transparent 70%)`,
          transform: 'scale(1.4)',
        }}
      />

      {/* The Card */}
      <div
        className={`relative aspect-[3/4] w-[180px] md:w-[220px] rounded-2xl overflow-hidden border-[2px] card-3d-tilt ${effectClass}`}
        style={{ borderColor: `${tint}55` }}
      >
        {/* Background: dark base + diagonal stripes texture */}
        <div className="absolute inset-0 bg-[#0c0c0c]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `repeating-linear-gradient(135deg, ${tint} 0px, ${tint} 1px, transparent 1px, transparent 12px)`,
          }}
        />
        {/* Subtle position gradient at top */}
        <div
          className="absolute inset-x-0 top-0 h-1/3 opacity-20"
          style={{ background: `linear-gradient(180deg, ${tint}40 0%, transparent 100%)` }}
        />

        {/* Top bar: Club logo + Position pill */}
        <div className="relative z-10 flex items-center justify-between px-3 pt-3">
          {clubData?.logo ? (
            <div
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-sm"
            >
              <img src={clubData.logo} alt={clubData.name} className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover" />
            </div>
          ) : (
            <div className="w-8 h-8" />
          )}
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black backdrop-blur-sm"
            style={{ backgroundColor: `${tint}40`, color: '#fff', border: `1px solid ${tint}60`, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {pos} {shirtNumber > 0 && <span className="font-mono">{shirtNumber}</span>}
          </div>
        </div>

        {/* Photo circle with position glow ring */}
        <div className="relative z-10 flex justify-center mt-2 md:mt-3">
          <div
            className="w-[88px] h-[88px] md:w-[100px] md:h-[100px] rounded-full border-[3px] overflow-hidden"
            style={{ borderColor: `${tint}99`, boxShadow: ringGlow }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={`${first} ${last}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${tint}30 0%, ${tint}10 100%)` }}
              >
                <span className="font-black text-xl text-white/40">{initials}</span>
              </div>
            )}
          </div>
        </div>

        {/* Gold separator line */}
        <div className="relative z-10 mx-4 mt-3 md:mt-4">
          <div className="h-px bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent" />
        </div>

        {/* Name + Club */}
        <div className="relative z-10 text-center mt-2 md:mt-3 px-3">
          <div className="text-sm md:text-base font-black text-white leading-tight truncate drop-shadow-lg">
            {first} {last}
          </div>
          <div className="text-[10px] text-white/40 mt-0.5 truncate">
            {clubData?.name ?? club}
          </div>
        </div>

        {/* Mini stat circles + edition */}
        <div className="relative z-10 flex items-center justify-center gap-2 mt-2 md:mt-3 px-3 pb-3">
          {l5 > 0 && <ScoreCircle label="L5" value={l5} size={34} />}
          {edition && (
            <span
              className="text-[9px] font-mono font-bold px-2 py-1 rounded-lg"
              style={{ backgroundColor: `${tint}18`, color: tint, border: `1px solid ${tint}30` }}
            >
              {edition}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
