'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  TrendingUp, TrendingDown, Minus, DollarSign, Shield, Check as CheckIcon,
} from 'lucide-react';
import { PlayerIdentity } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { fmtScout, cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import {
  StatusPill, MinutesPill, PerfPills, NextMatchBadge, MarketBadges,
} from './bestandHelpers';
import type { BestandLens } from './bestandHelpers';
import type { Player } from '@/types';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

// ============================================
// TYPES
// ============================================

export type BestandPlayer = {
  player: Player;
  quantity: number;
  avgBuyPriceBsd: number;
  floorBsd: number | null;
  ipoPriceBsd: number | null;
  valueBsd: number;
  pnlBsd: number;
  pnlPct: number;
  purchasedAt: string;
  myListings: { id: string; qty: number; priceBsd: number; expiresAt: number }[];
  listedQty: number;
  lockedQty: number;
  availableToSell: number;
  offers: { id: string; sender_handle: string; quantity: number; price: number }[];
  hasActiveIpo: boolean;
};

interface BestandPlayerRowProps {
  item: BestandPlayer;
  lens: BestandLens;
  minutes?: number[];
  nextFixture?: NextFixtureInfo;
  inLineup: boolean;
  onSellClick: (playerId: string) => void;
  /** Bulk-select mode */
  isSelected?: boolean;
  onToggleSelect?: (playerId: string) => void;
}

// ============================================
// LENS-SPECIFIC COLUMNS
// ============================================

function PerformanceCols({ item, minutes, nextFixture }: { item: BestandPlayer; minutes?: number[]; nextFixture?: NextFixtureInfo }) {
  const t = useTranslations('market');
  const p = item.player;
  return (
    <>
      {/* Desktop columns */}
      <div className="hidden md:flex items-center gap-3 shrink-0">
        <PerfPills l5={p.perf.l5} l15={p.perf.l15} trend={p.perf.trend} />
        <span className="text-[10px] font-mono text-white/50 tabular-nums">
          {p.stats.matches}<span className="text-white/35">{t('statMatchesAbbr')}</span>{' '}
          {p.stats.goals}<span className="text-white/35">{t('statGoalsAbbr')}</span>{' '}
          {p.stats.assists}<span className="text-white/35">{t('statAssistsAbbr')}</span>
        </span>
        <MinutesPill minutes={minutes} />
        <StatusPill status={p.status} />
        <NextMatchBadge fixture={nextFixture} />
      </div>
      {/* Mobile row 2 */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5">
        <PerfPills l5={p.perf.l5} l15={p.perf.l15} trend={p.perf.trend} />
        <span className="text-[10px] font-mono text-white/50 tabular-nums">
          {p.stats.matches}<span className="text-white/35">{t('statMatchesAbbr')}</span>{' '}
          {p.stats.goals}<span className="text-white/35">{t('statGoalsAbbr')}</span>{' '}
          {p.stats.assists}<span className="text-white/35">{t('statAssistsAbbr')}</span>
        </span>
        <MinutesPill minutes={minutes} />
        <StatusPill status={p.status} />
      </div>
    </>
  );
}

function MarktCols({ item }: { item: BestandPlayer }) {
  const t = useTranslations('market');
  const pnlColor = item.pnlBsd >= 0 ? 'text-vivid-green' : 'text-vivid-red';
  const TrendIcon = item.pnlBsd > 0 ? TrendingUp : item.pnlBsd < 0 ? TrendingDown : Minus;
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono">
        <span className="text-white/50 tabular-nums">{item.quantity}<span className="text-white/25">×</span></span>
        <span className="text-white/40 tabular-nums">{t('bestandBuyPrice')} {fmtScout(item.avgBuyPriceBsd)}</span>
        <span className="text-white/50 tabular-nums">{t('bestandFloor')} {item.floorBsd != null ? fmtScout(item.floorBsd) : '—'}</span>
        <span className="text-gold font-bold tabular-nums">{fmtScout(item.valueBsd * item.quantity)}</span>
        <span className={cn('flex items-center gap-0.5 tabular-nums', pnlColor)}>
          <TrendIcon className="size-2.5" aria-hidden="true" />
          {item.pnlBsd >= 0 ? '+' : ''}{fmtScout(Math.round(item.pnlBsd))}
          <span className="text-white/30 ml-0.5">({item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%)</span>
        </span>
        <MarketBadges hasIpo={item.hasActiveIpo} listedQty={0} offerCount={0} />
      </div>
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5 text-[10px] font-mono">
        <span className="text-white/50 tabular-nums">{item.quantity}<span className="text-white/25">×</span> {t('bestandBuyPrice')} {fmtScout(item.avgBuyPriceBsd)}</span>
        <span className="text-gold font-bold tabular-nums">{fmtScout(item.valueBsd * item.quantity)}</span>
        <span className={cn('flex items-center gap-0.5 tabular-nums', pnlColor)}>
          <TrendIcon className="size-2.5" aria-hidden="true" />
          {item.pnlBsd >= 0 ? '+' : ''}{fmtScout(Math.round(item.pnlBsd))}
        </span>
      </div>
    </>
  );
}

function HandelCols({ item }: { item: BestandPlayer }) {
  const t = useTranslations('market');
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono">
        {item.listedQty > 0 ? (
          <span className="text-gold tabular-nums">{t('bestandListedCount', { count: item.listedQty })}</span>
        ) : (
          <span className="text-white/30">{t('bestandNotListed')}</span>
        )}
        {item.lockedQty > 0 && (
          <span className="text-purple-300 tabular-nums">{t('bestandLockedCount', { count: item.lockedQty })}</span>
        )}
        {item.offers.length > 0 ? (
          <span className="text-sky-300 tabular-nums">{t('bestandOfferCount', { count: item.offers.length })}</span>
        ) : (
          <span className="text-white/30">{t('bestandNoOffer')}</span>
        )}
        <span className="text-white/50 tabular-nums">{t('bestandAvailableCount', { count: item.availableToSell })}</span>
        <span className="text-white/50 tabular-nums">{t('bestandFloor')} {item.floorBsd != null ? fmtScout(item.floorBsd) : '—'}</span>
      </div>
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5 text-[10px] font-mono">
        <MarketBadges hasIpo={item.hasActiveIpo} listedQty={item.listedQty} offerCount={item.offers.length} />
        {item.lockedQty > 0 && (
          <span className="text-purple-300 tabular-nums">{t('bestandLockedShort', { count: item.lockedQty })}</span>
        )}
        <span className="text-white/40 tabular-nums">{t('bestandAvailableShort', { count: item.availableToSell })}</span>
        <span className="text-white/50 tabular-nums">{t('bestandFloor')} {item.floorBsd != null ? fmtScout(item.floorBsd) : '—'}</span>
      </div>
    </>
  );
}

function VertragCols({ item }: { item: BestandPlayer }) {
  const t = useTranslations('market');
  const p = item.player;
  const months = p.contractMonthsLeft;
  const contractColor = months <= 6 ? 'text-red-400' : months <= 12 ? 'text-orange-400' : 'text-white/60';
  const clubData = p.clubId ? getClub(p.clubId) : null;
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-3 shrink-0 text-[11px] font-mono">
        <span className="text-white/50 tabular-nums">{p.age} {t('bestandAgeYears')}</span>
        <span className="text-white/40">{p.country || '—'}</span>
        <span className={cn('font-bold tabular-nums', contractColor)}>{months}M</span>
        <StatusPill status={p.status} />
        <span className="text-white/40 flex items-center gap-1">
          {clubData?.logo ? (
            <Image src={clubData.logo} alt="" width={14} height={14} className="size-3.5 rounded-full object-cover" />
          ) : clubData?.colors?.primary ? (
            <div className="size-3.5 rounded-full" style={{ backgroundColor: clubData.colors.primary }} />
          ) : null}
          {p.club}
        </span>
      </div>
      {/* Mobile */}
      <div className="md:hidden flex items-center gap-2 flex-wrap mt-0.5 text-[10px] font-mono">
        <span className="text-white/50 tabular-nums">{p.age} {t('bestandAgeYears')}</span>
        <span className={cn('font-bold tabular-nums', contractColor)}>{months}M</span>
        <StatusPill status={p.status} />
      </div>
    </>
  );
}

// ============================================
// MAIN ROW
// ============================================

function BestandPlayerRowInner({ item, lens, minutes, nextFixture, inLineup, onSellClick, isSelected, onToggleSelect }: BestandPlayerRowProps) {
  const t = useTranslations('market');
  const p = item.player;

  return (
    <div
      className={cn(
        'bg-surface-base border border-divider rounded-xl transition-colors hover:bg-surface-elevated hover:border-white/[0.12] border-l-2',
        isSelected && 'border-gold/30 bg-gold/[0.03]',
      )}
      style={{ borderLeftColor: posTintColors[p.pos] }}
    >
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2.5">
        {/* Bulk-select checkbox */}
        {onToggleSelect && (
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(p.id); }}
            className={cn(
              'size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              isSelected ? 'bg-gold border-gold text-black' : 'border-white/20 hover:border-white/40',
            )}
            aria-label={isSelected ? t('bestandDeselect') : t('bestandSelect')}
          >
            {isSelected && <CheckIcon className="size-3" />}
          </button>
        )}
        {/* Identity + Lens-specific data */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link href={`/player/${p.id}`} className="hover:opacity-80 transition-opacity">
              <PlayerIdentity player={p} size="sm" showMeta={false} showStatus={false} />
            </Link>
            {inLineup && <span className="shrink-0" title={t('bestandInLineup')}><Shield className="size-3 text-green-500" aria-hidden="true" /></span>}
          </div>

          {/* Lens columns */}
          {lens === 'performance' && <PerformanceCols item={item} minutes={minutes} nextFixture={nextFixture} />}
          {lens === 'markt' && <MarktCols item={item} />}
          {lens === 'handel' && <HandelCols item={item} />}
          {lens === 'vertrag' && <VertragCols item={item} />}
        </div>

        {/* Right: Value (markt lens shows in cols) + Sell Button */}
        <div className="shrink-0 flex items-center gap-2">
          {lens === 'performance' && (
            <div className="text-right hidden sm:block">
              <div className="text-xs font-mono font-bold tabular-nums text-gold">{fmtScout(item.valueBsd * item.quantity)}</div>
              <div className={cn('text-[9px] font-mono tabular-nums', item.pnlBsd >= 0 ? 'text-green-500' : 'text-red-300')}>
                {item.pnlBsd >= 0 ? '+' : ''}{fmtScout(Math.round(item.pnlBsd))}
              </div>
            </div>
          )}
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSellClick(p.id); }}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-gold hover:border-gold/20 hover:bg-gold/5 transition-colors"
            aria-label={t('bestandSell')}
          >
            <DollarSign className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

export const BestandPlayerRow = memo(BestandPlayerRowInner);
