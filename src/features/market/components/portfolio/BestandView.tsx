'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUser } from '@/components/providers/AuthProvider';
import { useMarketStore } from '@/features/market/store/marketStore';
import BestandHeader from './BestandHeader';
import BestandPlayerRow from './BestandPlayerRow';
import type { BestandItem } from './BestandPlayerRow';
import type { Player, DbOrder } from '@/types';

// ============================================
// TYPES
// ============================================

type SortKey = 'value' | 'pnl' | 'l5' | 'name';

interface BestandViewProps {
  mySquadPlayers: Player[];
  holdings: { player_id: string; quantity: number; avg_buy_price: number }[];
  floorMap: Map<string, number>;
  recentOrders: DbOrder[];
  buyOrders: DbOrder[];
  scoresMap?: Map<string, (number | null)[]>;
  lockedMap?: Map<string, number>;
}

// ============================================
// COMPONENT
// ============================================

export default function BestandView({
  mySquadPlayers, holdings, floorMap, recentOrders, buyOrders, scoresMap, lockedMap,
}: BestandViewProps) {
  const t = useTranslations('market');
  const { user } = useUser();
  const uid = user?.id;
  const { setTab } = useMarketStore();
  const [sortBy, setSortBy] = useState<SortKey>('value');

  // ── Build holdings map ──
  const holdingsMap = useMemo(() => {
    const m = new Map<string, { quantity: number; avgBuyCents: number }>();
    for (const h of holdings) {
      m.set(h.player_id, { quantity: h.quantity, avgBuyCents: h.avg_buy_price });
    }
    return m;
  }, [holdings]);

  // ── Build my sell orders per player ──
  const mySellOrdersMap = useMemo(() => {
    const m = new Map<string, { price: number; quantity: number }[]>();
    if (!uid) return m;
    for (const o of recentOrders) {
      if (o.user_id !== uid || o.side !== 'sell') continue;
      const arr = m.get(o.player_id) ?? [];
      arr.push({ price: o.price, quantity: o.quantity - (o.filled_qty ?? 0) });
      m.set(o.player_id, arr);
    }
    return m;
  }, [recentOrders, uid]);

  // ── Build buy order count per player ──
  const buyOrderCountMap = useMemo(() => {
    const m = new Map<string, number>();
    if (!uid) return m;
    for (const o of buyOrders) {
      if (o.user_id === uid) continue; // eigene Buy-Orders nicht zaehlen
      m.set(o.player_id, (m.get(o.player_id) ?? 0) + 1);
    }
    return m;
  }, [buyOrders, uid]);

  // ── Build bestand items ──
  const items: BestandItem[] = useMemo(() => {
    return mySquadPlayers.map(p => {
      const h = holdingsMap.get(p.id);
      const qty = h?.quantity ?? p.dpc.owned;
      const avgBuyCents = h?.avgBuyCents ?? 0;
      const floorCents = floorMap.get(p.id) ?? 0;
      const valueCents = qty * floorCents;
      const costCents = qty * avgBuyCents;
      const pnlPct = costCents > 0 ? ((valueCents - costCents) / costCents) * 100 : 0;

      return {
        player: p,
        quantity: qty,
        avgBuyCents,
        floorCents,
        valueCents,
        pnlPct,
        lockedQty: lockedMap?.get(p.id) ?? 0,
        mySellOrders: mySellOrdersMap.get(p.id) ?? [],
        buyOrderCount: buyOrderCountMap.get(p.id) ?? 0,
        lastTradeCents: p.prices.lastTrade ?? null,
      };
    });
  }, [mySquadPlayers, holdingsMap, floorMap, lockedMap, mySellOrdersMap, buyOrderCountMap]);

  // ── Sort ──
  const sorted = useMemo(() => {
    const copy = [...items];
    switch (sortBy) {
      case 'value': return copy.sort((a, b) => b.valueCents - a.valueCents);
      case 'pnl': return copy.sort((a, b) => b.pnlPct - a.pnlPct);
      case 'l5': return copy.sort((a, b) => b.player.perf.l5 - a.player.perf.l5);
      case 'name': return copy.sort((a, b) => a.player.last.localeCompare(b.player.last));
      default: return copy;
    }
  }, [items, sortBy]);

  // ── Portfolio totals ──
  const totalValueCents = useMemo(() => items.reduce((s, i) => s + i.valueCents, 0), [items]);
  const totalCostCents = useMemo(() => items.reduce((s, i) => s + i.quantity * i.avgBuyCents, 0), [items]);
  const scCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  // ── Switch to Marktplatz tab ──
  const handleGoToMarktplatz = useCallback(() => setTab('marktplatz'), [setTab]);

  // ── Sort options ──
  const sortOptions: { key: SortKey; label: string }[] = [
    { key: 'value', label: t('bestandSortValue', { defaultMessage: 'Wert' }) },
    { key: 'pnl', label: 'P&L' },
    { key: 'l5', label: 'L5' },
    { key: 'name', label: 'Name' },
  ];

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title={t('bestandEmpty', { defaultMessage: 'Noch keine Scout Cards' })}
        description={t('bestandEmptyDesc', { defaultMessage: 'Kaufe Scout Cards auf dem Marktplatz und baue dein Portfolio auf.' })}
        action={{ label: t('bestandEmptyCta', { defaultMessage: 'Marktplatz entdecken' }), onClick: handleGoToMarktplatz }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Portfolio Header */}
      <BestandHeader
        totalValueCents={totalValueCents}
        totalCostCents={totalCostCents}
        scCount={scCount}
      />

      {/* Sort bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">
          {items.length} {items.length === 1 ? 'Spieler' : 'Spieler'}
        </span>
        <div className="flex items-center gap-1">
          <ArrowUpDown className="size-3.5 text-white/30" aria-hidden="true" />
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors min-h-[36px]',
                sortBy === opt.key
                  ? 'bg-white/[0.10] text-white'
                  : 'text-white/40 hover:text-white/60'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Player list */}
      <div className="space-y-2">
        {sorted.map(item => (
          <BestandPlayerRow
            key={item.player.id}
            item={item}
            scores={scoresMap?.get(item.player.id)}
          />
        ))}
      </div>
    </div>
  );
}
