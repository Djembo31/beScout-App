'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, AlertCircle, ShoppingCart } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { PlayerIdentity } from '@/components/player';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { useUser } from '@/components/providers/AuthProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { usePlaceBuyOrder } from '@/lib/mutations/trading';
import type { Player } from '@/types';

interface BuyOrderModalProps {
  player: Player | null;
  open: boolean;
  onClose: () => void;
}

export default function BuyOrderModal({ player, open, onClose }: BuyOrderModalProps) {
  const t = useTranslations('market');
  const tc = useTranslations('common');
  const tp = useTranslations('playerDetail');
  const { user } = useUser();
  const { balanceCents, lockedBalanceCents } = useWallet();

  const [qty, setQty] = useState(1);
  const [priceBsd, setPriceBsd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { mutate: doPlace, isPending } = usePlaceBuyOrder();

  // Reset form when modal opens with new player
  useEffect(() => {
    if (open) {
      setQty(1);
      setPriceBsd('');
      setError(null);
      setSuccess(null);
    }
  }, [open, player?.id]);

  if (!player) return null;

  const priceNum = parseFloat(priceBsd) || 0;
  const priceCents = Math.round(priceNum * 100);
  const totalBsd = qty * priceNum;
  const totalCents = qty * priceCents;
  const availableCents = (balanceCents ?? 0) - (lockedBalanceCents ?? 0);
  const availableBsd = centsToBsd(availableCents);
  const balanceAfter = availableBsd - totalBsd;
  const isValid = qty > 0 && priceNum > 0 && totalCents <= availableCents && !!user;

  const handleSubmit = () => {
    if (!isValid || !user) return;
    setError(null);
    setSuccess(null);
    doPlace(
      { userId: user.id, playerId: player.id, quantity: qty, maxPriceCents: priceCents },
      {
        onSuccess: () => {
          setSuccess(t('buyOrderPlaced'));
          setPriceBsd('');
          setQty(1);
          setTimeout(() => {
            setSuccess(null);
            onClose();
          }, 2000);
        },
        onError: (err) => {
          setError(err instanceof Error ? err.message : tc('unknownError'));
        },
      }
    );
  };

  // Quick price from floor — player.prices.floor is already in BSD (converted in dbToPlayer)
  const floorBsd = player.prices.floor ?? 0;

  const setQuickPrice = (value: number) => {
    setPriceBsd(value.toFixed(2));
  };

  const subtitle = `${player.first} ${player.last} · ${player.club}`;

  return (
    <Modal
      open={open}
      title={t('buyOrder')}
      subtitle={subtitle}
      onClose={onClose}
      size="sm"
      footer={
        <div className="space-y-2">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            variant="gold"
            className="w-full"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" aria-hidden="true" />
            ) : (
              <ShoppingCart className="size-4 mr-2" aria-hidden="true" />
            )}
            {isPending ? t('buyOrderPlacing') : t('placeBuyOrder')}
          </Button>
          {error && (
            <div className="text-xs text-red-400 flex items-center gap-1" role="alert">
              <AlertCircle className="size-3" aria-hidden="true" />{error}
            </div>
          )}
          {success && (
            <div className="text-xs text-green-500 font-bold">{success}</div>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Player info */}
        <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-minimal border border-white/[0.08] rounded-xl">
          <PlayerIdentity player={player} size="sm" className="flex-1 min-w-0" />
        </div>

        {/* Quantity + Price inputs */}
        <div className="space-y-3">
          {/* Quantity */}
          <div>
            <label className="text-[11px] text-white/40 font-bold uppercase mb-1.5 block">{t('quantity')}</label>
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2 w-fit">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="px-2 py-2.5 min-w-[44px] min-h-[44px] text-white/40 hover:text-white text-sm font-bold"
                aria-label={tp('decreaseQty', { defaultMessage: 'Anzahl verringern' })}
              >
                &minus;
              </button>
              <span className="w-8 text-center text-sm font-mono font-bold tabular-nums">{qty}</span>
              <button
                onClick={() => setQty(Math.min(300, qty + 1))}
                className="px-2 py-2.5 min-w-[44px] min-h-[44px] text-white/40 hover:text-white text-sm font-bold"
                aria-label={tp('increaseQty', { defaultMessage: 'Anzahl erhoehen' })}
              >
                +
              </button>
            </div>
          </div>

          {/* Max price per DPC */}
          <div>
            <label className="text-[11px] text-white/40 font-bold uppercase mb-1.5 block">{t('maxPrice')}</label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={priceBsd}
                onChange={(e) => setPriceBsd(e.target.value)}
                placeholder={t('maxPricePlaceholder')}
                aria-label={t('maxPrice')}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base font-mono focus:outline-none focus:border-gold/40 placeholder:text-white/25 pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/30 font-bold">$SCOUT</span>
            </div>
          </div>

          {/* Quick price buttons */}
          {floorBsd > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-white/25 mr-1">{t('sellQuickSelect')}</span>
              <button
                onClick={() => setQuickPrice(floorBsd)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-gold hover:border-gold/20 transition-colors"
              >
                Floor {fmtScout(floorBsd)}
              </button>
              <button
                onClick={() => setQuickPrice(floorBsd * 0.95)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-green-500 hover:border-green-500/20 transition-colors"
              >
                -5%
              </button>
              <button
                onClick={() => setQuickPrice(floorBsd * 0.90)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-green-500 hover:border-green-500/20 transition-colors"
              >
                -10%
              </button>
              <button
                onClick={() => setQuickPrice(floorBsd * 0.80)}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-green-500 hover:border-green-500/20 transition-colors"
              >
                -20%
              </button>
            </div>
          )}
        </div>

        {/* Cost summary */}
        {priceNum > 0 && (
          <div className="space-y-1.5 bg-surface-minimal border border-white/[0.06] rounded-lg px-3 py-2.5">
            <div className="flex justify-between text-[11px] font-mono tabular-nums">
              <span className="text-white/40">{t('total')}</span>
              <span className={cn('font-bold', totalCents > availableCents ? 'text-red-400' : 'text-gold')}>
                {fmtScout(totalBsd)} $SCOUT
              </span>
            </div>
            <div className="flex justify-between text-[11px] font-mono tabular-nums">
              <span className="text-white/40">{t('buyOrderBalanceAvailable')}</span>
              <span className="text-white/60">{fmtScout(availableBsd)} $SCOUT</span>
            </div>
            <div className="flex justify-between text-[11px] font-mono tabular-nums border-t border-white/[0.06] pt-1.5">
              <span className="text-white/40">{t('buyOrderBalanceAfter')}</span>
              <span className={cn('font-bold', balanceAfter < 0 ? 'text-red-400' : 'text-white/70')}>
                {fmtScout(Math.max(0, balanceAfter))} $SCOUT
              </span>
            </div>
          </div>
        )}

        {/* Info text */}
        <p className="text-[10px] text-white/25 leading-relaxed">
          {t('buyOrderInfo')}
        </p>
      </div>
    </Modal>
  );
}
