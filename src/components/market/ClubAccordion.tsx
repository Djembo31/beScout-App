'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useMarketStore } from '@/lib/stores/marketStore';
import { useRecentScores } from '@/lib/queries/managerData';
import { applySorting } from './MarketFilters';
import { centsToBsd } from '@/lib/services/players';
import PlayerIPOCard from './PlayerIPOCard';
import type { Player, DbIpo, Pos } from '@/types';
import type { SortOption } from '@/lib/stores/marketStore';

const POS_ORDER: { pos: Pos; label: string }[] = [
  { pos: 'GK', label: 'TW' },
  { pos: 'DEF', label: 'DEF' },
  { pos: 'MID', label: 'MID' },
  { pos: 'ATT', label: 'STU' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'l5', label: 'L5' },
  { value: 'floor_asc', label: 'Preis \u2191' },
  { value: 'floor_desc', label: 'Preis \u2193' },
  { value: 'goals', label: 'Tore' },
  { value: 'assists', label: 'Assists' },
];

interface ClubAccordionProps {
  clubName: string;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  onBuy?: (playerId: string) => void;
  buyingId: string | null;
  onClose: () => void;
}

export default function ClubAccordion({ clubName, players, ipoMap, onBuy, buyingId }: ClubAccordionProps) {
  const t = useTranslations('market');
  const { marketSortBy, setMarketSortBy } = useMarketStore();
  const { data: recentScores } = useRecentScores();

  const getFloor = useMemo(() => {
    return (p: Player) => {
      const ipo = ipoMap.get(p.id);
      return ipo ? centsToBsd(ipo.price) : 0;
    };
  }, [ipoMap]);

  const groups = useMemo(() => {
    return POS_ORDER.map(({ pos, label }) => {
      const posPlayers = players.filter(p => p.pos === pos);
      const sorted = applySorting(posPlayers, marketSortBy, getFloor);
      return { pos, label, players: sorted };
    }).filter(g => g.players.length > 0);
  }, [players, marketSortBy, getFloor]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-1">
      {/* Sort control */}
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-[10px] text-white/40 font-semibold">
          {players.length} {t('players', { defaultMessage: 'Spieler' })}
        </span>
        <select
          value={marketSortBy}
          onChange={(e) => setMarketSortBy(e.target.value as SortOption)}
          className="bg-white/[0.06] border border-white/[0.10] rounded-lg px-2 py-1.5 text-[10px] font-bold text-white/70 outline-none min-h-[44px] hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main transition-colors"
          aria-label={t('sortByClub', { club: clubName, defaultMessage: '{club} sortieren' })}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
          ))}
        </select>
      </div>

      {/* Position groups */}
      <div className="divide-y divide-white/[0.04]">
        {groups.map(({ pos, label, players: posPlayers }) => (
          <div key={pos} role="group" aria-label={`${label} — ${posPlayers.length} ${t('players', { defaultMessage: 'Spieler' })}`}>
            <div className="px-1 py-2">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
                {label} <span className="tabular-nums">({posPlayers.length})</span>
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-2">
              {posPlayers.map(p => {
                const ipo = ipoMap.get(p.id);
                if (!ipo) return null;
                return (
                  <PlayerIPOCard
                    key={p.id}
                    player={p}
                    ipo={ipo}
                    onBuy={onBuy}
                    buying={buyingId === p.id}
                    recentScores={recentScores?.get(p.id)}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
