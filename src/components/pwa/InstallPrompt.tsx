'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import type { BeforeInstallPromptEvent } from '@/types';

const DISMISS_KEY = 'bescout-install-dismissed';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already installed as standalone
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // User previously dismissed
    if (localStorage.getItem(DISMISS_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 lg:bottom-4 lg:left-auto lg:right-4 lg:w-[340px] z-[85] animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#111] border border-white/15 shadow-2xl backdrop-blur-xl">
        <div className="size-10 rounded-xl bg-gold/15 border border-gold/25 flex items-center justify-center shrink-0">
          <Download className="size-5 text-gold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">App installieren</div>
          <div className="text-[11px] text-white/50">BeScout auf deinem Homescreen</div>
        </div>
        <button
          onClick={handleInstall}
          className="px-3.5 py-2 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/90 transition-colors shrink-0"
        >
          Installieren
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          aria-label="Schließen"
        >
          <X className="size-4 text-white/40" />
        </button>
      </div>
    </div>
  );
}
