'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Heart, ShoppingCart } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { getClub, getAllClubsCached } from '@/lib/clubs';
import type { ClubLookup } from '@/lib/clubs';
import { useMarketStore } from '@/lib/stores/marketStore';
import { applyFilters, applySorting } from './MarketFilters';
import HotSalesCarousel from './HotSalesCarousel';
import ClubTile from './ClubTile';
import ClubAccordion from './ClubAccordion';
import { getEarliestEndDate } from './CountdownBadge';
import { cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo, Pos } from '@/types';
import type { SortOption } from '@/lib/stores/marketStore';

const POSITIONS: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];
const POS_LABELS: Record<Pos, string> = { GK: 'TW', DEF: 'DEF', MID: 'MID', ATT: 'STU' };
const L5_PRESETS = [45, 55, 65] as const;
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'l5', label: 'L5' },
  { value: 'floor_asc', label: 'Preis \u2191' },
  { value: 'floor_desc', label: 'Preis \u2193' },
  { value: 'goals', label: 'Tore' },
  { value: 'assists', label: 'Assists' },
];

interface ClubVerkaufSectionProps {
  players: Player[];
  activeIpos: DbIpo[];
  announcedIpos: DbIpo[];
  endedIpos: DbIpo[];
  playerMap: Map<string, Player>;
  onIpoBuy: (playerId: string) => void;
  buyingId: string | null;
}

type ClubAggregate = {
  clubName: string;
  club: ClubLookup;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  dpcCount: number;
  avgPrice: number;
  earliestEnd: string | null;
  isHot: boolean;
};

export default function ClubVerkaufSection({
  players, activeIpos, announcedIpos, endedIpos, playerMap, onIpoBuy, buyingId,
}: ClubVerkaufSectionProps) {
  const t = useTranslations('market');
  const store = useMarketStore();
  const {
    clubVerkaufLeague, setClubVerkaufLeague,
    clubVerkaufExpandedClub, setClubVerkaufExpandedClub,
    filterPos, toggleFilterPos,
    filterMinL5, setFilterMinL5,
    filterOnlyFit, setFilterOnlyFit,
    marketSortBy, setMarketSortBy,
  } = store;

  // All IPOs mapped by player_id
  const allIposByPlayer = useMemo(() => {
    const m = new Map<string, DbIpo>();
    for (const ipo of activeIpos) m.set(ipo.player_id, ipo);
    for (const ipo of announcedIpos) m.set(ipo.player_id, ipo);
    return m;
  }, [activeIpos, announcedIpos]);

  // Floor price getter for sorting
  const getFloor = useMemo(() => {
    return (p: Player) => {
      const ipo = allIposByPlayer.get(p.id);
      return ipo ? centsToBsd(ipo.price) : 0;
    };
  }, [allIposByPlayer]);

  // Available leagues
  const leagues = useMemo(() => {
    const allClubs = getAllClubsCached();
    const leagueSet = new Set<string>();
    for (const c of allClubs) {
      if (c.league) leagueSet.add(c.league);
    }
    return Array.from(leagueSet).sort();
  }, []);

  // Build club aggregates
  const clubAggregates = useMemo(() => {
    const allIpoPlayerIds = new Set([
      ...activeIpos.map(i => i.player_id),
      ...announcedIpos.map(i => i.player_id),
    ]);

    const ipoPlayers = players.filter(p => allIpoPlayerIds.has(p.id));
    const filtered = applyFilters(ipoPlayers, store);

    // Group by club
    const grouped = new Map<string, Player[]>();
    for (const p of filtered) {
      const arr = grouped.get(p.club) ?? [];
      arr.push(p);
      grouped.set(p.club, arr);
    }

    const result: ClubAggregate[] = [];
    grouped.forEach((clubPlayers, clubName) => {
      const club = getClub(clubName);
      if (!club) return;

      // League filter
      if (clubVerkaufLeague && club.league !== clubVerkaufLeague) return;

      const ipoMap = new Map<string, DbIpo>();
      const endDates: string[] = [];
      let totalPrice = 0;
      let priceCount = 0;

      for (const p of clubPlayers) {
        const ipo = allIposByPlayer.get(p.id);
        if (ipo) {
          ipoMap.set(p.id, ipo);
          endDates.push(ipo.ends_at);
          totalPrice += centsToBsd(ipo.price);
          priceCount++;
        }
      }

      const sorted = applySorting(clubPlayers, marketSortBy, getFloor);

      result.push({
        clubName,
        club,
        players: sorted,
        ipoMap,
        dpcCount: clubPlayers.length,
        avgPrice: priceCount > 0 ? Math.round(totalPrice / priceCount) : 0,
        earliestEnd: getEarliestEndDate(endDates),
        isHot: clubPlayers.length >= 5,
      });
    });

    return result.sort((a, b) => b.dpcCount - a.dpcCount);
  }, [players, activeIpos, announcedIpos, store, clubVerkaufLeague, allIposByPlayer, marketSortBy, getFloor]);

  const hasContent = clubAggregates.length > 0;

  return (
    <div className="space-y-4">
      <HotSalesCarousel />

      <div className="space-y-2">
        {/* League dropdown */}
        <select
          value={clubVerkaufLeague}
          onChange={(e) => setClubVerkaufLeague(e.target.value)}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-white/20 min-h-[44px]"
          aria-label={t('leagueFilter', { defaultMessage: 'Liga wählen' })}
        >
          <option value="" className="bg-[#1a1a1a]">{t('allLeagues', { defaultMessage: 'Alle Ligen' })}</option>
          {leagues.map(l => (
            <option key={l} value={l} className="bg-[#1a1a1a]">{l}</option>
          ))}
        </select>

        {/* Filter chips row */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Sort select */}
          <select
            value={marketSortBy}
            onChange={(e) => setMarketSortBy(e.target.value as SortOption)}
            className="px-2.5 py-1.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-[10px] font-bold text-white/60 appearance-none cursor-pointer pr-6 shrink-0 min-h-[32px]"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
            aria-label={t('sortBy', { defaultMessage: 'Sortieren' })}
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value} className="bg-[#1a1a1a]">{o.label}</option>
            ))}
          </select>

          {/* Position pills */}
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => toggleFilterPos(pos)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 min-h-[32px]',
                filterPos.has(pos)
                  ? 'bg-white/15 text-white border-white/20'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/40'
              )}
            >
              {POS_LABELS[pos]}
            </button>
          ))}

          {/* L5 presets */}
          {L5_PRESETS.map(threshold => (
            <button
              key={threshold}
              onClick={() => setFilterMinL5(filterMinL5 === threshold ? 0 : threshold)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 min-h-[32px]',
                filterMinL5 === threshold
                  ? 'bg-gold/10 border-gold/20 text-gold'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/40'
              )}
            >
              L5 {threshold}+
            </button>
          ))}

          {/* Fit toggle */}
          <button
            onClick={() => setFilterOnlyFit(!filterOnlyFit)}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors shrink-0 flex items-center gap-1 min-h-[32px]',
              filterOnlyFit
                ? 'bg-green-500/15 border-green-500/30 text-green-500'
                : 'bg-white/[0.03] border-white/[0.06] text-white/40'
            )}
          >
            <Heart className="size-3" aria-hidden="true" />
            {t('discoveryOnlyFit', { defaultMessage: 'Fit' })}
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasContent && (
        <EmptyState
          icon={<ShoppingCart />}
          title={t('noClubSales', { defaultMessage: 'Keine Club Verkäufe aktiv' })}
          description={t('noClubSalesDesc', { defaultMessage: 'Aktuell gibt es keine aktiven Verkäufe vom Verein.' })}
        />
      )}

      {/* Club tile grid + accordion */}
      {hasContent && (
        <div className="grid grid-cols-2 gap-2">
          {clubAggregates.map(agg => (
            <React.Fragment key={agg.clubName}>
              <ClubTile
                club={agg.club}
                dpcCount={agg.dpcCount}
                avgPrice={agg.avgPrice}
                earliestEnd={agg.earliestEnd}
                isHot={agg.isHot}
                isExpanded={clubVerkaufExpandedClub === agg.clubName}
                onToggle={() => setClubVerkaufExpandedClub(agg.clubName)}
              />
              {clubVerkaufExpandedClub === agg.clubName && (
                <ClubAccordion
                  clubName={agg.clubName}
                  players={agg.players}
                  ipoMap={agg.ipoMap}
                  onBuy={onIpoBuy}
                  buyingId={buyingId}
                  onClose={() => setClubVerkaufExpandedClub(null)}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
