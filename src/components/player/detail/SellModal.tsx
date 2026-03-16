'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Briefcase, Loader2, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { Modal, Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbOrder } from '@/types';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import { TRADE_FEE_PCT } from '@/lib/constants';

interface SellModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  holdingQty: number;
  userOrders: DbOrder[];
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  selling: boolean;
  cancellingId: string | null;
  sellError?: string | null;
}

export default function SellModal({
  open, onClose, player, holdingQty, userOrders,
  onSell, onCancelOrder, selling, cancellingId,
  sellError: parentSellError,
}: SellModalProps) {
  const t = useTranslations('playerDetail');
  const [sellQty, setSellQty] = useState(1);
  const [sellPriceBsd, setSellPriceBsd] = useState('');
  const [sellSuccess, setSellSuccess] = useState<string | null>(null);
  const [localSellError, setLocalSellError] = useState<string | null>(null);

  const sellError = parentSellError || localSellError;

  const circulation = player.dpc.circulation || 1;
  const share = holdingQty / circulation;
  const listedQty = userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
  const availableToSell = holdingQty - listedQty;
  const floorPriceCents = Math.round((player.prices.floor ?? 0) * 100);
  const floorBsd = floorPriceCents / 100;

  const handleSell = () => {
    if (player.isLiquidated) return;
    const priceCents = Math.round(Number(sellPriceBsd) * 100);
    if (priceCents < 1) {
      setLocalSellError(t('minPriceError'));
      return;
    }
    if (sellQty < 1 || sellQty > availableToSell) {
      setLocalSellError(t('invalidQty'));
      return;
    }
    setLocalSellError(null);
    onSell(sellQty, priceCents);
  };

  // Fee breakdown
  const gross = sellQty * Number(sellPriceBsd || 0);
  const fee = gross * TRADE_FEE_PCT / 100;
  const net = gross - fee;
  const showFee = sellPriceBsd && Number(sellPriceBsd) > 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sell')}
      subtitle={`${player.first} ${player.last}`}
      footer={availableToSell > 0 && !player.isLiquidated ? (
        <div>
          <Button variant="gold" fullWidth size="lg"
            onClick={handleSell}
            disabled={selling || !sellPriceBsd || Number(sellPriceBsd) <= 0}
          >
            {selling ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
            {selling ? t('listing') : t('listForPrice', { price: showFee ? fmtScout(Number(sellPriceBsd)) : '...' })}
          </Button>
          <TradingDisclaimer />
        </div>
      ) : undefined}
    >
      <div className="space-y-4">
          {/* Toast messages */}
          {sellSuccess && (
            <div className="bg-green-500/20 border border-green-500/30 text-green-500 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              {sellSuccess}
            </div>
          )}
          {sellError && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
              <XCircle className="size-4" aria-hidden="true" />
              {sellError}
            </div>
          )}

          {/* Liquidation Warning */}
          {player.isLiquidated && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
              <Lock className="size-4" aria-hidden="true" />
              {t('tradingLockedLiquidated')}
            </div>
          )}

          {/* Position Info */}
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
            </div>
          </Card>

          {/* Sell Form */}
          {availableToSell > 0 && !player.isLiquidated && (
            <Card className="p-4 space-y-3">
              <span className="font-bold text-sm">{t('newOrder')}</span>

              {/* Quantity */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">{t('qtyMax', { max: availableToSell })}</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSellQty(Math.max(1, sellQty - 1))} aria-label={t('decreaseQty')}
                    className="size-11 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">-</button>
                  <input type="number" inputMode="numeric" value={sellQty} min={1} max={availableToSell}
                    aria-label={t('sellQtyAria')}
                    onChange={(e) => setSellQty(Math.max(1, Math.min(availableToSell, parseInt(e.target.value) || 1)))}
                    className="flex-1 text-center bg-white/5 border border-white/10 rounded-lg py-1.5 font-mono font-bold text-base" />
                  <button onClick={() => setSellQty(Math.min(availableToSell, sellQty + 1))} aria-label={t('increaseQty')}
                    className="size-11 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold hover:bg-white/10 text-sm">+</button>
                </div>
              </div>

              {/* Price */}
              <div>
                <label className="text-xs text-white/50 mb-1 block">{t('pricePerDpcScout')}</label>
                <input
                  type="number" inputMode="numeric" value={sellPriceBsd} min={1} step={1}
                  placeholder={floorBsd > 0 ? t('examplePrice', { price: floorBsd }) : t('enterPrice')}
                  aria-label={t('pricePerDpcLabel')}
                  onChange={(e) => setSellPriceBsd(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 font-mono font-bold text-base"
                />
                {/* Quick-Price Presets */}
                {floorBsd > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <button onClick={() => setSellPriceBsd(floorBsd.toString())} disabled={selling}
                      className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">Floor</button>
                    <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.05).toString())} disabled={selling}
                      className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">+5%</button>
                    <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.10).toString())} disabled={selling}
                      className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">+10%</button>
                    <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.20).toString())} disabled={selling}
                      className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50">+20%</button>
                    <span className="text-[11px] text-white/30 ml-1">Floor: {fmtScout(floorBsd)}</span>
                  </div>
                )}
              </div>

              {/* Fee breakdown */}
              {showFee && (
                <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{t('gross')}</span>
                    <span className="font-mono tabular-nums text-white/50">{fmtScout(gross)} CR</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{t('feePercent', { pct: TRADE_FEE_PCT })}</span>
                    <span className="font-mono tabular-nums text-red-400/70">-{fmtScout(fee)} CR</span>
                  </div>
                  <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-sm">
                    <span className="text-white/50">{t('netProceeds')}</span>
                    <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(net)} CR</span>
                  </div>
                </div>
              )}

            </Card>
          )}

          {/* Active Listings */}
          {userOrders.length > 0 && (
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
                          {order.filled_qty > 0 && <span className="text-green-500"> &middot; {t('soldCount', { count: order.filled_qty })}</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => onCancelOrder(order.id)}
                        disabled={cancellingId === order.id}
                        className="text-xs text-red-400 hover:text-red-300 px-3 py-2 min-h-[44px] rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      >
                        {cancellingId === order.id ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('storno')}
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
      </div>
    </Modal>
  );
}
