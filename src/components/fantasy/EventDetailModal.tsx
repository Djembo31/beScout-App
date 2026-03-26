'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { calculateSynergyPreview } from '@/types';
import { Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getLineup, getEventParticipants, getEventParticipantCount } from '@/lib/services/lineups';
import { resetEvent, getEventLeaderboard, getProgressiveScores } from '@/lib/services/scoring';
import type { LeaderboardEntry } from '@/lib/services/scoring';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, EventDetailTab, LineupPlayer, UserDpcHolding } from './types';
import { getFormationsForFormat, getDefaultFormation, buildSlotDbKeys } from './constants';
import dynamic from 'next/dynamic';
import type { FixtureDeadline } from '@/lib/services/fixtures';

// Extracted components
import { EventDetailHeader } from '@/features/fantasy/components/event-detail/EventDetailHeader';
import { EventDetailFooter } from '@/features/fantasy/components/event-detail/EventDetailFooter';
import { JoinConfirmDialog } from '@/features/fantasy/components/event-detail/JoinConfirmDialog';

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

  // Set default tab based on join status when modal opens -- reset transient state
  useEffect(() => {
    if (isOpen && event) {
      setTab(event.scoredAt ? (event.isJoined ? 'lineup' : 'leaderboard') : event.isJoined ? 'lineup' : 'overview');
      setScoringJustFinished(false);
      setShowJoinConfirm(false);
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

  // Load lineup & participants on open
  useEffect(() => {
    if (!isOpen || !event) return;

    getEventParticipants(event.id, 10).then(setParticipants);
    getEventParticipantCount(event.id).then(count => setParticipantCount(Math.max(count, event.participants || 0)));

    if (event.isJoined && user) {
      getLineup(event.id, user.id).then(dbLineup => {
        if (dbLineup) {
          const savedFormation = dbLineup.formation || getDefaultFormation(event.format);
          setSelectedFormation(savedFormation);
          setSlotScores(dbLineup.slot_scores ?? null);
          setMyTotalScore(dbLineup.total_score);
          setMyRank(dbLineup.rank);
          setCaptainSlot(dbLineup.captain_slot ?? null);

          const fmtFormations = getFormationsForFormat(event.format);
          const formation = fmtFormations.find(f => f.id === savedFormation) || fmtFormations[0];
          const fSlots: { pos: string; slot: number }[] = [];
          let si = 0;
          for (const s of formation.slots) { for (let i = 0; i < s.count; i++) fSlots.push({ pos: s.pos, slot: si++ }); }

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
      setSelectedPlayers([]);
      setSelectedFormation(getDefaultFormation(event.format, event.lineupSize));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isJoined excluded (mid-session reset), user->user?.id (stable string)
  }, [isOpen, event?.id, user?.id]);

  const handleLeave = async () => {
    if (!user || !event || leaving) return;
    if (confirm(t('confirmLeaveMsg', { name: event.name }))) {
      setLeaving(true);
      try {
        await onLeave(event);
        onClose();
      } catch (e: unknown) {
        alert(t('leaveError', { msg: e instanceof Error ? e.message : 'Unknown' }));
      } finally {
        setLeaving(false);
      }
    }
  };

  // -- Memoized derived state (before early return -- React hook rules) --

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

  const isPlayerLocked = useCallback((playerId: string): boolean => {
    if (!fixtureDeadlines?.size || event?.status !== 'running') return false;
    const holding = effectiveHoldings.find(h => h.id === playerId);
    if (!holding?.clubId) return false;
    return fixtureDeadlines.get(holding.clubId)?.isLocked ?? false;
  }, [fixtureDeadlines, effectiveHoldings, event?.status]);

  const isPartiallyLocked = useMemo(() => {
    if (event?.status !== 'running' || !fixtureDeadlines?.size) return false;
    const deadlineValues = Array.from(fixtureDeadlines.values());
    const lockedCount = deadlineValues.filter(d => d.isLocked).length;
    return lockedCount > 0 && lockedCount < deadlineValues.length;
  }, [event?.status, fixtureDeadlines]);

  const hasUnlockedFixtures = useMemo(() => {
    if (event?.status !== 'running' || !fixtureDeadlines?.size) return false;
    return Array.from(fixtureDeadlines.values()).some(d => !d.isLocked);
  }, [event?.status, fixtureDeadlines]);

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

  const synergyPreview = useMemo(() => {
    const clubs = selectedPlayers
      .map(sp => effectiveHoldings.find(h => h.id === sp.playerId)?.club)
      .filter(Boolean) as string[];
    return calculateSynergyPreview(clubs);
  }, [selectedPlayers, effectiveHoldings]);

  const ownedPlayerIds = useMemo(() => {
    return new Set(effectiveHoldings.filter(h => h.dpcOwned >= 1).map(h => h.id));
  }, [effectiveHoldings]);

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

  const salaryCap = event.salaryCap ?? null;
  const overBudget = salaryCap != null && totalSalary > salaryCap;
  const isScored = !!event.scoredAt;

  // Join (entry only -- no lineup required)
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

      if (selectedPlayers.length === formationSlots.length && reqCheck.ok) {
        try {
          await onSubmitLineup(event, selectedPlayers, selectedFormation, captainSlot, Array.from(wildcardSlots));
          return;
        } catch (err) {
          console.error('[EventDetail] Auto-save after join failed:', err);
        }
      }

      setTab('lineup');
    } finally {
      setJoining(false);
    }
  };

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

  return (
    <Modal open={isOpen} onClose={onClose} title={event.name} size="lg">
        {/* Header: Status Badges + Meta */}
        <EventDetailHeader
          event={event}
          isScored={isScored}
          resetting={resetting}
          onReset={handleResetEvent}
        />

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
          {tab === 'overview' && (
            <OverviewPanel
              event={event}
              userId={user?.id}
              participants={participants}
              participantCount={participantCount}
            />
          )}

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
              {!isScored && event.status !== 'ended' && (
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                  <ChipSelector eventId={event.id} />
                </div>
              )}
            </>
          )}

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
        {showJoinConfirm && (
          <JoinConfirmDialog
            event={event}
            joining={joining}
            onConfirm={handleFinalJoin}
            onCancel={() => setShowJoinConfirm(false)}
          />
        )}

        {/* Footer Actions */}
        <EventDetailFooter
          event={event}
          isScored={isScored}
          hasUnlockedFixtures={hasUnlockedFixtures}
          isLineupComplete={isLineupComplete}
          reqCheck={reqCheck}
          overBudget={overBudget}
          salaryCap={salaryCap}
          totalSalary={totalSalary}
          selectedPlayersCount={selectedPlayers.length}
          formationSlotsCount={formationSlots.length}
          joining={joining}
          leaving={leaving}
          onConfirmJoin={handleConfirmJoin}
          onSaveLineup={handleSaveLineup}
          onLeave={handleLeave}
          onViewResults={() => setTab('leaderboard')}
        />
    </Modal>
  );
};
