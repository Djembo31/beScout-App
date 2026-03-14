'use client';

import React, { useState, useCallback } from 'react';
import { Gift, Ticket, Sparkles, AlertCircle } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { CosmeticRarity, MysteryBoxResult } from '@/types';

// ============================================
// MYSTERY BOX MODAL
// ============================================

interface MysteryBoxModalProps {
  open: boolean;
  onClose: () => void;
  onOpen: (free?: boolean) => Promise<MysteryBoxResult | null>;
  ticketBalance: number;
  hasFreeBox?: boolean;
  /** Streak-based ticket discount applied to base cost (default 0) */
  ticketDiscount?: number;
}

const MYSTERY_BOX_BASE_COST = 15;

const RARITY_CONFIG: Record<CosmeticRarity, {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  glowClass?: string;
}> = {
  common: {
    label: 'Common',
    bgClass: 'bg-white/[0.06]',
    textClass: 'text-white/60',
    borderClass: 'border-white/10',
  },
  uncommon: {
    label: 'Uncommon',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/25',
  },
  rare: {
    label: 'Rare',
    bgClass: 'bg-sky-500/15',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/25',
  },
  epic: {
    label: 'Epic',
    bgClass: 'bg-purple-500/15',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/25',
  },
  legendary: {
    label: 'Legendary',
    bgClass: 'bg-gold/15',
    textClass: 'text-gold',
    borderClass: 'border-gold/30',
    glowClass: 'shadow-[0_0_20px_rgba(255,215,0,0.35)]',
  },
};

const REWARD_PREVIEW: { rarity: CosmeticRarity; ticketRange: [number, number]; cosmeticChance: boolean; dropPct: number }[] = [
  { rarity: 'common', ticketRange: [5, 15], cosmeticChance: false, dropPct: 45 },
  { rarity: 'uncommon', ticketRange: [15, 40], cosmeticChance: true, dropPct: 30 },
  { rarity: 'rare', ticketRange: [40, 100], cosmeticChance: true, dropPct: 15 },
  { rarity: 'epic', ticketRange: [100, 250], cosmeticChance: true, dropPct: 8 },
  { rarity: 'legendary', ticketRange: [250, 500], cosmeticChance: true, dropPct: 2 },
];

type BoxState = 'idle' | 'opening' | 'revealed';

export default function MysteryBoxModal({
  open,
  onClose,
  onOpen,
  ticketBalance,
  hasFreeBox = false,
  ticketDiscount = 0,
}: MysteryBoxModalProps) {
  const t = useTranslations('gamification');
  const [boxState, setBoxState] = useState<BoxState>('idle');
  const [result, setResult] = useState<MysteryBoxResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveCost = Math.max(1, MYSTERY_BOX_BASE_COST - ticketDiscount);
  const canAfford = hasFreeBox || ticketBalance >= effectiveCost;

  const handleOpen = useCallback(async () => {
    if (!canAfford) return;
    setError(null);
    setBoxState('opening');

    try {
      // Simulate shake animation duration
      const shakePromise = new Promise<void>(resolve => setTimeout(resolve, 1500));
      const resultPromise = onOpen(hasFreeBox);

      const [, boxResult] = await Promise.all([shakePromise, resultPromise]);

      if (boxResult) {
        setResult(boxResult);
        setBoxState('revealed');
      } else {
        // Failed — reset
        setBoxState('idle');
      }
    } catch (err) {
      console.error('MysteryBoxModal open error:', err);
      setError(t('openBoxError'));
      setBoxState('idle');
    }
  }, [canAfford, hasFreeBox, onOpen, t]);

  const handleClose = useCallback(() => {
    setBoxState('idle');
    setResult(null);
    onClose();
  }, [onClose]);

  const handleOpenAnother = useCallback(() => {
    setBoxState('idle');
    setResult(null);
  }, []);

  const canOpenAnother = ticketBalance >= effectiveCost;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('mysteryBox')}
      size="sm"
      preventClose={boxState === 'opening'}
    >
      <div className="flex flex-col items-center py-4">
        {/* Box Icon */}
        <div className={cn(
          'relative mb-6',
          boxState === 'opening' && 'animate-mystery-shake',
        )}>
          <div className={cn(
            'size-24 rounded-2xl flex items-center justify-center transition-all duration-300',
            boxState === 'idle' && 'bg-gold/10 border-2 border-gold/20',
            boxState === 'opening' && 'bg-gold/20 border-2 border-gold/40',
            boxState === 'revealed' && result && cn(
              RARITY_CONFIG[result.rarity].bgClass,
              'border-2',
              RARITY_CONFIG[result.rarity].borderClass,
              RARITY_CONFIG[result.rarity].glowClass,
            ),
          )}>
            {boxState === 'revealed' && result ? (
              <Sparkles className={cn('size-12 anim-scale-pop', RARITY_CONFIG[result.rarity].textClass)} />
            ) : (
              <Gift className={cn(
                'size-12 text-gold transition-transform',
                boxState === 'opening' && 'scale-110',
              )} />
            )}
          </div>

          {/* Legendary glow ring */}
          {boxState === 'revealed' && result?.rarity === 'legendary' && (
            <div className="absolute inset-0 rounded-2xl border-2 border-gold/40 animate-pulse motion-reduce:animate-none" />
          )}
        </div>

        {/* State-based content */}
        {boxState === 'idle' && (
          <>
            <p className="text-sm text-white/50 mb-1 text-center">
              {hasFreeBox ? t('freeBox') : t('openBox')}
            </p>
            {!hasFreeBox && (
              <p className="text-xs text-white/30 mb-6 font-mono tabular-nums">
                {t('ticketCost', { cost: effectiveCost })}
              </p>
            )}
            {hasFreeBox && <div className="mb-6" />}

            <Button
              variant="gold"
              size="lg"
              fullWidth
              onClick={handleOpen}
              disabled={!canAfford}
              aria-label={t('openBoxAriaLabel')}
            >
              {hasFreeBox ? t('freeBox') : t('openBox')}
            </Button>

            {!canAfford && !hasFreeBox && (
              <p className="text-[10px] text-red-400/60 mt-2">
                {t('notEnoughTickets')}
              </p>
            )}

            {error && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertCircle className="size-3.5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Ticket balance */}
            <div className="flex items-center gap-1 mt-3 text-[11px] text-white/30">
              <Ticket className="size-3" />
              <span className="font-mono tabular-nums">{ticketBalance}</span>
            </div>

            {/* Reward Preview */}
            <div className="w-full mt-5 pt-4 border-t border-white/[0.06]">
              <p className="text-[11px] text-white/30 font-bold uppercase tracking-wider mb-2.5">
                {t('possibleRewardsTitle')}
              </p>
              <div className="space-y-1.5">
                {REWARD_PREVIEW.map(rp => (
                  <div
                    key={rp.rarity}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]',
                      RARITY_CONFIG[rp.rarity].bgClass,
                    )}
                  >
                    <span className={cn('font-black w-[72px] flex-shrink-0', RARITY_CONFIG[rp.rarity].textClass)}>
                      {RARITY_CONFIG[rp.rarity].label}
                    </span>
                    <span className="text-white/40 flex-1 font-mono tabular-nums">
                      {rp.ticketRange[0]}–{rp.ticketRange[1]} {t('tickets')}
                      {rp.cosmeticChance && ' + Cosmetic'}
                    </span>
                    <span className="text-white/25 font-mono tabular-nums flex-shrink-0">
                      {rp.dropPct}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {boxState === 'opening' && (
          <p className="text-sm text-gold font-bold animate-pulse motion-reduce:animate-none">
            {t('opening')}
          </p>
        )}

        {boxState === 'revealed' && result && (
          <>
            {/* Rarity badge */}
            <span className={cn(
              'px-3 py-1 rounded-full border text-xs font-black mb-3 anim-scale-pop',
              RARITY_CONFIG[result.rarity].bgClass,
              RARITY_CONFIG[result.rarity].textClass,
              RARITY_CONFIG[result.rarity].borderClass,
            )}>
              {RARITY_CONFIG[result.rarity].label}
            </span>

            {/* Reward content */}
            {result.reward_type === 'tickets' && result.tickets_amount != null && (
              <div className="text-center anim-scale-pop">
                <div className="flex items-center gap-2 text-2xl font-black text-gold font-mono tabular-nums">
                  <Ticket className="size-6" />
                  +{result.tickets_amount}
                </div>
                <p className="text-xs text-white/40 mt-1">{t('ticketsEarned', { amount: result.tickets_amount })}</p>
              </div>
            )}

            {result.reward_type === 'cosmetic' && (
              <div className="text-center anim-scale-pop">
                <Sparkles className={cn('size-8 mx-auto mb-2', RARITY_CONFIG[result.rarity].textClass)} />
                <p className="text-sm font-bold text-white">{t('cosmeticUnlocked')}</p>
                <p className="text-xs text-white/40 mt-1">{t('cosmeticAddedToCollection')}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 w-full mt-6">
              <Button variant="outline" size="md" fullWidth onClick={handleClose}>
                {t('closeBox')}
              </Button>
              {canOpenAnother && (
                <Button variant="gold" size="md" fullWidth onClick={handleOpenAnother}>
                  {t('openAnother')}
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      {/* CSS for shake animation */}
      <style jsx>{`
        @keyframes mystery-shake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          10% { transform: rotate(-8deg) scale(1.02); }
          20% { transform: rotate(8deg) scale(1.04); }
          30% { transform: rotate(-10deg) scale(1.06); }
          40% { transform: rotate(10deg) scale(1.08); }
          50% { transform: rotate(-12deg) scale(1.1); }
          60% { transform: rotate(12deg) scale(1.08); }
          70% { transform: rotate(-8deg) scale(1.06); }
          80% { transform: rotate(6deg) scale(1.03); }
          90% { transform: rotate(-3deg) scale(1.01); }
        }
        .animate-mystery-shake {
          animation: mystery-shake 1.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
        }
      `}</style>
    </Modal>
  );
}
