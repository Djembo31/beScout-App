'use client';

import { useState, useMemo } from 'react';
import { Lock, ArrowRight } from 'lucide-react';
import { Modal, Card } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo, DbOrder } from '@/types';
import {
  TradingToasts,
  BuyConfirmation,
  IPOBuySection,
  TransferBuySection,
} from './trading';

type BuySource = 'ipo' | 'transfer';

interface BuyModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  activeIpo: DbIpo | null;
  userIpoPurchased: number;
  balanceCents: number | null;
  allSellOrders: DbOrder[];
  userOrders: DbOrder[];
  userId?: string;
  // Trading state
  buying: boolean;
  ipoBuying: boolean;
  buyError: string | null;
  buySuccess: string | null;
  shared: boolean;
  pendingBuyQty: number | null;
  // Handlers
  onBuy: (qty: number) => void;
  onIpoBuy: (qty: number) => void;
  onConfirmBuy: (qty: number) => void;
  onCancelPendingBuy: () => void;
  onShareTrade: () => void;
  onOpenOfferModal: () => void;
}

export default function BuyModal({
  open, onClose, player, activeIpo, userIpoPurchased,
  balanceCents, allSellOrders, userOrders, userId,
  buying, ipoBuying, buyError, buySuccess, shared,
  pendingBuyQty,
  onBuy, onIpoBuy, onConfirmBuy, onCancelPendingBuy,
  onShareTrade, onOpenOfferModal,
}: BuyModalProps) {
  const isLiquidated = player.isLiquidated;
  const isIPO = activeIpo !== null && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  const transferAvailable = useMemo(
    () => allSellOrders
      .filter(o => userId && o.user_id !== userId)
      .reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0),
    [allSellOrders, userId]
  );

  const defaultSource: BuySource = isIPO ? 'ipo' : 'transfer';
  const [source, setSource] = useState<BuySource>(defaultSource);

  // Sync default when IPO status changes
  const effectiveSource = isIPO && source === 'ipo' ? 'ipo'
    : !isIPO && source === 'ipo' ? 'transfer'
    : source;

  const holdingQty = 0; // Not needed for buy — TransferBuySection gets it from player

  // Alt source info
  const showSourceSwitch = isIPO && transferAvailable > 0;
  const floorBsd = player.prices.floor ?? 0;
  const ipoPriceBsd = activeIpo ? centsToBsd(activeIpo.price) : 0;

  return (
    <Modal open={open} onClose={onClose} title="Kaufen" subtitle={`${player.first} ${player.last}`}>
      <div className="-mx-4 -mb-4 sm:-mx-6 sm:-mb-6">
        <div className="space-y-4 p-4 sm:p-6">
          {/* Liquidated state */}
          {isLiquidated && (
            <Card className="p-4 border-red-500/20 bg-red-500/5">
              <div className="flex items-center gap-2 text-red-300 mb-2">
                <Lock className="w-4 h-4" />
                <span className="font-bold text-sm">Trading gesperrt</span>
              </div>
              <div className="text-xs text-white/50">Dieser Spieler wurde liquidiert. Kauf ist nicht mehr möglich.</div>
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

          {/* Smart Buy Section — one source at a time */}
          {!isLiquidated && pendingBuyQty === null && (
            <>
              {effectiveSource === 'ipo' && isIPO && activeIpo && (
                <IPOBuySection
                  ipo={activeIpo}
                  userPurchased={userIpoPurchased}
                  balanceCents={balanceCents}
                  onBuy={onIpoBuy}
                  buying={ipoBuying}
                />
              )}

              {effectiveSource === 'transfer' && (
                <TransferBuySection
                  player={player}
                  balanceCents={balanceCents}
                  holdingQty={0}
                  sellOrderCount={transferAvailable}
                  onBuy={onBuy}
                  buying={buying}
                />
              )}
            </>
          )}

          {/* Source Switch Link */}
          {!isLiquidated && showSourceSwitch && pendingBuyQty === null && (
            <button
              onClick={() => setSource(effectiveSource === 'ipo' ? 'transfer' : 'ipo')}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-white/40 hover:text-[#FFD700] transition-colors cursor-pointer"
            >
              <ArrowRight className="w-3 h-3" />
              {effectiveSource === 'ipo'
                ? `Auch verfügbar: Transfermarkt ab ${fmtScout(floorBsd)} $SCOUT`
                : `Auch verfügbar: Club IPO für ${fmtScout(ipoPriceBsd)} $SCOUT`
              }
            </button>
          )}

          {/* Offer hint */}
          {!isLiquidated && userId && transferAvailable === 0 && !isIPO && (
            <div className="text-center py-2">
              <div className="text-xs text-white/30 mb-2">Keine Angebote auf dem Markt?</div>
              <button
                onClick={onOpenOfferModal}
                className="text-xs px-4 py-2 min-h-[44px] rounded-xl bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-colors font-medium"
              >
                Kaufangebot machen
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
