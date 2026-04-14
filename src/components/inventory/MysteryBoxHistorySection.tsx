'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  Gift,
  Loader2,
  Ticket,
  Coins,
  Sparkles,
  Swords,
} from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useMysteryBoxHistory } from '@/lib/queries/mysteryBox';
import { RARITY_CONFIG } from '@/components/gamification/rarityConfig';
import { MysteryBoxDisclaimer } from '@/components/legal/MysteryBoxDisclaimer';
import type { MysteryBoxResult, MysteryBoxRewardType } from '@/types';

const HISTORY_LIMIT = 20;

const REWARD_ICONS: Record<MysteryBoxRewardType, React.ComponentType<{ className?: string }>> = {
  tickets: Ticket,
  bcredits: Coins,
  cosmetic: Sparkles,
  equipment: Swords,
};

function formatRewardLabel(
  entry: MysteryBoxResult,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  switch (entry.reward_type) {
    case 'tickets':
      return t('historyRewardTickets', { count: entry.tickets_amount ?? 0 });
    case 'bcredits':
      return t('historyRewardBcredits', { amount: entry.bcredits_amount ?? 0 });
    case 'equipment': {
      const name = entry.equipment_type ?? 'Equipment';
      if (entry.equipment_rank !== null && entry.equipment_rank !== undefined) {
        return t('historyRewardEquipment', { name, rank: entry.equipment_rank });
      }
      return t('historyRewardEquipmentNoRank', { name });
    }
    case 'cosmetic':
      return t('historyRewardCosmetic');
    default:
      return entry.reward_type;
  }
}

// ============================================
// MysteryBoxHistorySection Component
// ============================================
export default function MysteryBoxHistorySection() {
  const t = useTranslations('inventory');
  const { user } = useUser();
  const uid = user?.id;

  const { data: history = [], isLoading } = useMysteryBoxHistory(uid, HISTORY_LIMIT);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" aria-hidden="true" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="space-y-4">
        {/* AR-47: Compliance-Disclaimer — auch im Empty-State sichtbar */}
        <MysteryBoxDisclaimer variant="card" />
        <EmptyState
          icon={<Gift />}
          title={t('historyEmpty')}
          description={t('historyEmptyDesc')}
          action={{ label: t('historyEmptyCta'), href: '/missions' }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-lg font-black text-balance">{t('historyTitle')}</h2>
        <p className="text-xs text-white/50 text-pretty mt-0.5">
          {t('historySubtitle', { limit: HISTORY_LIMIT })}
        </p>
      </div>

      {/* AR-47: Compliance-Disclaimer oberhalb der History-Liste */}
      <MysteryBoxDisclaimer variant="card" />

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y divide-white/[0.06]">
          {history.map(entry => {
            const rarityCfg = RARITY_CONFIG[entry.rarity];
            const RewardIcon = REWARD_ICONS[entry.reward_type] ?? Gift;
            const date = new Date(entry.opened_at).toLocaleDateString('de-DE', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <li key={entry.id} className="flex items-center gap-3 p-3">
                {/* Rarity badge */}
                <div
                  className={cn(
                    'size-10 rounded-lg flex items-center justify-center flex-shrink-0',
                    rarityCfg.bgClass,
                    'border',
                    rarityCfg.borderClass,
                  )}
                >
                  <RewardIcon className={cn('size-5', rarityCfg.textClass)} aria-hidden="true" />
                </div>

                {/* Reward info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {formatRewardLabel(entry, t)}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5 font-mono tabular-nums">
                    {date}
                  </div>
                </div>

                {/* Rarity label */}
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0',
                    rarityCfg.bgClass,
                    rarityCfg.textClass,
                    'border',
                    rarityCfg.borderClass,
                  )}
                >
                  {rarityCfg.label_de}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
