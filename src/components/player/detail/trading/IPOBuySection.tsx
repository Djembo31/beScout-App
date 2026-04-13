'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Lock, Loader2 } from 'lucide-react';
import { Card, Button, Countdown } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import type { DbIpo } from '@/types';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';

// formatCountdown replaced by Countdown component

interface IPOBuySectionProps {
  ipo: DbIpo;
  userPurchased: number;
  balanceCents: number | null;
  onBuy: (qty: number) => void;
  buying: boolean;
}

export default function IPOBuySection({
  ipo, userPurchased, balanceCents, onBuy, buying,
}: IPOBuySectionProps) {
  const t = useTranslations('playerDetail');
  const [buyQty, setBuyQty] = useState(1);
  const priceBsd = centsToBsd(ipo.price);
  const remaining = ipo.total_offered - ipo.sold;
  const progress = (ipo.sold / ipo.total_offered) * 100;
  const canBuyMore = userPurchased < ipo.max_per_user;
  const maxBuy = Math.min(ipo.max_per_user - userPurchased, remaining);
  const totalCents = ipo.price * buyQty;
  const totalBsd = centsToBsd(totalCents);
  const canAfford = balanceCents !== null && balanceCents >= totalCents;

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-green-500/20 to-green-500/5 border-b border-green-500/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-green-500 animate-pulse motion-reduce:animate-none" />
            <span className="font-black text-green-500">{t('clubSale', { defaultMessage: 'Club Verkauf' })}</span>
            <span className="text-[10px] text-white/40 ml-1">{t('fixedPrice')}</span>
          </div>
          <Countdown targetDate={ipo.ends_at} />
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-white/50">{t('progress')}</span>
            <span className="font-mono font-bold tabular-nums text-gold">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-gold to-orange-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between text-xs text-white/40 mt-1">
            <span>{t('soldLabel', { count: fmtScout(ipo.sold) })}</span>
            <span>{t('availableLabel', { count: fmtScout(remaining) })}</span>
          </div>
        </div>
        {/* Price */}
        <div className="bg-black/20 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/50 text-sm">{t('clubPrice')}</span>
            <span className="font-mono font-black tabular-nums text-2xl text-gold">{fmtScout(priceBsd)} CR</span>
          </div>
        </div>
        {/* Limits */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-surface-minimal rounded-lg p-3">
            <div className="text-xs text-white/40">{t('yourLimit')}</div>
            <div className="font-mono font-bold tabular-nums">{ipo.max_per_user} {t('licensesUnit', { defaultMessage: 'Scout Cards' })}</div>
          </div>
          <div className="bg-surface-minimal rounded-lg p-3">
            <div className="text-xs text-white/40">{t('alreadyBought')}</div>
            <div className="font-mono font-bold tabular-nums">{userPurchased} {t('licensesUnit', { defaultMessage: 'Scout Cards' })}</div>
          </div>
        </div>
        {/* Buy form */}
        {canBuyMore && maxBuy > 0 ? (
          <>
            <div>
              <label className="text-xs text-white/50 mb-2 block">{t('quantity')}</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setBuyQty(Math.max(1, buyQty - 1))} aria-label={t('decreaseQty')}
                  className="size-11 min-w-[44px] min-h-[44px] rounded-xl bg-surface-base border border-white/10 font-bold hover:bg-white/10">-</button>
                <input type="number" inputMode="numeric" value={buyQty} min={1} max={maxBuy}
                  aria-label={t('qtyLabel')}
                  onChange={(e) => setBuyQty(Math.max(1, Math.min(maxBuy, parseInt(e.target.value) || 1)))}
                  className="flex-1 text-center bg-surface-base border border-white/10 rounded-xl py-2 font-mono font-bold text-base" />
                <button onClick={() => setBuyQty(Math.min(maxBuy, buyQty + 1))} aria-label={t('increaseQty')}
                  className="size-11 min-w-[44px] min-h-[44px] rounded-xl bg-surface-base border border-white/10 font-bold hover:bg-white/10">+</button>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">{t('pricePerDpc')}</span>
                <span className="font-mono tabular-nums text-white/60">{fmtScout(priceBsd)} CR</span>
              </div>
              {buyQty > 1 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{t('quantity')}</span>
                  <span className="font-mono tabular-nums text-white/60">&times; {buyQty}</span>
                </div>
              )}
              <div className="border-t border-white/10 pt-2 flex items-center justify-between">
                <span className="text-white/50 text-sm">{t('totalCost')}</span>
                <span className="font-mono font-black tabular-nums text-xl text-gold">{fmtScout(totalBsd)} CR</span>
              </div>
              <div className="border-t border-white/10 pt-2 flex items-center justify-between text-xs">
                <span className="text-white/40">{t('yourBalance')}</span>
                <span className="font-mono tabular-nums text-white/50">{balanceCents !== null ? formatScout(balanceCents) : '...'} CR</span>
              </div>
              {balanceCents !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">{t('balanceAfter')}</span>
                  <span className={`font-mono font-bold tabular-nums ${canAfford ? 'text-green-500' : 'text-red-400'}`}>
                    {formatScout(Math.max(0, balanceCents - totalCents))} CR
                  </span>
                </div>
              )}
            </div>
            <Button variant="gold" fullWidth size="lg" onClick={() => onBuy(buyQty)} disabled={buying || !canAfford}>
              {buying ? <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Zap className="size-5" aria-hidden="true" />}
              {buying ? t('buying') : t('commitDpc', { qty: buyQty })}
            </Button>
            {!canAfford && !buying && <div className="text-xs text-red-400 text-center">{t('notEnoughScout')}</div>}
            <TradingDisclaimer />
          </>
        ) : (
          <div className="bg-surface-subtle rounded-xl p-4 text-center">
            <Lock className="size-8 mx-auto mb-2 text-white/30" aria-hidden="true" />
            <div className="text-white/50">{t('limitReached')}</div>
            <div className="text-xs text-white/30 text-pretty">{t('limitReachedMax')}</div>
          </div>
        )}
      </div>
    </Card>
  );
}
