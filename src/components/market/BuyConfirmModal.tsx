'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Zap, ShoppingCart, Info, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { getPlayerSentimentCounts } from '@/lib/services/research';
import type { Player } from '@/types';

/** Lightweight sentiment counts for a single player (only fetched when modal opens) */
function usePlayerSentiment(playerId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['sentiment', playerId],
    queryFn: () => getPlayerSentimentCounts(playerId),
    enabled,
    staleTime: 60_000,
  });
}

interface BuyConfirmModalProps {
  open: boolean;
  onClose: () => void;
  player: Player;
  source: 'market' | 'ipo';
  priceCents: number;
  maxQty: number;
  balanceCents: number;
  isPending: boolean;
  onConfirm: (qty: number) => void;
  ipoProgress?: number;
  ipoRemaining?: number;
}

// Qty selector buttons — shared style with BuyModal.tsx BuyForm pattern
// Not extracted into shared component because contexts diverge
// (BuyForm has inline buy action, this is a confirmation step)
const QTY_BTN = 'size-9 min-w-[44px] min-h-[44px] rounded-lg bg-white/5 border border-white/10 font-bold transition-colors flex items-center justify-center disabled:opacity-50 hover:bg-white/10 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50';

export default function BuyConfirmModal({
  open, onClose, player, source, priceCents, maxQty,
  balanceCents, isPending, onConfirm, ipoProgress, ipoRemaining,
}: BuyConfirmModalProps) {
  const t = useTranslations('market');
  const tp = useTranslations('playerDetail');
  const [qty, setQty] = useState(1);
  const { data: sentiment } = usePlayerSentiment(player.id, open);

  const priceBsd = centsToBsd(priceCents);
  const isMarket = source === 'market';
  const effectiveQty = isMarket ? 1 : Math.min(qty, maxQty);
  const totalCents = priceCents * effectiveQty;
  const totalBsd = priceBsd * effectiveQty;
  const canAfford = balanceCents >= totalCents && totalCents > 0;
  const balanceAfter = Math.max(0, balanceCents - totalCents);

  const handleConfirm = () => {
    if (isPending || !canAfford) return;
    onConfirm(effectiveQty);
  };

  // Empty state: nothing available to buy
  if (priceCents <= 0 || maxQty <= 0) {
    return (
      <Modal open={open} onClose={onClose} title={t('confirmBuyTitle')} subtitle={`${player.first} ${player.last}`} size="sm">
        <div className="py-8 text-center space-y-3">
          <AlertCircle className="size-8 mx-auto text-white/20" aria-hidden="true" />
          <p className="text-sm text-white/50">
            {isMarket
              ? t('noTransferListings')
              : t('ipoSoldOut', { defaultMessage: 'Dieser Erstverkauf ist ausverkauft.' })}
          </p>
          <Button variant="ghost" onClick={onClose} fullWidth>
            {tp('cancelAction', { defaultMessage: 'Abbrechen' })}
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title={t('confirmBuyTitle')} subtitle={`${player.first} ${player.last}`} size="sm">
      <div className="space-y-4">
        {/* Player identity */}
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] rounded-xl p-3">
          <PlayerIdentity player={player} size="sm" showStatus className="flex-1 min-w-0" />
        </div>

        {/* Source badge */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold',
          isMarket
            ? 'bg-sky-500/10 border border-sky-500/20 text-sky-300'
            : 'bg-green-500/10 border border-green-500/20 text-green-400'
        )}>
          {isMarket
            ? <ShoppingCart className="size-3.5" aria-hidden="true" />
            : <Zap className="size-3.5" aria-hidden="true" />
          }
          {isMarket ? t('transferListBadge') : t('clubSale', { defaultMessage: 'Club Verkauf' })}
        </div>

        {/* Community Sentiment (Scout Reports) */}
        {sentiment && sentiment.total > 0 && (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-white/40 font-semibold">{t('communityLabel', { defaultMessage: 'Community' })}:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="size-3" aria-hidden="true" />
                <span className="font-mono font-bold tabular-nums">{sentiment.bullish}</span>
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <TrendingDown className="size-3" aria-hidden="true" />
                <span className="font-mono font-bold tabular-nums">{sentiment.bearish}</span>
              </span>
              {sentiment.neutral > 0 && (
                <span className="flex items-center gap-1 text-white/40">
                  <Minus className="size-3" aria-hidden="true" />
                  <span className="font-mono font-bold tabular-nums">{sentiment.neutral}</span>
                </span>
              )}
            </div>
            {/* Sentiment bar */}
            {sentiment.total >= 2 && (
              <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: `${(sentiment.bullish / sentiment.total) * 100}%` }} />
                <div className="h-full bg-red-500 rounded-r-full" style={{ width: `${(sentiment.bearish / sentiment.total) * 100}%` }} />
              </div>
            )}
          </div>
        )}

        {/* Price + Quantity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/50">{tp('pricePerDpc', { defaultMessage: 'Preis pro DPC' })}</span>
            <span className="font-mono font-black text-gold tabular-nums">{fmtScout(priceBsd)} bCredits</span>
          </div>

          {/* Quantity selector — only for IPO (market RPC is hardcoded to qty=1) */}
          {!isMarket && maxQty > 1 ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/50">{tp('qtyLabel', { defaultMessage: 'Anzahl' })}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={isPending || qty <= 1}
                  aria-label={tp('decreaseQty', { defaultMessage: 'Anzahl verringern' })}
                  className={QTY_BTN}
                >&minus;</button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={qty}
                  min={1}
                  max={maxQty}
                  disabled={isPending}
                  aria-label={tp('qtyLabel', { defaultMessage: 'Anzahl' })}
                  onChange={(e) => setQty(Math.max(1, Math.min(maxQty, parseInt(e.target.value) || 1)))}
                  className="w-12 min-h-[44px] text-center bg-white/5 border border-white/10 rounded-lg py-1.5 font-mono font-bold text-base tabular-nums disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
                />
                <button
                  onClick={() => setQty(Math.min(maxQty, qty + 1))}
                  disabled={isPending || qty >= maxQty}
                  aria-label={tp('increaseQty', { defaultMessage: 'Anzahl erhoehen' })}
                  className={QTY_BTN}
                >+</button>
              </div>
            </div>
          ) : isMarket ? (
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">{tp('qtyLabel', { defaultMessage: 'Anzahl' })}</span>
              <span className="font-mono font-bold tabular-nums">1 DPC</span>
            </div>
          ) : null}

          {/* IPO progress */}
          {!isMarket && ipoProgress !== undefined && ipoRemaining !== undefined && (
            <div className="space-y-1">
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-gold to-[#E6B800] rounded-full transition-all" style={{ width: `${ipoProgress}%` }} />
              </div>
              <div className="text-[10px] text-white/30 font-mono tabular-nums text-right">{t('remaining', { count: fmtScout(ipoRemaining) })}</div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/[0.06]" />

        {/* Fee info */}
        <div className="flex items-center gap-2 text-xs text-white/40">
          <Info className="size-3.5 flex-shrink-0" aria-hidden="true" />
          {isMarket ? t('feeInfoMarket') : t('feeInfoIpo')}
        </div>

        {/* Total + Balance */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white/70">{tp('total', { defaultMessage: 'Gesamt' })}</span>
            <span className="font-mono font-black text-lg text-gold tabular-nums">{fmtScout(totalBsd)} bCredits</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">{tp('after', { defaultMessage: 'Guthaben danach' })}</span>
            <span className={cn('font-mono font-bold tabular-nums', canAfford ? 'text-green-500' : 'text-red-400')}>
              {fmtScout(centsToBsd(balanceAfter))} bCredits
            </span>
          </div>
        </div>

        {/* Not enough balance warning */}
        {!canAfford && (
          <div className="text-center text-xs text-red-400 font-bold">
            {tp('notEnoughScout', { defaultMessage: 'Nicht genug bCredits' })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isPending} fullWidth>
            {tp('cancelAction', { defaultMessage: 'Abbrechen' })}
          </Button>
          <Button
            variant="gold"
            onClick={handleConfirm}
            disabled={isPending || !canAfford}
            fullWidth
            loading={isPending}
          >
            {isPending ? t('buying') : t('confirmBuy')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
