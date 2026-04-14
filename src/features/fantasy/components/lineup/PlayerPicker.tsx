'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  X, Search, ShoppingCart,
} from 'lucide-react';
import { PositionBadge } from '@/components/player';
import type { Pos } from '@/types';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, LineupPlayer, UserDpcHolding } from '@/components/fantasy/types';
import FantasyPlayerRow from '@/components/fantasy/FantasyPlayerRow';
import { PickerSortFilter } from '@/components/fantasy/PickerSortFilter';
import type { PickerSortKey } from '@/components/fantasy/PickerSortFilter';
import { getClubAvgL5 } from '@/components/fantasy/FDRBadge';
import { useBatchFormScores, useNextFixtures } from '@/lib/queries/fantasyPicker';
import { getClub } from '@/lib/clubs';
import { usePlayers } from '@/lib/queries/players';
import { centsToBsd } from '@/lib/services/players';

export interface PlayerPickerProps {
  event: FantasyEvent;
  position: string;
  slot: number;
  slotDbKeys: string[];
  wildcardSlots?: Set<string>;
  effectiveHoldings: UserDpcHolding[];
  selectedPlayers: LineupPlayer[];
  isPlayerLocked: (playerId: string) => boolean;
  getAvailablePlayersForPosition: (position: string, isWildcardSlot?: boolean) => UserDpcHolding[];
  onSelectPlayer: (playerId: string, position: string, slot: number) => void;
  onClose: () => void;
}

export function PlayerPicker({
  event,
  position,
  slot,
  slotDbKeys,
  wildcardSlots,
  effectiveHoldings,
  selectedPlayers,
  isPlayerLocked,
  getAvailablePlayersForPosition,
  onSelectPlayer,
  onClose,
}: PlayerPickerProps) {
  const t = useTranslations('fantasy');

  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerSort, setPickerSort] = useState<PickerSortKey>('l5');
  const [clubFilter, setClubFilter] = useState<string[]>([]);
  const [onlyAvailable, setOnlyAvailable] = useState(true);
  const [synergyOnly, setSynergyOnly] = useState(false);

  // Data for Intelligence Strip rows
  const playerIds = useMemo(() => effectiveHoldings.map(h => h.id), [effectiveHoldings]);
  const { data: formScoresMap } = useBatchFormScores(playerIds, true);
  const { data: nextFixturesMap } = useNextFixtures(true);
  const { data: allPlayers = [] } = usePlayers(true);

  // Derive synergy clubs from currently selected lineup
  const synergyClubs = useMemo(() => {
    const clubs = selectedPlayers.map(sp => {
      const h = effectiveHoldings.find(eh => eh.id === sp.playerId);
      return h?.club;
    }).filter(Boolean) as string[];
    return Array.from(new Set(clubs));
  }, [selectedPlayers, effectiveHoldings]);

  // Available clubs for filter (from holdings)
  const availableClubsList = useMemo(() => {
    const clubShorts = Array.from(new Set(effectiveHoldings.map(h => h.club)));
    return clubShorts.map(short => {
      const c = getClub(short);
      return { short, logo: c?.logo ?? null };
    });
  }, [effectiveHoldings]);

  // Helper: map a UserDpcHolding to FantasyPlayerRow props
  function getRowProps(player: UserDpcHolding) {
    const isSelected = selectedPlayers.some(sp => sp.playerId === player.id);
    const fixtureLocked = isPlayerLocked(player.id);
    const formEntries = formScoresMap?.get(player.id) ?? [];
    const clubId = player.clubId ?? allPlayers.find(p => p.id === player.id)?.clubId;
    const nextFix = clubId ? nextFixturesMap?.get(clubId) : undefined;
    const oppAvgL5 = nextFix ? getClubAvgL5(nextFix.opponentShort, allPlayers) : 0;
    const hasSynergy = synergyClubs.includes(player.club) && !isSelected;
    const synergyPct = hasSynergy ? synergyClubs.filter(c => c === player.club).length * 4 : null;

    let rowState: 'default' | 'selected' | 'locked' | 'deployed' | 'injured' | 'suspended' = 'default';
    if (fixtureLocked) rowState = 'locked';
    else if (isSelected) rowState = 'selected';
    else if (player.isLocked) rowState = 'deployed';
    else if (player.status === 'injured') rowState = 'injured';
    else if (player.status === 'suspended') rowState = 'suspended';

    return {
      player: {
        id: player.id,
        first: player.first,
        last: player.last,
        pos: player.pos as Pos,
        club: player.club,
        imageUrl: player.imageUrl,
        ticket: player.ticket ?? 0,
        status: player.status,
        perfL5: player.perfL5,
        perfL15: player.perfL15 ?? 0,
        matches: player.matches,
        goals: player.goals,
        assists: player.assists,
        floorPrice: centsToBsd(player.floorPrice ?? 0),
        dpcOwned: player.dpcOwned,
        dpcAvailable: player.dpcAvailable,
        eventsUsing: player.eventsUsing,
        leagueShort: player.leagueShort,
        leagueLogoUrl: player.leagueLogoUrl,
      },
      formEntries,
      nextFixture: nextFix ? { opponentShort: nextFix.opponentShort, opponentName: nextFix.opponentName, isHome: nextFix.isHome } : null,
      opponentAvgL5: oppAvgL5,
      synergyPct,
      rowState,
    };
  }

  const POS_LABEL: Record<string, string> = { GK: t('posGK'), DEF: t('posDEF'), MID: t('posMID'), ATT: t('posATT') };
  const pickerSlotDbKey = slotDbKeys[slot];
  const isPickerWildcard = wildcardSlots?.has(pickerSlotDbKey) ?? false;

  let availablePlayers = getAvailablePlayersForPosition(position, isPickerWildcard);

  // Apply local search filter
  if (pickerSearch) {
    const q = pickerSearch.toLowerCase();
    availablePlayers = availablePlayers.filter(h => `${h.first} ${h.last} ${h.club}`.toLowerCase().includes(q));
  }
  // Club filter
  if (clubFilter.length > 0) {
    availablePlayers = availablePlayers.filter(h => clubFilter.includes(h.club));
  }
  // Available filter
  if (onlyAvailable) {
    availablePlayers = availablePlayers.filter(h => h.dpcAvailable > 0 && !h.isLocked);
  }
  // Synergy filter
  if (synergyOnly && synergyClubs.length > 0) {
    availablePlayers = availablePlayers.filter(h => synergyClubs.includes(h.club));
  }
  // Apply local sort
  availablePlayers = [...availablePlayers].sort((a, b) => {
    if (pickerSort === 'l5') return b.perfL5 - a.perfL5;
    if (pickerSort === 'form') return (b.perfL5 - (b.perfL15 ?? 0)) - (a.perfL5 - (a.perfL15 ?? 0));
    if (pickerSort === 'price') return (b.floorPrice ?? 0) - (a.floorPrice ?? 0);
    return a.last.localeCompare(b.last);
  });

  const handleClose = () => {
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 z-[60] animate-in fade-in duration-200" onClick={handleClose} />
      {/* Mobile: bottom sheet | Desktop: centered modal */}
      <div className="fixed inset-x-0 bottom-0 z-[60] bg-bg-main flex flex-col max-h-[85dvh] rounded-t-3xl border-t border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-300 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[calc(100%-2rem)] md:max-w-md md:max-h-[70vh] md:rounded-xl md:border md:border-white/10 md:bottom-auto">
        {/* Swipe handle (mobile) */}
        <div className="flex justify-center pt-2 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>
        {/* Sticky Header */}
        <div className="shrink-0 bg-bg-main border-b border-white/10">
          {/* Top bar: Back + Title + Count */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2">
            <button
              onClick={handleClose}
              aria-label={t('closePickerLabel')}
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <X aria-hidden="true" className="size-5 text-white/60" />
            </button>
            <div className="flex-1">
              <h3 className="font-black text-base">
                {t('selectPos', { pos: POS_LABEL[position] || position })}
              </h3>
              <div className="text-xs text-white/40">{t('availableCount', { count: availablePlayers.length })}</div>
            </div>
          </div>
          {/* Search */}
          <div className="px-4 pb-2.5">
            <div className="relative">
              <Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
              <input
                type="text"
                placeholder={t('searchPlayerPlaceholder')}
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface-base border border-white/10 rounded-xl text-sm focus:outline-none focus:border-gold/40 placeholder:text-white/30"
              />
            </div>
          </div>
          {/* Sort + Filter */}
          <div className="px-4 pb-2">
            <PickerSortFilter
              sort={pickerSort}
              onSortChange={setPickerSort}
              clubFilter={clubFilter}
              onClubFilterChange={setClubFilter}
              onlyAvailable={onlyAvailable}
              onOnlyAvailableChange={setOnlyAvailable}
              synergyOnly={synergyOnly}
              onSynergyOnlyChange={setSynergyOnly}
              availableClubs={availableClubsList}
              synergyClubs={synergyClubs}
            />
          </div>
        </div>

        {/* Scrollable Player List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {availablePlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <PositionBadge pos={position as Pos} size="lg" />
              <div className="text-sm text-white/30 mt-3 text-center">
                {t('noPosAvailable', { pos: POS_LABEL[position] || t('playersLabel') })}
              </div>
              <Link
                href="/market?tab=kaufen"
                onClick={handleClose}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-gold/15 text-gold text-xs font-bold rounded-xl hover:bg-gold/25 transition-colors"
              >
                <ShoppingCart aria-hidden="true" className="size-3.5" />
                {t('buyPlayer')}
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {availablePlayers.map(player => {
                const props = getRowProps(player);
                return (
                  <FantasyPlayerRow
                    key={player.id}
                    {...props}
                    onClick={() => {
                      onSelectPlayer(player.id, position, slot);
                      handleClose();
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
