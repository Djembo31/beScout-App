'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Lock } from 'lucide-react';
import { PlayerPhoto, PositionBadge, FormBars } from '@/components/player';
import { posTintColors } from '@/components/player/positionColors';
import { fmtScout, cn } from '@/lib/utils';
import { getClub } from '@/lib/clubs';
import type { Player } from '@/types';

// ============================================
// TYPES
// ============================================

export type BestandItem = {
  player: Player;
  quantity: number;
  avgBuyBsd: number;      // $SCOUT (already converted)
  floorBsd: number;       // $SCOUT (from floorMap, already converted)
  valueBsd: number;       // qty * floorBsd
  pnlPct: number;
  lockedQty: number;
  mySellOrders: { priceCents: number; quantity: number }[];  // cents from DB
  buyOrderCount: number;
  lastTradeBsd: number | null;  // $SCOUT (already converted)
};

interface BestandPlayerRowProps {
  item: BestandItem;
  scores?: (number | null)[];
}

// ============================================
// COMPONENT
// ============================================

function BestandPlayerRowInner({ item, scores }: BestandPlayerRowProps) {
  const t = useTranslations('market');
  const p = item.player;
  const tint = posTintColors[p.pos];

  const formEntries = (scores ?? []).map(s => ({
    score: s ?? 0,
    status: (s != null ? 'played' : 'not_in_squad') as 'played' | 'not_in_squad',
  }));

  const clubData = p.clubId ? getClub(p.clubId) : null;
  const hasSellOrder = item.mySellOrders.length > 0;
  const sellPriceBsd = hasSellOrder ? item.mySellOrders[0].priceCents / 100 : 0;

  return (
    <Link
      href={`/player/${p.id}`}
      className="flex gap-3 px-3 py-2.5 rounded-xl bg-surface-base border border-divider border-l-2 hover:bg-surface-elevated hover:border-white/[0.12] transition-colors"
      style={{ borderLeftColor: tint }}
    >
      {/* Photo */}
      <div className="shrink-0 self-start">
        <PlayerPhoto imageUrl={p.imageUrl} first={p.first} last={p.last} pos={p.pos} size={48} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        {/* Line 1: Name + PosBadge → FormBars + L5 Circle */}
        <div className="flex items-center gap-1.5">
          <span className="font-black text-sm text-white truncate">{p.last.toUpperCase()}</span>
          <PositionBadge pos={p.pos} size="sm" />
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <FormBars entries={formEntries} />
            <div
              className="size-7 rounded-full flex items-center justify-center border-[1.5px]"
              style={{ backgroundColor: `${tint}33`, borderColor: `${tint}99` }}
            >
              <span className="font-mono font-black text-xs tabular-nums text-white/90">
                {Math.round(p.perf.l5)}
              </span>
            </div>
          </div>
        </div>

        {/* Line 2: Club + Stats */}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-white/40 truncate flex items-center gap-1">
            {clubData?.logo ? (
              <Image src={clubData.logo} alt="" width={14} height={14} className="size-3.5 rounded-full object-cover" />
            ) : clubData?.colors?.primary ? (
              <span className="size-3.5 rounded-full inline-block" style={{ backgroundColor: clubData.colors.primary }} />
            ) : null}
            {clubData?.name ?? p.club}
          </span>
          <span className="text-white/10">|</span>
          <span className="text-[10px] font-mono text-white/50 tabular-nums">
            {p.stats.matches}<span className="text-white/30">{t('statMatchesAbbr')}</span>{' '}
            {p.stats.goals}<span className="text-white/30">{t('statGoalsAbbr')}</span>{' '}
            {p.stats.assists}<span className="text-white/30">{t('statAssistsAbbr')}</span>
          </span>
        </div>

        {/* Line 3: Position + P&L */}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-bold text-white/70">
            {item.quantity}×
          </span>
          {item.lockedQty > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400/80">
              <Lock className="size-2.5" aria-hidden="true" />
              {item.lockedQty}
            </span>
          )}
          <span className="text-[10px] text-white/30">
            {t('bestandAvgBuy', { defaultMessage: 'Ø' })} {fmtScout(item.avgBuyBsd)}
          </span>
          <span className="text-white/10">&rarr;</span>
          <span className="text-[10px] font-mono font-bold tabular-nums text-gold">
            {fmtScout(item.floorBsd)} CR
          </span>
          <span className={cn(
            'text-[10px] font-mono font-bold tabular-nums ml-auto',
            item.pnlPct >= 0 ? 'text-green-500' : 'text-red-400'
          )}>
            {item.pnlPct >= 0 ? '+' : ''}{item.pnlPct.toFixed(1)}%
          </span>
        </div>

        {/* Line 4: Value (right) + Market Chips */}
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          {item.buyOrderCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/15 text-green-400">
              {t('bestandBidCount', { count: item.buyOrderCount, defaultMessage: '{count} Gebote' })}
            </span>
          )}
          {hasSellOrder && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gold/15 text-gold">
              {t('bestandYourSell', { defaultMessage: 'Verkauf' })}: {fmtScout(sellPriceBsd)}
            </span>
          )}
          {item.lastTradeBsd != null && item.lastTradeBsd > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-white/[0.04] text-white/40">
              {t('bestandLastTrade', { defaultMessage: 'Letzter' })}: {fmtScout(item.lastTradeBsd)}
            </span>
          )}
          <span className="ml-auto text-xs font-mono font-bold tabular-nums text-gold">
            = {fmtScout(item.valueBsd)}
          </span>
        </div>
      </div>
    </Link>
  );
}

const BestandPlayerRow = React.memo(BestandPlayerRowInner);
export default BestandPlayerRow;
