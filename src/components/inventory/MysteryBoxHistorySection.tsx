'use client';

import React from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
import { RARITY_CONFIG, type RarityVisualConfig } from '@/components/gamification/rarityConfig';
import type { MysteryBoxResult, MysteryBoxRewardType } from '@/types';

const HISTORY_LIMIT = 20;

const REWARD_ICONS: Record<MysteryBoxRewardType, React.ComponentType<{ className?: string }>> = {
  tickets: Ticket,
  bcredits: Coins,
  cosmetic: Sparkles,
  equipment: Swords,
};

/** Resolve rarity label locale-aware (FIX-05). */
function resolveRarityLabel(conf: RarityVisualConfig, locale: string): string {
  return locale === 'tr' ? conf.label_tr : conf.label_de;
}

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
    case 'cosmetic': {
      // FIX-08: Prefer an actual cosmetic display name where available; fall
      // back to the cosmetic key/id from the stored row, then the generic
      // "Cosmetic" label. `mystery_box_results` only persists `cosmetic_id`
      // (= cosmetic key) — the RPC-return `cosmetic_name` is transient.
      const name = entry.cosmetic_name ?? entry.cosmetic_key ?? entry.cosmetic_id ?? null;
      return name ? t('historyRewardCosmeticNamed', { name }) : t('historyRewardCosmetic');
    }
    default:
      return entry.reward_type;
  }
}

// ============================================
// MysteryBoxHistorySection Component
// ============================================
export default function MysteryBoxHistorySection() {
  const t = useTranslations('inventory');
  const locale = useLocale();
  const { user } = useUser();
  const uid = user?.id;

  const dateLocale = locale === 'tr' ? 'tr-TR' : 'de-DE';

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
      <EmptyState
        icon={<Gift />}
        title={t('historyEmpty')}
        description={t('historyEmptyDesc')}
        action={{ label: t('historyEmptyCta'), href: '/missions' }}
      />
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

      <Card className="p-0 overflow-hidden">
        <ul className="divide-y divide-white/[0.06]">
          {history.map(entry => {
            const rarityCfg = RARITY_CONFIG[entry.rarity];
            const RewardIcon = REWARD_ICONS[entry.reward_type] ?? Gift;
            // FIX-09: Date-Format locale-aware
            const date = new Date(entry.opened_at).toLocaleDateString(dateLocale, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });
            // FIX-13: Ticket-cost transparency per opening (0 = free daily slot)
            const costLabel =
              entry.ticket_cost > 0
                ? t('historyTicketCost', { cost: entry.ticket_cost })
                : t('historyTicketCostFree');

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
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/40">
                    <span className="font-mono tabular-nums">{date}</span>
                    <span aria-hidden="true" className="text-white/20">·</span>
                    <span className="truncate">{costLabel}</span>
                  </div>
                </div>

                {/* Rarity label (FIX-05 locale-aware) */}
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0',
                    rarityCfg.bgClass,
                    rarityCfg.textClass,
                    'border',
                    rarityCfg.borderClass,
                  )}
                >
                  {resolveRarityLabel(rarityCfg, locale)}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
