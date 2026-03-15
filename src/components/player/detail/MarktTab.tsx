'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  Users, ShoppingCart, Clock, Layers, History,
  ArrowRight, Shield, ShieldAlert, BadgeCheck, Loader2, MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbOrder, DbTrade, OfferWithDetails, ResearchPostWithAuthor } from '@/types';
import PriceChart from './PriceChart';
import OrderbookDepth from './OrderbookDepth';
import ScoutConsensus from './ScoutConsensus';

interface MarktTabProps {
  player: Player;
  trades: DbTrade[];
  allSellOrders: DbOrder[];
  tradesLoading: boolean;
  profileMap: Record<string, { handle: string; display_name: string | null }>;
  userId?: string;
  dpcAvailable: number;
  // Offers
  openBids?: OfferWithDetails[];
  holdingQty?: number;
  onAcceptBid?: (offerId: string) => void;
  acceptingBidId?: string | null;
  onOpenOfferModal?: () => void;
  isRestrictedAdmin?: boolean;
  playerResearch?: ResearchPostWithAuthor[];
}

export default function MarktTab({
  player, trades, allSellOrders, tradesLoading,
  profileMap, userId, dpcAvailable,
  openBids = [], holdingQty = 0,
  onAcceptBid, acceptingBidId, onOpenOfferModal,
  isRestrictedAdmin, playerResearch = [],
}: MarktTabProps) {
  const t = useTranslations('playerDetail');
  const locale = useLocale();

  const formatTradeTime = (executedAt: string) => {
    const d = new Date(executedAt);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return t('justNow');
    if (diff < 3600000) return t('minutesAgo', { count: Math.floor(diff / 60000) });
    if (diff < 86400000) return t('hoursAgo', { count: Math.floor(diff / 3600000) });
    return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Club Admin Trading Restriction Notice */}
      {isRestrictedAdmin && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <ShieldAlert className="size-5 text-red-400 shrink-0" aria-hidden="true" />
          <p className="text-sm text-red-300 text-pretty">
            {t('adminTradeRestriction')}
          </p>
        </div>
      )}

      {/* Price Chart */}
      <PriceChart trades={trades} ipoPrice={player.prices.ipoPrice ? Math.round(player.prices.ipoPrice * 100) : undefined} />

      {/* Orderbook Depth */}
      <OrderbookDepth orders={allSellOrders} />

      {/* Scout Consensus (research-based signal) */}
      {playerResearch.length > 0 && (
        <ScoutConsensus research={playerResearch} />
      )}

      {/* Offers Section */}
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
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <span className="text-white/60">@{bid.sender_handle}</span>
                        <span className="text-white/30 mx-2">&middot;</span>
                        <span className="font-mono tabular-nums text-xs text-white/40">{bid.quantity} DPC</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(centsToBsd(bid.price))} $SCOUT</span>
                      {holdingQty > 0 && bid.sender_id !== userId && onAcceptBid && (
                        <button
                          onClick={() => onAcceptBid(bid.id)}
                          disabled={acceptingBidId === bid.id}
                          className="text-xs px-3 py-2 min-h-[44px] rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          {acceptingBidId === bid.id ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('accept')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-white/25 text-sm">
                <ShoppingCart className="size-5 mx-auto mb-1.5 text-white/15" aria-hidden="true" />
                {t('noOpenBids')}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Listings */}
      {player.listings.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
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
                  <div className="size-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <span className="font-bold text-xs">Lv{listing.sellerLevel}</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">
                      {listing.sellerName}
                      {listing.verified && <BadgeCheck className="size-3 text-gold" aria-hidden="true" />}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono tabular-nums">{listing.qty || 1} DPC</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold tabular-nums text-gold">{fmtScout(listing.price)}</div>
                  {listing.expiresAt > 0 && (
                    <div className="text-[10px] text-white/40 flex items-center gap-1">
                      <Clock className="size-2.5" aria-hidden="true" />
                      {Math.max(0, Math.floor((listing.expiresAt - Date.now()) / 3_600_000))}h
                    </div>
                  )}
                </div>
                <div className="ml-3 px-2.5 py-1 rounded-lg bg-gold/10 border border-gold/20 text-[10px] font-bold text-gold">{t('offer')}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Order Book (Transfermarkt) */}
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
          {allSellOrders.length === 0 ? (
            <div className="text-center py-6 text-white/25 text-sm">
              <Layers className="size-5 mx-auto mb-1.5 text-white/15" aria-hidden="true" />
              {t('noUserOffers')}
            </div>
          ) : (
            <div className="space-y-2">
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
                  <div key={order.id} className={`grid grid-cols-4 gap-2 items-center px-3 py-2 rounded-lg text-sm transition-colors ${isOwn ? 'bg-gold/5 border border-gold/20' : 'bg-surface-base hover:bg-white/[0.04]'}`}>
                    <span className="font-mono font-bold tabular-nums text-gold">{formatScout(order.price)}</span>
                    <span className="font-mono tabular-nums">{remaining} DPC</span>
                    <span className="font-mono tabular-nums text-white/60">{formatScout(order.price * remaining)}</span>
                    <span className="text-xs">
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
          )}
        </div>
      </Card>

      {/* Trade History */}
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
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="size-6 animate-spin motion-reduce:animate-none text-white/30" aria-hidden="true" />
              <span className="text-xs text-white/20">{t('tradesLoading')}</span>
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-6 text-white/25 text-sm">
              <History className="size-5 mx-auto mb-1.5 text-white/15" aria-hidden="true" />
              {t('noTrades')}
            </div>
          ) : (
            <div className="space-y-1">
              {trades.map((trade) => {
                const isIpoBuy = trade.ipo_id !== null || trade.seller_id === null;
                const isBuyer = userId && trade.buyer_id === userId;
                const isSeller = userId && trade.seller_id === userId;
                const buyerHandle = profileMap[trade.buyer_id]?.handle;
                const sellerHandle = trade.seller_id ? profileMap[trade.seller_id]?.handle : null;
                const tradeTime = formatTradeTime(trade.executed_at);
                return (
                  <div key={trade.id} className={`px-3 py-2.5 rounded-lg text-sm ${isBuyer || isSeller ? 'bg-sky-500/5 border border-sky-500/10' : 'bg-surface-base'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-20">{tradeTime}</span>
                        {isIpoBuy ? (
                          <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-bold text-[10px]">Club</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px]">{t('market')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold tabular-nums text-gold">{formatScout(trade.price)} $SCOUT</span>
                        <span className="text-white/40 font-mono tabular-nums text-xs">&times;{trade.quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      {isBuyer
                        ? <span className="text-green-500 font-bold">{t('you')}</span>
                        : buyerHandle
                          ? <Link href={`/profile/${buyerHandle}`} className="hover:text-gold transition-colors">@{buyerHandle}</Link>
                          : <span>@{trade.buyer_id.slice(0, 8)}</span>
                      }
                      <ArrowRight className="size-3 text-white/30" aria-hidden="true" />
                      <span className="text-white/30">{t('buysFrom')}</span>
                      <ArrowRight className="size-3 text-white/30" aria-hidden="true" />
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
      </Card>

      {/* Price Info */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-white/10 to-white/5 border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-white/50" aria-hidden="true" />
            <span className="font-black">{t('priceInfo')}</span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gold/[0.08] border border-gold/20 rounded-xl p-3">
              <div className="text-xs text-gold/70">{t('clubPrice')}</div>
              <div className="font-mono font-bold tabular-nums text-gold">{fmtScout(player.prices.ipoPrice ?? 0)} $SCOUT</div>
              <div className="text-[10px] text-white/30 mt-0.5">{t('fixedByClub')}</div>
            </div>
            <div className="bg-green-500/[0.08] border border-green-500/20 rounded-xl p-3">
              <div className="text-xs text-green-400/80">{t('marketFloor')}</div>
              <div className="font-mono font-bold tabular-nums text-green-400">{fmtScout(player.prices.floor ?? 0)} $SCOUT</div>
              <div className="text-[10px] text-white/30 mt-0.5">{t('cheapestUserOffer')}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="text-xs text-white/40">{t('lastTrade')}</div>
              <div className="font-mono font-bold tabular-nums">{fmtScout(player.prices.lastTrade ?? 0)} $SCOUT</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="text-xs text-white/40">{t('change24h')}</div>
              <div className={`font-mono font-bold tabular-nums ${player.prices.change24h >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                {player.prices.change24h >= 0 ? '+' : ''}{player.prices.change24h.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="text-xs text-white/40">{t('clubPoolDpc')}</div>
              <div className="font-mono font-bold tabular-nums">{dpcAvailable}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <div className="text-xs text-white/40">{t('inCirculation')}</div>
              <div className="font-mono font-bold tabular-nums">{player.dpc.circulation}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Owners */}
      {player.topOwners.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-white/50" aria-hidden="true" />
              <span className="font-bold">{t('topOwners')}</span>
            </div>
            <span className="text-xs text-white/40">{t('holderCount', { count: player.topOwners.length })}</span>
          </div>
          <div className="space-y-3">
            {player.topOwners.map((owner, i) => (
              <div key={owner.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`size-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-gold/20 text-gold' : i === 1 ? 'bg-white/10 text-white/70' : i === 2 ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-white/50'}`}>
                    #{i + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">
                      {owner.name}
                      {owner.verified && <BadgeCheck className="size-3 text-gold" aria-hidden="true" />}
                    </div>
                    <div className="text-[10px] text-white/40">Lv {owner.level}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold tabular-nums text-sm">{owner.owned}</div>
                  <div className="text-[10px] text-white/40 tabular-nums">{owner.acceptance}% accept</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
