'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShoppingCart, Users, Target, Loader2 } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { formatScout } from '@/lib/services/wallet';
import type { Player } from '@/types';

interface TransferBuySectionProps {
  player: Player;
  balanceCents: number | null;
  holdingQty: number;
  sellOrderCount: number;
  onBuy: (qty: number) => void;
  buying: boolean;
}

export default function TransferBuySection({
  player, balanceCents, holdingQty, sellOrderCount, onBuy, buying,
}: TransferBuySectionProps) {
  const t = useTranslations('playerDetail');
  const [buyQty, setBuyQty] = useState(1);
  const floorCents = Math.round((player.prices.floor ?? 0) * 100);
  const floorBsd = player.prices.floor ?? 0;
  const totalBsd = floorBsd * buyQty;
  const canAfford = balanceCents !== null && balanceCents >= floorCents * buyQty;
  const hasOrders = sellOrderCount > 0;
  const maxQty = hasOrders
    ? Math.min(sellOrderCount, balanceCents !== null ? Math.floor(balanceCents / Math.max(floorCents, 1)) : 0)
    : 0;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-sky-500/10 to-sky-500/5 border-b border-sky-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-sky-300" aria-hidden="true" />
            <span className="font-black text-sky-300">{t('transferMarket')}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-white/50">
            <span>{t('inPossession', { count: holdingQty })}</span>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {hasOrders ? (
          <>
            <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-4 text-sky-300" aria-hidden="true" />
                  <span className="text-sm text-sky-300 font-bold">{t('userOffers')}</span>
                </div>
                <span className="font-mono font-black tabular-nums text-lg text-gold">{fmtScout(floorBsd)} $SCOUT</span>
              </div>
              <div className="text-[10px] text-white/40 mt-1">
                {sellOrderCount !== 1
                  ? t('userOffersFromPlural', { count: sellOrderCount })
                  : t('userOffersFrom', { count: sellOrderCount })}
              </div>
            </div>
            <div>
              <label className="text-xs text-white/50 mb-2 block">{t('quantity')}</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))} aria-label={t('decreaseQty')}
                  className="size-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">-</button>
                <input type="number" inputMode="numeric" value={buyQty} min={1} max={maxQty || undefined}
                  aria-label={t('buyQtyAria')}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(maxQty || 999, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center bg-white/5 border border-white/10 rounded-xl py-2 font-mono font-bold text-base" />
                <button onClick={() => setBuyQty(Math.min(maxQty || buyQty + 1, buyQty + 1))} aria-label={t('increaseQty')}
                  className="size-11 min-w-[44px] min-h-[44px] rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10">+</button>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">{t('pricePerDpc')}</span>
                <span className="font-mono tabular-nums text-white/60">{fmtScout(floorBsd)} $SCOUT</span>
              </div>
              {buyQty > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{t('quantity')}</span>
                  <span className="font-mono tabular-nums text-white/60">&times; {buyQty}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                <span className="text-white/50 text-sm">{t('totalCost')}</span>
                <span className="font-mono font-black tabular-nums text-xl text-gold">{fmtScout(totalBsd)} $SCOUT</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs">
                <span className="text-white/40">{t('yourBalance')}</span>
                <span className="font-mono tabular-nums text-white/50">{balanceCents !== null ? formatScout(balanceCents) : '...'} $SCOUT</span>
              </div>
              {balanceCents !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{t('balanceAfter')}</span>
                  <span className={`font-mono font-bold tabular-nums ${canAfford ? 'text-green-500' : 'text-red-400'}`}>
                    {formatScout(balanceCents - floorCents * buyQty)} $SCOUT
                  </span>
                </div>
              )}
            </div>
            <Button variant="gold" fullWidth size="lg" onClick={() => onBuy(buyQty)} disabled={buying || !canAfford}>
              {buying ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Target className="size-5" aria-hidden="true" />}
              {buying ? t('buying') : t('buyDpcCount', { qty: buyQty })}
            </Button>
            {!canAfford && !buying && <div className="text-xs text-red-400 text-center">{t('notEnoughScout')}</div>}
          </>
        ) : (
          <div className="py-6 text-center">
            <ShoppingCart className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
            <div className="text-white/50 mb-1">{t('noUserOffersTitle')}</div>
            <div className="text-xs text-white/30 text-pretty">{t('noUserOffersDesc')}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
