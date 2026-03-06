'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { PlayerIdentity, getL5Color } from '@/components/player';
import { Countdown } from '@/components/ui/Countdown';
import { InfoTooltip, EmptyState } from '@/components/ui';
import MarketFilters, { applyFilters, applySorting } from './MarketFilters';
import { useMarketStore } from '@/lib/stores/marketStore';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getRelativeTime } from '@/lib/activityHelpers';
import type { Player, DbIpo } from '@/types';

interface ClubSaleSectionProps {
  players: Player[];
  activeIpos: DbIpo[];
  announcedIpos: DbIpo[];
  endedIpos: DbIpo[];
  playerMap: Map<string, Player>;
  onIpoBuy: (playerId: string) => void;
  buyingId: string | null;
}

export default function ClubSaleSection({
  players, activeIpos, announcedIpos, endedIpos, playerMap, onIpoBuy, buyingId,
}: ClubSaleSectionProps) {
  const t = useTranslations('market');
  const ta = useTranslations('activity');
  const store = useMarketStore();

  // Filter & sort players that have active IPOs
  const liveItems = useMemo(() => {
    const items = activeIpos
      .map(ipo => {
        const player = playerMap.get(ipo.player_id);
        if (!player) return null;
        return { player, ipo };
      })
      .filter((x): x is { player: Player; ipo: DbIpo } => x !== null);

    const filteredPlayers = applyFilters(items.map(i => i.player), store);
    const filteredIds = new Set(filteredPlayers.map(p => p.id));
    const filtered = items.filter(i => filteredIds.has(i.player.id));

    const sorted = applySorting(filtered.map(i => i.player), store.marketSortBy);
    const sortedIds = sorted.map(p => p.id);
    return filtered.sort((a, b) => sortedIds.indexOf(a.player.id) - sortedIds.indexOf(b.player.id));
  }, [activeIpos, playerMap, store]);

  const upcomingItems = useMemo(() => {
    return announcedIpos
      .map(ipo => {
        const player = playerMap.get(ipo.player_id);
        if (!player) return null;
        return { player, ipo };
      })
      .filter((x): x is { player: Player; ipo: DbIpo } => x !== null);
  }, [announcedIpos, playerMap]);

  const endedItems = useMemo(() => {
    return endedIpos
      .map(ipo => {
        const player = playerMap.get(ipo.player_id);
        if (!player) return null;
        return { player, ipo };
      })
      .filter((x): x is { player: Player; ipo: DbIpo } => x !== null);
  }, [endedIpos, playerMap]);

  const hasAnyContent = liveItems.length > 0 || upcomingItems.length > 0 || endedItems.length > 0;

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-bold text-white">{t('clubSale')}</h2>
        <InfoTooltip text={t('clubSaleTooltip')} />
      </div>

      <MarketFilters />

      {!hasAnyContent && (
        <EmptyState
          icon="shopping-cart"
          title={t('noClubSales', { defaultMessage: 'Keine Club Verkaufe aktiv' })}
          description={t('noClubSalesDesc', { defaultMessage: 'Aktuell gibt es keine aktiven Verkaufe vom Verein.' })}
        />
      )}

      {/* Phase 1: Jetzt Live */}
      {liveItems.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="size-2 rounded-full bg-vivid-green live-ring" />
            <h3 className="text-xs font-bold text-white/70 uppercase tracking-wide">{t('nowLive')}</h3>
          </div>
          <div className="space-y-3">
            {liveItems.map(({ player: p, ipo }) => {
              const priceBsd = centsToBsd(ipo.price);
              const progress = ipo.total_offered > 0 ? (ipo.sold / ipo.total_offered) * 100 : 0;
              const isBuying = buyingId === p.id;

              return (
                <Link
                  key={ipo.id}
                  href={`/player/${p.id}`}
                  className="block bg-surface-base border border-white/[0.10] rounded-2xl p-4 group hover:border-white/20 transition-colors shadow-glow-live"
                >
                  {/* Top row: Player + Countdown */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <PlayerIdentity player={p} size="md" showStatus className="flex-1 min-w-0" />
                    <Countdown targetDate={ipo.ends_at} className="flex-shrink-0" />
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 mb-3 text-[11px] font-mono">
                    <span className={cn('font-bold', getL5Color(p.perf.l5))}>L5: {p.perf.l5}</span>
                    <span className="text-white/20">|</span>
                    <span className="text-vivid-green">{p.stats.goals} {t('goals')}</span>
                    <span className="text-sky-300">{p.stats.assists} {t('assists')}</span>
                    <span className="text-white/40">{p.stats.matches} {t('matches')}</span>
                    <span className="ml-auto">
                      {p.perf.trend === 'UP' && <TrendingUp className="size-3.5 text-vivid-green" aria-hidden="true" />}
                      {p.perf.trend === 'DOWN' && <TrendingDown className="size-3.5 text-vivid-red" aria-hidden="true" />}
                      {p.perf.trend === 'FLAT' && <Minus className="size-3.5 text-white/30" aria-hidden="true" />}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="relative mb-2">
                    <div className="h-2.5 bg-white/[0.06] rounded-full overflow-hidden border border-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-vivid-green transition-colors duration-500"
                        style={{ width: `${Math.min(progress, 100)}%`, boxShadow: '0 0 8px rgba(0,230,118,0.3)' }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-white/40 tabular-nums">
                      <span>{t('soldProgress', { sold: ipo.sold, total: ipo.total_offered })}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Price + Buy */}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-[10px] text-white/40">{t('clubPrice')}</div>
                      <div className="font-mono font-black text-lg text-gold tabular-nums">{fmtScout(priceBsd)} $SCOUT</div>
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onIpoBuy(p.id); }}
                      disabled={isBuying}
                      className="px-5 py-2.5 min-h-[44px] bg-gold/10 border border-gold/20 text-gold rounded-xl text-sm font-black hover:bg-gold/20 transition-colors active:scale-[0.95] disabled:opacity-50 flex items-center gap-2"
                    >
                      {isBuying ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('buy')}
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Phase 2: Demnächst */}
      {upcomingItems.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/50 uppercase tracking-wide mb-2">{t('upcoming')}</h3>
          <div className="space-y-1.5">
            {upcomingItems.map(({ player: p, ipo }) => (
              <Link
                key={ipo.id}
                href={`/player/${p.id}`}
                className="flex items-center gap-3 bg-surface-base border border-white/[0.06] rounded-xl px-3 py-2.5 hover:border-white/15 transition-colors"
              >
                <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />
                <div className="text-right flex-shrink-0">
                  <div className="text-[10px] text-white/40">{t('startsIn')}</div>
                  <Countdown targetDate={ipo.starts_at} className="text-sky-300" />
                </div>
                {ipo.price > 0 && (
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="font-mono font-bold text-xs text-gold tabular-nums">{fmtScout(centsToBsd(ipo.price))}</div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Phase 3: Beendet (letzte 7 Tage) */}
      {endedItems.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-white/30 uppercase tracking-wide mb-2">{t('ended')}</h3>
          <div className="space-y-1.5">
            {endedItems.map(({ player: p, ipo }) => {
              const hasTransferListing = p.listings.length > 0;
              const floor = p.prices.floor;

              return (
                <Link
                  key={ipo.id}
                  href={`/player/${p.id}`}
                  className="flex items-center gap-3 bg-surface-base/50 border border-white/[0.04] rounded-xl px-3 py-2.5 hover:border-white/10 transition-colors opacity-70 hover:opacity-90"
                >
                  <PlayerIdentity player={p} size="sm" showStatus={false} className="flex-1 min-w-0" />
                  <div className="text-right text-[10px] tabular-nums flex-shrink-0">
                    <div className="text-white/30">{t('soldProgress', { sold: ipo.sold, total: ipo.total_offered })}</div>
                    <div className="text-white/20">{getRelativeTime(ipo.ends_at, ta('justNow'))}</div>
                  </div>
                  {hasTransferListing && floor ? (
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <span className="text-[10px] text-sky-300/70">{t('transferListBadge')}</span>
                      <ArrowRight className="size-3 text-sky-300/50" aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="text-[10px] text-white/20 flex-shrink-0 ml-1">{t('notAvailableShort')}</div>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
