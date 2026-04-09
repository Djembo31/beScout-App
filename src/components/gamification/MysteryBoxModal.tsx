'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Gift, Ticket, Sparkles, AlertCircle, Coins, Swords, Package } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { MysteryBoxResult, MysteryBoxRarity } from '@/types';
import { RARITY_CONFIG, EQUIPMENT_POSITION_COLORS } from './rarityConfig';
import { ParticleSystem } from './particles';

// ============================================
// MYSTERY BOX MODAL — Premium Star Drops
// ============================================

interface MysteryBoxModalProps {
  open: boolean;
  onClose: () => void;
  onOpen: (free?: boolean) => Promise<MysteryBoxResult | null>;
  ticketBalance: number;
  hasFreeBox?: boolean;
  ticketDiscount?: number;
}

const MYSTERY_BOX_BASE_COST = 15;

/** Reward preview per rarity (shown in idle state) */
const REWARD_PREVIEW: { rarity: MysteryBoxRarity; rewards: string }[] = [
  { rarity: 'common', rewards: 'Tickets' },
  { rarity: 'rare', rewards: 'Tickets / Equipment R1' },
  { rarity: 'epic', rewards: 'Tickets / Equipment R1-R2' },
  { rarity: 'legendary', rewards: 'Tickets / Equipment R1-R3 / bCredits' },
  { rarity: 'mythic', rewards: 'Equipment R3-R4 / bCredits' },
];

type BoxState = 'idle' | 'anticipation' | 'shake' | 'burst' | 'celebration';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleRef = useRef<ParticleSystem | null>(null);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  // NOTE: Mystery box is a daily free-open reward only — ticket purchase
  // was removed (polish-sweep Track C1). `effectiveCost` is kept because the
  // handleOpen branch below still references it for the openMysteryBox call
  // shape, but the UI never charges tickets. canAfford is now gated purely
  // on the daily free slot.
  const effectiveCost = Math.max(1, MYSTERY_BOX_BASE_COST - ticketDiscount);
  const canAfford = hasFreeBox;

  // Canvas setup
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    particleRef.current = new ParticleSystem(canvas);
    return () => {
      particleRef.current?.destroy();
      particleRef.current = null;
    };
  }, [open]);

  const triggerHaptic = useCallback((ms: number) => {
    if (ms > 0 && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(ms);
    }
  }, []);

  const handleOpen = useCallback(async () => {
    if (!canAfford) return;
    setError(null);

    if (reducedMotion.current) {
      // Reduced motion: skip animation, go straight to result
      try {
        const boxResult = await onOpen(hasFreeBox);
        if (boxResult) {
          setResult(boxResult);
          setBoxState('celebration');
        }
      } catch (err) {
        console.error('MysteryBoxModal open error:', err);
        setError(t('openBoxError'));
      }
      return;
    }

    // Phase 1: Anticipation (1.5s)
    setBoxState('anticipation');

    try {
      // Start RPC call in parallel with anticipation animation
      const resultPromise = onOpen(hasFreeBox);

      await new Promise<void>(resolve => setTimeout(resolve, 1500));

      // Phase 2: Shake (1.2s)
      setBoxState('shake');
      await new Promise<void>(resolve => setTimeout(resolve, 1200));

      const boxResult = await resultPromise;

      if (!boxResult) {
        setBoxState('idle');
        return;
      }

      setResult(boxResult);

      // Phase 3: Burst (0.5s)
      setBoxState('burst');
      const rarityConf = RARITY_CONFIG[boxResult.rarity];

      // Screen flash for legendary/mythic
      if (rarityConf.screenFlash) {
        triggerHaptic(rarityConf.hapticMs);
      } else if (rarityConf.hapticMs > 0) {
        triggerHaptic(rarityConf.hapticMs);
      }

      // Canvas particle burst
      particleRef.current?.burst(rarityConf.particleCount, rarityConf.color);
      particleRef.current?.glow(rarityConf.color, 0.4, 600);

      await new Promise<void>(resolve => setTimeout(resolve, 500));

      // Phase 4: Celebration
      setBoxState('celebration');
    } catch (err) {
      console.error('MysteryBoxModal open error:', err);
      setError(t('openBoxError'));
      setBoxState('idle');
    }
  }, [canAfford, hasFreeBox, onOpen, t, triggerHaptic]);

  const handleClose = useCallback(() => {
    setBoxState('idle');
    setResult(null);
    particleRef.current?.destroy();
    onClose();
  }, [onClose]);

  const handleOpenAnother = useCallback(() => {
    setBoxState('idle');
    setResult(null);
    particleRef.current?.destroy();
  }, []);

  // Daily free-open only: once claimed today, no more boxes until tomorrow.
  // "Open Another" button is gated on the same daily slot.
  const canOpenAnother = false;
  const isAnimating = boxState === 'anticipation' || boxState === 'shake' || boxState === 'burst';
  const rarityConf = result ? RARITY_CONFIG[result.rarity] : null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('mysteryBox')}
      size="sm"
      preventClose={isAnimating}
    >
      <div className="relative flex flex-col items-center py-4 overflow-hidden">
        {/* Canvas overlay for particles */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 pointer-events-none z-10"
          aria-hidden="true"
        />

        {/* Screen flash overlay */}
        {boxState === 'burst' && rarityConf?.screenFlash && (
          <div
            className="absolute inset-0 z-20 bg-white/70 anim-mystery-flash pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Box Icon */}
        <div className={cn(
          'relative mb-6 z-[5]',
          boxState === 'anticipation' && 'anim-mystery-anticipation',
          boxState === 'shake' && 'anim-mystery-shake',
          boxState === 'burst' && 'anim-mystery-burst',
        )}
          style={boxState === 'anticipation' || boxState === 'shake'
            ? { '--glow-color': rarityConf?.glowColor ?? RARITY_CONFIG.common.glowColor } as React.CSSProperties
            : undefined
          }
        >
          <div className={cn(
            'size-24 rounded-2xl flex items-center justify-center transition-colors duration-300',
            boxState === 'idle' && 'bg-gold/10 border-2 border-gold/20',
            (boxState === 'anticipation' || boxState === 'shake') && 'bg-gold/20 border-2 border-gold/40',
            boxState === 'burst' && rarityConf && cn(rarityConf.bgClass, 'border-2', rarityConf.borderClass),
            boxState === 'celebration' && rarityConf && cn(
              rarityConf.bgClass, 'border-2', rarityConf.borderClass, rarityConf.glowClass,
              result?.rarity === 'mythic' && 'anim-mystery-rainbow',
            ),
          )}>
            {boxState === 'celebration' && result ? (
              <RewardIcon result={result} rarityConf={rarityConf!} />
            ) : (
              <Gift className={cn(
                'size-12 text-gold transition-transform',
                (boxState === 'anticipation' || boxState === 'shake') && 'scale-110',
              )} />
            )}
          </div>

          {/* Legendary/Mythic pulse ring */}
          {boxState === 'celebration' && result && (result.rarity === 'legendary' || result.rarity === 'mythic') && (
            <div className={cn(
              'absolute inset-0 rounded-2xl border-2 animate-pulse motion-reduce:animate-none',
              result.rarity === 'mythic' ? 'border-gold/50 anim-mystery-rainbow' : 'border-gold/40',
            )} />
          )}
        </div>

        {/* ── IDLE STATE ── */}
        {boxState === 'idle' && !result && (
          <>
            <p className="text-sm text-white/50 mb-1 text-center">
              {hasFreeBox ? t('freeBox') : t('dailyBoxClaimed')}
            </p>
            <div className="mb-6" />

            {hasFreeBox ? (
              <Button
                variant="gold"
                size="lg"
                fullWidth
                onClick={handleOpen}
                aria-label={t('openBoxAriaLabel')}
              >
                {t('freeBox')}
              </Button>
            ) : (
              <p className="text-xs text-white/40 text-center px-4">
                {t('dailyBoxClaimedDesc')}
              </p>
            )}

            {error && (
              <div className="flex items-center gap-1.5 mt-2">
                <AlertCircle className="size-3.5 text-red-400 flex-shrink-0" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Reward Preview */}
            <div className="w-full mt-5 pt-4 border-t border-divider">
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-wider mb-2.5">
                {t('possibleRewardsTitle')}
              </p>
              <div className="space-y-1.5">
                {REWARD_PREVIEW.map(rp => {
                  const conf = RARITY_CONFIG[rp.rarity];
                  return (
                    <div
                      key={rp.rarity}
                      className={cn(
                        'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px]',
                        conf.bgClass,
                      )}
                    >
                      <span className={cn('font-black w-[72px] flex-shrink-0', conf.textClass)}>
                        {conf.label_de}
                      </span>
                      <span className="text-white/40 flex-1">
                        {rp.rewards}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ── ANIMATING STATES ── */}
        {(boxState === 'anticipation' || boxState === 'shake') && (
          <p className="text-sm text-gold font-bold animate-pulse motion-reduce:animate-none">
            {t('opening')}
          </p>
        )}

        {boxState === 'burst' && (
          <p className="text-sm text-gold font-black anim-scale-pop">
            {rarityConf?.label_de ?? ''}
          </p>
        )}

        {/* ── CELEBRATION / REVEALED ── */}
        {boxState === 'celebration' && result && rarityConf && (
          <>
            {/* Rarity badge */}
            <span className={cn(
              'px-3 py-1 rounded-full border text-xs font-black mb-3 anim-mystery-celebrate',
              rarityConf.bgClass, rarityConf.textClass, rarityConf.borderClass,
            )}>
              {rarityConf.label_de}
            </span>

            {/* Reward content */}
            <div className="anim-mystery-celebrate" style={{ animationDelay: '0.15s' }}>
              <RewardDisplay result={result} t={t} />
            </div>

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

            {/* "In Inventar ansehen" Link — only for collectible rewards */}
            {(result.reward_type === 'equipment' || result.reward_type === 'cosmetic') && (
              <Link
                href={`/inventory?tab=${result.reward_type === 'equipment' ? 'equipment' : 'cosmetics'}`}
                onClick={handleClose}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-gold/80 hover:text-gold transition-colors"
              >
                <Package className="size-3.5" aria-hidden="true" />
                {t('viewInInventory')}
              </Link>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

// ============================================
// REWARD ICON (inside the box)
// ============================================

function RewardIcon({ result, rarityConf }: { result: MysteryBoxResult; rarityConf: NonNullable<typeof RARITY_CONFIG[MysteryBoxRarity]> }) {
  switch (result.reward_type) {
    case 'tickets':
      return <Ticket className={cn('size-12 anim-scale-pop', rarityConf.textClass)} />;
    case 'equipment':
      return <Swords className={cn('size-12 anim-scale-pop', rarityConf.textClass)} />;
    case 'bcredits':
      return <Coins className={cn('size-12 anim-scale-pop text-gold')} />;
    case 'cosmetic':
      return <Sparkles className={cn('size-12 anim-scale-pop', rarityConf.textClass)} />;
    default:
      return <Gift className={cn('size-12 anim-scale-pop', rarityConf.textClass)} />;
  }
}

// ============================================
// REWARD DISPLAY (details below the box)
// ============================================

function RewardDisplay({ result, t }: { result: MysteryBoxResult; t: ReturnType<typeof useTranslations> }) {
  switch (result.reward_type) {
    case 'tickets':
      return (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-black text-gold font-mono tabular-nums">
            <Ticket className="size-6" />
            +{result.tickets_amount}
          </div>
          <p className="text-xs text-white/40 mt-1">
            {t('ticketsEarned', { amount: result.tickets_amount ?? 0 })}
          </p>
        </div>
      );

    case 'equipment': {
      const posColors = EQUIPMENT_POSITION_COLORS[(result as MysteryBoxResult & { equipment_position?: string }).equipment_position ?? 'ALL'] ?? EQUIPMENT_POSITION_COLORS.ALL;
      return (
        <div className="text-center">
          <div className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl border mb-2',
            posColors.bg, posColors.border,
          )}>
            <Swords className={cn('size-5', posColors.text)} />
            <span className={cn('font-black text-sm', posColors.text)}>
              {(result as MysteryBoxResult & { equipment_name_de?: string }).equipment_name_de ?? result.equipment_type}
            </span>
            <span className="font-mono font-black text-xs text-white/60 bg-white/[0.08] px-1.5 py-0.5 rounded">
              R{result.equipment_rank}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-1">{t('rewardEquipment')}</p>
        </div>
      );
    }

    case 'bcredits': {
      const amount = result.bcredits_amount ?? 0;
      const displayAmount = Math.round(amount / 100);
      return (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 text-2xl font-black text-gold font-mono tabular-nums">
            <Coins className="size-6" />
            +{displayAmount.toLocaleString('de-DE')} CR
          </div>
          <p className="text-xs text-white/40 mt-1">{t('bcreditsEarned')}</p>
        </div>
      );
    }

    case 'cosmetic':
      return (
        <div className="text-center">
          <Sparkles className="size-8 mx-auto mb-2 text-purple-400" />
          <p className="text-sm font-bold text-white">{t('cosmeticUnlocked')}</p>
          <p className="text-xs text-white/40 mt-1">{t('cosmeticAddedToCollection')}</p>
        </div>
      );

    default:
      return null;
  }
}
