'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, ArrowRight } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { Confetti } from '@/components/ui/Confetti';
import { useTranslations } from 'next-intl';
import { fmtScout } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';

const STORAGE_KEY = 'bescout-welcome-shown';

interface WelcomeBonusModalProps {
  balanceCents: number;
}

export default function WelcomeBonusModal({ balanceCents }: WelcomeBonusModalProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    // Show after short delay for smooth UX
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const goToMarket = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    router.push('/market?tab=kaufen');
  };

  return (
    <>
      <Confetti active={true} />
      <Modal open={visible} onClose={dismiss} title={t('welcomeTitle')} size="sm">
        <div className="text-center space-y-4">
          {/* Gold glow icon */}
          <div className="mx-auto mb-4 size-16 rounded-2xl bg-gold/15 border border-gold/30 flex items-center justify-center shadow-glow-gold">
            <Coins className="size-8 text-gold" aria-hidden="true" />
          </div>

          <p className="text-sm text-white/60 leading-relaxed">
            {t('welcomeDesc', { amount: fmtScout(centsToBsd(balanceCents)) })}
          </p>
          <p className="text-xs text-white/40 leading-relaxed">
            {t('welcomeBonusExplainer')}
          </p>

          {/* Balance highlight */}
          <div className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 border border-gold/20">
            <Coins className="size-4 text-gold" aria-hidden="true" />
            <span className="font-mono font-black text-gold text-lg tabular-nums">
              {fmtScout(centsToBsd(balanceCents))} $SCOUT
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <Button variant="gold" className="w-full" onClick={goToMarket}>
              {t('welcomeCta')}
              <ArrowRight className="size-4 ml-1" aria-hidden="true" />
            </Button>
            <button
              onClick={dismiss}
              className="w-full py-2.5 text-sm text-white/40 hover:text-white/60 transition-colors active:scale-[0.97]"
            >
              {t('welcomeLater')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
