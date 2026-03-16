'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShoppingCart, Send, Briefcase, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import type { Player, DbOrder } from '@/types';
import { TRADE_FEE_PCT } from '@/lib/constants';

interface HoldingsSectionProps {
  player: Player;
  holdingQty: number;
  floorPriceCents: number;
  userOrders: DbOrder[];
  onSell: (qty: number, priceCents: number) => void;
  onCancelOrder: (orderId: string) => void;
  selling: boolean;
  cancellingId: string | null;
}

export default function HoldingsSection({
  player, holdingQty, floorPriceCents, userOrders, onSell, onCancelOrder, selling, cancellingId,
}: HoldingsSectionProps) {
  const t = useTranslations('playerDetail');
  const circulation = player.dpc.circulation || 1;
  const share = holdingQty / circulation;
  const [showSellForm, setShowSellForm] = useState(false);
  const [sellQty, setSellQty] = useState(1);
  const [sellPriceBsd, setSellPriceBsd] = useState('');
  const listedQty = userOrders.reduce((sum, o) => sum + (o.quantity - o.filled_qty), 0);
  const availableToSell = holdingQty - listedQty;
  const floorBsd = floorPriceCents / 100;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-green-500/20 to-green-500/5 border-b border-green-500/20 p-4">
        <div className="flex items-center gap-2">
          <Briefcase className="size-5 text-green-500" aria-hidden="true" />
          <span className="font-black text-green-500">{t('yourPosition')}</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        {holdingQty > 0 && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-white/50">{t('dpcOwned')}</span>
              <span className="font-mono font-bold tabular-nums text-lg">{holdingQty} SC</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/50">{t('floatShare')}</span>
              <span className="font-mono font-bold tabular-nums">{(share * 100).toFixed(2)}%</span>
            </div>
            {listedQty > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-white/50">{t('listedOf')}</span>
                <span className="font-mono font-bold tabular-nums text-orange-300">{listedQty} SC</span>
              </div>
            )}
          </>
        )}
        {/* Sell form */}
        {availableToSell > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-3">
            {!showSellForm ? (
              <Button variant="outline" fullWidth size="sm" onClick={() => {
                setSellPriceBsd(floorBsd > 0 ? floorBsd.toString() : '');
                setSellQty(1);
                setShowSellForm(true);
              }}>
                <ShoppingCart className="size-4" aria-hidden="true" /> {t('sell')}
              </Button>
            ) : (
              <div className="bg-surface-minimal border border-white/10 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{t('sellDpc')}</span>
                  <button onClick={() => setShowSellForm(false)} className="text-white/40 hover:text-white text-xs">{t('cancelAction')}</button>
                </div>
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
                <div>
                  <label className="text-xs text-white/50 mb-1 block">{t('pricePerDpcScout')}</label>
                  <input
                    type="number" inputMode="numeric" value={sellPriceBsd} min={1} step={1}
                    placeholder={floorBsd > 0 ? t('examplePrice', { price: floorBsd }) : t('enterPrice')}
                    aria-label={t('pricePerDpcLabel')}
                    onChange={(e) => setSellPriceBsd(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 font-mono font-bold text-base"
                  />
                  {floorBsd > 0 && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSellPriceBsd(floorBsd.toString())}
                          className="px-2.5 py-1.5 min-h-[44px] rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors">Floor</button>
                        <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.05).toString())}
                          className="px-2.5 py-1.5 min-h-[44px] rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors">+5%</button>
                        <button onClick={() => setSellPriceBsd(Math.ceil(floorBsd * 1.10).toString())}
                          className="px-2.5 py-1.5 min-h-[44px] rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors">+10%</button>
                        <span className="text-[11px] text-white/25 ml-1">Floor: {fmtScout(floorBsd)}</span>
                      </div>
                    </div>
                  )}
                </div>
                {/* Fee breakdown */}
                {sellPriceBsd && Number(sellPriceBsd) > 0 && (() => {
                  const gross = sellQty * Number(sellPriceBsd);
                  const feePct = TRADE_FEE_PCT;
                  const fee = gross * feePct / 100;
                  const net = gross - fee;
                  return (
                    <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{t('gross')}</span>
                        <span className="font-mono tabular-nums text-white/40">{fmtScout(gross)} $SCOUT</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">{t('feePercent', { pct: feePct })}</span>
                        <span className="font-mono tabular-nums text-red-400/70">-{fmtScout(fee)} $SCOUT</span>
                      </div>
                      <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-sm">
                        <span className="text-white/50">{t('netProceeds')}</span>
                        <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(net)} $SCOUT</span>
                      </div>
                    </div>
                  );
                })()}
                <Button variant="gold" fullWidth size="sm"
                  onClick={() => {
                    const priceCents = Math.round(Number(sellPriceBsd) * 100);
                    if (priceCents > 0 && sellQty > 0) {
                      onSell(sellQty, priceCents);
                      setShowSellForm(false);
                    }
                  }}
                  disabled={selling || !sellPriceBsd || Number(sellPriceBsd) <= 0}
                >
                  {selling ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="size-4" aria-hidden="true" />}
                  {selling ? t('listing') : t('listDpc', { qty: sellQty })}
                </Button>
              </div>
            )}
          </div>
        )}
        {/* Active Sell Orders */}
        {userOrders.length > 0 && (
          <div className="pt-3 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2">{t('yourActiveOffers')}</div>
            <div className="space-y-2">
              {userOrders.map((order) => {
                const remaining = order.quantity - order.filled_qty;
                return (
                  <div key={order.id} className="flex items-center justify-between p-2 bg-surface-minimal rounded-lg border border-white/10">
                    <div>
                      <div className="font-mono font-bold tabular-nums text-sm text-gold">{formatScout(order.price)} $SCOUT</div>
                      <div className="text-[10px] text-white/40">
                        {remaining}/{order.quantity} SC
                        {order.filled_qty > 0 && <span className="text-green-500"> &middot; {t('soldCount', { count: order.filled_qty })}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => onCancelOrder(order.id)}
                      disabled={cancellingId === order.id}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {cancellingId === order.id ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : t('storno')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
