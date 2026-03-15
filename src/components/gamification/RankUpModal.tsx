'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Trophy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Rang } from '@/lib/gamification';

// Hex colors for rang glow effects — Tailwind classes can't be used in inline styles
const RANG_HEX: Record<string, string> = {
  bronze: '#d97706',   // amber-600
  silber: '#cbd5e1',   // slate-300
  gold: '#FFD700',     // gold
  diamant: '#67e8f9',  // cyan-300
  mythisch: '#c084fc',  // purple-400
  legendaer: '#FFD700', // gold
};

function getRangHex(rang: Rang): string {
  return RANG_HEX[rang.id] ?? '#FFD700';
}

interface RankUpModalProps {
  open: boolean;
  oldRang: Rang;
  newRang: Rang;
  onClose: () => void;
}

export default function RankUpModal({ open, oldRang, newRang, onClose }: RankUpModalProps) {
  const t = useTranslations('gamification');
  const [phase, setPhase] = useState<'old' | 'transition' | 'new'>('old');

  // Animation sequence: show old rank → transition → reveal new rank
  useEffect(() => {
    if (!open) {
      setPhase('old');
      return;
    }

    const t1 = setTimeout(() => setPhase('transition'), 600);
    const t2 = setTimeout(() => setPhase('new'), 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [open]);

  const newHex = getRangHex(newRang);

  return (
    <Modal open={open} onClose={onClose} title={t('rankUp.title')} size="sm">
      <div className="text-center py-2">
        {/* Screen reader announcement */}
        <div aria-live="polite" className="sr-only">
          {phase === 'new' && t('rankUp.announcement', {
            oldRang: t(`rang.${oldRang.i18nKey}`),
            newRang: t(`rang.${newRang.i18nKey}`),
          })}
        </div>

        {/* Rang transition visual */}
        <div className="relative flex items-center justify-center gap-3 mb-6 min-h-[120px]">
          {/* Old rank badge */}
          <div
            className={cn(
              'flex flex-col items-center gap-1.5 transition-all duration-500 motion-reduce:transition-none',
              phase === 'old' && 'opacity-100 scale-100',
              phase === 'transition' && 'opacity-40 scale-90 -translate-x-2',
              phase === 'new' && 'opacity-30 scale-75 -translate-x-3',
            )}
          >
            <div
              className={cn(
                'size-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500',
                oldRang.bgColor, oldRang.borderColor,
              )}
            >
              <Trophy className={cn('size-7', oldRang.color)} />
            </div>
            <span className={cn('text-xs font-bold', oldRang.color)}>
              {t(`rang.${oldRang.i18nKey}`)}
            </span>
          </div>

          {/* Arrow */}
          <div
            className={cn(
              'transition-all duration-500 motion-reduce:transition-none',
              phase === 'old' && 'opacity-0 scale-75',
              phase === 'transition' && 'opacity-100 scale-100',
              phase === 'new' && 'opacity-60 scale-100',
            )}
          >
            <ChevronRight className="size-5 text-white/40" />
          </div>

          {/* New rank badge — with glow */}
          <div
            className={cn(
              'flex flex-col items-center gap-1.5 transition-all duration-700 motion-reduce:transition-none',
              phase === 'old' && 'opacity-0 scale-50 translate-x-2',
              phase === 'transition' && 'opacity-60 scale-90 translate-x-0',
              phase === 'new' && 'opacity-100 scale-100 translate-x-3',
            )}
          >
            <div
              className={cn(
                'size-16 rounded-2xl flex items-center justify-center border-2 relative transition-all duration-700',
                newRang.bgColor, newRang.borderColor,
              )}
              style={phase === 'new' ? {
                boxShadow: `0 0 30px ${newHex}33, 0 0 60px ${newHex}1a`,
              } : undefined}
            >
              <Trophy className={cn('size-8', newRang.color)} />

              {/* Gold glow pulse — single fire, not looping */}
              {phase === 'new' && (
                <div
                  className="absolute inset-0 rounded-2xl pointer-events-none motion-reduce:hidden"
                  style={{
                    animation: 'rank-glow-pulse 1s ease-out forwards',
                    boxShadow: `0 0 40px ${newHex}40, 0 0 80px ${newHex}20`,
                  }}
                />
              )}

              {/* Shimmer pass */}
              {phase === 'new' && (
                <div
                  className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none motion-reduce:hidden"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(105deg, transparent 40%, ${newHex}22 45%, rgba(255,255,255,0.08) 50%, ${newHex}22 55%, transparent 60%)`,
                      animation: 'shimmer-once 1.2s ease-out forwards',
                      animationDelay: '200ms',
                    }}
                  />
                </div>
              )}
            </div>
            <span className={cn(
              'text-sm font-black transition-all duration-500',
              newRang.color,
              phase === 'new' && 'scale-110',
            )}>
              {t(`rang.${newRang.i18nKey}`)}
            </span>
          </div>
        </div>

        {/* Title text */}
        <div
          className={cn(
            'transition-all duration-500 motion-reduce:transition-none',
            phase === 'new' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          )}
        >
          <h3 className="text-lg font-black text-white mb-1">
            {t('rankUp.headline')}
          </h3>
          <p className="text-sm text-white/50 mb-1">
            {t('rankUp.from', { rang: t(`rang.${oldRang.i18nKey}`) })}
          </p>
          <p className={cn('text-base font-black', newRang.color)}>
            {t('rankUp.to', { rang: t(`rang.${newRang.i18nKey}`) })}
          </p>
        </div>

        {/* Tier number */}
        <div
          className={cn(
            'mt-4 mb-6 transition-all duration-500 motion-reduce:transition-none',
            phase === 'new' ? 'opacity-100' : 'opacity-0',
          )}
        >
          <span className="text-[11px] uppercase tracking-wider text-white/30 font-semibold">
            {t('rankUp.tier')}
          </span>
          <div className="font-mono tabular-nums text-2xl font-black text-white/80 mt-0.5">
            {newRang.tier} / 12
          </div>
        </div>

        {/* Continue button */}
        <Button
          variant="gold"
          size="lg"
          fullWidth
          onClick={onClose}
          className="min-h-[48px]"
        >
          {t('rankUp.continue')}
        </Button>
      </div>
    </Modal>
  );
}
