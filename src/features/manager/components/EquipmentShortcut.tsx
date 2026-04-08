'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Swords, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useUserEquipment, useEquipmentDefinitions } from '@/lib/queries/equipment';

/**
 * Shared shortcut button used in Aufstellen + Kader tabs.
 * Links to /inventory?tab=equipment and shows a live count hint.
 * Zero layout commitment — it's a single row that drops into a `space-y-4` flow.
 */
export default function EquipmentShortcut() {
  const t = useTranslations('manager');
  const { user } = useUser();
  const uid = user?.id;

  const { data: inventory = [] } = useUserEquipment(uid);
  const { data: definitions = [] } = useEquipmentDefinitions();

  const stats = useMemo(() => {
    const active = inventory.filter(eq => !eq.consumed_at);
    const typesOwned = new Set(active.map(eq => eq.equipment_key));
    return {
      count: active.length,
      types: typesOwned.size,
      total: definitions.length || 5,
    };
  }, [inventory, definitions]);

  const hasItems = stats.count > 0;

  return (
    <Link
      href="/inventory?tab=equipment"
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors min-h-[44px]',
        'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
        hasItems
          ? 'bg-gold/[0.04] border-gold/[0.15] hover:bg-gold/[0.06] hover:border-gold/25'
          : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-white/20',
      )}
      style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}
    >
      <div
        className={cn(
          'size-9 rounded-lg flex items-center justify-center flex-shrink-0',
          hasItems ? 'bg-gold/15' : 'bg-white/[0.04]',
        )}
      >
        <Swords
          className={cn('size-4.5', hasItems ? 'text-gold' : 'text-white/50')}
          aria-hidden="true"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white truncate">
          {t('equipmentShortcutLabel')}
        </div>
        <div className="text-[11px] text-white/50 truncate font-mono tabular-nums">
          {hasItems
            ? t('equipmentShortcutHint', {
                count: stats.count,
                types: stats.types,
                total: stats.total,
              })
            : t('equipmentShortcutEmpty')}
        </div>
      </div>
      <ChevronRight className="size-4 text-white/30 flex-shrink-0" aria-hidden="true" />
    </Link>
  );
}
