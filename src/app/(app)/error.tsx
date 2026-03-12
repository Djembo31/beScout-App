'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Card, Button } from '@/components/ui';

const RECOVERY_KEY = 'bescout-error-recovery';

/** Detect stale-code crashes and auto-recover by clearing SW cache + reload */
async function attemptStaleCodeRecovery(): Promise<boolean> {
  // Only attempt once per session to avoid infinite reload loops
  try {
    if (sessionStorage.getItem(RECOVERY_KEY)) return false;
    sessionStorage.setItem(RECOVERY_KEY, '1');
  } catch { return false; }

  // Clear all service worker caches
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
  }

  // Unregister service workers so stale HTML is never served again
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
  }

  // Hard reload to get fresh HTML + JS from server
  window.location.reload();
  return true;
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('common');

  useEffect(() => {
    console.error('App error:', error);

    // Auto-recover from stale chunk errors (TypeError during render)
    if (error instanceof TypeError) {
      attemptStaleCodeRecovery();
    }
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="size-12 mx-auto rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle aria-hidden="true" className="size-6 text-red-400" />
        </div>
        <h2 className="text-xl font-black text-balance">{t('errorTitle')}</h2>
        <p className="text-sm text-white/50 text-pretty">
          {t('errorDesc')}
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-left text-xs text-red-300/70 bg-red-500/5 border border-red-500/10 rounded-xl p-3 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <Button variant="gold" onClick={reset}>
          <RefreshCw aria-hidden="true" className="size-4" />
          {t('retry')}
        </Button>
      </Card>
    </div>
  );
}
