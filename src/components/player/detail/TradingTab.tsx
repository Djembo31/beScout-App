'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  ChevronDown, Trophy, ShoppingCart, History, Users,
  Layers, ArrowRight, ShieldAlert, BadgeCheck, Loader2,
  MessageSquare, Clock,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import PriceChart from './PriceChart';
import TradingQuickStats from './TradingQuickStats';
import YourPosition from './YourPosition';
import OrderbookSummary from './OrderbookSummary';
import ScoutConsensus from './ScoutConsensus';
import RewardsTab from './RewardsTab';
import type { Player, DbOrder, DbTrade, OfferWithDetails, ResearchPostWithAuthor } from '@/types';

interface TradingTabProps {
  player: Player;
  trades: DbTrade[];
  allSellOrders: DbOrder[];
  tradesLoading: boolean;
  profileMap: Record<string, { handle: string; display_name: string | null }>;
  userId?: string;
  dpcAvailable: number;
  openBids: OfferWithDetails[];
  holdingQty: number;
  holderCount: number;
  mastery?: { level: number; xp: number } | null;
  onAcceptBid?: (offerId: string) => void;
  acceptingBidId?: string | null;
  onOpenOfferModal?: () => void;
  isRestrictedAdmin: boolean;
  playerResearch: ResearchPostWithAuthor[];
}

export default function TradingTab({
  player, trades, allSellOrders, tradesLoading,
  profileMap, userId, dpcAvailable,
  openBids, holdingQty, holderCount, mastery,
  onAcceptBid, acceptingBidId, onOpenOfferModal,
  isRestrictedAdmin, playerResearch,
}: TradingTabProps) {
  const t = useTranslations('playerDetail');
  const tm = useTranslations('market');
  const locale = useLocale();
  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const formatTradeTime = (executedAt: string) => {
    const d = new Date(executedAt);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return t('minutesAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('hoursAgo', { count: Math.floor(diff / 3600000) });
    return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Show max 5 trades initially, expand for all
  const visibleTrades = historyExpanded ? trades : trades.slice(0, 5);

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Admin Restriction ── */}
      {isRestrictedAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <ShieldAlert className="size-5 text-red-400 shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-300 text-pretty">{t('adminTradeRestriction')}</p>
        </div>
      )}

      {/* ── 1. Price Chart (with time ranges + crosshair) ── */}
      <PriceChart
        trades={trades}
        ipoPrice={player.prices.ipoPrice ? Math.round(player.prices.ipoPrice * 100) : undefined}
      />

      {/* ── 2. Quick Stats: Floor, Spread, 7d Volume, Holders ── */}
      <TradingQuickStats
        floorPrice={player.prices.floor ?? 0}
        bestBid={openBids.length > 0 ? Math.max(...openBids.map(b => b.price)) : null}
        trades={trades}
        holderCount={holderCount}
      />

      {/* ── 3. Your Position + P&L (only when holding) ── */}
      {userId && (
        <YourPosition
          holdingQty={holdingQty}
          floorPrice={player.prices.floor ?? 0}
          trades={trades}
          userId={userId}
          mastery={mastery}
        />
      )}

      {/* ── 4. Orderbook Summary (condensed + expandable depth) ── */}
      <OrderbookSummary sellOrders={allSellOrders} bids={openBids} />

      {/* ── 4b. Letzter Preis + Wertentwicklung ── */}
      {(player.prices.lastTrade > 0 || player.prices.initialListingPrice) && (
        <div className="flex items-center justify-between px-1">
          {player.prices.lastTrade > 0 && (
            <div className="text-xs text-white/40">
              {tm('letzterPreis')}: <span className="font-mono text-white/60">{fmtScout(player.prices.lastTrade)}</span>
            </div>
          )}
          {player.prices.initialListingPrice != null && player.prices.initialListingPrice > 0 && (() => {
            const current = player.prices.floor ?? player.prices.lastTrade ?? player.prices.referencePrice ?? 0;
            const initial = player.prices.initialListingPrice;
            const pctChange = initial > 0 ? ((current - initial) / initial * 100) : 0;
            return (
              <div className="text-xs text-white/40">
                {tm('markteintritt')}: {fmtScout(initial)}
                <span className={cn('ml-1 font-mono', pctChange >= 0 ? 'text-green-500' : 'text-red-400')}>
                  {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(0)}%
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── 5. Offers (P2P bids) ── */}
      {userId && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-gold/10 to-gold/5 border-b border-gold/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-5 text-gold" aria-hidden="true" />
                <span className="font-black">{t('offers')}</span>
              </div>
              {onOpenOfferModal && (
                <button
                  onClick={onOpenOfferModal}
                  className="text-xs px-3 py-1.5 min-h-[44px] rounded-lg bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors font-medium"
                >
                  {t('makeOffer')}
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {openBids.length > 0 ? (
              <div className="space-y-2">
                {openBids.map(bid => (
                  <div key={bid.id} className="flex items-center justify-between p-3 bg-surface-base rounded-xl border border-white/10">
                    <div className="text-sm">
                      <span className="text-white/60">@{bid.sender_handle}</span>
                      <span className="text-white/30 mx-2">&middot;</span>
                      <span className="font-mono tabular-nums text-xs text-white/40">{bid.quantity} SC</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(centsToBsd(bid.price))} CR</span>
                      {holdingQty > 0 && bid.sender_id !== userId && onAcceptBid && (
                        <button
                          onClick={() => onAcceptBid(bid.id)}
                          disabled={acceptingBidId === bid.id}
                          className="text-xs px-3 py-2 min-h-[44px] rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          {acceptingBidId === bid.id
                            ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                            : t('accept')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-white/25 text-sm">
                <ShoppingCart className="size-5 mx-auto mb-1.5 text-white/15" aria-hidden="true" />
                {t('noOpenBids')}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── 6. Sell Listings ── */}
      {player.listings.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-white/50" aria-hidden="true" />
              <span className="font-bold">{t('activeOffers')}</span>
            </div>
            <span className="text-xs text-white/40">{t('listingsCount', { count: player.listings.length })}</span>
          </div>
          <div className="space-y-2">
            {player.listings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between p-3 bg-surface-base rounded-xl border border-white/10 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center">
                    <span className="font-bold text-[10px]">Lv{listing.sellerLevel}</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">
                      {listing.sellerName}
                      {listing.verified && <BadgeCheck className="size-3 text-gold" aria-hidden="true" />}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono tabular-nums">{listing.qty || 1} SC</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-mono font-bold tabular-nums text-gold">{fmtScout(listing.price)}</div>
                    {listing.expiresAt > 0 && (
                      <div className="text-[10px] text-white/40 flex items-center gap-1 justify-end">
                        <Clock className="size-2.5" aria-hidden="true" />
                        {Math.max(0, Math.floor((listing.expiresAt - Date.now()) / 3_600_000))}h
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── 7. Order Book (full table, replaces duplicate) ── */}
      {allSellOrders.length > 0 && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500/10 to-orange-500/5 border-b border-orange-500/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="size-5 text-orange-300" aria-hidden="true" />
                <span className="font-black">{t('transferMarketOrders')}</span>
              </div>
              <span className="text-xs text-white/40">
                {allSellOrders.length !== 1
                  ? t('ordersCountPlural', { count: allSellOrders.length })
                  : t('ordersCount', { count: allSellOrders.length })}
              </span>
            </div>
          </div>
          <div className="p-4">
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 text-[10px] text-white/40 px-3 pb-1 border-b border-white/5">
                <span>{t('price')}</span>
                <span>{t('quantity')}</span>
                <span>{t('total')}</span>
                <span>{t('seller')}</span>
              </div>
              {allSellOrders.map((order) => {
                const remaining = order.quantity - order.filled_qty;
                const isOwn = userId && order.user_id === userId;
                const sellerHandle = profileMap[order.user_id]?.handle;
                return (
                  <div key={order.id} className={cn(
                    'grid grid-cols-4 gap-2 items-center px-3 py-2 rounded-lg text-sm transition-colors',
                    isOwn ? 'bg-gold/5 border border-gold/20' : 'bg-surface-base hover:bg-white/[0.04]'
                  )}>
                    <span className="font-mono font-bold tabular-nums text-gold">{formatScout(order.price)}</span>
                    <span className="font-mono tabular-nums">{remaining} SC</span>
                    <span className="font-mono tabular-nums text-white/60">{formatScout(order.price * remaining)}</span>
                    <span className="text-xs truncate">
                      {isOwn
                        ? <span className="text-gold font-bold">{t('you')}</span>
                        : sellerHandle
                          ? <Link href={`/profile/${sellerHandle}`} className="text-white/60 hover:text-gold transition-colors">@{sellerHandle}</Link>
                          : <span className="text-white/60">@{order.user_id.slice(0, 8)}</span>
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ── 8. Scout Consensus ── */}
      {playerResearch.length > 0 && (
        <ScoutConsensus research={playerResearch} />
      )}

      {/* ── 9. Trade History (collapsed, show 5, expand for all) ── */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-sky-500/10 to-sky-500/5 border-b border-sky-500/20 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="size-5 text-sky-300" aria-hidden="true" />
              <span className="font-black">{t('tradeHistory')}</span>
            </div>
            <span className="text-xs text-white/40">
              {trades.length !== 1
                ? t('tradesCountPlural', { count: trades.length })
                : t('tradesCount', { count: trades.length })}
            </span>
          </div>
        </div>
        <div className="p-4">
          {tradesLoading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="size-5 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
              <span className="text-xs text-white/20">{t('tradesLoading')}</span>
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-4 text-white/25 text-sm">
              <History className="size-5 mx-auto mb-1.5 text-white/15" aria-hidden="true" />
              {t('noTrades')}
            </div>
          ) : (
            <div className="space-y-1">
              {visibleTrades.map((trade) => {
                const isIpoBuy = trade.ipo_id !== null || trade.seller_id === null;
                const isBuyer = userId && trade.buyer_id === userId;
                const isSeller = userId && trade.seller_id === userId;
                const buyerHandle = profileMap[trade.buyer_id]?.handle;
                const sellerHandle = trade.seller_id ? profileMap[trade.seller_id]?.handle : null;
                return (
                  <div key={trade.id} className={cn(
                    'px-3 py-2 rounded-lg text-sm',
                    (isBuyer || isSeller) ? 'bg-sky-500/5 border border-sky-500/10' : 'bg-surface-base'
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-white/40 w-16 shrink-0">{formatTradeTime(trade.executed_at)}</span>
                        {isIpoBuy ? (
                          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-bold text-[9px]">Club</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[9px]">{t('market')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tabular-nums text-gold text-sm">{formatScout(trade.price)} CR</span>
                        <span className="text-white/40 font-mono tabular-nums text-[10px]">&times;{trade.quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/40 mt-0.5">
                      {isBuyer
                        ? <span className="text-green-500 font-bold">{t('you')}</span>
                        : buyerHandle
                          ? <Link href={`/profile/${buyerHandle}`} className="hover:text-gold transition-colors">@{buyerHandle}</Link>
                          : <span>@{trade.buyer_id.slice(0, 8)}</span>
                      }
                      <ArrowRight className="size-2.5 text-white/20" aria-hidden="true" />
                      {isIpoBuy
                        ? <span className="text-green-500">Club</span>
                        : isSeller
                          ? <span className="text-red-300 font-bold">{t('you')}</span>
                          : sellerHandle
                            ? <Link href={`/profile/${sellerHandle}`} className="hover:text-gold transition-colors">@{sellerHandle}</Link>
                            : <span>@{trade.seller_id?.slice(0, 8)}</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* Show more/less */}
        {trades.length > 5 && (
          <div className="border-t border-white/[0.06]">
            <button
              onClick={() => setHistoryExpanded(v => !v)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              {historyExpanded ? t('showLess') : t('showAllTrades', { count: trades.length })}
              <ChevronDown className={cn('size-3.5 transition-transform', historyExpanded && 'rotate-180')} />
            </button>
          </div>
        )}
      </Card>

      {/* ── 10. Top Owners ── */}
      {player.topOwners.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-white/50" aria-hidden="true" />
              <span className="font-bold">{t('topOwners')}</span>
            </div>
            <span className="text-xs text-white/40">{t('holderCount', { count: player.topOwners.length })}</span>
          </div>
          <div className="space-y-2">
            {player.topOwners.map((owner, i) => (
              <div key={owner.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    'size-6 rounded-lg flex items-center justify-center text-[10px] font-bold',
                    i === 0 ? 'bg-gold/20 text-gold' : i === 1 ? 'bg-white/10 text-white/70' : i === 2 ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-white/50'
                  )}>
                    #{i + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">
                      {owner.name}
                      {owner.verified && <BadgeCheck className="size-3 text-gold" aria-hidden="true" />}
                    </div>
                  </div>
                </div>
                <div className="font-mono font-bold tabular-nums text-sm">{owner.owned} SC</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── 11. Rewards Accordion ── */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={() => setRewardsOpen(v => !v)}
          aria-expanded={rewardsOpen}
          className="w-full flex justify-between items-center p-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-green-500" aria-hidden="true" />
            <span className="font-bold text-sm">{t('rewardTiers')}</span>
          </div>
          <ChevronDown className={cn(
            'size-4 text-white/40 transition-transform duration-200',
            rewardsOpen && 'rotate-180'
          )} />
        </button>
        {rewardsOpen && (
          <div className="border-t border-white/[0.06]">
            <RewardsTab player={player} holdingQty={holdingQty} />
          </div>
        )}
      </div>

      {/* ── Compliance (bottom, not intrusive) ── */}
      <TradingDisclaimer variant="card" />
    </div>
  );
}
