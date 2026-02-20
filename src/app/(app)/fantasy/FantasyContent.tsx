'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  Trophy, Globe, History, Plus, AlertCircle, RefreshCw, Loader2, Calendar, Target,
} from 'lucide-react';
import { Card, Button, SearchInput, SortPills, EmptyState, Skeleton, SkeletonCard } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { centsToBsd } from '@/lib/services/players';
import { deductEntryFee, refundEntryFee } from '@/lib/services/wallet';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { submitLineup, getLineup } from '@/lib/services/lineups';
import { invalidateFantasyQueries } from '@/lib/queries/invalidation';
import { useEvents, useJoinedEventIds, usePlayerEventUsage, useActiveGameweek, useIsClubAdmin } from '@/lib/queries/events';
import { useHoldings } from '@/lib/queries/holdings';
import { withTimeout } from '@/lib/utils';
import { fmtScout } from '@/lib/utils';
import type { DbEvent } from '@/types';
import {
  type EventStatus, type FantasyTab, type FantasyEvent,
  type LineupPlayer, type UserDpcHolding, type LineupFormat,
  GameweekSelector, EventCard,
  HistoryTab, CreateEventModal, SpieltagTab, PredictionsTab,
} from '@/components/fantasy';

import { useClub } from '@/components/providers/ClubProvider';

// Lazy-load EventDetailModal (1387 lines) — only loaded when user opens an event
const EventDetailModal = dynamic(
  () => import('@/components/fantasy/EventDetailModal').then(m => ({ default: m.EventDetailModal })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFD700]" />
          <span className="text-sm text-white/50">Event wird geladen...</span>
        </div>
      </div>
    ),
  }
);

// ============================================
// MAPPERS: DB → Local Types
// ============================================

/** Derive actual event status from DB status — admin-controlled, no timestamp overrides */
function deriveEventStatus(db: DbEvent): EventStatus {
  if (db.scored_at) return 'ended';
  const s = db.status;
  if (s === 'ended' || s === 'scoring') return 'ended';
  if (s === 'running') return 'running';
  if (s === 'registering' || s === 'late-reg') return s as EventStatus;
  return 'upcoming';
}

/** Map DB event to local FantasyEvent shape */
function dbEventToFantasyEvent(db: DbEvent, joinedIds: Set<string>, userLineup?: { total_score: number | null; rank: number | null; reward_amount: number } | null): FantasyEvent {
  return {
    id: db.id,
    name: db.name,
    description: `${db.name} – ${db.format} Format`,
    type: db.type === 'special' ? 'special' : db.type,
    mode: db.format === '11er' ? 'tournament' : 'league',
    status: deriveEventStatus(db),
    format: (db.format || '6er') as LineupFormat,
    gameweek: db.gameweek ?? 1,
    startTime: new Date(db.starts_at).getTime(),
    endTime: db.ends_at ? new Date(db.ends_at).getTime() : new Date(db.starts_at).getTime() + 259200000,
    lockTime: new Date(db.locks_at).getTime(),
    buyIn: centsToBsd(db.entry_fee),
    entryFeeCents: db.entry_fee,
    prizePool: centsToBsd(db.prize_pool),
    guaranteed: centsToBsd(db.prize_pool),
    participants: db.current_entries,
    maxParticipants: db.max_entries,
    entryType: 'single',
    speed: 'normal',
    sponsorName: db.sponsor_name ?? undefined,
    sponsorLogo: db.sponsor_logo ?? undefined,
    isPromoted: db.type === 'bescout' || db.type === 'sponsor',
    isFeatured: db.type === 'sponsor',
    isJoined: joinedIds.has(db.id),
    isInterested: false,
    userRank: userLineup?.rank ?? undefined,
    userPoints: userLineup?.total_score ?? undefined,
    userReward: userLineup?.reward_amount ?? undefined,
    scoredAt: db.scored_at,
    eventTier: db.event_tier ?? 'club',
    minSubscriptionTier: db.min_subscription_tier ?? null,
    requirements: { dpcPerSlot: 1 },
    rewards: [
      { rank: '1st', reward: 'Champion Badge' },
      { rank: 'Top 10', reward: 'Gold Frame' },
    ],
  };
}

/** Map DB holding row to local UserDpcHolding shape */
function dbHoldingToUserDpcHolding(h: HoldingWithPlayer): UserDpcHolding {
  return {
    id: h.player_id,
    first: h.player?.first_name ?? '',
    last: h.player?.last_name ?? '',
    pos: h.player?.position ?? 'MID',
    club: h.player?.club ?? '',
    dpcOwned: h.quantity,
    eventsUsing: 0,
    dpcAvailable: h.quantity,
    activeEventIds: [],
    isLocked: false,
    lastScore: h.player?.perf_l5 ?? undefined,
    avgScore: h.player?.perf_l15 ?? undefined,
    perfL5: h.player?.perf_l5 ?? 0,
    perfL15: h.player?.perf_l15 ?? 0,
    matches: h.player?.matches ?? 0,
    goals: h.player?.goals ?? 0,
    assists: h.player?.assists ?? 0,
    status: (h.player?.status as UserDpcHolding['status']) ?? 'fit',
    imageUrl: h.player?.image_url ?? null,
  };
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export default function FantasyContent() {
  // Auth + Wallet + Club
  const { user, profile } = useUser();
  const { balanceCents, setBalanceCents } = useWallet();
  const { addToast } = useToast();
  const { activeClub } = useClub();
  const clubId = activeClub?.id ?? '';
  const userId = user?.id;

  // ── React Query Hooks (BEFORE any early returns) ──
  const { data: dbEvents = [], isLoading: eventsLoading, isError: eventsError } = useEvents();
  const { data: joinedIdsArr = [] } = useJoinedEventIds(userId);
  const { data: usageMap } = usePlayerEventUsage(userId);
  const { data: activeGw = 1 } = useActiveGameweek(clubId || undefined);
  const { data: isAdmin = false } = useIsClubAdmin(userId, clubId || undefined);
  const { data: dbHoldings = [] } = useHoldings(userId);

  const t = useTranslations('fantasy');
  const tc = useTranslations('common');

  // State
  const [mainTab, setMainTab] = useState<FantasyTab>('spieltag');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<FantasyEvent | null>(null);
  const [localEvents, setLocalEvents] = useState<FantasyEvent[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lineupMap, setLineupMap] = useState<Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>>(new Map());

  // Sync selectedGameweek with activeGw on first load
  useEffect(() => {
    if (selectedGameweek === null && activeGw > 0) {
      setSelectedGameweek(activeGw);
    }
  }, [activeGw, selectedGameweek]);

  const currentGw = selectedGameweek ?? activeGw;

  // Load user lineups for scored events to get rank + points
  const joinedSet = useMemo(() => new Set(joinedIdsArr), [joinedIdsArr]);

  useEffect(() => {
    if (!userId || dbEvents.length === 0) return;
    let cancelled = false;
    const scoredJoinedEvents = dbEvents.filter(e => e.scored_at && joinedSet.has(e.id));
    if (scoredJoinedEvents.length === 0) return;

    Promise.all(scoredJoinedEvents.map(e => getLineup(e.id, userId))).then(lineups => {
      if (cancelled) return;
      const map = new Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>();
      scoredJoinedEvents.forEach((e, i) => {
        if (lineups[i]) map.set(e.id, { total_score: lineups[i]!.total_score, rank: lineups[i]!.rank, reward_amount: lineups[i]!.reward_amount });
      });
      setLineupMap(map);
    }).catch(err => console.error('[Fantasy] Lineup load failed:', err));
    return () => { cancelled = true; };
  }, [dbEvents, joinedSet, userId]);

  // Derive events from React Query data
  const events = useMemo(() => {
    if (localEvents) return localEvents;
    return dbEvents.map(e => dbEventToFantasyEvent(e, joinedSet, lineupMap.get(e.id)));
  }, [dbEvents, joinedSet, lineupMap, localEvents]);

  // Derive holdings with usage info
  const holdings = useMemo(() => {
    return dbHoldings.map(h => {
      const holding = dbHoldingToUserDpcHolding(h);
      const eventIds = usageMap?.get(holding.id) || [];
      holding.activeEventIds = eventIds;
      holding.eventsUsing = eventIds.length;
      holding.dpcAvailable = Math.max(0, holding.dpcOwned - holding.eventsUsing);
      holding.isLocked = holding.dpcAvailable <= 0;
      return holding;
    });
  }, [dbHoldings, usageMap]);

  // Derived data
  const activeEvents = useMemo(() => events.filter(e => e.isJoined && e.status === 'running'), [events]);

  // Dashboard stats from real data
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

  // Events filtered by selected gameweek (for Events tab)
  const gwFilteredEvents = useMemo(() => {
    return events.filter(e => e.gameweek === currentGw);
  }, [events, currentGw]);

  // Events filtered by selected gameweek for SpieltagTab
  const spieltagEvents = useMemo(() => {
    return events.filter(e => e.gameweek === currentGw);
  }, [events, currentGw]);

  // Filtered events for Events tab
  const filteredEvents = useMemo(() => {
    let filtered = [...gwFilteredEvents];

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.clubName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter === 'registering') {
      filtered = filtered.filter(e => e.status === 'registering' || e.status === 'late-reg');
    } else if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    const statusOrder = { 'late-reg': 0, 'running': 1, 'registering': 2, 'upcoming': 3, 'ended': 4 };
    filtered.sort((a, b) => (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5));

    return filtered;
  }, [gwFilteredEvents, searchQuery, statusFilter]);

  // Status counts
  const statusCounts = useMemo(() => ({
    all: gwFilteredEvents.length,
    'late-reg': gwFilteredEvents.filter(e => e.status === 'late-reg').length,
    registering: gwFilteredEvents.filter(e => e.status === 'registering').length,
    running: gwFilteredEvents.filter(e => e.status === 'running').length,
    upcoming: gwFilteredEvents.filter(e => e.status === 'upcoming').length,
    ended: gwFilteredEvents.filter(e => e.status === 'ended').length,
  }), [gwFilteredEvents]);

  // Handlers
  const handleToggleInterest = useCallback((eventId: string) => {
    setLocalEvents(prev => (prev ?? events).map(e =>
      e.id === eventId ? { ...e, isInterested: !e.isInterested } : e
    ));
  }, [events]);

  const handleJoinEvent = useCallback(async (event: FantasyEvent, lineup: LineupPlayer[], formation: string, captainSlot: string | null = null) => {
    if (!user) return;

    if (event.status === 'ended' || event.status === 'running') {
      addToast('Anmeldung nicht möglich — Event ist bereits gestartet oder beendet.', 'error');
      return;
    }

    if (event.maxParticipants && event.participants >= event.maxParticipants) {
      addToast('Event ist voll — maximale Teilnehmerzahl erreicht.', 'error');
      return;
    }

    const bal = balanceCents ?? 0;
    if (event.entryFeeCents > 0 && bal < event.entryFeeCents) {
      addToast(`Nicht genug $SCOUT! Du brauchst ${event.buyIn} $SCOUT, hast aber nur ${fmtScout(bal / 100)}.`, 'error');
      return;
    }

    const wasJoined = event.isJoined;
    setLocalEvents(prev => (prev ?? events).map(e =>
      e.id === event.id ? { ...e, isJoined: true, isInterested: false, participants: wasJoined ? e.participants : (e.participants || 0) + 1 } : e
    ));
    setSelectedEvent(null);

    try {
      // 1. Deduct fee FIRST — money is the critical resource, prevents free entries
      if (event.entryFeeCents > 0) {
        const newBalance = await deductEntryFee(user.id, event.entryFeeCents, event.name, event.id);
        setBalanceCents(newBalance);
      }

      // 2. Then submit lineup — if this fails, refund the fee
      const slotMap = new Map(lineup.map(p => [p.slot, p.playerId]));
      try {
        await submitLineup({
          eventId: event.id,
          userId: user.id,
          formation,
          slotGk: slotMap.get(0) || null,
          slotDef1: slotMap.get(1) || null,
          slotDef2: slotMap.get(2) || null,
          slotMid1: slotMap.get(3) || null,
          slotMid2: slotMap.get(4) || null,
          slotAtt: slotMap.get(5) || null,
          captainSlot,
        });
      } catch (lineupErr: unknown) {
        // Lineup failed — refund the fee to keep state consistent
        if (event.entryFeeCents > 0) {
          try {
            const refundedBalance = await refundEntryFee(user.id, event.entryFeeCents, event.name, event.id);
            setBalanceCents(refundedBalance);
          } catch (refundErr) { console.error('[Fantasy] Fee refund failed:', refundErr); }
        }
        throw lineupErr;
      }
    } catch (e: unknown) {
      setLocalEvents(prev => (prev ?? events).map(ev =>
        ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: wasJoined ? ev.participants : Math.max(0, (ev.participants || 1) - 1) } : ev
      ));
      addToast(`Fehler: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`, 'error');
      return;
    }

    invalidateFantasyQueries(user.id);
    try { await fetch('/api/events?bust=1'); } catch (err) { console.error('[Fantasy] Event cache bust failed:', err); }

    // Mission tracking — only after full join succeeds (lineup + fee)
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(user.id, ['weekly_fantasy']);
    }).catch(err => console.error('[Fantasy] Mission tracking failed:', err));

    addToast(`Erfolgreich angemeldet für "${event.name}"!`, 'success');
  }, [user, balanceCents, setBalanceCents, addToast, events]);

  const handleLeaveEvent = useCallback(async (event: FantasyEvent) => {
    if (!user) return;

    const wasJoined = event.isJoined;
    const prevParticipants = event.participants;
    setLocalEvents(prev => (prev ?? events).map(e =>
      e.id === event.id ? { ...e, isJoined: false, participants: Math.max(0, (e.participants || 1) - 1) } : e
    ));
    setSelectedEvent(null);

    try {
      // Remove lineup from DB first
      const { removeLineup } = await import('@/lib/services/lineups');
      await removeLineup(event.id, user.id);

      // Then refund entry fee
      if (event.entryFeeCents > 0) {
        const newBalance = await refundEntryFee(user.id, event.entryFeeCents, event.name, event.id);
        setBalanceCents(newBalance);
      }
    } catch (e: unknown) {
      // Revert optimistic update on failure
      setLocalEvents(prev => (prev ?? events).map(ev =>
        ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: prevParticipants } : ev
      ));
      addToast(`Abmeldung fehlgeschlagen: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`, 'error');
      return;
    }

    invalidateFantasyQueries(user.id);
    try { await fetch('/api/events?bust=1'); } catch (err) { console.error('[Fantasy] Event cache bust failed:', err); }

    addToast(`Vom Event "${event.name}" abgemeldet.${event.buyIn > 0 ? ` ${event.buyIn} $SCOUT zurückerstattet.` : ''}`, 'success');
  }, [user, setBalanceCents, addToast, events]);

  // Refetch all events from DB (used after score, reset, simulation)
  const reloadEvents = useCallback(async () => {
    setLocalEvents(null); // Clear local overrides, let React Query refetch
    invalidateFantasyQueries(userId);
  }, [userId]);

  const handleResetEvent = useCallback(async (event: FantasyEvent) => {
    // Optimistic local update, then full refetch
    setLocalEvents(prev => (prev ?? events).map(e =>
      e.id === event.id ? { ...e, status: 'registering' as EventStatus, scoredAt: undefined } : e
    ));
    setSelectedEvent(prev => prev && prev.id === event.id ? { ...prev, status: 'registering' as EventStatus, scoredAt: undefined } : prev);
    await reloadEvents();
  }, [reloadEvents, events]);

  const handleCreateEvent = useCallback((eventData: Partial<FantasyEvent>) => {
    const newEvent: FantasyEvent = {
      id: `e${Date.now()}`,
      name: eventData.name || 'Neues Event',
      description: eventData.description || '',
      type: 'creator',
      mode: eventData.mode || 'tournament',
      status: 'registering',
      format: eventData.format || '6er',
      gameweek: currentGw,
      startTime: Date.now() + 86400000,
      endTime: Date.now() + 604800000,
      lockTime: Date.now() + 82800000,
      buyIn: eventData.buyIn || 5,
      entryFeeCents: ((eventData.buyIn || 5) * 100),
      prizePool: (eventData.buyIn || 5) * (eventData.maxParticipants || 50) * 0.95,
      participants: 1,
      maxParticipants: eventData.maxParticipants || 50,
      entryType: 'single',
      speed: 'normal',
      isPromoted: false,
      isFeatured: false,
      isJoined: true,
      isInterested: false,
      creatorId: 'user1',
      creatorName: 'Du',
      eventTier: 'user',
      requirements: { dpcPerSlot: 1 },
      rewards: [{ rank: '1st', reward: 'League Champion' }],
    };
    setLocalEvents(prev => [newEvent, ...(prev ?? events)]);
    addToast(`Event "${newEvent.name}" wurde erstellt!`, 'success');
  }, [addToast, currentGw, events]);

  // Reload handler for error state
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // After gameweek simulation: reload data + auto-navigate to new GW
  const handleSimulated = useCallback(() => {
    addToast('Spieltag abgeschlossen! Nächster Spieltag wird geladen...', 'success');
    (async () => {
      await reloadEvents();
      // Re-fetch active GW (may have advanced) and auto-navigate
      if (clubId) {
        try {
          const { getActiveGameweek: fetchGw } = await import('@/lib/services/club');
          const newGw = await fetchGw(clubId);
          setSelectedGameweek(newGw);
        } catch (err) { console.error('[Fantasy] Active gameweek fetch failed:', err); }
      }
    })();
  }, [addToast, reloadEvents, clubId]);

  // Loading state — skeleton
  if (eventsLoading) {
    return (
      <div className="max-w-[1600px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl">
          {[1, 2, 3].map(i => <Skeleton key={i} className="flex-1 h-10 rounded-lg" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  // Error state
  if (eventsError && events.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-white/70 font-bold">{t('dataLoadFailed')}</div>
        <Button variant="outline" onClick={handleRetry}>
          <RefreshCw className="w-4 h-4" />
          {tc('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* HEADER — Compact */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
          <Trophy className="w-6 h-6 text-[#FFD700]" />
          Fantasy
        </h1>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1.5 text-sm">
              <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="font-mono font-bold text-[#22C55E]">{activeEvents.length}</span>
              <span className="text-white/40 text-xs">{tc('active')}</span>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{tc('create')}</span>
            </button>
          )}
        </div>
      </div>

      {/* SEGMENT TABS — 4 Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-x-auto">
        {([
          { id: 'spieltag' as FantasyTab, label: `${t('gameweek')} ${activeGw}`, icon: Calendar },
          { id: 'events' as FantasyTab, label: t('events'), icon: Globe, count: activeEvents.length },
          { id: 'predictions' as FantasyTab, label: t('predictions'), icon: Target },
          { id: 'history' as FantasyTab, label: t('history'), icon: History },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setMainTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              mainTab === tab.id
                ? 'bg-[#FFD700]/15 text-[#FFD700] shadow-sm'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count != null && tab.count > 0 && (
              <span className="px-1.5 py-0.5 bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-bold rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ========== SPIELTAG TAB (Hero) ========== */}
      {mainTab === 'spieltag' && user && (
        <SpieltagTab
          gameweek={currentGw}
          activeGameweek={activeGw}
          clubId={clubId}
          isAdmin={isAdmin}
          events={spieltagEvents}
          userId={user.id}
          onEventClick={setSelectedEvent}
          onToggleInterest={handleToggleInterest}
          onGameweekChange={setSelectedGameweek}
          onSimulated={handleSimulated}
        />
      )}

      {/* ========== EVENTS TAB — GW-filtered ========== */}
      {mainTab === 'events' && (
        <div className="space-y-6">
          {/* Gameweek Selector */}
          <GameweekSelector
            activeGameweek={activeGw}
            selectedGameweek={currentGw}
            onSelect={setSelectedGameweek}
          />

          {/* SEARCH + FILTERS */}
          <div className="flex items-center gap-2">
            <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={t('searchEvents')} className="flex-1 min-w-0" />
            <SortPills
              options={[
                { id: 'all', label: tc('all'), count: statusCounts.all },
                { id: 'registering', label: t('status.open'), count: statusCounts.registering + statusCounts['late-reg'] },
                { id: 'ended', label: tc('ended'), count: statusCounts.ended },
              ]}
              active={statusFilter}
              onChange={(id) => setStatusFilter(id as EventStatus | 'all')}
            />
          </div>

          {/* ALLE EVENTS */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40">
                {t('eventsGameweek', { gw: currentGw })}
              </h2>
              <div className="text-xs text-white/40">{t('eventsCount', { count: filteredEvents.length })}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  onView={() => setSelectedEvent(event)}
                  onToggleInterest={() => handleToggleInterest(event.id)}
                />
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <EmptyState icon={<Trophy />} title={t('noEventsForGameweek', { gw: currentGw })} />
            )}
          </section>
        </div>
      )}

      {/* ========== PREDICTIONS TAB ========== */}
      {mainTab === 'predictions' && user && (
        <PredictionsTab gameweek={currentGw} userId={user.id} />
      )}

      {/* ========== HISTORY TAB ========== */}
      {mainTab === 'history' && (
        <HistoryTab
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
          userId={user?.id}
        />
      )}

      {/* EVENT DETAIL MODAL */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onJoin={handleJoinEvent}
        onLeave={handleLeaveEvent}
        onReset={handleResetEvent}
        userHoldings={holdings}
      />

      {/* CREATE EVENT MODAL */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateEvent}
      />

    </div>
  );
}
