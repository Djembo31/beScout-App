'use client';

import { Modal } from '@/components/ui';
import TradingSidebar from './TradingSidebar';
import type { Player, DbIpo, DbOrder, OfferWithDetails } from '@/types';

interface TradingModalProps {
  open: boolean;
  onClose: () => void;
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
  onCancelOrder: (id: string) => void;
  onConfirmBuy: (qty: number) => void;
  onCancelPendingBuy: () => void;
  onShareTrade: () => void;
  onAcceptBid: (id: string) => void;
  onOpenOfferModal: () => void;
}

export default function TradingModal({
  open, onClose, player, activeIpo, userIpoPurchased,
  balanceCents, holdingQty, userOrders, allSellOrders, openBids,
  userId, buying, ipoBuying, selling, cancellingId,
  buyError, buySuccess, shared, pendingBuyQty,
  onBuy, onIpoBuy, onSell, onCancelOrder, onConfirmBuy,
  onCancelPendingBuy, onShareTrade, onAcceptBid, onOpenOfferModal,
}: TradingModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Trading" subtitle={`${player.first} ${player.last}`}>
      <div className="-mx-4 -mb-4 sm:-mx-6 sm:-mb-6">
        <TradingSidebar
          player={player}
          activeIpo={activeIpo}
          userIpoPurchased={userIpoPurchased}
          balanceCents={balanceCents}
          holdingQty={holdingQty}
          userOrders={userOrders}
          allSellOrders={allSellOrders}
          openBids={openBids}
          userId={userId}
          buying={buying}
          ipoBuying={ipoBuying}
          selling={selling}
          cancellingId={cancellingId}
          buyError={buyError}
          buySuccess={buySuccess}
          shared={shared}
          pendingBuyQty={pendingBuyQty}
          onBuy={onBuy}
          onIpoBuy={onIpoBuy}
          onSell={onSell}
          onCancelOrder={onCancelOrder}
          onConfirmBuy={onConfirmBuy}
          onCancelPendingBuy={onCancelPendingBuy}
          onShareTrade={onShareTrade}
          onAcceptBid={onAcceptBid}
          onOpenOfferModal={onOpenOfferModal}
        />
      </div>
    </Modal>
  );
}
