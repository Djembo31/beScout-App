'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Trophy, Search, Grid3X3, List, Globe, History, Plus, AlertCircle, RefreshCw, Loader2, Calendar,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { centsToBsd } from '@/lib/services/players';
import { getHoldings, deductEntryFee, refundEntryFee } from '@/lib/services/wallet';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { getEvents, getUserJoinedEventIds } from '@/lib/services/events';
import { getActiveGameweek } from '@/lib/services/club';
import { submitLineup, getLineup, getPlayerEventUsage } from '@/lib/services/lineups';
import { invalidate, withTimeout } from '@/lib/cache';
import { val } from '@/lib/settledHelpers';
import { fmtBSD } from '@/lib/utils';
import type { DbEvent } from '@/types';
import {
  type EventStatus, type FantasyTab, type ViewMode, type FantasyEvent,
  type LineupPlayer, type UserDpcHolding, type LeagueCategory, type LineupFormat,
  GameweekSelector, EventCard, EventTableRow,
  HistoryTab, CreateEventModal, SpieltagTab,
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
  // Auth + Wallet + Club
  const { user, profile } = useUser();
  const { balanceCents, setBalanceCents } = useWallet();
  const { addToast } = useToast();
  const { activeClub } = useClub();
  const clubId = activeClub?.id ?? '';

  // State
  const [mainTab, setMainTab] = useState<FantasyTab>('spieltag');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [activeGameweek, setActiveGameweek] = useState(1);
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [selectedEvent, setSelectedEvent] = useState<FantasyEvent | null>(null);
  const [events, setEvents] = useState<FantasyEvent[]>([]);
  const [holdings, setHoldings] = useState<UserDpcHolding[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load real data from DB
  useEffect(() => {
    if (!user || !clubId) return;
    const uid = user.id;
    async function load() {
      try {
      const fantasyResults = await withTimeout(Promise.allSettled([
        getEvents(),
        getHoldings(uid),
        getUserJoinedEventIds(uid),
        getPlayerEventUsage(uid),
        getActiveGameweek(clubId),
      ]), 10000);
      const dbEvents = val(fantasyResults[0], []);
      const dbHoldings = val(fantasyResults[1], []);
      const joinedIds = val(fantasyResults[2], [] as string[]);
      const usageMap = val(fantasyResults[3], new Map<string, string[]>());
      const activeGw = val(fantasyResults[4], 1);

      // Events are critical
      if (fantasyResults[0].status === 'rejected') {
        setDataError(true);
        addToast('Fehler beim Laden der Fantasy-Daten', 'error');
        setDataLoading(false);
        return;
      }

      setActiveGameweek(activeGw);
      setSelectedGameweek(activeGw);

      const joinedSet = new Set(joinedIds);

      // Load user lineups for scored events to get rank + points
      const scoredJoinedEvents = dbEvents.filter(e => e.scored_at && joinedSet.has(e.id));
      const lineupPromises = scoredJoinedEvents.map(e => getLineup(e.id, uid));
      const lineups = await Promise.all(lineupPromises);
      const lineupMap = new Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>();
      scoredJoinedEvents.forEach((e, i) => {
        if (lineups[i]) lineupMap.set(e.id, { total_score: lineups[i]!.total_score, rank: lineups[i]!.rank, reward_amount: lineups[i]!.reward_amount });
      });

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

      // Check admin status
      try {
        const { isClubAdmin } = await import('@/lib/services/club');
        const admin = await isClubAdmin(uid, clubId);
        setIsAdmin(admin);
      } catch (err) { console.error('[Fantasy] Admin check failed:', err); }

      setDataError(false);
      } catch {
        setDataError(true);
        addToast('Fehler beim Laden der Fantasy-Daten', 'error');
      }
      setDataLoading(false);
    }
    load();
  }, [user, clubId, addToast]);

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
    return events.filter(e => e.gameweek === selectedGameweek);
  }, [events, selectedGameweek]);

  // Events filtered by selected gameweek for SpieltagTab
  const spieltagEvents = useMemo(() => {
    return events.filter(e => e.gameweek === selectedGameweek);
  }, [events, selectedGameweek]);

  // Category counts (for Events tab)
  const categoryCounts = useMemo(() => ({
    all: gwFilteredEvents.length,
    joined: gwFilteredEvents.filter(e => e.isJoined).length,
    favorites: gwFilteredEvents.filter(e => e.isInterested).length,
    bescout: gwFilteredEvents.filter(e => e.type === 'bescout').length,
    club: gwFilteredEvents.filter(e => e.type === 'club').length,
    sponsor: gwFilteredEvents.filter(e => e.type === 'sponsor').length,
    creator: gwFilteredEvents.filter(e => e.type === 'creator').length,
  }), [gwFilteredEvents]);

  const CATEGORIES_WITH_COUNTS: LeagueCategory[] = [
    { id: 'all', name: 'Alle', icon: '🌐', count: categoryCounts.all, group: 'type' },
    { id: 'joined', name: 'Meine', icon: '✅', count: categoryCounts.joined, group: 'user' },
    { id: 'bescout', name: 'Offiziell', icon: '✨', count: categoryCounts.bescout + categoryCounts.club + categoryCounts.sponsor, group: 'type' },
    { id: 'creator', name: 'Community', icon: '👥', count: categoryCounts.creator, group: 'type' },
  ];

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

    if (categoryFilter === 'joined') {
      filtered = filtered.filter(e => e.isJoined);
    } else if (categoryFilter === 'bescout') {
      filtered = filtered.filter(e => e.type === 'bescout' || e.type === 'club' || e.type === 'sponsor');
    } else if (categoryFilter !== 'all') {
      filtered = filtered.filter(e => e.type === categoryFilter);
    }

    const statusOrder = { 'late-reg': 0, 'running': 1, 'registering': 2, 'upcoming': 3, 'ended': 4 };
    filtered.sort((a, b) => (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5));

    return filtered;
  }, [gwFilteredEvents, searchQuery, statusFilter, categoryFilter]);

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
    setEvents(prev => prev.map(e =>
      e.id === eventId ? { ...e, isInterested: !e.isInterested } : e
    ));
  }, []);

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
      addToast(`Nicht genug BSD! Du brauchst ${event.buyIn} BSD, hast aber nur ${fmtBSD(bal / 100)}.`, 'error');
      return;
    }

    const wasJoined = event.isJoined;
    setEvents(prev => prev.map(e =>
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
      setEvents(prev => prev.map(ev =>
        ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: wasJoined ? ev.participants : Math.max(0, (ev.participants || 1) - 1) } : ev
      ));
      addToast(`Fehler: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`, 'error');
      return;
    }

    const lineupPlayerIds = new Set(lineup.map(p => p.playerId));
    setHoldings(prev => prev.map(h => {
      if (!lineupPlayerIds.has(h.id)) return h;
      const newEventIds = h.activeEventIds.includes(event.id) ? h.activeEventIds : [...h.activeEventIds, event.id];
      const newUsing = newEventIds.length;
      const newAvail = Math.max(0, h.dpcOwned - newUsing);
      return { ...h, activeEventIds: newEventIds, eventsUsing: newUsing, dpcAvailable: newAvail, isLocked: newAvail <= 0 };
    }));

    invalidate('events:');
    try { await fetch('/api/events?bust=1'); } catch (err) { console.error('[Fantasy] Event cache bust failed:', err); }

    // Mission tracking — only after full join succeeds (lineup + fee)
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(user.id, ['weekly_fantasy']);
    }).catch(err => console.error('[Fantasy] Mission tracking failed:', err));

    addToast(`Erfolgreich angemeldet für "${event.name}"!`, 'success');
  }, [user, balanceCents, setBalanceCents, addToast]);

  const handleLeaveEvent = useCallback(async (event: FantasyEvent) => {
    if (!user) return;

    const wasJoined = event.isJoined;
    const prevParticipants = event.participants;
    setEvents(prev => prev.map(e =>
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
      setEvents(prev => prev.map(ev =>
        ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: prevParticipants } : ev
      ));
      addToast(`Abmeldung fehlgeschlagen: ${e instanceof Error ? e.message : 'Unbekannter Fehler'}`, 'error');
      return;
    }

    setHoldings(prev => prev.map(h => {
      if (!h.activeEventIds.includes(event.id)) return h;
      const newEventIds = h.activeEventIds.filter(eid => eid !== event.id);
      const newUsing = newEventIds.length;
      const newAvail = Math.max(0, h.dpcOwned - newUsing);
      return { ...h, activeEventIds: newEventIds, eventsUsing: newUsing, dpcAvailable: newAvail, isLocked: newAvail <= 0 };
    }));

    invalidate('events:');
    try { await fetch('/api/events?bust=1'); } catch (err) { console.error('[Fantasy] Event cache bust failed:', err); }

    addToast(`Vom Event "${event.name}" abgemeldet.${event.buyIn > 0 ? ` ${event.buyIn} BSD zurückerstattet.` : ''}`, 'success');
  }, [user, setBalanceCents, addToast]);

  // Refetch all events from DB (used after score, reset, simulation)
  const reloadEvents = useCallback(async () => {
    if (!user) return;
    const uid = user.id;
    try {
      invalidate('events:');
      invalidate('wallet:');
      invalidate('holdings:');
      const [dbEvents, joinedIds] = await Promise.all([
        getEvents(),
        getUserJoinedEventIds(uid),
      ]);
      const joinedSet = new Set(joinedIds);
      const scoredJoinedEvents = dbEvents.filter(e => e.scored_at && joinedSet.has(e.id));
      const lineupPromises = scoredJoinedEvents.map(e => getLineup(e.id, uid));
      const lineups = await Promise.all(lineupPromises);
      const lineupMap = new Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>();
      scoredJoinedEvents.forEach((e, i) => {
        if (lineups[i]) lineupMap.set(e.id, { total_score: lineups[i]!.total_score, rank: lineups[i]!.rank, reward_amount: lineups[i]!.reward_amount });
      });
      const freshEvents = dbEvents.map(e => dbEventToFantasyEvent(e, joinedSet, lineupMap.get(e.id)));
      setEvents(freshEvents);
      // Update selected event if still open
      setSelectedEvent(prev => {
        if (!prev) return prev;
        const updated = freshEvents.find(e => e.id === prev.id);
        return updated ?? prev;
      });
    } catch (err) { console.error('[Fantasy] Events reload failed:', err); }
  }, [user]);

  const handleResetEvent = useCallback(async (event: FantasyEvent) => {
    // Optimistic local update, then full refetch
    setEvents(prev => prev.map(e =>
      e.id === event.id ? { ...e, status: 'registering' as EventStatus, scoredAt: undefined } : e
    ));
    setSelectedEvent(prev => prev && prev.id === event.id ? { ...prev, status: 'registering' as EventStatus, scoredAt: undefined } : prev);
    await reloadEvents();
  }, [reloadEvents]);

  const handleCreateEvent = useCallback((eventData: Partial<FantasyEvent>) => {
    const newEvent: FantasyEvent = {
      id: `e${Date.now()}`,
      name: eventData.name || 'Neues Event',
      description: eventData.description || '',
      type: 'creator',
      mode: eventData.mode || 'tournament',
      status: 'registering',
      format: eventData.format || '6er',
      gameweek: selectedGameweek,
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
      requirements: { dpcPerSlot: 1 },
      rewards: [{ rank: '1st', reward: 'League Champion' }],
    };
    setEvents(prev => [newEvent, ...prev]);
    addToast(`Event "${newEvent.name}" wurde erstellt!`, 'success');
  }, [addToast, selectedGameweek]);

  // Reload handler for error state
  const handleRetry = useCallback(() => {
    setDataLoading(true);
    setDataError(false);
    window.location.reload();
  }, []);

  // After gameweek simulation: reload data + auto-navigate to new GW
  const handleSimulated = useCallback(() => {
    addToast('Spieltag abgeschlossen! Nächster Spieltag wird geladen...', 'success');
    (async () => {
      await reloadEvents();
      // Re-fetch active GW (may have advanced) and auto-navigate
      try {
        const newGw = await getActiveGameweek(clubId);
        setActiveGameweek(newGw);
        setSelectedGameweek(newGw);
      } catch (err) { console.error('[Fantasy] Active gameweek fetch failed:', err); }
    })();
  }, [addToast, reloadEvents]);

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
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-xl text-sm font-semibold text-[#FFD700] hover:bg-[#FFD700]/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Erstellen</span>
            </button>
          )}
        </div>
      </div>

      {/* SEGMENT TABS — 3 Tabs */}
      <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-x-auto">
        {([
          { id: 'spieltag' as FantasyTab, label: `Spieltag ${activeGameweek}`, icon: Calendar },
          { id: 'events' as FantasyTab, label: 'Events', icon: Globe, count: activeEvents.length },
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

      {/* ========== SPIELTAG TAB (Hero) ========== */}
      {mainTab === 'spieltag' && user && (
        <SpieltagTab
          gameweek={selectedGameweek}
          activeGameweek={activeGameweek}
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
            activeGameweek={activeGameweek}
            selectedGameweek={selectedGameweek}
            onSelect={setSelectedGameweek}
          />

          {/* CATEGORY FILTER PILLS */}
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
            <div className="flex items-center gap-1">
              {([
                { id: 'all' as const, label: 'Alle', count: statusCounts.all },
                { id: 'registering' as const, label: 'Offen', count: statusCounts.registering + statusCounts['late-reg'] },
                { id: 'ended' as const, label: 'Beendet', count: statusCounts.ended },
              ]).map(s => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    statusFilter === s.id
                      ? 'bg-[#FFD700]/15 text-[#FFD700] border border-[#FFD700]/30'
                      : 'bg-white/5 text-white/50 border border-white/10 hover:text-white'
                  }`}
                >
                  {s.label} <span className="text-white/30">{s.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ALLE EVENTS */}
          <section>
            <h2 className="text-[11px] font-black uppercase tracking-wider text-white/40 mb-3">
              Events — Spieltag {selectedGameweek} <span className="text-white/20">({filteredEvents.length})</span>
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
                <div className="text-white/50">Keine Events für Spieltag {selectedGameweek}</div>
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
