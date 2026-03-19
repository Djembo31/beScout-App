'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, Zap, ShoppingCart, Target, Loader2, Send } from 'lucide-react';
import { Modal, Button, Countdown } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbIpo, DbOrder } from '@/types';
import {
  TradingToasts,
  BuyConfirmation,
} from './trading';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';

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
  buying: boolean;
  ipoBuying: boolean;
  buyError: string | null;
  buySuccess: string | null;
  shared: boolean;
  pendingBuyQty: number | null;
  pendingBuyOrderId?: string | null;
  onBuy: (qty: number, orderId?: string) => void;
  onIpoBuy: (qty: number) => void;
  onConfirmBuy: (qty: number, orderId?: string) => void;
  onCancelPendingBuy: () => void;
  onShareTrade: () => void;
  onOpenOfferModal: () => void;
  profileMap?: Record<string, { handle: string; display_name: string | null }>;
}

// formatCountdown replaced by Countdown component

// ── Compact Buy Form (shared between IPO and Market) ──
function BuyForm({ priceBsd, priceCents, maxQty, balanceCents, isBuying, canAfford, label, icon, onBuy }: {
  priceBsd: number;
  priceCents: number;
  maxQty: number;
  balanceCents: number | null;
  isBuying: boolean;
  canAfford: boolean;
  label: string;
  icon: React.ReactNode;
  onBuy: (qty: number) => void;
}) {
  const t = useTranslations('playerDetail');
  const [qty, setQty] = useState(1);
  const clampedQty = maxQty > 0 ? Math.min(qty, maxQty) : qty;
  const totalBsd = priceBsd * clampedQty;
  const totalCents = priceCents * clampedQty;
  const afford = balanceCents !== null && balanceCents >= totalCents;

  return (
    <div className="space-y-2.5">
      {/* Price + Qty in one row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-black/20 rounded-xl px-3 py-2 text-center">
          <div className="text-[10px] text-white/30">{t('pricePerDpc')}</div>
          <div className="font-mono font-black tabular-nums text-gold">{fmtScout(priceBsd)}</div>
          {maxQty > 0 && <div className="text-[9px] text-white/30">{t('maxLabel', { max: maxQty })}</div>}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label={t('decreaseQty')} disabled={isBuying}
            className="size-9 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50">−</button>
          <input type="number" inputMode="numeric" value={qty} min={1} max={maxQty || undefined} disabled={isBuying}
            aria-label={t('qtyLabel')}
            onChange={(e) => setQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
            className="w-12 text-center bg-white/5 border border-white/10 rounded-lg py-1.5 font-mono font-bold text-base disabled:opacity-50" />
          <button onClick={() => setQty(Math.min(maxQty || qty + 1, qty + 1))} aria-label={t('increaseQty')} disabled={isBuying}
            className="size-9 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors flex items-center justify-center disabled:opacity-50">+</button>
        </div>
      </div>

      {/* Summary + Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/30">{t('total')}</span>
            <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(totalBsd)} CR</span>
          </div>
          {balanceCents !== null && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/30">{t('after')}</span>
              <span className={cn('font-mono tabular-nums', afford ? 'text-green-500' : 'text-red-400')}>
                {formatScout(Math.max(0, balanceCents - totalCents))}
              </span>
            </div>
          )}
        </div>
        <Button variant="gold" size="lg" onClick={() => onBuy(clampedQty)} disabled={isBuying || !afford || clampedQty < 1} className="shrink-0">
          {isBuying ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : icon}
          {isBuying ? '...' : label}
        </Button>
      </div>
      {!afford && !isBuying && <div className="text-[10px] text-red-400 text-center">{t('notEnoughScout')}</div>}
    </div>
  );
}

export default function BuyModal({
  open, onClose, player, activeIpo, userIpoPurchased,
  balanceCents, allSellOrders, userOrders, userId,
  buying, ipoBuying, buyError, buySuccess, shared,
  pendingBuyQty, pendingBuyOrderId,
  onBuy, onIpoBuy, onConfirmBuy, onCancelPendingBuy,
  onShareTrade, onOpenOfferModal, profileMap,
}: BuyModalProps) {
  const t = useTranslations('playerDetail');
  const tm = useTranslations('market');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  // Reset selection when modal opens/closes
  useEffect(() => {
    if (!open) { setSelectedOrderId(null); setShowAllOrders(false); }
  }, [open]);

  const isLiquidated = player.isLiquidated;
  const isIPO = activeIpo !== null && (activeIpo.status === 'open' || activeIpo.status === 'early_access');

  // Filter out user's own orders, sort by price ascending
  const userFilteredOrders = useMemo(
    () => allSellOrders
      .filter(o => userId && o.user_id !== userId && (o.quantity - o.filled_qty) > 0)
      .sort((a, b) => a.price - b.price),
    [allSellOrders, userId]
  );

  const transferAvailable = useMemo(
    () => userFilteredOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0),
    [userFilteredOrders]
  );

  const hasMarket = transferAvailable > 0;
  const selectedOrder = selectedOrderId ? userFilteredOrders.find(o => o.id === selectedOrderId) ?? null : null;

  // IPO derived values
  const ipoPriceBsd = activeIpo ? centsToBsd(activeIpo.price) : 0;
  const ipoRemaining = activeIpo ? activeIpo.total_offered - activeIpo.sold : 0;
  const ipoProgress = activeIpo ? (activeIpo.sold / activeIpo.total_offered) * 100 : 0;
  const ipoCanBuyMore = activeIpo ? userIpoPurchased < activeIpo.max_per_user : false;
  const ipoMaxBuy = activeIpo ? Math.min(activeIpo.max_per_user - userIpoPurchased, ipoRemaining) : 0;

  // Market derived values
  const floorCents = Math.round((player.prices.floor ?? 0) * 100);
  const floorBsd = player.prices.floor ?? 0;
  const marketMaxQty = hasMarket
    ? Math.min(transferAvailable, balanceCents !== null ? Math.floor(balanceCents / Math.max(floorCents, 1)) : 0)
    : 0;

  return (
    <Modal open={open} onClose={onClose} title={t('buyDpc')} subtitle={`${player.first} ${player.last}`}>
      <div className="space-y-3">
          {/* Liquidated Guard */}
          {isLiquidated && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300">
              <Lock className="size-4 shrink-0" aria-hidden="true" />
              <span className="text-sm font-bold">{t('tradingLocked')}</span>
            </div>
          )}

          {/* Toasts */}
          <TradingToasts buySuccess={buySuccess} buyError={buyError} shared={shared} onShareTrade={onShareTrade} />

          {/* Buy Confirmation (own sell orders warning) */}
          {pendingBuyQty !== null && (
            <BuyConfirmation
              pendingBuyQty={pendingBuyQty}
              pendingOrderId={pendingBuyOrderId}
              userOrders={userOrders}
              floorBsd={player.prices.floor ?? 0}
              balanceCents={balanceCents}
              buying={buying}
              onConfirmBuy={onConfirmBuy}
              onCancel={onCancelPendingBuy}
            />
          )}

          {/* ═══ Stacked Buy Options ═══ */}
          {!isLiquidated && pendingBuyQty === null && (
            <>
              {/* ── 1. IPO Section (top) ── */}
              {isIPO && activeIpo && (
                <div className="border border-green-500/20 rounded-2xl overflow-hidden">
                  {/* IPO Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-green-500/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
                      <span className="font-black text-sm text-green-500">{t('clubSaleLabel', { defaultMessage: 'Club Verkauf' })}</span>
                      <span className="text-[10px] text-white/30">{t('fixedPriceFromClub')}</span>
                    </div>
                    <Countdown targetDate={activeIpo.ends_at} />
                  </div>
                  <div className="p-3 space-y-2.5">
                    {/* Progress */}
                    <div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-gold to-gold-hover rounded-full" style={{ width: `${ipoProgress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/30 mt-0.5">
                        <span>{t('soldOfTotal', { sold: fmtScout(activeIpo.sold), total: fmtScout(activeIpo.total_offered) })}</span>
                        <span>{t('limitUsed', { used: userIpoPurchased, max: activeIpo.max_per_user })}</span>
                      </div>
                    </div>
                    {/* Buy Form or Limit Reached */}
                    {ipoCanBuyMore && ipoMaxBuy > 0 ? (
                      <BuyForm
                        priceBsd={ipoPriceBsd}
                        priceCents={activeIpo.price}
                        maxQty={ipoMaxBuy}
                        balanceCents={balanceCents}
                        isBuying={ipoBuying}
                        canAfford={balanceCents !== null && balanceCents >= activeIpo.price}
                        label={t('commit')}
                        icon={<Zap className="size-4" aria-hidden="true" />}
                        onBuy={onIpoBuy}
                      />
                    ) : (
                      <div className="text-center py-2 text-xs text-white/30">
                        <Lock className="size-4 mx-auto mb-1 text-white/15" aria-hidden="true" />
                        {t('limitReached')}
                        {hasMarket && <div className="text-[10px] text-white/30 mt-1">{t('moreDpcViaMarket')}</div>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 2. Market Section (below IPO) — Alle Angebote ── */}
              {hasMarket && (
                <div className="border border-sky-500/15 rounded-2xl overflow-hidden">
                  {/* Market Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-sky-500/[0.04]">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="size-4 text-sky-300" aria-hidden="true" />
                      <span className="font-black text-sm text-sky-300">{tm('verkaufsangebote')}</span>
                      <span className="text-[10px] text-white/30">{transferAvailable !== 1 ? t('offersCountPlural', { count: transferAvailable }) : t('offersCount', { count: transferAvailable })}</span>
                    </div>
                    <span className="text-[10px] text-white/30">{t('cheapestFirst')}</span>
                  </div>

                  {/* Individual sell orders — user chooses */}
                  <div className="px-3 pt-2 space-y-1">
                    {userFilteredOrders.slice(0, showAllOrders ? undefined : 3).map((order) => {
                      const orderBsd = centsToBsd(order.price);
                      const remaining = order.quantity - order.filled_qty;
                      const isSelected = selectedOrderId === order.id;
                      return (
                        <button
                          key={order.id}
                          onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left',
                            isSelected
                              ? 'bg-sky-500/10 border border-sky-500/30'
                              : 'bg-white/[0.03] border border-white/[0.06] hover:border-white/20'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-gold tabular-nums">{fmtScout(orderBsd)}</span>
                            <span className="text-xs text-white/40">{remaining}x</span>
                          </div>
                          <span className="text-xs text-white/50">@{profileMap?.[order.user_id]?.handle ?? order.user_id.slice(0, 8)}</span>
                        </button>
                      );
                    })}
                    {userFilteredOrders.length > 3 && !showAllOrders && (
                      <button onClick={() => setShowAllOrders(true)} className="w-full text-center text-[10px] text-white/30 py-1 hover:text-white/50 transition-colors">
                        +{userFilteredOrders.length - 3} {t('moreOrders', { defaultMessage: 'weitere' })}
                      </button>
                    )}
                  </div>

                  <div className="p-3">
                    <BuyForm
                      priceBsd={selectedOrder ? centsToBsd(selectedOrder.price) : floorBsd}
                      priceCents={selectedOrder ? selectedOrder.price : floorCents}
                      maxQty={selectedOrder ? (selectedOrder.quantity - selectedOrder.filled_qty) : marketMaxQty}
                      balanceCents={balanceCents}
                      isBuying={buying}
                      canAfford={balanceCents !== null && balanceCents >= (selectedOrder ? selectedOrder.price : floorCents)}
                      label={t('buy')}
                      icon={<Target className="size-4" aria-hidden="true" />}
                      onBuy={(qty) => onBuy(qty, selectedOrder?.id)}
                    />
                  </div>
                </div>
              )}

              {/* ── 3. No source — Offer CTA ── */}
              {!isIPO && !hasMarket && userId && (
                <div className="py-6 text-center">
                  <ShoppingCart className="size-8 mx-auto mb-2 text-white/10" aria-hidden="true" />
                  <div className="text-sm text-white/40">{t('notAvailable')}</div>
                  <div className="text-xs text-white/30 mb-3">{t('noSaleNoOffers')}</div>
                  <button
                    onClick={onOpenOfferModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-gold/10 text-gold border border-gold/20 hover:bg-gold/20 transition-colors text-xs font-bold"
                  >
                    <Send className="size-3.5" aria-hidden="true" />
                    {t('makeOffer')}
                  </button>
                </div>
              )}

              {/* Offer hint — when market empty but IPO exists */}
              {!hasMarket && isIPO && userId && (
                <button
                  onClick={onOpenOfferModal}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-white/30 hover:text-gold transition-colors"
                >
                  <Send className="size-3" aria-hidden="true" />
                  {t('sendOfferToUsers')}
                </button>
              )}
            </>
          )}
        <TradingDisclaimer />
      </div>
    </Modal>
  );
}
