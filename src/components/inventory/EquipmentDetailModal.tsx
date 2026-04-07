'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Flame, Shield, Eye, Crown, Banana, Swords } from 'lucide-react';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import { EQUIPMENT_POSITION_COLORS } from '@/components/gamification/rarityConfig';
import type { DbUserEquipment, DbEquipmentDefinition, EquipmentSource } from '@/types';

// ============================================
// EQUIPMENT ICONS — duplicated from EquipmentSection.tsx
// (per task spec — small lookup, intentional duplication)
// ============================================
const EQUIPMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  shield: Shield,
  eye: Eye,
  crown: Crown,
  banana: Banana,
};

function getEquipmentIcon(iconName: string | null): React.ComponentType<{ className?: string }> {
  return EQUIPMENT_ICONS[iconName ?? ''] ?? Swords;
}

// ============================================
// Props
// ============================================
interface EquipmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  def: DbEquipmentDefinition | null;
  rank: number;
  items: DbUserEquipment[];
  multiplierLabel: string;
  maxRank: number;
}

// ============================================
// EquipmentDetailModal
// ============================================
export default function EquipmentDetailModal({
  open,
  onClose,
  def,
  rank,
  items,
  multiplierLabel,
  maxRank,
}: EquipmentDetailModalProps) {
  const t = useTranslations('inventory');

  if (!def) return null;

  const Icon = getEquipmentIcon(def.icon);
  const eqPosColors = EQUIPMENT_POSITION_COLORS[def.position] ?? EQUIPMENT_POSITION_COLORS.ALL;

  const equippedItem = items.find(eq => eq.equipped_event_id !== null);
  const isEquipped = !!equippedItem;
  const stackCount = items.length;

  // Latest acquired item (most recent acquired_at)
  const latest = [...items].sort((a, b) => b.acquired_at.localeCompare(a.acquired_at))[0];
  const acquiredDate = latest?.acquired_at
    ? new Date(latest.acquired_at).toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  const sourceLabel = (src: EquipmentSource): string => {
    switch (src) {
      case 'mystery_box': return t('equipmentSourceMysteryBox');
      case 'achievement': return t('equipmentSourceAchievement');
      case 'mission': return t('equipmentSourceMission');
      case 'admin_grant': return t('equipmentSourceAdminGrant');
      case 'event_reward': return t('equipmentSourceEventReward');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={def.name_de} size="sm">
      <div className="p-4 space-y-5">
        {/* ── Hero: Big Icon + Multiplier ── */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'size-20 rounded-2xl flex items-center justify-center flex-shrink-0 border',
              eqPosColors.bg,
              eqPosColors.border,
            )}
          >
            <Icon className={cn('size-10', eqPosColors.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-white/50 font-bold uppercase tracking-wide">
              {t('equipmentMultiplier')}
            </div>
            <div className="text-3xl font-black font-mono text-gold tabular-nums">
              {multiplierLabel}
            </div>
            <div className="text-[10px] text-white/40 mt-0.5">
              {t('equipmentDetailMultiplierHint')}
            </div>
          </div>
        </div>

        {/* ── Description ── */}
        {def.description_de && (
          <div className="text-sm text-white/70 text-pretty leading-relaxed">
            {def.description_de}
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Position */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wide mb-1">
              {t('equipmentDetailPosition')}
            </div>
            <span
              className={cn(
                'inline-block text-xs font-bold px-2 py-1 rounded border',
                eqPosColors.bg,
                eqPosColors.text,
                eqPosColors.border,
              )}
            >
              {def.position}
            </span>
          </div>

          {/* Rank */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wide mb-1">
              {t('equipmentDetailRank')}
            </div>
            <div className="font-mono font-black text-sm text-white">
              R{rank}
              <span className="text-white/30 font-medium"> / R{maxRank}</span>
            </div>
          </div>

          {/* Stack */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wide mb-1">
              {t('equipmentDetailStack')}
            </div>
            <div className="font-mono font-black text-sm text-white tabular-nums">
              {stackCount}×
            </div>
          </div>

          {/* Status */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3">
            <div className="text-[10px] text-white/40 uppercase font-bold tracking-wide mb-1">
              {t('equipmentDetailStatus')}
            </div>
            {isEquipped ? (
              <span className="inline-block text-[10px] font-bold text-gold bg-gold/15 border border-gold/30 rounded px-1.5 py-0.5">
                {t('equipmentEquipped')}
              </span>
            ) : (
              <span className="text-xs text-white/40 font-medium">
                {t('equipmentDetailStatusFree')}
              </span>
            )}
          </div>
        </div>

        {/* ── Acquired info ── */}
        {latest && (
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">{t('equipmentDetailSource')}</span>
              <span className="text-white/70 font-bold">{sourceLabel(latest.source)}</span>
            </div>
            {acquiredDate && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">{t('equipmentDetailAcquiredAt')}</span>
                <span className="text-white/70 font-mono tabular-nums">{acquiredDate}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Hint ── */}
        <div className="text-[11px] text-white/40 text-center text-pretty">
          {t('equipmentDetailManagerHint')}
        </div>
      </div>
    </Modal>
  );
}
