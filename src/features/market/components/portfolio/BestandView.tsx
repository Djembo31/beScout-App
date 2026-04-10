'use client';

import React, { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpDown, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { PosFilter } from '@/components/ui/PosFilter';
import { useUser } from '@/components/providers/AuthProvider';
import { useMarketStore } from '@/features/market/store/marketStore';
import { getClub } from '@/lib/clubs';
import type { ClubLookup } from '@/lib/clubs';
import BestandHeader from './BestandHeader';
import type { ClubCount } from './BestandHeader';
import BestandPlayerRow from './BestandPlayerRow';
import type { BestandItem } from './BestandPlayerRow';
import type { Player, DbOrder, Pos } from '@/types';

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
  const [filterPos, setFilterPos] = useState<Set<Pos>>(new Set());
  const [filterClub, setFilterClub] = useState<string | null>(null);

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
      if (o.user_id === uid) continue;
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
      const avgBuyBsd = avgBuyCents / 100;
      const floorBsd = floorMap.get(p.id) ?? 0;
      const valueBsd = qty * floorBsd;
      const costBsd = qty * avgBuyBsd;
      const pnlPct = costBsd > 0 ? ((valueBsd - costBsd) / costBsd) * 100 : 0;

      return {
        player: p,
        quantity: qty,
        avgBuyBsd,
        floorBsd,
        valueBsd,
        pnlPct,
        lockedQty: lockedMap?.get(p.id) ?? 0,
        mySellOrders: (mySellOrdersMap.get(p.id) ?? []).map(o => ({ priceCents: o.price, quantity: o.quantity })),
        buyOrderCount: buyOrderCountMap.get(p.id) ?? 0,
        lastTradeBsd: p.prices.lastTrade ?? null,
      };
    });
  }, [mySquadPlayers, holdingsMap, floorMap, lockedMap, mySellOrdersMap, buyOrderCountMap]);

  // ── Position counts (unfiltered, for header + filter badges) ──
  const posCounts = useMemo(() => {
    const counts: Record<Pos, number> = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    for (const i of items) counts[i.player.pos] += i.quantity;
    return counts;
  }, [items]);

  // ── Club counts (unfiltered, for header) ──
  const clubCounts: ClubCount[] = useMemo(() => {
    const map = new Map<string, { club: ClubLookup; count: number }>();
    for (const i of items) {
      const clubId = i.player.clubId;
      if (!clubId) continue;
      const entry = map.get(clubId);
      if (entry) {
        entry.count += i.quantity;
      } else {
        const club = getClub(clubId);
        if (club) map.set(clubId, { club, count: i.quantity });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [items]);

  // ── Filter items ──
  const filtered = useMemo(() => {
    let result = items;
    if (filterPos.size > 0) {
      result = result.filter(i => filterPos.has(i.player.pos));
    }
    if (filterClub) {
      result = result.filter(i => i.player.clubId === filterClub);
    }
    return result;
  }, [items, filterPos, filterClub]);

  // ── Sort ──
  const sorted = useMemo(() => {
    const copy = [...filtered];
    switch (sortBy) {
      case 'value': return copy.sort((a, b) => b.valueBsd - a.valueBsd);
      case 'pnl': return copy.sort((a, b) => b.pnlPct - a.pnlPct);
      case 'l5': return copy.sort((a, b) => b.player.perf.l5 - a.player.perf.l5);
      case 'name': return copy.sort((a, b) => a.player.last.localeCompare(b.player.last));
      default: return copy;
    }
  }, [filtered, sortBy]);

  // ── Portfolio totals (all in $SCOUT / BSD, from ALL items, not filtered) ──
  const totalValueBsd = useMemo(() => items.reduce((s, i) => s + i.valueBsd, 0), [items]);
  const totalCostBsd = useMemo(() => items.reduce((s, i) => s + i.quantity * i.avgBuyBsd, 0), [items]);
  const scCount = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  // ── Handlers ──
  const handleGoToMarktplatz = useCallback(() => setTab('marktplatz'), [setTab]);
  const handleTogglePos = useCallback((pos: Pos) => {
    setFilterPos(prev => {
      const next = new Set(prev);
      if (next.has(pos)) next.delete(pos); else next.add(pos);
      return next;
    });
  }, []);
  const handleToggleClub = useCallback((clubId: string) => {
    setFilterClub(prev => prev === clubId ? null : clubId);
  }, []);

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
      {/* Portfolio Header with position + club breakdown */}
      <BestandHeader
        totalValueBsd={totalValueBsd}
        totalCostBsd={totalCostBsd}
        scCount={scCount}
        posCounts={posCounts}
        clubCounts={clubCounts}
      />

      {/* Filters: Position + Club */}
      <div className="space-y-2">
        <PosFilter
          multi
          selected={filterPos}
          onChange={handleTogglePos}
          counts={posCounts}
        />
        {clubCounts.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {clubCounts.map(({ club }) => (
              <button
                key={club.id}
                onClick={() => handleToggleClub(club.id)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors shrink-0',
                  filterClub === club.id
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-surface-base border-white/10 text-white/40 hover:text-white/60'
                )}
              >
                {club.logo && (
                  <img src={club.logo} alt="" width={12} height={12} className="size-3 rounded-full object-cover" />
                )}
                {club.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sort bar */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/50">
          {sorted.length} {sorted.length === 1 ? 'Spieler' : 'Spieler'}
          {(filterPos.size > 0 || filterClub) && ` / ${items.length}`}
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

      {/* No results after filter */}
      {sorted.length === 0 && items.length > 0 && (
        <div className="text-center text-sm text-white/30 py-8">
          {t('bestandNoFilterResults', { defaultMessage: 'Keine Spieler fuer diesen Filter.' })}
        </div>
      )}
    </div>
  );
}
