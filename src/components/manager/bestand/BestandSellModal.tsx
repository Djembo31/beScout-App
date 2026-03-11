'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Tag, Loader2, Trash2, AlertCircle, MessageSquare } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { BestandPlayer } from './BestandPlayerRow';

const FEE_RATE = 0.06;

interface BestandSellModalProps {
  item: BestandPlayer | null;
  open: boolean;
  onClose: () => void;
  onSell: (playerId: string, qty: number, priceCents: number) => Promise<{ success: boolean; error?: string }>;
  onCancelOrder: (orderId: string) => Promise<{ success: boolean; error?: string }>;
}

export default function BestandSellModal({ item, open, onClose, onSell, onCancelOrder }: BestandSellModalProps) {
  const t = useTranslations('market');
  const [qty, setQty] = useState(1);
  const [priceBsd, setPriceBsd] = useState('');
  const [selling, setSelling] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!item) return null;

  const priceNum = parseFloat(priceBsd) || 0;
  const gross = qty * priceNum;
  const fee = gross * FEE_RATE;
  const net = gross - fee;
  const isValid = qty > 0 && qty <= item.availableToSell && priceNum > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSelling(true);
    setError(null);
    setSuccess(null);
    const priceCents = Math.round(priceNum * 100);
    const result = await onSell(item.player.id, qty, priceCents);
    if (result.success) {
      setSuccess(t('sellListSuccess', { qty, price: fmtScout(priceNum) }));
      setPriceBsd('');
      setQty(1);
      setTimeout(() => setSuccess(null), 4000);
    } else {
      setError(result.error || t('sellError'));
    }
    setSelling(false);
  };

  const setQuickPrice = (multiplier: number) => {
    const base = (item.floorBsd != null && item.floorBsd > 0) ? item.floorBsd : item.avgBuyPriceBsd;
    setPriceBsd((base * multiplier).toFixed(2));
  };

  const handleCancel = async (orderId: string) => {
    setCancellingId(orderId);
    await onCancelOrder(orderId);
    setCancellingId(null);
  };

  const subtitle = `${item.player.first} ${item.player.last} · ${item.player.club}`;

  return (
    <Modal
      open={open}
      title={t('sellModalTitle')}
      subtitle={subtitle}
      onClose={onClose}
      footer={item.availableToSell > 0 ? (
        <div className="space-y-2">
          <Button onClick={handleSubmit} disabled={!isValid || selling} variant="gold" className="w-full">
            {selling ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none mr-2" aria-hidden="true" /> : <Tag className="size-4 mr-2" aria-hidden="true" />}
            {selling ? t('sellListing') : t('sellListCta', { qty, price: priceNum > 0 ? fmtScout(priceNum) : '–' })}
          </Button>
          {error && <div className="text-xs text-red-400 flex items-center gap-1" role="alert"><AlertCircle className="size-3" aria-hidden="true" />{error}</div>}
          {success && <div className="text-xs text-green-500 font-bold">{success}</div>}
        </div>
      ) : undefined}
    >
      <div className="space-y-4">
        {/* My Listings */}
        {item.myListings.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-[10px] text-gold/60 uppercase font-black mb-2">
              <Tag className="size-3" aria-hidden="true" /> {t('sellMyListings')}
            </div>
            <div className="space-y-1.5">
              {item.myListings.map(listing => (
                <div key={listing.id} className="flex items-center justify-between px-3 py-2 bg-gold/[0.03] border border-gold/10 rounded-xl">
                  <div className="text-sm">
                    <span className="font-mono font-bold tabular-nums">{listing.qty}×</span>
                    <span className="text-gold font-mono font-bold tabular-nums ml-2">{fmtScout(listing.priceBsd)} bCredits</span>
                    <span className="text-white/25 text-xs ml-2">({t('sellNetShort')} {fmtScout(listing.priceBsd * listing.qty * (1 - FEE_RATE))})</span>
                  </div>
                  <button onClick={() => handleCancel(listing.id)} disabled={cancellingId === listing.id}
                    className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-red-400/70 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                    {cancellingId === listing.id ? <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Trash2 className="size-3" aria-hidden="true" />}
                    {t('sellCancel')}
                  </button>
                </div>
              ))}
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
                <Link key={offer.id} href="/market?tab=angebote"
                  className="flex items-center justify-between px-3 py-2 bg-sky-500/[0.03] border border-sky-400/10 rounded-xl hover:bg-sky-500/[0.06] transition-colors">
                  <div className="text-sm">
                    <span className="text-sky-300 font-bold">@{offer.sender_handle}</span>
                    <span className="text-white/40 mx-2">{t('sellOfferText')}</span>
                    <span className="font-mono font-bold tabular-nums">{offer.quantity}×</span>
                    <span className="text-gold font-mono font-bold tabular-nums ml-1">{fmtScout(centsToBsd(offer.price))} bCredits</span>
                  </div>
                  <span className="text-[10px] text-sky-400/50 font-bold">{t('sellViewOffer')} &rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Sell Form */}
        {item.availableToSell > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-2">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-2 py-2.5 min-w-[44px] min-h-[44px] text-white/40 hover:text-white text-sm font-bold" aria-label="−1">&minus;</button>
                <span className="w-6 text-center text-sm font-mono font-bold tabular-nums">{qty}</span>
                <button onClick={() => setQty(Math.min(item.availableToSell, qty + 1))} className="px-2 py-2.5 min-w-[44px] min-h-[44px] text-white/40 hover:text-white text-sm font-bold" aria-label="+1">+</button>
              </div>
              <div className="relative flex-1">
                <input type="number" inputMode="numeric" step="0.01" min="0.01" value={priceBsd} onChange={(e) => setPriceBsd(e.target.value)}
                  placeholder={t('sellPricePlaceholder')}
                  aria-label={t('sellPricePlaceholder')}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base font-mono focus:outline-none focus:border-gold/40 placeholder:text-white/25 pr-12" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/30 font-bold">bCredits</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-white/25 mr-1">{t('sellQuickSelect')}</span>
              {item.floorBsd != null && item.floorBsd > 0 && (
                <button onClick={() => setQuickPrice(1)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-gold hover:border-gold/20 transition-colors">
                  Floor {fmtScout(item.floorBsd)}
                </button>
              )}
              <button onClick={() => setQuickPrice(1.05)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-green-500 hover:border-green-500/20 transition-colors">+5%</button>
              <button onClick={() => setQuickPrice(1.10)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-green-500 hover:border-green-500/20 transition-colors">+10%</button>
              <button onClick={() => setQuickPrice(1.20)} className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-bold text-white/50 hover:text-green-500 hover:border-green-500/20 transition-colors">+20%</button>
            </div>
            {priceNum > 0 && (
              <div className="flex items-center gap-4 text-[11px] font-mono bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 tabular-nums">
                <span className="text-white/40">{t('sellGross')} <span className="text-white/70">{fmtScout(gross)}</span></span>
                <span className="text-white/40">{t('sellFee')} <span className="text-red-300/70">&minus;{fmtScout(fee)}</span> <span className="text-white/20">(6%)</span></span>
                <span className="text-white/40">{t('sellNetLabel')} <span className="text-gold font-bold">{fmtScout(net)}</span></span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-3 text-xs text-white/25">
            {t('sellAllListed')}
          </div>
        )}
      </div>
    </Modal>
  );
}
