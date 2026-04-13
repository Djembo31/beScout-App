'use client';

import React, { useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import { Trophy, Loader2 } from 'lucide-react';
import { ErrorBoundary, CountryBar, LeagueBar } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useClub } from '@/components/providers/ClubProvider';
import { centsToBsd } from '@/lib/services/players';
import { useUserTickets } from '@/lib/queries/tickets';
import { getClub } from '@/lib/clubs';
import { getCountries, getLeaguesByCountry } from '@/lib/leagues';
import { useIsClubAdmin } from '@/lib/queries/events';
import type { FantasyEvent } from '@/components/fantasy';
import { CreateEventModal, SpieltagTab } from '@/components/fantasy';
import { EventsTab } from '@/components/fantasy/EventsTab';
import { MitmachenTab } from '@/components/fantasy/MitmachenTab';
import { ErgebnisseTab } from '@/components/fantasy/ErgebnisseTab';
import { ScoringRules } from '@/components/fantasy/ScoringRules';
import type { HoldingWithPlayer } from '@/lib/services/wallet';

// Feature module imports
import { useFantasyStore } from '@/features/fantasy/store/fantasyStore';
import { useGameweek } from '@/features/fantasy/hooks/useGameweek';
import { useFantasyEvents } from '@/features/fantasy/hooks/useFantasyEvents';
import { useFantasyHoldings } from '@/features/fantasy/hooks/useFantasyHoldings';
import { useEventActions } from '@/features/fantasy/hooks/useEventActions';
import { useFixtureDeadlines } from '@/features/fantasy/hooks/useFixtureDeadlines';
import { useScoredEvents } from '@/features/fantasy/hooks/useScoredEvents';

// Presentational
import { FantasyHeader } from '@/features/fantasy/components/FantasyHeader';
import { FantasyNav } from '@/features/fantasy/components/FantasyNav';
import { FantasySkeleton } from '@/features/fantasy/components/FantasySkeleton';
import { FantasyError } from '@/features/fantasy/components/FantasyError';

// Keep same dynamic imports
import NewUserTip from '@/components/onboarding/NewUserTip';
const MissionHintList = dynamic(
  () => import('@/components/missions/MissionHintList'),
  { ssr: false }
);
const EventDetailModal = dynamic(
  () => import('@/components/fantasy/EventDetailModal').then(m => ({ default: m.EventDetailModal })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin motion-reduce:animate-none text-gold" />
          <span className="text-sm text-white/50">...</span>
        </div>
      </div>
    ),
  }
);
import EventSummaryModal, { markEventSeen } from '@/components/fantasy/EventSummaryModal';

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export default function FantasyContent() {
  // ── Auth + Club + i18n (ALL hooks before early returns) ──
  const { user, profile } = useUser();
  const { addToast } = useToast();
  const { activeClub } = useClub();
  const clubId = activeClub?.id ?? '';
  const userId = user?.id;

  const t = useTranslations('fantasy');
  const tt = useTranslations('tips');

  // Store (UI state)
  const store = useFantasyStore();

  // ── Feature hooks ──
  const { events, gwEvents, activeEvents, selectedEvent, joinedSet, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } = useFantasyEvents(store.currentGw);
  const gw = useGameweek(gwEvents);
  const { holdings } = useFantasyHoldings();
  const { joinEvent, leaveEvent, submitLineup: handleSubmitLineup } = useEventActions(clubId);
  const { fixtureDeadlines } = useFixtureDeadlines(gw.currentGw, activeEvents.length > 0);
  const { summaryEvent, summaryLeaderboard, dismissSummary } = useScoredEvents(gw.currentGw, events, joinedSet);

  // Admin check
  const { data: isAdmin = false } = useIsClubAdmin(userId, clubId || undefined);

  // Keep ticket balance cache warm
  useUserTickets(userId);

  // ── Country + League filter ──
  const { fantasyCountry, fantasyLeague, setFantasyCountry, setFantasyLeague } = store;

  // Derive countries that actually have events (from club -> country mapping)
  const eventCountries = useMemo(() => {
    const allCountries = getCountries();
    // Filter to only countries that have events in the current set
    const eventCountryCodes = new Set<string>();
    for (const e of gwEvents) {
      if (e.clubId) {
        const club = getClub(e.clubId);
        if (club) eventCountryCodes.add(club.country);
      }
    }
    // If no club-scoped events exist, show all countries
    if (eventCountryCodes.size === 0) return allCountries;
    return allCountries.filter(c => eventCountryCodes.has(c.code));
  }, [gwEvents]);

  // Smart auto-select: when country has only 1 league, auto-set league
  useEffect(() => {
    if (!fantasyCountry) return;
    const countryLeagues = getLeaguesByCountry(fantasyCountry);
    if (countryLeagues.length === 1) {
      setFantasyLeague(countryLeagues[0].name);
    }
  }, [fantasyCountry, setFantasyLeague]);

  // Filter gwEvents by selected league
  const filteredGwEvents = useMemo(() => {
    if (!fantasyLeague && !fantasyCountry) return gwEvents;
    return gwEvents.filter(e => {
      if (!e.clubId) return true; // Global events always show
      const club = getClub(e.clubId);
      if (!club) return true;
      if (fantasyLeague) return club.league === fantasyLeague;
      if (fantasyCountry) return club.country === fantasyCountry;
      return true;
    });
  }, [gwEvents, fantasyLeague, fantasyCountry]);

  // ── Dashboard stats (for ErgebnisseTab) ──
  const dashboardStats = useMemo(() => {
    const scored = events.filter(e => e.isJoined && e.scoredAt && e.userPoints != null);
    const eventsPlayed = scored.length;
    const seasonPoints = scored.reduce((sum, e) => sum + (e.userPoints ?? 0), 0);
    const ranks = scored.filter(e => e.userRank != null).map(e => e.userRank!);
    const bestRank = ranks.length > 0 ? Math.min(...ranks) : null;
    const totalRewardCents = scored.reduce((sum, e) => sum + (e.userReward ?? 0), 0);
    const totalRewardBsd = centsToBsd(totalRewardCents);

    const pastParticipations = scored
      .filter(e => e.userRank != null)
      .sort((a, b) => new Date(b.scoredAt!).getTime() - new Date(a.scoredAt!).getTime())
      .map(e => ({
        eventId: e.id,
        eventName: e.name,
        gameweek: e.gameweek ?? 0,
        rank: e.userRank!,
        totalParticipants: e.participants,
        points: e.userPoints ?? 0,
        rewardCents: e.userReward ?? 0,
      }));

    const wins = ranks.filter(r => r === 1).length;
    const top10 = ranks.filter(r => r <= 10).length;
    const avgPoints = eventsPlayed > 0 ? Math.round(seasonPoints / eventsPlayed) : 0;
    const avgRank = ranks.length > 0 ? Math.round(ranks.reduce((s, r) => s + r, 0) / ranks.length) : 0;

    return { eventsPlayed, seasonPoints, bestRank, totalRewardBsd, pastParticipations, wins, top10, avgPoints, avgRank };
  }, [events]);

  // ── Callbacks ──

  const handleSimulated = useCallback(() => {
    addToast(t('gameweekDone'), 'success');
    (async () => {
      await refetchEvents();
      if (clubId) {
        try {
          const { getActiveGameweek: fetchGw } = await import('@/lib/services/club');
          const newGw = await fetchGw(clubId);
          gw.setSelectedGameweek(newGw);
        } catch (err) { console.error('[Fantasy] Active gameweek fetch failed:', err); }
      }
    })();
  }, [addToast, refetchEvents, clubId, gw, t]);

  const handleCreateEvent = useCallback((eventData: Partial<FantasyEvent>) => {
    addToast(t('eventCreated', { name: eventData.name || t('newEventDefault') }), 'success');
  }, [addToast, t]);

  const handleResetEvent = useCallback(async () => {
    await refetchEvents();
  }, [refetchEvents]);

  const handleEventClick = useCallback((event: FantasyEvent) => {
    store.openEvent(event.id);
  }, [store]);

  // ── Early returns (ALL hooks called above) ──

  if (eventsLoading || gw.isLoading) return <FantasySkeleton />;

  if (eventsError && events.length === 0) return <FantasyError onRetry={refetchEvents} />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-5">
      {/* HEADER */}
      <FantasyHeader
        activeCount={activeEvents.length}
        isAdmin={isAdmin}
        onCreateClick={store.openCreateModal}
      />

      {/* New User Tip */}
      <NewUserTip
        tipKey="fantasy-first-event"
        icon={<Trophy className="size-4" />}
        title={tt('fantasyTitle')}
        description={tt('fantasyDesc')}
        show={!joinedSet.size}
      />

      {/* Contextual Mission Hints */}
      <MissionHintList context="fantasy" />

      {/* Scoring Rules */}
      <ScoringRules />

      {/* COUNTRY + LEAGUE FILTER */}
      <CountryBar
        countries={eventCountries}
        selected={fantasyCountry}
        onSelect={setFantasyCountry}
        className="mb-1"
      />
      <LeagueBar
        selected={fantasyLeague}
        onSelect={setFantasyLeague}
        country={fantasyCountry || undefined}
        size="sm"
        className="mb-1"
      />

      {/* STICKY NAV */}
      <FantasyNav
        currentGw={gw.currentGw}
        activeGw={gw.activeGw ?? 1}
        gwStatus={gw.gwStatus}
        fixtureCount={gw.fixtureCount}
        eventCount={filteredGwEvents.length}
        mainTab={store.mainTab}
        onTabChange={store.setMainTab}
        onGameweekChange={gw.setSelectedGameweek}
      />

      {/* ========== PAARUNGEN TAB ========== */}
      {store.mainTab === 'paarungen' && user && (
        <SpieltagTab
          gameweek={gw.currentGw}
          activeGameweek={gw.activeGw ?? 1}
          clubId={clubId}
          isAdmin={isAdmin}
          events={filteredGwEvents}
          userId={user.id}
          onSimulated={handleSimulated}
          onTabChange={store.setMainTab}
        />
      )}

      {/* ========== EVENTS TAB ========== */}
      {store.mainTab === 'events' && user && (
        <EventsTab
          events={filteredGwEvents}
          onEventClick={handleEventClick}
        />
      )}

      {/* ========== MITMACHEN TAB ========== */}
      {store.mainTab === 'mitmachen' && user && (
        <MitmachenTab
          gameweek={gw.currentGw}
          activeGameweek={gw.activeGw ?? 1}
          events={filteredGwEvents}
          userId={user.id}
          onEventClick={handleEventClick}
          onTabChange={store.setMainTab}
        />
      )}

      {/* ========== ERGEBNISSE TAB ========== */}
      {store.mainTab === 'ergebnisse' && user && (
        <ErgebnisseTab
          gameweek={gw.currentGw}
          activeGameweek={gw.activeGw ?? 1}
          fixtureCount={gw.fixtureCount}
          events={filteredGwEvents}
          userId={user.id}
          participations={dashboardStats.pastParticipations}
          userDisplayName={profile?.display_name || user?.email?.split('@')[0] || 'User'}
          userFavoriteClub={profile?.favorite_club ?? null}
          seasonPoints={dashboardStats.seasonPoints}
          eventsPlayed={dashboardStats.eventsPlayed}
          bestRank={dashboardStats.bestRank}
          totalRewardBsd={dashboardStats.totalRewardBsd}
          wins={dashboardStats.wins}
          top10={dashboardStats.top10}
          avgPoints={dashboardStats.avgPoints}
          avgRank={dashboardStats.avgRank}
        />
      )}

      {/* EVENT DETAIL MODAL */}
      <ErrorBoundary>
        <EventDetailModal
          event={selectedEvent}
          isOpen={!!selectedEvent}
          onClose={store.closeEvent}
          onJoin={joinEvent}
          onSubmitLineup={handleSubmitLineup}
          onLeave={leaveEvent}
          onReset={handleResetEvent}
          userHoldings={holdings}
          fixtureDeadlines={fixtureDeadlines}
        />
      </ErrorBoundary>

      {/* CREATE EVENT MODAL */}
      <ErrorBoundary>
        <CreateEventModal
          isOpen={store.showCreateModal}
          onClose={store.closeCreateModal}
          onCreate={handleCreateEvent}
        />
      </ErrorBoundary>

      {/* POST-EVENT SUMMARY MODAL */}
      {summaryEvent && (
        <ErrorBoundary>
          <EventSummaryModal
            event={summaryEvent}
            leaderboard={summaryLeaderboard}
            open={true}
            onClose={() => {
              markEventSeen(summaryEvent.id);
              dismissSummary();
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
