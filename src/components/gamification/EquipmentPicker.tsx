'use client';

import React, { useMemo } from 'react';
import { Flame, Shield, Eye, Crown, Banana, Swords } from 'lucide-react';
import { Modal, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import type { DbUserEquipment, DbEquipmentDefinition, EquipmentPosition } from '@/types';
import { EQUIPMENT_POSITION_COLORS } from './rarityConfig';
import { resolveEquipmentName } from './equipmentNames';

// ============================================
// EQUIPMENT PICKER — Bottom Sheet
// ============================================

interface EquipmentPickerProps {
  open: boolean;
  onClose: () => void;
  /** Player position to filter equipment (ATT/MID/DEF/GK) */
  playerPosition: EquipmentPosition | null;
  /** Player name for display */
  playerName: string;
  /** Slot key (gk, def1, mid1, att, etc.) */
  slotKey: string;
  /** User's available equipment inventory */
  inventory: DbUserEquipment[];
  /** Equipment definitions for display info */
  definitions: DbEquipmentDefinition[];
  /** Currently equipped equipment ID on this slot (null = none) */
  equippedId: string | null;
  /** Callback when user selects equipment */
  onEquip: (equipmentId: string) => void;
  /** Callback when user removes equipment */
  onUnequip: () => void;
  loading?: boolean;
}

const EQUIPMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  flame: Flame,
  shield: Shield,
  eye: Eye,
  crown: Crown,
  banana: Banana,
};

function getEquipmentIcon(iconName: string | null) {
  return EQUIPMENT_ICONS[iconName ?? ''] ?? Swords;
}

/** Map player position string to EquipmentPosition */
function mapPlayerPosition(pos: string | null): EquipmentPosition {
  if (!pos) return 'ALL';
  const p = pos.toLowerCase();
  if (p.startsWith('goal') || p.startsWith('tor') || p === 'gk') return 'GK';
  if (p.startsWith('def') || p.startsWith('abw')) return 'DEF';
  if (p.startsWith('mid') || p.startsWith('mit')) return 'MID';
  if (p.startsWith('att') || p.startsWith('for') || p.startsWith('stu')) return 'ATT';
  return 'ALL';
}

export { mapPlayerPosition };

export default function EquipmentPicker({
  open,
  onClose,
  playerPosition,
  playerName,
  slotKey,
  inventory,
  definitions,
  equippedId,
  onEquip,
  onUnequip,
  loading = false,
}: EquipmentPickerProps) {
  const t = useTranslations('gamification');
  const tInv = useTranslations('inventory');
  const locale = useLocale();

  // Filter inventory to matching position (equipment.position matches player, or equipment is ALL)
  const availableEquipment = useMemo(() => {
    if (!playerPosition) return [];
    return inventory.filter(eq => {
      const def = definitions.find(d => d.key === eq.equipment_key);
      if (!def) return false;
      // Available: not consumed, not equipped to another event
      if (eq.consumed_at) return false;
      if (eq.equipped_event_id && eq.id !== equippedId) return false;
      // Position match: equipment fits player position or is ALL
      return def.position === 'ALL' || def.position === playerPosition;
    });
  }, [inventory, definitions, playerPosition, equippedId]);

  // Group by equipment_key + rank for stacking display
  // FIX-01 + FIX-12: Locale-aware sort (TR Unicode ş/ç/ğ/ı/ö/ü).
  const grouped = useMemo(() => {
    const map = new Map<string, { def: DbEquipmentDefinition; rank: number; items: DbUserEquipment[] }>();
    for (const eq of availableEquipment) {
      const key = `${eq.equipment_key}_${eq.rank}`;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(eq);
      } else {
        const def = definitions.find(d => d.key === eq.equipment_key);
        if (def) {
          map.set(key, { def, rank: eq.rank, items: [eq] });
        }
      }
    }
    // Sort: higher rank first, then by resolved display name.
    return Array.from(map.values()).sort(
      (a, b) =>
        b.rank - a.rank ||
        resolveEquipmentName(a.def, locale).localeCompare(
          resolveEquipmentName(b.def, locale),
          locale,
        ),
    );
  }, [availableEquipment, definitions, locale]);

  const posColors = EQUIPMENT_POSITION_COLORS[playerPosition ?? 'ALL'] ?? EQUIPMENT_POSITION_COLORS.ALL;
  const multiplierLabels: Record<number, string> = { 1: '×1.05', 2: '×1.10', 3: '×1.15', 4: '×1.25' };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('equipmentPickerTitle')}
      size="sm"
      // FIX-08: Prevent-Close waehrend Server-Call laeuft — verhindert dass User
      // mid-transaction den Sheet zumacht und den (optimistic) State verliert.
      preventClose={loading}
    >
      <div className="px-1 py-2">
        {/* Player info */}
        <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl mb-3', posColors.bg)}>
          <span className={cn('text-xs font-bold', posColors.text)}>{playerPosition}</span>
          <span className="text-sm font-bold text-white truncate">{playerName}</span>
        </div>

        {/* Currently equipped — remove button */}
        {equippedId && (
          <div className="mb-3">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={onUnequip}
              disabled={loading}
            >
              {t('removeEquipment')}
            </Button>
          </div>
        )}

        {/* Equipment list */}
        {grouped.length === 0 ? (
          <div className="text-center py-8">
            <Swords className="size-8 mx-auto mb-2 text-white/20" aria-hidden="true" />
            <p className="text-sm text-white/40">{t('noEquipmentAvailable')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map(({ def, rank, items }) => {
              const Icon = getEquipmentIcon(def.icon);
              const isCurrentlyEquipped = items.some(eq => eq.id === equippedId);
              const firstAvailable = items.find(eq => eq.id !== equippedId) ?? items[0];
              const eqPosColors = EQUIPMENT_POSITION_COLORS[def.position] ?? EQUIPMENT_POSITION_COLORS.ALL;

              return (
                <button
                  key={`${def.key}_${rank}`}
                  onClick={() => {
                    if (!isCurrentlyEquipped && firstAvailable) {
                      onEquip(firstAvailable.id);
                    }
                  }}
                  disabled={loading || isCurrentlyEquipped}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-colors min-h-[56px]',
                    isCurrentlyEquipped
                      ? 'border-gold/40 bg-gold/[0.08] cursor-default'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
                    loading && 'opacity-50 cursor-not-allowed',
                  )}
                >
                  {/* Icon */}
                  <div className={cn('size-10 rounded-lg flex items-center justify-center flex-shrink-0', eqPosColors.bg)}>
                    <Icon className={cn('size-5', eqPosColors.text)} aria-hidden="true" />
                  </div>

                  {/* Name + Position */}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {resolveEquipmentName(def, locale)}
                      </span>
                      <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', eqPosColors.bg, eqPosColors.text)}>
                        {def.position}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {multiplierLabels[rank] ?? `×${rank}`} {tInv('equipmentMultiplier')}
                    </div>
                  </div>

                  {/* Rank badge */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-black text-xs text-white/60 bg-white/[0.08] px-2 py-1 rounded">
                      R{rank}
                    </span>
                    {/* Stack count */}
                    {items.length > 1 && (
                      <span className="font-mono text-[10px] text-white/30">
                        ×{items.length}
                      </span>
                    )}
                    {isCurrentlyEquipped && (
                      <span className="text-[10px] font-bold text-gold">{t('equipped')}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
