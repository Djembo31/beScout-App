'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui';
import { useUser } from '@/components/providers/AuthProvider';
import { getEventParticipants, getEventParticipantCount } from '@/lib/services/lineups';
import { resetEvent, getEventLeaderboard } from '@/lib/services/scoring';
import type { LeaderboardEntry } from '@/lib/services/scoring';
import { useTranslations } from 'next-intl';
import type { FantasyEvent, EventDetailTab, LineupPlayer, UserDpcHolding } from './types';
import dynamic from 'next/dynamic';
import type { FixtureDeadline } from '@/lib/services/fixtures';
import { useLineupBuilder } from '@/features/fantasy/hooks/useLineupBuilder';
import { useLineupSave } from '@/features/fantasy/hooks/useLineupSave';

// Extracted components
import { EventDetailHeader } from '@/features/fantasy/components/event-detail/EventDetailHeader';
import { EventDetailFooter } from '@/features/fantasy/components/event-detail/EventDetailFooter';

// Lazy-loaded EquipmentPicker
const EquipmentPicker = dynamic(() => import('@/components/gamification/EquipmentPicker'), {
  ssr: false,
});

// Lazy-loaded tab panels
const OverviewPanel = dynamic(() => import('./event-tabs/OverviewPanel'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse motion-reduce:animate-none bg-surface-minimal rounded-2xl" />,
});
const LineupPanel = dynamic(() => import('./event-tabs/LineupPanel'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse motion-reduce:animate-none bg-surface-minimal rounded-2xl" />,
});
const LeaderboardPanel = dynamic(() => import('./event-tabs/LeaderboardPanel'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse motion-reduce:animate-none bg-surface-minimal rounded-2xl" />,
});
const EventCommunityTab = dynamic(() => import('./EventCommunityTab'), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse motion-reduce:animate-none bg-surface-minimal rounded-2xl" />,
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

  // ==================== Local modal-only state ====================
  const [tab, setTab] = useState<EventDetailTab>('overview');
  const [participants, setParticipants] = useState<{ id: string; handle: string; display_name?: string; avatar_url?: string }[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [scoringJustFinished, setScoringJustFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // ==================== Lineup builder hook (owns all lineup state) ====================
  const lb = useLineupBuilder({
    event,
    userId: user?.id,
    isOpen,
    holdings: userHoldings,
    fixtureDeadlines,
  });

  // ==================== Save flow (shared hook with /manager AufstellenTab) ====================
  const incrementParticipantCount = useCallback(() => {
    setParticipantCount((prev) => prev + 1);
  }, []);

  const { joining, handleSaveLineup } = useLineupSave({
    event,
    userId: user?.id,
    isLineupComplete: lb.isLineupComplete,
    reqCheck: lb.reqCheck,
    selectedPlayers: lb.selectedPlayers,
    selectedFormation: lb.selectedFormation,
    captainSlot: lb.captainSlot,
    wildcardSlots: lb.wildcardSlots,
    equipmentMap: lb.equipmentMap,
    onJoin,
    onSubmitLineup,
    onAfterJoin: incrementParticipantCount,
  });

  // ==================== Reset modal-only transient state on open ====================
  useEffect(() => {
    if (isOpen && event) {
      setTab(event.scoredAt ? (event.isJoined ? 'lineup' : 'leaderboard') : 'lineup');
      setScoringJustFinished(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- event fields als stabile Keys statt volles Objekt (sonst Re-run bei unrelated Updates)
  }, [isOpen, event?.id, event?.scoredAt, event?.isJoined]);

  // ==================== Load leaderboard on tab switch or when scored ====================
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- event fields als stabile Keys; vermeidet Re-poll bei unrelated Updates
  }, [isOpen, event?.id, tab, event?.scoredAt, event?.status]);

  // ==================== Load participants on open ====================
  useEffect(() => {
    if (!isOpen || !event) return;
    getEventParticipants(event.id, 10).then(setParticipants);
    getEventParticipantCount(event.id).then(count => setParticipantCount(Math.max(count, event.participants || 0)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- event fields als stabile Keys
  }, [isOpen, event?.id, event?.participants]);

  // ==================== Reset event (testing tool) ====================
  const handleResetEvent = async () => {
    if (!event || resetting) return;
    if (!confirm(t('confirmResetMsg'))) return;
    setResetting(true);
    try {
      const result = await resetEvent(event.id);
      if (result.success) {
        lb.setSlotScores(null);
        lb.setMyTotalScore(null);
        lb.setMyRank(null);
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

  if (!isOpen || !event) return null;

  const isScored = !!event.scoredAt;

  // Join: opens lineup tab -- actual join happens on lineup save
  const handleConfirmJoin = () => {
    setTab('lineup');
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
        <div className="flex overflow-x-auto scrollbar-hide -mx-4 md:-mx-5 border-b border-white/10 mb-4">
          {(['overview', 'lineup', 'leaderboard', 'community'] as EventDetailTab[]).map(tabId => (
            <button
              key={tabId}
              onClick={() => { setTab(tabId); }}
              className={`flex-shrink-0 px-4 py-3 min-h-[44px] font-medium text-sm transition-colors relative ${tab === tabId ? 'text-gold' : 'text-white/50 hover:text-white'
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
              holdingsCount={lb.effectiveHoldings.length}
              slotsRequired={lb.formationSlots.length}
            />
          )}

          {tab === 'lineup' && (
            <>
              <LineupPanel
                event={event}
                userId={user?.id}
                isScored={isScored}
                scoringJustFinished={scoringJustFinished}
                selectedFormation={lb.selectedFormation}
                availableFormations={lb.availableFormations}
                formationSlots={lb.formationSlots}
                slotDbKeys={lb.slotDbKeys}
                selectedPlayers={lb.selectedPlayers}
                effectiveHoldings={lb.effectiveHoldings}
                slotScores={lb.slotScores}
                myTotalScore={lb.myTotalScore}
                myRank={lb.myRank}
                progressiveScores={lb.progressiveScores}
                captainSlot={lb.captainSlot}
                setCaptainSlot={lb.setCaptainSlot}
                synergyPreview={lb.synergyPreview}
                ownedPlayerIds={lb.ownedPlayerIds}
                isLineupComplete={lb.isLineupComplete}
                reqCheck={lb.reqCheck}
                isPartiallyLocked={lb.isPartiallyLocked}
                nextKickoff={lb.nextKickoff}
                isPlayerLocked={lb.isPlayerLocked}
                onFormationChange={lb.handleFormationChange}
                onApplyPreset={lb.handleApplyPreset}
                onSelectPlayer={lb.handleSelectPlayer}
                onRemovePlayer={lb.handleRemovePlayer}
                getSelectedPlayer={lb.getSelectedPlayer}
                getAvailablePlayersForPosition={lb.getAvailablePlayersForPosition}
                leaderboard={leaderboard}
                onSwitchToLeaderboard={() => setTab('leaderboard')}
                onClose={onClose}
                wildcardSlots={lb.wildcardSlots}
                onToggleWildcard={lb.onToggleWildcard}
                equipmentMap={lb.equipmentMap}
                onEquipmentTap={lb.handleEquipmentTap}
              />
              {/* Equipment Picker Modal */}
              {lb.equipPickerSlot && (
                <EquipmentPicker
                  open={lb.equipPickerOpen}
                  onClose={lb.closeEquipPicker}
                  playerPosition={lb.equipPickerSlot.playerPosition}
                  playerName={lb.equipPickerSlot.playerName}
                  slotKey={lb.equipPickerSlot.slotKey}
                  inventory={lb.userEquipment}
                  definitions={lb.equipDefs}
                  equippedId={lb.equipmentMap[lb.equipPickerSlot.slotKey]?.id ?? null}
                  onEquip={lb.handleEquip}
                  onUnequip={lb.handleUnequip}
                  loading={false}
                />
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

        {/* Footer Actions */}
        <EventDetailFooter
          event={event}
          isScored={isScored}
          hasUnlockedFixtures={lb.hasUnlockedFixtures}
          isLineupComplete={lb.isLineupComplete}
          reqCheck={lb.reqCheck}
          overBudget={lb.overBudget}
          salaryCap={lb.salaryCap}
          totalSalary={lb.totalSalary}
          selectedPlayersCount={lb.selectedPlayers.length}
          formationSlotsCount={lb.formationSlots.length}
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
