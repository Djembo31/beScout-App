'use client';

import { cn } from '@/lib/utils';
import type { CosmeticRarity } from '@/types';

interface CosmeticTitleProps {
  title: string | null;
  rarity?: CosmeticRarity;
  className?: string;
}

const rarityColors: Record<CosmeticRarity, string> = {
  common: 'text-white/40',
  uncommon: 'text-green-400',
  rare: 'text-sky-400',
  epic: 'text-purple-400',
  legendary: 'text-gold',
};

export function CosmeticTitle({ title, rarity = 'common', className }: CosmeticTitleProps) {
  if (!title) return null;

  return (
    <span className={cn('text-[11px] font-bold', rarityColors[rarity], className)}>
      {title}
    </span>
  );
}
