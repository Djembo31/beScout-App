'use client';

/**
 * SellModalCore — Shared implementation for all Scout Card sell flows.
 *
 * Used by:
 * - `src/components/player/detail/SellModal.tsx` (Player-Detail context: full orientation + accept-bid)
 * - `src/features/manager/components/kader/KaderSellModal.tsx` (Bestand context: compact inline listings)
 *
 * Single source of truth for:
 * - Quantity + Price inputs (with quick-price presets)
 * - Fee breakdown (gross / fee / net using TRADE_FEE_PCT constant)
 * - preventClose during mutation (protects state on ESC/backdrop)
 * - i18n-ready error/success rendering
 *
 * Context-specific UI (Position Card, Orientation Bar, My Listings, Accept Bids, Incoming Offers)
 * is composed via slot props — the Core stays lean.
 */

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Send, Loader2, CheckCircle2, XCircle, Lock } from 'lucide-react';
import { Modal, Card, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { TradingDisclaimer } from '@/components/legal/TradingDisclaimer';
import { TRADE_FEE_PCT } from '@/lib/constants';

export interface SellModalCoreProps {
  open: boolean;
  onClose: () => void;
  /** Modal title (e.g., t('sell') or t('sellModalTitle')). */
  title: string;
  /** Modal subtitle (e.g., "First Last" or "First Last · Club"). */
  subtitle: string;

  /** Player state. */
  holdingQty: number;
  availableToSell: number;
  floorBsd: number | null;
  isLiquidated?: boolean;

  /** Current in-flight state (parent-controlled — single source). */
  selling: boolean;
  cancellingId?: string | null;
  /** Additional busy flag (e.g., acceptingBidId) that should keep modal locked. */
  additionalBusy?: boolean;

  /** Error/success messages (already resolved via i18n by parent). */
  error?: string | null;
  success?: string | null;

  /** Called with BSD (display units) price — Core converts to cents via callback args. */
  onSubmit: (qty: number, priceCents: number) => void | Promise<void>;

  /** Submit button label resolver. Receives current qty + formatted price for dynamic copy. */
  renderSubmitLabel?: (qty: number, price: string) => React.ReactNode;

  /** Slots */
  headerSlot?: React.ReactNode;        // rendered between error/liquidation alerts and the form
  beforeFormSlot?: React.ReactNode;    // rendered directly above the sell form card
  afterFormSlot?: React.ReactNode;     // rendered directly below the sell form card
  /** Render the trading disclaimer inside the footer (default: true). */
  withDisclaimer?: boolean;
}

/**
 * Core sell modal body. Renders form (qty + price + fee breakdown) and composes slot content
 * around it. Parent owns error/success state so both messages can be i18n-resolved per caller.
 */
export function SellModalCore({
  open,
  onClose,
  title,
  subtitle,
  holdingQty,
  availableToSell,
  floorBsd,
  isLiquidated = false,
  selling,
  cancellingId = null,
  additionalBusy = false,
  error,
  success,
  onSubmit,
  renderSubmitLabel,
  headerSlot,
  beforeFormSlot,
  afterFormSlot,
  withDisclaimer = true,
}: SellModalCoreProps) {
  const t = useTranslations('market');
  const tp = useTranslations('playerDetail');
  const [qty, setQty] = useState(1);
  const [priceBsd, setPriceBsd] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const busy = selling || cancellingId !== null || additionalBusy;
  const priceNum = parseFloat(priceBsd) || 0;
  const isValidSubmit = qty > 0 && qty <= availableToSell && priceNum > 0 && !isLiquidated;

  // Fee breakdown (single-source via TRADE_FEE_PCT)
  const gross = qty * priceNum;
  const fee = (gross * TRADE_FEE_PCT) / 100;
  const net = gross - fee;
  const showFee = priceNum > 0;

  const handleSubmit = async () => {
    if (isLiquidated) return;
    if (qty < 1 || qty > availableToSell) {
      setLocalError(t('invalidQty'));
      return;
    }
    const priceCents = Math.round(priceNum * 100);
    if (priceCents < 1) {
      setLocalError(tp('minPriceError'));
      return;
    }
    setLocalError(null);
    await onSubmit(qty, priceCents);
  };

  const displayError = error || localError;
  const priceLabel = priceNum > 0 ? fmtScout(priceNum) : '...';

  const setQuickPrice = (multiplier: number) => {
    if (floorBsd == null || floorBsd <= 0) return;
    setPriceBsd(Math.ceil(floorBsd * multiplier).toString());
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      preventClose={busy}
      footer={availableToSell > 0 && !isLiquidated ? (
        <div>
          <Button
            variant="gold"
            fullWidth
            size="lg"
            onClick={handleSubmit}
            disabled={!isValidSubmit || selling}
          >
            {selling
              ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              : <Send className="size-4" aria-hidden="true" />}
            {selling
              ? tp('listing')
              : (renderSubmitLabel ? renderSubmitLabel(qty, priceLabel) : tp('listForPrice', { price: priceLabel }))}
          </Button>
          {withDisclaimer && <TradingDisclaimer />}
        </div>
      ) : undefined}
    >
      <div className="space-y-4">
        {/* Toast: Success */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 text-green-500 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {success}
          </div>
        )}

        {/* Toast: Error */}
        {displayError && (
          <div role="alert" className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
            <XCircle className="size-4" aria-hidden="true" />
            {displayError}
          </div>
        )}

        {/* Liquidation Warning */}
        {isLiquidated && (
          <div role="alert" className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
            <Lock className="size-4" aria-hidden="true" />
            {tp('tradingLockedLiquidated')}
          </div>
        )}

        {/* Context-specific header slot (Position Card, etc.) */}
        {headerSlot}

        {/* Context-specific pre-form slot (Orientation, Accept Bids, My Listings, Offers) */}
        {beforeFormSlot}

        {/* Sell Form */}
        {availableToSell > 0 && !isLiquidated && (
          <Card className="p-4 space-y-3">
            <span className="font-bold text-sm">{tp('newOrder')}</span>

            {/* Quantity */}
            <div>
              <label className="text-xs text-white/50 mb-1 block">
                {tp('qtyMax', { max: availableToSell })}
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label={tp('decreaseQty')}
                  className="size-11 min-w-[44px] min-h-[44px] rounded-lg bg-surface-base border border-white/10 font-bold hover:bg-white/10 text-sm"
                >-</button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={qty}
                  min={1}
                  max={availableToSell}
                  aria-label={tp('sellQtyAria')}
                  onChange={(e) =>
                    setQty(Math.max(1, Math.min(availableToSell, parseInt(e.target.value) || 1)))
                  }
                  className="flex-1 text-center bg-surface-base border border-white/10 rounded-lg py-1.5 font-mono font-bold text-base"
                />
                <button
                  onClick={() => setQty(Math.min(availableToSell, qty + 1))}
                  aria-label={tp('increaseQty')}
                  className="size-11 min-w-[44px] min-h-[44px] rounded-lg bg-surface-base border border-white/10 font-bold hover:bg-white/10 text-sm"
                >+</button>
              </div>
            </div>

            {/* Price */}
            <div>
              <label className="text-xs text-white/50 mb-1 block">{tp('pricePerDpcScout')}</label>
              <input
                type="number"
                inputMode="numeric"
                value={priceBsd}
                min={1}
                step={1}
                placeholder={floorBsd != null && floorBsd > 0 ? tp('examplePrice', { price: floorBsd }) : tp('enterPrice')}
                aria-label={tp('pricePerDpcLabel')}
                onChange={(e) => setPriceBsd(e.target.value)}
                className="w-full bg-surface-base border border-white/10 rounded-lg px-3 py-2.5 font-mono font-bold text-base"
              />

              {/* Quick-Price Presets */}
              {floorBsd != null && floorBsd > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setQuickPrice(1)}
                    disabled={selling}
                    className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-surface-base border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  >Floor</button>
                  <button
                    onClick={() => setQuickPrice(1.05)}
                    disabled={selling}
                    className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-surface-base border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  >+5%</button>
                  <button
                    onClick={() => setQuickPrice(1.10)}
                    disabled={selling}
                    className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-surface-base border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  >+10%</button>
                  <button
                    onClick={() => setQuickPrice(1.20)}
                    disabled={selling}
                    className="px-2.5 min-h-[44px] flex items-center justify-center rounded-lg bg-surface-base border border-white/10 text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                  >+20%</button>
                  <span className="text-[10px] text-white/30 ml-1">Floor: {fmtScout(floorBsd)}</span>
                </div>
              )}
            </div>

            {/* Fee Breakdown */}
            {showFee && (
              <div className="bg-black/20 rounded-lg px-3 py-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">{tp('gross')}</span>
                  <span className="font-mono tabular-nums text-white/50">{fmtScout(gross)} CR</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/50">{tp('feePercent', { pct: TRADE_FEE_PCT })}</span>
                  <span className="font-mono tabular-nums text-red-400/70">-{fmtScout(fee)} CR</span>
                </div>
                <div className="border-t border-white/10 pt-1.5 flex items-center justify-between text-sm">
                  <span className="text-white/50">{tp('netProceeds')}</span>
                  <span className="font-mono font-bold tabular-nums text-gold">{fmtScout(net)} CR</span>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* "All listed / nothing available" empty state */}
        {availableToSell === 0 && !isLiquidated && holdingQty > 0 && (
          <div className="text-center py-3 text-xs text-white/25">
            {t('sellAllListed')}
          </div>
        )}

        {/* Context-specific post-form slot (Active Listings, etc.) */}
        {afterFormSlot}
      </div>
    </Modal>
  );
}

export default SellModalCore;
