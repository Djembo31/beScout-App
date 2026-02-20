'use client';

import React from 'react';
import Link from 'next/link';
import {
  Users, ShoppingCart, Clock, Layers, History,
  ArrowRight, Shield, BadgeCheck, Loader2, MessageSquare,
} from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbOrder, DbTrade, OfferWithDetails } from '@/types';
import PriceChart from './PriceChart';
import OrderbookDepth from './OrderbookDepth';

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
}

export default function MarktTab({
  player, trades, allSellOrders, tradesLoading,
  profileMap, userId, dpcAvailable,
  openBids = [], holdingQty = 0,
  onAcceptBid, acceptingBidId, onOpenOfferModal,
}: MarktTabProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Price Chart */}
      <PriceChart trades={trades} ipoPrice={player.prices.ipoPrice ? Math.round(player.prices.ipoPrice * 100) : undefined} />

      {/* Orderbook Depth */}
      <OrderbookDepth orders={allSellOrders} />

      {/* Offers Section */}
      {userId && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-[#FFD700]/10 to-[#FFD700]/5 border-b border-[#FFD700]/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#FFD700]" />
                <span className="font-black">Angebote</span>
              </div>
              {onOpenOfferModal && (
                <button
                  onClick={onOpenOfferModal}
                  className="text-xs px-3 py-1.5 min-h-[36px] rounded-lg bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-colors font-medium"
                >
                  Kaufangebot machen
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {openBids.length > 0 ? (
              <div className="space-y-2">
                {openBids.map(bid => (
                  <div key={bid.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="text-sm">
                        <span className="text-white/60">@{bid.sender_handle}</span>
                        <span className="text-white/30 mx-2">&middot;</span>
                        <span className="font-mono text-xs text-white/40">{bid.quantity} DPC</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#FFD700]">{fmtScout(centsToBsd(bid.price))} $SCOUT</span>
                      {holdingQty > 0 && bid.sender_id !== userId && onAcceptBid && (
                        <button
                          onClick={() => onAcceptBid(bid.id)}
                          disabled={acceptingBidId === bid.id}
                          className="text-xs px-3 py-2 min-h-[44px] rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                        >
                          {acceptingBidId === bid.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Annehmen'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-white/30 text-sm">Keine offenen Gebote für diesen Spieler.</div>
            )}
          </div>
        </Card>
      )}

      {/* Listings */}
      {player.listings.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-white/50" />
              <span className="font-bold">Aktive Angebote</span>
            </div>
            <span className="text-xs text-white/40">{player.listings.length} Listings</span>
          </div>
          <div className="space-y-2">
            {player.listings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl border border-white/10 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center">
                    <span className="font-bold text-xs">Lv{listing.sellerLevel}</span>
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">
                      {listing.sellerName}
                      {listing.verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
                    </div>
                    <div className="text-[10px] text-white/40">{listing.qty || 1} DPC</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-[#FFD700]">{fmtScout(listing.price)}</div>
                  <div className="text-[10px] text-white/40 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {Math.floor((listing.expiresAt - Date.now()) / 3600000)}h
                  </div>
                </div>
                <div className="ml-3 px-2.5 py-1 rounded-lg bg-[#FFD700]/10 border border-[#FFD700]/20 text-[10px] font-bold text-[#FFD700]">Angebot</div>
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
              <Layers className="w-5 h-5 text-orange-300" />
              <span className="font-black">Transfermarkt (User-Angebote)</span>
            </div>
            <span className="text-xs text-white/40">{allSellOrders.length} Order{allSellOrders.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="p-4">
          {allSellOrders.length === 0 ? (
            <div className="text-center py-6 text-white/40 text-sm">Keine offenen User-Angebote</div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-[10px] text-white/40 px-3 pb-1 border-b border-white/5">
                <span>Preis</span>
                <span>Menge</span>
                <span>Gesamt</span>
                <span>Verkäufer</span>
              </div>
              {allSellOrders.map((order) => {
                const remaining = order.quantity - order.filled_qty;
                const isOwn = userId && order.user_id === userId;
                const sellerHandle = profileMap[order.user_id]?.handle;
                return (
                  <div key={order.id} className={`grid grid-cols-4 gap-2 items-center px-3 py-2 rounded-lg text-sm ${isOwn ? 'bg-[#FFD700]/5 border border-[#FFD700]/20' : 'bg-white/[0.02]'}`}>
                    <span className="font-mono font-bold text-[#FFD700]">{formatScout(order.price)}</span>
                    <span className="font-mono">{remaining} DPC</span>
                    <span className="font-mono text-white/60">{formatScout(order.price * remaining)}</span>
                    <span className="text-xs">
                      {isOwn
                        ? <span className="text-[#FFD700] font-bold">Du</span>
                        : sellerHandle
                          ? <Link href={`/profile/${sellerHandle}`} className="text-white/60 hover:text-[#FFD700] transition-colors">@{sellerHandle}</Link>
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
              <History className="w-5 h-5 text-sky-300" />
              <span className="font-black">Trade-Historie</span>
            </div>
            <span className="text-xs text-white/40">{trades.length} Trade{trades.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="p-4">
          {tradesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-white/30" />
            </div>
          ) : trades.length === 0 ? (
            <div className="text-center py-6 text-white/40 text-sm">Noch keine Trades für diesen Spieler</div>
          ) : (
            <div className="space-y-1">
              {trades.map((trade) => {
                const isIpoBuy = trade.ipo_id !== null || trade.seller_id === null;
                const isBuyer = userId && trade.buyer_id === userId;
                const isSeller = userId && trade.seller_id === userId;
                const buyerHandle = profileMap[trade.buyer_id]?.handle;
                const sellerHandle = trade.seller_id ? profileMap[trade.seller_id]?.handle : null;
                const tradeTime = (() => {
                  const d = new Date(trade.executed_at);
                  const diff = Date.now() - d.getTime();
                  if (diff < 60000) return 'gerade eben';
                  if (diff < 3600000) return `vor ${Math.floor(diff / 60000)}m`;
                  if (diff < 86400000) return `vor ${Math.floor(diff / 3600000)}h`;
                  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
                })();
                return (
                  <div key={trade.id} className={`px-3 py-2.5 rounded-lg text-sm ${isBuyer || isSeller ? 'bg-sky-500/5 border border-sky-500/10' : 'bg-white/[0.02]'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white/40 w-20">{tradeTime}</span>
                        {isIpoBuy ? (
                          <span className="px-1.5 py-0.5 rounded bg-[#22C55E]/20 text-[#22C55E] font-bold text-[10px]">IPO</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[10px]">Markt</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#FFD700]">{formatScout(trade.price)} $SCOUT</span>
                        <span className="text-white/40 font-mono text-xs">&times;{trade.quantity}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      {isBuyer
                        ? <span className="text-[#22C55E] font-bold">Du</span>
                        : buyerHandle
                          ? <Link href={`/profile/${buyerHandle}`} className="hover:text-[#FFD700] transition-colors">@{buyerHandle}</Link>
                          : <span>@{trade.buyer_id.slice(0, 8)}</span>
                      }
                      <ArrowRight className="w-3 h-3 text-white/30" />
                      <span className="text-white/30">kauft von</span>
                      <ArrowRight className="w-3 h-3 text-white/30" />
                      {isIpoBuy
                        ? <span className="text-[#22C55E]">Club (IPO)</span>
                        : isSeller
                          ? <span className="text-red-300 font-bold">Du</span>
                          : sellerHandle
                            ? <Link href={`/profile/${sellerHandle}`} className="hover:text-[#FFD700] transition-colors">@{sellerHandle}</Link>
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
            <Shield className="w-5 h-5 text-white/50" />
            <span className="font-black">Preis-Info</span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
              <div className="text-xs text-purple-300">Club IPO-Preis</div>
              <div className="font-mono font-bold text-purple-200">{fmtScout(player.prices.ipoPrice ?? 0)} $SCOUT</div>
              <div className="text-[10px] text-white/30 mt-0.5">Fest, vom Club gesetzt</div>
            </div>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
              <div className="text-xs text-sky-300">Markt Floor</div>
              <div className="font-mono font-bold text-[#FFD700]">{fmtScout(player.prices.floor ?? 0)} $SCOUT</div>
              <div className="text-[10px] text-white/30 mt-0.5">Günstigstes User-Angebot</div>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-xs text-white/40">Letzter Trade</div>
              <div className="font-mono font-bold">{fmtScout(player.prices.lastTrade ?? 0)} $SCOUT</div>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-xs text-white/40">24h Change</div>
              <div className={`font-mono font-bold ${player.prices.change24h >= 0 ? 'text-[#22C55E]' : 'text-red-300'}`}>
                {player.prices.change24h >= 0 ? '+' : ''}{player.prices.change24h.toFixed(1)}%
              </div>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-xs text-white/40">Club-Pool DPCs</div>
              <div className="font-mono font-bold">{dpcAvailable}</div>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3">
              <div className="text-xs text-white/40">Im Umlauf</div>
              <div className="font-mono font-bold">{player.dpc.circulation}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Top Owners */}
      {player.topOwners.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white/50" />
              <span className="font-bold">Top Besitzer</span>
            </div>
            <span className="text-xs text-white/40">{player.topOwners.length} Holder</span>
          </div>
          <div className="space-y-3">
            {player.topOwners.map((owner, i) => (
              <div key={owner.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-[#FFD700]/20 text-[#FFD700]' : i === 1 ? 'bg-white/10 text-white/70' : i === 2 ? 'bg-orange-500/20 text-orange-300' : 'bg-white/5 text-white/50'}`}>
                    #{i + 1}
                  </div>
                  <div>
                    <div className="font-bold text-sm flex items-center gap-1">
                      {owner.name}
                      {owner.verified && <BadgeCheck className="w-3 h-3 text-[#FFD700]" />}
                    </div>
                    <div className="text-[10px] text-white/40">Lv {owner.level}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm">{owner.owned}</div>
                  <div className="text-[10px] text-white/40">{owner.acceptance}% accept</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
