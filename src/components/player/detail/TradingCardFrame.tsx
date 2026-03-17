'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { posTintColors } from '@/components/player/PlayerRow';
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

export interface CardBackStats {
  goals: number;
  assists: number;
  matches: number;
  cleanSheets: number;
  minutes: number;
  saves: number;
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
  masteryLevel?: number;
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

/* Compact horizontal stat bar for card back */
function StatBar({ label, value, max, tint }: { label: string; value: number; max: number; tint: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] font-bold uppercase tracking-wider text-white/40 w-7 shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: tint }}
        />
      </div>
      <span className="text-[9px] font-mono font-bold tabular-nums text-white/60 w-8 text-right shrink-0">
        {value}
      </span>
    </div>
  );
}

export default function TradingCardFrame({
  first, last, pos, club, shirtNumber, imageUrl, l5, edition, className = '', backStats,
  age, country, masteryLevel,
}: TradingCardFrameProps) {
  const tp = useTranslations('player');
  const [flipped, setFlipped] = useState(false);
  const canFlip = !!backStats;

  const { ref, tiltProps } = useTilt<HTMLDivElement>({
    maxTilt: 7,
    scale: 1.0,
    speed: 500,
    yOffset: flipped ? 180 : 0,
    perspective: false,
  });

  const tint = posTintColors[pos];
  const clubData = club ? getClub(club) : null;
  const ringGlow = posRingGlow[pos];
  const flag = country ? countryToFlag(country) : '';

  // Initials fallback
  const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`;

  const handleClick = canFlip ? () => setFlipped(f => !f) : undefined;
  const tierClass = masteryLevel && masteryLevel > 0 ? `card-tier-${Math.min(masteryLevel, 5)}` : '';

  return (
    <div className={cn('relative card-entrance overflow-hidden rounded-2xl', tierClass, className)}>
      {/* Perspective Provider */}
      <div style={{ perspective: '600px' }}>
        {/* Tilt + Flip Container */}
        <div
          ref={ref}
          {...tiltProps}
          onClick={handleClick}
          className={cn(
            'relative aspect-[3/4] w-[240px] md:w-[280px] rounded-2xl',
            canFlip && 'cursor-pointer'
          )}
          style={{
            ...tiltProps.style,
            transformStyle: 'preserve-3d',
            border: `1.5px solid ${tint}40`,
            boxShadow: `inset 0 0 12px ${tint}10, 0 0 40px ${tint}20, 0 0 80px ${tint}10`,
          }}
        >
          {/* ===== FRONT FACE ===== */}
          <div
            className="absolute inset-0 rounded-2xl overflow-hidden card-metallic card-holographic"
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Background: carbon fiber */}
            <div className="absolute inset-0 card-carbon" />
            {/* Combined position tint + gradient (single layer) */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(180deg, ${tint}30 0%, ${tint}15 30%, ${tint}08 60%, transparent 100%)`,
              }}
            />

            {/* Top Bar: Club Logo | Flag + Age | Position Pill */}
            <div className="relative z-10 flex items-center justify-between px-3 pt-2.5">
              {/* Club Logo */}
              {clubData?.logo ? (
                <div className="size-8 md:size-9 rounded-full bg-black/60 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                  <Image src={clubData.logo} alt={clubData.name} width={28} height={28} className="size-6 md:size-7 rounded-full object-cover" />
                </div>
              ) : (
                <div className="size-8" />
              )}

              {/* Flag + Age */}
              <div className="flex items-center gap-1.5">
                {flag && <span className="text-base leading-none" aria-label={country}>{flag}</span>}
                {age != null && age > 0 && (
                  <span className="text-[10px] font-bold text-white/50 tabular-nums">{age}Y</span>
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

            {/* Photo with position glow ring (topo-overlay removed) */}
            <div className="relative z-10 flex justify-center mt-2 md:mt-3">
              <div
                className="size-[100px] md:size-[120px] rounded-full border-[3px] overflow-hidden"
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

            {/* BeScout Branding */}
            <div className="absolute bottom-1.5 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
              <img
                src="/logo.svg"
                alt=""
                className="size-3"
                aria-hidden="true"
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.2 }}
              />
              <span
                className="text-[7px] font-bold tracking-[0.3em] uppercase"
                style={{ color: `${tint}40` }}
              >
                BESCOUT
              </span>
            </div>

            {/* Info Section — delayed entrance */}
            <div className="relative z-10 card-entrance-info">
              {/* Position Separator */}
              <div className="mx-4 mt-2 md:mt-3">
                <div className="h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${tint}50 20%, ${tint}80 50%, ${tint}50 80%, transparent 100%)` }} />
              </div>

              {/* Glassmorphism Name Bar */}
              <div
                className="mt-1.5 md:mt-2 backdrop-blur-md px-3 py-1.5"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderTop: `1px solid ${tint}25`,
                  borderBottom: `1px solid ${tint}25`,
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
              <div className="grid grid-cols-3 gap-y-2 gap-x-1 px-4 mt-2 md:mt-3">
                <FifaStat label="L5" value={l5} />
                <FifaStat label="L15" value={backStats?.l15 ?? '\u2014'} />
                <FifaStat label={tp('statGoalsShort')} value={backStats?.goals ?? '\u2014'} />
                <FifaStat label={tp('statAssistsShort')} value={backStats?.assists ?? '\u2014'} />
                <FifaStat label={tp('statMatchesShort')} value={backStats?.matches ?? '\u2014'} />
                <FifaStat
                  label={tp('statFloorShort')}
                  value={backStats?.floorPrice != null ? fmtScout(backStats.floorPrice) : '\u2014'}
                />
              </div>
            </div>
          </div>

          {/* ===== BACK FACE ===== */}
          {backStats && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden card-metallic"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {/* Background: carbon fiber + combined position tint */}
              <div className="absolute inset-0 card-carbon" />
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${tint}30 0%, ${tint}15 30%, ${tint}08 60%, transparent 100%)`,
                }}
              />

              {/* Compact Stat Bars (replaces RadarChart) */}
              <div className="relative z-10 px-4 pt-4 md:pt-5 space-y-1.5">
                <StatBar label="L5" value={l5} max={150} tint={tint} />
                <StatBar label="L15" value={backStats.l15} max={150} tint={tint} />
                <StatBar label={tp('statGoalsShort')} value={backStats.goals} max={Math.max(backStats.goals, 20)} tint={tint} />
                <StatBar label={tp('statAssistsShort')} value={backStats.assists} max={Math.max(backStats.assists, 15)} tint={tint} />
                <StatBar label={tp('statMatchesShort')} value={backStats.matches} max={Math.max(backStats.matches, 34)} tint={tint} />
                <StatBar label="MIN" value={backStats.minutes} max={Math.max(backStats.minutes, 3060)} tint={tint} />
              </div>

              {/* Position separator */}
              <div className="relative z-10 mx-4 mt-3">
                <div className="h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${tint}50 20%, ${tint}80 50%, ${tint}50 80%, transparent 100%)` }} />
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
                  value={backStats.floorPrice != null ? fmtScout(backStats.floorPrice) : '\u2014'}
                />
              </div>

              {/* Name + Flip hint */}
              <div
                className="relative z-10 mt-3 backdrop-blur-md px-3 py-2"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderTop: `1px solid ${tint}25`,
                  borderBottom: `1px solid ${tint}25`,
                }}
              >
                <div className="text-xs font-bold text-white/90 text-center truncate">
                  {first} {last}
                </div>
                <div className="text-[9px] text-white/30 text-center mt-0.5">
                  {tp('tapToFlip')}
                </div>
              </div>

              {/* BeScout Branding */}
              <div className="absolute bottom-1.5 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
                <img
                  src="/logo.svg"
                  alt=""
                  className="size-3"
                  aria-hidden="true"
                  style={{ filter: 'brightness(0) invert(1)', opacity: 0.2 }}
                />
                <span
                  className="text-[7px] font-bold tracking-[0.3em] uppercase"
                  style={{ color: `${tint}40` }}
                >
                  BESCOUT
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
