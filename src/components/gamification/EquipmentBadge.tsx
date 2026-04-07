'use client';

import React from 'react';
import { Flame, Shield, Eye, Crown, Banana, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EquipmentType } from '@/types';
import { EQUIPMENT_POSITION_COLORS } from './rarityConfig';

// ============================================
// EQUIPMENT BADGE — Small overlay for pitch slots
// ============================================

interface EquipmentBadgeProps {
  equipmentKey: EquipmentType;
  rank: number;
  position: string;
  /** Size variant */
  size?: 'sm' | 'md';
  className?: string;
}

const EQUIPMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  fire_shot: Flame,
  iron_wall: Shield,
  cat_eye: Eye,
  captain: Crown,
  banana_cross: Banana,
};

export default function EquipmentBadge({ equipmentKey, rank, position, size = 'sm', className }: EquipmentBadgeProps) {
  const Icon = EQUIPMENT_ICONS[equipmentKey] ?? Swords;
  const posColors = EQUIPMENT_POSITION_COLORS[position] ?? EQUIPMENT_POSITION_COLORS.ALL;
  const multiplierLabels: Record<number, string> = { 1: '1.05', 2: '1.10', 3: '1.15', 4: '1.25' };

  if (size === 'sm') {
    return (
      <div className={cn(
        'flex items-center gap-0.5 px-1 py-0.5 rounded-md border text-[8px]',
        posColors.bg, posColors.border,
        className,
      )}>
        <Icon className={cn('size-2.5', posColors.text)} aria-hidden="true" />
        <span className={cn('font-black', posColors.text)}>R{rank}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] bg-[#0a0a0a]/90 backdrop-blur-sm',
      posColors.border,
      className,
    )}>
      <Icon className={cn('size-3.5', posColors.text)} aria-hidden="true" />
      <span className={cn('font-black', posColors.text)}>R{rank}</span>
      <span className="text-white/50 font-mono tabular-nums">×{multiplierLabels[rank] ?? rank}</span>
    </div>
  );
}
