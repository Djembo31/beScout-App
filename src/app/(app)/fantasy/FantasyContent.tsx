'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Trophy, Search, Grid3X3, List, Home, Globe, History, Plus, AlertCircle, RefreshCw, Loader2,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { centsToBsd } from '@/lib/services/players';
import { getHoldings, deductEntryFee, refundEntryFee } from '@/lib/services/wallet';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { getEvents, getUserJoinedEventIds } from '@/lib/services/events';
import { submitLineup, getLineup, getLineupWithPlayers, getPlayerEventUsage } from '@/lib/services/lineups';
import { invalidate, withTimeout } from '@/lib/cache';
import { val } from '@/lib/settledHelpers';
import { fmtBSD } from '@/lib/utils';
import type { DbEvent } from '@/types';
import {
  type EventStatus, type FantasyTab, type ViewMode, type FantasyEvent,
  type LineupPlayer, type UserDpcHolding, type LeagueCategory, type LineupFormat, type ScoredLineupData,
  GAMEWEEKS, getStatusStyle,
  GameweekSelector, EventCard, EventTableRow,
  DashboardTab, HistoryTab, CreateEventModal,
} from '@/components/fantasy';

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

/** Derive actual event status from DB status + timestamps */
function deriveEventStatus(db: DbEvent): EventStatus {
  const now = Date.now();
  const startsAt = new Date(db.starts_at).getTime();
  const endsAt = db.ends_at ? new Date(db.ends_at).getTime() : null;

  // DB says ended/scoring OR has been scored → ended
  if (db.status === 'ended' || db.status === 'scoring' || db.scored_at) return 'ended';
  // Past end time → ended
  if (endsAt && now > endsAt) return 'ended';
  // DB says registering → keep it (even if starts_at is in the past, e.g. after reset)
  if (db.status === 'registering' || db.status === 'late-reg') return db.status as EventStatus;
  // Past start time → running
  if (now >= startsAt) return 'running';
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
    gameweek: db.gameweek ?? 13,
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
    isPromoted: db.type === 'bescout' || db.type === 'sponsor',
    isFeatured: db.type === 'sponsor',
    isJoined: joinedIds.has(db.id),
    isInterested: false,
    userRank: userLineup?.rank ?? undefined,
    userPoints: userLineup?.total_score ?? undefined,
    userReward: userLineup?.reward_amount ?? undefined,
    scoredAt: db.scored_at,
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
  };
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export default function FantasyContent() {
  // Auth + Wallet
  const { user, profile } = useUser();
  const { balanceCents, setBalanceCents } = useWallet();
  const { addToast } = useToast();

  // State
  const [mainTab, setMainTab] = useState<FantasyTab>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedGameweek, setSelectedGameweek] = useState('gw13');
  const [selectedEvent, setSelectedEvent] = useState<FantasyEvent | null>(null);
  const [events, setEvents] = useState<FantasyEvent[]>([]);
  const [holdings, setHoldings] = useState<UserDpcHolding[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scoredLineups, setScoredLineups] = useState<ScoredLineupData[]>([]);

  // Load real data from DB
  useEffect(() => {
    if (!user) return;
    const uid = user.id;
    async function load() {
      try {
      const fantasyResults = await withTimeout(Promise.allSettled([
        getEvents(),
        getHoldings(uid),
        getUserJoinedEventIds(uid),
        getPlayerEventUsage(uid),
      ]), 10000);
      const dbEvents = val(fantasyResults[0], []);
      const dbHoldings = val(fantasyResults[1], []);
      const joinedIds = val(fantasyResults[2], [] as string[]);
      const usageMap = val(fantasyResults[3], new Map<string, string[]>());
      // Events are critical
      if (fantasyResults[0].status === 'rejected') {
        setDataError(true);
        addToast('Fehler beim Laden der Fantasy-Daten', 'error');
        setDataLoading(false);
        return;
      }
      const joinedSet = new Set(joinedIds);

      // Load user lineups for scored events to get rank + points
      const scoredJoinedEvents = dbEvents.filter(e => e.scored_at && joinedSet.has(e.id));
      const lineupPromises = scoredJoinedEvents.map(e => getLineup(e.id, uid));
      const lineups = await Promise.all(lineupPromises);
      const lineupMap = new Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>();
      scoredJoinedEvents.forEach((e, i) => {
        if (lineups[i]) lineupMap.set(e.id, { total_score: lineups[i]!.total_score, rank: lineups[i]!.rank, reward_amount: lineups[i]!.reward_amount });
      });

      // Load ALL scored event lineups with player details for dashboard pitch
      const sortedScoredEvents = scoredJoinedEvents
        .filter(e => e.scored_at)
        .sort((a, b) => new Date(b.scored_at!).getTime() - new Date(a.scored_at!).getTime());
      const lwpPromises = sortedScoredEvents.map(e => getLineupWithPlayers(e.id, uid));
      const lwpResults = await Promise.all(lwpPromises);
      const allScoredLineups: ScoredLineupData[] = [];
      sortedScoredEvents.forEach((e, i) => {
        const lwp = lwpResults[i];
        const lm = lineupMap.get(e.id);
        if (lwp) {
          allScoredLineups.push({
            eventId: e.id,
            eventName: e.name,
            gameweek: e.gameweek ?? 0,
            rank: lm?.rank ?? 0,
            totalParticipants: e.current_entries ?? 0,
            points: lm?.total_score ?? 0,
            rewardCents: lm?.reward_amount ?? 0,
            formation: lwp.lineup.formation || '1-2-2-1',
            players: lwp.players,
          });
        }
      });
      setScoredLineups(allScoredLineups);

      setEvents(dbEvents.map(e => dbEventToFantasyEvent(e, joinedSet, lineupMap.get(e.id))));
      setHoldings(dbHoldings.map(h => {
        const holding = dbHoldingToUserDpcHolding(h);
        const eventIds = usageMap.get(holding.id) || [];
        holding.activeEventIds = eventIds;
        holding.eventsUsing = eventIds.length;
        holding.dpcAvailable = Math.max(0, holding.dpcOwned - holding.eventsUsing);
        holding.isLocked = holding.dpcAvailable <= 0;
        return holding;
      }));
      setDataError(false);
      } catch {
        setDataError(true);
        addToast('Fehler beim Laden der Fantasy-Daten', 'error');
      }
      setDataLoading(false);
    }
    load();
  }, [user, addToast]);

  // Derived data
  const activeEvents = useMemo(() => events.filter(e => e.isJoined && e.status === 'running'), [events]);
  const registeredEvents = useMemo(() => events.filter(e => e.isJoined && (e.status === 'registering' || e.status === 'upcoming')), [events]);
  const interestedEvents = useMemo(() => events.filter(e => e.isInterested && !e.isJoined), [events]);
  const joinedNonEndedEvents = useMemo(() => events.filter(e => e.isJoined && e.status !== 'ended'), [events]);
  const featuredOrLiveEvents = useMemo(() => events.filter(e => (e.isPromoted || e.isFeatured || e.status === 'running') && !e.isJoined), [events]);

  // Dashboard stats from real data
  const dashboardStats = useMemo(() => {
    const scored = events.filter(e => e.isJoined && e.scoredAt && e.userPoints != null);
    const eventsPlayed = scored.length;
    const seasonPoints = scored.reduce((sum, e) => sum + (e.userPoints ?? 0), 0);
    const ranks = scored.filter(e => e.userRank != null).map(e => e.userRank!);
    const bestRank = ranks.length > 0 ? Math.min(...ranks) : null;
    const totalRewardCents = scored.reduce((sum, e) => sum + (e.userReward ?? 0), 0);
    const totalRewardBsd = centsToBsd(totalRewardCents);

    // Past participations sorted by scoredAt desc (for Form + Last Event)
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

  // Category counts
  const categoryCounts = useMemo(() => ({
    all: events.length,
    joined: events.filter(e => e.isJoined).length,
    favorites: events.filter(e => e.isInterested).length,
    bescout: events.filter(e => e.type === 'bescout').length,
    club: events.filter(e => e.type === 'club').length,
    sponsor: events.filter(e => e.type === 'sponsor').length,
    creator: events.filter(e => e.type === 'creator').length,
  }), [events]);

  const CATEGORIES_WITH_COUNTS: LeagueCategory[] = [
    { id: 'joined', name: 'Meine Events', icon: '✅', count: categoryCounts.joined, group: 'user' },
    { id: 'favorites', name: 'Favoriten', icon: '⭐', count: categoryCounts.favorites, group: 'user' },
    { id: 'all', name: 'Alle Events', icon: '🌐', count: categoryCounts.all, group: 'type' },
    { id: 'bescout', name: 'BeScout Official', icon: '✨', count: categoryCounts.bescout, group: 'type' },
    { id: 'club', name: 'Club Events', icon: '🏟️', count: categoryCounts.club, group: 'type' },
    { id: 'sponsor', name: 'Sponsor Events', icon: '🎁', count: categoryCounts.sponsor, group: 'type' },
    { id: 'creator', name: 'Community', icon: '👥', count: categoryCounts.creator, group: 'type' },
  ];

  // Filtered events for lobby
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (searchQuery) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.clubName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    if (categoryFilter === 'joined') {
      filtered = filtered.filter(e => e.isJoined);
    } else if (categoryFilter === 'favorites') {
      filtered = filtered.filter(e => e.isInterested);
    } else if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.type === categoryFilter);
    }

    // Sort: late-reg first, then running, registering, upcoming, ended
    const statusOrder = { 'late-reg': 0, 'running': 1, 'registering': 2, 'upcoming': 3, 'ended': 4 };
    filtered.sort((a, b) => (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5));

    return filtered;
  }, [events, searchQuery, statusFilter, categoryFilter]);

  // Status counts
  const statusCounts = useMemo(() => ({
    all: events.length,
    'late-reg': events.filter(e => e.status === 'late-reg').length,
    registering: events.filter(e => e.status === 'registering').length,
    running: events.filter(e => e.status === 'running').length,
    upcoming: events.filter(e => e.status === 'upcoming').length,
    ended: events.filter(e => e.status === 'ended').length,
  }), [events]);

  // Handlers
  const handleToggleInterest = useCallback((eventId: string) => {
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, isInterested: !e.isInterested } : e
    ));
  }, []);

  const handleJoinEvent = useCallback(async (event: FantasyEvent, lineup: LineupPlayer[], formation: string) => {
    if (!user) return;

    // Block joining ended or running events
    if (event.status === 'ended' || event.status === 'running') {
      addToast('Anmeldung nicht möglich — Event ist bereits gestartet oder beendet.', 'error');
      return;
    }

    // Block joining full events
    if (event.maxParticipants && event.participants >= event.maxParticipants) {
      addToast('Event ist voll — maximale Teilnehmerzahl erreicht.', 'error');
      return;
    }

    // Check balance for paid events
    const bal = balanceCents ?? 0;
    if (event.entryFeeCents > 0 && bal < event.entryFeeCents) {
      addToast(`Nicht genug BSD! Du brauchst ${event.buyIn} BSD, hast aber nur ${fmtBSD(bal / 100)}.`, 'error');
      return;
    }

    // Optimistic UI update (only increment participants if not already joined)
    const wasJoined = event.isJoined;
    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, isJoined: true, isInterested: false, participants: wasJoined ? e.participants : (e.participants || 0) + 1 } : e
    ));
    setSelectedEvent(null);

    try {
      // Map lineup players to DB slot columns in slot order (0-5)
      const slotMap = new Map(lineup.map(p => [p.slot, p.playerId]));

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
      });

      // Deduct entry fee (with transaction log)
      if (event.entryFeeCents > 0) {
        const newBalance = await deductEntryFee(user.id, event.entryFeeCents, event.name, event.id);
        setBalanceCents(newBalance);
      }
    } catch (e: unknown) {
      // Revert on error (only decrement if it was a new join, not a lineup update)
      setEvents(prev => prev.map(ev =>
        ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: wasJoined ? ev.participants : Math.max(0, (ev.participants || 1) - 1) } : ev
      ));
      addToast(`Fehler: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`, 'error');
      return;
    }

    // Update holdings: add this event to each lineup player's activeEventIds
    const lineupPlayerIds = new Set(lineup.map(p => p.playerId));
    setHoldings(prev => prev.map(h => {
      if (!lineupPlayerIds.has(h.id)) return h;
      const newEventIds = h.activeEventIds.includes(event.id) ? h.activeEventIds : [...h.activeEventIds, event.id];
      const newUsing = newEventIds.length;
      const newAvail = Math.max(0, h.dpcOwned - newUsing);
      return { ...h, activeEventIds: newEventIds, eventsUsing: newUsing, dpcAvailable: newAvail, isLocked: newAvail <= 0 };
    }));

    // Bust server cache so other users see updated participant count faster
    invalidate('events:');
    try { await fetch('/api/events?bust=1'); } catch { /* silent */ }

    addToast(`Erfolgreich angemeldet für "${event.name}"!`, 'success');
  }, [user, balanceCents, setBalanceCents, addToast]);

  const handleLeaveEvent = useCallback(async (event: FantasyEvent) => {
    if (!user) return;

    // Optimistic UI update (isJoined + participants count)
    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, isJoined: false, participants: Math.max(0, (e.participants || 1) - 1) } : e
    ));
    setSelectedEvent(null);

    // Refund entry fee (with transaction log)
    try {
      if (event.entryFeeCents > 0) {
        const newBalance = await refundEntryFee(user.id, event.entryFeeCents, event.name, event.id);
        setBalanceCents(newBalance);
      }
    } catch {
      // Refund failed — user notified via wallet state
    }

    // Update holdings: remove this event from player activeEventIds
    setHoldings(prev => prev.map(h => {
      if (!h.activeEventIds.includes(event.id)) return h;
      const newEventIds = h.activeEventIds.filter(eid => eid !== event.id);
      const newUsing = newEventIds.length;
      const newAvail = Math.max(0, h.dpcOwned - newUsing);
      return { ...h, activeEventIds: newEventIds, eventsUsing: newUsing, dpcAvailable: newAvail, isLocked: newAvail <= 0 };
    }));

    // Bust server cache so other users see updated participant count faster
    invalidate('events:');
    try { await fetch('/api/events?bust=1'); } catch { /* silent */ }

    addToast(`Vom Event "${event.name}" abgemeldet.${event.buyIn > 0 ? ` ${event.buyIn} BSD zurückerstattet.` : ''}`, 'success');
  }, [user, setBalanceCents, addToast]);

  const handleScoreEvent = useCallback(async (event: FantasyEvent) => {
    // Update local event state to reflect scoring
    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, status: 'ended' as EventStatus, scoredAt: new Date().toISOString() } : e
    ));
    // Update the selected event too
    setSelectedEvent(prev => prev && prev.id === event.id ? { ...prev, status: 'ended' as EventStatus, scoredAt: new Date().toISOString() } : prev);
    // Invalidate wallet/holdings caches so TopBar shows updated balance
    invalidate('wallet:');
    invalidate('holdings:');
  }, []);

  const handleResetEvent = useCallback(async (event: FantasyEvent) => {
    // Update local event state to reflect reset
    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, status: 'registering' as EventStatus, scoredAt: undefined } : e
    ));
    setSelectedEvent(prev => prev && prev.id === event.id ? { ...prev, status: 'registering' as EventStatus, scoredAt: undefined } : prev);
    // Invalidate wallet/holdings caches so TopBar shows updated balance (rewards refunded)
    invalidate('wallet:');
    invalidate('holdings:');
  }, []);

  const handleCreateEvent = useCallback((eventData: Partial<FantasyEvent>) => {
    const newEvent: FantasyEvent = {
      id: `e${Date.now()}`,
      name: eventData.name || 'Neues Event',
      description: eventData.description || '',
      type: 'creator',
      mode: eventData.mode || 'tournament',
      status: 'registering',
      format: eventData.format || '6er',
      gameweek: 13,
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
      isJoined: true, // Creator is auto-joined
      isInterested: false,
      creatorId: 'user1',
      creatorName: 'Du',
      requirements: { dpcPerSlot: 1 },
      rewards: [{ rank: '1st', reward: 'League Champion' }],
    };
    setEvents(prev => [newEvent, ...prev]);
    addToast(`Event "${newEvent.name}" wurde erstellt!`, 'success');
  }, [addToast]);

  // Reload handler for error state
  const handleRetry = useCallback(() => {
    setDataLoading(true);
    setDataError(false);
    // Force re-run by toggling a dummy — the useEffect depends on [user]
    // Simplest: just reload the page section
    window.location.reload();
  }, []);

  // Loading state
  if (dataLoading) {
    return (
      <div className="max-w-[1600px] mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-8 h-8 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
        <div className="text-white/50 text-sm">Fantasy-Daten werden geladen...</div>
      </div>
    );
  }

  // Error state
  if (dataError && events.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-12 h-12 rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-white/70 font-bold">Daten konnten nicht geladen werden</div>
        <Button variant="outline" onClick={handleRetry}>
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
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
              <span className="text-white/40 text-xs">Aktiv</span>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Erstellen</span>
          </button>
        </div>
      </div>

      {/* SEGMENT TABS */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-x-auto">
        {([
          { id: 'dashboard' as FantasyTab, label: 'Dashboard', icon: Home },
          { id: 'lobby' as FantasyTab, label: 'Events', icon: Globe, count: activeEvents.length },
          { id: 'history' as FantasyTab, label: 'Verlauf', icon: History },
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

      {/* ========== DASHBOARD TAB ========== */}
      {mainTab === 'dashboard' && (
        <DashboardTab
          seasonPoints={dashboardStats.seasonPoints}
          bestRank={dashboardStats.bestRank}
          eventsPlayed={dashboardStats.eventsPlayed}
          totalRewardBsd={dashboardStats.totalRewardBsd}
          pastParticipations={dashboardStats.pastParticipations}
          scoredLineups={scoredLineups}
          activeEvents={activeEvents}
          registeredEvents={registeredEvents}
          interestedEvents={interestedEvents}
          onViewEvent={setSelectedEvent}
        />
      )}

      {/* ========== LOBBY TAB — Sorare-style ========== */}
      {mainTab === 'lobby' && (
        <div className="space-y-6">
          {/* Gameweek Selector */}
          <GameweekSelector
            gameweeks={GAMEWEEKS}
            selected={selectedGameweek}
            onSelect={setSelectedGameweek}
          />

          {/* DEINE AUFSTELLUNGEN — Joined events as horizontal scroll */}
          {joinedNonEndedEvents.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40">Deine Aufstellungen</h2>
                <span className="px-2 py-0.5 bg-[#22C55E]/15 text-[#22C55E] text-[10px] font-bold rounded-full">
                  {joinedNonEndedEvents.length}
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                {joinedNonEndedEvents.map(event => {
                  const sStyle = getStatusStyle(event.status);
                  return (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="flex-shrink-0 w-[200px] p-3 bg-white/[0.03] border border-[#22C55E]/20 rounded-xl text-left hover:bg-white/[0.06] transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${sStyle.bg} ${sStyle.text}`}>
                          {sStyle.pulse && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                          <span className="text-[9px] font-bold">{sStyle.label}</span>
                        </div>
                        <span className="text-[10px] text-white/30">{event.format}</span>
                      </div>
                      <div className="font-semibold text-sm truncate mb-1">{event.name}</div>
                      <div className="flex items-center justify-between text-[10px] text-white/40">
                        <span>{event.participants} Spieler</span>
                        <span className="font-mono text-[#FFD700]">{event.prizePool > 0 ? `${event.prizePool} BSD` : 'Gratis'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* IM FOKUS — Featured/live events */}
          {featuredOrLiveEvents.length > 0 && (
            <section>
              <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40 mb-3">Im Fokus</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {featuredOrLiveEvents.slice(0, 4).map(event => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onView={() => setSelectedEvent(event)}
                    onToggleInterest={() => handleToggleInterest(event.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* CATEGORY FILTER PILLS — replaces sidebar */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 lg:mx-0 lg:px-0">
            {CATEGORIES_WITH_COUNTS.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border whitespace-nowrap text-sm transition-all ${
                  categoryFilter === cat.id
                    ? 'bg-[#FFD700]/15 border-[#FFD700]/30 text-[#FFD700]'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/50 hover:border-white/15'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
                <span className="text-[10px] text-white/30">{cat.count}</span>
              </button>
            ))}
          </div>

          {/* SEARCH + FILTERS */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text"
                placeholder="Event suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-[#FFD700]/40"
              />
            </div>
            <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-xl p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'text-white/50 hover:text-white'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'text-white/50 hover:text-white'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
              className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm"
            >
              <option value="all">Alle ({statusCounts.all})</option>
              <option value="late-reg">Late Reg ({statusCounts['late-reg']})</option>
              <option value="registering">Anmelden ({statusCounts.registering})</option>
              <option value="running">Läuft ({statusCounts.running})</option>
              <option value="upcoming">Bald ({statusCounts.upcoming})</option>
              <option value="ended">Beendet ({statusCounts.ended})</option>
            </select>
          </div>

          {/* ALLE EVENTS */}
          <section>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40 mb-3">
              Alle Events <span className="text-white/20">({filteredEvents.length})</span>
            </h2>
            {viewMode === 'cards' ? (
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
            ) : (
              <Card className="overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-white/40">
                      <th className="py-3 px-4 text-left">Status</th>
                      <th className="py-3 px-3 text-left">Typ</th>
                      <th className="py-3 px-3 text-right">Buy-in</th>
                      <th className="py-3 px-3 text-left">Event</th>
                      <th className="py-3 px-3 text-right">Prize</th>
                      <th className="py-3 px-3 text-center">Spieler</th>
                      <th className="py-3 px-2"></th>
                      <th className="py-3 px-3 text-center">Aktion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map(event => (
                      <EventTableRow
                        key={event.id}
                        event={event}
                        onView={() => setSelectedEvent(event)}
                        onToggleInterest={() => handleToggleInterest(event.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </Card>
            )}

            {filteredEvents.length === 0 && (
              <Card className="p-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 text-white/20" />
                <div className="text-white/50">Keine Events gefunden</div>
              </Card>
            )}
          </section>
        </div>
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
        />
      )}

      {/* EVENT DETAIL MODAL */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onJoin={handleJoinEvent}
        onLeave={handleLeaveEvent}
        onScore={handleScoreEvent}
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
