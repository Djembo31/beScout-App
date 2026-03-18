'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { getClub } from '@/lib/clubs';
import { posTintColors } from '@/components/player/PlayerRow';
import { useTilt } from '@/lib/hooks/useTilt';
import { fmtScout, cn } from '@/lib/utils';
import CountryFlag from '@/components/ui/CountryFlag';
import type { Pos } from '@/types';

// Position glow ring — matches Tailwind shadow-glow-* tokens from tailwind.config
const posRingGlow: Record<Pos, string> = {
  GK: '0 0 24px rgba(16,185,129,0.25), 0 0 48px rgba(16,185,129,0.12)',
  DEF: '0 0 24px rgba(245,158,11,0.25), 0 0 48px rgba(245,158,11,0.12)',
  MID: '0 0 24px rgba(14,165,233,0.25), 0 0 48px rgba(14,165,233,0.12)',
  ATT: '0 0 24px rgba(244,63,94,0.25), 0 0 48px rgba(244,63,94,0.12)',
};

export interface CardBackData {
  marketValueEur?: number;
  floorPrice?: number;
  priceChange24h?: number;
  successFeeCap?: number;
  holdingQty?: number;
  supplyTotal: number;
  contractMonths: number;
  l15: number;
  stats: {
    goals: number;
    assists: number;
    matches: number;
  };
  percentiles: {
    l5: number;
    l15: number;
    season: number;
    minutes: number;
  };
}

interface TradingCardFrameProps {
  first: string;
  last: string;
  pos: Pos;
  club: string;
  shirtNumber: number;
  imageUrl?: string | null;
  l5: number;
  l5Apps?: number;    // Appearances in last 5 GWs (0-5)
  l15Apps?: number;   // Appearances in last 15 GWs (0-15)
  edition?: string;
  className?: string;
  backData?: CardBackData;
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

/* Slim percentile bar for card back — single tint color, h-1 */
function PercentileBar({ label, percentile, tint }: { label: string; percentile: number; tint: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[7px] font-bold uppercase tracking-wider text-white/35 w-[24px] shrink-0 text-right">
        {label}
      </span>
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(3, percentile)}%`, backgroundColor: tint }}
        />
      </div>
      <span className="font-mono text-[8px] tabular-nums text-white/30 w-[28px] text-right shrink-0">
        {percentile}%
      </span>
    </div>
  );
}

/* Trading metric cell — glassmorphism */
function MetricCell({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div
      className="rounded-lg px-2 py-1.5 md:py-2"
      style={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: `1px solid ${tint}15`,
      }}
    >
      <div className="text-[7px] font-bold uppercase tracking-wider text-white/35 leading-none">
        {label}
      </div>
      <div className="text-[14px] md:text-[16px] font-mono font-black tabular-nums text-white/90 leading-tight mt-0.5">
        {value}
      </div>
    </div>
  );
}

const formatMV = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M\u20AC`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K\u20AC`;
  return `${v}\u20AC`;
};

export default function TradingCardFrame({
  first, last, pos, club, shirtNumber, imageUrl, l5, l5Apps = 0, l15Apps = 0, edition, className = '', backData,
  age, country, masteryLevel,
}: TradingCardFrameProps) {
  const tp = useTranslations('player');
  const [flipped, setFlipped] = useState(false);
  const canFlip = !!backData;

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

  // Initials fallback
  const initials = `${first?.[0] ?? ''}${last?.[0] ?? ''}`;

  const handleClick = canFlip ? () => setFlipped(f => !f) : undefined;
  const tierClass = masteryLevel && masteryLevel > 0 ? `card-tier-${Math.min(masteryLevel, 5)}` : '';

  return (
    <div className={cn('relative card-entrance rounded-2xl', tierClass, className)}>
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
                {country && <CountryFlag code={country} size={14} />}
                {age != null && age > 0 && (
                  <span className="text-[10px] font-bold text-white/50 tabular-nums">{age}Y</span>
                )}
              </div>

              {/* Position Pill with shirt number */}
              <div
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black backdrop-blur-sm"
                style={{ backgroundColor: `${tint}40`, color: '#fff', border: `1px solid ${tint}60`, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
              >
                {pos} {shirtNumber > 0 && <span className="font-mono tabular-nums">#{shirtNumber}</span>}
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

              {/* ── Performance Zone (L5 + L15 with appearance bars) ── */}
              <div className="flex justify-center gap-6 px-4 mt-2 md:mt-3">
                {/* L5 */}
                <div className="flex-1">
                  <div className="flex items-baseline gap-1 justify-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${tint}90` }}>L5</span>
                    <span className="text-[22px] md:text-[26px] font-black text-white/90 leading-none tabular-nums font-mono">{l5}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(l5Apps / 5) * 100}%`, backgroundColor: tint }} />
                    </div>
                    <span className="text-[7px] font-mono text-white/30 tabular-nums w-[22px] text-right">{Math.round((l5Apps / 5) * 100)}%</span>
                  </div>
                </div>
                {/* L15 */}
                <div className="flex-1">
                  <div className="flex items-baseline gap-1 justify-center">
                    <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: `${tint}90` }}>L15</span>
                    <span className="text-[22px] md:text-[26px] font-black text-white/90 leading-none tabular-nums font-mono">{backData?.l15 ?? '\u2014'}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(l15Apps / 15) * 100}%`, backgroundColor: tint }} />
                    </div>
                    <span className="text-[7px] font-mono text-white/30 tabular-nums w-[22px] text-right">{Math.round((l15Apps / 15) * 100)}%</span>
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="mx-4 mt-2">
                <div className="h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${tint}30 20%, ${tint}50 50%, ${tint}30 80%, transparent 100%)` }} />
              </div>

              {/* ── Stats Zone (Goals | Assists | Matches — grouped) ── */}
              <div className="flex justify-center gap-4 px-4 mt-1.5">
                <div className="flex flex-col items-center">
                  <span className="text-[16px] md:text-[18px] font-black text-white/70 tabular-nums font-mono">{backData?.stats?.goals ?? '\u2014'}</span>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-white/30">{tp('statGoalsShort')}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[16px] md:text-[18px] font-black text-white/70 tabular-nums font-mono">{backData?.stats?.assists ?? '\u2014'}</span>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-white/30">{tp('statAssistsShort')}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[16px] md:text-[18px] font-black text-white/70 tabular-nums font-mono">{backData?.stats?.matches ?? '\u2014'}</span>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-white/30">{tp('statMatchesShort')}</span>
                </div>
              </div>

              {/* Separator */}
              <div className="mx-4 mt-1.5">
                <div className="h-px" style={{ background: `linear-gradient(90deg, transparent 0%, ${tint}20 30%, ${tint}20 70%, transparent 100%)` }} />
              </div>

              {/* ── Price Zone (Gold, prominent) ── */}
              <div className="flex items-baseline justify-center gap-1.5 mt-1.5 pb-1">
                <span className="text-[18px] md:text-[20px] font-mono font-black tabular-nums text-gold">
                  {backData?.floorPrice != null ? fmtScout(backData.floorPrice) : '\u2014'}
                </span>
                <span className="text-[8px] font-bold text-gold/50 uppercase">Credits</span>
              </div>
            </div>
          </div>

          {/* ===== BACK FACE ===== */}
          {backData && (() => {
            const { percentiles: pct } = backData;
            const change = backData.priceChange24h ?? 0;
            const changeStr = change === 0 ? '\u2014' : `${change >= 0 ? '\u2191' : '\u2193'}${Math.abs(change).toFixed(1)}%`;
            const holdPct = backData.holdingQty && backData.supplyTotal > 0
              ? ((backData.holdingQty / backData.supplyTotal) * 100).toFixed(1)
              : null;

            // Performance percentile bars (same for ALL positions)
            const perfBars = [
              { label: 'L5', percentile: pct.l5 },
              { label: 'L15', percentile: pct.l15 },
              { label: 'AVG', percentile: pct.season },
              { label: 'MIN', percentile: pct.minutes },
            ];

            return (
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden card-metallic"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {/* Background: carbon fiber + position tint (same as front) */}
                <div className="absolute inset-0 card-carbon" />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(180deg, ${tint}30 0%, ${tint}15 30%, ${tint}08 60%, transparent 100%)`,
                  }}
                />

                {/* ── Trading Data ── */}
                <div className="relative z-10 px-3 pt-3 md:pt-4">
                  <div className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/25 mb-2">
                    {tp('cardBack.scoutCardData')}
                  </div>

                  {/* 2x2 Metric Grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <MetricCell
                      label={tp('cardBack.marketValue')}
                      value={backData.marketValueEur ? formatMV(backData.marketValueEur) : '\u2014'}
                      tint={tint}
                    />
                    <MetricCell
                      label={tp('cardBack.floorPrice')}
                      value={backData.floorPrice != null ? `${fmtScout(backData.floorPrice)} CR` : '\u2014'}
                      tint={tint}
                    />
                    <MetricCell
                      label={tp('cardBack.change24h')}
                      value={changeStr}
                      tint={tint}
                    />
                    <MetricCell
                      label={tp('cardBack.feeCap')}
                      value={backData.successFeeCap != null ? `${fmtScout(backData.successFeeCap)} CR` : '\u2014'}
                      tint={tint}
                    />
                  </div>

                  {/* Contract Duration (only if known) */}
                  {backData.contractMonths > 0 && (
                    <div className="mt-1.5 flex items-center justify-center gap-1.5">
                      <span className="text-[9px] text-white/35">{tp('cardBack.contract')}</span>
                      <span className="text-[9px] font-mono font-bold text-white/60 tabular-nums">{backData.contractMonths}M</span>
                    </div>
                  )}

                  {/* Holdings Row (only if user owns SCs) */}
                  {backData.holdingQty != null && backData.holdingQty > 0 && holdPct && (
                    <div
                      className="mt-1.5 flex items-center justify-center gap-1 rounded-lg px-3 py-1.5"
                      style={{ backgroundColor: `${tint}08`, border: `1px solid ${tint}15` }}
                    >
                      <span className="text-[9px] font-medium text-white/40">
                        {tp('cardBack.holdings', {
                          count: backData.holdingQty,
                          pct: holdPct,
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Label Divider: LEISTUNG ── */}
                <div className="relative z-10 flex items-center gap-2 mx-3 mt-2.5 md:mt-3">
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${tint}40)` }} />
                  <span
                    className="text-[7px] font-bold uppercase tracking-[0.3em]"
                    style={{ color: `${tint}60` }}
                  >
                    {tp('cardBack.leistung')}
                  </span>
                  <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${tint}40, transparent)` }} />
                </div>

                {/* ── Percentile Performance Bars ── */}
                <div className="relative z-10 px-3 mt-2 md:mt-2.5 space-y-2">
                  {perfBars.map((bar) => (
                    <PercentileBar
                      key={bar.label}
                      label={bar.label}
                      percentile={bar.percentile}
                      tint={tint}
                    />
                  ))}
                </div>

                {/* ── Footer: Flip hint + Branding ── */}
                <div className="absolute bottom-1.5 inset-x-0 z-10 flex items-center justify-center gap-1.5 pointer-events-none">
                  <span className="text-[7px] text-white/20">{tp('tapToFlip')}</span>
                  <span className="text-white/10">&middot;</span>
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
            );
          })()}
        </div>
      </div>
    </div>
  );
}
