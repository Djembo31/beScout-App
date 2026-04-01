'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle } from 'lucide-react';

interface TradingToastsProps {
  buySuccess: string | null;
  buyError: string | null;
  shared: boolean;
  onShareTrade: () => void;
}

export default function TradingToasts({ buySuccess, buyError, shared, onShareTrade }: TradingToastsProps) {
  const t = useTranslations('playerDetail');
  return (
    <>
      {buySuccess && (
        <div className="bg-green-500/20 border border-green-500/30 text-green-500 rounded-xl px-4 py-3 text-sm font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {buySuccess}
          </div>
          {!shared && (
            <button
              onClick={onShareTrade}
              className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-xs font-bold text-green-500 transition-colors"
            >
              {t('shareInCommunity', { defaultMessage: 'In Community teilen' })}
            </button>
          )}
        </div>
      )}
      {buyError && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          {buyError}
        </div>
      )}
    </>
  );
}
