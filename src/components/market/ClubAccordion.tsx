'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { getClub } from '@/lib/clubs';
import { useMarketStore } from '@/lib/stores/marketStore';
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

export default function ClubAccordion({ clubName, players, ipoMap, onBuy, buyingId, onClose }: ClubAccordionProps) {
  const t = useTranslations('market');
  const { marketSortBy, setMarketSortBy } = useMarketStore();
  const club = getClub(clubName);
  const primaryColor = club?.colors.primary ?? '#666';

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
    <div className="col-span-full border border-white/[0.08] rounded-2xl overflow-hidden anim-fade">
      <div
        className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]"
        style={{ borderLeft: `3px solid ${primaryColor}` }}
      >
        {club?.logo ? (
          <img src={club.logo} alt="" className="size-5 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="size-5 rounded-full flex-shrink-0 border border-white/10" style={{ backgroundColor: primaryColor }} />
        )}
        <span className="font-bold text-xs truncate flex-1 min-w-0">{clubName}</span>
        <span className="text-[9px] text-white/40 tabular-nums flex-shrink-0">{players.length}</span>

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

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 active:scale-[0.95] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none"
          aria-label={t('closeClub', { defaultMessage: 'Schliessen' })}
        >
          <X className="size-4 text-white/40" aria-hidden="true" />
        </button>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {groups.map(({ pos, label, players: posPlayers }) => (
          <div key={pos} role="group" aria-label={`${label} — ${posPlayers.length} ${t('players', { defaultMessage: 'Spieler' })}`}>
            <div className="px-4 py-2 bg-white/[0.02]">
              <h4 className="text-[10px] font-bold text-white/30 uppercase tracking-wide">
                {label} <span className="tabular-nums">({posPlayers.length})</span>
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5">
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
