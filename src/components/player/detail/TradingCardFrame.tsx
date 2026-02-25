'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getClub } from '@/lib/clubs';
import { posTintColors } from '@/components/player/PlayerRow';
import { ScoreCircle } from '@/components/player';
import { RadarChart, buildPlayerRadarAxes } from '@/components/player/RadarChart';
import { useTilt } from '@/lib/hooks/useTilt';
import { fmtScout } from '@/lib/utils';
import type { Pos, Trend } from '@/types';

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

// Position-specific background patterns
const posBackgroundPattern: Record<Pos, string> = {
  GK: `repeating-conic-gradient(rgba(16,185,129,0.06) 0% 25%, transparent 0% 50%) 0 0 / 24px 24px`,
  DEF: `repeating-linear-gradient(180deg, rgba(245,158,11,0.05) 0px, transparent 2px, transparent 10px), repeating-linear-gradient(120deg, rgba(245,158,11,0.04) 0px, transparent 2px, transparent 10px)`,
  MID: `repeating-radial-gradient(circle at 50% 50%, transparent 0px, transparent 8px, rgba(14,165,233,0.05) 9px, transparent 10px)`,
  ATT: `repeating-linear-gradient(135deg, rgba(244,63,94,0.05) 0px, rgba(244,63,94,0.05) 1px, transparent 1px, transparent 10px), repeating-linear-gradient(45deg, rgba(244,63,94,0.04) 0px, rgba(244,63,94,0.04) 1px, transparent 1px, transparent 10px)`,
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
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-white/40 font-medium">{label}</span>
      <span className="text-xs font-bold text-white/90 font-mono">{value}</span>
    </div>
  );
}

const TrendIcon = ({ trend }: { trend: Trend }) => {
  if (trend === 'UP') return <TrendingUp className="w-3 h-3 text-[#22C55E]" />;
  if (trend === 'DOWN') return <TrendingDown className="w-3 h-3 text-red-400" />;
  return <Minus className="w-3 h-3 text-white/40" />;
};

export default function TradingCardFrame({
  first, last, pos, club, shirtNumber, imageUrl, l5, edition, className = '', backStats,
}: TradingCardFrameProps) {
  const [flipped, setFlipped] = useState(false);
  const canFlip = !!backStats;

  const { ref, tiltProps } = useTilt<HTMLDivElement>({
    maxTilt: 15,
    scale: 1.03,
    yOffset: flipped ? 180 : 0,
    perspective: false,
  });

  const tint = posTintColors[pos];
  const clubData = club ? getClub(club) : null;
  const glowColor = posGlowColors[pos];
  const ringGlow = posRingGlow[pos];

  // Foil/holo effect based on L5 performance
  const effectClass = l5 >= 80 ? 'holo-rainbow' : l5 >= 65 ? 'foil-shimmer' : '';

  // Initials fallback
  const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`;

  const handleClick = canFlip ? () => setFlipped(f => !f) : undefined;

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

      {/* Perspective Provider */}
      <div style={{ perspective: '600px' }}>
        {/* Tilt + Flip Container */}
        <div
          ref={ref}
          {...tiltProps}
          onClick={handleClick}
          className={`relative aspect-[3/4] w-[180px] md:w-[220px] rounded-2xl border-[2px] ${effectClass} ${canFlip ? 'cursor-pointer' : ''}`}
          style={{
            ...tiltProps.style,
            borderColor: `${tint}55`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* ===== FRONT FACE ===== */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Background: dark base + position pattern */}
            <div className="absolute inset-0 bg-[#0c0c0c]" />
            <div
              className="absolute inset-0"
              style={{
                background: posBackgroundPattern[pos],
                animation: 'pattern-drift 8s linear infinite',
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

            {/* Glassmorphism Name Bar */}
            <div
              className="relative z-10 mt-2 md:mt-3 backdrop-blur-md border-y px-3 py-2"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="text-sm md:text-base font-black text-white leading-tight truncate drop-shadow-lg text-center">
                {first} {last}
              </div>
              <div className="text-[10px] text-white/40 mt-0.5 truncate text-center">
                {clubData?.name ?? club}
              </div>
            </div>

            {/* Mini stat circles + edition */}
            <div className="relative z-10 flex items-center justify-center gap-2 mt-2 md:mt-3 px-3 pb-1">
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

            {/* BeScout branding */}
            <div className="relative z-10 flex justify-center pb-2">
              <img src="/logo_schrift.png" alt="BeScout" className="h-3 md:h-3.5 opacity-30" />
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
              {/* Background */}
              <div className="absolute inset-0 bg-[#0c0c0c]" />
              <div
                className="absolute inset-0"
                style={{
                  background: posBackgroundPattern[pos],
                  animation: 'pattern-drift 8s linear infinite',
                }}
              />
              <div
                className="absolute inset-x-0 top-0 h-1/2 opacity-15"
                style={{ background: `linear-gradient(180deg, ${tint}40 0%, transparent 100%)` }}
              />

              {/* Radar Chart */}
              <div className="relative z-10 flex justify-center pt-3 md:pt-4">
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
                  size={120}
                  rings={3}
                  showLabels={false}
                />
              </div>

              {/* Gold separator */}
              <div className="relative z-10 mx-4 mt-2">
                <div className="h-px bg-gradient-to-r from-transparent via-[#FFD700]/40 to-transparent" />
              </div>

              {/* Stats Grid */}
              <div className="relative z-10 grid grid-cols-3 gap-y-3 gap-x-2 px-4 mt-3">
                <StatItem label="Tore" value={backStats.goals} />
                <StatItem label="Assists" value={backStats.assists} />
                <StatItem label="Spiele" value={backStats.matches} />
                <StatItem label="L15" value={backStats.l15} />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-white/40 font-medium">Trend</span>
                  <TrendIcon trend={backStats.trend} />
                </div>
                <StatItem
                  label="Floor"
                  value={backStats.floorPrice != null ? fmtScout(backStats.floorPrice) : '—'}
                />
              </div>

              {/* Name + Flip hint */}
              <div
                className="relative z-10 mt-3 backdrop-blur-md border-y px-3 py-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                <div className="text-xs font-bold text-white/90 text-center truncate">
                  {first} {last}
                </div>
                <div className="text-[9px] text-white/30 text-center mt-0.5">
                  Tippen zum Drehen
                </div>
              </div>

              {/* BeScout branding */}
              <div className="relative z-10 flex justify-center pb-2 mt-auto">
                <img src="/logo_schrift.png" alt="BeScout" className="h-3 md:h-3.5 opacity-30" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
