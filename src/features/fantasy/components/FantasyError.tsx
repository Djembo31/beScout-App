'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

interface FantasyErrorProps {
  onRetry: () => void;
}

export function FantasyError({ onRetry }: FantasyErrorProps) {
  const t = useTranslations('fantasy');
  const tc = useTranslations('common');

  return (
    <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-32 gap-4">
      <div className="size-12 rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
        <AlertCircle className="size-6 text-red-400" />
      </div>
      <div className="text-white/70 font-bold">{t('dataLoadFailed')}</div>
      <Button variant="outline" onClick={onRetry}>
        <RefreshCw className="size-4" />
        {tc('retry')}
      </Button>
    </div>
  );
}
