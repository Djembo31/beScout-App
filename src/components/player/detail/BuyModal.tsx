'use client';

import { useState, useMemo, useEffect } from 'react';
import { Lock, Zap, Clock, ShoppingCart, Users, Target, Loader2, Send } from 'lucide-react';
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

type BuySource = 'ipo' | 'market';

const formatCountdown = (isoDate: string) => {
  const ms = Math.max(0, new Date(isoDate).getTime() - Date.now());
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  return `${hours}h ${mins}m`;
};

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

  // Smart default: IPO first, then market
  const bestSource: BuySource = isIPO ? 'ipo' : 'market';
  const [source, setSource] = useState<BuySource>(bestSource);
  const [buyQty, setBuyQty] = useState(1);

  // Reset source when modal opens or IPO status changes
  useEffect(() => {
    if (open) {
      setSource(isIPO ? 'ipo' : 'market');
      setBuyQty(1);
    }
  }, [open, isIPO]);

  // IPO derived values
  const ipoPriceBsd = activeIpo ? centsToBsd(activeIpo.price) : 0;
  const ipoRemaining = activeIpo ? activeIpo.total_offered - activeIpo.sold : 0;
  const ipoProgress = activeIpo ? (activeIpo.sold / activeIpo.total_offered) * 100 : 0;
  const ipoCanBuyMore = activeIpo ? userIpoPurchased < activeIpo.max_per_user : false;
  const ipoMaxBuy = activeIpo ? Math.min(activeIpo.max_per_user - userIpoPurchased, ipoRemaining) : 0;

  // Market derived values
  const floorCents = Math.round((player.prices.floor ?? 0) * 100);
  const floorBsd = player.prices.floor ?? 0;

  // Active source values
  const isIpoSource = source === 'ipo' && isIPO;
  const priceBsd = isIpoSource ? ipoPriceBsd : floorBsd;
  const priceCents = isIpoSource && activeIpo ? activeIpo.price : floorCents;
  const maxQty = isIpoSource
    ? ipoMaxBuy
    : (hasMarket ? Math.min(transferAvailable, balanceCents !== null ? Math.floor(balanceCents / Math.max(floorCents, 1)) : 0) : 0);

  const totalCents = priceCents * buyQty;
  const totalBsd = priceBsd * buyQty;
  const canAfford = balanceCents !== null && balanceCents >= totalCents;
  const canBuy = isIpoSource ? (ipoCanBuyMore && ipoMaxBuy > 0) : hasMarket;

  const handleBuy = () => {
    if (isIpoSource) {
      onIpoBuy(buyQty);
    } else {
      onBuy(buyQty);
    }
  };

  const isBuying = isIpoSource ? ipoBuying : buying;

  // How many sources available?
  const sourceCount = (isIPO ? 1 : 0) + (hasMarket ? 1 : 0);

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

          {/* Main Buy UI */}
          {!isLiquidated && pendingBuyQty === null && (
            <>
              {/* Source Tabs — only if both available */}
              {sourceCount > 1 && (
                <div className="flex bg-white/[0.03] rounded-xl p-1 gap-1">
                  <button
                    onClick={() => { setSource('ipo'); setBuyQty(1); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[44px]',
                      source === 'ipo' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'text-white/30 hover:text-white/50'
                    )}
                  >
                    <Zap className="w-4 h-4" />
                    IPO
                  </button>
                  <button
                    onClick={() => { setSource('market'); setBuyQty(1); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all min-h-[44px]',
                      source === 'market' ? 'bg-sky-500/15 text-sky-300' : 'text-white/30 hover:text-white/50'
                    )}
                  >
                    <Users className="w-4 h-4" />
                    Markt <span className="text-[10px] font-normal ml-0.5">({transferAvailable})</span>
                  </button>
                </div>
              )}

              {/* Source Badge (single source — no tabs needed) */}
              {sourceCount === 1 && isIPO && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="font-black text-sm text-[#22C55E]">IPO LIVE</span>
                  </div>
                  {activeIpo && (
                    <div className="flex items-center gap-1 text-[10px] text-white/40">
                      <Clock className="w-3 h-3" />
                      Endet in {formatCountdown(activeIpo.ends_at)}
                    </div>
                  )}
                </div>
              )}

              {/* IPO Content */}
              {isIpoSource && activeIpo && (
                <>
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white/40">{fmtScout(activeIpo.sold)} / {fmtScout(activeIpo.total_offered)} verkauft</span>
                      <span className="font-mono font-bold text-[#FFD700]">{ipoProgress.toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full" style={{ width: `${ipoProgress}%` }} />
                    </div>
                  </div>
                  {/* Limits Row */}
                  <div className="flex gap-2">
                    <div className="flex-1 bg-white/[0.03] rounded-xl px-3 py-2">
                      <div className="text-[10px] text-white/30">Dein Limit</div>
                      <div className="font-mono font-bold text-sm">{activeIpo.max_per_user} DPC</div>
                    </div>
                    <div className="flex-1 bg-white/[0.03] rounded-xl px-3 py-2">
                      <div className="text-[10px] text-white/30">Bereits gekauft</div>
                      <div className="font-mono font-bold text-sm">{userIpoPurchased} DPC</div>
                    </div>
                    <div className="flex-1 bg-white/[0.03] rounded-xl px-3 py-2">
                      <div className="text-[10px] text-white/30">Verfügbar</div>
                      <div className="font-mono font-bold text-sm text-[#22C55E]">{fmtScout(ipoRemaining)}</div>
                    </div>
                  </div>
                </>
              )}

              {/* Market Content (no orders) */}
              {source === 'market' && !hasMarket && (
                <div className="py-6 text-center">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-white/15" />
                  <div className="text-sm text-white/40 mb-1">Keine Angebote</div>
                  <div className="text-xs text-white/25 mb-3">Noch hat niemand DPCs zum Verkauf gelistet</div>
                  {userId && (
                    <button
                      onClick={onOpenOfferModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/20 hover:bg-[#FFD700]/20 transition-colors text-xs font-bold"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Kaufangebot machen
                    </button>
                  )}
                </div>
              )}

              {/* Market info badge */}
              {source === 'market' && hasMarket && (
                <div className="flex items-center justify-between bg-sky-500/5 border border-sky-500/15 rounded-xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-sky-300" />
                    <span className="text-xs text-sky-300 font-bold">{transferAvailable} Angebot{transferAvailable !== 1 ? 'e' : ''}</span>
                  </div>
                  <span className="text-[10px] text-white/40">Günstigstes zuerst</span>
                </div>
              )}

              {/* === Unified Buy Form === */}
              {canBuy && (
                <>
                  {/* Price Display */}
                  <div className="flex items-center justify-between bg-black/20 rounded-xl px-4 py-3">
                    <span className="text-sm text-white/50">Preis pro DPC</span>
                    <span className="font-mono font-black text-xl text-[#FFD700]">{fmtScout(priceBsd)} <span className="text-sm font-bold text-white/30">$SCOUT</span></span>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="text-xs text-white/40 mb-1.5 block">Anzahl</label>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">−</button>
                      <input type="number" inputMode="numeric" value={buyQty} min={1} max={maxQty || undefined}
                        onChange={(e) => setBuyQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
                        className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 font-mono font-bold text-base" />
                      <button onClick={() => setBuyQty(Math.min(maxQty || buyQty + 1, buyQty + 1))}
                        className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors">+</button>
                    </div>
                  </div>

                  {/* Cost Summary — compact */}
                  <div className="bg-black/20 rounded-xl p-3 space-y-1.5">
                    {buyQty > 1 && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/30">{fmtScout(priceBsd)} × {buyQty}</span>
                        <span className="font-mono text-white/50">{fmtScout(totalBsd)} $SCOUT</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/50">Gesamt</span>
                      <span className="font-mono font-black text-lg text-[#FFD700]">{fmtScout(totalBsd)} $SCOUT</span>
                    </div>
                    <div className="border-t border-white/[0.06] pt-1.5 flex items-center justify-between text-xs">
                      <span className="text-white/30">Guthaben</span>
                      <span className="font-mono text-white/40">{balanceCents !== null ? formatScout(balanceCents) : '...'}</span>
                    </div>
                    {balanceCents !== null && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/30">Danach</span>
                        <span className={cn('font-mono font-bold', canAfford ? 'text-[#22C55E]' : 'text-red-400')}>
                          {formatScout(balanceCents - totalCents)} $SCOUT
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Buy Button */}
                  <Button variant="gold" fullWidth size="lg" onClick={handleBuy} disabled={isBuying || !canAfford}>
                    {isBuying ? <Loader2 className="w-5 h-5 animate-spin" /> : isIpoSource ? <Zap className="w-5 h-5" /> : <Target className="w-5 h-5" />}
                    {isBuying ? 'Wird gekauft...' : `${buyQty} DPC ${isIpoSource ? 'verpflichten' : 'kaufen'}`}
                  </Button>
                  {!canAfford && !isBuying && <div className="text-xs text-red-400 text-center">Nicht genug $SCOUT</div>}
                </>
              )}

              {/* IPO limit reached */}
              {isIpoSource && !canBuy && activeIpo && (
                <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                  <Lock className="w-6 h-6 mx-auto mb-1.5 text-white/20" />
                  <div className="text-sm text-white/40">IPO-Limit erreicht</div>
                  <div className="text-[10px] text-white/25">Du hast das Maximum für diesen IPO erreicht</div>
                </div>
              )}

              {/* No source available at all */}
              {!isIPO && !hasMarket && userId && (
                <div className="py-6 text-center">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-white/15" />
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
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
