'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ShoppingCart, HelpCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { EmptyState, Modal } from '@/components/ui';
import { getClub } from '@/lib/clubs';
import type { ClubLookup } from '@/lib/clubs';
import { useClub } from '@/components/providers/ClubProvider';
import { useMarketStore } from '@/lib/stores/marketStore';
import { applyFilters } from '../shared/MarketFilters';
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
    ipoViewState, setIpoViewState,
  } = store;

  const hasRendered = useRef(false);
  useEffect(() => { hasRendered.current = true; }, []);
  const followedClubIds = useMemo(() => new Set(followedClubs.map(c => c.id)), [followedClubs]);
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

    // Followed clubs first, then by soonest ending
    return result.sort((a, b) => {
      const aFollowed = followedClubIds.has(a.club.id) ? 1 : 0;
      const bFollowed = followedClubIds.has(b.club.id) ? 1 : 0;
      if (aFollowed !== bFollowed) return bFollowed - aFollowed;
      // Within same group: soonest ending first
      const aEnd = a.earliestEnd ? new Date(a.earliestEnd).getTime() : Infinity;
      const bEnd = b.earliestEnd ? new Date(b.earliestEnd).getTime() : Infinity;
      if (aEnd !== bEnd) return aEnd - bEnd;
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
        title={t('dpcIntroTitle', { defaultMessage: 'Was sind Scout Cards?' })}
        description={t('dpcIntroDesc', { defaultMessage: 'Kaufe Scout Cards deines Lieblingsvereins. Steigt der Marktwert des Spielers, erhältst du durch die Community Success Fee.' })}
        show={!hasHoldings}
      />

      {/* 2. IPO View State Tabs */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1 bg-surface-subtle rounded-xl p-1" role="tablist" aria-label={t('ipoViewLabel', { defaultMessage: 'IPO-Ansicht' })}>
        {VIEW_TABS.map(tab => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={ipoViewState === tab.value}
            aria-label={t(tab.ariaKey, { defaultMessage: tab.ariaDefault })}
            onClick={() => setIpoViewState(tab.value)}
            className={cn(
              'flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors min-h-[44px]',
              'focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-main outline-none',
              'active:scale-[0.97]',
              ipoViewState === tab.value
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-white/40 hover:text-white/60 hover:bg-surface-subtle'
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

      {/* 5. Empty state */}
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

      {/* 6. Club cards grid — 2 col mobile, 3 col desktop */}
      {hasContent && (() => {
        const followed = clubAggregates.filter(a => followedClubIds.has(a.club.id));
        const rest = clubAggregates.filter(a => !followedClubIds.has(a.club.id));

        const renderCard = (agg: ClubAggregate, i: number) => {
          const shouldStagger = !hasRendered.current && i < 10;
          return (
            <div
              key={agg.clubName}
              className={shouldStagger ? 'card-entrance motion-reduce:animate-none' : undefined}
              style={shouldStagger ? { animationDelay: `${i * 50}ms` } : undefined}
            >
              <ClubCard
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
            </div>
          );
        };

        return (
          <div className="space-y-4">
            {/* Followed clubs section */}
            {followed.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-gold/70 uppercase tracking-wider mb-2">
                  {t('followedClubs', { defaultMessage: 'Deine Vereine' })}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {followed.map(renderCard)}
                </div>
              </div>
            )}

            {/* Separator when both sections exist */}
            {followed.length > 0 && rest.length > 0 && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[9px] text-white/25 font-semibold uppercase tracking-wider">
                  {t('allClubs', { defaultMessage: 'Alle Vereine' })}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
            )}

            {/* Rest */}
            {rest.length > 0 && (
              <div>
                {followed.length === 0 && rest.length > 0 && (
                  <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">
                    {t('allClubs', { defaultMessage: 'Alle Vereine' })}
                  </h3>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {rest.map(renderCard)}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* 8. Club detail modal — replaces inline accordion */}
      {(() => {
        const expandedAgg = clubAggregates.find(a => a.clubName === clubVerkaufExpandedClub);
        if (!expandedAgg) return null;
        return (
          <Modal
            open={true}
            title={expandedAgg.club.name}
            subtitle={`${expandedAgg.players.length} Scout Cards ${isBuyable ? t('available', { defaultMessage: 'verfügbar' }) : ''}`}
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
