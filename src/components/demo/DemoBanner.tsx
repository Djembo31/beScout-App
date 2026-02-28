'use client';

import { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { useUser } from '@/components/providers/AuthProvider';
import { useTranslations } from 'next-intl';

export function DemoBanner() {
  const { profile } = useUser();
  const t = useTranslations('demo');
  const [dismissed, setDismissed] = useState(false);

  if (!profile?.is_demo || dismissed) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[70] flex items-center justify-center gap-2 px-4 py-1.5 bg-gold text-black text-xs font-bold">
      <Lock className="w-3 h-3" />
      <span>{t('banner')} — {t('bannerSub')}</span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-2 p-0.5 rounded hover:bg-black/10 transition-colors"
        aria-label={t('banner')}
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
