'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Loader2, TrendingUp, TrendingDown, Minus, ChevronDown, ShoppingCart } from 'lucide-react';
import { PlayerIdentity, FormBars } from '@/components/player';
import { posTintColors } from '@/components/player/PlayerRow';
import { InfoTooltip, EmptyState } from '@/components/ui';
import { LeagueBadge } from '@/components/ui/LeagueBadge';
import MarketFilters, { applyFilters, applySorting } from '../shared/MarketFilters';
import { useMarketStore } from '@/lib/stores/marketStore';
import { useRecentScores } from '@/lib/queries/managerData';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbOrder } from '@/types';

const OrderDepthView = dynamic(() => import('../shared/OrderDepthView'), { ssr: false });

interface TransferListSectionProps {
  players: Player[];
  sellOrders: DbOrder[];
  playerMap: Map<string, Player>;
  getFloor: (p: Player) => number;
  onBuy: (playerId: string) => void;
  buyingId: string | null;
  balanceCents?: number;
  onCreateBuyOrder?: (playerId: string) => void;
}

type ListingAgg = {
  playerId: string;
  count: number;
  floor: number;      // cents
  totalQty: number;
};

export default function TransferListSection({
  players, sellOrders, playerMap, getFloor, onBuy, buyingId, balanceCents, onCreateBuyOrder,
}: TransferListSectionProps) {
  const [showAffordable, setShowAffordable] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const hasRendered = useRef(false);
  useEffect(() => { hasRendered.current = true; }, []);
  const t = useTranslations('market');
  const store = useMarketStore();
  const { data: scoresMap } = useRecentScores();

  // Aggregate sell orders by player
  const listings = useMemo(() => {
    const grouped = new Map<string, ListingAgg>();
    for (const order of sellOrders) {
      if (order.status !== 'open' && order.status !== 'partial') continue;
      if (order.side !== 'sell') continue;
      const available = order.quantity - order.filled_qty;
      if (available <= 0) continue;

      const existing = grouped.get(order.player_id);
      if (!existing) {
        grouped.set(order.player_id, {
          playerId: order.player_id,
          count: 1,
          floor: order.price,
          totalQty: available,
        });
      } else {
        existing.count++;
        existing.totalQty += available;
        if (order.price < existing.floor) existing.floor = order.price;
      }
    }
    return grouped;
  }, [sellOrders]);

  // Get players that have listings, apply filters
  const listingPlayers = useMemo(() => {
    let result = players.filter(p => listings.has(p.id));

    // Global league filter from store
    if (store.selectedLeague) {
      result = result.filter(p => p.league === store.selectedLeague);
    }

    // Apply shared filters
    result = applyFilters(result, store);

    // Transferliste-specific filters
    if (store.filterPriceMin > 0) {
      result = result.filter(p => {
        const agg = listings.get(p.id);
        return agg && centsToBsd(agg.floor) >= store.filterPriceMin;
      });
    }
    if (store.filterPriceMax > 0) {
      result = result.filter(p => {
        const agg = listings.get(p.id);
        return agg && centsToBsd(agg.floor) <= store.filterPriceMax;
      });
    }
    if (store.filterMinSellers > 0) {
      result = result.filter(p => {
        const agg = listings.get(p.id);
        return agg && agg.count >= store.filterMinSellers;
      });
    }
    if (store.filterBestDeals) {
      result = result.filter(p => {
        const agg = listings.get(p.id);
        if (!agg) return false;
        const priceBsd = centsToBsd(agg.floor);
        return p.perf.l5 > 0 && priceBsd > 0 && (p.perf.l5 / priceBsd) > 0.1;
      });
    }
    // "Leistbar" filter — show only what user can afford
    if (showAffordable && balanceCents !== undefined && balanceCents > 0) {
      result = result.filter(p => {
        const agg = listings.get(p.id);
        return agg && agg.floor <= balanceCents;
      });
    }

    // Sort
    result = applySorting(result, store.marketSortBy, (p) => {
      const agg = listings.get(p.id);
      return agg ? centsToBsd(agg.floor) : getFloor(p);
    });

    return result;
  }, [players, listings, store, getFloor, showAffordable, balanceCents]);

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-white">{t('transferListBadge')}</h2>
        <InfoTooltip text={t('transferListTooltip')} />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1"><MarketFilters showTransferFilters /></div>
        {balanceCents !== undefined && balanceCents > 0 && (
          <button
            onClick={() => setShowAffordable(!showAffordable)}
            className={cn(
              'px-3 py-1.5 rounded-full text-[10px] font-bold transition-colors whitespace-nowrap flex-shrink-0 min-h-[36px] border active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50',
              showAffordable
                ? 'bg-gold/15 border-gold/30 text-gold'
                : 'bg-surface-subtle border-white/[0.08] text-white/40 hover:text-white/60'
            )}
          >
            {t('affordable', { defaultMessage: 'Leistbar' })}
          </button>
        )}
      </div>

      {listingPlayers.length === 0 ? (
        <EmptyState
          icon="search"
          title={t('noTransferListings')}
          description={t('noTransferListingsDesc')}
        />
      ) : (
        <div className="space-y-2">
          {listingPlayers.map((p, i) => {
            const agg = listings.get(p.id);
            if (!agg) return null;
            const floorBsd = centsToBsd(agg.floor);
            const isBuying = buyingId === p.id;
            const change = p.prices.change24h;
            const history = p.prices.history7d;

            const isExpanded = expandedPlayer === p.id;
            const shouldStagger = !hasRendered.current && i < 10;

            return (
              <div
                key={p.id}
                className={cn(
                  'bg-surface-base border border-white/[0.08] rounded-xl overflow-hidden hover:border-white/15 transition-colors',
                  shouldStagger && 'card-entrance motion-reduce:animate-none'
                )}
                style={shouldStagger ? { animationDelay: `${i * 50}ms` } : undefined}
              >
                <Link
                  href={`/player/${p.id}`}
                  className="flex items-center gap-3 px-3 py-3 group border-l-2"
                  style={{ borderLeftColor: `${posTintColors[p.pos]}40` }}
                >
                  {/* Player identity */}
                  <PlayerIdentity player={p} size="sm" showStatus className="flex-1 min-w-0" />

                  {/* League badge (md+ to save mobile space) */}
                  {p.leagueShort && (
                    <LeagueBadge
                      logoUrl={p.leagueLogoUrl}
                      name={p.league ?? p.leagueShort}
                      short={p.leagueShort}
                      size="xs"
                      className="hidden sm:inline-flex"
                    />
                  )}

                  {/* Form bars + L5 circle */}
                  {(() => {
                    const scores = scoresMap?.get(p.id);
                    const formEntries = (scores ?? []).map(s => ({
                      score: s ?? 0,
                      status: (s != null ? 'played' : 'not_in_squad') as 'played' | 'not_in_squad',
                    }));
                    const tint = posTintColors[p.pos];
                    return (
                      <div className="flex items-center gap-2 shrink-0">
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
                    );
                  })()}

                  {/* Stats micro-display */}
                  <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-white/40 flex-shrink-0">
                    <span className="text-vivid-green">{p.stats.goals}G</span>
                    <span className="text-sky-300">{p.stats.assists}A</span>
                    <span>{p.stats.matches}M</span>
                  </div>

                  {/* Trend */}
                  <div className="flex-shrink-0">
                    {p.perf.trend === 'UP' && <TrendingUp className="size-3.5 text-vivid-green" aria-hidden="true" />}
                    {p.perf.trend === 'DOWN' && <TrendingDown className="size-3.5 text-vivid-red" aria-hidden="true" />}
                    {p.perf.trend === 'FLAT' && <Minus className="size-3.5 text-white/20" aria-hidden="true" />}
                  </div>

                  {/* Sparkline (tiny) */}
                  {history && history.length >= 2 && (
                    <div className="w-12 h-4 flex-shrink-0 hidden sm:block">
                      <svg viewBox={`0 0 ${history.length - 1} 20`} className="w-full h-full" preserveAspectRatio="none">
                        <polyline
                          points={history.map((v, i) => `${i},${20 - ((v - Math.min(...history)) / (Math.max(...history) - Math.min(...history) || 1)) * 20}`).join(' ')}
                          fill="none"
                          stroke={change >= 0 ? '#00e676' : '#ff3b69'}
                          strokeWidth="1.5"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Price info */}
                  <div className="text-right flex-shrink-0 min-w-[80px]">
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-[9px] text-white/30">{t('listedFrom')}</span>
                      <InfoTooltip text={t('transferListTooltip')} />
                    </div>
                    <div className="font-mono font-black text-sm text-gold tabular-nums">{fmtScout(floorBsd)}</div>
                    <div className="flex items-center gap-1 justify-end text-[10px] tabular-nums">
                      {/* Depth toggle — click to show order book */}
                      {agg.count > 1 && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpandedPlayer(isExpanded ? null : p.id); }}
                          className="flex items-center gap-0.5 text-white/30 hover:text-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 rounded"
                          aria-label={t('showOrderBook', { defaultMessage: 'Orderbuch anzeigen' })}
                          aria-expanded={isExpanded}
                        >
                          <span>{agg.count} {t('offerPlural', { count: agg.count })}</span>
                          <ChevronDown className={cn('size-3 transition-transform', isExpanded && 'rotate-180')} aria-hidden="true" />
                        </button>
                      )}
                      {agg.count === 1 && (
                        <span className="text-white/30">{t('offerSingular', { count: agg.count })}</span>
                      )}
                      {change !== 0 && (
                        <span className={cn('font-mono font-bold', change >= 0 ? 'text-vivid-green' : 'text-vivid-red')}>
                          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      )}
                    </div>
                    {/* Last trade price context */}
                    {p.prices.lastTrade > 0 && p.prices.lastTrade !== floorBsd && (
                      <div className="text-[9px] text-white/25 tabular-nums font-mono mt-0.5">
                        {t('lastTrade', { defaultMessage: 'Letzter Trade' })}: {fmtScout(p.prices.lastTrade)}
                      </div>
                    )}
                  </div>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(p.id); }}
                    disabled={isBuying}
                    className="px-3 py-2 min-h-[44px] bg-gold/10 border border-gold/20 text-gold rounded-lg text-xs font-black hover:bg-gold/20 transition-colors active:scale-[0.97] disabled:opacity-50 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                  >
                    {isBuying ? <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
                  </button>
                  {onCreateBuyOrder && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onCreateBuyOrder(p.id); }}
                      className="px-2 py-2 min-h-[44px] bg-sky-500/10 border border-sky-400/20 text-sky-400 rounded-lg text-[10px] font-bold hover:bg-sky-500/20 transition-colors active:scale-[0.97] flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                      title={t('buyOrderButton')}
                    >
                      <ShoppingCart className="size-3" aria-hidden="true" />
                      <span className="hidden sm:inline">{t('buyOrderButton')}</span>
                    </button>
                  )}
                </div>
              </Link>

                {/* Order Depth View — expandable */}
                {isExpanded && (
                  <div className="border-t border-divider px-3">
                    <OrderDepthView playerId={p.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
