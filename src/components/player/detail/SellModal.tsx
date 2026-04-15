'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Briefcase, Loader2, Zap } from 'lucide-react';
import { Card } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbOrder, OfferWithDetails } from '@/types';
import { SellModalCore } from '@/components/trading/SellModalCore';

interface SellModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  holdingQty: number;
  lockedQty?: number;
  userOrders: DbOrder[];
  openBids?: OfferWithDetails[];
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  onAcceptBid?: (offerId: string) => void;
  acceptingBidId?: string | null;
  selling: boolean;
  cancellingId: string | null;
  sellError?: string | null;
}

/**
 * Player-Detail Sell Modal — thin wrapper around SellModalCore.
 *
 * Adds player-detail-specific UI:
 *   - Position Card (holdings / share / available / listed / locked)
 *   - Orientation Bar (referenzwert + hoechstes gesuch)
 *   - Accept-Bid Zap section (sofort verkaufen)
 *   - Active Listings with cancel
 *
 * Core owns: form, fee breakdown, preventClose, disclaimer, error/success rendering.
 */
export default function SellModal({
  open, onClose, player, holdingQty, lockedQty = 0, userOrders,
  openBids = [], onSell, onCancelOrder,
  onAcceptBid, acceptingBidId,
  selling, cancellingId,
  sellError,
}: SellModalProps) {
  const t = useTranslations('playerDetail');
  const tm = useTranslations('market');

  const circulation = player.dpc.circulation || 1;
  const share = holdingQty / circulation;
  const listedQty = userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
  const availableToSell = Math.max(0, holdingQty - listedQty - lockedQty);
  const floorBsd = player.prices.floor ?? 0;

  // Position Info Card — shown as headerSlot above the form
  const positionCard = (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-green-500/20 to-green-500/5 border-b border-green-500/20 p-4">
        <div className="flex items-center gap-2">
          <Briefcase className="size-5 text-green-500" aria-hidden="true" />
          <span className="font-black text-green-500">{t('yourPosition')}</span>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">{t('dpcOwned')}</span>
          <span className="font-mono font-bold tabular-nums text-lg">{holdingQty} SC</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">{t('floatShare')}</span>
          <span className="font-mono font-bold tabular-nums">{(share * 100).toFixed(2)}%</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/50">{t('available')}</span>
          <span className="font-mono font-bold tabular-nums text-green-500">{availableToSell} SC</span>
        </div>
        {listedQty > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">{t('listed')}</span>
            <span className="font-mono font-bold tabular-nums text-orange-300">{listedQty} SC</span>
          </div>
        )}
        {lockedQty > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">{t('lockedInEvents')}</span>
            <span className="font-mono font-bold tabular-nums text-purple-300">{lockedQty} SC</span>
          </div>
        )}
      </div>
    </Card>
  );

  // Orientation Bar + Accept Bids + nothing else — shown before the form
  const beforeForm = (
    <>
      {/* Orientation: Referenzwert + Hoechstes Gesuch */}
      {availableToSell > 0 && !player.isLiquidated && (
        <div className="flex items-center gap-3 text-xs">
          {player.prices.referencePrice != null && player.prices.referencePrice > 0 && (
            <div className="flex-1 bg-white/[0.03] border border-divider rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] text-white/30">{tm('referenzwert')}</div>
              <div className="font-mono font-bold text-white/60 tabular-nums">
                {fmtScout(player.prices.referencePrice)}
              </div>
            </div>
          )}
          {openBids.length > 0 && (
            <div className="flex-1 bg-green-500/[0.06] border border-green-500/20 rounded-xl px-3 py-2 text-center">
              <div className="text-[10px] text-white/30">{tm('hoechstesGesuch')}</div>
              <div className="font-mono font-bold text-green-500 tabular-nums">
                {fmtScout(centsToBsd(Math.max(...openBids.map(b => b.price))))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sofort verkaufen — accept open buy orders */}
      {availableToSell > 0 && !player.isLiquidated && openBids.length > 0 && onAcceptBid && (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 bg-green-500/[0.04] border-b border-green-500/20">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-green-500" aria-hidden="true" />
              <span className="font-black text-sm text-green-500">{tm('sofortVerkaufen')}</span>
              <span className="text-[10px] text-white/30">{tm('kaufgesuche')} ({openBids.length})</span>
            </div>
          </div>
          <div className="p-3 space-y-1.5">
            {openBids
              .slice()
              .sort((a, b) => b.price - a.price)
              .slice(0, 5)
              .map(bid => (
                <button
                  key={bid.id}
                  onClick={() => onAcceptBid(bid.id)}
                  disabled={acceptingBidId === bid.id}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-divider hover:border-green-500/30 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-bold text-gold tabular-nums">
                      {fmtScout(centsToBsd(bid.price))}
                    </span>
                    <span className="text-xs text-white/40">{bid.quantity}x</span>
                  </div>
                  <span className="text-xs text-green-500 font-bold">
                    {acceptingBidId === bid.id
                      ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      : tm('sofortVerkaufen')}
                  </span>
                </button>
              ))}
          </div>
        </Card>
      )}
    </>
  );

  // Active Listings — shown after the form
  const afterForm = userOrders.length > 0 ? (
    <Card className="p-4">
      <div className="text-xs text-white/50 mb-3 font-bold">{t('activeListings')}</div>
      <div className="space-y-2">
        {userOrders.map((order) => {
          const remaining = order.quantity - order.filled_qty;
          return (
            <div key={order.id} className="flex items-center justify-between p-3 bg-surface-minimal rounded-xl border border-white/10">
              <div>
                <div className="font-mono font-bold tabular-nums text-sm text-gold">{formatScout(order.price)} CR</div>
                <div className="text-[10px] text-white/50">
                  {remaining}/{order.quantity} SC
                  {order.filled_qty > 0 && (
                    <span className="text-green-500"> &middot; {t('soldCount', { count: order.filled_qty })}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onCancelOrder(order.id)}
                disabled={cancellingId === order.id}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-2 min-h-[44px] rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {cancellingId === order.id
                  ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  : t('storno')}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  ) : null;

  return (
    <SellModalCore
      open={open}
      onClose={onClose}
      title={t('sell')}
      subtitle={`${player.first} ${player.last}`}
      holdingQty={holdingQty}
      availableToSell={availableToSell}
      floorBsd={floorBsd}
      isLiquidated={player.isLiquidated}
      selling={selling}
      cancellingId={cancellingId}
      additionalBusy={acceptingBidId != null}
      error={sellError}
      onSubmit={onSell}
      headerSlot={positionCard}
      beforeFormSlot={beforeForm}
      afterFormSlot={afterForm}
    />
  );
}
