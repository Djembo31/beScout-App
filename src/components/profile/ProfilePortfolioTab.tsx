'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import { fmtScout, cn } from '@/lib/utils';
import type { Pos } from '@/types';
import type { HoldingRow } from './ProfileOverviewTab';

// ============================================
// TYPES
// ============================================

interface ProfilePortfolioTabProps {
  holdings: HoldingRow[];
}

// ============================================
// HELPER: convert HoldingRow → minimal Player
// ============================================

function holdingRowToPlayer(h: HoldingRow) {
  return {
    id: h.player_id,
    first: h.player?.first_name ?? '',
    last: h.player?.last_name ?? '',
    club: h.player?.club ?? '',
    pos: (h.player?.position ?? 'MID') as Pos,
    age: h.player?.age ?? 0,
    ticket: h.player?.shirt_number ?? 0,
    status: 'fit' as const,
    contractMonthsLeft: 24,
    country: '',
    league: '',
    isLiquidated: false,
    stats: { matches: h.player?.matches ?? 0, goals: h.player?.goals ?? 0, assists: h.player?.assists ?? 0 },
    perf: { l5: h.player?.perf_l5 ?? 0, l15: 0, trend: 'FLAT' as const },
    prices: { lastTrade: 0, floor: centsToBsd(h.player?.floor_price ?? 0), change24h: h.player?.price_change_24h ?? 0 },
    dpc: { supply: 0, float: 0, circulation: 0, onMarket: 0, owned: h.quantity },
    ipo: { status: 'none' as const },
    imageUrl: h.player?.image_url ?? null,
    listings: [],
    topOwners: [],
  };
}

// ============================================
// COMPONENT
// ============================================

type SortKey = 'value' | 'pnl' | 'position';

export default function ProfilePortfolioTab({ holdings }: ProfilePortfolioTabProps) {
  const [sortBy, setSortBy] = useState<SortKey>('value');

  const portfolioValueCents = holdings.reduce((s, h) => s + h.quantity * (h.player?.floor_price ?? 0), 0);
  const portfolioCostCents = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const pnlCents = portfolioValueCents - portfolioCostCents;

  const sorted = useMemo(() => {
    const arr = [...holdings];
    if (sortBy === 'value') {
      arr.sort((a, b) => (b.quantity * (b.player?.floor_price ?? 0)) - (a.quantity * (a.player?.floor_price ?? 0)));
    } else if (sortBy === 'pnl') {
      arr.sort((a, b) => {
        const pnlA = a.quantity * ((a.player?.floor_price ?? 0) - a.avg_buy_price);
        const pnlB = b.quantity * ((b.player?.floor_price ?? 0) - b.avg_buy_price);
        return pnlB - pnlA;
      });
    } else {
      arr.sort((a, b) => (a.player?.position ?? '').localeCompare(b.player?.position ?? ''));
    }
    return arr;
  }, [holdings, sortBy]);

  // Group by club
  const clubs = useMemo(() => {
    const map = new Map<string, HoldingRow[]>();
    for (const h of sorted) {
      const club = h.player?.club ?? 'Unbekannt';
      if (!map.has(club)) map.set(club, []);
      map.get(club)!.push(h);
    }
    return map;
  }, [sorted]);

  return (
    <div className="space-y-4">
      {/* Portfolio Value Header */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-white/40 mb-1">Portfolio-Wert</div>
            <div className="text-2xl md:text-3xl font-mono font-black text-[#FFD700]">
              {formatScout(portfolioValueCents)} $SCOUT
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40 mb-1">Wertentwicklung</div>
            <div className={cn('text-lg font-mono font-bold flex items-center gap-1 justify-end', pnlCents >= 0 ? 'text-[#22C55E]' : 'text-red-400')}>
              {pnlCents >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              {pnlCents >= 0 ? '+' : ''}{formatScout(pnlCents)} $SCOUT
            </div>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex gap-2">
          {([
            { id: 'value' as const, label: 'Wert' },
            { id: 'pnl' as const, label: 'P&L' },
            { id: 'position' as const, label: 'Position' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                sortBy === opt.id ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'bg-white/5 text-white/40'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {holdings.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-white/30 mb-3">Noch keine DPCs im Portfolio</div>
          <Link href="/market">
            <Button variant="gold" size="sm">Zum Marktplatz</Button>
          </Link>
        </Card>
      ) : (
        /* Grouped by Club */
        Array.from(clubs.entries()).map(([club, clubHoldings]) => (
          <Card key={club} className="p-4">
            <div className="text-xs text-white/40 mb-2 font-medium">{club} ({clubHoldings.length})</div>
            <div className="space-y-1.5">
              {clubHoldings.map((h) => (
                <PlayerDisplay key={h.id} variant="compact"
                  player={holdingRowToPlayer(h)}
                  holding={{ quantity: h.quantity, avgBuyPriceBsd: centsToBsd(h.avg_buy_price) }}
                  showActions={false}
                />
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
