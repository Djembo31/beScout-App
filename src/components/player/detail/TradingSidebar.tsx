'use client';

import { Lock } from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtBSD } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo, DbOrder, OfferWithDetails } from '@/types';
import SponsorBanner from './SponsorBanner';
import {
  TradingToasts,
  BuyConfirmation,
  IPOBuySection,
  TransferBuySection,
  HoldingsSection,
} from './trading';

// ─── Props ──────────────────────────────────────

interface TradingSidebarProps {
  player: Player;
  activeIpo: DbIpo | null;
  userIpoPurchased: number;
  balanceCents: number | null;
  holdingQty: number;
  userOrders: DbOrder[];
  allSellOrders: DbOrder[];
  openBids: OfferWithDetails[];
  userId?: string;
  buying: boolean;
  ipoBuying: boolean;
  selling: boolean;
  cancellingId: string | null;
  buyError: string | null;
  buySuccess: string | null;
  shared: boolean;
  pendingBuyQty: number | null;
  onBuy: (qty: number) => void;
  onIpoBuy: (qty: number) => void;
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  onConfirmBuy: (qty: number) => void;
  onCancelPendingBuy: () => void;
  onShareTrade: () => void;
  onAcceptBid: (offerId: string) => void;
  onOpenOfferModal: () => void;
}

export default function TradingSidebar({
  player, activeIpo, userIpoPurchased, balanceCents,
  holdingQty, userOrders, allSellOrders, openBids, userId,
  buying, ipoBuying, selling, cancellingId,
  buyError, buySuccess, shared, pendingBuyQty,
  onBuy, onIpoBuy, onSell, onCancelOrder,
  onConfirmBuy, onCancelPendingBuy, onShareTrade,
  onAcceptBid, onOpenOfferModal,
}: TradingSidebarProps) {
  const isLiquidated = player.isLiquidated;
  const isIPO = activeIpo !== null && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  return (
    <div className="space-y-4 lg:sticky lg:top-4">
      {/* Liquidated state */}
      {isLiquidated && (
        <Card className="p-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-300 mb-2">
            <Lock className="w-4 h-4" />
            <span className="font-bold text-sm">Trading gesperrt</span>
          </div>
          <div className="text-xs text-white/50">Dieser Spieler wurde liquidiert. Kauf und Verkauf sind nicht mehr möglich.</div>
        </Card>
      )}

      {/* Toast Notifications */}
      <TradingToasts buySuccess={buySuccess} buyError={buyError} shared={shared} onShareTrade={onShareTrade} />

      {/* Buy Confirmation (own sell orders) */}
      {pendingBuyQty !== null && (
        <BuyConfirmation
          pendingBuyQty={pendingBuyQty}
          userOrders={userOrders}
          floorBsd={player.prices.floor ?? 0}
          balanceCents={balanceCents}
          buying={buying}
          onConfirmBuy={onConfirmBuy}
          onCancel={onCancelPendingBuy}
        />
      )}

      {/* IPO Buy Widget */}
      {!isLiquidated && isIPO && activeIpo && (
        <IPOBuySection
          ipo={activeIpo}
          userPurchased={userIpoPurchased}
          balanceCents={balanceCents}
          onBuy={onIpoBuy}
          buying={ipoBuying}
        />
      )}

      {/* Transfer Buy Widget */}
      {!isLiquidated && (
        <TransferBuySection
          player={player}
          balanceCents={balanceCents}
          holdingQty={holdingQty}
          sellOrderCount={allSellOrders.filter(o => userId && o.user_id !== userId).reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0)}
          onBuy={onBuy}
          buying={buying}
        />
      )}

      {/* Offers */}
      {!isLiquidated && userId && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">Angebote</span>
            <button
              onClick={onOpenOfferModal}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-colors font-medium"
            >
              Kaufangebot machen
            </button>
          </div>
          {openBids.length > 0 ? (
            <div className="space-y-2">
              <div className="text-xs text-white/40">Offene Gebote ({openBids.length})</div>
              {openBids.slice(0, 3).map(bid => (
                <div key={bid.id} className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className="text-sm">
                    <span className="text-white/60">@{bid.sender_handle}</span>
                    <span className="text-white/30 mx-2">&middot;</span>
                    <span className="font-mono font-bold text-[#FFD700]">{fmtBSD(centsToBsd(bid.price))} BSD</span>
                  </div>
                  {holdingQty > 0 && bid.sender_id !== userId && (
                    <button
                      onClick={() => onAcceptBid(bid.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                    >
                      Annehmen
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-white/30">Keine offenen Gebote für diesen Spieler.</div>
          )}
        </Card>
      )}

      {/* Your Holdings */}
      {!isLiquidated && (holdingQty > 0 || userOrders.length > 0) && (
        <HoldingsSection
          player={player}
          holdingQty={holdingQty}
          floorPriceCents={Math.round((player.prices.floor ?? 0) * 100)}
          userOrders={userOrders}
          onSell={onSell}
          onCancelOrder={onCancelOrder}
          selling={selling}
          cancellingId={cancellingId}
        />
      )}

      {/* Sponsor */}
      <SponsorBanner placement="player_footer" />
    </div>
  );
}
