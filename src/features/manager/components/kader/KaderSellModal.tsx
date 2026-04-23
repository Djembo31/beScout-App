'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { Tag, Loader2, Trash2, MessageSquare, Clock } from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { SellModalCore } from '@/components/trading/SellModalCore';
import { TRADE_FEE_PCT } from '@/lib/constants';
import { useSafeMutation } from '@/lib/hooks/useSafeMutation';
import { invalidateWallet } from '@/lib/hooks/useWallet';
import type { KaderPlayer } from './KaderPlayerRow';

interface KaderSellModalProps {
  item: KaderPlayer | null;
  open: boolean;
  onClose: () => void;
  onSell: (playerId: string, qty: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Kader/Bestand Sell Modal — thin wrapper around SellModalCore.
 *
 * Slice 158 Ferrari-Refactor (analog 156 + 157):
 * - 2x `useSafeMutation` intern (sellMut, cancelMut).
 * - Synchroner Pending-Guard (Slice 151a Primitive) — rapid-click short-circuit.
 * - `useQueryClient()` statt Singleton (P2.2-Konvention).
 * - `onSettled: invalidateWallet(qc)` defensive (sell/cancel touchen Escrow).
 * - `errorTag`: `market.kaderSell` / `market.kaderCancelOrder` (Sentry-Observability).
 * - Callback-API (`onSell`/`onCancelOrder`) unveraendert — Parents (KaderTab, BestandView)
 *   kompilieren byte-identisch.
 *
 * Adds kader-context UI:
 *   - Inline "My Listings" strip with cancel + net preview + expiry
 *   - Incoming Offers preview with link to /market?tab=angebote
 *   - Locked SC info pill
 *
 * Core owns: form, fee breakdown, preventClose, disclaimer, error/success rendering.
 */
export default function KaderSellModal({ item, open, onClose, onSell, onCancelOrder }: KaderSellModalProps) {
  const t = useTranslations('market');
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Sell Mutation ──────────────────────────────────────────
  const sellMut = useSafeMutation<
    { success: boolean; error?: string },
    Error,
    { playerId: string; qty: number; priceCents: number }
  >({
    mutationFn: async ({ playerId, qty, priceCents }) => {
      const result = await onSell(playerId, qty, priceCents);
      if (!result.success) throw new Error(result.error || 'sellError');
      return result;
    },
    onSuccess: (_result, { qty, priceCents }) => {
      setSuccess(t('sellListSuccess', { qty, price: fmtScout(priceCents / 100) }));
      setTimeout(() => setSuccess(null), 4000);
    },
    onError: (err) => {
      setError(err.message || t('sellError'));
    },
    onSettled: () => {
      // Escrow/floor-price changes server-side — refresh wallet-cache post-commit.
      invalidateWallet(qc);
    },
    errorTag: 'market.kaderSell',
  });

  // ── Cancel Order Mutation ──────────────────────────────────
  const cancelMut = useSafeMutation<
    { success: boolean; error?: string },
    Error,
    { orderId: string }
  >({
    mutationFn: async ({ orderId }) => {
      const result = await onCancelOrder(orderId);
      if (!result.success) throw new Error(result.error || 'cancelFailed');
      return result;
    },
    onSuccess: () => {
      setSuccess(t('sellCancelSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err) => {
      setError(err.message || t('cancelFailed'));
    },
    onSettled: () => {
      // cancel unlocks sell-order quantity from holdings → wallet-available delta possible.
      invalidateWallet(qc);
    },
    errorTag: 'market.kaderCancelOrder',
  });

  // ── Wrapper-Methoden — Consumer-API Kompat ─────────────────
  const handleSubmit = useCallback(
    async (qty: number, priceCents: number) => {
      if (!item) return;
      if (sellMut.isPending) return;
      setError(null);
      setSuccess(null);
      try {
        await sellMut.mutateAsync({ playerId: item.player.id, qty, priceCents });
      } catch {
        // onError handled.
      }
    },
    [sellMut, item],
  );

  const handleCancel = useCallback(
    async (orderId: string) => {
      if (cancelMut.isPending) return;
      setError(null);
      setSuccess(null);
      try {
        await cancelMut.mutateAsync({ orderId });
      } catch {
        // onError handled.
      }
    },
    [cancelMut],
  );

  if (!item) return null;

  // Derived state from mutations.
  const selling = sellMut.isPending;
  const cancellingId = cancelMut.isPending ? cancelMut.variables?.orderId ?? null : null;

  const subtitle = `${item.player.first} ${item.player.last} · ${item.player.club}`; // middle-dot

  // My Listings (inline) + Incoming Offers + Locked info — rendered before the form
  const beforeForm = (
    <>
      {/* My Listings */}
      {item.myListings.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-[10px] text-gold/60 uppercase font-black mb-2">
            <Tag className="size-3" aria-hidden="true" /> {t('sellMyListings')}
          </div>
          <div className="space-y-1.5">
            {item.myListings.map(listing => {
              const daysLeft = Math.max(0, Math.floor((listing.expiresAt - Date.now()) / 86_400_000));
              const hoursLeft = Math.max(0, Math.floor((listing.expiresAt - Date.now()) / 3_600_000));
              const isExpiringSoon = daysLeft < 3;
              const netBsd = listing.priceBsd * listing.qty * (1 - TRADE_FEE_PCT / 100);
              return (
                <div key={listing.id} className="flex items-center justify-between px-3 py-2 bg-gold/[0.03] border border-gold/10 rounded-xl">
                  <div className="text-sm">
                    <span className="font-mono font-bold tabular-nums">{listing.qty}&times;</span>
                    <span className="text-gold font-mono font-bold tabular-nums ml-2">{fmtScout(listing.priceBsd)} CR</span>
                    <span className="text-white/25 text-xs ml-2">
                      ({t('sellNetShort')} {fmtScout(netBsd)})
                    </span>
                    {listing.expiresAt > 0 && (
                      <span className={cn(
                        'inline-flex items-center gap-0.5 text-[10px] ml-2 font-mono tabular-nums',
                        isExpiringSoon ? 'text-amber-400/70' : 'text-white/25',
                      )}>
                        <Clock className="size-2.5" aria-hidden="true" />
                        {daysLeft > 0 ? `${daysLeft}d` : `${hoursLeft}h`}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCancel(listing.id)}
                    disabled={cancellingId === listing.id}
                    className="flex items-center gap-1 px-2 py-1 min-h-[44px] text-[10px] font-bold text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    {cancellingId === listing.id
                      ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                      : <Trash2 className="size-3" aria-hidden="true" />}
                    {t('sellCancel')}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Incoming Offers */}
      {item.offers.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-[10px] text-sky-400/60 uppercase font-black mb-2">
            <MessageSquare className="size-3" aria-hidden="true" /> {t('sellIncomingOffers')}
          </div>
          <div className="space-y-1.5">
            {item.offers.map(offer => (
              <Link
                key={offer.id}
                href="/market?tab=angebote"
                className="flex items-center justify-between px-3 py-2 bg-sky-500/[0.03] border border-sky-400/10 rounded-xl hover:bg-sky-500/[0.06] transition-colors"
              >
                <div className="text-sm">
                  <span className="text-sky-300 font-bold">@{offer.sender_handle}</span>
                  <span className="text-white/40 mx-2">{t('sellOfferText')}</span>
                  <span className="font-mono font-bold tabular-nums">{offer.quantity}&times;</span>
                  <span className="text-gold font-mono font-bold tabular-nums ml-1">
                    {fmtScout(centsToBsd(offer.price))} CR
                  </span>
                </div>
                <span className="text-[10px] text-sky-400/50 font-bold">{t('sellViewOffer')} &rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Locked SC info */}
      {item.lockedQty > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs">
          <span className="text-purple-300 font-bold">
            {t('sellLockedInfo', {
              total: item.quantity,
              locked: item.lockedQty,
              listed: item.listedQty,
              available: item.availableToSell,
            })}
          </span>
        </div>
      )}
    </>
  );

  return (
    <SellModalCore
      open={open}
      onClose={onClose}
      title={t('sellModalTitle')}
      subtitle={subtitle}
      holdingQty={item.quantity}
      availableToSell={item.availableToSell}
      floorBsd={item.floorBsd ?? (item.avgBuyPriceBsd > 0 ? item.avgBuyPriceBsd : null)}
      selling={selling}
      cancellingId={cancellingId}
      error={error}
      success={success}
      onSubmit={handleSubmit}
      renderSubmitLabel={(qty, price) => t('sellListCta', { qty, price })}
      beforeFormSlot={beforeForm}
    />
  );
}
