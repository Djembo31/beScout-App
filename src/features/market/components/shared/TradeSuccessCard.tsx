'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, ArrowRight, Package } from 'lucide-react';
import { PlayerPhoto, PositionBadge } from '@/components/player';
import { useMarketStore } from '@/features/market/store/marketStore';
import { fmtScout, cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player } from '@/types';

interface TradeSuccessCardProps {
  player: Player;
  quantity: number;
  oldBalanceCents: number;
  newBalanceCents: number;
  source: 'market' | 'ipo';
  onDismiss: () => void;
}

/** Animated counter that ticks from old to new value */
function AnimatedBalance({ from, to }: { from: number; to: number }) {
  const [current, setCurrent] = useState(from);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const diff = to - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(from + diff * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [from, to]);

  return (
    <span className="font-mono font-bold tabular-nums text-gold">
      {fmtScout(centsToBsd(current))}
    </span>
  );
}

export default function TradeSuccessCard({
  player, quantity, oldBalanceCents, newBalanceCents, source, onDismiss,
}: TradeSuccessCardProps) {
  const t = useTranslations('market');
  const setTab = useMarketStore((s) => s.setTab);
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);
  const lastTickRef = useRef(Date.now());

  // Animation lifecycle: enter (0ms) → visible (50ms) → auto-exit (5000ms) → dismiss (5400ms)
  // Pauses on hover/focus (WCAG 2.2.1 Timing Adjustable)
  useEffect(() => {
    const enterTimer = setTimeout(() => setPhase('visible'), 50);
    return () => clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    if (phase !== 'visible') return;
    if (paused) {
      lastTickRef.current = Date.now();
      return;
    }

    const remaining = 5000 - elapsedRef.current;
    if (remaining <= 0) {
      setPhase('exit');
      return;
    }

    lastTickRef.current = Date.now();
    const exitTimer = setTimeout(() => {
      elapsedRef.current += Date.now() - lastTickRef.current;
      setPhase('exit');
    }, remaining);

    return () => {
      elapsedRef.current += Date.now() - lastTickRef.current;
      clearTimeout(exitTimer);
    };
  }, [phase, paused]);

  useEffect(() => {
    if (phase !== 'exit') return;
    const dismissTimer = setTimeout(onDismiss, 400);
    return () => clearTimeout(dismissTimer);
  }, [phase, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        'fixed top-[max(1rem,env(safe-area-inset-top))] right-4 z-50 w-[min(320px,calc(100vw-2rem))]',
        'transition-colors duration-300 ease-out motion-reduce:transition-none',
        phase === 'enter' && 'translate-x-[120%] opacity-0',
        phase === 'visible' && 'translate-x-0 opacity-100',
        phase === 'exit' && 'translate-x-[120%] opacity-0',
      )}
    >
      {/* Card with gold edge glow */}
      <div
        className="relative rounded-2xl overflow-hidden bg-surface-modal border border-gold/30"
        style={{
          boxShadow: '0 0 20px rgba(255,215,0,0.15), 0 0 40px rgba(255,215,0,0.05), 0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Holographic shimmer — single pass, not looping */}
        <div
          className="absolute inset-0 pointer-events-none motion-reduce:hidden"
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.08) 45%, rgba(255,255,255,0.05) 50%, rgba(255,215,0,0.08) 55%, transparent 60%)',
            animation: 'shimmer-once 1.2s ease-out forwards',
            animationDelay: '300ms',
          }}
        />

        {/* Content */}
        <div className="relative p-3.5">
          {/* Player row */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <PlayerPhoto
                imageUrl={player.imageUrl}
                first={player.first}
                last={player.last}
                pos={player.pos}
                size={44}
              />
              {/* Success checkmark overlay */}
              <div className="absolute -bottom-0.5 -right-0.5 size-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-[#111]">
                <Check className="size-3 text-black" strokeWidth={3} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-white truncate">
                  {player.first} {player.last}
                </span>
                <PositionBadge pos={player.pos} size="sm" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] font-bold text-gold/80">
                  +{quantity} SC
                </span>
                <span className="text-[10px] text-white/30">
                  {source === 'ipo' ? t('clubSale', { defaultMessage: 'Club Verkauf' }) : t('transferListBadge')}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { setTab('portfolio'); onDismiss(); }}
              className="p-2 rounded-lg bg-surface-base hover:bg-white/10 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={t('toBestand', { defaultMessage: 'Zum Bestand' })}
              title={t('toBestand', { defaultMessage: 'Zum Bestand' })}
            >
              <Package className="size-4 text-gold/80" />
            </button>
            <Link
              href={`/player/${player.id}`}
              className="p-2 rounded-lg bg-surface-base hover:bg-white/10 transition-colors flex-shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label={t('goToPlayer')}
            >
              <ArrowRight className="size-4 text-white/50" />
            </Link>
          </div>

          {/* Balance counter */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-divider">
            <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">
              {t('balanceLabel', { defaultMessage: 'Guthaben' })}
            </span>
            <AnimatedBalance from={oldBalanceCents} to={newBalanceCents} />
          </div>
        </div>
      </div>
    </div>
  );
}
