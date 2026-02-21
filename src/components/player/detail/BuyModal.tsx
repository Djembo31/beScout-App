'use client';

import { useState, useMemo, useEffect } from 'react';
import { Lock, Zap, Clock, ShoppingCart, Target, Loader2, Send } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbIpo, DbOrder } from '@/types';
import {
  TradingToasts,
  BuyConfirmation,
} from './trading';

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
  onBuy: (qty: number) => void;
  onIpoBuy: (qty: number) => void;
  onConfirmBuy: (qty: number) => void;
  onCancelPendingBuy: () => void;
  onShareTrade: () => void;
  onOpenOfferModal: () => void;
}

const formatCountdown = (isoDate: string) => {
  const ms = Math.max(0, new Date(isoDate).getTime() - Date.now());
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m`;
};

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
  const [qty, setQty] = useState(1);
  const totalBsd = priceBsd * qty;
  const totalCents = priceCents * qty;
  const afford = balanceCents !== null && balanceCents >= totalCents;

  return (
    <div className="space-y-2.5">
      {/* Price + Qty in one row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-black/20 rounded-xl px-3 py-2 text-center">
          <div className="text-[10px] text-white/30">Preis/DPC</div>
          <div className="font-mono font-black text-[#FFD700]">{fmtScout(priceBsd)}</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-9 h-9 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors flex items-center justify-center">−</button>
          <input type="number" inputMode="numeric" value={qty} min={1} max={maxQty || undefined}
            onChange={(e) => setQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
            className="w-12 text-center bg-white/5 border border-white/10 rounded-lg py-1.5 font-mono font-bold text-base" />
          <button onClick={() => setQty(Math.min(maxQty || qty + 1, qty + 1))}
            className="w-9 h-9 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors flex items-center justify-center">+</button>
        </div>
      </div>

      {/* Summary + Button */}
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/30">Gesamt</span>
            <span className="font-mono font-bold text-[#FFD700]">{fmtScout(totalBsd)} $SCOUT</span>
          </div>
          {balanceCents !== null && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-white/20">Danach</span>
              <span className={cn('font-mono', afford ? 'text-[#22C55E]' : 'text-red-400')}>
                {formatScout(balanceCents - totalCents)}
              </span>
            </div>
          )}
        </div>
        <Button variant="gold" size="lg" onClick={() => onBuy(qty)} disabled={isBuying || !afford} className="shrink-0">
          {isBuying ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
          {isBuying ? '...' : label}
        </Button>
      </div>
      {!afford && !isBuying && <div className="text-[10px] text-red-400 text-center">Nicht genug $SCOUT</div>}
    </div>
  );
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

  const hasMarket = transferAvailable > 0;

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
    <Modal open={open} onClose={onClose} title="DPC kaufen" subtitle={`${player.first} ${player.last}`}>
      <div className="-mx-4 -mb-4 sm:-mx-6 sm:-mb-6">
        <div className="p-4 sm:p-6 space-y-3">
          {/* Liquidated Guard */}
          {isLiquidated && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300">
              <Lock className="w-4 h-4 shrink-0" />
              <span className="text-sm font-bold">Trading gesperrt — Spieler liquidiert</span>
            </div>
          )}

          {/* Toasts */}
          <TradingToasts buySuccess={buySuccess} buyError={buyError} shared={shared} onShareTrade={onShareTrade} />

          {/* Buy Confirmation (own sell orders warning) */}
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

          {/* ═══ Stacked Buy Options ═══ */}
          {!isLiquidated && pendingBuyQty === null && (
            <>
              {/* ── 1. IPO Section (top) ── */}
              {isIPO && activeIpo && (
                <div className="border border-[#22C55E]/20 rounded-2xl overflow-hidden">
                  {/* IPO Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-[#22C55E]/[0.06]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                      <span className="font-black text-sm text-[#22C55E]">IPO</span>
                      <span className="text-[10px] text-white/30">Festpreis vom Verein</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-white/30">
                      <Clock className="w-3 h-3" />
                      {formatCountdown(activeIpo.ends_at)}
                    </div>
                  </div>
                  <div className="p-3 space-y-2.5">
                    {/* Progress */}
                    <div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full" style={{ width: `${ipoProgress}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-white/30 mt-0.5">
                        <span>{fmtScout(activeIpo.sold)}/{fmtScout(activeIpo.total_offered)} verkauft</span>
                        <span>Limit: {userIpoPurchased}/{activeIpo.max_per_user}</span>
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
                        label="Verpflichten"
                        icon={<Zap className="w-4 h-4" />}
                        onBuy={onIpoBuy}
                      />
                    ) : (
                      <div className="text-center py-2 text-xs text-white/30">
                        <Lock className="w-4 h-4 mx-auto mb-1 text-white/15" />
                        IPO-Limit erreicht
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 2. Market Section (below IPO) ── */}
              {hasMarket && (
                <div className="border border-sky-500/15 rounded-2xl overflow-hidden">
                  {/* Market Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 bg-sky-500/[0.04]">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-sky-300" />
                      <span className="font-black text-sm text-sky-300">Markt</span>
                      <span className="text-[10px] text-white/30">{transferAvailable} Angebot{transferAvailable !== 1 ? 'e' : ''}</span>
                    </div>
                    <span className="text-[10px] text-white/25">Günstigstes zuerst</span>
                  </div>
                  <div className="p-3">
                    <BuyForm
                      priceBsd={floorBsd}
                      priceCents={floorCents}
                      maxQty={marketMaxQty}
                      balanceCents={balanceCents}
                      isBuying={buying}
                      canAfford={balanceCents !== null && balanceCents >= floorCents}
                      label="Kaufen"
                      icon={<Target className="w-4 h-4" />}
                      onBuy={onBuy}
                    />
                  </div>
                </div>
              )}

              {/* ── 3. No source — Offer CTA ── */}
              {!isIPO && !hasMarket && userId && (
                <div className="py-6 text-center">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-white/10" />
                  <div className="text-sm text-white/40 mb-1">Nicht verfügbar</div>
                  <div className="text-xs text-white/25 mb-3">Kein IPO aktiv und keine Markt-Angebote</div>
                  <button
                    onClick={onOpenOfferModal}
                    className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-colors text-xs font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Kaufangebot machen
                  </button>
                </div>
              )}

              {/* Offer hint — when market empty but IPO exists */}
              {!hasMarket && isIPO && userId && (
                <button
                  onClick={onOpenOfferModal}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-[10px] text-white/25 hover:text-[#FFD700] transition-colors"
                >
                  <Send className="w-3 h-3" />
                  Oder: Kaufangebot an andere User senden
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
