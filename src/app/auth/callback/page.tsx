'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { onAuthStateChange } from '@/lib/services/auth';

export default function AuthCallbackPage() {
  const router = useRouter();
  const t = useTranslations('auth');
  const [error, setError] = useState(false);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        subscription.unsubscribe();
        router.replace('/');
      }
    });

    // Show "taking longer" hint after 3s
    const slowTimer = setTimeout(() => setSlow(true), 3000);

    // Fallback: if no SIGNED_IN event fires within 5s, something went wrong
    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      setError(true);
    }, 5000);

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-red-400 font-bold mb-2">{t('loginFailed')}</p>
          <p className="text-white/50 text-sm text-pretty mb-4">{t('loginExpired')}</p>
          <a
            href="/login"
            className="inline-block px-6 py-2.5 bg-gold text-black font-bold rounded-xl text-sm hover:bg-gold/90 transition-colors"
          >
            {t('backToLogin')}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold mx-auto mb-4" aria-hidden="true" />
        <p className="text-white/50 text-sm">{t('loginProcessing')}</p>
        {slow && <p className="text-white/30 text-xs mt-2">{t('loginSlow')}</p>}
      </div>
    </div>
  );
}
