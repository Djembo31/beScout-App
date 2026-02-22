'use client';

import { useTranslations } from 'next-intl';
import { Modal, Button } from '@/components/ui';

interface OfferModalProps {
  open: boolean;
  onClose: () => void;
  offerPrice: string;
  offerMessage: string;
  offerLoading: boolean;
  onPriceChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
}

export default function OfferModal({
  open, onClose, offerPrice, offerMessage, offerLoading,
  onPriceChange, onMessageChange, onSubmit,
}: OfferModalProps) {
  const t = useTranslations('player');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('offer.title')}
      subtitle={t('offer.subtitle')}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t('offer.cancel')}
          </Button>
          <Button variant="gold" onClick={onSubmit} disabled={!offerPrice || offerLoading} className="flex-1">
            {offerLoading ? t('offer.sending') : t('offer.send')}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/60 mb-1 block">{t('offer.priceLabel')}</label>
          <input
            type="number" inputMode="numeric" value={offerPrice} onChange={e => onPriceChange(e.target.value)}
            placeholder={t('offer.pricePlaceholder')} min="1"
            className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-base text-white font-mono focus:outline-none focus:border-[#FFD700]/30"
          />
        </div>
        <div>
          <label className="text-xs text-white/60 mb-1 block">{t('offer.messageLabel')}</label>
          <input
            type="text" value={offerMessage} onChange={e => onMessageChange(e.target.value)}
            placeholder={t('offer.messagePlaceholder')} maxLength={200}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#FFD700]/30"
          />
        </div>
      </div>
    </Modal>
  );
}
