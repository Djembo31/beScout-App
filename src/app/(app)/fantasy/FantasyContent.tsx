'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import {
  Trophy, Plus, AlertCircle, RefreshCw, Loader2, Calendar, Users, BarChart3, Globe,
} from 'lucide-react';
import { Button, Skeleton, SkeletonCard, ErrorBoundary } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useWallet } from '@/components/providers/WalletProvider';
import { centsToBsd } from '@/lib/services/players';
import { lockEventEntry, unlockEventEntry } from '@/lib/services/events';
import { useUserTickets } from '@/lib/queries/tickets';
import type { HoldingWithPlayer } from '@/lib/services/wallet';
import { submitLineup, getLineup } from '@/lib/services/lineups';
import { getFixtureDeadlinesByGameweek, getGameweekStatuses } from '@/lib/services/fixtures';
import type { FixtureDeadline } from '@/lib/services/fixtures';
import { invalidateFantasyQueries } from '@/lib/queries/invalidation';
import { queryClient } from '@/lib/queryClient';
import { qk } from '@/lib/queries/keys';
import { mapErrorToKey, normalizeError } from '@/lib/errorMessages';
import { useEvents, useJoinedEventIds, usePlayerEventUsage, useHoldingLocks, useLeagueActiveGameweek, useIsClubAdmin } from '@/lib/queries/events';
import { useHoldings } from '@/lib/queries/holdings';
import { fmtScout, cn } from '@/lib/utils';
import type { DbEvent } from '@/types';
import {
  type EventStatus, type FantasyTab, type FantasyEvent,
  type LineupPlayer, type UserDpcHolding, type LineupFormat,
  CreateEventModal, SpieltagTab,
} from '@/components/fantasy';
import { getFormationsForFormat, buildSlotDbKeys } from '@/components/fantasy/constants';
import { SpieltagSelector } from '@/components/fantasy/SpieltagSelector';
import { MitmachenTab } from '@/components/fantasy/MitmachenTab';
import { ErgebnisseTab } from '@/components/fantasy/ErgebnisseTab';
import { EventsTab } from '@/components/fantasy/EventsTab';
import { ScoringRules } from '@/components/fantasy/ScoringRules';

import { useClub } from '@/components/providers/ClubProvider';
import EventSummaryModal, { isEventSeen, markEventSeen } from '@/components/fantasy/EventSummaryModal';
import NewUserTip from '@/components/onboarding/NewUserTip';

// Lazy-load MissionHintList — only shown when relevant missions exist
const MissionHintList = dynamic(
  () => import('@/components/missions/MissionHintList'),
  { ssr: false }
);

// Lazy-load EventDetailModal (1387 lines) — only loaded when user opens an event
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
    format: (db.format || '7er') as LineupFormat,
    gameweek: db.gameweek ?? 1,
    startTime: new Date(db.starts_at).getTime(),
    endTime: db.ends_at ? new Date(db.ends_at).getTime() : new Date(db.starts_at).getTime() + 259200000,
    lockTime: new Date(db.locks_at).getTime(),
    buyIn: db.currency === 'scout' ? centsToBsd(db.ticket_cost ?? db.entry_fee) : (db.ticket_cost ?? 0),
    entryFeeCents: db.ticket_cost ?? db.entry_fee,
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
    salaryCap: db.salary_cap ? centsToBsd(db.salary_cap) : null,
    minScPerSlot: db.min_sc_per_slot ?? 1,
    wildcardsAllowed: db.wildcards_allowed ?? false,
    maxWildcardsPerLineup: db.max_wildcards_per_lineup ?? 0,
    requirements: { dpcPerSlot: db.min_sc_per_slot ?? 1 },
    rewards: [
      { rank: '1st', reward: 'Champion Badge' },
      { rank: 'Top 10', reward: 'Gold Frame' },
    ],
    rewardStructure: db.reward_structure ?? null,
    scope: db.scope ?? 'global',
    lineupSize: db.lineup_size ?? (db.format === '11er' || db.format === '11er-reserve' ? 11 : 7),
    ticketCost: db.ticket_cost ?? 0,
    currency: db.currency ?? 'tickets',
    clubId: db.club_id ?? undefined,
    clubName: (db as Record<string, unknown>).clubs ? ((db as Record<string, unknown>).clubs as { name: string; logo_url: string | null }).name : undefined,
    clubLogo: (db as Record<string, unknown>).clubs ? ((db as Record<string, unknown>).clubs as { name: string; logo_url: string | null }).logo_url ?? undefined : undefined,
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
    clubId: h.player?.club_id ?? null,
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
    ticket: h.player?.shirt_number ?? 0,
    floorPrice: h.player?.floor_price ?? 0,
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
  const { data: dbEvents = [], isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } = useEvents();
  const { data: joinedIdsArr = [] } = useJoinedEventIds(userId);
  const { data: usageMap } = usePlayerEventUsage(userId);
  const { data: lockedScMap } = useHoldingLocks(userId);
  const { data: activeGw, isLoading: activeGwLoading } = useLeagueActiveGameweek();
  const { data: isAdmin = false } = useIsClubAdmin(userId, clubId || undefined);
  const { data: dbHoldings = [] } = useHoldings(userId);
  // Keep ticket balance cache warm (displayed in EventDetailModal overview)
  useUserTickets(userId);

  const t = useTranslations('fantasy');
  const tc = useTranslations('common');
  const tt = useTranslations('tips');
  const te = useTranslations('errors');

  // State — 4 tabs
  const [mainTab, setMainTab] = useState<FantasyTab>('paarungen');
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<FantasyEvent | null>(null);
  const [localEvents, setLocalEvents] = useState<FantasyEvent[] | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lineupMap, setLineupMap] = useState<Map<string, { total_score: number | null; rank: number | null; reward_amount: number }>>(new Map());
  const [summaryEvent, setSummaryEvent] = useState<FantasyEvent | null>(null);
  const [summaryLeaderboard, setSummaryLeaderboard] = useState<import('@/lib/services/scoring').LeaderboardEntry[]>([]);

  // Sync selectedGameweek with league activeGw on first load
  useEffect(() => {
    if (activeGw && activeGw > 0 && selectedGameweek === null) {
      setSelectedGameweek(activeGw);
    }
  }, [activeGw, selectedGameweek]);

  // Safari bfcache: page is restored from memory with stale JS state
  // → reset selectedGameweek and refetch activeGw to get fresh data
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setSelectedGameweek(null);
        queryClient.invalidateQueries({ queryKey: qk.events.leagueGw });
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const currentGw = selectedGameweek ?? activeGw ?? 1;

  // Per-fixture deadline locking — refresh when GW changes or events are running
  const [fixtureDeadlines, setFixtureDeadlines] = useState<Map<string, FixtureDeadline>>(new Map());

  useEffect(() => {
    if (!currentGw) return;
    getFixtureDeadlinesByGameweek(currentGw).then(setFixtureDeadlines);
    // Poll every 60s when events are running to update lock status
    const hasRunning = dbEvents.some(e => e.status === 'running');
    if (hasRunning) {
      const interval = setInterval(() => {
        getFixtureDeadlinesByGameweek(currentGw).then(setFixtureDeadlines);
      }, 60_000);
      return () => clearInterval(interval);
    }
  }, [currentGw, dbEvents]);

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

  // Check for unseen scored events → show summary modal
  useEffect(() => {
    if (lineupMap.size === 0 || !userId) return;
    const scoredJoined = dbEvents.filter(e => e.scored_at && joinedSet.has(e.id));
    const unseen = scoredJoined.find(e => !isEventSeen(e.id));
    if (!unseen) return;
    const lineup = lineupMap.get(unseen.id);
    const ev = dbEventToFantasyEvent(unseen, joinedSet, lineup);
    setSummaryEvent(ev);
    import('@/lib/services/scoring').then(({ getEventLeaderboard }) => {
      getEventLeaderboard(unseen.id).then(setSummaryLeaderboard).catch(err => console.error('[Fantasy] Leaderboard load failed:', err));
    });
  }, [lineupMap, dbEvents, joinedSet, userId]);

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
      // Use actual locked SC quantity from holding_locks (not just event count)
      const totalLocked = lockedScMap?.get(holding.id) ?? 0;
      holding.dpcAvailable = Math.max(0, holding.dpcOwned - totalLocked);
      holding.isLocked = holding.dpcAvailable <= 0;
      return holding;
    });
  }, [dbHoldings, usageMap, lockedScMap]);

  // Derived data
  const activeEvents = useMemo(() => events.filter(e => e.isJoined && e.status === 'running'), [events]);

  // Events filtered by selected gameweek
  const gwEvents = useMemo(() => {
    return events.filter(e => e.gameweek === currentGw);
  }, [events, currentGw]);

  // GW fixture completion — lightweight check (independent of events)
  const [gwFixtureInfo, setGwFixtureInfo] = useState<{ complete: boolean; count: number }>({ complete: false, count: 0 });
  useEffect(() => {
    let cancelled = false;
    getGameweekStatuses(currentGw, currentGw).then(statuses => {
      if (!cancelled) {
        const s = statuses.find(st => st.gameweek === currentGw);
        setGwFixtureInfo({ complete: s?.is_complete ?? false, count: s?.total ?? 0 });
      }
    }).catch(err => console.error('[Fantasy] Gameweek status fetch:', err));
    return () => { cancelled = true; };
  }, [currentGw]);

  // GW status for selector — considers BOTH fixtures AND events
  const gwStatus = useMemo((): 'open' | 'simulated' | 'empty' => {
    // All fixtures finished → GW is done (regardless of events)
    if (gwFixtureInfo.complete) return 'simulated';
    // Events exist and all ended → done
    if (gwEvents.length > 0) {
      const allEnded = gwEvents.every(e => e.status === 'ended' || e.scoredAt);
      if (allEnded) return 'simulated';
    }
    // No fixtures and no events → empty
    if (gwEvents.length === 0) return 'empty';
    return 'open';
  }, [gwEvents, gwFixtureInfo.complete]);

  // Dashboard stats from real data (for ErgebnisseTab → HistoryTab)
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

  // Handlers
  const handleToggleInterest = useCallback((eventId: string) => {
    setLocalEvents(prev => (prev ?? events).map(e =>
      e.id === eventId ? { ...e, isInterested: !e.isInterested } : e
    ));
  }, [events]);

  // ── Join Event (entry/payment only — no lineup required) ──
  const handleJoinEvent = useCallback(async (event: FantasyEvent) => {
    if (!user) return;

    if (event.status === 'ended') {
      addToast(t('eventEndedError'), 'error');
      return;
    }

    if (event.maxParticipants && event.participants >= event.maxParticipants) {
      addToast(t('eventFullError'), 'error');
      return;
    }

    const wasJoined = event.isJoined;
    setLocalEvents(prev => (prev ?? events).map(e =>
      e.id === event.id ? { ...e, isJoined: true, isInterested: false, participants: wasJoined ? e.participants : (e.participants || 0) + 1 } : e
    ));

    try {
      const result = await lockEventEntry(event.id);

      if (!result.ok) {
        // Revert optimistic update
        setLocalEvents(prev => (prev ?? events).map(ev =>
          ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: wasJoined ? ev.participants : Math.max(0, (ev.participants || 1) - 1) } : ev
        ));

        // Show specific error messages
        switch (result.error) {
          case 'insufficient_tickets':
            addToast(t('notEnoughTickets', { have: result.have ?? 0, need: result.need ?? event.ticketCost }), 'error');
            break;
          case 'insufficient_balance':
            addToast(t('notEnoughScout', { needed: event.buyIn, balance: fmtScout((result.have ?? 0) / 100) }), 'error');
            break;
          case 'event_full':
            addToast(t('eventFullError'), 'error');
            break;
          case 'event_not_open':
            addToast(t('eventEndedError'), 'error');
            break;
          case 'scout_events_disabled':
            addToast(t('scoutEventsDisabled'), 'error');
            break;
          case 'subscription_required':
            addToast(t('subscriptionRequired', { tier: result.need ?? '' }), 'error');
            break;
          default:
            addToast(t('errorGeneric', { error: result.error ?? 'Unknown error' }), 'error');
        }

        if (result.alreadyEntered) {
          // Already entered — just refresh state
          setLocalEvents(null);
        }
        return;
      }

      // Update wallet balance if returned
      if (result.balanceAfter != null) {
        setBalanceCents(result.balanceAfter);
      }
    } catch (e: unknown) {
      setLocalEvents(prev => (prev ?? events).map(ev =>
        ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: wasJoined ? ev.participants : Math.max(0, (ev.participants || 1) - 1) } : ev
      ));
      addToast(t('errorGeneric', { error: te(mapErrorToKey(normalizeError(e))) }), 'error');
      return;
    }

    // Invalidate all relevant caches — awaits critical queries before clearing optimistic state
    queryClient.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
    await invalidateFantasyQueries(user.id, clubId);
    try { await fetch('/api/events?bust=1'); } catch (err) { console.error('[Fantasy] Event cache bust failed:', err); }
    setLocalEvents(null);

    // Mission tracking
    import('@/lib/services/missions').then(({ triggerMissionProgress }) => {
      triggerMissionProgress(user.id, ['weekly_fantasy']);
    }).catch(err => console.error('[Fantasy] Mission tracking failed:', err));

    addToast(t('joinedSuccess', { name: event.name }), 'success');
  }, [user, addToast, events, setBalanceCents, clubId]);

  // ── Submit Lineup (no payment — user must already be entered) ──
  const handleSubmitLineup = useCallback(async (event: FantasyEvent, lineup: LineupPlayer[], formation: string, captainSlot: string | null = null, wildcardSlots: string[] = []) => {
    if (!user?.id) {
      addToast(t('errorGeneric', { error: 'Not authenticated' }), 'error');
      return;
    }

    // Build dynamic slot mapping based on event format + formation
    const formations = getFormationsForFormat(event.format);
    const currentFormation = formations.find(f => f.id === formation) || formations[0];
    const dbKeys = buildSlotDbKeys(currentFormation);
    const slotMap = new Map(lineup.map(p => [p.slot, p.playerId]));
    const slots: Record<string, string | null> = {};
    dbKeys.forEach((key, idx) => { slots[key] = slotMap.get(idx) || null; });

    try {
      await submitLineup({
        eventId: event.id,
        userId: user.id,
        formation,
        slots,
        captainSlot,
        wildcardSlots,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'insufficient_sc') {
        addToast(t('insufficientSc', { min: event.minScPerSlot ?? 1 }), 'error');
      } else if (msg === 'insufficient_wildcards') {
        addToast(t('insufficientWildcards'), 'error');
      } else if (msg === 'wildcards_not_allowed') {
        addToast(t('wildcardsNotAllowed'), 'error');
      } else if (msg === 'too_many_wildcards') {
        addToast(t('tooManyWildcards', { max: event.maxWildcardsPerLineup ?? 0 }), 'error');
      } else if (msg === 'holding_lock_failed') {
        addToast(t('holdingLockFailed'), 'error');
      } else if (msg === 'lineup_save_failed') {
        addToast(t('errorGeneric', { error: 'Lineup konnte nicht gespeichert werden. Bitte erneut versuchen.' }), 'error');
      } else {
        addToast(t('errorGeneric', { error: te(mapErrorToKey(normalizeError(e))) }), 'error');
      }
      return;
    }

    // Invalidate usage + wildcard balance — await so locks are visible immediately
    queryClient.invalidateQueries({ queryKey: qk.events.wildcardBalance(user.id) });
    await invalidateFantasyQueries(user.id, clubId);
    setSelectedEvent(null);
    addToast(t('lineupSaved'), 'success');
  }, [user, addToast, clubId]);

  // ── Leave Event (atomic refund via unlockEventEntry) ──
  const handleLeaveEvent = useCallback(async (event: FantasyEvent) => {
    if (!user) return;

    const wasJoined = event.isJoined;
    const prevParticipants = event.participants;
    setLocalEvents(prev => (prev ?? events).map(e =>
      e.id === event.id ? { ...e, isJoined: false, participants: Math.max(0, (e.participants || 1) - 1) } : e
    ));
    setSelectedEvent(null);

    try {
      const result = await unlockEventEntry(event.id);

      if (!result.ok) {
        // Revert optimistic update
        setLocalEvents(prev => (prev ?? events).map(ev =>
          ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: prevParticipants } : ev
        ));

        if (result.error === 'event_locked') {
          addToast(t('eventLockedError'), 'error');
        } else {
          addToast(t('unregisterFailed', { error: result.error ?? 'Unknown error' }), 'error');
        }
        return;
      }

      // Update wallet balance if returned
      if (result.balanceAfter != null) {
        setBalanceCents(result.balanceAfter);
      }
    } catch (e: unknown) {
      // Revert optimistic update on failure
      setLocalEvents(prev => (prev ?? events).map(ev =>
        ev.id === event.id ? { ...ev, isJoined: wasJoined, participants: prevParticipants } : ev
      ));
      addToast(t('unregisterFailed', { error: te(mapErrorToKey(normalizeError(e))) }), 'error');
      return;
    }

    // Invalidate all relevant caches — awaits critical queries before clearing optimistic state
    queryClient.invalidateQueries({ queryKey: qk.tickets.balance(user.id) });
    await invalidateFantasyQueries(user.id, clubId);
    try { await fetch('/api/events?bust=1'); } catch (err) { console.error('[Fantasy] Event cache bust failed:', err); }
    setLocalEvents(null);

    addToast(`${t('leftEvent')}${event.buyIn > 0 ? ` ${t('refundNote', { amount: event.buyIn })}` : ''}`, 'success');
  }, [user, setBalanceCents, addToast, events]);

  // Refetch all events from DB (used after score, reset, simulation)
  const reloadEvents = useCallback(async () => {
    setLocalEvents(null); // Clear local overrides, let React Query refetch
    invalidateFantasyQueries(userId, clubId);
  }, [userId, clubId]);

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
      name: eventData.name || t('newEventDefault'),
      description: eventData.description || '',
      type: 'creator',
      mode: eventData.mode || 'tournament',
      status: 'registering',
      format: eventData.format || '7er',
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
      rewardStructure: null,
      ticketCost: 0,
      currency: 'tickets',
    };
    setLocalEvents(prev => [newEvent, ...(prev ?? events)]);
    addToast(t('eventCreated', { name: newEvent.name }), 'success');
  }, [addToast, currentGw, events]);

  // Reload handler for error state — use React Query refetch instead of page reload
  const handleRetry = useCallback(() => {
    refetchEvents();
  }, [refetchEvents]);

  // After gameweek simulation: reload data + auto-navigate to new GW
  const handleSimulated = useCallback(() => {
    addToast(t('gameweekDone'), 'success');
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

  const fixtureCount = gwFixtureInfo.count;

  // Loading state — skeleton (wait for league GW to prevent flash of GW1)
  if (eventsLoading || activeGwLoading) {
    return (
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-16 rounded-2xl" />
        <div className="flex items-center gap-1 p-1 bg-surface-subtle border border-white/[0.06] rounded-xl">
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
      <div className="max-w-[1400px] mx-auto flex flex-col items-center justify-center py-32 gap-4">
        <div className="size-12 rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center">
          <AlertCircle className="size-6 text-red-400" />
        </div>
        <div className="text-white/70 font-bold">{t('dataLoadFailed')}</div>
        <Button variant="outline" onClick={handleRetry}>
          <RefreshCw className="size-4" />
          {tc('retry')}
        </Button>
      </div>
    );
  }

  // Tab definitions — 4 tabs
  const tabs: { id: FantasyTab; label: string; icon: typeof Calendar }[] = [
    { id: 'paarungen', label: t('tabFixtures'), icon: Calendar },
    { id: 'events', label: t('events'), icon: Globe },
    { id: 'mitmachen', label: t('tabJoined'), icon: Users },
    { id: 'ergebnisse', label: t('tabResults'), icon: BarChart3 },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 md:space-y-5">
      {/* HEADER — Compact */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 text-balance">
          <Trophy className="size-6 text-gold" />
          Fantasy
        </h1>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-3 mr-2">
            <div className="flex items-center gap-1.5 text-sm">
              <div className="size-2 rounded-full bg-green-500" />
              <span className="font-mono font-bold tabular-nums text-green-500">{activeEvents.length}</span>
              <span className="text-white/40 text-xs">{tc('active')}</span>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gold/10 border border-gold/20 rounded-xl text-sm font-semibold text-gold hover:bg-gold/20 transition-colors"
              aria-label={tc('create')}
            >
              <Plus className="size-4" />
              <span className="hidden sm:inline">{tc('create')}</span>
            </button>
          )}
        </div>
      </div>

      {/* New User Tip */}
      <NewUserTip
        tipKey="fantasy-first-event"
        icon={<Trophy className="size-4" />}
        title={tt('fantasyTitle')}
        description={tt('fantasyDesc')}
        show={joinedIdsArr.length === 0}
      />

      {/* Contextual Mission Hints */}
      <MissionHintList context="fantasy" />

      {/* Scoring Rules — collapsible info section */}
      <ScoringRules />

      {/* STICKY NAV — GW Selector + Tabs stay visible on scroll */}
      <div className="sticky top-[57px] z-20 -mx-4 px-4 py-2 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.04] space-y-2 lg:static lg:mx-0 lg:px-0 lg:py-0 lg:bg-transparent lg:backdrop-blur-none lg:border-0 lg:space-y-4">
        <SpieltagSelector
          gameweek={currentGw}
          activeGameweek={activeGw ?? 1}
          status={gwStatus}
          fixtureCount={fixtureCount}
          eventCount={gwEvents.length}
          onGameweekChange={setSelectedGameweek}
        />

        {/* SEGMENT TABS — 4 Tabs, always fit */}
        <div className="flex items-center gap-1 p-1 bg-surface-subtle border border-white/[0.06] rounded-xl">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setMainTab(tab.id)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[44px]',
                mainTab === tab.id
                  ? 'bg-gold/15 text-gold shadow-sm'
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              <tab.icon className="size-3.5 flex-shrink-0" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ========== PAARUNGEN TAB — Lobby: WAS passiert? ========== */}
      {mainTab === 'paarungen' && user && (
        <SpieltagTab
          gameweek={currentGw}
          activeGameweek={activeGw ?? 1}
          clubId={clubId}
          isAdmin={isAdmin}
          events={gwEvents}
          userId={user.id}
          onSimulated={handleSimulated}
          onTabChange={setMainTab}
        />
      )}

      {/* ========== EVENTS TAB — Alle Events nach Kategorie ========== */}
      {mainTab === 'events' && user && (
        <EventsTab
          events={gwEvents}
          onEventClick={setSelectedEvent}
        />
      )}

      {/* ========== MITMACHEN TAB — WAS mache ICH? ========== */}
      {mainTab === 'mitmachen' && user && (
        <MitmachenTab
          gameweek={currentGw}
          activeGameweek={activeGw ?? 1}
          events={gwEvents}
          userId={user.id}
          onEventClick={setSelectedEvent}
          onTabChange={setMainTab}
        />
      )}

      {/* ========== ERGEBNISSE TAB — WAS ist passiert? ========== */}
      {mainTab === 'ergebnisse' && user && (
        <ErgebnisseTab
          gameweek={currentGw}
          activeGameweek={activeGw ?? 1}
          fixtureCount={fixtureCount}
          events={gwEvents}
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
          onClose={() => setSelectedEvent(null)}
          onJoin={handleJoinEvent}
          onSubmitLineup={handleSubmitLineup}
          onLeave={handleLeaveEvent}
          onReset={handleResetEvent}
          userHoldings={holdings}
          fixtureDeadlines={fixtureDeadlines}
        />
      </ErrorBoundary>

      {/* CREATE EVENT MODAL */}
      <ErrorBoundary>
        <CreateEventModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
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
              setSummaryEvent(null);
              setSummaryLeaderboard([]);
            }}
          />
        </ErrorBoundary>
      )}

    </div>
  );
}
