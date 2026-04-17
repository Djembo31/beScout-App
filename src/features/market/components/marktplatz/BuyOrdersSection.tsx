'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, ShoppingCart, Clock, Trash2 } from 'lucide-react';
import { PlayerIdentity } from '@/components/player';
import { EmptyState } from '@/components/ui';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useCancelBuyOrder } from '@/lib/mutations/trading';
import { useUser } from '@/components/providers/AuthProvider';
import type { Player, PublicOrder } from '@/types';

interface BuyOrdersSectionProps {
  buyOrders: PublicOrder[];
  playerMap: Map<string, Player>;
}

type BuyOrderAgg = {
  playerId: string;
  highestBid: number; // cents
  totalQty: number;
  orderCount: number;
  // Track user's own orders for cancel
  userOrders: { id: string; price: number; qty: number; filled: number; expiresAt: number }[];
};

export default function BuyOrdersSection({ buyOrders, playerMap }: BuyOrdersSectionProps) {
  const t = useTranslations('market');
  const { user } = useUser();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const cancelMut = useCancelBuyOrder();

  // Aggregate buy orders by player
  const listings = useMemo(() => {
    const grouped = new Map<string, BuyOrderAgg>();
    for (const order of buyOrders) {
      if (order.status !== 'open' && order.status !== 'partial') continue;
      if (order.side !== 'buy') continue;
      const available = order.quantity - order.filled_qty;
      if (available <= 0) continue;

      const existing = grouped.get(order.player_id);
      const userOrder = order.is_own ? {
        id: order.id,
        price: order.price,
        qty: available,
        filled: order.filled_qty,
        expiresAt: order.expires_at ? new Date(order.expires_at).getTime() : 0,
      } : null;

      if (!existing) {
        grouped.set(order.player_id, {
          playerId: order.player_id,
          highestBid: order.price,
          totalQty: available,
          orderCount: 1,
          userOrders: userOrder ? [userOrder] : [],
        });
      } else {
        existing.orderCount++;
        existing.totalQty += available;
        if (order.price > existing.highestBid) existing.highestBid = order.price;
        if (userOrder) existing.userOrders.push(userOrder);
      }
    }
    return grouped;
  }, [buyOrders]);

  // Sort by highest bid descending
  const sortedPlayerIds = useMemo(() => {
    return Array.from(listings.entries())
      .sort((a, b) => b[1].highestBid - a[1].highestBid)
      .map(([pid]) => pid);
  }, [listings]);

  const handleCancel = (orderId: string) => {
    if (!user) return;
    setCancellingId(orderId);
    cancelMut.mutate(
      { userId: user.id, orderId },
      {
        onSettled: () => setCancellingId(null),
      }
    );
  };

  if (sortedPlayerIds.length === 0) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="size-3.5 text-sky-400/70" aria-hidden="true" />
          <h3 className="text-sm font-bold text-white/70">{t('openBuyOrders')}</h3>
        </div>
        <EmptyState
          icon="search"
          title={t('noBuyOrders')}
          description={t('noBuyOrdersDesc')}
        />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="size-3.5 text-sky-400/70" aria-hidden="true" />
        <h3 className="text-sm font-bold text-white/70">{t('openBuyOrders')}</h3>
      </div>
      <div className="space-y-2">
        {sortedPlayerIds.map(pid => {
          const agg = listings.get(pid);
          if (!agg) return null;
          const player = playerMap.get(pid);
          const highBidBsd = centsToBsd(agg.highestBid);

          return (
            <div key={pid} className="bg-surface-base border border-white/[0.08] rounded-xl overflow-hidden">
              <Link
                href={`/player/${pid}`}
                className="flex items-center gap-3 px-3 py-3 hover:border-white/15 transition-colors group"
              >
                {/* Player identity */}
                {player ? (
                  <PlayerIdentity player={player} size="sm" className="flex-1 min-w-0" />
                ) : (
                  <span className="flex-1 text-sm text-white/40 font-mono">{pid.slice(0, 8)}...</span>
                )}

                {/* Bid info */}
                <div className="text-right flex-shrink-0 min-w-[80px]">
                  <div className="text-[9px] text-white/30">{t('highestBid')}</div>
                  <div className="font-mono font-black text-sm text-sky-400 tabular-nums">{fmtScout(highBidBsd)}</div>
                  <div className="text-[10px] text-white/30 tabular-nums">
                    {agg.totalQty} SC · {agg.orderCount === 1 ? t('offerSingular', { count: agg.orderCount }) : t('offerPlural', { count: agg.orderCount })}
                  </div>
                </div>
              </Link>

              {/* User's own buy orders — show inline for easy cancel */}
              {agg.userOrders.length > 0 && (
                <div className="border-t border-divider px-3 py-2 space-y-1">
                  {agg.userOrders.map(uo => {
                    const daysLeft = Math.max(0, Math.floor((uo.expiresAt - Date.now()) / 86_400_000));
                    const hoursLeft = Math.max(0, Math.floor((uo.expiresAt - Date.now()) / 3_600_000));
                    const isExpiringSoon = daysLeft < 3;
                    return (
                      <div key={uo.id} className="flex items-center justify-between">
                        <div className="text-[10px] text-white/50">
                          <span className="text-sky-400/60 font-bold mr-1">{t('buyOrderYours')}</span>
                          <span className="font-mono tabular-nums">{uo.qty}× {fmtScout(centsToBsd(uo.price))} CR</span>
                          {uo.expiresAt > 0 && (
                            <span className={cn('inline-flex items-center gap-0.5 text-[10px] ml-2 font-mono tabular-nums', isExpiringSoon ? 'text-amber-400/70' : 'text-white/25')}>
                              <Clock className="size-2.5" aria-hidden="true" />
                              {daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleCancel(uo.id)}
                          disabled={cancellingId === uo.id}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                        >
                          {cancellingId === uo.id ? (
                            <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                          ) : (
                            <Trash2 className="size-3" aria-hidden="true" />
                          )}
                          {t('cancelBuyOrder')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
