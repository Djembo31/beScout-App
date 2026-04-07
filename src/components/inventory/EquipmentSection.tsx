'use client';

import React, { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Flame, Shield, Eye, Crown, Banana, Swords, Loader2, Package } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import {
  useUserEquipment,
  useEquipmentDefinitions,
  useEquipmentRanks,
} from '@/lib/queries/equipment';
import { EQUIPMENT_POSITION_COLORS } from '@/components/gamification/rarityConfig';
import type { DbUserEquipment, DbEquipmentDefinition } from '@/types';
import EquipmentDetailModal from './EquipmentDetailModal';

// ============================================
// EQUIPMENT ICONS — duplicated from EquipmentPicker.tsx
// (duplication acceptable per task spec)
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
// EquipmentSection Component
// ============================================
export default function EquipmentSection() {
  const t = useTranslations('inventory');
  const { user } = useUser();
  const uid = user?.id;

  const { data: inventory = [], isLoading: invLoading } = useUserEquipment(uid);
  const { data: definitions = [], isLoading: defLoading } = useEquipmentDefinitions();
  const { data: ranks = [], isLoading: rankLoading } = useEquipmentRanks();

  const loading = invLoading || defLoading || rankLoading;

  // Group equipment by `equipment_key + rank` (mirrors EquipmentPicker.tsx Z. 92-108)
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      { def: DbEquipmentDefinition; rank: number; items: DbUserEquipment[] }
    >();
    for (const eq of inventory) {
      // Skip consumed
      if (eq.consumed_at) continue;
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
    // Sort by rank desc, then name
    return Array.from(map.values()).sort(
      (a, b) => b.rank - a.rank || a.def.name_de.localeCompare(b.def.name_de),
    );
  }, [inventory, definitions]);

  // Build rank → multiplier label map (uses DB ranks if present)
  const multiplierLabels = useMemo<Record<number, string>>(() => {
    const out: Record<number, string> = { 1: '×1.05', 2: '×1.10', 3: '×1.15', 4: '×1.25' };
    for (const r of ranks) {
      out[r.rank] = `×${r.multiplier.toFixed(2).replace(/\.?0+$/, '')}`;
    }
    return out;
  }, [ranks]);

  // Max rank for "R3 / R4" display in detail modal
  const maxRank = useMemo(() => {
    if (ranks.length > 0) return Math.max(...ranks.map(r => r.rank));
    return 4; // Fallback to legacy 4-rank system
  }, [ranks]);

  // Selected item for detail modal
  const [selected, setSelected] = useState<{
    def: DbEquipmentDefinition;
    rank: number;
    items: DbUserEquipment[];
  } | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (grouped.length === 0) {
    return (
      <EmptyState
        icon={<Package />}
        title={t('equipmentEmpty')}
        description={t('equipmentEmptyDesc')}
        action={{ label: t('equipmentEmptyCta'), href: '/missions' }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-black text-balance">{t('equipmentTitle')}</h2>
        <p className="text-xs text-white/50 text-pretty mt-0.5">{t('equipmentSubtitle')}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {grouped.map(({ def, rank, items }) => {
          const Icon = getEquipmentIcon(def.icon);
          const eqPosColors =
            EQUIPMENT_POSITION_COLORS[def.position] ?? EQUIPMENT_POSITION_COLORS.ALL;
          const equippedItem = items.find(eq => eq.equipped_event_id !== null);
          const isEquipped = !!equippedItem;
          const stackCount = items.length;

          return (
            <button
              key={`${def.key}_${rank}`}
              type="button"
              onClick={() => setSelected({ def, rank, items })}
              aria-label={`${def.name_de} R${rank} — ${t('equipmentDetailOpen')}`}
              className={cn(
                'text-left p-3 flex flex-col gap-2 relative rounded-2xl border bg-white/[0.02] border-white/10 shadow-card-sm transition-all',
                'hover:bg-white/[0.04] hover:border-white/20 active:scale-[0.97]',
                'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
                isEquipped && 'border-gold/40 bg-gold/[0.04] hover:border-gold/50',
              )}
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
            >
              {/* Equipped badge — top-right */}
              {isEquipped && (
                <span className="absolute top-2 right-2 text-[10px] font-bold text-gold bg-gold/15 border border-gold/30 rounded px-1.5 py-0.5">
                  {t('equipmentEquipped')}
                </span>
              )}

              {/* Icon + name */}
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'size-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    eqPosColors.bg,
                  )}
                >
                  <Icon className={cn('size-5', eqPosColors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">{def.name_de}</div>
                  <div className="text-[10px] text-white/40 mt-0.5 truncate">
                    {multiplierLabels[rank] ?? `×${rank}`} {t('equipmentMultiplier')}
                  </div>
                </div>
              </div>

              {/* Position + Rank + Stack */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded',
                    eqPosColors.bg,
                    eqPosColors.text,
                    'border',
                    eqPosColors.border,
                  )}
                >
                  {def.position}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs text-white/60 bg-white/[0.08] px-2 py-1 rounded">
                    R{rank}
                  </span>
                  {stackCount > 1 && (
                    <span className="font-mono text-[10px] text-white/40 tabular-nums">
                      ×{stackCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Modal */}
      <EquipmentDetailModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        def={selected?.def ?? null}
        rank={selected?.rank ?? 0}
        items={selected?.items ?? []}
        multiplierLabel={selected ? multiplierLabels[selected.rank] ?? `×${selected.rank}` : ''}
        maxRank={maxRank}
      />
    </div>
  );
}
