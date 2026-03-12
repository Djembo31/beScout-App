'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, Button } from '@/components/ui';
import { PlayerDisplay } from '@/components/player/PlayerRow';
import { centsToBsd } from '@/lib/services/players';
import { formatScout } from '@/lib/services/wallet';
import { cn } from '@/lib/utils';
import { useUserMasteryAll } from '@/lib/queries/mastery';
import type { Pos } from '@/types';
import type { HoldingRow } from './ProfileOverviewTab';

interface ProfileSquadTabProps {
  holdings: HoldingRow[];
  isSelf: boolean;
  userId?: string;
}

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
    contractMonthsLeft: 0,
    country: '',
    league: '',
    isLiquidated: false,
    stats: { matches: h.player?.matches ?? 0, goals: h.player?.goals ?? 0, assists: h.player?.assists ?? 0, cleanSheets: 0, minutes: 0, saves: 0 },
    perf: { l5: h.player?.perf_l5 ?? 0, l15: 0, trend: 'FLAT' as const },
    prices: { lastTrade: 0, floor: centsToBsd(h.player?.floor_price ?? 0), change24h: h.player?.price_change_24h ?? 0 },
    dpc: { supply: 0, float: 0, circulation: 0, onMarket: 0, owned: h.quantity },
    ipo: { status: 'none' as const },
    imageUrl: h.player?.image_url ?? null,
    listings: [],
    topOwners: [],
  };
}

type SortKey = 'value' | 'pnl' | 'position';

export default function ProfileSquadTab({ holdings, isSelf, userId }: ProfileSquadTabProps) {
  const tp = useTranslations('profile');
  const tg = useTranslations('gamification');
  const [sortBy, setSortBy] = useState<SortKey>('value');

  const portfolioValueCents = holdings.reduce((s, h) => s + h.quantity * (h.player?.floor_price ?? 0), 0);
  const portfolioCostCents = holdings.reduce((s, h) => s + h.quantity * h.avg_buy_price, 0);
  const pnlCents = portfolioValueCents - portfolioCostCents;

  const { data: masteryAll = [] } = useUserMasteryAll(userId);
  const topMastery = masteryAll.slice(0, 5);

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
      {/* Squad Header — show prices only for self */}
      <Card className="p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs text-white/40 mb-1">{tp('squadValue')}</div>
            {isSelf ? (
              <div className="text-2xl md:text-3xl font-mono font-black text-gold">
                {formatScout(portfolioValueCents)} bCredits
              </div>
            ) : (
              <div className="text-lg font-mono font-black text-white/50">
                {holdings.length} DPCs
              </div>
            )}
          </div>
          {isSelf && (
            <div className="text-right">
              <div className="text-xs text-white/40 mb-1">{tp('portfolioDev')}</div>
              <div className={cn('text-lg font-mono font-bold flex items-center gap-1 justify-end', pnlCents >= 0 ? 'text-vivid-green' : 'text-vivid-red')}>
                {pnlCents >= 0 ? <TrendingUp className="size-4" aria-hidden="true" /> : <TrendingDown className="size-4" aria-hidden="true" />}
                {pnlCents >= 0 ? '+' : ''}{formatScout(pnlCents)} bCredits
              </div>
            </div>
          )}
        </div>

        {/* Sort Options */}
        <div role="radiogroup" aria-label={tp('sortValue')} className="flex gap-2">
          {([
            { id: 'value' as const, label: tp('sortValue') },
            ...(isSelf ? [{ id: 'pnl' as const, label: tp('sortPnl') }] : []),
            { id: 'position' as const, label: tp('sortPosition') },
          ]).map(opt => (
            <button
              key={opt.id}
              role="radio"
              aria-checked={sortBy === opt.id}
              onClick={() => setSortBy(opt.id)}
              className={cn(
                'text-xs px-2.5 py-2.5 min-h-[44px] rounded-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0a0a0a]',
                sortBy === opt.id
                  ? 'bg-gold/10 text-gold'
                  : 'bg-white/5 text-white/40 hover:text-white/60 hover:bg-white/[0.07] active:scale-[0.97]'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </Card>

      {holdings.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-white/30 mb-3">{tp('noHoldings')}</div>
          {isSelf && (
            <Link href="/market">
              <Button variant="gold" size="sm">{tp('goToMarket')}</Button>
            </Link>
          )}
        </Card>
      ) : (
        Array.from(clubs.entries()).map(([club, clubHoldings]) => (
          <Card key={club} className="p-4">
            <div className="text-xs text-white/40 mb-2 font-medium">{club} ({clubHoldings.length})</div>
            <div className="space-y-1.5">
              {clubHoldings.map((h) => (
                <PlayerDisplay key={h.id} variant="compact"
                  player={holdingRowToPlayer(h)}
                  holding={{ quantity: h.quantity, avgBuyPriceBsd: isSelf ? centsToBsd(h.avg_buy_price) : 0 }}
                  showActions={false}
                />
              ))}
            </div>
          </Card>
        ))
      )}

      {/* DPC Mastery */}
      {topMastery.length > 0 && (
        <Card className="p-6">
          <h3 className="font-black mb-4">{tg('mastery.title')}</h3>
          <div className="space-y-2">
            {topMastery.map(m => {
              const h = holdings.find(h => h.player_id === m.player_id);
              const playerName = h?.player
                ? `${h.player.first_name} ${h.player.last_name}`
                : m.player_id.slice(0, 8);
              return (
                <div key={m.id} className="flex items-center justify-between p-2 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                  <span className="text-sm font-bold truncate max-w-[140px]">{playerName}</span>
                  <span className="px-2 py-0.5 rounded-lg bg-gold/15 text-gold text-[11px] font-black border border-gold/25">
                    {tg('mastery.level', { level: m.level })} — {tg(`mastery.level${m.level}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
