'use client';

import React from 'react';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { centsToBsd } from '@/lib/services/players';
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
    listings: [],
    topOwners: [],
  };
}

// ============================================
// COMPONENT
// ============================================

export default function ProfilePortfolioTab({ holdings }: ProfilePortfolioTabProps) {
  return (
    <Card className="p-4 md:p-6">
      <h3 className="font-black mb-4">Gesamtportfolio</h3>
      {holdings.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-white/30 mb-3">Noch keine DPCs im Portfolio</div>
          <Link href="/market">
            <Button variant="gold" size="sm">Zum Marktplatz</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-1.5">
          {holdings.map((h) => (
            <PlayerDisplay key={h.id} variant="compact"
              player={holdingRowToPlayer(h)}
              holding={{ quantity: h.quantity, avgBuyPriceBsd: centsToBsd(h.avg_buy_price) }}
              showActions={false}
            />
          ))}
        </div>
      )}
    </Card>
  );
}
