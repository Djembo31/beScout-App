'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Trophy, Users, Clock, Crown,
  CheckCircle2, Play, Lock,
  Save, Eye,
  RefreshCw, History, Loader2,
} from 'lucide-react';
import { calculateSynergyPreview } from '@/types';
import { Modal, Button, Chip } from '@/components/ui';
import type { Pos } from '@/types';
import { useUser } from '@/components/providers/AuthProvider';
import { getLineup, getEventParticipants, getEventParticipantCount } from '@/lib/services/lineups';
import { resetEvent, getEventLeaderboard, getProgressiveScores } from '@/lib/services/scoring';
import type { LeaderboardEntry } from '@/lib/services/scoring';
import { useTranslations, useLocale } from 'next-intl';
import { cn, fmtScout } from '@/lib/utils';
import type { FantasyEvent, EventDetailTab, LineupPlayer, UserDpcHolding } from './types';
import { getFormationsForFormat, getDefaultFormation, buildSlotDbKeys, PRESET_KEY } from './constants';
import { getStatusStyle, getTypeStyle, formatCountdown } from './helpers';
import dynamic from 'next/dynamic';
import type { FixtureDeadline } from '@/lib/services/fixtures';
import { EventTypeBadge } from '@/components/ui';

// Lazy-loaded ChipSelector (only needed when editing lineup)
const ChipSelector = dynamic(() => import('@/components/gamification/ChipSelector'), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse bg-white/[0.02] rounded-2xl" />,
});

// Lazy-loaded tab panels
const OverviewPanel = dynamic(() => import('./event-tabs/OverviewPanel'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-white/[0.02] rounded-2xl" />,
});
const LineupPanel = dynamic(() => import('./event-tabs/LineupPanel'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-white/[0.02] rounded-2xl" />,
});
const LeaderboardPanel = dynamic(() => import('./event-tabs/LeaderboardPanel'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-white/[0.02] rounded-2xl" />,
});
const EventCommunityTab = dynamic(() => import('./EventCommunityTab'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-white/[0.02] rounded-2xl" />,
});

export const EventDetailModal = ({
  event,
  isOpen,
  onClose,
  onJoin,
  onSubmitLineup,
  onLeave,
  onReset,
  userHoldings,
  fixtureDeadlines,
}: {
  event: FantasyEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onJoin: (event: FantasyEvent) => void | Promise<void>;
  onSubmitLineup: (event: FantasyEvent, lineup: LineupPlayer[], formation: string, captainSlot: string | null, wildcardSlots?: string[]) => void | Promise<void>;
  onLeave: (event: FantasyEvent) => void | Promise<void>;
  onReset: (event: FantasyEvent) => void;
  userHoldings: UserDpcHolding[];
  fixtureDeadlines?: Map<string, FixtureDeadline>;
}) => {
  const { user } = useUser();
  const t = useTranslations('fantasy');
  const locale = useLocale();
  const [tab, setTab] = useState<EventDetailTab>('overview');
  const [selectedPlayers, setSelectedPlayers] = useState<LineupPlayer[]>([]);
  const [selectedFormation, setSelectedFormation] = useState(() => getDefaultFormation(event?.format ?? '7er'));
  const [participants, setParticipants] = useState<{ id: string; handle: string; display_name?: string; avatar_url?: string }[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [slotScores, setSlotScores] = useState<Record<string, number> | null>(null);
  const [myTotalScore, setMyTotalScore] = useState<number | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [scoringJustFinished, setScoringJustFinished] = useState(false);
  const [progressiveScores, setProgressiveScores] = useState<Map<string, number>>(new Map());
  const [captainSlot, setCaptainSlot] = useState<string | null>(null);
  const [showJoinConfirm, setShowJoinConfirm] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [wildcardSlots, setWildcardSlots] = useState<Set<string>>(new Set());

  // Set default tab based on join status when modal opens — reset transient state
  useEffect(() => {
    if (isOpen && event) {
      // If event is scored + user joined → show their lineup with scores. Otherwise leaderboard for non-participants
      setTab(event.scoredAt ? (event.isJoined ? 'lineup' : 'leaderboard') : event.isJoined ? 'lineup' : 'overview');
      setScoringJustFinished(false);
      setShowJoinConfirm(false);
      // Reset formation to match event format (7er vs 11er)
      setSelectedFormation(getDefaultFormation(event.format, event.lineupSize));
      setSelectedPlayers([]);
      setWildcardSlots(new Set());
    }
  }, [isOpen, event?.id]);

  // Load leaderboard when switching to tab or when event is scored
  useEffect(() => {
    if (!isOpen || !event || (tab !== 'leaderboard' && !event.scoredAt)) return;
    let cancelled = false;
    setLeaderboardLoading(true);
    getEventLeaderboard(event.id)
      .then(data => { if (!cancelled) setLeaderboard(data); })
      .catch(err => console.error('[EventDetail] Leaderboard fetch failed:', err))
      .finally(() => { if (!cancelled) setLeaderboardLoading(false); });

    // Poll leaderboard every 30s while event is running
    let interval: ReturnType<typeof setInterval> | undefined;
    if (event.status === 'running') {
      interval = setInterval(() => {
        getEventLeaderboard(event.id)
          .then(data => { if (!cancelled) setLeaderboard(data); })
          .catch(err => console.error('[EventDetail] Leaderboard poll failed:', err));
      }, 30_000);
    }
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [isOpen, event?.id, tab, event?.scoredAt, event?.status]);

  // Poll progressive scores when event is running and user has a lineup
  useEffect(() => {
    if (!isOpen || !event || event.status !== 'running' || !event.isJoined || !event.gameweek) return;
    if (selectedPlayers.length === 0) return;
    let cancelled = false;

    const loadScores = () => {
      const playerIds = selectedPlayers.map(p => p.playerId).filter(Boolean);
      if (playerIds.length === 0) return;
      getProgressiveScores(event.gameweek!, playerIds)
        .then(data => { if (!cancelled) setProgressiveScores(data); })
        .catch(err => console.error('[EventDetail] Progressive scores failed:', err));
    };

    loadScores();
    const interval = setInterval(loadScores, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [isOpen, event?.id, event?.status, event?.gameweek, selectedPlayers.length]);

  // Handle reset event (testing tool)
  const handleResetEvent = async () => {
    if (!event || resetting) return;
    if (!confirm(t('confirmResetMsg'))) return;
    setResetting(true);
    try {
      const result = await resetEvent(event.id);
      if (result.success) {
        // Clear local scoring state
        setSlotScores(null);
        setMyTotalScore(null);
        setMyRank(null);
        setLeaderboard([]);
        setScoringJustFinished(false);
        setTab('overview');
        onReset(event);
        alert(t('resetSuccess'));
      } else {
        alert(t('resetFailed', { error: result.error ?? 'Unknown' }));
      }
    } catch (e: unknown) {
      alert(t('errorShort', { msg: e instanceof Error ? e.message : 'Unknown' }));
    } finally {
      setResetting(false);
    }
  };

  // Load lineup & participants on open (NOT on isJoined change — that resets mid-session state)
  useEffect(() => {
    if (!isOpen || !event) return;

    // Load participants (optimized: only top 10 + count)
    getEventParticipants(event.id, 10).then(setParticipants);
    getEventParticipantCount(event.id).then(count => setParticipantCount(Math.max(count, event.participants || 0)));

    if (event.isJoined && user) {
      getLineup(event.id, user.id).then(dbLineup => {
        if (dbLineup) {
          // Use persisted formation, fallback to default
          const savedFormation = dbLineup.formation || getDefaultFormation(event.format);
          setSelectedFormation(savedFormation);

          // Store scoring data for pitch display
          setSlotScores(dbLineup.slot_scores ?? null);
          setMyTotalScore(dbLineup.total_score);
          setMyRank(dbLineup.rank);
          setCaptainSlot(dbLineup.captain_slot ?? null);

          const fmtFormations = getFormationsForFormat(event.format);
          const formation = fmtFormations.find(f => f.id === savedFormation) || fmtFormations[0];
          const fSlots: { pos: string; slot: number }[] = [];
          let si = 0;
          for (const s of formation.slots) { for (let i = 0; i < s.count; i++) fSlots.push({ pos: s.pos, slot: si++ }); }

          // Map DB slot columns to formation slots using buildSlotDbKeys
          const dbKeys = buildSlotDbKeys(formation);
          const finalLineup: LineupPlayer[] = [];
          fSlots.forEach((slot, i) => {
            const colKey = `slot_${dbKeys[i]}` as keyof typeof dbLineup;
            const playerId = dbLineup[colKey] as string | null;
            if (playerId) {
              finalLineup.push({ playerId, position: slot.pos, slot: slot.slot, isLocked: isPlayerLocked(playerId) });
            }
          });

          setSelectedPlayers(finalLineup);
        } else {
          setSelectedPlayers([]);
          setSelectedFormation(getDefaultFormation(event.format, event.lineupSize));
          setSlotScores(null);
        }
      }).catch(() => {
        setSelectedPlayers([]);
        setSelectedFormation(getDefaultFormation(event.format, event.lineupSize));
        setSlotScores(null);
      });
    } else {
      // Reset if not joined
      setSelectedPlayers([]);
      setSelectedFormation(getDefaultFormation(event.format, event.lineupSize));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isJoined excluded (mid-session reset), user→user?.id (stable string, no auth-refresh re-trigger)
  }, [isOpen, event?.id, user?.id]);

  const handleLeave = async () => {
    if (!user || !event || leaving) return;
    if (confirm(t('confirmLeaveMsg', { name: event.name }))) {
      setLeaving(true);
      try {
        // Parent calls unlockEventEntry RPC (atomic: refund + delete entry/lineup/locks)
        await onLeave(event);
        onClose();
      } catch (e: unknown) {
        alert(t('leaveError', { msg: e instanceof Error ? e.message : 'Unknown' }));
      } finally {
        setLeaving(false);
      }
    }
  };

  // ── Memoized derived state (before early return — React hook rules) ──

  // Free up 1 DPC for players already committed to THIS event (user is editing their own lineup)
  const effectiveHoldings = useMemo(() => {
    if (!event) return userHoldings;
    return userHoldings.map(h => {
      if (h.activeEventIds.includes(event.id)) {
        const newEventsUsing = h.eventsUsing - 1;
        const newAvailable = Math.max(0, h.dpcOwned - newEventsUsing);
        return { ...h, eventsUsing: newEventsUsing, dpcAvailable: newAvailable, isLocked: newAvailable <= 0 };
      }
      return h;
    });
  }, [userHoldings, event?.id]);

  // Formation data — only recalculates when format or selection changes
  const availableFormations = useMemo(
    () => getFormationsForFormat(event?.format ?? '7er', event?.lineupSize),
    [event?.format, event?.lineupSize]
  );

  const currentFormation = useMemo(
    () => availableFormations.find(f => f.id === selectedFormation) || availableFormations[0],
    [availableFormations, selectedFormation]
  );

  const formationSlots = useMemo(() => {
    const slots: { pos: string; slot: number }[] = [];
    let idx = 0;
    for (const s of currentFormation.slots) {
      for (let i = 0; i < s.count; i++) slots.push({ pos: s.pos, slot: idx++ });
    }
    return slots;
  }, [currentFormation]);

  const slotDbKeys = useMemo(() => buildSlotDbKeys(currentFormation), [currentFormation]);

  // Per-fixture lock check: is a specific player's fixture already started?
  const isPlayerLocked = useCallback((playerId: string): boolean => {
    if (!fixtureDeadlines?.size || event?.status !== 'running') return false;
    const holding = effectiveHoldings.find(h => h.id === playerId);
    if (!holding?.clubId) return false;
    return fixtureDeadlines.get(holding.clubId)?.isLocked ?? false;
  }, [fixtureDeadlines, effectiveHoldings, event?.status]);

  // Is the event partially locked (some fixtures started, some not)?
  const isPartiallyLocked = useMemo(() => {
    if (event?.status !== 'running' || !fixtureDeadlines?.size) return false;
    const deadlineValues = Array.from(fixtureDeadlines.values());
    const lockedCount = deadlineValues.filter(d => d.isLocked).length;
    return lockedCount > 0 && lockedCount < deadlineValues.length;
  }, [event?.status, fixtureDeadlines]);

  // Are there still unlocked fixtures where lineup changes are possible?
  const hasUnlockedFixtures = useMemo(() => {
    if (event?.status !== 'running' || !fixtureDeadlines?.size) return false;
    return Array.from(fixtureDeadlines.values()).some(d => !d.isLocked);
  }, [event?.status, fixtureDeadlines]);

  // Next fixture kickoff (for countdown display)
  const nextKickoff = useMemo(() => {
    if (!fixtureDeadlines?.size) return null;
    const now = Date.now();
    let earliest: number | null = null;
    fixtureDeadlines.forEach(d => {
      if (d.playedAt && !d.isLocked) {
        const t = new Date(d.playedAt).getTime();
        if (t > now && (earliest === null || t < earliest)) earliest = t;
      }
    });
    return earliest;
  }, [fixtureDeadlines]);

  // O(1) slot→player lookup (replaces O(n) find() called 44 times per render)
  const selectedPlayerMap = useMemo(() => {
    const map = new Map<number, string>();
    selectedPlayers.forEach(p => map.set(p.slot, p.playerId));
    return map;
  }, [selectedPlayers]);

  const getSelectedPlayer = useCallback((slot: number) => {
    const playerId = selectedPlayerMap.get(slot);
    if (!playerId) return null;
    return effectiveHoldings.find(h => h.id === playerId) ?? null;
  }, [selectedPlayerMap, effectiveHoldings]);

  // Synergy preview — only recalculates when lineup changes
  const synergyPreview = useMemo(() => {
    const clubs = selectedPlayers
      .map(sp => effectiveHoldings.find(h => h.id === sp.playerId)?.club)
      .filter(Boolean) as string[];
    return calculateSynergyPreview(clubs);
  }, [selectedPlayers, effectiveHoldings]);

  // DPC Ownership Bonus — all player IDs the user holds DPCs for
  const ownedPlayerIds = useMemo(() => {
    return new Set(effectiveHoldings.filter(h => h.dpcOwned >= 1).map(h => h.id));
  }, [effectiveHoldings]);

  // Player picker — expensive filter+sort, memoized per search/sort/selection change
  // When picking for a wild card slot, also show locked players (WC bypasses SC check)
  const getAvailablePlayersForPosition = useCallback((position: string, isWildcardSlot = false) => {
    const posMap: Record<string, string[]> = {
      'GK': ['GK'], 'DEF': ['DEF', 'CB', 'LB', 'RB'],
      'MID': ['MID', 'CM', 'CDM', 'CAM', 'LM', 'RM'],
      'ATT': ['ATT', 'FW', 'ST', 'CF', 'LW', 'RW'],
    };
    const validPos = posMap[position] || [position];
    const usedIds = new Set(selectedPlayers.map(p => p.playerId));
    const isClubScoped = event?.scope === 'club' && event?.clubId;
    const players = effectiveHoldings.filter(h =>
      validPos.some(vp => h.pos.toUpperCase().includes(vp)) && !usedIds.has(h.id)
      && (isWildcardSlot || (!h.isLocked && !isPlayerLocked(h.id)))
      && (!isClubScoped || h.clubId === event.clubId)
    );
    return [...players].sort((a, b) => b.perfL5 - a.perfL5);
  }, [selectedPlayers, effectiveHoldings, isPlayerLocked, event?.scope, event?.clubId]);

  // Stable handler refs — prevent child re-renders
  const handleSelectPlayer = useCallback((playerId: string, position: string, slot: number) => {
    setSelectedPlayers(prev => [...prev.filter(p => p.slot !== slot), { playerId, position, slot, isLocked: false }]);
  }, []);

  const handleRemovePlayer = useCallback((slot: number) => {
    setSelectedPlayers(prev => prev.filter(p => p.slot !== slot));
  }, []);

  const handleFormationChange = useCallback((fId: string) => {
    setSelectedFormation(fId);
    setSelectedPlayers([]);
  }, []);

  const handleApplyPreset = useCallback((formation: string, lineup: LineupPlayer[]) => {
    setSelectedFormation(formation);
    setSelectedPlayers(lineup);
  }, []);

  const isLineupComplete = selectedPlayers.length === formationSlots.length;

  // Salary Cap check — perfL5 as proxy "salary" (0-100 per player)
  const totalSalary = useMemo(() =>
    selectedPlayers.reduce((sum, sp) => {
      const player = effectiveHoldings.find(h => h.id === sp.playerId);
      return sum + (player?.perfL5 ?? 50);
    }, 0),
    [selectedPlayers, effectiveHoldings]
  );

  const reqCheck = useMemo(() => {
    if (!event) return { ok: true, message: '' };
    if (event.requirements.minClubPlayers && event.requirements.specificClub) {
      const clubPlayers = selectedPlayers.filter(sp => {
        const player = effectiveHoldings.find(h => h.id === sp.playerId);
        return player?.club.toLowerCase().includes(event.requirements.specificClub!.toLowerCase());
      });
      if (clubPlayers.length < event.requirements.minClubPlayers) {
        return { ok: false, message: t('minClubPlayersReq', { count: event.requirements.minClubPlayers, club: event.clubName ?? '' }) };
      }
    }
    return { ok: true, message: '' };
  }, [selectedPlayers, effectiveHoldings, event]);

  if (!isOpen || !event) return null;

  const statusStyle = getStatusStyle(event.status);
  const typeStyle = getTypeStyle(event.type);
  const TypeIcon = typeStyle.icon;

  const salaryCap = event.salaryCap ?? null;
  const overBudget = salaryCap != null && totalSalary > salaryCap;

  // Join (entry only — no lineup required)
  const handleConfirmJoin = () => {
    setShowJoinConfirm(true);
  };

  const handleFinalJoin = async () => {
    if (joining) return;
    setJoining(true);
    try {
      setShowJoinConfirm(false);
      await onJoin(event);
      setParticipantCount(prev => prev + 1);

      // Auto-save lineup if user built it before joining
      if (selectedPlayers.length === formationSlots.length && reqCheck.ok) {
        try {
          await onSubmitLineup(event, selectedPlayers, selectedFormation, captainSlot, Array.from(wildcardSlots));
          return; // onSubmitLineup closes modal + shows success toast
        } catch (err) {
          console.error('[EventDetail] Auto-save after join failed:', err);
          // Fall through to lineup tab — user can save manually
        }
      }

      setTab('lineup');
    } finally {
      setJoining(false);
    }
  };

  // Save/update lineup (no payment — user is already entered)
  const handleSaveLineup = async () => {
    if (!isLineupComplete) { alert(t('incompleteLineupAlert')); return; }
    if (!reqCheck.ok) { alert(reqCheck.message); return; }
    setJoining(true);
    try {
      await onSubmitLineup(event, selectedPlayers, selectedFormation, captainSlot, Array.from(wildcardSlots));
    } catch (err) {
      console.error('[EventDetail] handleSaveLineup failed:', err);
      alert(t('errorShort', { msg: err instanceof Error ? err.message : 'Lineup save failed' }));
    } finally {
      setJoining(false);
    }
  };

  const isScored = !!event.scoredAt;

  return (
    <Modal open={isOpen} onClose={onClose} title={event.name} size="lg">
        {/* Status Badges + Meta */}
        <div className="flex items-center flex-wrap gap-2 mb-3">
          {isScored ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-500/20 text-purple-300">
              <Trophy aria-hidden="true" className="size-3.5" />
              <span className="text-xs font-bold">{t('statusScored')}</span>
            </div>
          ) : event.isJoined ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-500 text-white">
              <CheckCircle2 aria-hidden="true" className="size-3.5" />
              <span className="text-xs font-bold">{t('statusJoined')}</span>
            </div>
          ) : (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.pulse && <div className="size-1.5 rounded-full bg-white animate-pulse motion-reduce:animate-none" />}
              <span className="text-xs font-bold">{t(statusStyle.labelKey)}</span>
            </div>
          )}
          <EventTypeBadge type={event.type} clubName={event.clubName} clubLogo={event.clubLogo} sponsorName={event.sponsorName} size="sm" />
          <Chip className={`${typeStyle.bg} ${typeStyle.color}`}>{event.mode === 'league' ? t('modeLiga') : t('modeTurnier')} • {event.format}</Chip>
          {event.status === 'running' && !isScored && <Chip className="bg-green-500 text-white">LIVE</Chip>}
          {isScored && (
            <button
              onClick={handleResetEvent}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 ml-auto"
            >
              {resetting ? <RefreshCw aria-hidden="true" className="size-3.5 animate-spin motion-reduce:animate-none" /> : <History aria-hidden="true" className="size-3.5" />}
              {resetting ? t('resettingBtn') : t('resetBtn')}
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-white/50 mb-4">
          <span className="flex items-center gap-1"><Users aria-hidden="true" className="size-4" />{event.participants}{event.maxParticipants ? `/${event.maxParticipants}` : ''}</span>
          <span className="flex items-center gap-1"><Clock aria-hidden="true" className="size-4" />{event.status === 'ended' ? t('ended') : formatCountdown(event.lockTime, t('countdownStarted'))}</span>
          {(event.ticketCost ?? 0) > 0 && (
            <span className="flex items-center gap-1.5 text-[12px] text-amber-400/70 font-medium">
              <span aria-hidden="true">🎟</span>
              <span>{t('ticketCost', { cost: event.ticketCost })}</span>
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex -mx-4 md:-mx-5 border-b border-white/10 mb-4">
          {(['overview', 'lineup', 'leaderboard', 'community'] as EventDetailTab[]).map(tabId => (
            <button
              key={tabId}
              onClick={() => { setTab(tabId); }}
              className={`flex-1 px-4 py-3 min-h-[44px] font-medium text-sm transition-colors relative ${tab === tabId ? 'text-gold' : 'text-white/50 hover:text-white'
                }`}
            >
              {tabId === 'overview' ? t('tabOverview') : tabId === 'lineup' ? t('tabLineup') : tabId === 'leaderboard' ? t('tabRanking') : t('tabCommunity')}
              {tab === tabId && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <OverviewPanel
              event={event}
              userId={user?.id}
              participants={participants}
              participantCount={participantCount}
            />
          )}

          {/* LINEUP TAB */}
          {tab === 'lineup' && (
            <>
              <LineupPanel
                event={event}
                userId={user?.id}
                isScored={isScored}
                scoringJustFinished={scoringJustFinished}
                selectedFormation={selectedFormation}
                availableFormations={availableFormations}
                formationSlots={formationSlots}
                slotDbKeys={slotDbKeys}
                selectedPlayers={selectedPlayers}
                effectiveHoldings={effectiveHoldings}
                slotScores={slotScores}
                myTotalScore={myTotalScore}
                myRank={myRank}
                progressiveScores={progressiveScores}
                captainSlot={captainSlot}
                setCaptainSlot={setCaptainSlot}
                synergyPreview={synergyPreview}
                ownedPlayerIds={ownedPlayerIds}
                isLineupComplete={isLineupComplete}
                reqCheck={reqCheck}
                isPartiallyLocked={isPartiallyLocked}
                nextKickoff={nextKickoff}
                isPlayerLocked={isPlayerLocked}
                onFormationChange={handleFormationChange}
                onApplyPreset={handleApplyPreset}
                onSelectPlayer={handleSelectPlayer}
                onRemovePlayer={handleRemovePlayer}
                getSelectedPlayer={getSelectedPlayer}
                getAvailablePlayersForPosition={getAvailablePlayersForPosition}
                leaderboard={leaderboard}
                onSwitchToLeaderboard={() => setTab('leaderboard')}
                onClose={onClose}
                wildcardSlots={wildcardSlots}
                onToggleWildcard={(slotKey) => {
                  setWildcardSlots(prev => {
                    const next = new Set(prev);
                    if (next.has(slotKey)) next.delete(slotKey);
                    else next.add(slotKey);
                    return next;
                  });
                }}
              />
              {/* Chip Selector — only show when lineup is editable (not scored/ended) */}
              {!isScored && event.status !== 'ended' && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <ChipSelector eventId={event.id} />
                </div>
              )}
            </>
          )}

          {/* LEADERBOARD TAB */}
          {tab === 'leaderboard' && (
            <LeaderboardPanel
              event={event}
              userId={user?.id}
              leaderboard={leaderboard}
              leaderboardLoading={leaderboardLoading}
              isScored={isScored}
              isPolling={event.status === 'running' && !leaderboardLoading}
            />
          )}

          {/* COMMUNITY TAB */}
          {tab === 'community' && event && (
            <EventCommunityTab
              eventId={event.id}
              eventStatus={event.status}
              eventName={event.name}
              gameweek={event.gameweek}
            />
          )}
        </div>

        {/* Join Confirmation Dialog */}
        {showJoinConfirm && (() => {
          const ticketCost = event.ticketCost ?? 0;
          const hasCost = ticketCost > 0;
          return (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
                <div className="flex items-center gap-3 mb-4">
                  <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center">
                    <Trophy aria-hidden="true" className="size-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{t('confirmJoinTitle')}</h3>
                    <p className="text-xs text-white/50">{event.name}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-5 text-sm">
                  {/* Cost display — unified, currency-aware */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                    <span className="text-white/60">{t('entryFeeLabel')}</span>
                    {event.currency === 'tickets' && ticketCost > 0 ? (
                      <span className="font-bold font-mono tabular-nums text-amber-400">{t('ticketCost', { cost: ticketCost })}</span>
                    ) : event.currency === 'scout' && ticketCost > 0 ? (
                      <span className="font-bold font-mono tabular-nums text-gold">{fmtScout(ticketCost / 100)} $SCOUT</span>
                    ) : (
                      <span className="font-bold text-green-500">{t('freeLabel')}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-white/5">
                    <span className="text-white/60">{t('formatLabel')}</span>
                    <span className="font-mono text-white">{event.format}</span>
                  </div>
                </div>
                {hasCost && (
                  <p className="text-xs text-white/40 mb-4">
                    {t('entryFeeNote')}
                  </p>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" fullWidth onClick={() => setShowJoinConfirm(false)}>
                    {t('cancelBtn')}
                  </Button>
                  <Button variant="gold" size="lg" fullWidth onClick={handleFinalJoin} disabled={joining}>
                    {joining ? <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 aria-hidden="true" className="size-4" />}
                    {joining ? t('confirming') : t('confirmBtn')}
                  </Button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Footer Actions — sticky so they're always visible */}
        <div className="sticky bottom-0 z-10">
        {/* Join — only when not joined AND event not running/ended */}
        {!event.isJoined && event.status !== 'ended' && event.status !== 'running' && (() => {
          const isFull = !!(event.maxParticipants && event.participants >= event.maxParticipants);
          const ticketCost = event.ticketCost ?? 0;
          const hasCost = ticketCost > 0;
          const costLabel = event.currency === 'tickets' && ticketCost > 0
            ? t('ticketCost', { cost: ticketCost })
            : event.currency === 'scout' && ticketCost > 0
            ? `${fmtScout(ticketCost / 100)} $SCOUT`
            : t('freeLabel');
          return (
            <div className="flex-shrink-0 border-t border-white/10 bg-bg-main">
              <div className="p-3 md:p-5">
                <Button
                  variant="gold"
                  fullWidth
                  size="lg"
                  onClick={handleConfirmJoin}
                  disabled={isFull || joining}
                  className={cn(isFull ? 'opacity-60' : '')}
                >
                  {joining
                    ? <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                    : <CheckCircle2 aria-hidden="true" className="size-5" />
                  }
                  {isFull
                    ? t('eventFull')
                    : hasCost
                    ? t('joinAndPay', { amount: costLabel })
                    : t('confirmRegistration')
                  }
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Update / Leave — registering/late-reg OR running with unlocked fixtures */}
        {event.isJoined && event.status !== 'ended' && (event.status !== 'running' || hasUnlockedFixtures) && (
          <div className="flex-shrink-0 border-t border-white/10 bg-bg-main">
            {/* Lineup progress indicator */}
            {!isLineupComplete && (
              <div className="px-3 pt-3 md:px-5 md:pt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-white/50">{t('lineupLabel')}</span>
                  <span className="text-xs font-mono font-bold text-gold">{t('playersProgress', { filled: selectedPlayers.length, total: formationSlots.length })}</span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gold rounded-full transition-colors"
                    style={{ width: `${(selectedPlayers.length / formationSlots.length) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {/* Salary Cap budget bar */}
            {salaryCap != null && selectedPlayers.length > 0 && (
              <div className="px-3 pt-2 md:px-5 md:pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50">Budget</span>
                  <span className={cn('text-xs font-mono font-bold', overBudget ? 'text-red-400' : 'text-green-500')}>
                    {totalSalary} / {salaryCap}
                  </span>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all',
                      overBudget ? 'bg-red-500' : totalSalary / salaryCap > 0.85 ? 'bg-amber-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.min(100, (totalSalary / salaryCap) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="p-3 md:p-5 flex gap-3">
              <Button
                variant="outline"
                fullWidth
                size="lg"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={handleLeave}
                disabled={leaving}
              >
                {leaving ? <><Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> {t('leavingBtn')}</> : t('leaveBtn')}
              </Button>
              <Button
                variant="gold"
                fullWidth
                size="lg"
                onClick={handleSaveLineup}
                disabled={!isLineupComplete || !reqCheck.ok || overBudget || joining}
                className={cn(!isLineupComplete || !reqCheck.ok || overBudget ? 'opacity-50' : '')}
              >
                {joining
                  ? <Loader2 aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
                  : <Save aria-hidden="true" className="size-5" />
                }
                {t('editLineup')}
              </Button>
            </div>
          </div>
        )}

        {/* Running event — fully locked (all fixtures started) */}
        {event.isJoined && event.status === 'running' && !hasUnlockedFixtures && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <Lock aria-hidden="true" className="size-4 text-green-500" />
              <span className="text-sm font-bold text-green-500">{t('joinedLocked')}</span>
            </div>
          </div>
        )}

        {/* Running event — not joined */}
        {!event.isJoined && event.status === 'running' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-subtle border border-white/10 rounded-xl">
              <Play aria-hidden="true" className="size-4 text-white/50" />
              <span className="text-sm text-white/50">{t('eventRunningClosed')}</span>
            </div>
          </div>
        )}

        {/* Ended event — joined + scored */}
        {event.isJoined && event.status === 'ended' && event.scoredAt && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
            <button
              onClick={() => setTab('leaderboard')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20 transition-colors"
            >
              <Trophy aria-hidden="true" className="size-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">
                {event.userRank ? t('rankResult', { rank: event.userRank }) : t('scored')} — {t('viewResults')}
              </span>
            </button>
          </div>
        )}

        {/* Ended event — joined but not yet scored */}
        {event.isJoined && event.status === 'ended' && !event.scoredAt && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
            <div className="flex items-center justify-center gap-2 py-3 px-4 bg-surface-subtle border border-white/10 rounded-xl">
              <Clock aria-hidden="true" className="size-4 text-white/40" />
              <span className="text-sm text-white/40">{t('eventEndedPending')}</span>
            </div>
          </div>
        )}

        {/* Ended event — not joined */}
        {!event.isJoined && event.status === 'ended' && (
          <div className="flex-shrink-0 p-3 md:p-5 border-t border-white/10 bg-bg-main">
            <Button
              variant="outline"
              fullWidth
              size="lg"
              onClick={() => setTab('leaderboard')}
            >
              <Eye aria-hidden="true" className="size-5" />
              {t('viewResults')}
            </Button>
          </div>
        )}
        </div>
    </Modal>
  );
};
