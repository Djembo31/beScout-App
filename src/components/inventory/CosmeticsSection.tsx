'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles, Loader2, Frame, Type, Flame, Award, Wand2 } from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useUserCosmetics } from '@/lib/queries/cosmetics';
import type { CosmeticType, CosmeticRarity, UserCosmeticWithDef } from '@/types';

// ============================================
// Cosmetic visuals (rarity + type icon)
// ============================================
const RARITY_COLORS: Record<CosmeticRarity, { text: string; bg: string; border: string }> = {
  common: { text: 'text-white/60', bg: 'bg-white/[0.06]', border: 'border-white/10' },
  uncommon: { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/25' },
  rare: { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/25' },
  epic: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/25' },
  legendary: { text: 'text-gold', bg: 'bg-gold/[0.10]', border: 'border-gold/30' },
};

const TYPE_ICONS: Record<CosmeticType, React.ComponentType<{ className?: string }>> = {
  frame: Frame,
  title: Type,
  flame: Flame,
  badge: Award,
  effect: Wand2,
};

const TYPE_ORDER: CosmeticType[] = ['frame', 'title', 'flame', 'badge', 'effect'];

const TYPE_LABEL_KEY: Record<CosmeticType, string> = {
  frame: 'cosmeticsCategoryFrame',
  title: 'cosmeticsCategoryTitle',
  flame: 'cosmeticsCategoryAvatar',
  badge: 'cosmeticsCategoryBanner',
  effect: 'cosmeticsCategoryEmote',
};

// ============================================
// CosmeticsSection Component
// ============================================
export default function CosmeticsSection() {
  const t = useTranslations('inventory');
  const { user } = useUser();
  const uid = user?.id;

  const { data: cosmetics = [], isLoading } = useUserCosmetics(uid);

  // Group by category (type), preserve TYPE_ORDER ordering
  const grouped = useMemo(() => {
    const map = new Map<CosmeticType, UserCosmeticWithDef[]>();
    for (const item of cosmetics) {
      const type = item.cosmetic.type;
      const list = map.get(type);
      if (list) {
        list.push(item);
      } else {
        map.set(type, [item]);
      }
    }
    // Return in TYPE_ORDER, only categories that have items
    return TYPE_ORDER.filter(type => map.has(type)).map(type => ({
      type,
      items: map.get(type)!,
    }));
  }, [cosmetics]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title={t('cosmeticsEmpty')}
        description={t('cosmeticsEmptyDesc')}
        action={{ label: t('cosmeticsEmptyCta'), href: '/missions' }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-black text-balance">{t('cosmeticsTitle')}</h2>
        <p className="text-xs text-white/50 text-pretty mt-0.5">{t('cosmeticsSubtitle')}</p>
      </div>

      {grouped.map(({ type, items }) => {
        const TypeIcon = TYPE_ICONS[type];
        return (
          <section key={type} className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <TypeIcon className="size-4 text-white/60" aria-hidden="true" />
              <h3 className="text-sm font-bold text-white/80">{t(TYPE_LABEL_KEY[type])}</h3>
              <span className="text-[10px] text-white/40 ml-auto font-mono tabular-nums">
                {items.length}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map(item => {
                const rarity = item.cosmetic.rarity;
                const colors = RARITY_COLORS[rarity];
                const isEquipped = item.equipped;

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      'p-3 flex flex-col gap-2 relative transition-colors',
                      isEquipped && 'border-gold/40 bg-gold/[0.04]',
                    )}
                  >
                    {isEquipped && (
                      <span className="absolute top-2 right-2 text-[10px] font-bold text-gold bg-gold/15 border border-gold/30 rounded px-1.5 py-0.5">
                        {t('cosmeticsEquipped')}
                      </span>
                    )}

                    {/* Preview area */}
                    <div
                      className={cn(
                        'h-16 rounded-lg flex items-center justify-center',
                        colors.bg,
                        'border',
                        colors.border,
                      )}
                    >
                      <TypeIcon className={cn('size-7', colors.text)} aria-hidden="true" />
                    </div>

                    {/* Name */}
                    <div className="text-xs font-bold text-white truncate">{item.cosmetic.name}</div>

                    {/* Rarity badge */}
                    <span
                      className={cn(
                        'text-[10px] font-bold uppercase tracking-wide self-start px-1.5 py-0.5 rounded',
                        colors.bg,
                        colors.text,
                        'border',
                        colors.border,
                      )}
                    >
                      {rarity}
                    </span>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
