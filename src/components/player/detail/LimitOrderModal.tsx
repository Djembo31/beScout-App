'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, Bell } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';

interface LimitOrderModalProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  floorPrice: number;
}

export default function LimitOrderModal({ open, onClose, playerName, floorPrice }: LimitOrderModalProps) {
  const t = useTranslations('playerDetail');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleClose = () => {
    setSubmitted(false);
    setPrice('');
    setQty('1');
    setSide('buy');
    onClose();
  };

  return (
    // Placeholder UI — Feature nur "Coming Soon" (handleSubmit setzt lediglich
    // submitted=true). Sobald echte Mutation live ist, MUSS `preventClose` auf
    // die Pending-Flag umgestellt werden (analog BuyModal/SellModal), damit
    // ESC/Backdrop-Klick waehrend einer Geld-Mutation nicht den State verliert.
    // TODO preventClose={mutationInFlight} wenn Feature live ist.
    <Modal open={open} onClose={handleClose} title={t('limitOrderTitle')} preventClose={false}>
      <div className="space-y-4 p-1">
        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="mx-auto size-14 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center">
              <Bell className="size-7 text-gold" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-black">{t('limitOrderComingSoon')}</h3>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs mx-auto">
              {t('limitOrderComingSoonDesc')}
            </p>
            <Button variant="gold" onClick={handleClose} className="mt-4">
              {t('limitOrderOk')}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-white/50">{t('limitOrderDesc', { player: playerName })}</p>

            {/* Side Toggle */}
            <div className="flex gap-2" role="radiogroup" aria-label={t('limitOrderTitle')}>
              <button
                role="radio"
                aria-checked={side === 'buy'}
                onClick={() => setSide('buy')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none ${
                  side === 'buy'
                    ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                    : 'bg-surface-subtle border border-white/10 text-white/40 hover:bg-white/[0.06] hover:text-white/60'
                }`}
              >
                {t('limitOrderBuy')}
              </button>
              <button
                role="radio"
                aria-checked={side === 'sell'}
                onClick={() => setSide('sell')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none ${
                  side === 'sell'
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400'
                    : 'bg-surface-subtle border border-white/10 text-white/40 hover:bg-white/[0.06] hover:text-white/60'
                }`}
              >
                {t('limitOrderSell')}
              </button>
            </div>

            {/* Price Input */}
            <div>
              <label htmlFor="limit-price" className="text-xs text-white/50 mb-1.5 block">{t('limitOrderPrice')}</label>
              <div className="relative">
                <input
                  id="limit-price"
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder={fmtScout(floorPrice)}
                  className="w-full bg-surface-base border border-white/10 rounded-xl px-4 py-3 font-mono text-base placeholder:text-white/20 hover:border-white/20 focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 pointer-events-none">Credits</span>
              </div>
            </div>

            {/* Quantity Input */}
            <div>
              <label htmlFor="limit-qty" className="text-xs text-white/50 mb-1.5 block">{t('limitOrderQty')}</label>
              <input
                id="limit-qty"
                type="number"
                inputMode="numeric"
                value={qty}
                min={1}
                onChange={e => setQty(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-xl px-4 py-3 font-mono text-base placeholder:text-white/20 hover:border-white/20 focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 transition-colors"
              />
            </div>

            {/* Current Price Info */}
            <div className="flex items-center justify-between text-xs text-white/40 bg-surface-minimal rounded-lg px-3 py-2">
              <span>{t('limitOrderCurrentFloor')}</span>
              <span className="font-mono font-bold text-white/60">{fmtScout(floorPrice)} CR</span>
            </div>

            {/* Submit */}
            <Button variant="gold" fullWidth size="lg" onClick={handleSubmit}>
              <Clock className="size-4" aria-hidden="true" />
              {t('limitOrderSubmit')}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
