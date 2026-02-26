'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui';

const STORAGE_KEY = 'bescout-cookie-consent';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const t = useTranslations('legal');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) setVisible(true);
  }, []);

  if (!visible) return null;

  const accept = (value: 'accepted' | 'essential') => {
    localStorage.setItem(STORAGE_KEY, value);
    setVisible(false);
  };

  return (
    <div className="fixed bottom-16 md:bottom-4 left-4 right-4 z-[60] flex justify-center pointer-events-none">
      <div className="max-w-lg w-full bg-[#141414] border border-white/10 rounded-2xl px-4 py-3 flex flex-col sm:flex-row items-center gap-3 shadow-xl shadow-black/40 pointer-events-auto">
        <p className="text-xs text-white/50 flex-1 text-center sm:text-left">
          {t.rich('cookieText', {
            privacyLink: (chunks) => (
              <Link href="/datenschutz" className="underline hover:text-white/70 transition-colors">
                {chunks}
              </Link>
            ),
          })}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => accept('essential')} className="text-xs px-3 py-1.5 min-h-[36px]">
            {t('cookieEssential')}
          </Button>
          <Button variant="gold" onClick={() => accept('accepted')} className="text-xs px-3 py-1.5 min-h-[36px]">
            {t('cookieAccept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
