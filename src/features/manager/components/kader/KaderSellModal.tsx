'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Tag, Loader2, Trash2, MessageSquare, Clock } from 'lucide-react';
import { cn, fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import { SellModalCore } from '@/components/trading/SellModalCore';
import { TRADE_FEE_PCT } from '@/lib/constants';
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
 * Adds kader-context UI:
 *   - Inline "My Listings" strip with cancel + net preview + expiry
 *   - Incoming Offers preview with link to /market?tab=angebote
 *   - Locked SC info pill
 *
 * Core owns: form, fee breakdown, preventClose, disclaimer, error/success rendering.
 * Adapts (playerId, qty, price) → Promise<{success, error}> signature into
 * the Core's (qty, price) → Promise<void> via closure + local state.
 */
export default function KaderSellModal({ item, open, onClose, onSell, onCancelOrder }: KaderSellModalProps) {
  const t = useTranslations('market');
  const [selling, setSelling] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!item) return null;

  const handleSubmit = async (qty: number, priceCents: number) => {
    setSelling(true);
    setError(null);
    setSuccess(null);
    const result = await onSell(item.player.id, qty, priceCents);
    if (result.success) {
      setSuccess(t('sellListSuccess', { qty, price: fmtScout(priceCents / 100) }));
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(result.error || t('sellError'));
    }
    setSelling(false);
  };

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    setError(null);
    setSuccess(null);
    try {
      const result = await onCancelOrder(orderId);
      if (!result.success) {
        setError(result.error || t('cancelFailed'));
      } else {
        setSuccess(t('sellCancelSuccess'));
        setTimeout(() => setSuccess(null), 3000);
      }
    } finally {
      setCancellingId(null);
    }
  };

  const subtitle = `${item.player.first} ${item.player.last} \u00B7 ${item.player.club}`; // middle-dot

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
