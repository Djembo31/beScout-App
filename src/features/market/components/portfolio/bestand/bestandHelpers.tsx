'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendingUp, TrendingDown, Minus,
  Heart, AlertTriangle, HelpCircle,
  Rocket, Tag, MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getL5Color } from '@/components/player';
import type { PlayerStatus } from '@/types';
import type { NextFixtureInfo } from '@/lib/services/fixtures';

// ============================================
// LENS TYPES + CONFIG
// ============================================

export type BestandLens = 'performance' | 'markt' | 'handel' | 'vertrag';

export const LENS_OPTIONS: { id: BestandLens; labelKey: string }[] = [
  { id: 'performance', labelKey: 'bestandLensPerformance' },
  { id: 'markt', labelKey: 'bestandLensMarkt' },
  { id: 'handel', labelKey: 'bestandLensHandel' },
  { id: 'vertrag', labelKey: 'bestandLensVertrag' },
];

export const LENS_SORTS: Record<BestandLens, { id: string; labelKey: string }[]> = {
  performance: [
    { id: 'l5', labelKey: 'bestandSortL5' },
    { id: 'minutes', labelKey: 'bestandSortMinutes' },
    { id: 'name', labelKey: 'bestandSortName' },
  ],
  markt: [
    { id: 'value_desc', labelKey: 'bestandSortValueDesc' },
    { id: 'pnl_desc', labelKey: 'bestandSortPnlDesc' },
    { id: 'pnl_asc', labelKey: 'bestandSortPnlAsc' },
    { id: 'name', labelKey: 'bestandSortName' },
  ],
  handel: [
    { id: 'offers_desc', labelKey: 'bestandSortOffersDesc' },
    { id: 'listed_desc', labelKey: 'bestandSortListedDesc' },
    { id: 'floor_asc', labelKey: 'bestandSortFloorAsc' },
    { id: 'name', labelKey: 'bestandSortName' },
  ],
  vertrag: [
    { id: 'contract_asc', labelKey: 'bestandSortContractAsc' },
    { id: 'age_asc', labelKey: 'bestandSortAgeAsc' },
    { id: 'age_desc', labelKey: 'bestandSortAgeDesc' },
    { id: 'name', labelKey: 'bestandSortName' },
  ],
};

export const DEFAULT_SORT: Record<BestandLens, string> = {
  performance: 'l5',
  markt: 'value_desc',
  handel: 'offers_desc',
  vertrag: 'contract_asc',
};

// ============================================
// STATUS HELPERS
// ============================================

export const STATUS_CONFIG: Record<PlayerStatus, { labelKey: string; shortKey: string; bg: string; border: string; text: string; icon: typeof Heart }> = {
  fit: { labelKey: 'status_fit', shortKey: 'statusFitShort', bg: 'bg-green-500/10', border: 'border-green-500/20', text: 'text-green-500', icon: Heart },
  injured: { labelKey: 'status_injured', shortKey: 'statusInjuredShort', bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: AlertTriangle },
  suspended: { labelKey: 'status_suspended', shortKey: 'statusSuspendedShort', bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: AlertTriangle },
  doubtful: { labelKey: 'status_doubtful', shortKey: 'statusDoubtfulShort', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', text: 'text-yellow-400', icon: HelpCircle },
};

export function StatusPill({ status }: { status: PlayerStatus }) {
  const t = useTranslations('market');
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold border', cfg.bg, cfg.border, cfg.text)}>
      <Icon className="size-2.5" aria-hidden="true" />
      <span className="hidden sm:inline">{t(cfg.shortKey)}</span>
    </span>
  );
}

// ============================================
// MINUTES HELPERS
// ============================================

export function MinutesPill({ minutes }: { minutes: number[] | undefined }) {
  if (!minutes || minutes.length === 0) {
    return <span className="text-[10px] text-white/30 font-mono">&mdash;&apos;</span>;
  }
  const avg = Math.round(minutes.reduce((s, m) => s + m, 0) / minutes.length);
  const color = avg >= 75 ? 'text-green-500' : avg >= 45 ? 'text-yellow-400' : 'text-red-400';
  return (
    <span className={cn('text-[10px] font-mono font-bold', color)}>
      &empty;{avg}&apos;
    </span>
  );
}

export function MinutesBar({ minutes }: { minutes: number[] }) {
  return (
    <div className="flex items-end gap-0.5 h-5">
      {minutes.slice(0, 5).map((m, i) => {
        const pct = Math.min(100, (m / 90) * 100);
        const color = m >= 75 ? 'bg-green-500' : m >= 45 ? 'bg-yellow-400' : m > 0 ? 'bg-red-400' : 'bg-white/10';
        return (
          <div key={i} className="w-2.5 rounded-sm" style={{ height: `${Math.max(2, pct)}%` }}>
            <div className={cn('w-full h-full rounded-sm', color)} />
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// PERF TREND
// ============================================

export function PerfPills({ l5, l15, trend }: { l5: number; l15: number; trend: string }) {
  const TrendIcon = trend === 'UP' ? TrendingUp : trend === 'DOWN' ? TrendingDown : Minus;
  const trendColor = trend === 'UP' ? 'text-green-500' : trend === 'DOWN' ? 'text-red-400' : 'text-white/40';

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('text-[10px] font-mono font-black', getL5Color(l5))}>L5 {l5}</span>
      <span className="text-[10px] font-mono text-white/40">L15 {l15}</span>
      <TrendIcon className={cn('w-3 h-3', trendColor)} />
    </div>
  );
}

// ============================================
// NEXT MATCH
// ============================================

export function NextMatchBadge({ fixture }: { fixture: NextFixtureInfo | undefined }) {
  if (!fixture) return <span className="text-[10px] text-white/30">&mdash;</span>;
  return (
    <span className="text-[10px] text-white/50 font-mono">
      <span className={fixture.isHome ? 'text-green-500' : 'text-sky-300'}>
        {fixture.isHome ? 'H' : 'A'}
      </span>
      {' '}{fixture.opponentShort}
    </span>
  );
}

// ============================================
// MARKET ACTIVITY BADGES
// ============================================

export function MarketBadges({ hasIpo, listedQty, offerCount }: { hasIpo: boolean; listedQty: number; offerCount: number }) {
  const t = useTranslations('market');
  const hasAny = hasIpo || listedQty > 0 || offerCount > 0;
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-1">
      {hasIpo && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-500/10 border border-purple-400/20 rounded-full text-[9px] font-bold text-purple-300" title={t('badgeActiveIpo')}>
          <Rocket className="size-2.5" aria-hidden="true" />IPO
        </span>
      )}
      {listedQty > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gold/10 border border-gold/20 rounded-full text-[9px] font-bold text-gold" title={t('badgeOnTransferList')}>
          <Tag className="size-2.5" aria-hidden="true" />{listedQty}
        </span>
      )}
      {offerCount > 0 && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-500/10 border border-sky-400/20 rounded-full text-[9px] font-bold text-sky-300" title={t('badgeIncomingOffers')}>
          <MessageSquare className="size-2.5" aria-hidden="true" />{offerCount}
        </span>
      )}
    </div>
  );
}
