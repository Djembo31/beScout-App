'use client';

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ShoppingCart, SlidersHorizontal, X, Heart, HelpCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { EmptyState, Modal } from '@/components/ui';
import { getClub } from '@/lib/clubs';
import type { ClubLookup } from '@/lib/clubs';
import { useClub } from '@/components/providers/ClubProvider';
import { useMarketStore } from '@/lib/stores/marketStore';
import { applyFilters, getActiveFilterCount } from './MarketFilters';
import EndingSoonStrip from './EndingSoonStrip';
import LeagueBar from './LeagueBar';
import ClubCard from './ClubCard';
import ClubAccordion from './ClubAccordion';
import { getEarliestEndDate } from './CountdownBadge';
import NewUserTip from '@/components/onboarding/NewUserTip';
import { cn } from '@/lib/utils';
import { centsToBsd } from '@/lib/services/players';
import type { Player, DbIpo, Pos } from '@/types';
import type { IpoViewState } from '@/lib/stores/marketStore';

const POSITIONS: Pos[] = ['GK', 'DEF', 'MID', 'ATT'];
const POS_LABELS: Record<Pos, string> = { GK: 'TW', DEF: 'DEF', MID: 'MID', ATT: 'STU' };
const L5_PRESETS = [45, 55, 65] as const;

const VIEW_TABS: { value: IpoViewState; labelKey: string; defaultLabel: string; ariaKey: string; ariaDefault: string }[] = [
  { value: 'laufend', labelKey: 'ipoLaufend', defaultLabel: 'Laufend', ariaKey: 'ipoShowActive', ariaDefault: 'Aktive IPOs anzeigen' },
  { value: 'geplant', labelKey: 'ipoGeplant', defaultLabel: 'Geplant', ariaKey: 'ipoShowPlanned', ariaDefault: 'Geplante IPOs anzeigen' },
  { value: 'beendet', labelKey: 'ipoBeendet', defaultLabel: 'Beendet', ariaKey: 'ipoShowEnded', ariaDefault: 'Beendete IPOs anzeigen' },
];

interface ClubVerkaufSectionProps {
  players: Player[];
  activeIpos: DbIpo[];
  announcedIpos: DbIpo[];
  endedIpos: DbIpo[];
  playerMap: Map<string, Player>;
  onIpoBuy: (playerId: string) => void;
  buyingId: string | null;
  hasHoldings: boolean;
}

type ClubAggregate = {
  clubName: string;
  club: ClubLookup;
  players: Player[];
  ipoMap: Map<string, DbIpo>;
  dpcCount: number;
  totalSold: number;
  totalOffered: number;
  avgPrice: number;
  earliestEnd: string | null;
  isHot: boolean;
};

export default function ClubVerkaufSection({
  players, activeIpos, announcedIpos, endedIpos, playerMap, onIpoBuy, buyingId, hasHoldings,
}: ClubVerkaufSectionProps) {
  const t = useTranslations('market');
  const { followedClubs } = useClub();
  const store = useMarketStore();
  const {
    clubVerkaufLeague, setClubVerkaufLeague,
    clubVerkaufExpandedClub, setClubVerkaufExpandedClub,
    filterPos, toggleFilterPos,
    filterMinL5, setFilterMinL5,
    filterOnlyFit, setFilterOnlyFit,
    showAdvancedFilters, setShowAdvancedFilters,
    resetMarketFilters,
    ipoViewState, setIpoViewState,
  } = store;

  const followedClubIds = useMemo(() => new Set(followedClubs.map(c => c.id)), [followedClubs]);
  const activeFilterCount = getActiveFilterCount(store);

  // Select IPOs based on view state
  const viewIpos = useMemo(() => {
    switch (ipoViewState) {
      case 'laufend': return activeIpos;
      case 'geplant': return announcedIpos;
      case 'beendet': return endedIpos;
    }
  }, [ipoViewState, activeIpos, announcedIpos, endedIpos]);

  // IPOs mapped by player_id for current view
  const iposByPlayer = useMemo(() => {
    const m = new Map<string, DbIpo>();
    for (const ipo of viewIpos) m.set(ipo.player_id, ipo);
    return m;
  }, [viewIpos]);

  // Build club aggregates
  const clubAggregates = useMemo(() => {
    const ipoPlayerIds = new Set(viewIpos.map(i => i.player_id));
    const ipoPlayers = players.filter(p => ipoPlayerIds.has(p.id));
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
      let totalSold = 0;
      let totalOffered = 0;

      for (const p of clubPlayers) {
        const ipo = iposByPlayer.get(p.id);
        if (ipo) {
          ipoMap.set(p.id, ipo);
          endDates.push(ipo.ends_at);
          totalPrice += centsToBsd(ipo.price);
          priceCount++;
          totalSold += ipo.sold;
          totalOffered += ipo.total_offered;
        }
      }

      result.push({
        clubName,
        club,
        players: clubPlayers,
        ipoMap,
        dpcCount: clubPlayers.length,
        totalSold,
        totalOffered,
        avgPrice: priceCount > 0 ? Math.round(totalPrice / priceCount) : 0,
        earliestEnd: getEarliestEndDate(endDates),
        isHot: clubPlayers.length >= 5,
      });
    });

    // Followed clubs first, then by DPC count
    return result.sort((a, b) => {
      const aFollowed = followedClubIds.has(a.club.id) ? 1 : 0;
      const bFollowed = followedClubIds.has(b.club.id) ? 1 : 0;
      if (aFollowed !== bFollowed) return bFollowed - aFollowed;
      return b.dpcCount - a.dpcCount;
    });
  }, [players, viewIpos, store, clubVerkaufLeague, iposByPlayer, followedClubIds]);

  const hasContent = clubAggregates.length > 0;
  const isBuyable = ipoViewState === 'laufend';

  // Count badges for tabs
  const activeCount = activeIpos.length;
  const announcedCount = announcedIpos.length;
  const endedCount = endedIpos.length;
  const tabCounts: Record<IpoViewState, number> = {
    laufend: activeCount,
    geplant: announcedCount,
    beendet: endedCount,
  };

  return (
    <div className="space-y-4">
      {/* 1. Onboarding: DPC explainer (only for new users) */}
      <NewUserTip
        tipKey="club-verkauf-dpc-intro"
        icon={<HelpCircle className="size-4" />}
        title={t('dpcIntroTitle', { defaultMessage: 'Was sind DPCs?' })}
        description={t('dpcIntroDesc', { defaultMessage: 'Kaufe digitale Spieler-Vertr\u00e4ge (DPCs) deines Lieblingsvereins. Steigt der Marktwert des Spielers, profitierst du durch die Community Success Fee.' })}
        show={!hasHoldings}
      />

      {/* 2. IPO View State Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1" role="tablist" aria-label={t('ipoViewLabel', { defaultMessage: 'IPO-Ansicht' })}>
        {VIEW_TABS.map(tab => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={ipoViewState === tab.value}
            aria-label={t(tab.ariaKey, { defaultMessage: tab.ariaDefault })}
            onClick={() => setIpoViewState(tab.value)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors min-h-[44px]',
              'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
              'active:scale-[0.97]',
              ipoViewState === tab.value
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
            )}
          >
            {tab.value === 'geplant' && <Calendar className="size-3" aria-hidden="true" />}
            {tab.value === 'beendet' && <CheckCircle2 className="size-3" aria-hidden="true" />}
            {t(tab.labelKey, { defaultMessage: tab.defaultLabel })}
            {tabCounts[tab.value] > 0 && (
              <span className={cn(
                'text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                ipoViewState === tab.value
                  ? 'bg-gold text-black'
                  : 'bg-white/10 text-white/50'
              )}>
                {tabCounts[tab.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 3. Urgency: ending soon strip (only for laufend) */}
      {ipoViewState === 'laufend' && (
        <EndingSoonStrip
          activeIpos={activeIpos}
          playerMap={playerMap}
          onBuy={onIpoBuy}
          buyingId={buyingId}
        />
      )}

      {/* 4. Navigation: league bar */}
      <LeagueBar selected={clubVerkaufLeague} onSelect={setClubVerkaufLeague} />

      {/* 5. Controls: filter expand */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors min-h-[44px] border',
            'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
            showAdvancedFilters || activeFilterCount > 0
              ? 'bg-white/10 text-white border-white/15'
              : 'text-white/40 border-white/[0.08] hover:text-white/60 hover:bg-white/[0.04]'
          )}
          aria-expanded={showAdvancedFilters}
          aria-label={t('filterLabel', { defaultMessage: 'Filter' })}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          {t('filterLabel', { defaultMessage: 'Filter' })}
          {activeFilterCount > 0 && (
            <span className="size-4 rounded-full bg-gold text-black text-[9px] font-black flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Expandable advanced filters */}
      {showAdvancedFilters && (
        <fieldset className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3 space-y-3 anim-fade">
          <legend className="sr-only">{t('advancedFilters', { defaultMessage: 'Erweiterte Filter' })}</legend>

          {/* Position pills */}
          <div>
            <div className="text-[10px] text-white/40 font-semibold mb-1.5">{t('position', { defaultMessage: 'Position' })}</div>
            <div className="flex gap-1.5">
              {POSITIONS.map(pos => (
                <button
                  key={pos}
                  onClick={() => toggleFilterPos(pos)}
                  aria-pressed={filterPos.has(pos)}
                  aria-label={t('posFilterLabel', { pos: POS_LABELS[pos], defaultMessage: 'Position {pos} filtern' })}
                  className={cn(
                    'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] min-w-[44px]',
                    'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
                    filterPos.has(pos)
                      ? 'bg-white/15 text-white border-white/20'
                      : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                  )}
                >
                  {POS_LABELS[pos]}
                </button>
              ))}
            </div>
          </div>

          {/* L5 + Fit */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-[10px] text-white/40 font-semibold mr-1">{t('minPerformance', { defaultMessage: 'Min. L5' })}</div>
            {L5_PRESETS.map(threshold => (
              <button
                key={threshold}
                onClick={() => setFilterMinL5(filterMinL5 === threshold ? 0 : threshold)}
                aria-pressed={filterMinL5 === threshold}
                aria-label={t('l5FilterLabel', { value: threshold, defaultMessage: 'Minimum L5 Score {value}' })}
                className={cn(
                  'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] min-w-[44px]',
                  'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
                  filterMinL5 === threshold
                    ? 'bg-gold/10 border-gold/20 text-gold'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/40'
                )}
              >
                {threshold}+
              </button>
            ))}
            <button
              onClick={() => setFilterOnlyFit(!filterOnlyFit)}
              aria-pressed={filterOnlyFit}
              aria-label={t('fitFilterLabel', { defaultMessage: 'Nur fitte Spieler anzeigen' })}
              className={cn(
                'px-3 py-2 rounded-lg text-xs font-bold border transition-colors min-h-[44px] flex items-center gap-1',
                'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
                filterOnlyFit
                  ? 'bg-green-500/15 border-green-500/30 text-green-500'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/40'
              )}
            >
              <Heart className="size-3" aria-hidden="true" />
              {t('discoveryOnlyFit', { defaultMessage: 'Fit' })}
            </button>
          </div>

          {/* Reset if active */}
          {activeFilterCount > 0 && (
            <button
              onClick={resetMarketFilters}
              className="flex items-center gap-1.5 text-[10px] text-red-400/70 hover:text-red-400 transition-colors min-h-[44px]"
            >
              <X className="size-3" aria-hidden="true" />
              {t('resetFiltersLabel', { defaultMessage: 'Filter zur\u00fccksetzen' })}
            </button>
          )}
        </fieldset>
      )}

      {/* 6. Empty state */}
      {!hasContent && (
        <EmptyState
          icon={ipoViewState === 'geplant' ? <Calendar /> : ipoViewState === 'beendet' ? <CheckCircle2 /> : <ShoppingCart />}
          title={t(
            ipoViewState === 'geplant' ? 'noPlannedIpos' : ipoViewState === 'beendet' ? 'noEndedIpos' : 'noClubSales',
            { defaultMessage: ipoViewState === 'geplant' ? 'Keine geplanten Verk\u00e4ufe' : ipoViewState === 'beendet' ? 'Keine beendeten Verk\u00e4ufe' : 'Keine Club Verk\u00e4ufe aktiv' }
          )}
          description={t(
            ipoViewState === 'geplant' ? 'noPlannedIposDesc' : ipoViewState === 'beendet' ? 'noEndedIposDesc' : 'noClubSalesDesc',
            { defaultMessage: ipoViewState === 'geplant' ? 'Aktuell sind keine Verk\u00e4ufe angek\u00fcndigt.' : ipoViewState === 'beendet' ? 'Es gibt keine k\u00fcrzlich beendeten Verk\u00e4ufe.' : 'Aktuell gibt es keine aktiven Verk\u00e4ufe vom Verein.' }
          )}
        />
      )}

      {/* 7. Club cards grid */}
      {hasContent && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {clubAggregates.map(agg => (
            <ClubCard
              key={agg.clubName}
              club={agg.club}
              players={agg.players}
              ipoMap={agg.ipoMap}
              totalSold={agg.totalSold}
              totalOffered={agg.totalOffered}
              earliestEnd={agg.earliestEnd}
              isHot={agg.isHot && isBuyable}
              isExpanded={clubVerkaufExpandedClub === agg.clubName}
              isFollowed={followedClubIds.has(agg.club.id)}
              onToggle={() => setClubVerkaufExpandedClub(agg.clubName)}
            />
          ))}
        </div>
      )}

      {/* 8. Club detail modal — replaces inline accordion */}
      {(() => {
        const expandedAgg = clubAggregates.find(a => a.clubName === clubVerkaufExpandedClub);
        if (!expandedAgg) return null;
        return (
          <Modal
            open={true}
            title={expandedAgg.club.name}
            subtitle={`${expandedAgg.players.length} DPCs ${isBuyable ? t('available', { defaultMessage: 'verfügbar' }) : ''}`}
            onClose={() => setClubVerkaufExpandedClub(null)}
            size="lg"
          >
            <ClubAccordion
              clubName={expandedAgg.clubName}
              players={expandedAgg.players}
              ipoMap={expandedAgg.ipoMap}
              onBuy={isBuyable ? onIpoBuy : undefined}
              buyingId={isBuyable ? buyingId : null}
              onClose={() => setClubVerkaufExpandedClub(null)}
            />
          </Modal>
        );
      })()}
    </div>
  );
}
