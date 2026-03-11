'use client';

import React, { useMemo, useState } from 'react';
import { Check, Sparkles, Frame, Type, Flame, Award, Wand2, PackageOpen, AlertCircle } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { CosmeticRarity, CosmeticType, UserCosmeticWithDef } from '@/types';

// ============================================
// COSMETIC INVENTORY — Grid + Equip/Unequip
// ============================================

interface CosmeticInventoryProps {
  cosmetics: UserCosmeticWithDef[];
  onEquip: (cosmeticId: string) => void | Promise<void>;
  isEquipping?: boolean;
}

const RARITY_CONFIG: Record<CosmeticRarity, {
  bgClass: string;
  textClass: string;
  borderClass: string;
  label: string;
}> = {
  common: { bgClass: 'bg-white/[0.06]', textClass: 'text-white/50', borderClass: 'border-white/10', label: 'Common' },
  uncommon: { bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400', borderClass: 'border-emerald-500/20', label: 'Uncommon' },
  rare: { bgClass: 'bg-sky-500/10', textClass: 'text-sky-400', borderClass: 'border-sky-500/20', label: 'Rare' },
  epic: { bgClass: 'bg-purple-500/10', textClass: 'text-purple-400', borderClass: 'border-purple-500/20', label: 'Epic' },
  legendary: { bgClass: 'bg-gold/10', textClass: 'text-gold', borderClass: 'border-gold/20', label: 'Legendary' },
};

const TYPE_ICONS: Record<CosmeticType, React.ElementType> = {
  frame: Frame,
  title: Type,
  flame: Flame,
  badge: Award,
  effect: Wand2,
};

const TYPE_LABELS: Record<CosmeticType, { de: string; tr: string }> = {
  frame: { de: 'Rahmen', tr: 'Cerceve' },
  title: { de: 'Titel', tr: 'Unvan' },
  flame: { de: 'Flamme', tr: 'Alev' },
  badge: { de: 'Abzeichen', tr: 'Rozet' },
  effect: { de: 'Effekt', tr: 'Efekt' },
};

export default function CosmeticInventory({
  cosmetics,
  onEquip,
  isEquipping = false,
}: CosmeticInventoryProps) {
  const t = useTranslations('gamification');
  const [error, setError] = useState<string | null>(null);

  const handleEquip = async (cosmeticId: string) => {
    setError(null);
    try {
      await onEquip(cosmeticId);
    } catch (err) {
      console.error('CosmeticInventory equip error:', err);
      setError(t('equipError'));
    }
  };

  // Group cosmetics by type
  const grouped = useMemo(() => {
    const groups: Partial<Record<CosmeticType, UserCosmeticWithDef[]>> = {};
    for (const item of cosmetics) {
      const type = item.cosmetic.type;
      if (!groups[type]) groups[type] = [];
      groups[type]!.push(item);
    }
    // Sort each group: equipped first, then by rarity (legendary first)
    const rarityOrder: Record<CosmeticRarity, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    for (const type of Object.keys(groups) as CosmeticType[]) {
      groups[type]!.sort((a, b) => {
        if (a.equipped !== b.equipped) return a.equipped ? -1 : 1;
        return rarityOrder[a.cosmetic.rarity] - rarityOrder[b.cosmetic.rarity];
      });
    }
    return groups;
  }, [cosmetics]);

  // Empty state
  if (cosmetics.length === 0) {
    return (
      <Card className="p-8 text-center">
        <PackageOpen className="size-10 mx-auto mb-3 text-white/20" aria-hidden="true" />
        <p className="text-sm text-white/40">{t('noCosmetics')}</p>
        <p className="text-xs text-white/20 mt-1">{t('noCosmeticsHint')}</p>
      </Card>
    );
  }

  const typeOrder: CosmeticType[] = ['frame', 'title', 'flame', 'badge', 'effect'];

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-1.5 px-1">
          <AlertCircle className="size-3.5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {typeOrder.map(type => {
        const items = grouped[type];
        if (!items || items.length === 0) return null;

        return (
          <div key={type}>
            {/* Type Header */}
            <div className="flex items-center gap-2 mb-3">
              {React.createElement(TYPE_ICONS[type], { className: 'size-3.5 text-white/40' })}
              <span className="text-xs font-bold text-white/50 uppercase">
                {TYPE_LABELS[type].de}
              </span>
              <span className="text-[10px] text-white/20">({items.length})</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {items.map(item => {
                const rarity = RARITY_CONFIG[item.cosmetic.rarity];
                const isLegendary = item.cosmetic.rarity === 'legendary';

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'relative rounded-xl border p-3 transition-all',
                      item.equipped
                        ? 'border-gold/40 bg-gold/[0.06] shadow-[0_0_8px_rgba(255,215,0,0.15)]'
                        : cn('border-white/[0.08] bg-white/[0.02]', 'hover:border-white/15 hover:bg-white/[0.04]'),
                      isLegendary && !item.equipped && 'border-gold/15',
                    )}
                  >
                    {/* Equipped indicator */}
                    {item.equipped && (
                      <div className="absolute top-1.5 right-1.5 size-4 rounded-full bg-gold flex items-center justify-center">
                        <Check className="size-2.5 text-black" />
                      </div>
                    )}

                    {/* Icon */}
                    <div className="flex justify-center mb-2">
                      <Sparkles className={cn('size-6', rarity.textClass)} />
                    </div>

                    {/* Name */}
                    <p className="text-[11px] font-bold text-white/80 text-center truncate mb-1">
                      {item.cosmetic.name}
                    </p>

                    {/* Rarity badge */}
                    <div className="flex justify-center mb-2">
                      <span className={cn(
                        'text-[8px] font-bold px-1.5 py-0.5 rounded-full border',
                        rarity.bgClass,
                        rarity.textClass,
                        rarity.borderClass,
                      )}>
                        {rarity.label}
                      </span>
                    </div>

                    {/* Source */}
                    <p className="text-[9px] text-white/20 text-center truncate mb-2">
                      {item.source}
                    </p>

                    {/* Equip button */}
                    <Button
                      variant={item.equipped ? 'outline' : 'gold'}
                      size="sm"
                      fullWidth
                      onClick={() => handleEquip(item.cosmetic_id)}
                      disabled={isEquipping}
                      aria-label={item.equipped
                        ? `${t('equipped')}: ${item.cosmetic.name}`
                        : `${t('equip')}: ${item.cosmetic.name}`}
                      className="text-[10px] py-1 h-auto min-h-[32px]"
                    >
                      {item.equipped ? t('equipped') : t('equip')}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
