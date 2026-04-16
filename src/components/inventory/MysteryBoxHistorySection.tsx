'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import {
  Gift,
  Loader2,
  Ticket,
  Coins,
  Sparkles,
  Swords,
  Package,
  ArrowRight,
} from 'lucide-react';
import { Card, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useUser } from '@/components/providers/AuthProvider';
import { useMysteryBoxHistory } from '@/lib/queries/mysteryBox';
import { useEquipmentDefinitions } from '@/lib/queries/equipment';
import { RARITY_CONFIG, type RarityVisualConfig } from '@/components/gamification/rarityConfig';
import { resolveEquipmentName } from '@/components/gamification/equipmentNames';
import { MysteryBoxDisclaimer } from '@/components/legal/MysteryBoxDisclaimer';
import type { MysteryBoxResult, MysteryBoxRewardType, DbEquipmentDefinition } from '@/types';

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
  equipmentDefs: DbEquipmentDefinition[],
  locale: string,
): string {
  switch (entry.reward_type) {
    case 'tickets':
      return t('historyRewardTickets', { count: entry.tickets_amount ?? 0 });
    case 'bcredits':
      return t('historyRewardBcredits', { amount: entry.bcredits_amount ?? 0 });
    case 'equipment': {
      // FIX-02: `mystery_box_results.equipment_type` persistiert den KEY
      // ("fire_shot", "banana_cross", ...). Frueher zeigten wir den technischen
      // Key direkt — User sah "fire_shot (R2)" statt "Feuerschuss (R2)" /
      // "Ateş Şutu (R2)". Lookup via equipment_definitions-Cache +
      // locale-aware resolver.
      const key = entry.equipment_type;
      const def = key ? equipmentDefs.find(d => d.key === key) : undefined;
      const name = def
        ? resolveEquipmentName(def, locale)
        : entry.equipment_name_tr && locale === 'tr'
          ? entry.equipment_name_tr
          : entry.equipment_name_de ?? key ?? 'Equipment';
      if (entry.equipment_rank !== null && entry.equipment_rank !== undefined) {
        return t('historyRewardEquipment', { name, rank: entry.equipment_rank });
      }
      return t('historyRewardEquipmentNoRank', { name });
    }
    case 'cosmetic': {
      // Persisted rows only carry `cosmetic_id` (= cosmetic key stored at
      // insert); fresh RPC rows also expose `cosmetic_key`. Slice 007 removed
      // the never-populated `cosmetic_name` field (open_mystery_box_v2 does
      // not return it).
      const name = entry.cosmetic_key ?? entry.cosmetic_id ?? null;
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
  // FIX-02: Equipment-Definitions für Key→Name-Lookup in History-Eintraegen.
  // 5min staleTime (static config), kein Loading-Guard noetig — fallback auf Key.
  const { data: equipmentDefs = [] } = useEquipmentDefinitions();
  // FIX-11: Zeige "Zu meinem Equipment"-CTA wenn der User mindestens 1 Equipment-Drop hat.
  const hasEquipmentDrop = history.some(entry => entry.reward_type === 'equipment');

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
      <div className="px-1 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-balance">{t('historyTitle')}</h2>
          <p className="text-xs text-white/50 text-pretty mt-0.5">
            {t('historySubtitle', { limit: HISTORY_LIMIT })}
          </p>
        </div>
        {/* FIX-11: Quick-Jump "Zu meinem Equipment" wenn User Equipment-Drops hat. */}
        {hasEquipmentDrop && (
          <Link
            href="/inventory?tab=equipment"
            className={cn(
              'inline-flex items-center gap-1.5 min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold transition-colors border flex-shrink-0',
              'bg-white/[0.02] border-white/10 text-white/60 hover:border-white/20 hover:text-white/80',
              'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none',
            )}
          >
            <Package className="size-3.5" aria-hidden="true" />
            <span>{t('historyEquipmentCta')}</span>
            <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
        )}
      </div>

      {/* AR-47: Compliance-Disclaimer oberhalb der History-Liste */}
      <MysteryBoxDisclaimer variant="card" />

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
                    {formatRewardLabel(entry, t, equipmentDefs, locale)}
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
