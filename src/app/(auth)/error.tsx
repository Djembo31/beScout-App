'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('auth');
  const tc = useTranslations('common');

  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-dvh p-4">
      <div className="max-w-sm w-full bg-surface-minimal border border-white/10 rounded-2xl p-8 text-center space-y-4">
        <div className="size-12 mx-auto rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle className="size-6 text-red-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-black text-balance">{t('errorTitle')}</h2>
        <p className="text-sm text-white/50 text-pretty">
          {t('errorDesc')}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black text-sm font-bold rounded-xl hover:bg-gold/90 transition-colors"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {tc('retry')}
        </button>
      </div>
    </div>
  );
}
